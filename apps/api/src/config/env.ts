import { z } from 'zod';
import type { AppEnv } from '@yield2pay/shared';

const schema = z
  .object({
    DATABASE_URL: z.string().min(1),
    PRIVY_APP_ID: z.string().min(1),
    PRIVY_APP_SECRET: z.string().min(1),
    // Cluster lógico da Solana. 'mainnet-beta' é o nome que o web3.js usa.
    SOLANA_CLUSTER: z.enum(['devnet', 'mainnet-beta']),
    SOLANA_RPC_URL: z.string().url(),
    // Mint da moeda de depósito no cluster escolhido. Em mainnet, USDC de
    // verdade. Em devnet com VAULT_PROVIDER=mock, é o mint de "Real de teste"
    // criado por apps/api/scripts/create-mock-devnet-mints.cjs — não é USDC.
    USDC_MINT: z.string().min(1),
    // Qual VaultService o VaultModule instancia. 'kamino' fala com uma reserve
    // Kamino Lend de verdade (exige mainnet — Kamino não tem oracle Scope em
    // devnet). 'mock' usa dois SPL tokens de teste (moeda + cota), sem
    // Kamino, para testar o fluxo completo (depósito/saque/dashboard) em
    // devnet sem nenhuma dependência mainnet.
    VAULT_PROVIDER: z.enum(['kamino', 'mock']).default('kamino'),
    // Cofre Kamino: só usado quando VAULT_PROVIDER=kamino (ver superRefine).
    KAMINO_MARKET_ADDRESS: z.string().optional(),
    KAMINO_RESERVE_ADDRESS: z.string().optional(),
    // Cofre mock: só usado quando VAULT_PROVIDER=mock (ver superRefine).
    // Mint do SPL token de "cota" — criar com
    // apps/api/scripts/create-mock-devnet-mints.cjs.
    MOCK_VAULT_SHARE_MINT: z.string().optional(),
    // APY exibido pelo cofre mock (não há rendimento real). String de
    // percentual, mesmo formato que KaminoVaultService.getApyPercent devolve.
    MOCK_VAULT_APY_PERCENT: z.string().default('5.00'),
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
  })
  .superRefine((val, ctx) => {
    if (val.VAULT_PROVIDER === 'kamino') {
      if (!val.KAMINO_MARKET_ADDRESS) {
        ctx.addIssue({
          code: 'custom',
          path: ['KAMINO_MARKET_ADDRESS'],
          message: 'required when VAULT_PROVIDER=kamino',
        });
      }
      if (!val.KAMINO_RESERVE_ADDRESS) {
        ctx.addIssue({
          code: 'custom',
          path: ['KAMINO_RESERVE_ADDRESS'],
          message: 'required when VAULT_PROVIDER=kamino',
        });
      }
    } else {
      if (!val.MOCK_VAULT_SHARE_MINT) {
        ctx.addIssue({
          code: 'custom',
          path: ['MOCK_VAULT_SHARE_MINT'],
          message: 'required when VAULT_PROVIDER=mock',
        });
      }
      if (val.SOLANA_CLUSTER === 'mainnet-beta') {
        ctx.addIssue({
          code: 'custom',
          path: ['VAULT_PROVIDER'],
          message: 'mock vault is devnet-only; refusing to run on mainnet-beta',
        });
      }
    }
  });

export type Env = {
  databaseUrl: string;
  privyAppId: string;
  privyAppSecret: string;
  solanaCluster: 'devnet' | 'mainnet-beta';
  solanaRpcUrl: string;
  usdcMint: string;
  vaultProvider: 'kamino' | 'mock';
  kaminoMarketAddress: string;
  kaminoReserveAddress: string;
  mockVaultShareMint: string;
  mockVaultApyPercent: string;
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
    vaultProvider: parsed.VAULT_PROVIDER,
    // superRefine já garantiu que estes existem quando o provider os exige;
    // fora desse caso o provider correspondente nunca é instanciado, então o
    // valor vazio nunca é lido.
    kaminoMarketAddress: parsed.KAMINO_MARKET_ADDRESS ?? '',
    kaminoReserveAddress: parsed.KAMINO_RESERVE_ADDRESS ?? '',
    mockVaultShareMint: parsed.MOCK_VAULT_SHARE_MINT ?? '',
    mockVaultApyPercent: parsed.MOCK_VAULT_APY_PERCENT,
    feeSponsorSecretKey: parsed.FEE_SPONSOR_SECRET_KEY,
    port: parsed.PORT,
    appEnv: parsed.APP_ENV,
    demoYieldBps: parsed.DEMO_YIELD_BPS,
    demoReturnsChangePercent: parsed.DEMO_RETURNS_CHANGE_PERCENT,
  };
}
