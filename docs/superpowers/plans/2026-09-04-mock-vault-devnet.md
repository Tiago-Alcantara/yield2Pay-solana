# Mock Vault for Devnet Testing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the deposit/withdraw/dashboard flow run end-to-end on Solana devnet with real on-chain transactions, without depending on Kamino — Kamino has no usable market on devnet today — and using a mock **Real (BRL)** test currency instead of USDC, matching the product's actual audience.

**Architecture:** `VaultService` becomes an abstract class (the contract `DepositService`/`WithdrawService`/`LedgerService` already depend on). The existing Kamino implementation moves unchanged into `KaminoVaultService`. A new `MockVaultService` implements the same contract using two SPL mints we create and control: a **mock Real (BRL)** currency mint (what `USDC_MINT` points to when testing on devnet — replaces Circle's real devnet USDC entirely, so testing needs no external faucet) and a **share** mint 1:1 with it. Deposit transfers the user's mock-Real balance into a sponsor-owned treasury ATA and mints the user an equal amount of shares; withdraw burns the shares and transfers the mock-Real back. `VaultModule` picks the implementation at boot via a `VAULT_PROVIDER` env var. No behavior changes for `VAULT_PROVIDER=kamino` (the default).

**Tech Stack:** NestJS, `@solana/web3.js` v1, `@solana/spl-token` v0.4, Vitest.

**Spec:** Findings from this conversation's investigation (see Global Constraints) — no separate spec doc.

## Global Constraints

- **Mainnet is vetoed entirely.** This plan only touches `devnet`. Nothing here creates or references mainnet accounts.
- **Root cause confirmed in this conversation:** the Scope oracle program (`HFn8GnPADiny6XqUoWE8uRPPxb29ikn4yTuPa9MF2fWJ`), which every Kamino Klend reserve requires for pricing, is **not deployed on devnet** (`getAccountInfo` via `https://api.devnet.solana.com` returns `null` for that address). The Klend program itself *is* deployed on devnet, but without Scope no reserve can be created there. This is a Kamino infra limitation, not something fixable in this repo — **this must be stated plainly in the README** (Task 2), not just in this plan.
- **Product audience is Brazilian families; the mock currency reflects that.** This app's real-money unit is meant to be the Real (BRL), arriving via PIX in a future ramp (see README roadmap). For devnet testing, the mock vault therefore uses a **custom mock "Real" SPL token that this repo mints itself** — not Circle's real devnet USDC — so the numbers a tester sees say "Real de teste", not a dollar stablecoin they didn't deposit. This also removes the external-faucet dependency: since the sponsor is the mint authority, test funds can be minted on demand (Task 2's faucet script).
- Fixing the existing (invalid) `KAMINO_MARKET_ADDRESS` / `KAMINO_RESERVE_ADDRESS` in `.env.example` is **out of scope** here — those only matter for `VAULT_PROVIDER=kamino`, which requires mainnet or Kamino's staging environment (both vetoed for this plan).
- The public interface of `VaultService` (`buildDepositInstructions`, `buildWithdrawInstructions`, `getApyPercent`, `getPositionValue`) does not change — callers (`DepositService`, `WithdrawService`, `LedgerService`) are not touched.
- `USDC_MINT` (the env var name) is unchanged — renaming it repo-wide is out of scope — but for `VAULT_PROVIDER=mock` its *value* is the mock Real mint from Task 2, not a real USDC mint. `SolanaService`, `WalletService.getBalance`, and the ATA-creation-on-registration flow all key off this same var, so the wallet balance shown to the user and what `MockVaultService` moves are always the same asset.
- Commits: only when the user asks (CLAUDE.md), grouped.

## Context for whoever executes this

- `apps/api/src/vault/vault.service.ts` — currently the concrete Kamino implementation. This plan splits it into an abstract contract (`vault.service.ts`) + concrete class (`kamino-vault.service.ts`).
- `apps/api/src/vault/vault.service.spec.ts` — existing tests for the Kamino implementation; moves to `kamino-vault.service.spec.ts` with an updated import, unchanged otherwise.
- `apps/api/src/vault/vault.module.ts` — currently `providers: [VaultService]`. Becomes a factory provider that picks `KaminoVaultService` or `MockVaultService` based on `config.vaultProvider`.
- `apps/api/src/solana/solana.service.ts` — already exposes `connection: Connection` (getter) and `sponsorAddress: string` (getter, base58). `MockVaultService` uses both; it never touches the sponsor's private key directly — the sponsor's *public* key is enough because `SolanaService.buildSponsoredTransaction` (unchanged, called by `DepositService`/`WithdrawService`) already signs the whole transaction with the sponsor keypair as fee payer, which also satisfies any sponsor-authority requirement (mint authority, treasury-ATA owner) inside the same transaction. `SolanaService.usdcMint` (private, built from `config.usdcMint`) is also unchanged — it will just hold the mock Real mint's address when `VAULT_PROVIDER=mock`.
- `apps/api/src/config/env.ts` — env schema (zod). This plan adds `VAULT_PROVIDER`, `MOCK_VAULT_SHARE_MINT`, `MOCK_VAULT_APY_PERCENT`, and makes `KAMINO_MARKET_ADDRESS`/`KAMINO_RESERVE_ADDRESS` conditionally required (only when `VAULT_PROVIDER=kamino`).
- `README.md` / `README.en.md` — already frame the product around Brazilian families and reais; this plan adds an explicit callout about the Kamino/devnet limitation and the mock currency, so nobody reading the README mistakes the devnet mock for a real Kamino-backed USDC vault.
- `apps/api/scripts/create-usdc-vault.js` and `apps/api/scripts/check-vault-balance.cjs` — leftover from the old DeFindex/Stellar vault. Unrelated to Kamino or this plan; deleted in Task 2 as pure cleanup.

