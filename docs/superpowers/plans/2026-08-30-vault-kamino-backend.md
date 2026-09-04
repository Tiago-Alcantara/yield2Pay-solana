# Vault Kamino no backend — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar `VaultService` com a SDK da Kamino (`@kamino-finance/klend-sdk`) para que depósito e saque reais funcionem: aporte aplica USDC na reserve configurada, resgate devolve para a carteira, dashboard lê posição e APY reais.

**Architecture:** `VaultService` continua sendo a única fronteira do cofre — os chamadores (deposit/withdraw/ledger services) não mudam. Ele passa a: carregar o `KaminoMarket` e a reserve de USDC via SDK; produzir **instruções** (não transações) para o `SolanaService.buildSponsoredTransaction` montar a VersionedTransaction com o sponsor como feePayer; ler APY e posição da reserve/obligation on-chain.

**Tech Stack:** NestJS, `@solana/web3.js` v1, `@kamino-finance/klend-sdk`, Vitest.

**Spec:** Levantamento do repo + decisões do usuário. A especificação do contrato de cada método está nos comentários do próprio `apps/api/src/vault/vault.service.ts` (linhas 1–32).

## Global Constraints

- A resposta de todos os métodos e as assinaturas dos chamadores NÃO mudam — só os corpos (`vault.service.ts` documenta o contrato).
- Depósito/saque são **by value em USDC base units (6 casas)**, nunca por quantidade de kTokens (share price sobe com o rendimento).
- `getPositionValue` devolve valor **resgatável** em base units (kTokens × exchange rate), não a contagem de kTokens.
- O sponsor é feePayer: instruções Kamino não podem embutir outra transação fechada — o que entra no `SolanaService` é `TransactionInstruction[]` plano.
- Commits: só quando o usuário pedir (CLAUDE.md), agrupados.
- **Fonte da verdade da SDK:** a Task 1 grava a superfície real da API instalada em `docs/superpowers/notes/kamino-sdk-api.md`. Se qualquer assinatura neste plano divergir daquele arquivo, **o arquivo vence** — ajustar o código e seguir.

## Contexto para quem executa

- `apps/api/src/vault/vault.service.ts` — stub com o contrato documentado. É o arquivo central deste plano.
- `apps/api/src/solana/solana.service.ts` — já pronto: `buildSponsoredTransaction(instructions)` e `submitSignedTransaction`. Possui `Connection` privada (construtor); será exposta via getter.
- `apps/api/src/deposit/deposit.service.ts` / `withdraw.service.ts` — chamam `vault.buildDepositInstructions(address, amount)` / `buildWithdrawInstructions` e empacotam com `solana.buildSponsoredTransaction`. Não mudam.
- `apps/api/src/ledger/ledger.service.ts` — chama `vault.getPositionValue(address)` e `vault.getApyPercent()`. Não muda.
- Env (`apps/api/src/config/env.ts`): `kaminoMarketAddress`, `kaminoReserveAddress` já existem e são validados.

---

### Task 1: Instalar SDK, verificar superfície e decidir o cluster (GATE)

Esta task é gate: a decisão devnet×mainnet e a forma exata das chamadas SDK saem daqui.

**Files:**
- Modify: `apps/api/package.json` (dependência)
- Create: `docs/superpowers/notes/kamino-sdk-api.md`

- [ ] **Step 1: Instalar a SDK**

```bash
pnpm --filter @yield2pay/api add @kamino-finance/klend-sdk
```

A SDK puxa `@solana/web3.js` como peer/dependência — conferir que a versão resolvida é compatível com a `^1.98.4` do repo (a SDK klend é da era web3.js 1.x; se ela puxar web3.js 2.x, travar `pnpm.overrides` para 1.98.x e validar `pnpm install`).

- [ ] **Step 2: Verificar a superfície real da SDK**

Ler os typings instalados (não a memória, não a internet):

```bash
ls node_modules/@kamino-finance/klend-sdk/dist/
grep -n "buildDepositTxns\|buildWithdrawTxns\|class KaminoAction\|constructor" \
  node_modules/@kamino-finance/klend-sdk/dist/kamino-action.d.ts 2>/dev/null \
  || find node_modules/@kamino-finance/klend-sdk/dist -name "*.d.ts" | head -20
grep -n "static load\|getReserve" node_modules/@kamino-finance/klend-sdk/dist/kamino-market.d.ts 2>/dev/null
grep -rn "supplyInterestAPY\|exchangeRate" node_modules/@kamino-finance/klend-sdk/dist/reserve.d.ts 2>/dev/null
```

