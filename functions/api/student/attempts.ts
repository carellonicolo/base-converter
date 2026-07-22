/**
 * GET /api/student/attempts — storico delle verifiche consegnate dall'utente.
 */
import { jsonOk, jsonError, requireUser, type Env } from '../../_lib/shared';
import { listUserAttempts } from '../../_lib/examdb';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const access = await requireUser(request);
  if (access instanceof Response) return access;

  try {
    const rows = await listUserAttempts(env, access.identity.userId);
    return jsonOk({
      attempts: rows.map((r) => ({
        id: r.id,
        grade: r.grade,
        score: r.score,
        max_score: r.max_score,
        correct_count: r.correct_count,
        total_count: r.total_count,
        submitted_at: r.submitted_at,
      })),
    });
  } catch (e) {
    return jsonError(500, `Errore DB: ${e instanceof Error ? e.message : String(e)}`);
  }
};
