import type { Metadata } from 'next';
import './family.css';
import { FamilyProvider } from './_lib/FamilyProvider';

export const metadata: Metadata = {
  title: 'Yield2Pay para famílias',
  description:
    'O rendimento do seu próprio dinheiro paga suas assinaturas. O principal continua seu.',
};

/**
 * Layout de /family — a vertical de famílias.
 *
 * A landing (/family) e as páginas educacionais (/family/conceitos,
 * /family/onboarding) são públicas. As telas do app (dashboard, depósito,
 * saque, configurações) têm layout próprio com AuthGate: exigem login Privy
 * e provisionam/registram a carteira Solana embedded no primeiro acesso.
 * Depósito e saque seguem mock — dinheiro e assinaturas entram depois.
 */
export default function FamilyLayout({ children }: { children: React.ReactNode }) {
  return <FamilyProvider>{children}</FamilyProvider>;
}
