/**
 * Accesso alle tabelle `bc_*` nel database D1 condiviso `ccna1`.
 * Le tabelle sono prefissate `bc_` e non toccano quelle di CCNA1 o della
 * Calcolatrice (vedi migrations/0001_bc_init.sql).
 */

import { DEFAULT_CLASS, DEFAULT_CONFIG, parseConfig, type ExamConfig } from '../../shared/exam/config';
import type { Env, Identity } from './shared';

export interface ResolvedConfig {
  config: ExamConfig;
  /** Da dove viene la config: nome classe, '*' o 'builtin'. */
  source: string;
}

/**
 * Risolve la configurazione per uno studente: prima una riga esplicita di una
 * delle sue classi approvate (in ordine), poi la default '*', poi il builtin.
 */
export async function resolveConfig(env: Env, classes: string[]): Promise<ResolvedConfig> {
  const candidates = [...classes, DEFAULT_CLASS];
  const placeholders = candidates.map(() => '?').join(',');
  const { results } = await env.DB.prepare(
    `SELECT class, config FROM bc_class_config WHERE class IN (${placeholders})`
  )
    .bind(...candidates)
    .all<{ class: string; config: string }>();

  const byClass = new Map((results ?? []).map((r) => [r.class, r]));
  for (const c of candidates) {
    const row = byClass.get(c);
    if (row) {
      let parsed: unknown = {};
      try {
        parsed = JSON.parse(row.config);
      } catch {
        parsed = {};
      }
      return { config: parseConfig(parsed), source: row.class };
    }
  }
  return { config: DEFAULT_CONFIG, source: 'builtin' };
}

export async function upsertClassConfig(env: Env, cls: string, config: ExamConfig, byEmail: string): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO bc_class_config (class, config, updated_at, updated_by)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(class) DO UPDATE SET
       config = excluded.config,
       updated_at = excluded.updated_at,
       updated_by = excluded.updated_by`
  )
    .bind(cls, JSON.stringify(config), new Date().toISOString(), byEmail)
    .run();
}

export async function listClassConfigs(env: Env): Promise<{ class: string; config: ExamConfig; updated_at: string }[]> {
  const { results } = await env.DB.prepare(`SELECT class, config, updated_at FROM bc_class_config ORDER BY class`).all<{
    class: string;
    config: string;
    updated_at: string;
  }>();
  return (results ?? []).map((r) => {
    let parsed: unknown = {};
    try {
      parsed = JSON.parse(r.config);
    } catch {
      parsed = {};
    }
    return { class: r.class, config: parseConfig(parsed), updated_at: r.updated_at };
  });
}

export async function deleteClassConfig(env: Env, cls: string): Promise<void> {
  await env.DB.prepare(`DELETE FROM bc_class_config WHERE class = ?`).bind(cls).run();
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

export async function createAttempt(
  env: Env,
  id: string,
  identity: Identity,
  cls: string | null,
  seed: number,
  config: ExamConfig
): Promise<void> {
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO bc_attempts (id, user_id, email, full_name, class, seed, config, answers, started_at, last_seen_at, total_count)
     VALUES (?, ?, ?, ?, ?, ?, ?, '[]', ?, ?, ?)`
  )
    .bind(id, identity.userId, identity.email, identity.name, cls, seed, JSON.stringify(config), now, now, config.questionCount)
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

/* ---------------- Settings ---------------- */

export async function getSetting(env: Env, key: string): Promise<string> {
  try {
    const row = await env.DB.prepare(`SELECT value FROM bc_settings WHERE key = ?`).bind(key).first<{ value: string }>();
    return row?.value ?? '';
  } catch {
    return '';
  }
}

export async function setSetting(env: Env, key: string, value: string): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO bc_settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  )
    .bind(key, value, new Date().toISOString())
    .run();
}

/** Master-switch globale delle verifiche (default: attivo). */
export async function getExamsEnabled(env: Env): Promise<boolean> {
  const v = await getSetting(env, 'exams_enabled');
  if (v === '') return true;
  return v === 'true';
}
