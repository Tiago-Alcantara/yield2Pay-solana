import { Inject, Injectable, Logger, BadRequestException } from '@nestjs/common';
import { TransactionInstruction, PublicKey } from '@solana/web3.js';
import { createSolanaRpc, createNoopSigner, address, AccountRole, type Instruction } from '@solana/kit';
import {
  KaminoMarket,
  KaminoAction,
  VanillaObligation,
  PROGRAM_ID,
  DEFAULT_RECENT_SLOT_DURATION_MS,
  getCurrentLedgerInstant,
  type KaminoMarket as KaminoMarketType,
  type KaminoReserve,
} from '@kamino-finance/klend-sdk';
import { APP_CONFIG } from '../config/config.module';
import type { Env } from '../config/env';

/**
 * Cofre de rendimento. Antes era DeFindex (Soroban); agora é Kamino Lend (Solana).
 *
 * O que cada método precisa fazer quando a SDK entrar:
 *
 *  - buildDepositInstructions: `KaminoAction.buildDepositTxns` na reserve de USDC
 *    do market configurado, com `owner` = carteira da família. Devolver só as
 *    instruções: quem monta a transação é o SolanaService, porque é ele que põe
 *    o sponsor como feePayer.
 *
 *  - buildWithdrawInstructions: `KaminoAction.buildWithdrawTxns` com o mesmo
 *    contrato. Sacar por valor em USDC (não por quantidade de cTokens): o share
 *    price sobe com o rendimento, então converter aqui evita erro de arredondamento
 *    na borda.
 *
 *  - getApyPercent: APY da reserve via `reserve.totalSupplyAPY(instant) * 100`.
 *
 *  - getPositionValue: valor RESGATÁVEL em USDC base units (6 casas), não a
 *    contagem de cTokens. É a mesma pegadinha que a versão DeFindex documentava:
 *    o share price passa de 1 conforme rende, então reportar cTokens subestima a
 *    posição. Usar `obligation.deposits` convertido pelo exchange rate da reserve.
 */
@Injectable()
export class VaultService {
  private readonly logger = new Logger(VaultService.name);
  private readonly marketAddress: string;
  private readonly reserveAddress: string;
  private readonly rpc: ReturnType<typeof createSolanaRpc>;
  private market: KaminoMarketType | null = null;
  private marketLoading: Promise<KaminoMarketType> | null = null;

  constructor(@Inject(APP_CONFIG) config: Env) {
    this.marketAddress = config.kaminoMarketAddress;
    this.reserveAddress = config.kaminoReserveAddress;
    this.rpc = createSolanaRpc(config.solanaRpcUrl);
  }

  /** Market e reserve configurados. Expostos para log e para o VaultPosition. */
  get target(): { marketAddress: string; reserveAddress: string } {
    return {
      marketAddress: this.marketAddress,
      reserveAddress: this.reserveAddress,
    };
  }

  /**
   * Market é carregado uma vez e reutilizado; reload só se falhar.
   * KaminoMarket.load consulta os accounts do market — não faz por request.
   */
  private async getMarket(): Promise<KaminoMarketType> {
    if (this.market) return this.market;
    this.marketLoading ??= KaminoMarket.load(
      this.rpc,
      this.marketAddress as Parameters<typeof KaminoMarket.load>[1],
      DEFAULT_RECENT_SLOT_DURATION_MS,
    )
      .then((m) => {
        if (!m) {
          throw new Error(
            `KaminoMarket.load returned null for market ${this.marketAddress}`,
          );
        }
        this.market = m;
        return m;
      })
      .catch((err) => {
        this.marketLoading = null; // próxima chamada tenta de novo
        throw err;
      });
    return this.marketLoading;
  }

  private async getReserve(): Promise<KaminoReserve> {
    const market = await this.getMarket();
    const reserve = market.getReserveByAddress(
      this.reserveAddress as Parameters<typeof market.getReserveByAddress>[0],
    );
    if (!reserve) {
      throw new Error(
        `reserve ${this.reserveAddress} not found in market ${this.marketAddress}`,
      );
    }
    return reserve;
  }

