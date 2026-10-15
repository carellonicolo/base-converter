/**
 * Accesso ai dati della calcolatrice nel database `piattaforma`.
 *
 * Le tabelle proprie sono prefissate `bc_`. I TENTATIVI però non sono più
 * solo nostri: la spina dorsale di ogni prova — chi, quando, che stato,
 * che voto, quante distrazioni — vive nella tabella condivisa `verifiche`
 * (app = 'bc'), la stessa che usano CCNA1, VLSM, AFS, Turing e 80x86.
 * In `bc_attempts` resta ciò che è davvero della calcolatrice: seme,
 * configurazione, risposte, uscite dalla pagina. Vedi
 * migrations/0003_bc_verifiche.sql e 0004_bc_console.sql.
 *
 * Gli interventi del docente (avviso, ammonizione, interruzione) stanno
 * nella tabella condivisa `attempt_events`, come in VLSM e CCNA1.
 *
 * Verso il resto dell'applicazione questo modulo parla la lingua storica:
 * `AttemptRow` ha i nomi di sempre. La giunzione fra le tabelle sta qui
 * dentro, e solo qui.
 */

import { gradeExam, parseConfig, type ExamConfig, type ExamOutcome } from '../../shared/exam/config';
import {
  attemptDeadlineMs,
  isAbandoned,
  parseFocusEvents,
  type AttemptStateForPick,
  type FocusEvent,
  type TargetType,
} from '../../shared/exam/assignments';
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
  target_type: TargetType;
  target_student: string | null;
  target_student_name: string | null;
  open_until: string | null;
  reopened_at: string | null;
}

export interface AssignmentWithCounts extends AssignmentRow {
  attempts: number;
  submitted: number;
  live: number;
  annulled: number;
}

export async function listAssignments(env: Env): Promise<AssignmentWithCounts[]> {
  const { results } = await env.DB.prepare(
    `SELECT a.*,
            (SELECT COUNT(*) FROM verifiche v WHERE v.app = 'bc' AND v.assegnazione_id = a.id) AS attempts,
            (SELECT COUNT(*) FROM verifiche v WHERE v.app = 'bc' AND v.assegnazione_id = a.id AND v.stato = 'consegnata') AS submitted,
            (SELECT COUNT(*) FROM verifiche v WHERE v.app = 'bc' AND v.assegnazione_id = a.id AND v.stato = 'in_corso') AS live,
            (SELECT COUNT(*) FROM verifiche v WHERE v.app = 'bc' AND v.assegnazione_id = a.id AND v.stato = 'annullata') AS annulled
     FROM bc_assignments a
     ORDER BY a.created_at DESC`
  ).all<AssignmentWithCounts>();
  return results ?? [];
}

/** I voti consegnati di ogni assegnazione, per media e sufficienze dello Storico. */
export async function listSubmittedGrades(env: Env): Promise<{ assignment_id: string; grade: number | null }[]> {
  const { results } = await env.DB.prepare(
    `SELECT assegnazione_id AS assignment_id, voto10 AS grade FROM verifiche
      WHERE app = 'bc' AND stato = 'consegnata' AND assegnazione_id IS NOT NULL`
  ).all<{ assignment_id: string; grade: number | null }>();
  return results ?? [];
}

export interface NewAssignment {
  id: string;
  examId: string;
  targetType: TargetType;
  /** Per la classe: la classe. Per lo studente: la sua classe (anche ''). */
  cls: string;
  studentId: string | null;
  studentName: string | null;
  durationMin: number | null;
  openUntil: string | null;
  byEmail: string;
}

/**
 * La condizione «stesso destinatario»: una classe ha al massimo una verifica
 * di classe aperta, uno studente al massimo una individuale. Le due non si
 * escludono: un recupero individuale può stare aperto mentre la classe ne
 * svolge un'altra.
 */
function sameTargetSql(a: { target_type: TargetType; class: string; target_student: string | null }): { sql: string; bind: string } {
  return a.target_type === 'student'
    ? { sql: `target_type = 'student' AND target_student = ?`, bind: a.target_student ?? '' }
    : { sql: `target_type = 'class' AND class = ?`, bind: a.class };
}

/**
 * Assegna una verifica, chiudendo quella eventualmente già aperta per lo
 * stesso destinatario. Ritorna quante ne ha chiuse, così la console può
 * dirlo invece di farlo di nascosto.
 */
