'use client';

import { AuthGate } from '@/providers/AuthGate';

export default function SaqueLayout({ children }: { children: React.ReactNode }) {
  return <AuthGate>{children}</AuthGate>;
}
