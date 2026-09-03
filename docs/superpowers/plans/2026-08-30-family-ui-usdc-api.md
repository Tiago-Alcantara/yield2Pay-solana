# Family UI na API real (USDC) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar o mock de localStorage das telas de `/family` por dados reais da API (dashboard, subs, depósito e saque on-chain em USDC), eliminando a narrativa PIX/R$ das telas do app.

**Architecture:** As telas do app (dashboard, depósito, saque, configurações, onboarding) passam a ler de um hook `useFamilyData` que agrupa as chamadas já existentes em `src/lib/api.ts` (`getDashboard`, `listSubs`, `getWalletBalance`, CRUD de subs). Depósito e saque usam o fluxo existente `useSolanaTx` (backend monta tx com sponsor como feePayer → Privy assina → backend envia). O store local (`familyStore`) fica reduzido a preferências de UI (idioma); dados financeiros não são mais persistidos no cliente.

**Tech Stack:** Next.js 16 (App Router, React 19), Privy (`@privy-io/react-auth`), Vitest + React Testing Library.

**Spec:** Levantamento do repo + decisões do usuário: 3 planos separados (este é o plano 2), moeda "USDC everywhere" (sem BRL, sem PIX nas telas do app), Plano 1 = Kamino no backend, Plano 3 = deploy/devnet.

## Global Constraints

- **Moeda:** USDC everywhere. Telas do app mostram "USDC" e valores com 2 casas. Nenhuma tela do app menciona PIX ou R$. A landing `/family` e `/family/conceitos` continuam com a narrativa atual (fora do escopo deste plano).
- **Valores da API:** todos monetários chegam como string em base units (6 casas). Conversão centralizada em `_lib/familyFormat.ts`.
- **Commits:** o usuário commita explicitamente (regra do CLAUDE.md). Este plano usa passos de "checkpoint" no lugar de commits; commitar só quando o usuário pedir, agrupado.
- **Next.js 16:** antes de tocar qualquer convenção do App Router, ler o guia relevante em `node_modules/next/dist/docs/` (aviso do AGENTS.md do apps/web — APIs podem diferir do que você conhece).
- **Testes:** Vitest, padrão do `family.test.tsx`: mock de `next/navigation`, render com `<FamilyProvider>`, sem rede (mocar `@privy-io/react-auth` e `@/lib/api`).
- **Sem refactor extra:** não reorganizar o que não é necessário para o wiring. `familyMath.ts` continua trabalhando com `number` — a conversão de base units acontece na borda.

## Estado atual (contexto para quem executa)

- `apps/web/src/app/family/_lib/familyStore.ts` — store localStorage com `deposit`, `rate`, `subs`, `pixKey`, etc. Tudo mock.
- `apps/web/src/lib/api.ts` — cliente HTTP completo já com todos os endpoints necessários: `getDashboard`, `listSubs`, `createSub`, `deleteSub`, `reorderSubs`, `getWalletBalance`, `registerWallet`, build/submit de depósito e saque.
- `apps/web/src/lib/useSolanaTx.ts` — hook com `deposit(amountBaseUnits: string)` e `withdraw(amountBaseUnits: string)` que rodam o fluxo build → sign (Privy) → submit. Retorna a assinatura da tx.
- `apps/web/src/lib/useWallet.ts` — `address` (carteira Solana embedded) e `ensureWallet()`.
- Tipos shared (`@yield2pay/shared`): `SpendableView { vaultValue, principal, spendable, apyPercent, returnsChangePercent }`, `Sub { id, name, monthlyCost, category, priority, status, memberId }` (sem dia de vencimento), `WalletBalanceView { balance, spendable }`.
- Telas que usam o mock: `dashboard/page.tsx`, `deposito/page.tsx` (via `PixDepositCard`), `saque/page.tsx`, `onboarding/page.tsx` (via `PixDepositCard`), `configuracoes/*` (SubsSection usa `state.subs`).

---

### Task 1: Helpers de USDC em familyFormat

**Files:**
- Modify: `apps/web/src/app/family/_lib/familyFormat.ts`
- Create: `apps/web/src/app/family/_lib/familyFormat.test.ts`

**Interfaces:**
- Produces: `fmtUsdc(value: number): string`, `fmtUsdcShort(value: number): string`, `parseUsdc(input: string): number`, `toUsdcNumber(baseUnits: string | bigint): number`, `toBaseUnitsString(value: number): string`. `fmtBRL`/`parseBRL` continuam existindo (landing e conceitos os usam).

- [ ] **Step 1: Write the failing test**

```ts
// familyFormat.test.ts
import { describe, expect, it } from 'vitest';
import {
  fmtUsdc,
  fmtUsdcShort,
  parseUsdc,
  toUsdcNumber,
  toBaseUnitsString,
} from './familyFormat';

describe('formato USDC', () => {
  it('formata com 2 casas e prefixo USDC', () => {
    expect(fmtUsdc(1234.56)).toBe('USDC 1.234,56');
    expect(fmtUsdc(0)).toBe('USDC 0,00');
  });

  it('formata sem centavos no formato curto', () => {
    expect(fmtUsdcShort(1234.56)).toBe('USDC 1.235');
  });

  it('lê valor digitado em pt-BR', () => {
    expect(parseUsdc('1.234,56')).toBe(1234.56);
    expect(parseUsdc('')).toBe(0);
  });

  it('converte base units (6 casas) da API para number', () => {
    expect(toUsdcNumber('1234500000')).toBe(1234.5);
    expect(toUsdcNumber(0n)).toBe(0);
  });

  it('converte number para base units como string', () => {
    expect(toBaseUnitsString(1234.56)).toBe('1234560000');
    expect(toBaseUnitsString(0.000001)).toBe('1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter web exec vitest run src/app/family/_lib/familyFormat.test.ts`
Expected: FAIL — `fmtUsdc` não existe.

- [ ] **Step 3: Write minimal implementation**

