import type { TransactionInstruction } from '@solana/web3.js';

/**
 * Cofre de rendimento. Duas implementações: `KaminoVaultService` (reserve
 * Kamino real, exige mainnet) e `MockVaultService` (SPL tokens de teste —
 * "Real" + cota — para testar o fluxo completo em devnet sem Kamino — ver
 * docs/superpowers/plans/2026-09-04-mock-vault-devnet.md). `VaultModule`
 * escolhe qual instanciar via `Env.vaultProvider`.
 */
export abstract class VaultService {
  abstract buildDepositInstructions(
    ownerAddress: string,
    amountBaseUnits: bigint,
  ): Promise<TransactionInstruction[]>;

  abstract buildWithdrawInstructions(
    ownerAddress: string,
    amountBaseUnits: bigint,
  ): Promise<TransactionInstruction[]>;

  /** APY de supply como string de percentual (ex.: '8.12'). */
  abstract getApyPercent(): Promise<string>;

  /** Valor resgatável da posição, em base units da moeda de depósito (6 casas). */
  abstract getPositionValue(ownerAddress: string): Promise<bigint>;
}
