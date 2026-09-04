import type { PublicKey } from '@solana/web3.js';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const { splMocks } = vi.hoisted(() => {
  const splMocks = {
    getAssociatedTokenAddress: vi.fn(
      async (mint: PublicKey, owner: PublicKey) =>
        ({ toBase58: () => `ATA(${mint.toBase58()},${owner.toBase58()})` }) as unknown as PublicKey,
    ),
    createAssociatedTokenAccountIdempotentInstruction: vi.fn(
      (...args: unknown[]) => ({ kind: 'createAta', args }) as never,
    ),
    createTransferCheckedInstruction: vi.fn(
      (...args: unknown[]) => ({ kind: 'transferChecked', args }) as never,
    ),
    createMintToInstruction: vi.fn(
      (...args: unknown[]) => ({ kind: 'mintTo', args }) as never,
    ),
    createBurnInstruction: vi.fn(
      (...args: unknown[]) => ({ kind: 'burn', args }) as never,
    ),
    getAccount: vi.fn(async () => ({ amount: 1_000_000n }) as never),
  };
  return { splMocks };
});

vi.mock('@solana/spl-token', () => splMocks);

import { MockVaultService } from './mock-vault.service';
import type { Env } from '../config/env';
import type { SolanaService } from '../solana/solana.service';

const OWNER = 'So11111111111111111111111111111111111111112';
const SPONSOR = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

// Em devnet mock, usdcMint aponta pro mint "Real de teste" (não USDC de
// verdade) — ver create-mock-devnet-mints.cjs na Task 2.
const env = {
  usdcMint: 'DezRVsMYy71rGvXTs4A15CDAQ8ttyPvzTKKM3wcbAPFB',
  mockVaultShareMint: 'Es9vMFrzaCERZ4iGB9ffAnGREvvB4EQtnQoW9uz9tj9F',
  mockVaultApyPercent: '5.00',
} as unknown as Env;

function makeService(): MockVaultService {
  const solana = {
    connection: {},
    sponsorAddress: SPONSOR,
  } as unknown as SolanaService;
  return new MockVaultService(env, solana);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('MockVaultService.getApyPercent', () => {
  it('devolve o valor configurado, sem cálculo real', async () => {
    const service = makeService();
    await expect(service.getApyPercent()).resolves.toBe('5.00');
  });
});

describe('MockVaultService.buildDepositInstructions', () => {
  it('monta create-ATA(tesouraria) + create-ATA(cota) + transferChecked + mintTo', async () => {
    const service = makeService();
    const ixs = await service.buildDepositInstructions(OWNER, 1_000_000n);

    expect(ixs).toHaveLength(4);
    const [, , , , amount, decimals] =
      splMocks.createTransferCheckedInstruction.mock.calls[0];
    expect(amount).toBe(1_000_000n);
    expect(decimals).toBe(6);
    const transferOwner = splMocks.createTransferCheckedInstruction.mock
      .calls[0][3] as PublicKey;
    expect(transferOwner.toBase58()).toBe(OWNER);

    const [, , mintAuthority, mintAmount] =
      splMocks.createMintToInstruction.mock.calls[0];
    expect((mintAuthority as PublicKey).toBase58()).toBe(SPONSOR);
    expect(mintAmount).toBe(1_000_000n);
  });

  it('rejeita endereço inválido', async () => {
    const service = makeService();
    await expect(
      service.buildDepositInstructions('not-an-address', 1_000_000n),
    ).rejects.toThrow('invalid owner address');
  });
});

describe('MockVaultService.buildWithdrawInstructions', () => {
  it('monta burn + transferChecked de volta pro dono', async () => {
    const service = makeService();
    const ixs = await service.buildWithdrawInstructions(OWNER, 500_000n);

    expect(ixs).toHaveLength(2);
    const [account, , burnOwner, burnAmount] =
      splMocks.createBurnInstruction.mock.calls[0];
    expect(account).toBeDefined();
    expect((burnOwner as PublicKey).toBase58()).toBe(OWNER);
    expect(burnAmount).toBe(500_000n);

    const [, , destination, transferAuthority, transferAmount] =
      splMocks.createTransferCheckedInstruction.mock.calls[0];
    expect(destination).toBeDefined();
    expect((transferAuthority as PublicKey).toBase58()).toBe(SPONSOR);
    expect(transferAmount).toBe(500_000n);
  });
});

describe('MockVaultService.getPositionValue', () => {
  it('devolve o saldo da ATA de cota do dono', async () => {
    const service = makeService();
    await expect(service.getPositionValue(OWNER)).resolves.toBe(1_000_000n);
  });

  it('devolve 0n quando a ATA de cota não existe', async () => {
    splMocks.getAccount.mockRejectedValueOnce(new Error('not found'));
    const service = makeService();
    await expect(service.getPositionValue(OWNER)).resolves.toBe(0n);
  });
});
