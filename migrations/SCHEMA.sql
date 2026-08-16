-- ═══════════════════════════════════════════════════════════════════
-- SCHEMA DI PRODUZIONE — database D1 `piattaforma`
-- Fotografia presa il 2026-08-17 da sqlite_master.
--
-- ⚠️  NON E' UNA MIGRAZIONE. Non eseguirlo in sequenza con i file
--     numerati di questa cartella: qui dentro c'e' gia' il risultato
--     di tutti quanti. Serve a ricostruire il database da zero se
--     andasse perso, e a leggere lo schema vero senza interrogare
--     la produzione.
--
-- Perche' esiste: un file in migrations/ dice cosa qualcuno ha scritto,
-- non cosa il database contiene. Il 16/08/2026 due migrazioni di
-- Documental hub risultavano presenti nel repo da mesi e non erano mai
-- state applicate, mentre il codice interrogava quelle tabelle. Questo
-- file viene da sqlite_master: e' la seconda meta' del confronto.
--
-- Come rigenerarlo:
--   npx wrangler d1 execute piattaforma --remote \
--     --command "SELECT sql FROM sqlite_master WHERE sql IS NOT NULL;"
--
-- Come applicarlo a un database vuoto:
--   npx wrangler d1 execute piattaforma --remote --file=migrations/SCHEMA.sql
-- ═══════════════════════════════════════════════════════════════════

-- 3 tabelle, 1 indici.

-- ───────────────────────────── TABELLE ─────────────────────────────

CREATE TABLE bc_assignments (
  id           TEXT PRIMARY KEY,
  exam_id      TEXT NOT NULL,              -- id nel catalogo, es. 'binary-2'
  class        TEXT NOT NULL,              -- nome classe: MAI '*'
  status       TEXT NOT NULL DEFAULT 'open',  -- 'open' | 'closed'
  duration_min INTEGER,                    -- override facoltativo della durata
  created_by   TEXT NOT NULL DEFAULT '',   -- email del docente
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);

CREATE TABLE bc_attempts (
  id      TEXT PRIMARY KEY,     -- = verifiche.id, con verifiche.app = 'bc'
  email   TEXT NOT NULL DEFAULT '',
  seed    INTEGER NOT NULL,     -- semina il generatore: senza, la prova non si ricostruisce
  config  TEXT NOT NULL,        -- ExamConfig serializzata al momento dell'avvio
  answers TEXT NOT NULL DEFAULT '[]',
  correct_count INTEGER NOT NULL DEFAULT 0,
  total_count   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE bc_progress (
  user_id    TEXT PRIMARY KEY,
  email      TEXT NOT NULL,
  full_name  TEXT NOT NULL DEFAULT '',
  data       TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- ───────────────────────────── INDICI ─────────────────────────────

CREATE INDEX idx_bc_assignments_class ON bc_assignments(class, status, created_at DESC);