export async function createAssignment(env: Env, n: NewAssignment): Promise<{ closed: number }> {
  const now = new Date().toISOString();
  const same = sameTargetSql({ target_type: n.targetType, class: n.cls, target_student: n.studentId });
  const [closed] = await env.DB.batch([
    env.DB.prepare(`UPDATE bc_assignments SET status = 'closed', updated_at = ? WHERE status = 'open' AND ${same.sql}`).bind(now, same.bind),
    env.DB.prepare(
      `INSERT INTO bc_assignments (id, exam_id, class, status, duration_min, created_by, created_at, updated_at,
                                   target_type, target_student, target_student_name, open_until)
       VALUES (?, ?, ?, 'open', ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(n.id, n.examId, n.cls, n.durationMin, n.byEmail, now, now, n.targetType, n.studentId, n.studentName, n.openUntil),
  ]);
  return { closed: closed.meta?.changes ?? 0 };
}

export async function closeAssignment(env: Env, id: string): Promise<void> {
  await env.DB.prepare(`UPDATE bc_assignments SET status = 'closed', updated_at = ? WHERE id = ?`)
    .bind(new Date().toISOString(), id)
    .run();
}

/**
 * Riapre un'assegnazione con una nuova finestra: è il RECUPERO. Chi ha già
 * una prova per questa assegnazione non può iniziarne un'altra (lo impedisce
 * /api/exam/start), quindi la riapertura vale per chi non l'ha svolta.
 * Chiude le altre aperte per lo stesso destinatario: lo studente non deve
 * trovarsi davanti a due verifiche di classe.
 */
export async function reopenAssignment(env: Env, a: AssignmentRow, openUntil: string | null): Promise<{ closed: number }> {
  const now = new Date().toISOString();
  const same = sameTargetSql(a);
  const [closed] = await env.DB.batch([
    env.DB.prepare(`UPDATE bc_assignments SET status = 'closed', updated_at = ? WHERE status = 'open' AND id <> ? AND ${same.sql}`).bind(
      now,
      a.id,
      same.bind
    ),
    env.DB.prepare(`UPDATE bc_assignments SET status = 'open', open_until = ?, reopened_at = ?, updated_at = ? WHERE id = ?`).bind(
      openUntil,
      now,
      now,
      a.id
    ),
  ]);
  return { closed: closed.meta?.changes ?? 0 };
}

export async function setAssignmentWindow(env: Env, id: string, openUntil: string | null): Promise<void> {
  await env.DB.prepare(`UPDATE bc_assignments SET open_until = ?, updated_at = ? WHERE id = ?`)
    .bind(openUntil, new Date().toISOString(), id)
    .run();
}

/** I soli destinatari di tutte le assegnazioni: bastano a decidere quali sono di un docente. */
export async function listAssignmentTargets(env: Env): Promise<Pick<AssignmentRow, 'id' | 'target_type' | 'class' | 'target_student'>[]> {
  const { results } = await env.DB.prepare(`SELECT id, target_type, class, target_student FROM bc_assignments`).all<
    Pick<AssignmentRow, 'id' | 'target_type' | 'class' | 'target_student'>
  >();
  return results ?? [];
}

export async function getAssignment(env: Env, id: string): Promise<AssignmentRow | null> {
  const row = await env.DB.prepare(`SELECT * FROM bc_assignments WHERE id = ?`).bind(id).first<AssignmentRow>();
  return row ?? null;
}

/**
 * Le assegnazioni APERTE nel DB che riguardano uno studente: quelle delle
 * sue classi e quelle a lui personalmente. La finestra la valuta
 * `pickAssignment` (shared/exam/assignments.ts), con lo stesso orologio.
 */
export async function listOpenAssignmentsFor(env: Env, userId: string, classes: string[]): Promise<AssignmentRow[]> {
  const byClass = classes.length ? `(target_type = 'class' AND class IN (${classes.map(() => '?').join(',')})) OR ` : '';
  const { results } = await env.DB.prepare(
    `SELECT * FROM bc_assignments
      WHERE status = 'open' AND (${byClass}(target_type = 'student' AND target_student = ?))
      ORDER BY created_at DESC LIMIT 20`
  )
    .bind(...classes, userId)
    .all<AssignmentRow>();
  return results ?? [];
}

/** Lo stato delle prove dello studente per le assegnazioni date. */
export async function attemptStatesFor(env: Env, userId: string, assignmentIds: string[]): Promise<Map<string, AttemptStateForPick>> {
  const out = new Map<string, AttemptStateForPick>();
  if (!assignmentIds.length) return out;
  const { results } = await env.DB.prepare(
    `SELECT assegnazione_id AS assignment_id, stato FROM verifiche
      WHERE app = 'bc' AND student_id = ? AND assegnazione_id IN (${assignmentIds.map(() => '?').join(',')})
      ORDER BY iniziata_il DESC`
  )
    .bind(userId, ...assignmentIds)
    .all<{ assignment_id: string; stato: AttemptStateForPick }>();
  for (const r of results ?? []) if (!out.has(r.assignment_id)) out.set(r.assignment_id, r.stato);
  return out;
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

export async function getProgress(env: Env, userId: string): Promise<ProgressRow | null> {
  const row = await env.DB.prepare(`SELECT user_id, email, full_name, data, updated_at FROM bc_progress WHERE user_id = ?`)
    .bind(userId)
    .first<ProgressRow>();
  return row ?? null;
}

/** Classi già viste nei tentativi: rete di sicurezza se l'SSO non risponde. */
export async function listKnownClasses(env: Env): Promise<string[]> {
  const { results } = await env.DB.prepare(
    `SELECT DISTINCT student_class AS class FROM verifiche
       WHERE app = 'bc' AND student_class IS NOT NULL AND student_class <> ''
     UNION SELECT DISTINCT class FROM bc_assignments WHERE class <> ''`
  ).all<{ class: string }>();
  return (results ?? []).map((r) => r.class).sort((a, b) => a.localeCompare(b, 'it', { numeric: true }));
}

/* ---------------- Tentativi ---------------- */

export type AttemptState = 'in_corso' | 'consegnata' | 'annullata';

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
  fullscreen_exits: number;
  focus_events: string;
  started_at: string;
  deadline_at: string | null;
  submitted_at: string | null;
  last_seen_at: string;
  assignment_id: string | null;
  exam_id: string | null;
  state: AttemptState;
  annulled_reason: string | null;
  submit_reason: string | null;
  warnings: number;
}

/**
 * La giunzione fra le due tabelle, scritta una volta sola.
 *
 * `verifiche` porta la spina dorsale, `bc_attempts` il contenuto della
 * prova, `attempt_events` le ammonizioni (contate qui). Gli alias riportano
 * i nomi storici perché il resto dell'applicazione — e il JSON che manda
 * al browser — parla ancora quella lingua.
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
         v.uscite_schermo  AS fullscreen_exits,
         a.focus_events,
         v.iniziata_il     AS started_at,
         v.scadenza_il     AS deadline_at,
         v.consegnata_il   AS submitted_at,
         v.aggiornata_il   AS last_seen_at,
         v.assegnazione_id AS assignment_id,
         v.prova_id        AS exam_id,
         v.stato           AS state,
         v.annullata_motivo AS annulled_reason,
         a.motivo_consegna AS submit_reason,
         (SELECT COUNT(*) FROM attempt_events e
           WHERE e.app = 'bc' AND e.attempt_id = a.id AND e.type = 'ammonizione') AS warnings
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

/** L'ultima prova dell'utente, in qualunque stato: serve al canale degli interventi. */
export async function findLatestAttempt(env: Env, userId: string, sinceIso: string): Promise<AttemptRow | null> {
  const row = await env.DB.prepare(
    `${SELECT_TENTATIVO} WHERE v.student_id = ? AND v.iniziata_il >= ? ORDER BY v.iniziata_il DESC LIMIT 1`
  )
    .bind(userId, sinceIso)
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

export async function getAttempt(env: Env, id: string): Promise<AttemptRow | null> {
  const row = await env.DB.prepare(`${SELECT_TENTATIVO} WHERE a.id = ?`).bind(id).first<AttemptRow>();
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
): Promise<{ startedAt: string; deadline: string }> {
  const nowMs = Date.now();
  const now = new Date(nowMs).toISOString();
  const deadline = new Date(nowMs + config.durationMin * 60_000).toISOString();
  // Le due righe nascono insieme o non nascono: una prova senza la sua
  // riga in `verifiche` sarebbe invisibile a ogni lettura (la giunzione la
  // scarterebbe), e una riga in `verifiche` senza contenuto non si
  // potrebbe ricostruire. `batch` è transazionale in D1.
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO verifiche (app, id, categoria, assegnazione_id, prova_id, student_id, student_name, student_class,
                              stato, iniziata_il, scadenza_il, aggiornata_il)
       VALUES ('bc', ?, 'verifica', ?, ?, ?, ?, ?, 'in_corso', ?, ?, ?)`
    ).bind(id, assignmentId, examId, identity.userId, identity.name, cls, now, deadline, now),
    env.DB.prepare(
      `INSERT INTO bc_attempts (id, email, seed, config, answers, total_count)
       VALUES (?, ?, ?, ?, '[]', ?)`
    ).bind(id, identity.email, seed, JSON.stringify(config), config.questionCount),
  ]);
  return { startedAt: now, deadline };
}

