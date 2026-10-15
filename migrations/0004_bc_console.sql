-- ═══════════════════════════════════════════════════════════════════════
-- Migrazione 0004 — Base Converter: la console docente nuova.
--
-- Tutte e sole AGGIUNTE di colonne, con un valore predefinito: il codice
-- di prima non le legge e continua a funzionare. Per questo l'ordine è il
-- contrario della 0002: si applica PRIMA del deploy, e il codice nuovo
-- trova le colonne già al loro posto.
--
--   npx wrangler d1 execute piattaforma --remote --file=migrations/0004_bc_console.sql
--
-- ─── bc_assignments: a chi e fino a quando ─────────────────────────────
--
-- Una verifica si assegna a una CLASSE (come prima) o a un SINGOLO
-- STUDENTE (recuperi, assenze lunghe), come in CCNA1. Per lo studente
-- `class` conserva la sua classe, così la console raggruppa anche le prove
-- individuali; chi può svolgerla lo decide `target_student`, non `class`.
--
-- La finestra è quella di VLSM: `open_until` è il termine per INIZIARE la
-- prova. Passato quel momento non la inizia più nessuno, e chi l'ha già
-- iniziata la porta a termine col suo tempo. NULL = aperta finché il
-- docente non la chiude, cioè il comportamento di prima: le righe già in
-- produzione restano come sono.
--
-- `reopened_at` ricorda l'ultima riapertura per il recupero. Riaprire
-- un'assegnazione non crea una prova nuova: chi ha già una prova per
-- quell'assegnazione (consegnata o annullata) non può iniziarne un'altra,
-- quindi la riapertura vale di fatto solo per gli assenti, e i risultati
-- del recupero restano nella stessa sessione dello Storico.

ALTER TABLE bc_assignments ADD COLUMN target_type TEXT NOT NULL DEFAULT 'class';  -- 'class' | 'student'
ALTER TABLE bc_assignments ADD COLUMN target_student TEXT;                        -- id IdP dello studente
ALTER TABLE bc_assignments ADD COLUMN target_student_name TEXT;                   -- il nome, per la console
ALTER TABLE bc_assignments ADD COLUMN open_until TEXT;                            -- termine per iniziare (ISO)
ALTER TABLE bc_assignments ADD COLUMN reopened_at TEXT;                           -- ultima riapertura per il recupero

CREATE INDEX IF NOT EXISTS idx_bc_assignments_student ON bc_assignments(target_student, status, created_at DESC);

-- ─── bc_attempts: le distrazioni una per una, e come si è chiusa ───────
--
-- `focus_events` è l'elenco delle uscite dalla pagina: [{at, ms}], quando e
-- per quanto. In `verifiche` restano i totali (distrazioni, distrazioni_ms,
-- uscite_schermo), scritti nella stessa transazione: il cruscotto comune
-- alle sei applicazioni legge quelli.
--
-- `motivo_consegna`: 'volontaria' (lo studente), 'tempo' (scadenza, dal
-- browser), 'server' (scaduta a browser chiuso: la consegna la fa il server
-- con le risposte salvate durante la prova).

ALTER TABLE bc_attempts ADD COLUMN focus_events TEXT NOT NULL DEFAULT '[]';
ALTER TABLE bc_attempts ADD COLUMN motivo_consegna TEXT;