  async buildDepositInstructions(
    ownerAddress: string,
    amountBaseUnits: bigint,
  ): Promise<TransactionInstruction[]> {
    // Validate ownerAddress is a valid base58 public key
    let validatedOwner: string;
    try {
      new PublicKey(ownerAddress);
      validatedOwner = ownerAddress;
    } catch {
      throw new BadRequestException(`invalid owner address: ${ownerAddress}`);
    }

    const [market, , instant] = await Promise.all([
      this.getMarket(),
      this.getReserve(), // validates reserve exists early
      getCurrentLedgerInstant(this.rpc),
    ]);

    const owner = createNoopSigner(address(validatedOwner));
    const action = await KaminoAction.buildDepositTxns({
      kaminoMarket: market,
      amount: amountBaseUnits.toString(),
      reserveAddress: address(this.reserveAddress),
      owner,
      obligation: new VanillaObligation(PROGRAM_ID),
      useV2Ixs: true,
      scopeRefreshConfig: undefined,
      currentLedgerInstant: instant,
    });

    return KaminoAction.actionToIxs(action).map(VaultService.kitIxToWeb3);
  }

  /** Converts a kit `Instruction` (web3.js 2.x shape) to a web3.js 1.x `TransactionInstruction`. */
  private static kitIxToWeb3(ix: Instruction): TransactionInstruction {
    return new TransactionInstruction({
      programId: new PublicKey(ix.programAddress as string),
      keys: (ix.accounts ?? []).map((acc) => ({
        pubkey: new PublicKey(acc.address as string),
        isSigner:
          acc.role === AccountRole.READONLY_SIGNER ||
          acc.role === AccountRole.WRITABLE_SIGNER,
        isWritable:
          acc.role === AccountRole.WRITABLE ||
          acc.role === AccountRole.WRITABLE_SIGNER,
      })),
      data: ix.data ? Buffer.from(ix.data) : Buffer.alloc(0),
    });
  }

  async buildWithdrawInstructions(
    ownerAddress: string,
    amountBaseUnits: bigint,
  ): Promise<TransactionInstruction[]> {
    // Validate ownerAddress is a valid base58 public key
    let validatedOwner: string;
    try {
      new PublicKey(ownerAddress);
      validatedOwner = ownerAddress;
    } catch {
      throw new BadRequestException(`invalid owner address: ${ownerAddress}`);
    }

    const [market, , instant] = await Promise.all([
      this.getMarket(),
      this.getReserve(), // validates reserve exists early
      getCurrentLedgerInstant(this.rpc),
    ]);

    const owner = createNoopSigner(address(validatedOwner));
    const action = await KaminoAction.buildWithdrawTxns({
      kaminoMarket: market,
      amount: amountBaseUnits.toString(),
      reserveAddress: address(this.reserveAddress),
      owner,
      obligation: new VanillaObligation(PROGRAM_ID),
      useV2Ixs: true,
      scopeRefreshConfig: undefined,
      currentLedgerInstant: instant,
    });

    return KaminoAction.actionToIxs(action).map(VaultService.kitIxToWeb3);
  }

  /**
   * APY de supply da reserve como string de percentual.
   * `totalSupplyAPY` retorna fração (ex.: 0.0812); multiplica por 100 → '8.12'.
   */
  async getApyPercent(): Promise<string> {
    const reserve = await this.getReserve();
    const instant = await getCurrentLedgerInstant(this.rpc);
    const apy = reserve.totalSupplyAPY(instant);
    return (apy * 100).toFixed(2);
  }

  /**
   * Valor resgatável da posição, em USDC base units (6 casas).
   * Obtém a obligation do usuário e retorna o valor em USDC depositado via
   * `obligation.getDepositAmountByReserve(reserve)`, que já inclui juros
   * acumulados.
   */
  async getPositionValue(ownerAddress: string): Promise<bigint> {
    const [market, reserve] = await Promise.all([
      this.getMarket(),
      this.getReserve(),
    ]);

    const obligation = await market.getUserVanillaObligation(
      address(ownerAddress),
    );
    if (!obligation) return 0n;

    const amount = obligation.getDepositAmountByReserve(reserve);
    if (!amount) return 0n;

    return BigInt(amount.floor().toString());
  }
}
