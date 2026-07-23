-- Migrazione 0002 — Base Converter: verifiche assegnate.
--
-- Sostituisce il modello "configurazione per classe + interruttore globale"
-- (0001) con: catalogo nel codice (shared/exam/catalog.ts) + assegnazione
-- esplicita di UNA verifica a UNA classe. Non esiste più la classe jolly '*':
-- una verifica si assegna a una classe per nome, mai a tutte.
--
-- ⚠️ ORDINE: applicare DOPO aver messo in produzione il codice nuovo.
-- Questa migrazione elimina bc_class_config, che il codice vecchio legge
-- ancora; eseguirla prima del deploy romperebbe la console per il tempo che
-- passa fra i due passaggi.
--
--   npx wrangler d1 execute ccna1 --remote --file=migrations/0002_bc_assignments.sql

-- Una verifica del catalogo assegnata a una classe.
-- Aperta = gli studenti di quella classe la vedono e possono svolgerla.
-- Per classe c'è al massimo UNA riga 'open': assegnarne una nuova chiude la
-- precedente (lo fa la Function, non un vincolo SQL, per poter avvisare).
CREATE TABLE IF NOT EXISTS bc_assignments (
  id           TEXT PRIMARY KEY,
  exam_id      TEXT NOT NULL,              -- id nel catalogo, es. 'binary-2'
  class        TEXT NOT NULL,              -- nome classe: MAI '*'
  status       TEXT NOT NULL DEFAULT 'open',  -- 'open' | 'closed'
  duration_min INTEGER,                    -- override facoltativo della durata
  created_by   TEXT NOT NULL DEFAULT '',   -- email del docente
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_bc_assignments_class ON bc_assignments(class, status, created_at DESC);

-- Il tentativo ricorda a quale assegnazione appartiene, così i risultati si
-- raggruppano per prova e si impedisce di rifare due volte la stessa.
ALTER TABLE bc_attempts ADD COLUMN assignment_id TEXT;
ALTER TABLE bc_attempts ADD COLUMN exam_id TEXT;
CREATE INDEX IF NOT EXISTS idx_bc_attempts_assignment ON bc_attempts(assignment_id, user_id);

-- Non più usata: la configurazione di una prova ora viene dal catalogo.
DROP TABLE IF EXISTS bc_class_config;

-- Non più usato: l'interruttore globale è stato tolto. Una verifica è attiva
-- perché è stata assegnata, e si ferma chiudendo l'assegnazione. Due comandi
-- quasi identici erano proprio ciò che faceva salvare prove disattivate.
DELETE FROM bc_settings WHERE key = 'exams_enabled';
