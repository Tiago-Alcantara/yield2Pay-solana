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
          onDone={() => {
            router.refresh();
            router.push('/family/dashboard');
          }}
          onBack={() => router.push('/family/dashboard')}
        />
      </div>
    </div>
  );
}
