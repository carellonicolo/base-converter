-- ═══════════════════════════════════════════════════════════════════════
-- bc_attempts passa alla tabella condivisa `verifiche`
--
-- La spina dorsale della prova — chi, quando, che stato, che voto, quante
-- distrazioni — non sta più qui: sta in `verifiche` con app = 'bc' e lo
-- stesso `id`. Qui resta solo ciò che è davvero della calcolatrice: il
-- seme del generatore, la configurazione, le risposte e i conteggi.
--
-- Le colonne non sono state duplicate: sono state SPOSTATE. Una prova ha
-- una riga in `verifiche` e una in `bc_attempts`, e le due si leggono
-- sempre insieme (vedi _lib/examdb.ts, costante SELECT_TENTATIVO).
--
-- La tabella è vuota in produzione (0 righe al 15/08/2026): si ricrea,
-- non si migra.
-- ═══════════════════════════════════════════════════════════════════════

DROP TABLE IF EXISTS bc_attempts;

CREATE TABLE bc_attempts (
  id      TEXT PRIMARY KEY,     -- = verifiche.id, con verifiche.app = 'bc'
  email   TEXT NOT NULL DEFAULT '',
  seed    INTEGER NOT NULL,     -- semina il generatore: senza, la prova non si ricostruisce
  config  TEXT NOT NULL,        -- ExamConfig serializzata al momento dell'avvio
  answers TEXT NOT NULL DEFAULT '[]',
  correct_count INTEGER NOT NULL DEFAULT 0,
  total_count   INTEGER NOT NULL DEFAULT 0
);
