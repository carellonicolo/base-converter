/**
 * GET /api/teacher/session?id=<assegnazione> — una sessione dello Storico.
 *
 * Ogni assegnazione è una sessione: la si apre in seguito per vedere com'è
 * andata. Ritorna le prove di tutti gli stati, gli iscritti (per sapere chi
 * mancava) e l'analisi per tipo di esercizio, calcolata qui perché solo il
 * server ha semi e risposte.
 *
 * Solo docente.
 */
import { jsonOk, jsonError, requireTeacher, type Env } from '../../_lib/shared';
import { finalizeAbandoned, getAssignment, listAssignments, listAttempts, listSubmittedGrades, outcomeOf } from '../../_lib/examdb';
import { fetchRoster, knownNames, rosterStudents } from '../../_lib/roster';
import { assignmentView, attemptView } from '../../_lib/views';
import { analyzeByCategory } from '../../../shared/exam/analysis';
import type { QuestionOutcome } from '../../../shared/exam/config';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const access = await requireTeacher(request);
  if (access instanceof Response) return access;

  const id = new URL(request.url).searchParams.get('id') ?? '';
  if (!id) return jsonError(400, 'id mancante.');

  try {
    if (!(await getAssignment(env, id))) return jsonError(404, 'Sessione non trovata.', 'not_found');
    await finalizeAbandoned(env);

    const [all, grades, attempts, roster] = await Promise.all([
      listAssignments(env),
      listSubmittedGrades(env),
      listAttempts(env, { assignmentId: id, states: ['consegnata', 'in_corso', 'annullata'] }),
      fetchRoster(request),
    ]);
    const a = all.find((x) => x.id === id)!;

    // Gli iscritti: la classe, o lo studente dell'assegnazione personale.
    let enrolled: { id: string; name: string; email: string }[] | null = null;
    let nomi = {};
    if (roster) {
      const students = rosterStudents(roster);
      const target =
        a.target_type === 'student' ? students.filter((s) => s.id === a.target_student) : students.filter((s) => s.classes.includes(a.class));
      enrolled = target.map((s) => ({ id: s.id, name: s.name, email: s.email }));
      nomi = knownNames(students);
    }

    const outcomes: QuestionOutcome[][] = [];
    for (const row of attempts) {
      if (row.state !== 'consegnata') continue;
      try {
        outcomes.push(outcomeOf(row).outcome.questions);
      } catch {
        /* prova illeggibile: resta in tabella, fuori dall'analisi */
      }
    }

    return jsonOk({
      session: assignmentView(
        a,
        Date.now(),
        grades.filter((g) => g.assignment_id === id).map((g) => g.grade),
        enrolled ? enrolled.length : null
      ),
      attempts: attempts.map(attemptView),
      enrolled,
      analysis: analyzeByCategory(outcomes),
      nomi,
      now: new Date().toISOString(),
    });
  } catch (e) {
    return jsonError(500, `Errore DB: ${e instanceof Error ? e.message : String(e)}`);
  }
};
