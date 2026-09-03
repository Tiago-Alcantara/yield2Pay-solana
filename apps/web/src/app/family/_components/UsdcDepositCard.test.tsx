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