Registrar em `docs/superpowers/notes/kamino-sdk-api.md`, com as assinaturas literais dos typings:

1. Construtor de `KaminoAction` (ordem e tipos dos parâmetros, enum `ACTIONS`).
2. Retorno de `buildDepositTxns()` / `buildWithdrawTxns()` (shape de `ITransactionLite`: campos `setupIxs`, transação principal, e como extrair `TransactionInstruction[]`).
3. `KaminoMarket.load(connection, marketAddress)` — assinatura e retorno.
4. `market.getReserve(reserveAddress)` — retorno (nullable?) e tipo `KaminoReserve`.
5. Como ler APY de supply da reserve (`reserve.stats.supplyInterestAPY` ou equivalente).
6. Como ler a posição de supply de um owner (kToken ATA balance × exchange rate — campos exatos: mint do kToken na reserve, campo do exchange rate) e como converter kTokens → USDC base units.
7. Se existe helper pronto (ex.: função na SDK que devolve o valor resgatável) — preferir helper a matemática manual.

- [ ] **Step 3: Investigar market na devnet (decisão de cluster)**

Com a SDK instalada, rodar um script one-off (`node` com ts-node do repo) que tenta carregar markets Kamino conhecidos na devnet:

```bash
# dentro de apps/api, com SOLANA_RPC_URL=devnet no env
node -e "
const { Connection, PublicKey } = require('@solana/web3.js');
const { KaminoMarket } = require('@kamino-finance/klend-sdk');
(async () => {
  const conn = new Connection('https://api.devnet.solana.com', 'confirmed');
  // Tentar carregar o market Kamino mainnet na devnet — se os programas não
  // existem na devnet, load falha ou devolve reserve vazia.
  try {
    const m = await KaminoMarket.load(conn, new PublicKey('Eo9WKFqxVwZLP7Y9wLwELBSgekUrogy7WgCijyyDkGiY'));
    const reserves = m.reserves ?? [];
    console.log('devnet reserves:', reserves.length);
  } catch (e) {
    console.log('devnet load failed:', String(e).slice(0, 200));
  }
})();
"
```

(Se a SDK não exportar `reserves` publicamente, usar os typings do Step 2 para achar o campo.)

**Critério de decisão:**
- Market carrega na devnet com a reserve de USDC → **MVP devnet real**: preencher `KAMINO_MARKET_ADDRESS`/`KAMINO_RESERVE_ADDRESS` com os endereços devnet no `.env` local e seguir.
- Falha (esperado — Kamino é mainnet-first) → **MVP mainnet com teto baixo**: `SOLANA_CLUSTER=mainnet-beta`, RPC pago, `USDC_MINT=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`, market/reserve mainnet da Kamino (docs oficiais / app.kamino.finance), e o teto de `MAX_DEPOSIT_BASE_UNITS` (hoje 10.000 USDC em `deposit.service.ts:15`) **baixa para 100 USDC** até o produto amadurecer. Registrar a decisão no arquivo de notas.

Registrar no arquivo de notas o market/reserve escolhido (endereços) e o cluster.

- [ ] **Step 4: Checkpoint**

`pnpm --filter @yield2pay/api exec tsc --noEmit` — a dependência nova não pode quebrar o build (nada ainda a importa).

---

### Task 2: Load do market e APY real

**Files:**
- Modify: `apps/api/src/solana/solana.service.ts` (expor `Connection`)
- Modify: `apps/api/src/solana/solana.module.ts` (exportar o provider, se ainda não exporta)
- Modify: `apps/api/src/vault/vault.service.ts`
- Modify: `apps/api/src/vault/vault.module.ts` (importar `SolanaModule`)
- Create: `apps/api/src/vault/vault.service.spec.ts`

**Interfaces:**
- Consumes: `SolanaService` (precisa de `get connection(): Connection`).
- Produces: `VaultService` com market/reserve carregados e `getApyPercent()` real (chamadores não mudam). Construtor passa a receber `SolanaService` + `Env` (APP_CONFIG, como hoje).

- [ ] **Step 1: Expor a Connection**