Acrescentar ao fim de `familyFormat.ts`:

```ts
// ── USDC (telas do app) ────────────────────────────────────────────────────
// A API troca valores em base units (6 casas, string). As telas calculam em
// number e formatam em USDC — a conversão mora aqui e em lugar nenhum mais.

export const USDC_DECIMALS = 6;

/** "USDC 1.234,56" */
export function fmtUsdc(value: number): string {
  return (
    'USDC ' +
    Number(value).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

/** "USDC 1.235" — onde o centavo só polui. */
export function fmtUsdcShort(value: number): string {
  return 'USDC ' + Math.round(value).toLocaleString('pt-BR');
}

/** Lê um valor digitado em pt-BR ("1.234,56") como number. Inválido vira 0. */
export function parseUsdc(input: string): number {
  return parseFloat(String(input).replace(/\./g, '').replace(',', '.')) || 0;
}

/** Base units (string|bigint, 6 casas) → number em USDC. */
export function toUsdcNumber(baseUnits: string | bigint): number {
  const n = typeof baseUnits === 'bigint' ? baseUnits : BigInt(baseUnits || '0');
  return Number(n) / 10 ** USDC_DECIMALS;
}

/** number em USDC → base units string (6 casas), truncando (não arredonda pra cima). */
export function toBaseUnitsString(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0';
  return BigInt(Math.floor(value * 10 ** USDC_DECIMALS)).toString();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter web exec vitest run src/app/family/_lib/familyFormat.test.ts`
Expected: PASS.

- [ ] **Step 5: Checkpoint**

`pnpm --filter web exec vitest run src/app/family` — tudo verde (tests existentes ainda usam fmtBRL; nada quebrou).

---

### Task 2: i18n — trocar copy PIX por USDC nas telas do app

**Files:**
- Modify: `apps/web/src/app/family/_lib/familyI18n.ts` (dicionários PT e EN)

**Interfaces:**
- Produces: chaves novas que os componentes seguintes consomem, exatas:

```
onboarding.usdcFirstTitle, onboarding.usdcTitle, onboarding.usdcSub,
onboarding.usdcAmountLabel, onboarding.usdcAmountPlaceholder,
onboarding.usdcConfirm, onboarding.usdcBack,
onboarding.usdcBalanceLabel, onboarding.usdcWalletLabel,
onboarding.usdcStatusBuilding, onboarding.usdcStatusSigning,
onboarding.usdcStatusSubmitting, onboarding.usdcSuccess,
onboarding.usdcErrorSub,

withdraw.title (texto novo), withdraw.sub (texto novo),
withdraw.amountLabel (texto novo), withdraw.allLabel, withdraw.available,
withdraw.errorAmount, withdraw.walletLabel, withdraw.confirm (texto novo),
withdraw.back, withdraw.note (texto novo),

dash.vaultDeposit (texto novo), dash.vaultWithdraw, dash.movDeposit (texto novo),
```

- [ ] **Step 1: Editar o dicionário PT**

No dict PT, em `onboarding` (substituir o bloco `pixFirstTitle…pixBack` — manter as chaves pix* removidas):

```ts
    usdcFirstTitle: 'Seu primeiro aporte',
    usdcTitle: 'Aportar USDC',
    usdcSub:
      'O aporte sai da carteira desta conta e vai direto para o cofre. O principal continua seu e você pode resgatar quando quiser.',
    usdcAmountLabel: 'Valor do aporte (USDC)',
    usdcAmountPlaceholder: '5.000',
    usdcConfirm: 'Aportar agora',
    usdcBack: 'Voltar sem aportar',
    usdcBalanceLabel: 'Saldo disponível na carteira',
    usdcWalletLabel: 'Carteira',
    usdcStatusBuilding: 'Preparando a transação…',
    usdcStatusSigning: 'Confirme no seu login — falta sua assinatura…',
    usdcStatusSubmitting: 'Enviando para a rede…',
    usdcSuccess: 'Aporte confirmado ✓',
    usdcErrorSub: 'O aporte não foi concluído. Nada saiu da sua carteira — tente de novo.',
```

Em `withdraw` (PT):

```ts
  withdraw: {
    title: 'Resgatar do cofre',
    sub: 'O valor volta para a carteira desta conta, na hora, sem carência.',
    amountLabel: 'Quanto resgatar (USDC)',
    allLabel: 'Resgatar tudo',
    errorAmount: 'Valor inválido ou maior que o disponível.',
    available: 'Disponível no cofre',
    walletLabel: 'Carteira de destino',
    confirm: 'Resgatar agora',
    back: 'Voltar',
    note: 'Apenas a sua assinatura autoriza o resgate — nem a Yield2Pay pode movimentar o cofre.',
  },
```

Em `dash` (PT): `vaultDeposit: 'Aportar USDC'`, `movDeposit: 'Aporte confirmado'`.

- [ ] **Step 2: Editar o dicionário EN (mesmas chaves)**

```ts
    usdcFirstTitle: 'Your first deposit',
    usdcTitle: 'Deposit USDC',
    usdcSub:
      'The deposit leaves this account’s wallet and goes straight to the vault. The principal stays yours and you can redeem it whenever you want.',
    usdcAmountLabel: 'Deposit amount (USDC)',
    usdcAmountPlaceholder: '5,000',
    usdcConfirm: 'Deposit now',
    usdcBack: 'Back without depositing',
    usdcBalanceLabel: 'Wallet balance available',
    usdcWalletLabel: 'Wallet',
    usdcStatusBuilding: 'Preparing the transaction…',
    usdcStatusSigning: 'Confirm in your login — we need your signature…',
    usdcStatusSubmitting: 'Sending to the network…',
    usdcSuccess: 'Deposit confirmed ✓',
    usdcErrorSub: 'The deposit did not complete. Nothing left your wallet — try again.',
```

