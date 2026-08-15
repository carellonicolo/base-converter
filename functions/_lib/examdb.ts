/**
 * Accesso ai dati della calcolatrice nel database `piattaforma`.
 *
 * Le tabelle proprie sono prefissate `bc_`. I TENTATIVI però non sono più
 * solo nostri: la spina dorsale di ogni prova — chi, quando, che stato,
 * che voto, quante distrazioni — vive nella tabella condivisa `verifiche`
 * (app = 'bc'), la stessa che usano CCNA1, VLSM, AFS, Turing e 80x86.
 * In `bc_attempts` resta ciò che è davvero della calcolatrice: seme,
 * configurazione, risposte, conteggi. Vedi migrations/0003_bc_verifiche.sql.
 *
 * Verso il resto dell'applicazione questo modulo continua a parlare la
 * lingua di prima: `AttemptRow` ha gli stessi campi di sempre, e nessun
 * altro file ha dovuto cambiare. La giunzione fra le due tabelle sta qui
 * dentro, e solo qui.
 */

import type { ExamConfig } from '../../shared/exam/config';
import type { Env, Identity } from './shared';

/* ---------------- Assegnazioni ---------------- */

export interface AssignmentRow {
  id: string;
  exam_id: string;
  class: string;
  status: string;
  duration_min: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AssignmentWithCounts extends AssignmentRow {
  attempts: number;
  submitted: number;
  live: number;
}

export async function listAssignments(env: Env): Promise<AssignmentWithCounts[]> {
  const { results } = await env.DB.prepare(
    `SELECT a.*,
            (SELECT COUNT(*) FROM verifiche v WHERE v.app = 'bc' AND v.assegnazione_id = a.id) AS attempts,
            (SELECT COUNT(*) FROM verifiche v WHERE v.app = 'bc' AND v.assegnazione_id = a.id AND v.stato = 'consegnata') AS submitted,
            (SELECT COUNT(*) FROM verifiche v WHERE v.app = 'bc' AND v.assegnazione_id = a.id AND v.stato = 'in_corso') AS live
     FROM bc_assignments a
     ORDER BY a.created_at DESC`
  ).all<AssignmentWithCounts>();
  return results ?? [];
}

/**
 * Assegna una verifica a una classe, chiudendo quella eventualmente già aperta
 * per la stessa classe. Ritorna quante ne ha chiuse, così la console può dirlo
 * invece di farlo di nascosto.
 */
export async function createAssignment(
  env: Env,
  id: string,
  examId: string,
  cls: string,
  durationMin: number | null,
  byEmail: string
): Promise<{ closed: number }> {
  const now = new Date().toISOString();
  const closed = await env.DB.prepare(
    `UPDATE bc_assignments SET status = 'closed', updated_at = ? WHERE class = ? AND status = 'open'`
  )
    .bind(now, cls)
    .run();
  await env.DB.prepare(
    `INSERT INTO bc_assignments (id, exam_id, class, status, duration_min, created_by, created_at, updated_at)
     VALUES (?, ?, ?, 'open', ?, ?, ?, ?)`
  )
    .bind(id, examId, cls, durationMin, byEmail, now, now)
    .run();
  return { closed: closed.meta?.changes ?? 0 };
}

export async function setAssignmentStatus(env: Env, id: string, status: 'open' | 'closed'): Promise<boolean> {
  // Riaprire richiede che la classe non abbia già un'altra prova aperta,
  // altrimenti lo studente si troverebbe davanti a due verifiche.
  if (status === 'open') {
    const row = await env.DB.prepare(`SELECT class FROM bc_assignments WHERE id = ?`).bind(id).first<{ class: string }>();
    if (!row) return false;
    await env.DB.prepare(
      `UPDATE bc_assignments SET status = 'closed', updated_at = ? WHERE class = ? AND status = 'open' AND id <> ?`
    )
      .bind(new Date().toISOString(), row.class, id)
      .run();
  }
  const res = await env.DB.prepare(`UPDATE bc_assignments SET status = ?, updated_at = ? WHERE id = ?`)
    .bind(status, new Date().toISOString(), id)
    .run();
  return (res.meta?.changes ?? 0) > 0;
}

/** L'assegnazione aperta per una delle classi dello studente (la più recente). */
export async function findOpenAssignment(env: Env, classes: string[]): Promise<AssignmentRow | null> {
  if (!classes.length) return null;
  const placeholders = classes.map(() => '?').join(',');
  const row = await env.DB.prepare(
    `SELECT * FROM bc_assignments WHERE status = 'open' AND class IN (${placeholders})
     ORDER BY created_at DESC LIMIT 1`
  )
    .bind(...classes)
    .first<AssignmentRow>();
  return row ?? null;
}

export async function getAssignment(env: Env, id: string): Promise<AssignmentRow | null> {
  const row = await env.DB.prepare(`SELECT * FROM bc_assignments WHERE id = ?`).bind(id).first<AssignmentRow>();
  return row ?? null;
}

/* ---------------- Progressi palestra ---------------- */

export interface ProgressRow {
  user_id: string;
  email: string;
  full_name: string;
  data: string;
  updated_at: string;
}

/** Tutti i progressi salvati (una riga per studente). Per la console docente. */
export async function listAllProgress(env: Env): Promise<ProgressRow[]> {
  const { results } = await env.DB.prepare(
    `SELECT user_id, email, full_name, data, updated_at FROM bc_progress ORDER BY updated_at DESC`
  ).all<ProgressRow>();
  return results ?? [];
}

/** Classi già viste nei tentativi: rete di sicurezza se l'SSO non risponde. */
export async function listKnownClasses(env: Env): Promise<string[]> {
  const { results } = await env.DB.prepare(
    `SELECT DISTINCT student_class AS class FROM verifiche
       WHERE app = 'bc' AND student_class IS NOT NULL AND student_class <> ''
     UNION SELECT DISTINCT class FROM bc_assignments WHERE class <> ''`
  ).all<{ class: string }>();
  return (results ?? []).map((r) => r.class).sort();
}

/* ---------------- Tentativi ---------------- */

export interface AttemptRow {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  class: string | null;
  seed: number;
  config: string;
  answers: string;
  score: number | null;
  max_score: number | null;
  grade: number | null;
  correct_count: number;
  total_count: number;
  away_events: number;
  away_ms: number;
  started_at: string;
  submitted_at: string | null;
  last_seen_at: string;
  assignment_id: string | null;
  exam_id: string | null;
}

/**
 * La giunzione fra le due tabelle, scritta una volta sola.
 *
 * `verifiche` porta la spina dorsale, `bc_attempts` il contenuto della
 * prova. Gli alias riportano i nomi storici perché il resto
 * dell'applicazione — e il JSON che manda al browser — parla ancora
 * quella lingua: cambiare qui il vocabolario avrebbe voluto dire toccare
 * sei file di API e la console del docente, senza guadagnarci nulla.
 */
const SELECT_TENTATIVO = `
  SELECT a.id,
         v.student_id      AS user_id,
         a.email,
         v.student_name    AS full_name,
         v.student_class   AS class,
         a.seed, a.config, a.answers,
         v.punteggio       AS score,
         v.punteggio_max   AS max_score,
         v.voto10          AS grade,
         a.correct_count, a.total_count,
         v.distrazioni     AS away_events,
         v.distrazioni_ms  AS away_ms,
         v.iniziata_il     AS started_at,
         v.consegnata_il   AS submitted_at,
         v.aggiornata_il   AS last_seen_at,
         v.assegnazione_id AS assignment_id,
         v.prova_id        AS exam_id
    FROM bc_attempts a
    JOIN verifiche v ON v.app = 'bc' AND v.id = a.id`;

/** Tentativo aperto (non consegnato) dell'utente, se esiste. */
export async function findOpenAttempt(env: Env, userId: string): Promise<AttemptRow | null> {
  const row = await env.DB.prepare(
    `${SELECT_TENTATIVO} WHERE v.student_id = ? AND v.stato = 'in_corso' ORDER BY v.iniziata_il DESC LIMIT 1`
  )
    .bind(userId)
    .first<AttemptRow>();
  return row ?? null;
}

/**
 * Tentativo dell'utente per QUESTA assegnazione, consegnato o no.
 * Serve a impedire di rifare due volte la stessa prova.
 */
export async function findAttemptForAssignment(env: Env, userId: string, assignmentId: string): Promise<AttemptRow | null> {
  const row = await env.DB.prepare(
    `${SELECT_TENTATIVO} WHERE v.student_id = ? AND v.assegnazione_id = ? ORDER BY v.iniziata_il DESC LIMIT 1`
  )
    .bind(userId, assignmentId)
    .first<AttemptRow>();
  return row ?? null;
}

export async function createAttempt(
  env: Env,
  id: string,
  identity: Identity,
  cls: string | null,
  seed: number,
  config: ExamConfig,
  assignmentId: string,
  examId: string
): Promise<void> {
  const now = new Date().toISOString();
  // Le due righe nascono insieme o non nascono: una prova senza la sua
  // riga in `verifiche` sarebbe invisibile a ogni lettura (la giunzione la
  // scarterebbe), e una riga in `verifiche` senza contenuto non si
  // potrebbe ricostruire. `batch` è transazionale in D1.
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO verifiche (app, id, categoria, assegnazione_id, prova_id, student_id, student_name, student_class,
                              stato, iniziata_il, aggiornata_il)
       VALUES ('bc', ?, 'verifica', ?, ?, ?, ?, ?, 'in_corso', ?, ?)`
    ).bind(id, assignmentId, examId, identity.userId, identity.name, cls, now, now),
    env.DB.prepare(
      `INSERT INTO bc_attempts (id, email, seed, config, answers, total_count)
       VALUES (?, ?, ?, ?, '[]', ?)`
    ).bind(id, identity.email, seed, JSON.stringify(config), config.questionCount),
  ]);
}

export async function touchAttempt(env: Env, id: string, awayEvents: number, awayMs: number): Promise<void> {
  await env.DB.prepare(
    `UPDATE verifiche SET aggiornata_il = ?, distrazioni = ?, distrazioni_ms = ? WHERE app = 'bc' AND id = ?`
  )
    .bind(new Date().toISOString(), awayEvents, awayMs, id)
    .run();
}

export async function finalizeAttempt(
  env: Env,
  id: string,
  answers: unknown,
  score: number,
  maxScore: number,
  grade: number,
  correctCount: number,
  totalCount: number,
  awayEvents: number,
  awayMs: number
): Promise<void> {
  const now = new Date().toISOString();
  // `voto_auto` conserva quello che ha calcolato la macchina: se un giorno
  // il docente correggerà a mano, `voto10` cambierà e resterà la traccia
  // di quale dei due numeri è suo.
  await env.DB.batch([
    env.DB.prepare(
      `UPDATE verifiche
          SET stato = 'consegnata', consegnata_il = ?, aggiornata_il = ?,
              punteggio = ?, punteggio_max = ?, voto10 = ?, voto_auto = ?,
              distrazioni = ?, distrazioni_ms = ?
        WHERE app = 'bc' AND id = ?`
    ).bind(now, now, score, maxScore, grade, grade, awayEvents, awayMs, id),
    env.DB.prepare(
      `UPDATE bc_attempts SET answers = ?, correct_count = ?, total_count = ? WHERE id = ?`
    ).bind(JSON.stringify(answers), correctCount, totalCount, id),
  ]);
}

export async function listUserAttempts(env: Env, userId: string, limit = 20): Promise<AttemptRow[]> {
  const { results } = await env.DB.prepare(
    `${SELECT_TENTATIVO} WHERE v.student_id = ? AND v.stato = 'consegnata' ORDER BY v.consegnata_il DESC LIMIT ?`
  )
    .bind(userId, limit)
    .all<AttemptRow>();
  return results ?? [];
}

export async function listAllAttempts(env: Env, cls: string | null, limit = 500): Promise<AttemptRow[]> {
  const sql = cls
    ? `${SELECT_TENTATIVO} WHERE v.student_class = ? AND v.stato = 'consegnata' ORDER BY v.consegnata_il DESC LIMIT ?`
    : `${SELECT_TENTATIVO} WHERE v.stato = 'consegnata' ORDER BY v.consegnata_il DESC LIMIT ?`;
  const stmt = cls ? env.DB.prepare(sql).bind(cls, limit) : env.DB.prepare(sql).bind(limit);
  const { results } = await stmt.all<AttemptRow>();
  return results ?? [];
}

/** Tentativi ancora aperti e "visti" di recente: la vista "in diretta". */
export async function listLiveAttempts(env: Env, sinceMs = 3 * 60 * 1000): Promise<AttemptRow[]> {
  const since = new Date(Date.now() - sinceMs).toISOString();
  const { results } = await env.DB.prepare(
    `${SELECT_TENTATIVO} WHERE v.stato = 'in_corso' AND v.aggiornata_il >= ? ORDER BY v.aggiornata_il DESC LIMIT 200`
  )
    .bind(since)
    .all<AttemptRow>();
  return results ?? [];
}