Em `solana.service.ts`, o campo `private readonly connection` vira:

```ts
get connection(): Connection {
  return this._connection;
}
private readonly _connection: Connection;
```

(construtor ajustado: `this._connection = connection ?? ...`).

- [ ] **Step 2: Write the failing test**

```ts
// vault.service.spec.ts
import { Connection } from '@solana/web3.js';
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@kamino-finance/klend-sdk', () => {
  const reserve = {
    stats: { supplyInterestAPY: '0.0812' },
  };
  const market = {
    getReserve: vi.fn(() => reserve),
  };
  const KaminoMarketMock = vi.fn();
  KaminoMarketMock.load = vi.fn(async () => market);
  return { KaminoMarket: KaminoMarketMock };
});

import { VaultService } from './vault.service';
import { SolanaService } from '../solana/solana.service';
import type { Env } from '../config/env';

const env = {
  kaminoMarketAddress: 'Market111111111111111111111111111111111111111',
  kaminoReserveAddress: 'Reserve11111111111111111111111111111111111111',
} as unknown as Env;

function makeService() {
  const solana = { connection: {} as Connection } as SolanaService;
  return { service: new VaultService(solana, env), marketMock: undefined };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('VaultService.getApyPercent', () => {
  it('devolve o APY da reserve como string de percentual', async () => {
    const { service } = makeService();
    await expect(service.getApyPercent()).resolves.toBe('8.12');
  });
});
```

**Convenção de conversão:** se o campo da SDK for fração (`0.0812`), `getApyPercent` converte para percentual (`8.12`); se já vier em percentual, devolver como está. Fixar a convenção conforme o Step 2 da Task 1 e ajustar o teste para bater. O contrato com a UI é "string de percentual" (ex.: `'8.12'`).

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter @yield2pay/api exec vitest run src/vault/vault.service.spec.ts`
Expected: FAIL — construtor não aceita `SolanaService`; `getApyPercent` devolve `'0'`.

- [ ] **Step 4: Implementação**

```ts
// vault.service.ts (trechos que mudam)
import { Inject, Injectable, Logger } from '@nestjs/common';
import { TransactionInstruction } from '@solana/web3.js';
import {
  ACTIONS,
  KaminoAction,
  KaminoMarket,
  kaminoManagerIdl,
  type KaminoMarket as KaminoMarketType,
  type KaminoReserve,
} from '@kamino-finance/klend-sdk';
import { APP_CONFIG } from '../config/config.module';
import type { Env } from '../config/env';
import { SolanaService } from '../solana/solana.service';

@Injectable()
export class VaultService {
  private readonly logger = new Logger(VaultService.name);
  private readonly marketAddress: string;
  private readonly reserveAddress: string;
  private market: KaminoMarketType | null = null;
  private marketLoading: Promise<KaminoMarketType> | null = null;

  constructor(
    private readonly solana: SolanaService,
    @Inject(APP_CONFIG) config: Env,
  ) {
    this.marketAddress = config.kaminoMarketAddress;
    this.reserveAddress = config.kaminoReserveAddress;
  }

  get target() {
    return { marketAddress: this.marketAddress, reserveAddress: this.reserveAddress };
  }

  /**
   * Market é carregado uma vez e reutilizado; reload só se falhar.
   * KaminoMarket.load consulta os accounts do market — não faz por request.
   */
  private async getMarket(): Promise<KaminoMarketType> {
    if (this.market) return this.market;
    this.marketLoading ??= KaminoMarket.load(
      this.solana.connection,
      new PublicKey(this.marketAddress),
    )
      .then((m) => {
        this.market = m;
        return m;
      })
      .catch((err) => {
        this.marketLoading = null; // próxima chamada tenta de novo
        throw err;
      });
    return this.marketLoading;
  }

  private async getReserve(): Promise<KaminoReserve> {
    const market = await this.getMarket();
    const reserve = market.getReserve(new PublicKey(this.reserveAddress));
    if (!reserve) {
      throw new Error(
        `reserve ${this.reserveAddress} not found in market ${this.marketAddress}`,
      );
    }
    return reserve;
  }

