/**
 * GET /api/teacher/live — verifiche attualmente in corso (heartbeat recenti).
 */
import { jsonOk, jsonError, requireTeacher, type Env } from '../../_lib/shared';
import { listLiveAttempts } from '../../_lib/examdb';
import { parseConfig } from '../../../shared/exam/config';
import { findExam } from '../../../shared/exam/catalog';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const access = await requireTeacher(request);
  if (access instanceof Response) return access;

  try {
    const rows = await listLiveAttempts(env);
    const now = Date.now();
    return jsonOk({
      live: rows.map((r) => {
        // La durata effettiva è quella salvata nel tentativo (con l'eventuale
        // override della durata già applicato all'avvio).
        let durationMin = 30;
        try {
          durationMin = parseConfig(JSON.parse(r.config)).durationMin;
        } catch {
          /* default */
        }
        const spec = r.exam_id ? findExam(r.exam_id) : null;
        const deadline = new Date(r.started_at).getTime() + durationMin * 60_000;
        return {
          id: r.id,
          name: r.full_name,
          email: r.email,
          class: r.class,
          examId: r.exam_id,
          examTopic: spec?.topic ?? null,
          examLevel: spec?.level ?? null,
          started_at: r.started_at,
          last_seen_at: r.last_seen_at,
          away_events: r.away_events,
          remainingMs: Math.max(0, deadline - now),
        };
      }),
    });
  } catch (e) {
    return jsonError(500, `Errore DB: ${e instanceof Error ? e.message : String(e)}`);
  }
};
