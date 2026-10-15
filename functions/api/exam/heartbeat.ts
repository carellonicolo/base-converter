/**
 * POST /api/exam/heartbeat — segnale periodico durante la verifica.
 *
 * Salva le risposte date finora (se il computer si spegne, la consegna la fa
 * il server con queste: vedi finalizeAbandoned), le uscite dalla pagina una
 * per una e le uscite dallo schermo intero. Alimenta la vista «Sessioni
 * live» della console.
 *
 * Solo la firma del cookie: il gate completo l'ha superato l'avvio.
 */
import { jsonOk, jsonError, requireSession, type Env } from '../../_lib/shared';
import { findOpenAttempt, saveAttemptProgress, savedAnswers } from '../../_lib/examdb';
import { parseConfig } from '../../../shared/exam/config';
import { parseFocusEvents } from '../../../shared/exam/assignments';

interface Body {
  id?: string;
  answers?: unknown;
  focusEvents?: unknown;
  awayEvents?: number;
  awayMs?: number;
  fullscreenExits?: number;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const identity = await requireSession(request);
  if (identity instanceof Response) return identity;

  let body: Body = {};
  try {
    body = (await request.json()) as Body;
  } catch {
    body = {};
  }

  try {
    const open = await findOpenAttempt(env, identity.userId);
    if (!open || (body.id && body.id !== open.id)) return jsonOk({ open: false });
    const count = parseConfig(JSON.parse(open.config)).questionCount;
    const saved = await saveAttemptProgress(env, open.id, {
      answers: Array.isArray(body.answers) ? savedAnswers(JSON.stringify(body.answers), count) : undefined,
      focusEvents: body.focusEvents === undefined ? undefined : parseFocusEvents(body.focusEvents),
      // I contatori non scendono: un client che riparte da zero non cancella
      // le distrazioni già registrate.
      awayEvents: Math.max(open.away_events, clampInt(body.awayEvents, 0, 100000, 0)),
      awayMs: Math.max(open.away_ms, clampInt(body.awayMs, 0, 24 * 3600 * 1000, 0)),
      fullscreenExits: Math.max(open.fullscreen_exits ?? 0, clampInt(body.fullscreenExits, 0, 100000, 0)),
    });
    return jsonOk({ open: saved, savedAt: new Date().toISOString() });
  } catch (e) {
    return jsonError(500, `Errore DB: ${e instanceof Error ? e.message : String(e)}`);
  }
};

function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}
