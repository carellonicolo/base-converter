/**
 * POST /api/exam/heartbeat — segnale periodico durante la verifica.
 *
 * Alimenta la vista "in diretta" della console docente e registra il conteggio
 * delle uscite dalla pagina (focus monitor) anche se lo studente non consegna.
 */
import { jsonOk, jsonError, requireExamAccess, type Env } from '../../_lib/shared';
import { findOpenAttempt, touchAttempt } from '../../_lib/examdb';

interface Body {
  awayEvents?: number;
  awayMs?: number;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const access = await requireExamAccess(request);
  if (access instanceof Response) return access;

  let body: Body = {};
  try {
    body = (await request.json()) as Body;
  } catch {
    body = {};
  }

  try {
    const open = await findOpenAttempt(env, access.identity.userId);
    if (!open) return jsonOk({ open: false });
    await touchAttempt(env, open.id, clampInt(body.awayEvents, 0, 100000, open.away_events), clampInt(body.awayMs, 0, 24 * 3600 * 1000, open.away_ms));
    return jsonOk({ open: true });
  } catch (e) {
    return jsonError(500, `Errore DB: ${e instanceof Error ? e.message : String(e)}`);
  }
};

function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}
