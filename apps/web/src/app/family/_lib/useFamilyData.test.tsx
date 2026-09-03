// useFamilyData.test.tsx
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, expect, it, beforeEach } from 'vitest';

const apiMock = vi.hoisted(() => ({
  getDashboard: vi.fn(),
  listSubs: vi.fn(),
  getWalletBalance: vi.fn(),
  createSub: vi.fn(),
  deleteSub: vi.fn(),
  reorderSubs: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  createApi: () => apiMock,
}));

const privyMock = vi.hoisted(() => ({
  ready: true,
  authenticated: true,
  getAccessToken: vi.fn(async () => 'token'),
}));

vi.mock('@privy-io/react-auth', () => ({
  usePrivy: () => privyMock,
}));

import { useFamilyData } from './useFamilyData';
import { FamilyProvider } from './FamilyProvider';

function renderHookInProvider() {
  return renderHook(() => useFamilyData(), {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <FamilyProvider>{children}</FamilyProvider>
    ),
  });
}

const DASHBOARD = {
  vaultValue: '1010000000',
  principal: '1000000000',
  spendable: '10000000',
  apyPercent: '8.1',
  returnsChangePercent: null,
};

const SUBS = [
  { id: 's1', name: 'Netflix', monthlyCost: '59900000', category: 'streaming', priority: 0, status: 'active', memberId: null },
];

beforeEach(() => {
  vi.clearAllMocks();
  privyMock.ready = true;
  privyMock.authenticated = true;
});

describe('useFamilyData', () => {
  it('carrega dashboard, saldo e subs convertidos', async () => {
    apiMock.getDashboard.mockResolvedValue(DASHBOARD);
    apiMock.listSubs.mockResolvedValue(SUBS);
    apiMock.getWalletBalance.mockResolvedValue({ balance: '25000000', spendable: '25000000' });

    const { result } = renderHookInProvider();
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.dashboard).toEqual(DASHBOARD);
    expect(result.current.subs).toEqual([
      { id: 's1', name: 'Netflix', price: 59.9, category: 'streaming', priority: 0 },
    ]);
    expect(result.current.balance).toEqual({ balance: 25, spendable: 25 });
  });

  it('não busca nada enquanto o Privy não autentica', async () => {
    privyMock.authenticated = false;
    const { result } = renderHookInProvider();
    expect(result.current.ready).toBe(false);
    expect(apiMock.getDashboard).not.toHaveBeenCalled();
  });

  it('flag de erro quando a carga falha', async () => {
    apiMock.getDashboard.mockRejectedValue(new Error('boom'));
    apiMock.listSubs.mockResolvedValue([]);
    apiMock.getWalletBalance.mockResolvedValue({ balance: '0', spendable: '0' });

    const { result } = renderHookInProvider();
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe(true);
  });
});
