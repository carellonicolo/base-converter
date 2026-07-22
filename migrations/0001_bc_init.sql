-- Migrazione 0001 — Base Converter (converter.nicolocarello.it).
--
-- ⚠️ Queste tabelle vivono nel database D1 CONDIVISO `ccna1` (limite di 10 DB
-- del piano free). Tutte le tabelle di questa app sono prefissate `bc_` e non
-- toccano le tabelle di CCNA1 (quiz) né della Calcolatrice (`calc_`).
--
-- Applicare con:
--   npx wrangler d1 execute ccna1 --remote --file=migrations/0001_bc_init.sql

-- Progressi della palestra, uno per utente.
-- `data` è il JSON di Progress (xp, streak, byModule, badges).
CREATE TABLE IF NOT EXISTS bc_progress (
  user_id    TEXT PRIMARY KEY,
  email      TEXT NOT NULL,
  full_name  TEXT NOT NULL DEFAULT '',
  data       TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Configurazione delle verifiche per classe.
-- class = '*' è la configurazione PREDEFINITA per le classi senza riga propria.
-- `config` è il JSON ExamConfig (moduli, difficoltà, durata, n. domande, soglia).
CREATE TABLE IF NOT EXISTS bc_class_config (
  class      TEXT PRIMARY KEY,
  config     TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT NOT NULL DEFAULT ''
);

-- Tentativi di verifica. Il `seed` permette di rigenerare esattamente la
-- stessa prova per la revisione, senza salvare il testo delle domande.
CREATE TABLE IF NOT EXISTS bc_attempts (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL,
  email        TEXT NOT NULL,
  full_name    TEXT NOT NULL DEFAULT '',
  class        TEXT,
  seed         INTEGER NOT NULL,
  config       TEXT NOT NULL,
  answers      TEXT NOT NULL DEFAULT '[]',
  score        REAL,
  max_score    REAL,
  grade        REAL,
  correct_count INTEGER DEFAULT 0,
  total_count  INTEGER DEFAULT 0,
  away_events  INTEGER NOT NULL DEFAULT 0,
  away_ms      INTEGER NOT NULL DEFAULT 0,
  started_at   TEXT NOT NULL,
  submitted_at TEXT,
  last_seen_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_bc_attempts_user  ON bc_attempts(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_bc_attempts_class ON bc_attempts(class, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_bc_attempts_open  ON bc_attempts(submitted_at, last_seen_at DESC);

-- Impostazioni applicative (es. master-switch globale delle verifiche).
CREATE TABLE IF NOT EXISTS bc_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