```ts
  withdraw: {
    title: 'Withdraw from the vault',
    sub: 'The amount returns to this account’s wallet immediately, no lock-up.',
    amountLabel: 'How much to withdraw (USDC)',
    allLabel: 'Withdraw all',
    errorAmount: 'Invalid amount or above the available balance.',
    available: 'Available in the vault',
    walletLabel: 'Destination wallet',
    confirm: 'Withdraw now',
    back: 'Back',
    note: 'Only your signature authorises withdrawals — not even Yield2Pay can move the vault.',
  },
```

`dash` EN: `vaultDeposit: 'Deposit USDC'`, `movDeposit: 'Deposit confirmed'`.

- [ ] **Step 3: TypeScript como verificador**

Run: `pnpm --filter web exec tsc --noEmit`
Expected: FAIL em `PixDepositCard.tsx` (usa `pix*` removidas) — esperado; o card é trocado na Task 4. Se falhar em outro arquivo, o key rename escapou — corrigir.

**Nota:** `configuracoes` tem um bloco `pix*` (chave PIX de saque) — fica para a Task 8 (remoção da PixSection). Não remover ainda.

---

### Task 3: Hook useFamilyData — dados da API em um só lugar

**Files:**
- Create: `apps/web/src/app/family/_lib/useFamilyData.ts`
- Create: `apps/web/src/app/family/_lib/useFamilyData.test.tsx`

**Interfaces:**
- Consumes: `createApi(getAccessToken)` de `src/lib/api.ts`; `usePrivy` (`ready`, `authenticated`, `getAccessToken`); tipos `SpendableView`, `Sub`, `WalletBalanceView` de `@yield2pay/shared`; `toUsdcNumber` da Task 1.
- Produces:

```ts
export interface FamilySubRow {
  id: string;
  name: string;
  /** Custo mensal em USDC (number) — já convertido de base units. */
  price: number;
  category: string;
  priority: number;
}

export function useFamilyData(): {
  ready: boolean;            // Privy pronto + autenticado
  loading: boolean;          // primeira carga em andamento
  error: boolean;            // falha na carga (dashboard ou subs)
  dashboard: SpendableView | null;
  balance: { balance: number; spendable: number } | null;
  subs: FamilySubRow[];
  refresh: () => Promise<void>;
  createSub: (input: { name: string; price: number; category: string }) => Promise<void>;
  deleteSub: (id: string) => Promise<void>;
  reorderSubs: (idsInOrder: string[]) => Promise<void>;
};
```

- [ ] **Step 1: Write the failing test**

```tsx
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter web exec vitest run src/app/family/_lib/useFamilyData.test.tsx`
Expected: FAIL — módulo `./useFamilyData` não existe.

- [ ] **Step 3: Write minimal implementation**

```ts
// useFamilyData.ts
'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { createApi } from '@/lib/api';
import type { SpendableView, Sub } from '@yield2pay/shared';
import { toUsdcNumber } from './familyFormat';

export interface FamilySubRow {
  id: string;
  name: string;
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
    if (!ready || !authenticated) return;
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter web exec vitest run src/app/family/_lib/useFamilyData.test.tsx`
Expected: PASS.

---

### Task 4: UsdcDepositCard — substituto do PixDepositCard

**Files:**
- Create: `apps/web/src/app/family/_components/UsdcDepositCard.tsx`
- Create: `apps/web/src/app/family/_components/UsdcDepositCard.test.tsx`
- Delete (Task 10): `PixDepositCard.tsx`

**Interfaces:**
- Consumes: `useSolanaTx` de `src/lib/useSolanaTx` (`deposit(amountBaseUnits: string): Promise<string>`), `useWallet` (`address`), `toBaseUnitsString`/`parseUsdc`/`fmtUsdc` da Task 1, chaves `onboarding.usdc*` da Task 2.
- Produces:

```tsx
export function UsdcDepositCard(props: {
  fromApp?: boolean;
  /** Chamado quando o aporte confirma. */
  onDone: (txSignature: string) => void;
  onBack?: () => void;
}): JSX.Element;
```

- [ ] **Step 1: Write the failing test**

```tsx
// UsdcDepositCard.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, expect, it, beforeEach } from 'vitest';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
  usePathname: () => '/family/deposito',
}));

const depositMock = vi.fn();
vi.mock('@/lib/useSolanaTx', () => ({
  useSolanaTx: () => ({ deposit: depositMock, withdraw: vi.fn() }),
}));

vi.mock('@/lib/useWallet', () => ({
  useWallet: () => ({ address: 'DummyWallet1111111111111111111111111111111', ensureWallet: vi.fn() }),
}));

vi.mock('@privy-io/react-auth', () => ({
  usePrivy: () => ({ ready: true, authenticated: true, getAccessToken: vi.fn() }),
}));

import { UsdcDepositCard } from './UsdcDepositCard';
import { FamilyProvider } from '../_lib/FamilyProvider';

function renderCard(onDone = vi.fn()) {
  render(
    <FamilyProvider>
      <UsdcDepositCard fromApp onDone={onDone} onBack={() => {}} />
    </FamilyProvider>,
  );
  return onDone;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('UsdcDepositCard', () => {
  it('mostra a carteira e o campo de valor', () => {
    renderCard();
    expect(screen.getByText('DummyWallet1111111111111111111111111111111')).toBeInTheDocument();
    expect(screen.getByLabelText(/Valor do aporte/)).toBeInTheDocument();
  });

  it('desabilita o botão sem valor', () => {
    renderCard();
    expect(screen.getByRole('button', { name: 'Aportar agora' })).toBeDisabled();
  });

  it('aporta em base units e avisa onDone com a assinatura', async () => {
    const onDone = renderCard();
    depositMock.mockResolvedValue('sig123');

    fireEvent.change(screen.getByLabelText(/Valor do aporte/), { target: { value: '250' } });
    fireEvent.click(screen.getByRole('button', { name: 'Aportar agora' }));

    await waitFor(() => expect(depositMock).toHaveBeenCalledWith('250000000'));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith('sig123'));
  });

  it('mostra erro e limpa quando a transação falha', async () => {
    const onDone = renderCard();
    depositMock.mockRejectedValue(new Error('tx falhou'));

    fireEvent.change(screen.getByLabelText(/Valor do aporte/), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Aportar agora' }));

    await waitFor(() =>
      expect(screen.getByText(/O aporte não foi concluído/)).toBeInTheDocument(),
    );
    expect(onDone).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter web exec vitest run src/app/family/_components/UsdcDepositCard.test.tsx`