---

### Task 1: Split VaultService into an abstract contract + Kamino/Mock implementations

**Files:**
- Create: `apps/api/src/vault/kamino-vault.service.ts`
- Create: `apps/api/src/vault/kamino-vault.service.spec.ts` (moved from `vault.service.spec.ts`)
- Create: `apps/api/src/vault/mock-vault.service.ts`
- Create: `apps/api/src/vault/mock-vault.service.spec.ts`
- Modify: `apps/api/src/vault/vault.service.ts` (becomes the abstract contract)
- Modify: `apps/api/src/vault/vault.module.ts`
- Modify: `apps/api/src/config/env.ts`
- Delete: `apps/api/src/vault/vault.service.spec.ts` (superseded by `kamino-vault.service.spec.ts`)

**Interfaces:**
- Consumes: `SolanaService.connection: Connection`, `SolanaService.sponsorAddress: string` (both already exist, unchanged).
- Produces: `VaultService` (abstract) with `buildDepositInstructions(ownerAddress: string, amountBaseUnits: bigint): Promise<TransactionInstruction[]>`, `buildWithdrawInstructions(ownerAddress: string, amountBaseUnits: bigint): Promise<TransactionInstruction[]>`, `getApyPercent(): Promise<string>`, `getPositionValue(ownerAddress: string): Promise<bigint>` — the exact shape `DepositService`/`WithdrawService`/`LedgerService` already call.

- [ ] **Step 1: Env schema — add `VAULT_PROVIDER` and mock config, make Kamino address fields conditional**

Replace the schema in `apps/api/src/config/env.ts`:

```ts
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
```

- [ ] **Step 2: Run the existing API test suite to confirm the env change alone doesn't break anything**

