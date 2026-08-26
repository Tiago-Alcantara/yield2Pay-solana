import { z } from 'zod';
import type { AppEnv } from '@yield2pay/shared';

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  PRIVY_APP_ID: z.string().min(1),
  PRIVY_APP_SECRET: z.string().min(1),
  // Cluster lógico da Solana. 'mainnet-beta' é o nome que o web3.js usa.
  SOLANA_CLUSTER: z.enum(['devnet', 'mainnet-beta']),
  SOLANA_RPC_URL: z.string().url(),
  /// Mint do USDC no cluster escolhido (devnet e mainnet têm mints diferentes).
  USDC_MINT: z.string().min(1),
  // Cofre Kamino: o market e a reserve de USDC onde o aporte é aplicado.
  KAMINO_MARKET_ADDRESS: z.string().min(1),
  KAMINO_RESERVE_ADDRESS: z.string().min(1),
  /// Chave secreta da tesouraria, base58. Paga taxa e aluguel de ATA (feePayer).
  FEE_SPONSOR_SECRET_KEY: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(3000),
  // Ambiente lógico da aplicação. Governa o quanto o erro expõe: só fora de
  // 'production' a resposta de erro carrega technicalDetails (stack, endpoint,
  // requestId). Não derivamos de NODE_ENV porque o build de homologação também
  // roda como production.
  APP_ENV: z
    .enum(['production', 'staging', 'development'])
    .default('development'),
  DEMO_YIELD_BPS: z.coerce.number().int().nonnegative().default(0),
  DEMO_RETURNS_CHANGE_PERCENT: z.string().default('3.2'),
});

export type Env = {
  databaseUrl: string;
  privyAppId: string;
  privyAppSecret: string;
  solanaCluster: 'devnet' | 'mainnet-beta';
  solanaRpcUrl: string;
  usdcMint: string;
  kaminoMarketAddress: string;
  kaminoReserveAddress: string;
  feeSponsorSecretKey: string;
  port: number;
  appEnv: AppEnv;
  demoYieldBps: number;
  demoReturnsChangePercent: string;
};

export function loadEnv(raw: Record<string, string | undefined>): Env {
  const parsed = schema.parse(raw);
  return {
    databaseUrl: parsed.DATABASE_URL,
    privyAppId: parsed.PRIVY_APP_ID,
    privyAppSecret: parsed.PRIVY_APP_SECRET,
    solanaCluster: parsed.SOLANA_CLUSTER,
    solanaRpcUrl: parsed.SOLANA_RPC_URL,
    usdcMint: parsed.USDC_MINT,
    kaminoMarketAddress: parsed.KAMINO_MARKET_ADDRESS,
    kaminoReserveAddress: parsed.KAMINO_RESERVE_ADDRESS,
    feeSponsorSecretKey: parsed.FEE_SPONSOR_SECRET_KEY,
    port: parsed.PORT,
    appEnv: parsed.APP_ENV,
    demoYieldBps: parsed.DEMO_YIELD_BPS,
    demoReturnsChangePercent: parsed.DEMO_RETURNS_CHANGE_PERCENT,
  };
}
