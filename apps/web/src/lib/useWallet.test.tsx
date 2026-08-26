/**
 * Tests for useWallet hook.
 *
 * Mocks:
 *   - @privy-io/react-auth         → usePrivy
 *   - @privy-io/react-auth/solana  → useCreateWallet
 *   - ./api (via module-level mock of createApi factory)
 *
 * We do NOT import the real Privy SDK — tests must run without a Privy app id.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockRegisterWallet = vi.fn().mockResolvedValue(undefined);
const mockCreateWallet = vi.fn();

vi.mock('@privy-io/react-auth', () => ({
  usePrivy: vi.fn(),
}));

vi.mock('@privy-io/react-auth/solana', () => ({
  useCreateWallet: vi.fn(() => ({ createWallet: mockCreateWallet })),
}));

// We mock createApi so useWallet gets a predictable api instance.
// useWallet calls createApi(getToken) internally; the mock returns a fixed api object.
vi.mock('./api', () => ({
  createApi: vi.fn(() => ({
    registerWallet: mockRegisterWallet,
  })),
}));

import { usePrivy } from '@privy-io/react-auth';
import { useWallet } from './useWallet';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeUserWithSolanaWallet(address: string) {
  return {
    linkedAccounts: [
      {
        type: 'wallet' as const,
        chainType: 'solana',
        walletClientType: 'privy',
        address,
        connectorType: 'embedded',
      },
    ],
  };
}

function makeUserWithoutSolanaWallet() {
  return {
    linkedAccounts: [
      {
        type: 'wallet' as const,
        chainType: 'ethereum',
        walletClientType: 'privy',
        address: '0xdeadbeef',
        connectorType: 'embedded',
      },
    ],
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useWallet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRegisterWallet.mockResolvedValue(undefined);
  });

  it('returns address from existing solana wallet and calls registerWallet once', async () => {
    const solanaAddress = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';
    const mockUser = makeUserWithSolanaWallet(solanaAddress);

    (usePrivy as ReturnType<typeof vi.fn>).mockReturnValue({
      user: mockUser,
      getAccessToken: vi.fn().mockResolvedValue('tok-abc'),
    });

    const { result } = renderHook(() => useWallet());

    let address: string;
    await act(async () => {
      address = await result.current.ensureWallet();
    });

    expect(address!).toBe(solanaAddress);
    // createWallet should NOT have been called
    expect(mockCreateWallet).not.toHaveBeenCalled();
    // registerWallet should have been called exactly once with the solana address
    expect(mockRegisterWallet).toHaveBeenCalledOnce();
    expect(mockRegisterWallet).toHaveBeenCalledWith({ solanaAddress });
  });

  it('creates a solana wallet when none exists, then registers it', async () => {
    const newSolanaAddress = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';
    const mockUser = makeUserWithoutSolanaWallet();

    (usePrivy as ReturnType<typeof vi.fn>).mockReturnValue({
      user: mockUser,
      getAccessToken: vi.fn().mockResolvedValue('tok-def'),
    });

    mockCreateWallet.mockResolvedValue({
      wallet: { address: newSolanaAddress, chainType: 'solana' },
      user: { linkedAccounts: [] },
    });

    const { result } = renderHook(() => useWallet());

    let address: string;
    await act(async () => {
      address = await result.current.ensureWallet();
    });

    // O hook de Solana não recebe chainType — o próprio módulo já é da rede.
    expect(mockCreateWallet).toHaveBeenCalledOnce();
    expect(mockCreateWallet).toHaveBeenCalledWith();

    expect(address!).toBe(newSolanaAddress);

    // registerWallet must be called with the new address
    expect(mockRegisterWallet).toHaveBeenCalledOnce();
    expect(mockRegisterWallet).toHaveBeenCalledWith({
      solanaAddress: newSolanaAddress,
    });
  });

  it('exposes address as null when user has no solana wallet yet', () => {
    const mockUser = makeUserWithoutSolanaWallet();

    (usePrivy as ReturnType<typeof vi.fn>).mockReturnValue({
      user: mockUser,
      getAccessToken: vi.fn().mockResolvedValue(null),
    });

    const { result } = renderHook(() => useWallet());
    expect(result.current.address).toBeNull();
  });

  it('exposes address when user already has a solana wallet', () => {
    const solanaAddress = 'DjVE6JNiYqPL2QXyCUUh8rNjHrbz9hXHNYt99MQ59qw1';
    const mockUser = makeUserWithSolanaWallet(solanaAddress);

    (usePrivy as ReturnType<typeof vi.fn>).mockReturnValue({
      user: mockUser,
      getAccessToken: vi.fn().mockResolvedValue('tok-xyz'),
    });

    const { result } = renderHook(() => useWallet());
    expect(result.current.address).toBe(solanaAddress);
  });
});