  async getApyPercent(): Promise<string> {
    const reserve = await this.getReserve();
    // Conforme a convenção verificada na Task 1 (fração vs percentual):
    const apy = Number(reserve.stats.supplyInterestAPY);
    return (apy * 100).toFixed(2);
  }
}
```

`vault.module.ts`: `imports: [SolanaModule]` e o provider `VaultService` passa a receber `SolanaService` por DI (o Nest injeta sozinho pelo tipo).

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @yield2pay/api exec vitest run src/vault/vault.service.spec.ts`
Expected: PASS.

---

### Task 3: buildDepositInstructions

**Files:**
- Modify: `apps/api/src/vault/vault.service.ts`
- Modify: `apps/api/src/vault/vault.service.spec.ts`

**Interfaces:**
- Consumes: `KaminoAction(ACTIONS.DEPOSIT, amount, owner, reserve, connection, useOverflowReserve, idl)` — ajustar ordem/extra args conforme Task 1. `buildDepositTxns()` devolve estrutura com `setupIxs` + transação principal (shape exato registrado nas notas).
- Produces: `buildDepositInstructions(ownerAddress, amountBaseUnits)` devolvendo `TransactionInstruction[]` plano (setup + principal), sem `NotImplementedException`.

- [ ] **Step 1: Write the failing test**

Acrescentar ao spec (mesmos mocks, completando o `KaminoAction`):

```ts
vi.mock('@kamino-finance/klend-sdk', () => {
  const reserve = { stats: { supplyInterestAPY: '0.0812' } };
  const market = { getReserve: vi.fn(() => reserve) };
  const KaminoMarketMock = vi.fn();
  KaminoMarketMock.load = vi.fn(async () => market);

  const setupIx = { programId: 'Setup' } as never;
  const mainIx = { programId: 'Main' } as never;
  const buildDepositTxns = vi.fn(async () => ({
    setupIxs: [setupIx],
    mainTx: { instructions: [mainIx] },
  }));
  const KaminoActionMock = vi.fn(() => ({ buildDepositTxns }));
  const ACTIONS = { DEPOSIT: 'deposit', WITHDRAW: 'withdraw' };
  return { KaminoMarket: KaminoMarketMock, KaminoAction: KaminoActionMock, ACTIONS, kaminoManagerIdl: {} };
});

it('buildDepositInstructions devolve setup + principal como instruction[]', async () => {
  const { service } = makeService();
  const ixs = await service.buildDepositInstructions('Owner111111111111111111111111111111111111111', 1000000000n);
  expect(ixs).toHaveLength(2);
  expect(KaminoActionMock).toHaveBeenCalled(); // chamado com ACTIONS.DEPOSIT e o valor
});
```

(Adaptar o shape do retorno do mock ao real registrado nas notas da Task 1 — se `buildDepositTxns` devolver array de objetos com `setupIxs`/`mainTx`, o flatten do serviço percorre o array.)

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @yield2pay/api exec vitest run src/vault/vault.service.spec.ts`
Expected: FAIL — ainda lança `NotImplementedException`.

- [ ] **Step 3: Implementação**

```ts
async buildDepositInstructions(
  ownerAddress: string,
  amountBaseUnits: bigint,
): Promise<TransactionInstruction[]> {
  const [reserve, owner] = await Promise.all([
    this.getReserve(),
    Promise.resolve(new PublicKey(ownerAddress)),
  ]);
  const action = new KaminoAction(
    ACTIONS.DEPOSIT,
    amountBaseUnits,
    owner,
    reserve,
    this.solana.connection,
    false, // useOverflowReserve — conforme notas da Task 1
    kaminoManagerIdl,
  );
  return this.actionToInstructions(await action.buildDepositTxns());
}

/** Kamino devolve setup + transação principal; o sponsor é feePayer, então
 *  achata tudo em instruction[] para o SolanaService montar a transação dele. */
