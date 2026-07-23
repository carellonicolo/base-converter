/**
 * Accesso alle tabelle `bc_*` nel database D1 condiviso `ccna1`.
 * Le tabelle sono prefissate `bc_` e non toccano quelle di CCNA1 o della
 * Calcolatrice (vedi migrations/0001_bc_init.sql).
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
            (SELECT COUNT(*) FROM bc_attempts t WHERE t.assignment_id = a.id) AS attempts,
            (SELECT COUNT(*) FROM bc_attempts t WHERE t.assignment_id = a.id AND t.submitted_at IS NOT NULL) AS submitted,
            (SELECT COUNT(*) FROM bc_attempts t WHERE t.assignment_id = a.id AND t.submitted_at IS NULL) AS live
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
    `SELECT DISTINCT class FROM bc_attempts WHERE class IS NOT NULL AND class <> ''
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

/** Tentativo aperto (non consegnato) dell'utente, se esiste. */
export async function findOpenAttempt(env: Env, userId: string): Promise<AttemptRow | null> {
  const row = await env.DB.prepare(
    `SELECT * FROM bc_attempts WHERE user_id = ? AND submitted_at IS NULL ORDER BY started_at DESC LIMIT 1`
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
    `SELECT * FROM bc_attempts WHERE user_id = ? AND assignment_id = ? ORDER BY started_at DESC LIMIT 1`
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
  await env.DB.prepare(
    `INSERT INTO bc_attempts (id, user_id, email, full_name, class, seed, config, answers, started_at, last_seen_at, total_count, assignment_id, exam_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, '[]', ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      identity.userId,
      identity.email,
      identity.name,
      cls,
      seed,
      JSON.stringify(config),
      now,
      now,
      config.questionCount,
      assignmentId,
      examId
    )
    .run();
}

export async function touchAttempt(env: Env, id: string, awayEvents: number, awayMs: number): Promise<void> {
  await env.DB.prepare(`UPDATE bc_attempts SET last_seen_at = ?, away_events = ?, away_ms = ? WHERE id = ?`)
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
  await env.DB.prepare(
    `UPDATE bc_attempts
     SET answers = ?, score = ?, max_score = ?, grade = ?, correct_count = ?, total_count = ?,
         away_events = ?, away_ms = ?, submitted_at = ?, last_seen_at = ?
     WHERE id = ?`
  )
    .bind(
      JSON.stringify(answers),
      score,
      maxScore,
      grade,
      correctCount,
      totalCount,
      awayEvents,
      awayMs,
      new Date().toISOString(),
      new Date().toISOString(),
      id
    )
    .run();
}

export async function listUserAttempts(env: Env, userId: string, limit = 20): Promise<AttemptRow[]> {
  const { results } = await env.DB.prepare(
    `SELECT * FROM bc_attempts WHERE user_id = ? AND submitted_at IS NOT NULL ORDER BY submitted_at DESC LIMIT ?`
  )
    .bind(userId, limit)
    .all<AttemptRow>();
  return results ?? [];
}

export async function listAllAttempts(env: Env, cls: string | null, limit = 500): Promise<AttemptRow[]> {
  const sql = cls
    ? `SELECT * FROM bc_attempts WHERE class = ? AND submitted_at IS NOT NULL ORDER BY submitted_at DESC LIMIT ?`
    : `SELECT * FROM bc_attempts WHERE submitted_at IS NOT NULL ORDER BY submitted_at DESC LIMIT ?`;
  const stmt = cls ? env.DB.prepare(sql).bind(cls, limit) : env.DB.prepare(sql).bind(limit);
  const { results } = await stmt.all<AttemptRow>();
  return results ?? [];
}

/** Tentativi ancora aperti e "visti" di recente: la vista "in diretta". */
export async function listLiveAttempts(env: Env, sinceMs = 3 * 60 * 1000): Promise<AttemptRow[]> {
  const since = new Date(Date.now() - sinceMs).toISOString();
  const { results } = await env.DB.prepare(
    `SELECT * FROM bc_attempts WHERE submitted_at IS NULL AND last_seen_at >= ? ORDER BY last_seen_at DESC LIMIT 200`
  )
    .bind(since)
    .all<AttemptRow>();
  return results ?? [];
}

