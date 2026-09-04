'use client';

import { AuthGate } from '@/providers/AuthGate';

export default function DepositoLayout({ children }: { children: React.ReactNode }) {
  return <AuthGate>{children}</AuthGate>;
}