private actionToInstructions(
  txns: Awaited<ReturnType<KaminoAction['buildDepositTxns']>>,
): TransactionInstruction[] {
  // Shape conforme Task 1 — versão para { setupIxs, mainTx }:
  const list = Array.isArray(txns) ? txns : [txns];
  return list.flatMap((t) => [
    ...(t.setupIxs ?? []),
    ...(t.mainTx ? t.mainTx.instructions : (t as { instructions?: TransactionInstruction[] }).instructions ?? []),
  ]);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @yield2pay/api exec vitest run src/vault/vault.service.spec.ts`
Expected: PASS.

---

### Task 4: buildWithdrawInstructions (resgate por valor)

**Files:**
- Modify: `apps/api/src/vault/vault.service.ts`
- Modify: `apps/api/src/vault/vault.service.spec.ts`

**Interfaces:**
- Produces: `buildWithdrawInstructions(ownerAddress, amountBaseUnits)` — resgate **por valor em USDC**, não por kTokens (contrato documentado no stub).

- [ ] **Step 1: Write the failing test**

Mesma estrutura do depósito, com `ACTIONS.WITHDRAW` e `buildWithdrawTxns`:

```ts
const buildWithdrawTxns = vi.fn(async () => ({
  setupIxs: [setupIx],
  mainTx: { instructions: [mainIx] },
}));

it('buildWithdrawInstructions devolve instructions de resgate', async () => {
  const { service } = makeService();
  const ixs = await service.buildWithdrawInstructions('Owner111111111111111111111111111111111111111', 500000000n);
  expect(ixs).toHaveLength(2);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @yield2pay/api exec vitest run src/vault/vault.service.spec.ts`
Expected: FAIL — `NotImplementedException`.

- [ ] **Step 3: Implementação**

```ts
async buildWithdrawInstructions(
  ownerAddress: string,
  amountBaseUnits: bigint,
): Promise<TransactionInstruction[]> {
  const reserve = await this.getReserve();
  const owner = new PublicKey(ownerAddress);
  const action = new KaminoAction(
    ACTIONS.WITHDRAW,
    amountBaseUnits, // by value: a SDK converte para kTokens pelo exchange rate
    owner,
    reserve,
    this.solana.connection,
    false,
    kaminoManagerIdl,
  );
  return this.actionToInstructions(await action.buildWithdrawTxns());
}
```

**Ponto de atenção (verificar nas notas da Task 1):** confirmar que `ACTIONS.WITHDRAW` da SDK resgata por **valor** (liquidity), não por quantidade de kTokens (`ACTIONS.WITHDRAW_TOKENS`). Se houver dois enums, usar o de valor. Registrar a escolha no arquivo de notas.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @yield2pay/api exec vitest run src/vault/vault.service.spec.ts`
Expected: PASS.

---

### Task 5: getPositionValue — valor resgatável

**Files:**
- Modify: `apps/api/src/vault/vault.service.ts`
- Modify: `apps/api/src/vault/vault.service.spec.ts`

**Interfaces:**
- Produces: `getPositionValue(ownerAddress): Promise<bigint>` — USDC base units resgatáveis (kTokens × exchange rate). `0n` quando não há posição.

- [ ] **Step 1: Write the failing test**

```ts
it('getPositionValue converte kTokens pelo exchange rate', async () => {
  // mock: reserve com kToken mint e exchange rate; owner com saldo de kTokens
  // Exemplo: 1000 kTokens, exchange rate 1.05 → 1050 USDC → 1050000000 base units
  // (usar os campos reais da SDK registrados na Task 1 no mock)
  const { service } = makeService();
  await expect(
    service.getPositionValue('Owner111111111111111111111111111111111111111'),
  ).resolves.toBe(1050000000n);
});

it('getPositionValue sem posição devolve 0n', async () => {
  // mock: ATA de kToken inexistente → saldo 0
  const { service } = makeService();
  await expect(
    service.getPositionValue('Owner222222222222222222222222222222222222222'),
  ).resolves.toBe(0n);
});
```

O mock da SDK precisa expor, além do que já existe, os campos usados pela implementação (mint do kToken da reserve, exchange rate) e o `@solana/spl-token` `getAccount` precisa ser mockado (vi.mock de `@solana/spl-token` devolvendo o saldo).

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @yield2pay/api exec vitest run src/vault/vault.service.spec.ts`
Expected: FAIL — devolve `0n` fixo.

- [ ] **Step 3: Implementação**

Estrutura (nomes de campo conforme notas da Task 1 — os literais abaixo são o fallback mais provável):

```ts
/** Saldo de kTokens do owner na reserve (ATA derivada do mint do kToken). */
private async getKTokenBalance(owner: PublicKey, reserve: KaminoReserve): Promise<bigint> {
  try {
    const kTokenMint = new PublicKey(reserve.liquidity.mintPubKey);
    const ata = await getAssociatedTokenAddress(kTokenMint, owner);
    const account = await getAccount(this.solana.connection, ata);
    return account.amount;
  } catch {
    // ATA inexistente = nunca aportou. Não é erro.
    return 0n;
  }
}

async getPositionValue(ownerAddress: string): Promise<bigint> {
  const reserve = await this.getReserve();
  const owner = new PublicKey(ownerAddress);
  const kTokens = await this.getKTokenBalance(owner, reserve);
  if (kTokens === 0n) return 0n;

  // Exchange rate da reserve: quanto USDC vale 1 kToken (string decimal, ex. "1.05").
  // Se a SDK expuser helper de conversão (verificar Task 1), usá-lo aqui.
  const rate = Number(reserve.liquidity.exchangeRate);
  const usdc = Number(kTokens) * rate;
  return BigInt(Math.floor(usdc));
}
```

**Cuidado com precisão:** `Number` perde precisão acima de ~2^53 (impossível em USDC com 6 casas em valores de MVP). Se as notas da Task 1 apontarem helper BigInt na SDK (ex.: `KaminoReserve` com método de conversão), preferir.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @yield2pay/api exec vitest run src/vault/vault.service.spec.ts`
Expected: PASS.

- [ ] **Step 5: Rodar a suíte inteira da API**

Run: `pnpm --filter @yield2pay/api exec vitest run && pnpm --filter @yield2pay/api exec tsc --noEmit`
Expected: PASS completo (specs de `common/` intactas, nenhum chamador quebrou).

---

### Task 6: Env + smoke E2E no cluster escolhido

**Files:**
- Modify: `apps/api/.env.example` (comentar endereços reais devnet/mainnet conforme decisão da Task 1)
- Create: `docs/superpowers/notes/devnet-smoke-log.md` (log do smoke)

- [ ] **Step 1: Preencher .env local com o cluster decidido**

Conforme Task 1 (devnet real ou mainnet com teto). Se mainnet: **baixar o teto** — em `deposit.service.ts:15`:

```ts
// MVP mainnet: teto conservador até o produto amadurecer.
const MAX_DEPOSIT_BASE_UNITS = 100_000_000n; // 100 USDC
```

- [ ] **Step 2: Smoke manual ponta a ponta**

Com API + Postgres local (`pnpm --filter @yield2pay/api dev`) e web local:

1. Login Privy → `/family/dashboard` (com Plano 2 aplicado) renderiza.
2. Aporte pequeno (ex.: 10 USDC): transação confirma no explorer do cluster; `deposit` gravado no Postgres (`SELECT * FROM "Deposit"`).
3. Dashboard mostra principal + position value do cofre (pode levar instantes para o exchange rate refletir).
4. Resgate parcial: USDC volta para a carteira; lançamento negativo gravado.
5. Logar tudo (cluster, tx signatures, saldos antes/depois) em `docs/superpowers/notes/devnet-smoke-log.md`.

- [ ] **Step 3: Se o smoke falhar por conta de compute budget**

Transações Kamino com sponsor + múltiplos setups podem exceder o compute padrão. Se o erro for compute budget, adicionar como primeira instruction do pacote (em `buildSponsoredTransaction`, antes das instruções Kamino):

```ts
import { ComputeBudgetProgram } from '@solana/web3.js';

const instructions = [
  ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
  ...userInstructions,
];
```

(Só adicionar se o smoke pedir — não preventivamente.)

---

## Self-Review

- **Cobertura:** os 4 métodos do contrato (`buildDepositInstructions`, `buildWithdrawInstructions`, `getApyPercent`, `getPositionValue`) têm task própria com test; a decisão de cluster (gate) é a Task 1; env/smoke é a Task 6. Chamadores (deposit/withdraw/ledger) não mudam — verificado pelos testes existentes rodando no fim da Task 5.
- **Placeholders:** os pontos onde a SDK pode divergir do código escrito (shapes de `ITransactionLite`, nomes de campos da reserve, enum de withdraw por valor) estão explicitamente delegados ao arquivo de notas da Task 1, que é verificado antes — é um contrato, não um TBD.
- **Consistência de tipos:** `getMarket`/`getReserve` privados usados pelas 4 tasks; `actionToInstructions` compartilhado por depósito e saque; `SolanaService.connection` getter criado na Task 2 e consumido nas Tasks 2–5.
