'use client';

import React, { useState } from 'react';
import { C } from '../_lib/familyTheme';
import { useFamily } from '../_lib/FamilyProvider';
import { useFamilyData } from '../_lib/useFamilyData';
import { fmtUsdc } from '../_lib/familyFormat';
import { coverageRows } from '../_lib/familyMath';
import { StatusPill } from '../_components/FamilyUI';

/** Assinaturas: prioridade (ordem), valor e remoção. */
export function SubsSection() {
  const { t } = useFamily();
  const { subs, dashboard, deleteSub, reorderSubs } = useFamilyData();
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  const deposit = dashboard ? Number(dashboard.principal) / 10 ** 6 : 0;
  const rate = dashboard ? Number(dashboard.apyPercent) : 0;
  // coverageRows expects FamilySub[] with `dia`; pad with 0 since dia is not in API model
  const rows = coverageRows(
    subs.map((s) => ({ ...s, dia: 0 })),
    deposit,
    rate,
  );

  async function moveSub(id: string, dir: -1 | 1) {
    const ids = subs.map((s) => s.id);
    const i = ids.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    await reorderSubs(ids);
  }

  async function handleRemove(id: string) {
    if (confirmRemove !== id) {
      setConfirmRemove(id);
      return;
    }
    await deleteSub(id);
    setConfirmRemove(null);
  }

  const arrow = (enabled: boolean): React.CSSProperties => ({
    background: 'none',
    border: 'none',
    cursor: enabled ? 'pointer' : 'default',
    color: enabled ? C.text2 : C.borderStrong,
    fontSize: 10,
    padding: '1px 4px',
    lineHeight: 1,
  });

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: 'var(--fam-card-pad)' }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: C.textStrong, letterSpacing: '-.01em' }}>
        {t.settings.subsTitle}
      </div>
      <p style={{ fontSize: 13.5, lineHeight: 1.6, color: C.text2, margin: '8px 0 0', maxWidth: 540 }}>
        {t.settings.subsSub}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 14 }}>
        {rows.map((row, i) => (
          <div key={row.id} style={{ borderBottom: `1px solid ${C.borderFainter}`, padding: '14px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <button
                  type="button"
                  aria-label={t.settings.subsUp}
                  disabled={i === 0}
                  onClick={() => moveSub(row.id, -1)}
                  style={arrow(i > 0)}
                >
                  ▲
                </button>
                <button
                  type="button"
                  aria-label={t.settings.subsDown}
                  disabled={i === rows.length - 1}
                  onClick={() => moveSub(row.id, 1)}
                  style={arrow(i < rows.length - 1)}
                >
                  ▼
                </button>
              </span>

              <span style={{ flex: 1, minWidth: 160 }}>
                <span style={{ display: 'block', fontSize: 15, fontWeight: 600, color: C.textStrong }}>
                  {row.name}
                </span>
              </span>

              <span style={{ fontFamily: C.mono, fontSize: 14, color: C.silver }}>
                {fmtUsdc(row.price)}
              </span>
              <StatusPill covered={row.covered}>
                {row.covered ? t.settings.statusCovered : t.settings.statusNotYet}
              </StatusPill>

              <button
                type="button"
                onClick={() => handleRemove(row.id)}
                style={{
                  fontFamily: 'inherit',
                  fontSize: 13,
                  fontWeight: confirmRemove === row.id ? 600 : 400,
                  color: C.danger,
                  background: 'none',
                  border: confirmRemove === row.id ? `1px solid ${C.dangerBorder}` : 'none',
                  borderRadius: 999,
                  cursor: 'pointer',
                  padding: confirmRemove === row.id ? '6px 12px' : 6,
                }}
              >
                {confirmRemove === row.id ? t.settings.subsRemoveConfirm : t.settings.subsRemove}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
