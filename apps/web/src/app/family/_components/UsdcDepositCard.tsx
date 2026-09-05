'use client';

/**
 * Card de aporte USDC — substitui o PixDepositCard.
 *
 * Mesmo card no fim do onboarding e no "Aportar USDC" do painel; a diferença é
 * só o título e o botão de voltar (`fromApp`). O fluxo é o useSolanaTx:
 * backend monta (sponsor como feePayer) → Privy assina → backend envia.
 */

import React, { useState } from 'react';
import { C, CHROME_SHADOW, cardLabel } from '../_lib/familyTheme';
import { fmtUsdc, numericOnly, parseUsdc, toBaseUnitsString } from '../_lib/familyFormat';
import { useFamily } from '../_lib/FamilyProvider';
import { useSolanaTx } from '@/lib/useSolanaTx';
import { useWallet } from '@/lib/useWallet';
import { ApiError } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import { dismissErrorNotification } from '@/lib/errorNotifications';

type Phase = 'idle' | 'running' | 'done' | 'error';

export function UsdcDepositCard({
  fromApp = false,
  onDone,
  onBack,
}: {
  fromApp?: boolean;
  onDone: (txSignature: string) => void;
  onBack?: () => void;
}) {
  const { t } = useFamily();
  const { address } = useWallet();
  const { deposit } = useSolanaTx();
  const [amount, setAmount] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [errorMessage, setErrorMessage] = useState(t.onboarding.usdcErrorSub);

  const parsed = parseUsdc(amount);

  async function handleDeposit() {
    if (parsed <= 0 || phase === 'running') return;
    setPhase('running');
    try {
      const txSignature = await deposit(toBaseUnitsString(parsed));
      setPhase('done');
      onDone(txSignature);
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        // Validação de negócio (valor digitado, não falha técnica): a API já
        // manda uma mensagem segura para o usuário — mostra ela aqui perto do
        // campo em vez do popup global de erro, que é para falha inesperada.
        dismissErrorNotification();
        const raw = getErrorMessage(err);
        setErrorMessage(
          raw === 'amount exceeds maximum deposit'
            ? t.onboarding.usdcAmountTooHigh
            : t.onboarding.usdcErrorSub,
        );
      } else {
        setErrorMessage(t.onboarding.usdcErrorSub);
      }
      setPhase('error');
    }
  }

  return (
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
        {fromApp ? t.onboarding.usdcTitle : t.onboarding.usdcFirstTitle}
      </h1>
      <p style={{ fontSize: 14.5, lineHeight: 1.6, color: C.text2, margin: '10px 0 0' }}>
        {t.onboarding.usdcSub}
      </p>

      <div
        style={{
          marginTop: 18,
          background: C.well,
          border: `1px solid ${C.border}`,
          borderRadius: 14,
          padding: 16,
        }}
      >
        <div style={cardLabel}>{t.onboarding.usdcWalletLabel}</div>
        <div
          style={{
            fontFamily: C.mono,
            fontSize: 12,
            color: C.silver,
            marginTop: 6,
            wordBreak: 'break-all',
          }}
        >
          {address ?? '—'}
        </div>
      </div>

      <label
        htmlFor="fam-usdc-valor"
        style={{ ...cardLabel, display: 'block', margin: '18px 0 8px' }}
      >
        {t.onboarding.usdcAmountLabel}
      </label>
      <input
        id="fam-usdc-valor"
        className="fam-field"
        type="text"
        inputMode="decimal"
        value={amount}
        onChange={(e) => {
          setAmount(numericOnly(e.target.value));
          setPhase('idle');
        }}
        placeholder={t.onboarding.usdcAmountPlaceholder}
        disabled={phase === 'running'}
        style={{
          width: '100%',
          background: C.well,
          border: `1px solid ${phase === 'error' ? C.inputError : C.border}`,
          borderRadius: 12,
          padding: '13px 14px',
          color: C.textStrong,
          fontFamily: C.mono,
          fontSize: 16,
          outline: 'none',
        }}
      />

      <div
        style={{
          fontFamily: C.mono,
          fontSize: 11.5,
          color: C.text4,
          marginTop: 10,
          display: phase === 'running' ? 'block' : 'none',
        }}
      >
        {t.onboarding.usdcStatusBuilding}
      </div>

      {phase === 'error' && (
        <div role="alert" style={{ fontSize: 12.5, color: C.danger, marginTop: 10 }}>
          {errorMessage}
        </div>
      )}

      <button
        type="button"
        className="btn-shine"
        onClick={handleDeposit}
        disabled={parsed <= 0 || phase === 'running'}
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
          cursor: parsed > 0 && phase !== 'running' ? 'pointer' : 'default',
          opacity: parsed > 0 && phase !== 'running' ? 1 : 0.5,
          marginTop: 20,
          boxShadow: CHROME_SHADOW,
        }}
      >
        {phase === 'running' ? t.onboarding.usdcStatusSubmitting : t.onboarding.usdcConfirm}
      </button>

      {fromApp && onBack && (
        <button
          type="button"
          className="fam-quiet"
          onClick={onBack}
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
          {t.onboarding.usdcBack}
        </button>
      )}
    </div>
  );
}