Expected: FAIL — componente não existe.

- [ ] **Step 3: Write minimal implementation**

```tsx
// UsdcDepositCard.tsx
'use client';

/**
 * Card de aporte USDC — substitui o PixDepositCard.
 *
 * Mesmo card no fim do onboarding e no "Aportar USDC" do painel; a diferença é
 * só o título e o botão de voltar (`fromApp`). O fluxo é o useSolanaTx:
 * backend monta (sponsor como feePayer) → Privy assina → backend envia.
 */

import React, { useState } from 'react';
import { C, CHROME_SHADOW, cardLabel } from '../_lib/familyTheme';
import { fmtUsdc, numericOnly, parseUsdc, toBaseUnitsString } from '../_lib/familyFormat';
import { useFamily } from '../_lib/FamilyProvider';
import { useSolanaTx } from '@/lib/useSolanaTx';
import { useWallet } from '@/lib/useWallet';

type Phase = 'idle' | 'running' | 'done' | 'error';

export function UsdcDepositCard({
  fromApp = false,
  onDone,
  onBack,
}: {
  fromApp?: boolean;
  onDone: (txSignature: string) => void;
  onBack?: () => void;
}) {
  const { t } = useFamily();
  const { address } = useWallet();
  const { deposit } = useSolanaTx();
  const [amount, setAmount] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');

  const parsed = parseUsdc(amount);

  async function handleDeposit() {
    if (parsed <= 0 || phase === 'running') return;
    setPhase('running');
    try {
      const txSignature = await deposit(toBaseUnitsString(parsed));
      setPhase('done');
      onDone(txSignature);
    } catch {
      setPhase('error');
    }
  }

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 420,
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 20,
        padding: 'var(--fam-card-pad-lg)',
        boxShadow: '0 24px 56px rgba(0,0,0,.5)',
      }}
    >
      <h1
        style={{
          fontSize: 'clamp(22px,5.6vw,26px)',
          fontWeight: 700,
          letterSpacing: '-.02em',
          margin: 0,
          color: C.textStrong,
          textWrap: 'balance',
        }}
      >
        {fromApp ? t.onboarding.usdcTitle : t.onboarding.usdcFirstTitle}
      </h1>
      <p style={{ fontSize: 14.5, lineHeight: 1.6, color: C.text2, margin: '10px 0 0' }}>
        {t.onboarding.usdcSub}
      </p>

      <div
        style={{
          marginTop: 18,
          background: C.well,
          border: `1px solid ${C.border}`,
          borderRadius: 14,
          padding: 16,
        }}
      >
        <div style={cardLabel}>{t.onboarding.usdcWalletLabel}</div>
        <div
          style={{
            fontFamily: C.mono,
            fontSize: 12,
            color: C.silver,
            marginTop: 6,
            wordBreak: 'break-all',
          }}
        >
          {address ?? '—'}
        </div>
      </div>

      <label
        htmlFor="fam-usdc-valor"
        style={{ ...cardLabel, display: 'block', margin: '18px 0 8px' }}
      >
        {t.onboarding.usdcAmountLabel}
      </label>
      <input
        id="fam-usdc-valor"
        className="fam-field"
        type="text"
        inputMode="decimal"
        value={amount}
        onChange={(e) => {
          setAmount(numericOnly(e.target.value));
          setPhase('idle');
        }}
        placeholder={t.onboarding.usdcAmountPlaceholder}
        disabled={phase === 'running'}
        style={{
          width: '100%',
          background: C.well,
          border: `1px solid ${phase === 'error' ? C.inputError : C.border}`,
          borderRadius: 12,
          padding: '13px 14px',
          color: C.textStrong,
          fontFamily: C.mono,
          fontSize: 16,
          outline: 'none',
        }}
      />

      <div
        style={{
          fontFamily: C.mono,
          fontSize: 11.5,
          color: C.text4,
          marginTop: 10,
          display: phase === 'running' ? 'block' : 'none',
        }}
      >
        {t.onboarding.usdcStatusBuilding}
      </div>

      {phase === 'error' && (
        <div role="alert" style={{ fontSize: 12.5, color: C.danger, marginTop: 10 }}>
          {t.onboarding.usdcErrorSub}
        </div>
      )}

      <button
        type="button"
        className="btn-shine"
        onClick={handleDeposit}
        disabled={parsed <= 0 || phase === 'running'}
        style={{
          width: '100%',
          fontFamily: 'inherit',
          fontSize: 15,
          fontWeight: 600,
          color: C.chromeInk,
          background: C.chromeSoft,
          border: 'none',
          borderRadius: 12,
          padding: 14,
          cursor: parsed > 0 && phase !== 'running' ? 'pointer' : 'default',
          opacity: parsed > 0 && phase !== 'running' ? 1 : 0.5,
          marginTop: 20,
          boxShadow: CHROME_SHADOW,
        }}
      >
        {phase === 'running' ? t.onboarding.usdcStatusSubmitting : t.onboarding.usdcConfirm}
      </button>

      {fromApp && onBack && (
        <button
          type="button"
          className="fam-quiet"
          onClick={onBack}
          style={{
            width: '100%',
            fontFamily: 'inherit',
            fontSize: 14,
            color: C.text2,
            background: 'none',
            border: 'none',
            padding: '12px 0 0',
            cursor: 'pointer',
          }}
        >
          {t.onboarding.usdcBack}
        </button>
      )}
    </div>
  );
}
```

