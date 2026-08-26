'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useCreateWallet } from '@privy-io/react-auth/solana';
import { createApi } from './api';

/**
 * Devolve o endereço da carteira Solana embedded da família (ou null se ainda
 * não existe) e um `ensureWallet()` que acha ou cria a carteira e a registra no
 * backend (upsert idempotente).
 *
 * Contrato non-custodial: nunca tocamos chave privada — criar e assinar é
 * responsabilidade do Privy. Aqui só lemos o endereço.
 */
export function useWallet(): {
  address: string | null;
  ensureWallet: () => Promise<string>;
} {
  const { user, getAccessToken } = usePrivy();
  const { createWallet } = useCreateWallet();

  const solanaAccount = user?.linkedAccounts?.find(
    (a) =>
      a.type === 'wallet' &&
      (a as { chainType: string }).chainType === 'solana',
  ) as { address: string } | undefined;

  const address = solanaAccount?.address ?? null;

  async function ensureWallet(): Promise<string> {
    const api = createApi(getAccessToken);

    if (solanaAccount) {
      // Já existe — só registra (idempotente) e devolve o endereço.
      await api.registerWallet({ solanaAddress: solanaAccount.address });
      return solanaAccount.address;
    }

    // Sem carteira Solana ainda — pede ao Privy para criar.
    const { wallet } = await createWallet();
    const newAddress = wallet.address;

    await api.registerWallet({ solanaAddress: newAddress });
    return newAddress;
  }

  return { address, ensureWallet };
}
