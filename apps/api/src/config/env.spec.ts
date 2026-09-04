import { describe, expect, it } from 'vitest';
import { loadEnv } from './env';

const BASE_RAW = {
  DATABASE_URL: 'postgresql://localhost/db',
  PRIVY_APP_ID: 'app',
  PRIVY_APP_SECRET: 'secret',
  SOLANA_RPC_URL: 'https://api.devnet.solana.com',
  USDC_MINT: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  FEE_SPONSOR_SECRET_KEY: '[1,2,3]',
};

describe('loadEnv', () => {
  it('accepts VAULT_PROVIDER=mock on devnet', () => {
    expect(() =>
      loadEnv({
        ...BASE_RAW,
        SOLANA_CLUSTER: 'devnet',
        VAULT_PROVIDER: 'mock',
        MOCK_VAULT_SHARE_MINT: 'Es9vMFrzaCERZ4iGB9ffAnGREvvB4EQtnQoW9uz9tj9F',
      }),
    ).not.toThrow();
  });

  it('rejects VAULT_PROVIDER=mock on mainnet-beta', () => {
    expect(() =>
      loadEnv({
        ...BASE_RAW,
        SOLANA_CLUSTER: 'mainnet-beta',
        VAULT_PROVIDER: 'mock',
        MOCK_VAULT_SHARE_MINT: 'Es9vMFrzaCERZ4iGB9ffAnGREvvB4EQtnQoW9uz9tj9F',
      }),
    ).toThrow();
  });

  it('accepts VAULT_PROVIDER=kamino on mainnet-beta with market/reserve set', () => {
    expect(() =>
      loadEnv({
        ...BASE_RAW,
        SOLANA_CLUSTER: 'mainnet-beta',
        VAULT_PROVIDER: 'kamino',
        KAMINO_MARKET_ADDRESS: 'Market1111111111111111111111111111111111',
        KAMINO_RESERVE_ADDRESS: 'Reserve11111111111111111111111111111111',
      }),
    ).not.toThrow();
  });
});