**Nota de teste:** o copy do botão em `running` usa `usdcStatusSubmitting` — se o teste do botão desabilitado depender do label exato, usar `getByRole('button')` por estado `disabled`. O teste acima já cobre isso via `toBeDisabled()` antes de qualquer clique.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter web exec vitest run src/app/family/_components/UsdcDepositCard.test.tsx`
Expected: PASS.

---

### Task 5: Rewire /family/deposito

**Files:**
- Modify: `apps/web/src/app/family/deposito/page.tsx` (reescrita completa — arquivo atual tem 41 linhas)
- Modify: `apps/web/src/app/family/deposito/layout.tsx` (se ainda não tem AuthGate — verificar)

**Interfaces:**
- Consumes: `UsdcDepositCard` (Task 4).
- Produces: página `/family/deposito` que deposita de verdade e volta ao dashboard com os dados frescos.

- [ ] **Step 1: Verificar o layout**

Ler `apps/web/src/app/family/deposito/layout.tsx`. Se não envolver `AuthGate`, envolver (mesmo padrão das outras telas do app):

```tsx
import { AuthGate } from '@/providers/AuthGate';

export default function DepositoLayout({ children }: { children: React.ReactNode }) {
  return <AuthGate>{children}</AuthGate>;
}
```

- [ ] **Step 2: Reescrever a página**

```tsx
// deposito/page.tsx
'use client';

/**
 * Aporte USDC a partir do painel — /family/deposito
 *
 * Mesmo card do último passo do onboarding, com o título "Aportar USDC" e a
 * saída "Voltar sem aportar". O card cuida do fluxo da transação; aqui só
 * navegamos de volta quando confirma.
 */

import React from 'react';
import { useRouter } from 'next/navigation';
import { C } from '../_lib/familyTheme';
import { useFamily } from '../_lib/FamilyProvider';
import { FamilyBrand } from '../_components/FamilyUI';
import { UsdcDepositCard } from '../_components/UsdcDepositCard';

