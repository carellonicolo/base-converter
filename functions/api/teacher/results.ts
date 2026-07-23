/**
 * GET /api/teacher/results — risultati delle verifiche consegnate.
 * Query opzionale: ?class=3A  ?format=csv
 */
import { jsonOk, jsonError, requireTeacher, type Env } from '../../_lib/shared';
import { listAllAttempts } from '../../_lib/examdb';
import { findExam } from '../../../shared/exam/catalog';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const access = await requireTeacher(request);
  if (access instanceof Response) return access;

  const url = new URL(request.url);
  const cls = url.searchParams.get('class');
  const format = url.searchParams.get('format');

  try {
    const rows = await listAllAttempts(env, cls && cls !== '*' ? cls : null);

    if (format === 'csv') {
      const header = ['Studente', 'Email', 'Classe', 'Verifica', 'Voto', 'Corrette', 'Totale', 'Uscite', 'Consegnato'];
      const lines = [header.join(';')];
      for (const r of rows) {
        lines.push(
          [
            csv(r.full_name),
            csv(r.email),
            csv(r.class ?? ''),
            csv(r.exam_id ?? ''),
            String(r.grade ?? '').replace('.', ','),
            String(r.correct_count),
            String(r.total_count),
            String(r.away_events),
            csv(r.submitted_at ?? ''),
          ].join(';')
        );
      }
      return new Response('﻿' + lines.join('\r\n'), {
        headers: {
          'content-type': 'text/csv; charset=utf-8',
          'content-disposition': `attachment; filename="verifiche-base-converter${cls ? '-' + cls : ''}.csv"`,
        },
      });
    }

    return jsonOk({
      results: rows.map((r) => {
        const spec = r.exam_id ? findExam(r.exam_id) : null;
        return {
          id: r.id,
          name: r.full_name,
          email: r.email,
          class: r.class,
          examId: r.exam_id,
          examTopic: spec?.topic ?? null,
          examLevel: spec?.level ?? null,
          grade: r.grade,
          correct_count: r.correct_count,
          total_count: r.total_count,
          away_events: r.away_events,
          away_ms: r.away_ms,
          submitted_at: r.submitted_at,
        };
      }),
    });
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
