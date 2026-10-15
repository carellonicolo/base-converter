/**
 * Ogni chiave di traduzione citata dalla console e dalla pagina della
 * verifica esiste davvero, in italiano e in inglese. Una chiave mancante non
 * rompe nulla: `t` mostra la chiave stessa («admin.closeTitle») al docente,
 * ed è proprio per questo che va cercata qui e non scoperta in classe.
 */
import { describe, expect, it as test } from 'vitest';
import { it } from '../i18n/it';
import { en } from '../i18n/en';

// Il testo dei sorgenti, letto da Vite (nessuna dipendenza da Node nei tipi dell'app).
const sources = import.meta.glob(
  ['../components/admin/*.tsx', '../components/screens/AdminPage.tsx', '../components/screens/ExamPage.tsx', '../components/ui/ThSort.tsx', '../lib/exerciseText.ts'],
  { query: '?raw', import: 'default', eager: true }
) as Record<string, string>;

function resolve(dict: unknown, key: string): unknown {
  return key.split('.').reduce<unknown>((node, k) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[k] : undefined), dict);
}

/** Le chiavi composte a runtime (`admin.state_${…}`), espanse a mano. */
const DYNAMIC = [
  ...['open', 'expired', 'closed'].map((s) => `admin.state_${s}`),
  ...['consegnata', 'in_corso', 'annullata'].map((s) => `admin.attempt_${s}`),
  ...['volontaria', 'tempo', 'server'].map((s) => `admin.reason_${s}`),
  ...['alert', 'ammonizione', 'annulla'].flatMap((x) => ['ev_', 'evSent_', 'evTitle_', 'evHelp_', 'evSubmit_'].map((p) => `admin.${p}${x}`)),
  ...['assign', 'live', 'history', 'results', 'ranking', 'students', 'catalog'].map((x) => `admin.tab_${x}`),
  ...['ieeeExponent', 'asciiCode', 'asciiChar', 'utf8len', 'base64'].map((k) => `admin.cat.${k}`),
  ...['add', 'sub', 'mul'].map((o) => `admin.cat.op_${o}`),
];

const literal = new Set<string>();
for (const text of Object.values(sources)) {
  for (const m of text.matchAll(/['"`]((?:admin|exam|prog)\.[A-Za-z0-9_.]+)['"`]/g)) literal.add(m[1]);
}

describe('chiavi di traduzione della console', () => {
  test('ne trova abbastanza da essere un controllo vero', () => {
    expect(literal.size).toBeGreaterThan(150);
  });

  for (const key of [...literal, ...DYNAMIC]) {
    test(key, () => {
      expect(typeof resolve(it, key), `manca in it: ${key}`).toBe('string');
      expect(typeof resolve(en, key), `manca in en: ${key}`).toBe('string');
    });
  }
});