export interface LiveTelemetry {
  answers?: string[];
  focusEvents?: FocusEvent[];
  awayEvents: number;
  awayMs: number;
  fullscreenExits: number;
}

/**
 * Il segnale periodico della prova: risposte date finora, uscite dalla
 * pagina e dallo schermo intero. Solo su una prova ancora in corso: una
 * prova annullata o consegnata non si riscrive.
 */
export async function saveAttemptProgress(env: Env, id: string, t: LiveTelemetry): Promise<boolean> {
  const now = new Date().toISOString();
  const stmts = [];
  // Prima il contenuto, condizionato allo stato: nella stessa transazione
  // della riga in `verifiche`, che poi lo stesso stato lo verifica di nuovo.
  if (t.answers || t.focusEvents) {
    stmts.push(
      env.DB.prepare(
        `UPDATE bc_attempts
            SET answers = COALESCE(?, answers), focus_events = COALESCE(?, focus_events)
          WHERE id = ? AND EXISTS (SELECT 1 FROM verifiche WHERE app = 'bc' AND id = ? AND stato = 'in_corso')`
      ).bind(t.answers ? JSON.stringify(t.answers) : null, t.focusEvents ? JSON.stringify(t.focusEvents) : null, id, id)
    );
  }
  stmts.push(
    env.DB.prepare(
      `UPDATE verifiche SET aggiornata_il = ?, distrazioni = ?, distrazioni_ms = ?, uscite_schermo = ?
        WHERE app = 'bc' AND id = ? AND stato = 'in_corso'`
    ).bind(now, t.awayEvents, t.awayMs, t.fullscreenExits, id)
  );
  const res = await env.DB.batch(stmts);
  return (res[res.length - 1].meta?.changes ?? 0) > 0;
}

