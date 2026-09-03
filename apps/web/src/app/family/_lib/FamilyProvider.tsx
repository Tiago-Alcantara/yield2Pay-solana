'use client';

import React, { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from 'react';
import { FAM, type FamilyDict, type FamilyLang } from './familyI18n';
import {
  DEFAULT_FAMILY_STATE,
  getFamilyServerSnapshot,
  getFamilySnapshot,
  subscribeFamilyStore,
  updateFamilyStore,
  type FamilyState,
} from './familyStore';

export type { FamilyState, FamilyDevice, FamilyProfile } from './familyStore';
export { DEFAULT_FAMILY_STATE } from './familyStore';

interface FamilyContextValue {
  state: FamilyState;
  /** Merge raso no estado. */
  patch: (next: Partial<FamilyState>) => void;
  lang: FamilyLang;
  setLang: (lang: FamilyLang) => void;
  t: FamilyDict;
  /** Volta ao estado inicial, preservando o idioma (usado pelo "Sair"). */
  reset: () => void;
}

const FamilyContext = createContext<FamilyContextValue | undefined>(undefined);

/**
 * Provedor do subtree /family.
 *
 * O estado mora num store externo (familyStore) e chega aqui por
 * useSyncExternalStore — o localStorage entra na hidratação sem efeito nenhum.
 */
export function FamilyProvider({ children }: { children: React.ReactNode }) {
  const state = useSyncExternalStore(
    subscribeFamilyStore,
    getFamilySnapshot,
    getFamilyServerSnapshot,
  );

  const patch = useCallback((next: Partial<FamilyState>) => {
    updateFamilyStore((prev) => ({ ...prev, ...next }));
  }, []);

  const actions = useMemo(
    () => ({
      patch,
      setLang: (lang: FamilyLang) => patch({ lang }),
      reset: () =>
        updateFamilyStore((prev) => ({ ...DEFAULT_FAMILY_STATE, lang: prev.lang })),
    }),
    [patch],
  );

  const value = useMemo<FamilyContextValue>(
    () => ({ state, lang: state.lang, t: FAM[state.lang], ...actions }),
    [state, actions],
  );

  return <FamilyContext.Provider value={value}>{children}</FamilyContext.Provider>;
}

/** Acesso ao estado de família. Só funciona dentro de /family (o layout provê). */
export function useFamily(): FamilyContextValue {
  const ctx = useContext(FamilyContext);
  if (!ctx) throw new Error('useFamily precisa estar dentro de <FamilyProvider>');
  return ctx;
}
