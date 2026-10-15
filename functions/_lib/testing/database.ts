/**
 * Un database di prova per i test delle Functions: SQLite vero, con lo schema
 * di produzione (lo stesso adattatore di VLSM).
 *
 * D1 è SQLite: qui un adattatore minimo (prepare/bind/first/all/run, e batch
 * in transazione come D1) fa girare il codice delle Functions così com'è.
 * Non prova la rete né i limiti di D1, prova quello che si sbaglia davvero —
 * le query, l'ordine degli statement nei batch, le condizioni che proteggono
 * due scritture concorrenti.
 *
 * Solo per i test: `node:sqlite` non esiste nel runtime delle Functions, e
 * questa cartella è esclusa dal loro typecheck.
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import type { DatabaseSync as TipoDatabaseSync } from 'node:sqlite';

// Vitest 2 non conosce `node:sqlite` fra i moduli di Node e non sa risolverlo
// da import: lo si carica a runtime, fuori dal suo bundler.
const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite') as { DatabaseSync: typeof TipoDatabaseSync };
export type DatabaseSync = TipoDatabaseSync;

type Valore = string | number | null;

function fakeD1(sqlite: DatabaseSync): D1Database {
  const statement = (sql: string, params: Valore[] = []) => ({
    bind: (...p: Valore[]) => statement(sql, p.map((v) => (v === undefined ? null : v))),
    first: async <T>() => (sqlite.prepare(sql).get(...params) as T | undefined) ?? null,
    all: async <T>() => ({ results: sqlite.prepare(sql).all(...params) as T[] }),
    run: async () => {
      const r = sqlite.prepare(sql).run(...params);
      return { meta: { changes: Number(r.changes) } };
    },
    runSync: () => {
      const r = sqlite.prepare(sql).run(...params);
      return { meta: { changes: Number(r.changes) } };
    },
  });
  return {
    prepare: (sql: string) => statement(sql),
    batch: async (stmts: ReturnType<typeof statement>[]) => {
      sqlite.exec('BEGIN');
      try {
        const out = stmts.map((s) => s.runSync());
        sqlite.exec('COMMIT');
        return out;
      } catch (e) {
        sqlite.exec('ROLLBACK');
        throw e;
      }
    },
  } as unknown as D1Database;
}

/** Le tabelle condivise della piattaforma, come sono in produzione. */
const SCHEMA_CONDIVISO = `
CREATE TABLE verifiche (
  app TEXT NOT NULL, id TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'verifica' CHECK (categoria IN ('verifica', 'esercitazione')),
  assegnazione_id TEXT, prova_id TEXT NOT NULL, titolo TEXT,
  student_id TEXT NOT NULL, student_name TEXT NOT NULL DEFAULT '', student_class TEXT,
  stato TEXT NOT NULL DEFAULT 'in_corso' CHECK (stato IN ('in_corso', 'consegnata', 'annullata')),
  annullata_motivo TEXT, iniziata_il TEXT NOT NULL, scadenza_il TEXT, consegnata_il TEXT,
  aggiornata_il TEXT NOT NULL DEFAULT '', punteggio REAL, punteggio_max REAL, voto10 REAL, voto_auto REAL,
  esito TEXT, feedback TEXT, corretta_il TEXT, corretto_da TEXT,
  distrazioni INTEGER NOT NULL DEFAULT 0, distrazioni_ms INTEGER NOT NULL DEFAULT 0, uscite_schermo INTEGER NOT NULL DEFAULT 0,
  client_ip TEXT, client_user_agent TEXT, PRIMARY KEY (app, id)
);
CREATE TABLE attempt_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT, app TEXT NOT NULL, attempt_id TEXT NOT NULL, student_id TEXT,
  type TEXT NOT NULL, message TEXT, created_at TEXT NOT NULL, created_by_ip TEXT
);`;

/** Le migrazioni da applicare dopo SCHEMA.sql, nell'ordine in cui vanno in produzione. */
const MIGRAZIONI = ['0004_bc_console.sql'];

export function databaseDiProva(): { sqlite: DatabaseSync; db: D1Database } {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(SCHEMA_CONDIVISO);
  // SCHEMA.sql è la fotografia di produzione prima della 0004.
  sqlite.exec(readFileSync(new URL('../../../migrations/SCHEMA.sql', import.meta.url), 'utf8'));
  for (const m of MIGRAZIONI) {
    sqlite.exec(readFileSync(new URL(`../../../migrations/${m}`, import.meta.url), 'utf8'));
  }
  return { sqlite, db: fakeD1(sqlite) };
}
