/**
 * GET   /api/teacher/assignments — elenco delle assegnazioni con contatori.
 * POST  /api/teacher/assignments — assegna una verifica a UNA classe.
 * PATCH /api/teacher/assignments — apri/chiudi un'assegnazione.
 *
 * Solo docente. Non esiste un modo per assegnare a "tutte le classi": il campo
 * classe è un nome singolo e obbligatorio.
 */
import { jsonOk, jsonError, requireTeacher, type Env } from '../../_lib/shared';
import { listAssignments, createAssignment, setAssignmentStatus, getAssignment } from '../../_lib/examdb';
import { findExam } from '../../../shared/exam/catalog';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const access = await requireTeacher(request);
  if (access instanceof Response) return access;
  try {
    const rows = await listAssignments(env);
    // Arricchisco con i dati del catalogo. Un exam_id orfano (voce rimossa dal
    // catalogo) NON rompe l'elenco: lo segnalo con missing:true.
    const assignments = rows.map((a) => {
      const spec = findExam(a.exam_id);
      return {
        id: a.id,
        examId: a.exam_id,
        class: a.class,
        status: a.status,
        durationMin: a.duration_min,
        createdBy: a.created_by,
        createdAt: a.created_at,
        attempts: a.attempts,
        submitted: a.submitted,
        live: a.live,
        exam: spec
          ? { topic: spec.topic, level: spec.level, questionCount: spec.questionCount, durationMin: spec.durationMin }
          : null,
        missing: !spec,
      };
    });
    return jsonOk({ assignments });
  } catch (e) {
    return jsonError(500, `Errore DB: ${e instanceof Error ? e.message : String(e)}`);
  }
};

interface PostBody {
  examId?: string;
  class?: string;
  durationMin?: number | null;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const access = await requireTeacher(request);
  if (access instanceof Response) return access;

  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return jsonError(400, 'JSON non valido.');
  }

  const examId = String(body.examId ?? '').trim();
  const cls = String(body.class ?? '').trim();
  if (!examId) return jsonError(400, 'Verifica mancante.', 'no_exam');
  if (!cls) return jsonError(400, 'Classe mancante.', 'no_class');
  if (cls === '*') return jsonError(400, 'Una verifica va assegnata a una classe specifica.', 'no_wildcard');
  if (cls.length > 40) return jsonError(400, 'Nome classe troppo lungo.');
  if (!findExam(examId)) return jsonError(404, 'Verifica non trovata nel catalogo.', 'not_found');

  const duration =
    body.durationMin == null || body.durationMin === undefined
      ? null
      : Math.max(1, Math.min(240, Math.floor(Number(body.durationMin) || 0))) || null;

  try {
    const id = crypto.randomUUID();
    const { closed } = await createAssignment(env, id, examId, cls, duration, access.identity.email);
    return jsonOk({ ok: true, id, closedPrevious: closed });
  } catch (e) {
    return jsonError(500, `Errore DB: ${e instanceof Error ? e.message : String(e)}`);
  }
};

interface PatchBody {
  id?: string;
  status?: 'open' | 'closed';
}

export const onRequestPatch: PagesFunction<Env> = async ({ request, env }) => {
  const access = await requireTeacher(request);
  if (access instanceof Response) return access;

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return jsonError(400, 'JSON non valido.');
  }

  const id = String(body.id ?? '').trim();
  if (!id) return jsonError(400, 'id mancante.');
  if (body.status !== 'open' && body.status !== 'closed') return jsonError(400, 'status non valido.');

  try {
    if (!(await getAssignment(env, id))) return jsonError(404, 'Assegnazione non trovata.', 'not_found');
    await setAssignmentStatus(env, id, body.status);
    return jsonOk({ ok: true });
  } catch (e) {
    return jsonError(500, `Errore DB: ${e instanceof Error ? e.message : String(e)}`);
  }
};
