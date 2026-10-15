/**
 * POST /api/exam/submit — consegna e correzione della verifica.
 *
 * La correzione avviene SOLO qui: le risposte attese sono rigenerate dal seed
 * salvato e non transitano mai dal client prima della consegna.
 * Il tempo è verificato lato server: oltre la scadenza (con una tolleranza di
 * rete) la prova viene comunque corretta ma marcata come fuori tempo.
 */
import { jsonOk, jsonError, requireExamAccess, type Env } from '../../_lib/shared';
import { deadlineOf, findLatestAttempt, findOpenAttempt, finalizeAttempt } from '../../_lib/examdb';
import { gradeExam, parseConfig } from '../../../shared/exam/config';
import { parseFocusEvents } from '../../../shared/exam/assignments';

interface Body {
  id?: string;
  answers?: unknown;
  awayEvents?: number;
  awayMs?: number;
  fullscreenExits?: number;
  focusEvents?: unknown;
  /** true se la consegna l'ha fatta il timer del browser. */
  auto?: boolean;
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
    if (!open) {
      // Interrotta dal docente o già consegnata dal server: lo si dice, con
      // un codice che il browser sa leggere.
      const latest = await findLatestAttempt(env, access.identity.userId, new Date(Date.now() - 6 * 3600_000).toISOString());
      if (latest && latest.id === body.id && latest.state === 'annullata') {
        return jsonError(409, latest.annulled_reason || 'Prova interrotta dal docente.', 'annulled');
      }
      if (latest && latest.id === body.id && latest.state === 'consegnata') {
        return jsonError(409, 'La verifica è già stata consegnata.', 'already_submitted');
      }
      return jsonError(404, 'Nessuna verifica in corso.', 'no_attempt');
    }
    if (body.id && body.id !== open.id) return jsonError(409, 'Verifica non corrispondente.', 'mismatch');

    const config = parseConfig(JSON.parse(open.config));
    const answers = normalizeAnswers(body.answers, config.questionCount);
    const lateBy = Date.now() - (deadlineOf(open) + GRACE_MS);
    const outcome = gradeExam(config, open.seed, answers);

    const focusEvents = parseFocusEvents(body.focusEvents);
    const applied = await finalizeAttempt(env, open.id, {
      answers,
      outcome,
      awayEvents: Math.max(open.away_events, clampInt(body.awayEvents, 0, 100000, 0)),
      awayMs: Math.max(open.away_ms, clampInt(body.awayMs, 0, 24 * 3600 * 1000, 0)),
      fullscreenExits: Math.max(open.fullscreen_exits ?? 0, clampInt(body.fullscreenExits, 0, 100000, 0)),
      focusEvents: focusEvents.length ? focusEvents : parseFocusEvents(open.focus_events),
      reason: body.auto ? 'tempo' : 'volontaria',
    });
    if (!applied) return jsonError(409, 'La prova non è più in corso.', 'not_open');

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
