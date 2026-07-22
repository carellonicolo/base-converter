/**
 * POST /api/exam/submit — consegna e correzione della verifica.
 *
 * La correzione avviene SOLO qui: le risposte attese sono rigenerate dal seed
 * salvato e non transitano mai dal client prima della consegna.
 * Il tempo è verificato lato server: oltre la scadenza (con una tolleranza di
 * rete) la prova viene comunque corretta ma marcata come fuori tempo.
 */
import { jsonOk, jsonError, requireExamAccess, type Env } from '../../_lib/shared';
import { findOpenAttempt, finalizeAttempt } from '../../_lib/examdb';
import { gradeExam, parseConfig } from '../../../shared/exam/config';

interface Body {
  id?: string;
  answers?: unknown;
  awayEvents?: number;
  awayMs?: number;
}

/** Tolleranza sulla scadenza (latenza di rete / salvataggio). */
const GRACE_MS = 20_000;

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const access = await requireExamAccess(request);
  if (access instanceof Response) return access;

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return jsonError(400, 'JSON non valido.');
  }

  try {
    const open = await findOpenAttempt(env, access.identity.userId);
    if (!open) return jsonError(404, 'Nessuna verifica in corso.', 'no_attempt');
    if (body.id && body.id !== open.id) return jsonError(409, 'Verifica non corrispondente.', 'mismatch');

    const config = parseConfig(JSON.parse(open.config));
    const answers = normalizeAnswers(body.answers, config.questionCount);

    const deadline = new Date(open.started_at).getTime() + config.durationMin * 60_000;
    const lateBy = Date.now() - (deadline + GRACE_MS);

    const outcome = gradeExam(config, open.seed, answers);
    const awayEvents = clampInt(body.awayEvents, 0, 100000, 0);
    const awayMs = clampInt(body.awayMs, 0, 24 * 3600 * 1000, 0);

    await finalizeAttempt(
      env,
      open.id,
      answers,
      outcome.score,
      outcome.maxScore,
      outcome.grade,
      outcome.correctCount,
      outcome.totalCount,
      awayEvents,
      awayMs
    );

    return jsonOk({
      id: open.id,
      grade: outcome.grade,
      score: outcome.score,
      maxScore: outcome.maxScore,
      correctCount: outcome.correctCount,
      totalCount: outcome.totalCount,
      passed: outcome.passed,
      late: lateBy > 0,
      // Ora che è consegnata, la revisione può mostrare le risposte attese.
      questions: outcome.questions,
    });
  } catch (e) {
    return jsonError(500, `Errore DB: ${e instanceof Error ? e.message : String(e)}`);
  }
};

function normalizeAnswers(raw: unknown, count: number): string[] {
  const arr = Array.isArray(raw) ? raw : [];
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const v = arr[i];
    out.push(v == null ? '' : String(v).slice(0, 200));
  }
  return out;
}

function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}
