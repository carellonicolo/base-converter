/**
 * GET    /api/teacher/attempt?id=ID — una prova, domanda per domanda: la
 *                                     risposta data, quella attesa, le uscite
 *                                     dalla pagina e gli interventi.
 * DELETE /api/teacher/attempt?id=ID — elimina la prova, così lo studente può
 *                                     rifarla (anche dopo un'interruzione).
 *
 * Una prova in corso o interrotta si corregge con le risposte salvate
 * durante la prova: è una correzione PROVVISORIA, e la console lo dice.
 *
 * Solo docente.
 */
import { jsonOk, jsonError, requireTeacher, type Env } from '../../_lib/shared';
import { deleteAttempt, getAttempt, listEvents, outcomeOf } from '../../_lib/examdb';
import { attemptView } from '../../_lib/views';
import { parseFocusEvents } from '../../../shared/exam/assignments';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const access = await requireTeacher(request);
  if (access instanceof Response) return access;

  const id = new URL(request.url).searchParams.get('id') ?? '';
  if (!id) return jsonError(400, 'id mancante.');

  try {
    const row = await getAttempt(env, id);
    if (!row) return jsonError(404, 'Prova non trovata.', 'not_found');
    const { outcome, config } = outcomeOf(row);
    const events = await listEvents(env, id);
    return jsonOk({
      attempt: attemptView(row),
      durationMin: config.durationMin,
      provisional: row.state !== 'consegnata',
      outcome: {
        grade: outcome.grade,
        score: outcome.score,
        maxScore: outcome.maxScore,
        correctCount: outcome.correctCount,
        totalCount: outcome.totalCount,
      },
      questions: outcome.questions,
      focusEvents: parseFocusEvents(row.focus_events),
      events: events.map((e) => ({ id: e.id, type: e.type, message: e.message, createdAt: e.created_at })),
    });
  } catch (e) {
    return jsonError(500, `Errore DB: ${e instanceof Error ? e.message : String(e)}`);
  }
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const access = await requireTeacher(request);
  if (access instanceof Response) return access;

  const id = new URL(request.url).searchParams.get('id') ?? '';
  if (!id) return jsonError(400, 'id mancante.');

  try {
    if (!(await getAttempt(env, id))) return jsonError(404, 'Prova non trovata.', 'not_found');
    await deleteAttempt(env, id);
    return jsonOk({ ok: true });
  } catch (e) {
    return jsonError(500, `Errore DB: ${e instanceof Error ? e.message : String(e)}`);
  }
};
