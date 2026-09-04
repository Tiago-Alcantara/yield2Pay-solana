import { Logger, BadRequestException } from '@nestjs/common';
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
import type { Env } from '../config/env';
import { VaultService } from './vault.service';

/** Cofre de rendimento contra uma reserve Kamino Lend real (mainnet-only). */
export class KaminoVaultService extends VaultService {
  private readonly logger = new Logger(KaminoVaultService.name);
  private readonly marketAddress: string;
  private readonly reserveAddress: string;
  private readonly rpc: ReturnType<typeof createSolanaRpc>;
  private market: KaminoMarketType | null = null;
  private marketLoading: Promise<KaminoMarketType> | null = null;

  constructor(config: Env) {
    super();
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
        this.marketLoading = null;
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
    let validatedOwner: string;
    try {
      new PublicKey(ownerAddress);
      validatedOwner = ownerAddress;
    } catch {
      throw new BadRequestException(`invalid owner address: ${ownerAddress}`);
    }

    const [market, , instant] = await Promise.all([
      this.getMarket(),
      this.getReserve(),
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

    return KaminoAction.actionToIxs(action).map(KaminoVaultService.kitIxToWeb3);
  }

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
    let validatedOwner: string;
    try {
      new PublicKey(ownerAddress);
      validatedOwner = ownerAddress;
    } catch {
      throw new BadRequestException(`invalid owner address: ${ownerAddress}`);
    }

    const [market, , instant] = await Promise.all([
      this.getMarket(),
      this.getReserve(),
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

    return KaminoAction.actionToIxs(action).map(KaminoVaultService.kitIxToWeb3);
  }

  async getApyPercent(): Promise<string> {
    const reserve = await this.getReserve();
    const instant = await getCurrentLedgerInstant(this.rpc);
    const apy = reserve.totalSupplyAPY(instant);
    return (apy * 100).toFixed(2);
  }

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