export type SubmitReason = 'volontaria' | 'tempo' | 'server';

export interface Finalization {
  answers: string[];
  outcome: ExamOutcome;
  awayEvents: number;
  awayMs: number;
  fullscreenExits: number;
  focusEvents: FocusEvent[];
  reason: SubmitReason;
}

/**
 * Chiude e corregge una prova. Ritorna false se nel frattempo la prova non
 * era più in corso (annullata dal docente, consegnata da un'altra
 * richiesta): in quel caso non scrive nulla.
 */
export async function finalizeAttempt(env: Env, id: string, f: Finalization): Promise<boolean> {
  const now = new Date().toISOString();
  const o = f.outcome;
  // `voto_auto` conserva quello che ha calcolato la macchina: se un giorno
  // il docente correggerà a mano, `voto10` cambierà e resterà la traccia
  // di quale dei due numeri è suo.
  const [, verifica] = await env.DB.batch([
    env.DB.prepare(
      `UPDATE bc_attempts SET answers = ?, correct_count = ?, total_count = ?, focus_events = ?, motivo_consegna = ?
        WHERE id = ? AND EXISTS (SELECT 1 FROM verifiche WHERE app = 'bc' AND id = ? AND stato = 'in_corso')`
    ).bind(JSON.stringify(f.answers), o.correctCount, o.totalCount, JSON.stringify(f.focusEvents), f.reason, id, id),
    env.DB.prepare(
      `UPDATE verifiche
          SET stato = 'consegnata', consegnata_il = ?, aggiornata_il = ?,
              punteggio = ?, punteggio_max = ?, voto10 = ?, voto_auto = ?,
              distrazioni = ?, distrazioni_ms = ?, uscite_schermo = ?
        WHERE app = 'bc' AND id = ? AND stato = 'in_corso'`
    ).bind(now, now, o.score, o.maxScore, o.grade, o.grade, f.awayEvents, f.awayMs, f.fullscreenExits, id),
  ]);
  return (verifica.meta?.changes ?? 0) > 0;
}

