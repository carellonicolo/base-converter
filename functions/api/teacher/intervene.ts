/**
 * POST /api/teacher/intervene — intervento del docente su una prova in corso.
 * Body: { attemptId, type: 'alert' | 'ammonizione' | 'annulla', message }
 *
 *  - alert       → messaggio momentaneo allo studente;
 *  - ammonizione → ammonizione registrata, che resta sulla prova;
 *  - annulla     → la prova si interrompe: stato 'annullata' con il motivo.
 *
 * L'evento va nella tabella condivisa `attempt_events` (app = 'bc'), come in
 * VLSM e CCNA1; lo studente lo riceve al primo giro del canale
 * /api/exam/events, entro pochi secondi.
 *
 * Solo docente.
 */
import { clientIp, jsonOk, jsonError, requireTeacher, type Env } from '../../_lib/shared';
import { addEvent, annulAttempt, getAttempt, type EventType } from '../../_lib/examdb';

interface Body {
  attemptId?: string;
  type?: string;
  message?: string;
}

const ALLOWED = new Set<EventType>(['alert', 'ammonizione', 'annulla']);

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const access = await requireTeacher(request);
  if (access instanceof Response) return access;

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return jsonError(400, 'JSON non valido.');
  }
  const id = String(body.attemptId ?? '').trim();
  const type = String(body.type ?? '') as EventType;
  if (!id) return jsonError(400, 'Prova mancante.');
  if (!ALLOWED.has(type)) return jsonError(400, 'Tipo di intervento non valido.');
  const message = String(body.message ?? '').trim().slice(0, 500) || null;
  if (type === 'alert' && !message) return jsonError(400, 'Scrivi il messaggio da mandare.', 'no_message');

  try {
    const row = await getAttempt(env, id);
    if (!row) return jsonError(404, 'Prova non trovata.', 'not_found');
    if (row.state !== 'in_corso') return jsonError(409, 'La prova non è più in corso.', 'not_open');

    await addEvent(env, id, row.user_id, type, message, clientIp(request));
    if (type === 'annulla') await annulAttempt(env, id, message ?? 'Prova interrotta dal docente.');
    return jsonOk({ ok: true, type });
  } catch (e) {
    return jsonError(500, `Errore DB: ${e instanceof Error ? e.message : String(e)}`);
  }
};
