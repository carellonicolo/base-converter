import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { it } from './it';
import { en } from './en';

export type Lang = 'it' | 'en';
export type Dict = typeof it;

const DICTS: Record<Lang, Dict> = { it, en };
const KEY = 'bc_lang';

function getInitialLang(): Lang {
  if (typeof window === 'undefined') return 'it';
  try {
    const stored = localStorage.getItem(KEY);
    if (stored === 'it' || stored === 'en') return stored;
  } catch {
    // ignore
  }
  const nav = (navigator.language || 'it').toLowerCase();
  return nav.startsWith('en') ? 'en' : 'it';
}

/** Risolve una chiave a punti ("home.title") nel dizionario. */
function resolve(dict: Dict, path: string): string | undefined {
  const parts = path.split('.');
  let node: unknown = dict;
  for (const p of parts) {
    if (node && typeof node === 'object' && p in (node as Record<string, unknown>)) {
      node = (node as Record<string, unknown>)[p];
    } else {
      return undefined;
    }
  }
  return typeof node === 'string' ? node : undefined;
}

interface I18nValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggleLang: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nCtx = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(getInitialLang);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, lang);
    } catch {
      // ignore
    }
    document.documentElement.setAttribute('lang', lang);
  }, [lang]);

  const setLang = useCallback((l: Lang) => setLangState(l), []);
  const toggleLang = useCallback(() => setLangState((l) => (l === 'it' ? 'en' : 'it')), []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const raw = resolve(DICTS[lang], key) ?? resolve(DICTS.it, key) ?? key;
      if (!vars) return raw;
      return raw.replace(/\{(\w+)\}/g, (_, name) => (vars[name] !== undefined ? String(vars[name]) : `{${name}}`));
    },
    [lang]
  );

  const value = useMemo<I18nValue>(() => ({ lang, setLang, toggleLang, t }), [lang, setLang, toggleLang, t]);
  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nCtx);
  if (!ctx) throw new Error('useI18n deve essere usato dentro <I18nProvider>.');
  return ctx;
}
