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
