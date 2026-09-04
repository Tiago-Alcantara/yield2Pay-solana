'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { createSolanaRpc, createSolanaRpcSubscriptions } from '@solana/kit';

const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

// A real Privy app id is a ~25-char token (e.g. "cmxxxxxxxxxxxxxxxxxxxxxxx").
// Without a valid one, mounting PrivyProvider throws and takes the whole app
// down — including the public landing. Gate it so the app still renders for
// local preview; auth-dependent screens (login, /family) require a real id set
// in apps/web/.env.local.
const hasValidAppId =
  !!appId && appId !== 'placeholder-app-id' && appId.length >= 20;

export function PrivyProviderWrapper({ children }: { children: React.ReactNode }) {
  if (!hasValidAppId) {
    if (typeof window !== 'undefined') {
      console.warn(
        '[Yield2Pay] NEXT_PUBLIC_PRIVY_APP_ID is missing or invalid — running without Privy. ' +
          'Set a real Privy app id in apps/web/.env.local to enable login and the authenticated screens.',
      );
    }
    return <>{children}</>;
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ['google'],
        appearance: { theme: 'dark', accentColor: '#C0C2C5' },
        // A família nunca escolhe rede nem carteira: a carteira Solana nasce no
        // primeiro login e é a única. Ethereum fica 'off' para não criar uma
        // carteira morta em toda conta.
        //
        // Só carteira embedded, sem connectors externos (Phantom etc.): quem usa
        // o produto não tem carteira e não deve precisar de uma.
        embeddedWallets: {
          ethereum: { createOnLogin: 'off' },
          solana: { createOnLogin: 'users-without-wallets' },
        },
        // Sem plugin de RPCs default ativo, o Privy não resolve RPC pra
        // nenhuma chain sozinho — signTransaction/signAndSendTransaction
        // estouram "No RPC configuration found" mesmo passando `chain`
        // explícito. Só devnet: é o único cluster que este app usa (ver
        // apps/api/.env SOLANA_CLUSTER).
        solana: {
          rpcs: {
            'solana:devnet': {
              rpc: createSolanaRpc('https://api.devnet.solana.com'),
              rpcSubscriptions: createSolanaRpcSubscriptions(
                'wss://api.devnet.solana.com',
              ),
            },
          },
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
