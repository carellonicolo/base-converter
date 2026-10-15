/**
 * GET   /api/teacher/assignments — le assegnazioni, con contatori e voti:
 *                                  è l'elenco delle sessioni dello Storico.
 * POST  /api/teacher/assignments — assegna una verifica a una classe o a un
 *                                  singolo studente, con la finestra per
 *                                  iniziarla.
 * PATCH /api/teacher/assignments — chiudi, riapri (recupero per gli assenti),
 *                                  prolunga la finestra.
 *
 * Solo docente, nel suo perimetro (_lib/perimeter.ts): vede e tocca solo le
 * assegnazioni delle sue classi e dei suoi studenti, e assegna solo a quelli.
 * Il super-admin non ha perimetro. Non esiste un modo per assegnare a
 * "tutte le classi": il destinatario è una classe per nome, o uno studente
 * per id.
 */
import { jsonOk, jsonError, requireTeacher, type Env } from '../../_lib/shared';
import {
  closeAssignment,
  createAssignment,
  getAssignment,
  listAssignments,
  listSubmittedGrades,
  reopenAssignment,
  setAssignmentWindow,
} from '../../_lib/examdb';
import { rosterStudents } from '../../_lib/roster';
import { loadPerimeter, outsidePerimeter, ownsAssignment, ownsClass, perimeterStudents } from '../../_lib/perimeter';
import { assignmentView } from '../../_lib/views';
import { findExam } from '../../../shared/exam/catalog';
import { assignmentState, extendUntil, windowUntil } from '../../../shared/exam/assignments';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const access = await requireTeacher(request);
  if (access instanceof Response) return access;
  const p = await loadPerimeter(request, access);
  if (p instanceof Response) return p;
  try {
    const [all, grades] = await Promise.all([listAssignments(env), listSubmittedGrades(env)]);
    const rows = all.filter((a) => ownsAssignment(p, a));
    const roster = p.roster;
    const gradesBy = new Map<string, (number | null)[]>();
    for (const g of grades) gradesBy.set(g.assignment_id, [...(gradesBy.get(g.assignment_id) ?? []), g.grade]);

    // Iscritti per classe, dal registro: «12 consegne su 24».
    let perClass: Map<string, number> | null = null;
    if (roster) {
      perClass = new Map();
      for (const s of rosterStudents(roster)) for (const c of s.classes) perClass.set(c, (perClass.get(c) ?? 0) + 1);
    }

    const now = Date.now();
    // Un exam_id orfano (voce rimossa dal catalogo) NON rompe l'elenco:
    // lo segnala `missing: true`.
    const assignments = rows.map((a) =>
      assignmentView(
        a,
        now,
        gradesBy.get(a.id) ?? [],
        a.target_type === 'student' ? 1 : perClass ? perClass.get(a.class) ?? 0 : null
      )
    );
    return jsonOk({ assignments, now: new Date(now).toISOString() });
  } catch (e) {
    return jsonError(500, `Errore DB: ${e instanceof Error ? e.message : String(e)}`);
  }
};

interface PostBody {
  examId?: string;
  targetType?: 'class' | 'student';
  class?: string;
  studentId?: string;
  /** Usati solo se il registro non risponde. */
  studentName?: string;
  studentClass?: string;
  durationMin?: number | null;
  /** Minuti per iniziarla; null = finché il docente non la chiude. */
  openForMin?: number | null;
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
  if (!examId) return jsonError(400, 'Verifica mancante.', 'no_exam');
  if (!findExam(examId)) return jsonError(404, 'Verifica non trovata nel catalogo.', 'not_found');
  const targetType = body.targetType === 'student' ? 'student' : 'class';

  const p = await loadPerimeter(request, access);
  if (p instanceof Response) return p;

  let cls = '';
  let studentId: string | null = null;
  let studentName: string | null = null;
  if (targetType === 'class') {
    cls = String(body.class ?? '').trim();
    if (!cls) return jsonError(400, 'Classe mancante.', 'no_class');
    if (cls === '*') return jsonError(400, 'Una verifica va assegnata a una classe specifica.', 'no_wildcard');
    if (cls.length > 40) return jsonError(400, 'Nome classe troppo lungo.');
    if (!ownsClass(p, cls)) return outsidePerimeter(`La ${cls}`);
  } else {
    studentId = String(body.studentId ?? '').trim();
    if (!studentId) return jsonError(400, 'Studente mancante.', 'no_student');
    // Nome e classe dal registro, che è la fonte di verità; quelli del
    // browser solo se il registro non risponde.
    const roster = p.roster;
    const found = roster ? (p.superAdmin ? rosterStudents(roster) : perimeterStudents(p)).find((s) => s.id === studentId) : null;
    if (roster && !found) {
      return p.superAdmin ? jsonError(404, 'Studente non trovato nel registro.', 'no_student') : outsidePerimeter('Lo studente');
    }
    studentName = (found?.name ?? String(body.studentName ?? '').trim()).slice(0, 120) || studentId;
    cls = (found?.classes[0] ?? String(body.studentClass ?? '').trim()).slice(0, 40);
  }

  const duration =
    body.durationMin == null ? null : Math.max(1, Math.min(240, Math.floor(Number(body.durationMin) || 0))) || null;

  try {
    const id = crypto.randomUUID();
    const { closed } = await createAssignment(env, {
      id,
      examId,
      targetType,
      cls,
      studentId,
      studentName,
      durationMin: duration,
      openUntil: windowUntil(body.openForMin, Date.now()),
      byEmail: access.identity.email,
    });
    return jsonOk({ ok: true, id, closedPrevious: closed });
  } catch (e) {
    return jsonError(500, `Errore DB: ${e instanceof Error ? e.message : String(e)}`);
  }
};

interface PatchBody {
  id?: string;
  action?: 'close' | 'reopen' | 'extend';
  /** reopen: nuova finestra (null = senza termine). extend: minuti in più. */
  openForMin?: number | null;
  minutes?: number;
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

  try {
    const a = await getAssignment(env, id);
    if (!a) return jsonError(404, 'Assegnazione non trovata.', 'not_found');
    const p = await loadPerimeter(request, access);
    if (p instanceof Response) return p;
    if (!ownsAssignment(p, a)) return outsidePerimeter('Questa verifica');
    const now = Date.now();

    switch (body.action) {
      case 'close':
        await closeAssignment(env, id);
        return jsonOk({ ok: true });
      case 'reopen': {
        const { closed } = await reopenAssignment(env, a, windowUntil(body.openForMin, now));
        return jsonOk({ ok: true, closedPrevious: closed });
      }
      case 'extend': {
        if (assignmentState(a, now) === 'closed') return jsonError(409, 'La verifica è chiusa: riaprila.', 'closed');
        const minutes = Math.round(Number(body.minutes ?? 15));
        if (!Number.isFinite(minutes) || minutes <= 0) return jsonError(400, 'Minuti non validi.');
        // Una finestra scaduta riparte da adesso; una senza termine resta tale.
        await setAssignmentWindow(env, id, extendUntil(a.open_until, minutes, now));
        return jsonOk({ ok: true });
      }
      default:
        return jsonError(400, 'Azione non valida.');
    }
  } catch (e) {
    return jsonError(500, `Errore DB: ${e instanceof Error ? e.message : String(e)}`);
  }
};
