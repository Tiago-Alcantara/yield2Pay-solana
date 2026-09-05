'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { C } from '../_lib/familyTheme';
import { useFamily } from '../_lib/FamilyProvider';
import { FamilyBrand } from './FamilyUI';

function IconOverview() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3.5" y="3.5" width="7" height="7" rx="2" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="2" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="2" />
    </svg>
  );
}

function IconDeposit() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v10" />
      <path d="M8 9l4 4 4-4" />
      <path d="M4 19h16" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.2 5.2l2.1 2.1M16.7 16.7l2.1 2.1M18.8 5.2l-2.1 2.1M7.3 16.7l-2.1 2.1" />
    </svg>
  );
}

function IconLogout() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 4h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3" />
      <path d="M10 16l4-4-4-4" />
      <path d="M14 12H4" />
    </svg>
  );
}

/**
 * Navegação lateral fixa da tela /family/dashboard — só desta tela, para não
 * afetar o layout mais enxuto das outras páginas de família.
 * Some abaixo de 900px (mesmo ponto de quebra do resto do dashboard).
 */
export function DashboardSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { t, state, reset } = useFamily();

  const items = [
    { href: '/family/dashboard', label: t.dash.navOverview, icon: <IconOverview /> },
    { href: '/family/deposito', label: t.dash.navDeposit, icon: <IconDeposit /> },
    { href: '/family/configuracoes', label: t.dash.navSettings, icon: <IconSettings /> },
  ];

  function handleLogout() {
    reset();
    router.push('/family');
  }

  return (
    <aside
      className="fam-sidebar"
      style={{
        flex: '0 0 240px',
        background: C.well,
        borderRight: `1px solid ${C.border}`,
        display: 'flex',
        flexDirection: 'column',
        padding: '22px 14px',
        position: 'sticky',
        top: 0,
        height: '100vh',
      }}
    >
      <div style={{ padding: '6px 10px 22px' }}>
        <FamilyBrand size={19} href="/family/dashboard" />
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {items.map((item) => {
          const on = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="fam-navitem"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                width: '100%',
                textAlign: 'left',
                borderRadius: 10,
                padding: '10px 12px',
                fontSize: 14,
                fontWeight: on ? 600 : 400,
                color: on ? C.textStrong : C.text3,
                background: 'transparent',
                textDecoration: 'none',
              }}
            >
              <span style={{ display: 'flex', color: on ? C.textStrong : C.text3 }}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div
        style={{
          marginTop: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: 11,
          padding: '12px 10px',
          borderTop: `1px solid ${C.border}`,
        }}
      >
        <span
          style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            background: C.tile,
            border: `1px solid ${C.borderMetal}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: C.mono,
            fontSize: 12,
            color: C.silverBright,
            flexShrink: 0,
          }}
        >
          {state.profile.name.trim().charAt(0).toUpperCase() || 'A'}
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span
            style={{
              display: 'block',
              fontSize: 13.5,
              fontWeight: 600,
              color: C.textStrong,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {state.profile.name}
          </span>
          <span style={{ display: 'block', fontFamily: C.mono, fontSize: 10.5, color: C.text2 }}>
            {t.dash.profileTag}
          </span>
        </span>
        <button
          type="button"
          onClick={handleLogout}
          aria-label={t.dash.menuLogout}
          className="fam-quiet"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.text2, display: 'flex', padding: 4 }}
        >
          <IconLogout />
        </button>
      </div>
    </aside>
  );
}