export default function FamilyDepositPage() {
  const router = useRouter();
  const { t } = useFamily();

  return (
    <div style={{ minHeight: '100vh', background: C.bgRadialTall }}>
      <div className="fam-center-shell">
        <div style={{ marginBottom: 'clamp(22px,5vw,34px)' }}>
          <FamilyBrand tag={t.brandTag} size={20} href="/family/dashboard" />
        </div>
        <UsdcDepositCard
          fromApp
          onDone={() => router.push('/family/dashboard')}
          onBack={() => router.push('/family/dashboard')}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Rodar os testes existentes**

Run: `pnpm --filter web exec vitest run src/app/family`
Expected: PASS (nenhum teste existente cobre a página de depósito; os do card são da Task 4).

---

### Task 6: Rewire /family/saque

**Files:**
- Modify: `apps/web/src/app/family/saque/page.tsx` (reescrita — atual tem 223 linhas)
- Modify: `apps/web/src/app/family/saque/layout.tsx` (AuthGate, se faltar — mesmo passo da Task 5)

**Interfaces:**
- Consumes: `useFamilyData` (Task 3: `dashboard.spendable`, `loading`), `useSolanaTx` (`withdraw`), `useWallet` (`address`), `toBaseUnitsString`/`parseUsdc`/`fmtUsdc` (Task 1), chaves `withdraw.*` (Task 2).
- Produces: saque real do cofre para a própria carteira.

- [ ] **Step 1: Reescrever a página**

Substituir o corpo inteiro por (mantém a linguagem visual do card atual):

```tsx
// saque/page.tsx
'use client';

/**
 * Resgate do cofre — /family/saque
 *
 * O resgate devolve USDC do cofre Kamino para a carteira desta conta. O fluxo
 * é o mesmo do aporte (useSolanaTx): backend monta, Privy assina, backend envia.
 * O limite é o `spendable` do dashboard — o principal também pode ser sacado,
 * então o teto é o vaultValue inteiro.
 */

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { C, CHROME_SHADOW, cardLabel } from '../_lib/familyTheme';
import { useFamily } from '../_lib/FamilyProvider';
import { fmtUsdc, numericOnly, parseUsdc, toBaseUnitsString } from '../_lib/familyFormat';
import { useFamilyData } from '../_lib/useFamilyData';
import { useSolanaTx } from '@/lib/useSolanaTx';
import { useWallet } from '@/lib/useWallet';
import { FamilyBrand } from '../_components/FamilyUI';

type Phase = 'idle' | 'running' | 'error';

export default function FamilyWithdrawPage() {
  const router = useRouter();
  const { t } = useFamily();
  const { dashboard, loading } = useFamilyData();
  const { withdraw } = useSolanaTx();
  const { address } = useWallet();
  const [amount, setAmount] = useState('');
  const [error, setError] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');

  const vaultValue = dashboard ? Number(dashboard.vaultValue) / 10 ** 6 : 0;
  const parsed = parseUsdc(amount);

  function handleConfirm() {
    if (parsed < 0.000001 || parsed > vaultValue) {
      setError(true);
      return;
    }
    setPhase('running');
    withdraw(toBaseUnitsString(parsed))
      .then(() => router.push('/family/dashboard'))
      .catch(() => setPhase('error'));
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bgRadialTall }}>
      <div className="fam-center-shell">
        <div style={{ marginBottom: 'clamp(22px,5vw,34px)' }}>
          <FamilyBrand tag={t.brandTag} size={20} href="/family/dashboard" />
        </div>

        <div
          style={{
            width: '100%',
            maxWidth: 420,
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 20,
            padding: 'var(--fam-card-pad-lg)',
            boxShadow: '0 24px 56px rgba(0,0,0,.5)',
          }}
        >
          <h1
            style={{
              fontSize: 'clamp(22px,5.6vw,26px)',
              fontWeight: 700,
              letterSpacing: '-.02em',
              margin: 0,
              color: C.textStrong,
              textWrap: 'balance',
            }}
          >
            {t.withdraw.title}
          </h1>
          <p style={{ fontSize: 14.5, lineHeight: 1.6, color: C.text2, margin: '10px 0 0' }}>
            {t.withdraw.sub}
          </p>

          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: 12,
              margin: '22px 0 8px',
            }}
          >
            <label htmlFor="fam-saque-valor" style={cardLabel}>
              {t.withdraw.amountLabel}
            </label>
            <button
              type="button"
              className="fam-quiet"
              onClick={() => {
                setAmount(vaultValue.toFixed(2).replace('.', ','));
                setError(false);
              }}
              disabled={loading || vaultValue <= 0}
              style={{
                fontFamily: C.mono,
                fontSize: 11.5,
                color: C.silver,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              {t.withdraw.allLabel}
            </button>
          </div>
          <input
            id="fam-saque-valor"
            className="fam-field"
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => {
              setAmount(numericOnly(e.target.value));
              setError(false);
              setPhase('idle');
            }}
            placeholder="0"
            disabled={phase === 'running'}
            aria-invalid={error}
            style={{
              width: '100%',
              background: C.well,
              border: `1px solid ${error ? C.inputError : C.border}`,
              borderRadius: 12,
              padding: '13px 14px',
              color: C.textStrong,
              fontFamily: C.mono,
              fontSize: 16,
              outline: 'none',
            }}
          />
          {error && (
            <div role="alert" style={{ fontSize: 12.5, color: C.danger, marginTop: 8 }}>
              {t.withdraw.errorAmount}
            </div>
          )}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              marginTop: 10,
              fontFamily: C.mono,
              fontSize: 11.5,
              color: C.text4,
            }}
          >
            <span>{t.withdraw.available}</span>
            <span>{loading ? '…' : fmtUsdc(vaultValue)}</span>
          </div>

          <div
            style={{
              marginTop: 18,
              background: C.well,
              border: `1px solid ${C.border}`,
              borderRadius: 14,
              padding: 16,
            }}
          >
            <div style={cardLabel}>{t.withdraw.walletLabel}</div>
            <div
              style={{
                fontFamily: C.mono,
                fontSize: 12,
                color: C.textStrong,
                marginTop: 6,
                wordBreak: 'break-all',
              }}
            >
              {address ?? '—'}
            </div>
          </div>

          <button
            type="button"
            className="btn-shine"
            onClick={handleConfirm}
            disabled={phase === 'running'}
            style={{
              width: '100%',
              fontFamily: 'inherit',
              fontSize: 15,
              fontWeight: 600,
              color: C.chromeInk,
              background: C.chromeSoft,
              border: 'none',
              borderRadius: 12,
              padding: 14,
              cursor: phase === 'running' ? 'default' : 'pointer',
              opacity: phase === 'running' ? 0.5 : 1,
              marginTop: 20,
              boxShadow: CHROME_SHADOW,
            }}
          >
            {phase === 'running' ? t.onboarding.usdcStatusSubmitting : t.withdraw.confirm}
          </button>
          <button
            type="button"
            className="fam-quiet"
            onClick={() => router.push('/family/dashboard')}
            style={{
              width: '100%',
              fontFamily: 'inherit',
              fontSize: 14,
              color: C.text2,
              background: 'none',
              border: 'none',
              padding: '12px 0 0',
              cursor: 'pointer',
            }}
          >
            {t.withdraw.back}
          </button>
          <div
            style={{
              fontSize: 11.5,
              lineHeight: 1.5,
              color: C.text4,
              textAlign: 'center',
              marginTop: 12,
            }}
          >
            {t.withdraw.note}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Escrever teste da página**

Acrescentar em `family.test.tsx` um describe novo, com os mesmos mocks de `useFamilyData`/`useSolanaTx`/`useWallet` do card (Task 4, Step 1). Caso central:

```tsx
describe('saque /family/saque', () => {
  it('resgata em base units e volta ao dashboard', async () => {
    // dashboard: vaultValue 100 USDC
    // (usar os mocks: useFamilyData retorna dashboard com vaultValue '100000000')
    renderInFamily(<FamilyWithdrawPage />);
    fireEvent.change(screen.getByLabelText(/Quanto resgatar/), { target: { value: '40' } });
    fireEvent.click(screen.getByRole('button', { name: 'Resgatar agora' }));
    await waitFor(() => expect(withdrawMock).toHaveBeenCalledWith('40000000'));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/family/dashboard'));
  });
});
```

- [ ] **Step 3: Run tests**

Run: `pnpm --filter web exec vitest run src/app/family`
Expected: PASS.

---

### Task 7: Rewire /family/dashboard

**Files:**
- Modify: `apps/web/src/app/family/dashboard/page.tsx` (reescrita do bloco de dados — mantém o JSX visual)
- Modify: `apps/web/src/app/family/family.test.tsx` (tests do painel agora mocam `useFamilyData`)

**Interfaces:**
- Consumes: `useFamilyData` (Task 3), `fmtUsdc`/`fmtUsdcShort` (Task 1), `familyMath` com `price` em number (subs de `useFamilyData` já vêm convertidos).
- Produces: dashboard com `principal` (saldo), `apyPercent` (rate), `spendable`, `vaultValue`, subs da API e add-sub chamando `createSub`.

- [ ] **Step 1: Trocar a fonte de dados**

No topo do componente, substituir:

```tsx
const { t, state, addSub } = useFamily();
const { deposit, rate, subs } = state;
```

por:

```tsx
const { t } = useFamily();
const { dashboard, subs, loading, createSub } = useFamilyData();

const deposit = dashboard ? Number(dashboard.principal) / 10 ** 6 : 0;
const rate = dashboard ? Number(dashboard.apyPercent) : 0;
```

No `view` (useMemo), trocar deps para `[deposit, rate, subs]` — `subs` agora é `FamilySubRow[]` (`price`, sem `dia`; `familyMath.coverageRows` aceita `FamilySub[]` que só usa `price`, `name`, `id` — compatível).

- [ ] **Step 2: Add-sub pela API**

Trocar `handleAdd`:

```tsx
const [saving, setSaving] = React.useState(false);

async function handleAdd() {
  const price = parseUsdc(newPrice);
  const name = newName.trim();
  if (!name || price <= 0 || saving) return;
  setSaving(true);
  try {
    await createSub({ name, price, category: 'other' });
    setNewName('');
    setNewPrice('');
    setAdding(false);
  } catch {
    /* o popup de erro global já abre (createApi publica notificação) */
  } finally {
    setSaving(false);
  }
}
```

Importar `parseUsdc` (e trocar os usos de `fmtBRL`/`fmtBRLShort`/`parseBRL` por `fmtUsdc`/`fmtUsdcShort`/`parseUsdc` no arquivo todo).

- [ ] **Step 3: Estado de carga**

Enquanto `loading && !dashboard`, renderizar os valores como `—` (ou `0`) sem quebrar o layout — os `fmtUsdcShort(deposit)` já viram `USDC 0`; suficiente para o MVP. Nada de skeleton novo.

- [ ] **Step 4: Atualizar family.test.tsx (painel)**

Os tests do painel atualmente usam `updateFamilyStore((prev) => ({ ...prev, deposit: 30000 }))`. Passam a mocar `useFamilyData`:

```tsx
const familyDataMock = vi.hoisted(() => ({
  ready: true,
  loading: false,
  error: false,
  dashboard: null as null | {
    vaultValue: string;
    principal: string;
    spendable: string;
    apyPercent: string;
    returnsChangePercent: string | null;
  },
  balance: null,
  subs: [] as Array<{ id: string; name: string; price: number; category: string; priority: number }>,
  refresh: vi.fn(async () => {}),
  createSub: vi.fn(async () => {}),
  deleteSub: vi.fn(async () => {}),
  reorderSubs: vi.fn(async () => {}),
}));

vi.mock('./_lib/useFamilyData', () => ({
  useFamilyData: () => familyDataMock,
}));
```

Exemplos de asserções reescritas:

```tsx
it('sem depósito, nenhuma assinatura está coberta', () => {
  familyDataMock.dashboard = {
    vaultValue: '0', principal: '0', spendable: '0', apyPercent: '8', returnsChangePercent: null,
  };
  familyDataMock.subs = [
    { id: 'n', name: 'Netflix', price: 59.9, category: 'streaming', priority: 0 },
    { id: 's', name: 'Spotify Família', price: 34.9, category: 'streaming', priority: 1 },
    { id: 'c', name: 'ChatGPT', price: 107, category: 'utility', priority: 2 },
    { id: 'a', name: 'Academia', price: 129.9, category: 'other', priority: 3 },
  ];
  renderInFamily(<FamilyDashboardPage />);
  expect(screen.getByText('0%')).toBeInTheDocument();
  expect(screen.getAllByText('ainda não')).toHaveLength(4);
});

it('com depósito, cobre as contas do topo da lista primeiro', () => {
  // principal 30.000 USDC a 8% a.a. = 200/mês: cobre 59,90 + 34,90, não cobre o acumulado do ChatGPT.
  familyDataMock.dashboard = {
    vaultValue: '30000000000', principal: '30000000000', spendable: '0', apyPercent: '8', returnsChangePercent: null,
  };
  familyDataMock.subs = [ /* mesma lista acima */ ];
  renderInFamily(<FamilyDashboardPage />);
  expect(screen.getAllByText('coberta')).toHaveLength(2);
  expect(screen.getAllByText('ainda não')).toHaveLength(2);
});
```

O teste do botão "Depositar por PIX" passa a buscar `'Aportar USDC'` (Task 2). Os tests de landing (`/family`) continuam com o store — não mudam.

- [ ] **Step 5: Run tests**

Run: `pnpm --filter web exec vitest run src/app/family`
Expected: PASS.

---

### Task 8: SubsSection na API + remoção da PixSection

**Files:**
- Modify: `apps/web/src/app/family/configuracoes/SubsSection.tsx`
- Modify: `apps/web/src/app/family/configuracoes/page.tsx` (remover `<PixSection />`)
- Delete: `apps/web/src/app/family/configuracoes/PixSection.tsx`

**Interfaces:**
- Consumes: `useFamilyData` (`subs`, `createSub`, `deleteSub`, `reorderSubs`, `dashboard`).
- Produces: CRUD de assinaturas persistido; sem chave PIX.

- [ ] **Step 1: SubsSection via API**

Trocar `const { t, state, moveSub, updateSub, removeSub } = useFamily();` por `useFamilyData` + `useFamily` (só `t`):

```tsx
const { t } = useFamily();
const { subs, dashboard, deleteSub, reorderSubs } = useFamilyData();

const deposit = dashboard ? Number(dashboard.principal) / 10 ** 6 : 0;
const rate = dashboard ? Number(dashboard.apyPercent) : 0;
const rows = coverageRows(subs, deposit, rate);
```

- `moveSub(id, dir)` vira:
  ```tsx
  async function moveSub(id: string, dir: -1 | 1) {
    const ids = subs.map((s) => s.id);
    const i = ids.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    await reorderSubs(ids);
  }
  ```
- `handleRemove(id)` chama `await deleteSub(id)`.
- Edição de valor/dia: `updateSub` não tem endpoint na API (não existe update de sub). Para o MVP, remover o modo de edição inline e deixar o fluxo excluir + re-adicionar — apagar o bloco `editing`/`startEdit`/`saveEdit` e o botão de editar. O campo "dia de vencimento" não existe no modelo da API (`Sub` não tem `dia`) — remover a exibição.
- Trocar `fmtBRL` → `fmtUsdc`.

- [ ] **Step 2: Remover PixSection**

Em `configuracoes/page.tsx`, apagar o import e o uso de `<PixSection />`; deletar o arquivo `PixSection.tsx`. As chaves `settings.pix*` do i18n podem sair junto (as duas línguas).

- [ ] **Step 3: Run tests + tsc**

Run: `pnpm --filter web exec vitest run src/app/family && pnpm --filter web exec tsc --noEmit`
Expected: PASS sem erros.

---

### Task 9: Rewire /family/onboarding

**Files:**
- Modify: `apps/web/src/app/family/onboarding/page.tsx`

**Interfaces:**
- Consumes: Privy (`usePrivy().login`), `useWallet` (`address`, `ensureWallet`), `UsdcDepositCard` (Task 4).

- [ ] **Step 1: Passo 1 chama o login real**

Trocar o botão placebo do passo 1 por login Privy (o design mantém os botões Google/Apple; o Privy embedded auth trata ambos):

```tsx
import { usePrivy } from '@privy-io/react-auth';
import { useWallet } from '@/lib/useWallet';

const { login } = usePrivy();
const { address, ensureWallet } = useWallet();

// passo 1:
<button
  type="button"
  className="btn-shine"
  onClick={() => void login()}
  /* estilos atuais mantidos */
>
  {t.onboarding.loginGoogle}
</button>
```

- [ ] **Step 2: Passo 2 espera a carteira**

O passo 2 deixa de ser um clique placebo: enquanto `address == null`, chama `ensureWallet()` em um `useEffect` e mostra o texto de espera; quando `address` existe, mostra o endereço e libera "Continuar":

```tsx
React.useEffect(() => {
  if (step === 2 && !address) {
    ensureWallet().catch(() => {
      /* popup de erro global; o usuário pode voltar ao passo 1 */
    });
  }
}, [step, address, ensureWallet]);
```

- [ ] **Step 3: Passo 3 usa UsdcDepositCard**

Trocar `<PixDepositCard onConfirm={handleConfirm} />` por:

```tsx
<UsdcDepositCard
  onDone={() => router.push('/family/dashboard')}
/>
```

`addDeposit`/`SEED_DEPOSIT` saem do onboarding (não existe mais depósito local).

- [ ] **Step 4: Run tests**

Run: `pnpm --filter web exec vitest run src/app/family`
Expected: PASS (adicionar mock de `@privy-io/react-auth` já presente nos outros tests deste plano).

---

### Task 10: Cleanup do mock financeiro

**Files:**
- Modify: `apps/web/src/app/family/_lib/familyStore.ts`
- Modify: `apps/web/src/app/family/_lib/FamilyProvider.tsx`
- Delete: `apps/web/src/app/family/_components/PixDepositCard.tsx`
- Modify: `apps/web/src/app/family/family.test.tsx` (tests de landing continuam; assertions de depósito local saem)

**Interfaces:**
- Produces: `FamilyState` reduzido a prefs de UI: `{ lang, notifications, autoDeposit, twoFA, devices, profile }`. Saem: `deposit`, `rate`, `subs`, `onboarded`, `walletAddress`, `pixKey`. Saem do provider: `addDeposit`, `withdraw`, `addSub`, `updateSub`, `removeSub`, `moveSub`.

- [ ] **Step 1: Reduzir o store**

Em `familyStore.ts`: remover do `FamilyState` e do `DEFAULT_FAMILY_STATE` os campos financeiros listados acima (`deposit`, `rate`, `subs`, `onboarded`, `walletAddress`, `pixKey`). `SEED_DEPOSIT` sai. A chave do localStorage muda para `y2p:family:v2` (estado velho com campos desconhecidos não deve vazar).

Em `FamilyProvider.tsx`: remover as actions financeiras do contexto; `patch`, `setLang`, `reset` ficam. Ajustar o tipo `FamilyContextValue` e os re-exports.

- [ ] **Step 2: Quebrar o que referencia os campos removidos**

Run: `pnpm --filter web exec tsc --noEmit`
Corrigir cada erro: telas que ainda leem `state.deposit`/`state.subs`/`state.pixKey` migram para `useFamilyData`/`useWallet` (dashboard/[subId], configuracoes WalletSection/SecuritySection/DashboardHeader — usam `state.walletAddress` → `useWallet().address`; `state.pixKey` → remove).

- [ ] **Step 3: Deletar PixDepositCard**

Remover o arquivo e todos os imports (deposito e onboarding já não usam — Tasks 5 e 9).

- [ ] **Step 4: Rodar tudo**

Run: `pnpm --filter web exec vitest run && pnpm --filter web exec tsc --noEmit`
Expected: PASS completo.

- [ ] **Step 5: Smoke manual**

Subir API (`pnpm --filter api dev`, com Postgres local + envs) e web (`pnpm --filter web dev`), logar com Privy, abrir `/family/dashboard`. Sem aporte: painel 0%, sem erro de console. `/family/deposito` mostra a carteira real. O aporte só completa com o Plano 1 (vault) — até lá o erro do backend ("Kamino deposit not wired yet") aparece no popup, e é o comportamento esperado.

---

## Self-Review

- **Cobertura:** depósito (Tasks 4-5), saque (6), dashboard (7), subs + settings (8), onboarding (9), remoção do mock (10), moeda (1), copy (2). Toda tela do app coberta. `dashboard/[subId]` e `conceitos` não têm wiring novo — `[subId]` é detalhe visual de sub já listada; conceitos é conteúdo estático.
- **Placeholders:** os steps de "verificar e ajustar" nas Tasks 5/8 (layout AuthGate, edição inline) são verificações contra o arquivo real, não trabalho indefinido.
- **Consistência de tipos:** `FamilySubRow` (Task 3) é o que as telas consomem; `familyMath.coverageRows` recebe `{id, name, price}` — compatível. `toBaseUnitsString` usado por card e saque. Chaves i18n usadas nas tasks seguintes batem com a lista da Task 2.
