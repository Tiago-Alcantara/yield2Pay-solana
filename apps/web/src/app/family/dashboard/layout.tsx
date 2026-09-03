'use client';

import { AuthGate } from '@/providers/AuthGate';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <AuthGate>{children}</AuthGate>;
}