Run: `pnpm --filter @yield2pay/api exec vitest run`
Expected: PASS (no test constructs `Env` with `VAULT_PROVIDER` unset in a way that hits the new `superRefine` — every existing env fixture sets `kaminoMarketAddress`/`kaminoReserveAddress` directly as an `Env` object, not through `loadEnv`, so the schema change doesn't touch them).

- [ ] **Step 3: Turn `vault.service.ts` into the abstract contract**

Replace the entire contents of `apps/api/src/vault/vault.service.ts`:

```ts
import type { TransactionInstruction } from '@solana/web3.js';

/**
 * Cofre de rendimento. Duas implementações: `KaminoVaultService` (reserve
 * Kamino real, exige mainnet) e `MockVaultService` (SPL tokens de teste —
 * "Real" + cota — para testar o fluxo completo em devnet sem Kamino — ver
 * docs/superpowers/plans/2026-09-04-mock-vault-devnet.md). `VaultModule`
 * escolhe qual instanciar via `Env.vaultProvider`.
 */
export abstract class VaultService {
  abstract buildDepositInstructions(
    ownerAddress: string,
    amountBaseUnits: bigint,
  ): Promise<TransactionInstruction[]>;

  abstract buildWithdrawInstructions(
    ownerAddress: string,
    amountBaseUnits: bigint,
  ): Promise<TransactionInstruction[]>;

  /** APY de supply como string de percentual (ex.: '8.12'). */
  abstract getApyPercent(): Promise<string>;

  /** Valor resgatável da posição, em base units da moeda de depósito (6 casas). */
  abstract getPositionValue(ownerAddress: string): Promise<bigint>;
}
```

- [ ] **Step 4: Move the Kamino implementation into its own file**

Create `apps/api/src/vault/kamino-vault.service.ts` with the exact content the old `vault.service.ts` had, minus the file-level doc comment (now redundant with the abstract class's), renamed to `KaminoVaultService`, and `extends VaultService`. This class is now instantiated manually by `VaultModule`'s factory (Step 10), not resolved by Nest's DI container, so the `@Injectable()` decorator and `@Inject(APP_CONFIG)` parameter decorator are dropped — the constructor just takes `Env` directly:

```ts
import { Logger, BadRequestException } from '@nestjs/common';
import { TransactionInstruction, PublicKey } from '@solana/web3.js';
import { createSolanaRpc, createNoopSigner, address, AccountRole, type Instruction } from '@solana/kit';
import {
  KaminoMarket,
  KaminoAction,
  VanillaObligation,
  PROGRAM_ID,
  DEFAULT_RECENT_SLOT_DURATION_MS,
  getCurrentLedgerInstant,
  type KaminoMarket as KaminoMarketType,
  type KaminoReserve,
} from '@kamino-finance/klend-sdk';
import type { Env } from '../config/env';
import { VaultService } from './vault.service';

/** Cofre de rendimento contra uma reserve Kamino Lend real (mainnet-only). */
export class KaminoVaultService extends VaultService {
  private readonly logger = new Logger(KaminoVaultService.name);
  private readonly marketAddress: string;
  private readonly reserveAddress: string;
  private readonly rpc: ReturnType<typeof createSolanaRpc>;
  private market: KaminoMarketType | null = null;
  private marketLoading: Promise<KaminoMarketType> | null = null;

  constructor(config: Env) {
    super();
    this.marketAddress = config.kaminoMarketAddress;
    this.reserveAddress = config.kaminoReserveAddress;
    this.rpc = createSolanaRpc(config.solanaRpcUrl);
  }

  /** Market e reserve configurados. Expostos para log e para o VaultPosition. */
  get target(): { marketAddress: string; reserveAddress: string } {
    return {
      marketAddress: this.marketAddress,
      reserveAddress: this.reserveAddress,
    };
  }

  private async getMarket(): Promise<KaminoMarketType> {
    if (this.market) return this.market;
    this.marketLoading ??= KaminoMarket.load(
      this.rpc,
      this.marketAddress as Parameters<typeof KaminoMarket.load>[1],
      DEFAULT_RECENT_SLOT_DURATION_MS,
    )
      .then((m) => {
        if (!m) {
          throw new Error(
            `KaminoMarket.load returned null for market ${this.marketAddress}`,
          );
        }
        this.market = m;
        return m;
      })
      .catch((err) => {
        this.marketLoading = null;
        throw err;
      });
    return this.marketLoading;
  }

  private async getReserve(): Promise<KaminoReserve> {
    const market = await this.getMarket();
    const reserve = market.getReserveByAddress(
      this.reserveAddress as Parameters<typeof market.getReserveByAddress>[0],
    );
    if (!reserve) {
      throw new Error(
        `reserve ${this.reserveAddress} not found in market ${this.marketAddress}`,
      );
    }
    return reserve;
  }

  async buildDepositInstructions(
    ownerAddress: string,
    amountBaseUnits: bigint,
  ): Promise<TransactionInstruction[]> {
    let validatedOwner: string;
    try {
      new PublicKey(ownerAddress);
      validatedOwner = ownerAddress;
    } catch {
      throw new BadRequestException(`invalid owner address: ${ownerAddress}`);
    }

    const [market, , instant] = await Promise.all([
      this.getMarket(),
      this.getReserve(),
      getCurrentLedgerInstant(this.rpc),
    ]);

    const owner = createNoopSigner(address(validatedOwner));
    const action = await KaminoAction.buildDepositTxns({
      kaminoMarket: market,
      amount: amountBaseUnits.toString(),
      reserveAddress: address(this.reserveAddress),
      owner,
      obligation: new VanillaObligation(PROGRAM_ID),
      useV2Ixs: true,
      scopeRefreshConfig: undefined,
      currentLedgerInstant: instant,
    });

    return KaminoAction.actionToIxs(action).map(KaminoVaultService.kitIxToWeb3);
  }

  private static kitIxToWeb3(ix: Instruction): TransactionInstruction {
    return new TransactionInstruction({
      programId: new PublicKey(ix.programAddress as string),
      keys: (ix.accounts ?? []).map((acc) => ({
        pubkey: new PublicKey(acc.address as string),
        isSigner:
          acc.role === AccountRole.READONLY_SIGNER ||
          acc.role === AccountRole.WRITABLE_SIGNER,
        isWritable:
          acc.role === AccountRole.WRITABLE ||
          acc.role === AccountRole.WRITABLE_SIGNER,
      })),
      data: ix.data ? Buffer.from(ix.data) : Buffer.alloc(0),
    });
  }

  async buildWithdrawInstructions(
    ownerAddress: string,
    amountBaseUnits: bigint,
  ): Promise<TransactionInstruction[]> {
    let validatedOwner: string;
    try {
      new PublicKey(ownerAddress);
      validatedOwner = ownerAddress;
    } catch {
      throw new BadRequestException(`invalid owner address: ${ownerAddress}`);
    }

    const [market, , instant] = await Promise.all([
      this.getMarket(),
      this.getReserve(),
      getCurrentLedgerInstant(this.rpc),
    ]);

    const owner = createNoopSigner(address(validatedOwner));
    const action = await KaminoAction.buildWithdrawTxns({
      kaminoMarket: market,
      amount: amountBaseUnits.toString(),
      reserveAddress: address(this.reserveAddress),
      owner,
      obligation: new VanillaObligation(PROGRAM_ID),
      useV2Ixs: true,
      scopeRefreshConfig: undefined,
      currentLedgerInstant: instant,
    });

    return KaminoAction.actionToIxs(action).map(KaminoVaultService.kitIxToWeb3);
  }

  async getApyPercent(): Promise<string> {
    const reserve = await this.getReserve();
    const instant = await getCurrentLedgerInstant(this.rpc);
    const apy = reserve.totalSupplyAPY(instant);
    return (apy * 100).toFixed(2);
  }

  async getPositionValue(ownerAddress: string): Promise<bigint> {
    const [market, reserve] = await Promise.all([
      this.getMarket(),
      this.getReserve(),
    ]);

    const obligation = await market.getUserVanillaObligation(
      address(ownerAddress),
    );
    if (!obligation) return 0n;

    const amount = obligation.getDepositAmountByReserve(reserve);
    if (!amount) return 0n;

    return BigInt(amount.floor().toString());
  }
}
```

- [ ] **Step 5: Move and adjust the Kamino spec**

Delete `apps/api/src/vault/vault.service.spec.ts` and create `apps/api/src/vault/kamino-vault.service.spec.ts` with the exact same content, with two mechanical edits: `import { VaultService } from './vault.service';` → `import { KaminoVaultService } from './kamino-vault.service';`, and `new VaultService(env)` → `new KaminoVaultService(env)` (both occurrences: in `makeService()` and the plain `new VaultService(env)` inside the describe blocks). No other lines change.

Run: `pnpm --filter @yield2pay/api exec vitest run src/vault/kamino-vault.service.spec.ts`
Expected: PASS (same assertions as before, just renamed).

- [ ] **Step 6: Write the failing test for `MockVaultService`**

Create `apps/api/src/vault/mock-vault.service.spec.ts`:

```ts
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
```

- [ ] **Step 7: Run the test to verify it fails**

Run: `pnpm --filter @yield2pay/api exec vitest run src/vault/mock-vault.service.spec.ts`
Expected: FAIL — `Cannot find module './mock-vault.service'`.

- [ ] **Step 8: Implement `MockVaultService`**

Create `apps/api/src/vault/mock-vault.service.ts`:

```ts
import { BadRequestException } from '@nestjs/common';
import { PublicKey, type TransactionInstruction } from '@solana/web3.js';
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createBurnInstruction,
  createMintToInstruction,
  createTransferCheckedInstruction,
  getAccount,
  getAssociatedTokenAddress,
} from '@solana/spl-token';
import type { Env } from '../config/env';
import type { SolanaService } from '../solana/solana.service';
import { VaultService } from './vault.service';

const CURRENCY_DECIMALS = 6;

/**
 * Cofre de mentira para testar o fluxo completo (depósito/saque/dashboard) em
 * devnet sem Kamino: a Kamino não tem o oracle Scope deployado em devnet
 * (confirmado via getAccountInfo do programa Scope — conta null lá), então
 * nenhuma reserve real pode existir nesse cluster hoje.
 *
 * A moeda também é mock: `config.usdcMint` aqui é o mint de "Real de teste"
 * criado por apps/api/scripts/create-mock-devnet-mints.cjs, não USDC — o
 * público do produto são famílias brasileiras que vão depositar Real via PIX
 * (rampa ainda no roadmap), então o teste em devnet já usa uma moeda que se
 * comporta como Real, não como dólar.
 *
 * Modela um cofre com um segundo SPL token de "cota" 1:1 com a moeda (sem
 * rendimento real): depositar move a moeda de teste do dono para uma ATA de
 * tesouraria do sponsor e emite a mesma quantidade em cotas para o dono;
 * sacar queima as cotas e devolve a moeda. `getApyPercent` é um valor
 * configurado, não calculado — não há juros de verdade para calcular.
 */
export class MockVaultService extends VaultService {
  private readonly currencyMint: PublicKey;
  private readonly shareMint: PublicKey;
  private readonly sponsor: PublicKey;
  private readonly apyPercent: string;

  constructor(
    config: Env,
    private readonly solana: SolanaService,
  ) {
    super();
    if (!config.mockVaultShareMint) {
      // Já validado por Env.superRefine quando VAULT_PROVIDER=mock; esta
      // checagem é defesa contra instanciação manual incorreta.
      throw new Error(
        'MOCK_VAULT_SHARE_MINT is required to use MockVaultService',
      );
    }
    this.currencyMint = new PublicKey(config.usdcMint);
    this.shareMint = new PublicKey(config.mockVaultShareMint);
    this.sponsor = new PublicKey(solana.sponsorAddress);
    this.apyPercent = config.mockVaultApyPercent;
  }

  private static validateOwner(ownerAddress: string): PublicKey {
    try {
      return new PublicKey(ownerAddress);
    } catch {
      throw new BadRequestException(`invalid owner address: ${ownerAddress}`);
    }
  }

  async buildDepositInstructions(
    ownerAddress: string,
    amountBaseUnits: bigint,
  ): Promise<TransactionInstruction[]> {
    const owner = MockVaultService.validateOwner(ownerAddress);
    const [ownerCurrencyAta, treasuryCurrencyAta, ownerShareAta] =
      await Promise.all([
        getAssociatedTokenAddress(this.currencyMint, owner),
        getAssociatedTokenAddress(this.currencyMint, this.sponsor),
        getAssociatedTokenAddress(this.shareMint, owner),
      ]);

    return [
      // Idempotente: só cria na 1ª vez, seguro em depósitos concorrentes.
      createAssociatedTokenAccountIdempotentInstruction(
        this.sponsor,
        treasuryCurrencyAta,
        this.sponsor,
        this.currencyMint,
      ),
      createAssociatedTokenAccountIdempotentInstruction(
        this.sponsor,
        ownerShareAta,
        owner,
        this.shareMint,
      ),
      createTransferCheckedInstruction(
        ownerCurrencyAta,
        this.currencyMint,
        treasuryCurrencyAta,
        owner,
        amountBaseUnits,
        CURRENCY_DECIMALS,
      ),
      createMintToInstruction(
        this.shareMint,
        ownerShareAta,
        this.sponsor,
        amountBaseUnits,
      ),
    ];
  }

  async buildWithdrawInstructions(
    ownerAddress: string,
    amountBaseUnits: bigint,
  ): Promise<TransactionInstruction[]> {
    const owner = MockVaultService.validateOwner(ownerAddress);
    const [ownerCurrencyAta, treasuryCurrencyAta, ownerShareAta] =
      await Promise.all([
        getAssociatedTokenAddress(this.currencyMint, owner),
        getAssociatedTokenAddress(this.currencyMint, this.sponsor),
        getAssociatedTokenAddress(this.shareMint, owner),
      ]);

    return [
      createBurnInstruction(ownerShareAta, this.shareMint, owner, amountBaseUnits),
      createTransferCheckedInstruction(
        treasuryCurrencyAta,
        this.currencyMint,
        ownerCurrencyAta,
        this.sponsor,
        amountBaseUnits,
        CURRENCY_DECIMALS,
      ),
    ];
  }

  async getApyPercent(): Promise<string> {
    return this.apyPercent;
  }

  async getPositionValue(ownerAddress: string): Promise<bigint> {
    const owner = MockVaultService.validateOwner(ownerAddress);
    const ata = await getAssociatedTokenAddress(this.shareMint, owner);
    try {
      const account = await getAccount(this.solana.connection, ata);
      return account.amount;
    } catch {
      // ATA ainda não criada → nunca depositou. Não é erro.
      return 0n;
    }
  }
}
```

- [ ] **Step 9: Run the test to verify it passes**

Run: `pnpm --filter @yield2pay/api exec vitest run src/vault/mock-vault.service.spec.ts`
Expected: PASS.

- [ ] **Step 10: Wire `VaultModule` to pick the implementation**

Replace `apps/api/src/vault/vault.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { APP_CONFIG } from '../config/config.module';
import type { Env } from '../config/env';
import { SolanaModule } from '../solana/solana.module';
import { SolanaService } from '../solana/solana.service';
import { VaultService } from './vault.service';
import { KaminoVaultService } from './kamino-vault.service';
import { MockVaultService } from './mock-vault.service';

@Module({
  imports: [SolanaModule],
  providers: [
    {
      provide: VaultService,
      useFactory: (config: Env, solana: SolanaService): VaultService =>
        config.vaultProvider === 'mock'
          ? new MockVaultService(config, solana)
          : new KaminoVaultService(config),
      inject: [APP_CONFIG, SolanaService],
    },
  ],
  exports: [VaultService],
})
export class VaultModule {}
```

- [ ] **Step 11: Run the whole API suite and the type check**

Run: `pnpm --filter @yield2pay/api exec vitest run && pnpm --filter @yield2pay/api exec tsc --noEmit`
Expected: PASS completo — `DepositService`, `WithdrawService`, `LedgerService` specs untouched and still green (they type against `VaultService`, unaffected by which concrete class backs it).

- [ ] **Step 12: Commit**

```bash
git add apps/api/src/vault apps/api/src/config/env.ts
git commit -m "$(cat <<'EOF'
feat(vault): split VaultService into Kamino/Mock implementations

Kamino requires mainnet (no Scope oracle on devnet); MockVaultService
lets deposit/withdraw/dashboard be tested end-to-end on devnet with
mock Real (BRL) + share SPL tokens instead.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_019EaPR4oSZo73ejkDWKa3QA
EOF
)"
```

---

### Task 2: Mock currency + share mint setup scripts, docs, and dead-code cleanup

**Files:**
- Create: `apps/api/scripts/create-mock-devnet-mints.cjs`
- Create: `apps/api/scripts/mint-test-currency.cjs`
- Modify: `apps/api/.env.example`
- Modify: `docs/DEPLOY.md`
- Modify: `README.md`
- Modify: `README.en.md`
- Delete: `apps/api/scripts/create-usdc-vault.js`
- Delete: `apps/api/scripts/check-vault-balance.cjs`

**Interfaces:**
- Consumes: `FEE_SPONSOR_SECRET_KEY` and `SOLANA_RPC_URL` from `apps/api/.env` (same loading convention as the existing sponsor keypair in `solana.service.ts`).
- Produces: `create-mock-devnet-mints.cjs` prints `USDC_MINT=<address>` (the mock Real currency) and `MOCK_VAULT_SHARE_MINT=<address>` (the vault share token) to paste into `.env`. `mint-test-currency.cjs <wallet> <amount>` mints test units of the mock Real currency into any devnet wallet — the sponsor is the mint authority, so this replaces needing an external USDC faucet.

- [ ] **Step 1: Delete the dead DeFindex/Stellar scripts**

```bash
git rm apps/api/scripts/create-usdc-vault.js apps/api/scripts/check-vault-balance.cjs
```

These talk to `@stellar/stellar-sdk` and `@defindex/sdk` — the vault this repo uses today is Solana/Kamino; these scripts are unreachable leftovers from before the migration.

- [ ] **Step 2: Write the mint-creation script**

Create `apps/api/scripts/create-mock-devnet-mints.cjs`:

```js
/* Cria os dois SPL mints usados pelo MockVaultService (VAULT_PROVIDER=mock)
 * em devnet: a moeda de teste ("Real de teste", substitui USDC_MINT) e a
 * cota do cofre mock. Rodar uma vez; os endereços impressos vão no
 * apps/api/.env. */
const path = require('path');
const { Connection, Keypair } = require('@solana/web3.js');
const { createMint } = require('@solana/spl-token');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

function loadSponsorKeypair(secret) {
  const trimmed = secret.trim();
  if (trimmed.startsWith('[')) {
    return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(trimmed)));
  }
  const decoded = Buffer.from(trimmed, 'base64');
  return Keypair.fromSecretKey(new Uint8Array(decoded));
}

(async () => {
  const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
  const secret = process.env.FEE_SPONSOR_SECRET_KEY;
  if (!secret) {
    console.error('FEE_SPONSOR_SECRET_KEY não definido em apps/api/.env');
    process.exit(1);
  }

  const sponsor = loadSponsorKeypair(secret);
  const connection = new Connection(rpcUrl, 'confirmed');

  console.log('sponsor:', sponsor.publicKey.toBase58());
  console.log('rpc:', rpcUrl);

  // decimals=6 em ambos, mesma granularidade que USDC — os valores em base
  // units batem 1:1 entre moeda e cota.
  const currencyMint = await createMint(
    connection,
    sponsor,
    sponsor.publicKey,
    null,
    6,
  );
  const shareMint = await createMint(
    connection,
    sponsor,
    sponsor.publicKey,
    null,
    6,
  );

  console.log('\nAdicione ao apps/api/.env:');
  console.log(`USDC_MINT=${currencyMint.toBase58()}`);
  console.log(`MOCK_VAULT_SHARE_MINT=${shareMint.toBase58()}`);
})().catch((e) => {
  console.error('FAIL:', e.message);
  process.exit(1);
});
```

- [ ] **Step 3: Write the test-currency faucet script**

Create `apps/api/scripts/mint-test-currency.cjs`:

```js
/* Emite unidades da moeda de teste ("Real de teste", USDC_MINT em modo mock)
 * para qualquer carteira devnet. O sponsor é a mint authority (criada por
 * create-mock-devnet-mints.cjs), então não depende de faucet externo.
 *
 * uso: node apps/api/scripts/mint-test-currency.cjs <carteira> <valor_em_reais>
 * exemplo: node apps/api/scripts/mint-test-currency.cjs 7xKX...9df 100
 */
const path = require('path');
const { Connection, Keypair, PublicKey } = require('@solana/web3.js');
const {
  getOrCreateAssociatedTokenAccount,
  mintTo,
} = require('@solana/spl-token');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const DECIMALS = 6;

(async () => {
  const [walletArg, amountArg] = process.argv.slice(2);
  if (!walletArg || !amountArg) {
    console.error(
      'uso: node apps/api/scripts/mint-test-currency.cjs <carteira> <valor_em_reais>',
    );
    process.exit(1);
  }

  const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
  const secret = process.env.FEE_SPONSOR_SECRET_KEY;
  const currencyMintAddress = process.env.USDC_MINT;
  if (!secret || !currencyMintAddress) {
    console.error(
      'FEE_SPONSOR_SECRET_KEY e USDC_MINT precisam estar em apps/api/.env',
    );
    process.exit(1);
  }

  const trimmed = secret.trim();
  const sponsor = trimmed.startsWith('[')
    ? Keypair.fromSecretKey(Uint8Array.from(JSON.parse(trimmed)))
    : Keypair.fromSecretKey(new Uint8Array(Buffer.from(trimmed, 'base64')));

  const connection = new Connection(rpcUrl, 'confirmed');
  const currencyMint = new PublicKey(currencyMintAddress);
  const wallet = new PublicKey(walletArg);
  const baseUnits = BigInt(Math.round(Number(amountArg) * 10 ** DECIMALS));

  const ata = await getOrCreateAssociatedTokenAccount(
    connection,
    sponsor,
    currencyMint,
    wallet,
  );
  await mintTo(connection, sponsor, currencyMint, ata.address, sponsor, baseUnits);

  console.log(`Emitido ${amountArg} (moeda de teste) para ${walletArg}`);
  console.log('ATA:', ata.address.toBase58());
})().catch((e) => {
  console.error('FAIL:', e.message);
  process.exit(1);
});
```

- [ ] **Step 4: Update `.env.example` for the devnet-mock setup**

In `apps/api/.env.example`, replace the cluster/USDC/Kamino block:

```bash
# Cluster lógico: devnet | mainnet-beta
SOLANA_CLUSTER=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com
# Moeda de depósito. Em devnet mock, é o mint de "Real de teste" (não USDC de
# verdade) — criar com: node apps/api/scripts/create-mock-devnet-mints.cjs
USDC_MINT=
# Qual VaultService usar: 'kamino' (reserve Kamino real — exige mainnet, a
# Kamino não tem oracle Scope em devnet) ou 'mock' (SPL tokens de teste, sem
# Kamino, para testar o fluxo completo em devnet). Ver
# docs/superpowers/plans/2026-09-04-mock-vault-devnet.md.
VAULT_PROVIDER=mock
# Só usado quando VAULT_PROVIDER=mock. Ver USDC_MINT acima — mesmo script cria os dois.
MOCK_VAULT_SHARE_MINT=
# APY exibido pelo cofre mock (string de percentual; não há rendimento real).
MOCK_VAULT_APY_PERCENT=5.00
```

Remove the old `KAMINO_MARKET_ADDRESS` / `KAMINO_RESERVE_ADDRESS` lines from `.env.example` entirely (they're optional now and only apply to `VAULT_PROVIDER=kamino`, which this example file isn't configured for).

- [ ] **Step 5: Update `docs/DEPLOY.md`**

In section "4. On-chain checklist (per environment)", replace the `KAMINO_MARKET_ADDRESS` / `KAMINO_RESERVE_ADDRESS` bullet and the `USDC_MINT` bullet with:

```markdown
- `USDC_MINT` — in devnet-mock mode this is **not** real USDC. Run
  `node apps/api/scripts/create-mock-devnet-mints.cjs` once; it prints both
  `USDC_MINT` (a mock "Real" test currency the sponsor controls) and
  `MOCK_VAULT_SHARE_MINT`. Fund a test wallet with
  `node apps/api/scripts/mint-test-currency.cjs <wallet> <amount>` — no
  external faucet needed.
- `VAULT_PROVIDER` — `mock` for devnet testing (no Kamino reserve exists on
  devnet — Kamino's Scope oracle isn't deployed there). `kamino` requires
  mainnet or Kamino's staging environment and is out of scope for devnet
  deploys.
```

- [ ] **Step 6: Add the Kamino/devnet limitation + mock-currency note to `README.md`**

In `README.md`, right after the `[!IMPORTANT]` callout under "📱 As telas `/family`" (the one starting "**O que ainda NÃO está ligado.**"), add a new callout:

```markdown
> [!WARNING]
> **Kamino não roda em devnet.** O oracle que toda reserve Kamino Lend exige
> (Scope, `HFn8GnPADiny6XqUoWE8uRPPxb29ikn4yTuPa9MF2fWJ`) não está deployado
> em devnet — confirmado consultando o programa on-chain diretamente. Sem
> Scope, nenhuma reserve Kamino funciona nesse cluster; usar Kamino de
> verdade exige mainnet (ou o ambiente de staging da Kamino, que também roda
> sobre infraestrutura mainnet). Por isso a devnet deste repo testa o fluxo
> completo (depósito, saque, dashboard) com um **cofre mock**
> (`VAULT_PROVIDER=mock`): dois SPL tokens de teste — uma moeda "Real de
> teste" no lugar de USDC e um token de cota — sem rendimento real e sem
> depender de nenhum faucet externo. Ver
> [`docs/superpowers/plans/2026-09-04-mock-vault-devnet.md`](docs/superpowers/plans/2026-09-04-mock-vault-devnet.md).
```

Also update the "Moeda" badge near the top (line 16) from `moeda-USDC` to reflect that devnet uses a mock Real, not USDC:

```markdown
![Moeda](https://img.shields.io/badge/moeda-Real_(mock_em_devnet)-2ea44f?style=for-the-badge&labelColor=0c0d0f)
```

- [ ] **Step 7: Mirror the same note in `README.en.md`**

In `README.en.md`, after the equivalent `[!IMPORTANT]` callout under "📱 The `/family` screens", add:

```markdown
> [!WARNING]
> **Kamino doesn't run on devnet.** The oracle every Kamino Lend reserve
> requires (Scope, `HFn8GnPADiny6XqUoWE8uRPPxb29ikn4yTuPa9MF2fWJ`) isn't
> deployed on devnet — confirmed by querying the on-chain program directly.
> Without Scope, no Kamino reserve works on that cluster; using real Kamino
> requires mainnet (or Kamino's staging environment, which also runs on
> mainnet infrastructure). That's why this repo's devnet setup tests the full
> flow (deposit, withdraw, dashboard) with a **mock vault**
> (`VAULT_PROVIDER=mock`): two test SPL tokens — a "test Real" standing in for
> USDC, and a share token — no real yield, no external faucet dependency. See
> [`docs/superpowers/plans/2026-09-04-mock-vault-devnet.md`](docs/superpowers/plans/2026-09-04-mock-vault-devnet.md).
```

And update the currency badge on line 16 the same way as the PT README.

- [ ] **Step 8: Commit**

```bash
git add apps/api/scripts apps/api/.env.example docs/DEPLOY.md README.md README.en.md
git commit -m "$(cat <<'EOF'
chore(vault): mock devnet currency (Real, not USDC) + document Kamino/devnet limitation

Drop dead DeFindex scripts; add scripts to create the mock currency +
share mints and to fund test wallets without an external faucet.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_019EaPR4oSZo73ejkDWKa3QA
EOF
)"
```

---

### Task 3: Devnet smoke test

**Files:**
- Create: `docs/superpowers/notes/mock-vault-devnet-smoke-log.md`

- [ ] **Step 1: Provision the sponsor and the mock mints**

```bash
solana-keygen new --no-bip39-passphrase -o sponsor.json
solana config set --url devnet
solana airdrop 2 $(solana-keygen pubkey sponsor.json)
```

Set `FEE_SPONSOR_SECRET_KEY` in `apps/api/.env` to the contents of `sponsor.json`, `SOLANA_CLUSTER=devnet`, `SOLANA_RPC_URL=https://api.devnet.solana.com`, `VAULT_PROVIDER=mock`.

Run: `node apps/api/scripts/create-mock-devnet-mints.cjs`
Set `USDC_MINT` and `MOCK_VAULT_SHARE_MINT` in `apps/api/.env` to the two printed addresses.

- [ ] **Step 2: Fund a test wallet with the mock currency**

```bash
node apps/api/scripts/mint-test-currency.cjs <test wallet address> 100
```

No external faucet needed — the sponsor mints directly.

- [ ] **Step 3: Run the app and exercise the flow**

```bash
pnpm --filter @yield2pay/api dev
pnpm --filter @yield2pay/web dev
```

1. Log in with Privy, register the wallet (`/family/dashboard` should render `0%`).
2. Deposit a small amount (`/family/deposito`).
3. Verify on a devnet explorer (e.g. `explorer.solana.com/?cluster=devnet`) that the transaction contains a `TransferChecked` (user → treasury) and a `MintTo` (sponsor → user's share ATA).
4. Dashboard principal increases by the deposited amount.
5. Withdraw part of it (`/family/saque`); verify the transaction contains a `Burn` and a `TransferChecked` back to the user; wallet balance increases; dashboard principal decreases accordingly.

- [ ] **Step 4: Log the results**

Create `docs/superpowers/notes/mock-vault-devnet-smoke-log.md` with: sponsor address, both mock mint addresses, both transaction signatures, before/after balances for principal and wallet balance. If any step fails, record the exact error and which step it happened at instead of the success log.

- [ ] **Step 5: Commit the log (only)**

```bash
git add docs/superpowers/notes/mock-vault-devnet-smoke-log.md
git commit -m "$(cat <<'EOF'
docs: log mock vault devnet smoke test

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_019EaPR4oSZo73ejkDWKa3QA
EOF
)"
```

---

## Self-Review

- **Cobertura:** os 4 métodos do contrato (`buildDepositInstructions`, `buildWithdrawInstructions`, `getApyPercent`, `getPositionValue`) têm implementação e teste no `MockVaultService` (Task 1); a seleção de implementação por env está coberta (Task 1, Step 10); provisionamento dos dois mints mock, faucet de teste, e limpeza de scripts mortos estão na Task 2, junto com o aviso no README (PT e EN) sobre Kamino não rodar em devnet e a moeda mock ser "Real de teste"; validação ponta a ponta real em devnet é a Task 3.
- **Placeholders:** nenhum — todo código é completo e usa assinaturas de `@solana/spl-token@0.4.15` e `@solana/web3.js@1.98.4` confirmadas nos typings instalados/publicados (verificado nesta conversa antes de escrever o plano).
- **Consistência de tipos:** `VaultService` abstrato define exatamente os 4 métodos que `DepositService`/`WithdrawService`/`LedgerService` já chamam (inalterados); `KaminoVaultService` e `MockVaultService` implementam a mesma assinatura; `Env.vaultProvider`/`mockVaultShareMint`/`mockVaultApyPercent`/`usdcMint` usados de forma consistente entre `env.ts`, `vault.module.ts`, `mock-vault.service.ts` e os scripts.
- **Fora do escopo, de propósito:** corrigir `KAMINO_MARKET_ADDRESS`/`KAMINO_RESERVE_ADDRESS` para valores reais (só importa em mainnet/staging, vetados); qualquer uso de Kamino staging (ainda é infraestrutura mainnet); rendimento real no cofre mock (não existe por design — é só para testar o fluxo); renomear a variável de ambiente `USDC_MINT` em si (só o valor muda em modo mock — renomear a variável tocaria `SolanaService`/`WalletService` sem necessidade).
