/**
 * GET /api/exam/events?since=<id> — il canale degli interventi del docente.
 *
 * Il browser lo interroga ogni pochi secondi durante la prova. Ritorna lo
 * stato della prova più recente dello studente (per scoprire
 * un'interruzione) e gli interventi — avviso, ammonizione, interruzione —
 * con id maggiore di `since`.
 *
 * Solo lettura e solo la firma del cookie: è la chiamata più frequente
 * dell'app, e non deve costare una richiesta all'IdP.
 */
import { jsonOk, jsonError, requireSession, type Env } from '../../_lib/shared';
import { findLatestAttempt, listEvents } from '../../_lib/examdb';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const identity = await requireSession(request);
  if (identity instanceof Response) return identity;

  const url = new URL(request.url);
  const since = Math.max(0, Math.floor(Number(url.searchParams.get('since') ?? '0')) || 0);
  const sixHoursAgo = new Date(Date.now() - 6 * 3600_000).toISOString();

  try {
    const attempt = await findLatestAttempt(env, identity.userId, sixHoursAgo);
    if (!attempt) return jsonOk({ found: false, events: [] });
    const events = await listEvents(env, attempt.id, since);
    return jsonOk({
      found: true,
      attemptId: attempt.id,
      state: attempt.state,
      annulledReason: attempt.annulled_reason,
      events: events.map((e) => ({ id: e.id, type: e.type, message: e.message, createdAt: e.created_at })),
    });
  } catch (e) {
    return jsonError(500, `Errore DB: ${e instanceof Error ? e.message : String(e)}`);
  }
};
