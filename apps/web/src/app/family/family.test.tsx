/**
 * family.test.tsx
 * Testes de comportamento das telas de família: a calculadora da landing e o
 * painel. Sem rede — o estado vem do store local (familyStore).
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
  usePathname: () => '/family',
}));

// ── mock compartilhado para useFamilyData ─────────────────────────────────────
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

// ── mocks para a página de saque ──────────────────────────────────────────────
const withdrawMock = vi.fn().mockResolvedValue('tx-sig');
vi.mock('@/lib/useSolanaTx', () => ({
  useSolanaTx: () => ({ deposit: vi.fn(), withdraw: withdrawMock }),
}));
vi.mock('@/lib/useWallet', () => ({
  useWallet: () => ({ address: 'So1ana1111TestAddr', ensureWallet: vi.fn() }),
}));

import { FamilyProvider } from './_lib/FamilyProvider';
import { resetFamilyStore, updateFamilyStore } from './_lib/familyStore';
import FamilyLandingPage from './page';
import FamilyDashboardPage from './dashboard/page';
import FamilyWithdrawPage from './saque/page';

function renderInFamily(ui: React.ReactElement) {
  return render(<FamilyProvider>{ui}</FamilyProvider>);
}

const DEFAULT_SUBS = [
  { id: 'netflix', name: 'Netflix', price: 59.9, category: 'streaming', priority: 0 },
  { id: 'spotify', name: 'Spotify Família', price: 34.9, category: 'streaming', priority: 1 },
  { id: 'chatgpt', name: 'ChatGPT', price: 107, category: 'utility', priority: 2 },
  { id: 'academia', name: 'Academia', price: 129.9, category: 'other', priority: 3 },
];

beforeEach(() => {
  push.mockClear();
  withdrawMock.mockClear();
  resetFamilyStore();
  // reset familyDataMock to clean state
  familyDataMock.dashboard = null;
  familyDataMock.subs = [...DEFAULT_SUBS];
  familyDataMock.createSub.mockClear();
  familyDataMock.deleteSub.mockClear();
  familyDataMock.reorderSubs.mockClear();
  familyDataMock.refresh.mockClear();
});

describe('landing /family', () => {
  it('mostra a proposta em português por padrão', () => {
    renderInFamily(<FamilyLandingPage />);
    expect(
      screen.getByText('O rendimento do seu próprio dinheiro paga suas assinaturas.'),
    ).toBeInTheDocument();
  });

  it('troca a página inteira para inglês pelo seletor de idioma', () => {
    renderInFamily(<FamilyLandingPage />);
    fireEvent.click(screen.getByRole('button', { name: 'EN' }));
    expect(
      screen.getByText('The yield on your own money pays your subscriptions.'),
    ).toBeInTheDocument();
  });

  it('recalcula o percentual de liberdade ao marcar mais uma assinatura', () => {
    renderInFamily(<FamilyLandingPage />);
    // Padrão: R$ 60.000 a 8% a.a. = R$ 400/mês contra R$ 283,80 de assinaturas.
    expect(screen.getByText('100%')).toBeInTheDocument();

    // Academia (R$ 129,90) leva o total a R$ 413,70 — o rendimento não cobre mais tudo.
    fireEvent.click(screen.getByRole('button', { name: /Academia/ }));
    expect(screen.getByText('97%')).toBeInTheDocument();
  });

  it('reage ao cenário de rendimento escolhido', () => {
    renderInFamily(<FamilyLandingPage />);
    fireEvent.click(screen.getByRole('button', { name: '6% a.a.' }));
    // 60.000 a 6% = R$ 300/mês contra R$ 283,80 — ainda cobre tudo.
    expect(screen.getByText('100%')).toBeInTheDocument();
    // "Suas assinaturas" e "Coberto no cenário" mostram o mesmo valor aqui.
    expect(screen.getAllByText('R$ 283,80')).toHaveLength(2);
  });

  it('leva ao login pelos CTAs de entrada', () => {
    renderInFamily(<FamilyLandingPage />);
    // Nav, hero, calculadora e seção final — CTAs apontam para /login.
    // Os textos variam ("Entrar na lista", "Quero entrar na lista", etc.)
    const loginLinks = screen.getAllByRole('link', { name: /entrar/i });
    expect(loginLinks.length).toBeGreaterThanOrEqual(4);
    for (const link of loginLinks) {
      expect(link).toHaveAttribute('href', '/login');
    }
  });
});

describe('painel /family/dashboard', () => {
  it('sem depósito, nenhuma assinatura está coberta', () => {
    familyDataMock.dashboard = {
      vaultValue: '0', principal: '0', spendable: '0', apyPercent: '8', returnsChangePercent: null,
    };
    renderInFamily(<FamilyDashboardPage />);
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getAllByText('ainda não')).toHaveLength(4);
  });

  it('com depósito, cobre as contas do topo da lista primeiro', () => {
    // 30.000 USDC a 8% a.a. = 200/mês: cobre Netflix (59,90) e Spotify (34,90),
    // mas o acumulado do ChatGPT (201,80) já passa do rendimento.
    familyDataMock.dashboard = {
      vaultValue: '30000000000', principal: '30000000000', spendable: '0', apyPercent: '8', returnsChangePercent: null,
    };
    renderInFamily(<FamilyDashboardPage />);

    expect(screen.getAllByText('coberta')).toHaveLength(2);
    expect(screen.getAllByText('ainda não')).toHaveLength(2);
  });

  it('adiciona uma assinatura à lista da casa', async () => {
    familyDataMock.dashboard = {
      vaultValue: '0', principal: '0', spendable: '0', apyPercent: '8', returnsChangePercent: null,
    };
    familyDataMock.createSub.mockImplementation(async (...args: unknown[]) => {
      const input = args[0] as { name: string; price: number; category: string };
      familyDataMock.subs = [
        ...familyDataMock.subs,
        { id: input.name, name: input.name, price: input.price, category: input.category, priority: familyDataMock.subs.length },
      ];
    });
    renderInFamily(<FamilyDashboardPage />);
    fireEvent.click(screen.getByRole('button', { name: '+ Adicionar assinatura' }));

    fireEvent.change(screen.getByLabelText('Nome da assinatura'), {
      target: { value: 'Escola de inglês' },
    });
    fireEvent.change(screen.getByLabelText('Valor mensal'), { target: { value: '189' } });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }));

    await waitFor(() => expect(screen.getByText('Escola de inglês')).toBeInTheDocument());
    // 59,90 + 34,90 + 107 + 129,90 + 189 = 520,70
    await waitFor(() =>
      expect(screen.getByText('Total de USDC 520,70 por mês')).toBeInTheDocument(),
    );
  });

  it('leva ao detalhe da assinatura clicada', () => {
    familyDataMock.dashboard = {
      vaultValue: '0', principal: '0', spendable: '0', apyPercent: '8', returnsChangePercent: null,
    };
    renderInFamily(<FamilyDashboardPage />);
    fireEvent.click(screen.getByRole('button', { name: /Netflix/ }));
    expect(push).toHaveBeenCalledWith('/family/dashboard/netflix');
  });

  it('leva ao depósito e ao saque pelos botões do cofre', () => {
    familyDataMock.dashboard = {
      vaultValue: '0', principal: '0', spendable: '0', apyPercent: '8', returnsChangePercent: null,
    };
    renderInFamily(<FamilyDashboardPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Aportar USDC' }));
    expect(push).toHaveBeenCalledWith('/family/deposito');

    fireEvent.click(screen.getByRole('button', { name: 'Sacar meu saldo' }));
    expect(push).toHaveBeenCalledWith('/family/saque');
  });
});

describe('saque /family/saque', () => {
  it('resgata em base units e volta ao dashboard', async () => {
    // dashboard: vaultValue 100 USDC (100_000_000 base units)
    familyDataMock.dashboard = {
      vaultValue: '100000000', principal: '100000000', spendable: '0', apyPercent: '8', returnsChangePercent: null,
    };
    renderInFamily(<FamilyWithdrawPage />);
    fireEvent.change(screen.getByLabelText(/Quanto resgatar/), { target: { value: '40' } });
    fireEvent.click(screen.getByRole('button', { name: 'Resgatar agora' }));
    await waitFor(() => expect(withdrawMock).toHaveBeenCalledWith('40000000'));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/family/dashboard'));
  });
});
