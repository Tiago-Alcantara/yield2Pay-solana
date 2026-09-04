'use client';

/**
 * Onboarding de família — /family/onboarding
 *
 * Três passos, como no design: entrar → carteira criada → primeiro depósito.
 * Passo 1: login real via Privy.
 * Passo 2: aguarda provisionamento da carteira embedded (ensureWallet).
 * Passo 3: UsdcDepositCard → redireciona para o dashboard.
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { C, CHROME_SHADOW } from '../_lib/familyTheme';
import { useFamily } from '../_lib/FamilyProvider';
import { useWallet } from '@/lib/useWallet';
import { FamilyBrand, MetalPanel } from '../_components/FamilyUI';
import { UsdcDepositCard } from '../_components/UsdcDepositCard';

type Step = 1 | 2 | 3;

export default function FamilyOnboardingPage() {
  const router = useRouter();
  const { t } = useFamily();
  const { login } = usePrivy();
  const { address, ensureWallet } = useWallet();
  const [step, setStep] = useState<Step>(1);

  useEffect(() => {
    if (step === 2 && !address) {
      ensureWallet().catch(() => {
        /* popup de erro global; o usuário pode voltar ao passo 1 */
      });
    }
  }, [step, address, ensureWallet]);

  const cardStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: 420,
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 20,
    padding: 'var(--fam-card-pad-lg)',
    boxShadow: '0 24px 56px rgba(0,0,0,.5)',
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bgRadialTall }}>
      <div className="fam-center-shell">
        <div style={{ marginBottom: 'clamp(22px,5vw,34px)' }}>
          <FamilyBrand tag={t.brandTag} size={20} href="/family" />
        </div>

        {step === 1 && (
          <div style={cardStyle}>
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
              {t.onboarding.loginTitle}
            </h1>
            <p style={{ fontSize: 14.5, lineHeight: 1.6, color: C.text2, margin: '10px 0 0' }}>
              {t.onboarding.loginSub}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 26 }}>
              <button
                type="button"
                className="btn-shine"
                onClick={() => void login()}
                style={{
                  fontFamily: 'inherit',
                  fontSize: 15,
                  fontWeight: 600,
                  color: C.chromeInk,
                  background: C.chromeSoft,
                  border: 'none',
                  borderRadius: 12,
                  padding: 14,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  boxShadow: CHROME_SHADOW,
                }}
              >
                <span style={{ fontWeight: 800 }}>G</span> {t.onboarding.google}
              </button>
              <button
                type="button"
                className="fam-outline"
                onClick={() => void login()}
                style={{
                  fontFamily: 'inherit',
                  fontSize: 15,
                  fontWeight: 600,
                  color: C.textStrong,
                  background: 'rgba(255,255,255,.03)',
                  border: `1px solid ${C.borderMetal}`,
                  borderRadius: 12,
                  padding: 14,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  transition: 'border-color .2s ease',
                }}
              >
                <span style={{ fontWeight: 800 }}>A</span> {t.onboarding.apple}
              </button>
            </div>
            <div
              style={{
                fontSize: 11.5,
                lineHeight: 1.5,
                color: C.text4,
                textAlign: 'center',
                marginTop: 18,
              }}
            >
              {t.onboarding.loginNote}
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={cardStyle}>
            <div
              aria-hidden="true"
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: C.tile,
                border: `1px solid ${C.borderMetal}`,
                fontSize: 20,
                color: C.silverBright,
              }}
            >
              ✓
            </div>
            <h1
              style={{
                fontSize: 'clamp(22px,5.6vw,26px)',
                fontWeight: 700,
                letterSpacing: '-.02em',
                margin: '20px 0 0',
                color: C.textStrong,
                textWrap: 'balance',
              }}
            >
              {t.onboarding.walletTitle}
            </h1>
            <div style={{ marginTop: 20 }}>
              <MetalPanel radius={16} padding={20} shadow="none">
                <div
                  style={{
                    fontFamily: C.mono,
                    fontSize: 11,
                    letterSpacing: '.16em',
                    textTransform: 'uppercase',
                    color: C.text2,
                  }}
                >
                  {t.onboarding.walletKicker}
                </div>
                {address ? (
                  <div
                    style={{
                      fontFamily: C.mono,
                      fontSize: 12,
                      color: C.silver,
                      marginTop: 10,
                      wordBreak: 'break-all',
                    }}
                  >
                    {address}
                  </div>
                ) : (
                  <p style={{ fontSize: 14, lineHeight: 1.6, color: C.textSoft, margin: '10px 0 0' }}>
                    {t.onboarding.usdcStatusBuilding}
                  </p>
                )}
                <p style={{ fontSize: 14, lineHeight: 1.6, color: C.textSoft, margin: '10px 0 0' }}>
                  {t.onboarding.walletBody}
                </p>
              </MetalPanel>
            </div>
            <button
              type="button"
              className="btn-shine"
              onClick={() => setStep(3)}
              disabled={!address}
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
                cursor: address ? 'pointer' : 'default',
                opacity: address ? 1 : 0.5,
                marginTop: 22,
                boxShadow: CHROME_SHADOW,
              }}
            >
              {t.onboarding.walletCta}
            </button>
          </div>
        )}

        {step === 3 && (
          <UsdcDepositCard onDone={() => router.push('/family/dashboard')} />
        )}

        <div
          role="group"
          aria-label={t.onboarding.stepsAria}
          style={{ display: 'flex', gap: 8, marginTop: 26 }}
        >
          {[1, 2, 3].map((n) => (
            <span
              key={n}
              aria-current={step === n ? 'step' : undefined}
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: step >= n ? C.silver : C.border,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
