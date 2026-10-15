/**
 * GET /api/teacher/results — risultati delle verifiche.
 * Query opzionali: ?class=3A  ?student=<id>  ?state=all|consegnata|annullata  ?format=csv
 *
 * Di norma le consegnate; `state=all` aggiunge le interrotte, che hanno un
 * motivo e nessun voto.
 */
import { jsonOk, jsonError, requireTeacher, type Env } from '../../_lib/shared';
import { listAttempts, type AttemptState } from '../../_lib/examdb';
import { attemptView } from '../../_lib/views';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const access = await requireTeacher(request);
  if (access instanceof Response) return access;

  const url = new URL(request.url);
  const cls = url.searchParams.get('class');
  const student = url.searchParams.get('student');
  const stateParam = url.searchParams.get('state');
  const format = url.searchParams.get('format');
  const states: AttemptState[] =
    stateParam === 'all' ? ['consegnata', 'annullata'] : stateParam === 'annullata' ? ['annullata'] : ['consegnata'];

  try {
    const rows = await listAttempts(env, { cls: cls && cls !== '*' ? cls : null, studentId: student, states });

    if (format === 'csv') {
      const header = ['Studente', 'Email', 'Classe', 'Verifica', 'Stato', 'Voto', 'Corrette', 'Totale', 'Uscite pagina', 'Secondi fuori', 'Uscite schermo intero', 'Ammonizioni', 'Iniziata', 'Consegnata'];
      const lines = [header.join(';')];
      for (const r of rows) {
        lines.push(
          [
            csv(r.full_name),
            csv(r.email),
            csv(r.class ?? ''),
            csv(r.exam_id ?? ''),
            r.state,
            String(r.grade ?? '').replace('.', ','),
            String(r.correct_count),
            String(r.total_count),
            String(r.away_events),
            String(Math.round(r.away_ms / 1000)),
            String(r.fullscreen_exits ?? 0),
            String(r.warnings ?? 0),
            csv(r.started_at ?? ''),
            csv(r.submitted_at ?? ''),
          ].join(';')
        );
      }
      return new Response('﻿' + lines.join('\r\n'), {
        headers: {
          'content-type': 'text/csv; charset=utf-8',
          'content-disposition': `attachment; filename="verifiche-base-converter${cls ? '-' + cls.replace(/[^\w-]+/g, '_') : ''}.csv"`,
        },
      });
    }

    return jsonOk({ results: rows.map(attemptView) });
  } catch (e) {
    return jsonError(500, `Errore DB: ${e instanceof Error ? e.message : String(e)}`);
  }
};

/** Escape minimale per CSV con separatore ';'. */
function csv(v: string): string {
  const s = String(v ?? '');
  if (/[";\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}
