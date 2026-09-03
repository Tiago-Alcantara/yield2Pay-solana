'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { createApi } from '@/lib/api';
import type { SpendableView, Sub } from '@yield2pay/shared';
import { toUsdcNumber } from './familyFormat';

export interface FamilySubRow {
  id: string;
  name: string;
  /** Custo mensal em USDC (number) — já convertido de base units. */
  price: number;
  category: string;
  priority: number;
}

function toRow(sub: Sub): FamilySubRow {
  return {
    id: sub.id,
    name: sub.name,
    price: toUsdcNumber(sub.monthlyCost),
    category: sub.category,
    priority: sub.priority,
  };
}

export function useFamilyData() {
  const { ready, authenticated, getAccessToken } = usePrivy();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [dashboard, setDashboard] = useState<SpendableView | null>(null);
  const [balance, setBalance] = useState<{ balance: number; spendable: number } | null>(null);
  const [subs, setSubs] = useState<FamilySubRow[]>([]);

  const load = useCallback(async () => {
    // Três leituras independentes: falha em qualquer uma marca erro,
    // mas o que carregou já aparece.
    const api = createApi(getAccessToken);
    const results = await Promise.allSettled([
      api.getDashboard(),
      api.listSubs(),
      api.getWalletBalance(),
    ]);
    if (results[0].status === 'fulfilled') setDashboard(results[0].value);
    if (results[1].status === 'fulfilled') setSubs(results[1].value.map(toRow));
    if (results[2].status === 'fulfilled') {
      setBalance({
        balance: toUsdcNumber(results[2].value.balance),
        spendable: toUsdcNumber(results[2].value.spendable),
      });
    }
    setError(results.some((r) => r.status === 'rejected'));
    setLoading(false);
  }, [getAccessToken]);

  useEffect(() => {
    if (!ready || !authenticated) {
      setLoading(false);
      return;
    }
    void load();
  }, [ready, authenticated, load]);

  const createSub = useCallback(
    async (input: { name: string; price: number; category: string }) => {
      const api = createApi(getAccessToken);
      await api.createSub({
        name: input.name,
        monthlyCost: BigInt(Math.round(input.price * 10 ** 6)).toString(),
        category: input.category as Sub['category'],
      });
      await load();
    },
    [getAccessToken, load],
  );

  const deleteSub = useCallback(
    async (id: string) => {
      const api = createApi(getAccessToken);
      await api.deleteSub(id);
      await load();
    },
    [getAccessToken, load],
  );

  const reorderSubs = useCallback(
    async (idsInOrder: string[]) => {
      const api = createApi(getAccessToken);
      await api.reorderSubs({ subIds: idsInOrder });
      await load();
    },
    [getAccessToken, load],
  );

  return {
    ready: ready && authenticated,
    loading,
    error,
    dashboard,
    balance,
    subs,
    refresh: load,
    createSub,
    deleteSub,
    reorderSubs,
  };
}
