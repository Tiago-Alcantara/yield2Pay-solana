'use client';

import { AuthGate } from '@/providers/AuthGate';

export default function ConfiguracoesLayout({ children }: { children: React.ReactNode }) {
  return <AuthGate>{children}</AuthGate>;
}