/** Interrompe una prova in corso (intervento del docente). */
export async function annulAttempt(env: Env, id: string, reason: string): Promise<boolean> {
  const res = await env.DB.prepare(
    `UPDATE verifiche SET stato = 'annullata', annullata_motivo = ?, aggiornata_il = ?
      WHERE app = 'bc' AND id = ? AND stato = 'in_corso'`
  )
    .bind(reason, new Date().toISOString(), id)
    .run();
  return (res.meta?.changes ?? 0) > 0;
}

/**
 * Elimina una prova e tutto ciò che la riguarda. Serve a lasciarla rifare:
 * finché esiste una prova per l'assegnazione, lo studente non ne inizia
 * un'altra.
 */
export async function deleteAttempt(env: Env, id: string): Promise<void> {
  await env.DB.batch([
    env.DB.prepare(`DELETE FROM attempt_events WHERE app = 'bc' AND attempt_id = ?`).bind(id),
    env.DB.prepare(`DELETE FROM bc_attempts WHERE id = ?`).bind(id),
    env.DB.prepare(`DELETE FROM verifiche WHERE app = 'bc' AND id = ?`).bind(id),
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

export interface AttemptFilter {
  cls?: string | null;
  studentId?: string | null;
  assignmentId?: string | null;
  /** Stati da includere; di norma solo le consegnate. */
  states?: AttemptState[];
  /**
   * Il perimetro del docente (_lib/perimeter.ts): solo le prove di questi
   * studenti o di queste assegnazioni. Assente = nessun limite.
   */
  scope?: { studentIds: string[]; assignmentIds: string[] } | null;
  limit?: number;
}

/** La condizione SQL del perimetro, con i suoi parametri. */
function scopeSql(scope: AttemptFilter['scope']): { sql: string; bind: string[] } | null {
  if (!scope) return null;
  return {
    sql: `(v.student_id IN (SELECT value FROM json_each(?)) OR v.assegnazione_id IN (SELECT value FROM json_each(?)))`,
    bind: [JSON.stringify(scope.studentIds), JSON.stringify(scope.assignmentIds)],
  };
}

export async function listAttempts(env: Env, f: AttemptFilter = {}): Promise<AttemptRow[]> {
  const where: string[] = [];
  const bind: (string | number)[] = [];
  const states = f.states?.length ? f.states : (['consegnata'] as AttemptState[]);
  where.push(`v.stato IN (${states.map(() => '?').join(',')})`);
  bind.push(...states);
  if (f.cls) {
    where.push('v.student_class = ?');
    bind.push(f.cls);
  }
  if (f.studentId) {
    where.push('v.student_id = ?');
    bind.push(f.studentId);
  }
  if (f.assignmentId) {
    where.push('v.assegnazione_id = ?');
    bind.push(f.assignmentId);
  }
  const scope = scopeSql(f.scope);
  if (scope) {
    where.push(scope.sql);
    bind.push(...scope.bind);
  }
  bind.push(f.limit ?? 500);
  const { results } = await env.DB.prepare(
    `${SELECT_TENTATIVO} WHERE ${where.join(' AND ')} ORDER BY COALESCE(v.consegnata_il, v.iniziata_il) DESC LIMIT ?`
  )
    .bind(...bind)
    .all<AttemptRow>();
  return results ?? [];
}

/** Compatibilità: le consegnate, eventualmente di una classe. */
export async function listAllAttempts(env: Env, cls: string | null, limit = 500): Promise<AttemptRow[]> {
  return listAttempts(env, { cls, limit });
}

/** Le prove in corso: la vista «Sessioni live». `scope` = il perimetro del docente. */
export async function listInProgress(env: Env, scope?: AttemptFilter['scope']): Promise<AttemptRow[]> {
  const sc = scopeSql(scope);
  const { results } = await env.DB.prepare(
    `${SELECT_TENTATIVO} WHERE v.stato = 'in_corso'${sc ? ` AND ${sc.sql}` : ''} ORDER BY v.iniziata_il DESC LIMIT 300`
  )
    .bind(...(sc?.bind ?? []))
    .all<AttemptRow>();
  return results ?? [];
}

/** Le risposte salvate di una prova, ripulite. */
export function savedAnswers(raw: string, count: number): string[] {
  let arr: unknown = [];
  try {
    arr = JSON.parse(raw);
  } catch {
    arr = [];
  }
  const list = Array.isArray(arr) ? arr : [];
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const v = list[i];
    out.push(v == null ? '' : String(v).slice(0, 200));
  }
  return out;
}

/** La correzione di una prova, con le risposte salvate (consegnate o in corso). */
export function outcomeOf(row: AttemptRow): { config: ExamConfig; answers: string[]; outcome: ExamOutcome } {
  const config = parseConfig(JSON.parse(row.config));
  const answers = savedAnswers(row.answers, config.questionCount);
  return { config, answers, outcome: gradeExam(config, row.seed, answers) };
}

export function deadlineOf(row: AttemptRow): number {
  let durationMin = 30;
  try {
    durationMin = parseConfig(JSON.parse(row.config)).durationMin;
  } catch {
    /* default */
  }
  return attemptDeadlineMs(row.started_at, durationMin, row.deadline_at);
}

/**
 * Le prove ABBANDONATE — in corso oltre la scadenza e il margine, perché il
 * computer si è spento o la pagina è stata chiusa — le consegna il server,
 * con le risposte salvate durante la prova. Si chiama all'inizio di ogni
 * lettura che le mostrerebbe come «in corso» per sempre.
 *
 * `userId` restringe alle prove di uno studente.
 */
export async function finalizeAbandoned(env: Env, userId?: string): Promise<number> {
  const rows = userId
    ? (
        await env.DB.prepare(`${SELECT_TENTATIVO} WHERE v.student_id = ? AND v.stato = 'in_corso' LIMIT 20`)
          .bind(userId)
          .all<AttemptRow>()
      ).results ?? []
    : await listInProgress(env);
  const now = Date.now();
  let closed = 0;
  for (const row of rows) {
    if (!isAbandoned(deadlineOf(row), now)) continue;
    try {
      const { answers, outcome } = outcomeOf(row);
      const ok = await finalizeAttempt(env, row.id, {
        answers,
        outcome,
        awayEvents: row.away_events,
        awayMs: row.away_ms,
        fullscreenExits: row.fullscreen_exits ?? 0,
        focusEvents: parseFocusEvents(row.focus_events),
        reason: 'server',
      });
      if (ok) closed++;
    } catch {
      /* una prova illeggibile non deve fermare le altre */
    }
  }
  return closed;
}

/* ---------------- Interventi del docente ---------------- */

export type EventType = 'alert' | 'ammonizione' | 'annulla';

export interface EventRow {
  id: number;
  type: EventType;
  message: string | null;
  created_at: string;
}

export async function addEvent(
  env: Env,
  attemptId: string,
  studentId: string | null,
  type: EventType,
  message: string | null,
  ip: string
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO attempt_events (app, attempt_id, student_id, type, message, created_at, created_by_ip)
     VALUES ('bc', ?, ?, ?, ?, ?, ?)`
  )
    .bind(attemptId, studentId, type, message, new Date().toISOString(), ip)
    .run();
}

export async function listEvents(env: Env, attemptId: string, sinceId = 0): Promise<EventRow[]> {
  const { results } = await env.DB.prepare(
    `SELECT id, type, message, created_at FROM attempt_events
      WHERE app = 'bc' AND attempt_id = ? AND id > ? ORDER BY id ASC`
  )
    .bind(attemptId, sinceId)
    .all<EventRow>();
  return results ?? [];
}

/* ---------------- Studenti ---------------- */

export interface StudentAttemptStats {
  student_id: string;
  name: string;
  class: string | null;
  submitted: number;
  annulled: number;
  live: number;
  avg_grade: number | null;
  last_at: string | null;
}

/** Per ogni studente che ha almeno una prova: quante, la media, l'ultima. */
export async function listStudentAttemptStats(env: Env): Promise<StudentAttemptStats[]> {
  const { results } = await env.DB.prepare(
    `SELECT student_id,
            MAX(student_name) AS name,
            MAX(student_class) AS class,
            SUM(CASE WHEN stato = 'consegnata' THEN 1 ELSE 0 END) AS submitted,
            SUM(CASE WHEN stato = 'annullata' THEN 1 ELSE 0 END) AS annulled,
            SUM(CASE WHEN stato = 'in_corso' THEN 1 ELSE 0 END) AS live,
            AVG(CASE WHEN stato = 'consegnata' THEN voto10 END) AS avg_grade,
            MAX(COALESCE(consegnata_il, iniziata_il)) AS last_at
       FROM verifiche WHERE app = 'bc'
      GROUP BY student_id`
  ).all<StudentAttemptStats>();
  return results ?? [];
}
