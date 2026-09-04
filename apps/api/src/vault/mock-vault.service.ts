import { BadRequestException } from '@nestjs/common';
import { PublicKey, type TransactionInstruction } from '@solana/web3.js';
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createBurnInstruction,
  createMintToInstruction,
  createTransferCheckedInstruction,
  getAccount,
  getAssociatedTokenAddress,
} from '@solana/spl-token';
import type { Env } from '../config/env';
import type { SolanaService } from '../solana/solana.service';
import { VaultService } from './vault.service';

const CURRENCY_DECIMALS = 6;

/**
 * Cofre de mentira para testar o fluxo completo (depósito/saque/dashboard) em
 * devnet sem Kamino: a Kamino não tem o oracle Scope deployado em devnet
 * (confirmado via getAccountInfo do programa Scope — conta null lá), então
 * nenhuma reserve real pode existir nesse cluster hoje.
 *
 * A moeda também é mock: `config.usdcMint` aqui é o mint de "Real de teste"
 * criado por apps/api/scripts/create-mock-devnet-mints.cjs, não USDC — o
 * público do produto são famílias brasileiras que vão depositar Real via PIX
 * (rampa ainda no roadmap), então o teste em devnet já usa uma moeda que se
 * comporta como Real, não como dólar.
 *
 * Modela um cofre com um segundo SPL token de "cota" 1:1 com a moeda (sem
 * rendimento real): depositar move a moeda de teste do dono para uma ATA de
 * tesouraria do sponsor e emite a mesma quantidade em cotas para o dono;
 * sacar queima as cotas e devolve a moeda. `getApyPercent` é um valor
 * configurado, não calculado — não há juros de verdade para calcular.
 */
export class MockVaultService extends VaultService {
  private readonly currencyMint: PublicKey;
  private readonly shareMint: PublicKey;
  private readonly sponsor: PublicKey;
  private readonly apyPercent: string;

  constructor(
    config: Env,
    private readonly solana: SolanaService,
  ) {
    super();
    if (!config.mockVaultShareMint) {
      // Já validado por Env.superRefine quando VAULT_PROVIDER=mock; esta
      // checagem é defesa contra instanciação manual incorreta.
      throw new Error(
        'MOCK_VAULT_SHARE_MINT is required to use MockVaultService',
      );
    }
    this.currencyMint = new PublicKey(config.usdcMint);
    this.shareMint = new PublicKey(config.mockVaultShareMint);
    this.sponsor = new PublicKey(solana.sponsorAddress);
    this.apyPercent = config.mockVaultApyPercent;
  }

  private static validateOwner(ownerAddress: string): PublicKey {
    try {
      return new PublicKey(ownerAddress);
    } catch {
      throw new BadRequestException(`invalid owner address: ${ownerAddress}`);
    }
  }

  async buildDepositInstructions(
    ownerAddress: string,
    amountBaseUnits: bigint,
  ): Promise<TransactionInstruction[]> {
    const owner = MockVaultService.validateOwner(ownerAddress);
    const [ownerCurrencyAta, treasuryCurrencyAta, ownerShareAta] =
      await Promise.all([
        getAssociatedTokenAddress(this.currencyMint, owner),
        getAssociatedTokenAddress(this.currencyMint, this.sponsor),
        getAssociatedTokenAddress(this.shareMint, owner),
      ]);

    return [
      // Idempotente: só cria na 1ª vez, seguro em depósitos concorrentes.
      createAssociatedTokenAccountIdempotentInstruction(
        this.sponsor,
        treasuryCurrencyAta,
        this.sponsor,
        this.currencyMint,
      ),
      createAssociatedTokenAccountIdempotentInstruction(
        this.sponsor,
        ownerShareAta,
        owner,
        this.shareMint,
      ),
      createTransferCheckedInstruction(
        ownerCurrencyAta,
        this.currencyMint,
        treasuryCurrencyAta,
        owner,
        amountBaseUnits,
        CURRENCY_DECIMALS,
      ),
      createMintToInstruction(
        this.shareMint,
        ownerShareAta,
        this.sponsor,
        amountBaseUnits,
      ),
    ];
  }

  async buildWithdrawInstructions(
    ownerAddress: string,
    amountBaseUnits: bigint,
  ): Promise<TransactionInstruction[]> {
    const owner = MockVaultService.validateOwner(ownerAddress);
    const [ownerCurrencyAta, treasuryCurrencyAta, ownerShareAta] =
      await Promise.all([
        getAssociatedTokenAddress(this.currencyMint, owner),
        getAssociatedTokenAddress(this.currencyMint, this.sponsor),
        getAssociatedTokenAddress(this.shareMint, owner),
      ]);

    return [
      // Idempotente: garante a ATA de moeda do dono mesmo se o registro da
      // carteira não tiver criado a ATA da moeda mock especificamente (a
      // moeda mock não é a mesma que SolanaService.ensureUsdcTokenAccount
      // cria no registro — aquela é sempre a Env.usdcMint corrente, então na
      // prática já existe, mas o saque fica auto-suficiente sem depender
      // disso).
      createAssociatedTokenAccountIdempotentInstruction(
        this.sponsor,
        ownerCurrencyAta,
        owner,
        this.currencyMint,
      ),
      createBurnInstruction(ownerShareAta, this.shareMint, owner, amountBaseUnits),
      createTransferCheckedInstruction(
        treasuryCurrencyAta,
        this.currencyMint,
        ownerCurrencyAta,
        this.sponsor,
        amountBaseUnits,
        CURRENCY_DECIMALS,
      ),
    ];
  }

  async getApyPercent(): Promise<string> {
    return this.apyPercent;
  }

  async getPositionValue(ownerAddress: string): Promise<bigint> {
    const owner = MockVaultService.validateOwner(ownerAddress);
    const ata = await getAssociatedTokenAddress(this.shareMint, owner);
    try {
      const account = await getAccount(this.solana.connection, ata);
      return account.amount;
    } catch {
      // ATA ainda não criada → nunca depositou. Não é erro.
      return 0n;
    }
  }
}
