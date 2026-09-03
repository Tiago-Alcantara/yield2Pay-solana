import { Connection } from '@solana/web3.js';
import type { Address } from '@solana/kit';
import { describe, expect, it, vi, beforeEach } from 'vitest';

// Hoisted mocks — accessible both inside vi.mock factories and in test bodies.
// The programAddress must be a valid base58 32-byte public key for PublicKey() to accept it.
// Using the Solana System Program address as a stand-in.
const MOCK_PROGRAM_ADDRESS = '11111111111111111111111111111112'; // valid base58 pubkey
const { KaminoActionMock } = vi.hoisted(() => {
  const ADDR = '11111111111111111111111111111112';
  const KaminoActionMock = {
    buildDepositTxns: vi.fn(async () => ({})),
    buildWithdrawTxns: vi.fn(async () => ({})),
    actionToIxs: vi.fn(() => [
      {
        programAddress: ADDR,
        accounts: [],
        data: undefined,
      },
    ]),
  };
  return { KaminoActionMock };
});

vi.mock('@solana/kit', () => ({
  createSolanaRpc: vi.fn(() => ({})),
  createNoopSigner: vi.fn((addr: string) => ({ address: addr })),
  address: vi.fn((addr: string) => addr as Address),
}));

vi.mock('@kamino-finance/klend-sdk', () => {
  const instant = { slot: 100n, blockTime: 1000n };
  const reserve = {
    totalSupplyAPY: vi.fn(() => 0.0812),
  };
  const market = {
    getReserveByAddress: vi.fn(() => reserve),
  };
  const KaminoMarketMock = vi.fn();
  KaminoMarketMock.load = vi.fn(async () => market);
  return {
    KaminoMarket: KaminoMarketMock,
    DEFAULT_RECENT_SLOT_DURATION_MS: 350,
    getCurrentLedgerInstant: vi.fn(async () => instant),
    KaminoAction: KaminoActionMock,
    VanillaObligation: vi.fn(),
    PROGRAM_ID: 'KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD' as Address,
  };
});

import { VaultService } from './vault.service';
import type { Env } from '../config/env';

// Valid base58 public keys for testing (real Solana addresses)
const VALID_OWNER_ADDRESS = 'So11111111111111111111111111111111111111112'; // Wrapped SOL token
const VALID_MARKET_ADDRESS = 'EPjFWaLb3odccccccccccccccccccccccodeP3vL'; // USDC mint
const VALID_RESERVE_ADDRESS = 'SRMuApVgqbCV5pxouda7AVhd64Ps6aUVcccdMNE6m1a'; // SRM token

const env = {
  kaminoMarketAddress: VALID_MARKET_ADDRESS,
  kaminoReserveAddress: VALID_RESERVE_ADDRESS,
  solanaRpcUrl: 'https://api.mainnet-beta.solana.com',
} as unknown as Env;

function makeService() {
  return new VaultService(env);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('VaultService.getApyPercent', () => {
  it('devolve o APY da reserve como string de percentual', async () => {
    const service = makeService();
    await expect(service.getApyPercent()).resolves.toBe('8.12');
  });
});

describe('VaultService.buildDepositInstructions', () => {
  it('devolve TransactionInstruction[] com programId correto e chama buildDepositTxns com o amount', async () => {
    const { service } = { service: makeService() };
    const ixs = await service.buildDepositInstructions(VALID_OWNER_ADDRESS, 1_000_000_000n);
    expect(ixs).toHaveLength(1);
    expect(ixs[0].programId.toBase58()).toBe(MOCK_PROGRAM_ADDRESS);
    expect(KaminoActionMock.buildDepositTxns).toHaveBeenCalledWith(
      expect.objectContaining({ amount: '1000000000' }),
    );
  });
});

describe('VaultService.buildWithdrawInstructions', () => {
  it('devolve instructions de resgate', async () => {
    const service = makeService();
    const ixs = await service.buildWithdrawInstructions(
      VALID_OWNER_ADDRESS,
      500_000_000n,
    );
    expect(ixs).toHaveLength(1);
    expect(KaminoActionMock.buildWithdrawTxns).toHaveBeenCalledWith(
      expect.objectContaining({ amount: '500000000' }),
    );
  });
});

describe('VaultService.getPositionValue', () => {
  it('converte obligation deposits pelo valor em USDC base units', async () => {
    // Mock obligation com getDepositAmountByReserve que devolve Decimal
    const mockObligation = {
      getDepositAmountByReserve: vi.fn(() => ({
        floor: () => ({ toString: () => '1050000000' }),
      })),
    };

    const mockMarket = {
      getReserveByAddress: vi.fn(() => ({
        totalSupplyAPY: vi.fn(() => 0.0812),
      })),
      getUserVanillaObligation: vi.fn(async () => mockObligation),
    };

    const { KaminoMarket } = await import('@kamino-finance/klend-sdk');
    vi.mocked(KaminoMarket.load).mockResolvedValueOnce(mockMarket as never);

    const service = makeService();
    const result = await service.getPositionValue(VALID_OWNER_ADDRESS);

    expect(result).toBe(1050000000n);
    expect(mockMarket.getUserVanillaObligation).toHaveBeenCalledWith(
      VALID_OWNER_ADDRESS,
    );
  });

  it('devolve 0n quando não há obligation', async () => {
    const mockMarket = {
      getReserveByAddress: vi.fn(() => ({
        totalSupplyAPY: vi.fn(() => 0.0812),
      })),
      getUserVanillaObligation: vi.fn(async () => null),
    };

    const { KaminoMarket } = await import('@kamino-finance/klend-sdk');
    vi.mocked(KaminoMarket.load).mockResolvedValueOnce(mockMarket as never);

    const service = makeService();
    const result = await service.getPositionValue(VALID_OWNER_ADDRESS);

    expect(result).toBe(0n);
  });
});
