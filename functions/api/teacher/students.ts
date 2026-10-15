/**
 * GET /api/teacher/students        — gli studenti, dal registro dell'IdP, con
 *                                    il riepilogo di verifiche e palestra.
 * GET /api/teacher/students?id=ID  — la «cartella» di uno studente: tutte le
 *                                    sue prove e i progressi della palestra.
 *
 * Il registro è la fonte di verità di chi è iscritto e in che classe: uno
 * studente compare anche se non ha mai aperto l'app. Se AUTH non risponde
 * si ripiega su chi è noto dal DB (prove e progressi), con `source: 'db'`.
 *
 * Solo docente, nel suo perimetro (_lib/perimeter.ts): gli studenti sono
 * quelli che AUTH gli restituisce per le sue classi. Il ripiego sul DB vale
 * solo per il super-admin: per un docente, senza registro non si sa chi sia
 * suo.
 */
import { jsonOk, jsonError, requireTeacher, type Env } from '../../_lib/shared';
import { getProgress, listAllProgress, listAttempts, listStudentAttemptStats } from '../../_lib/examdb';
import { knownNames, rosterStudents, sortClasses, type RosterStudent } from '../../_lib/roster';
import { classesInView, loadPerimeter, outsidePerimeter, seesStudent } from '../../_lib/perimeter';
import { attemptView } from '../../_lib/views';

function xpOf(data: string | null | undefined): number | null {
  if (!data) return null;
  try {
    const xp = Number((JSON.parse(data) as { xp?: unknown }).xp);
    return Number.isFinite(xp) ? xp : null;
  } catch {
    return null;
  }
}

function parseJson(data: string): unknown {
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const access = await requireTeacher(request);
  if (access instanceof Response) return access;

  const id = new URL(request.url).searchParams.get('id');

  const p = await loadPerimeter(request, access);
  if (p instanceof Response) return p;

  try {
    const roster = p.roster;
    const fromRoster: RosterStudent[] = roster
      ? rosterStudents(roster).map((s) => ({ ...s, classes: classesInView(p, s.classes) }))
      : [];

    if (id) {
      if (!seesStudent(p, id)) return outsidePerimeter('Lo studente');
      const [attempts, progress] = await Promise.all([
        listAttempts(env, { studentId: id, states: ['consegnata', 'in_corso', 'annullata'] }),
        getProgress(env, id),
      ]);
      const known = fromRoster.find((s) => s.id === id);
      if (!known && attempts.length === 0 && !progress) return jsonError(404, 'Studente non trovato.', 'not_found');
      const student = known ?? {
        id,
        name: attempts[0]?.full_name || progress?.full_name || progress?.email || id,
        email: attempts[0]?.email || progress?.email || '',
        firstName: null,
        lastName: null,
        status: 'active',
        classes: attempts[0]?.class ? [attempts[0].class] : [],
        lastLoginAt: null,
      };
      return jsonOk({
        student,
        attempts: attempts.map(attemptView),
        progress: progress ? parseJson(progress.data) : null,
        progressAt: progress?.updated_at ?? null,
        nomi: knownNames([student]),
      });
    }

    const [stats, progress] = await Promise.all([listStudentAttemptStats(env), listAllProgress(env)]);
    const statsBy = new Map(stats.map((s) => [s.student_id, s]));
    const progressBy = new Map(progress.map((p) => [p.user_id, p]));

    // Il registro prima; poi, se manca, chi è noto dal DB.
    const base: RosterStudent[] = roster
      ? fromRoster
      : [
          ...stats.map((s) => ({
            id: s.student_id,
            name: s.name,
            email: '',
            firstName: null,
            lastName: null,
            status: 'active',
            classes: s.class ? [s.class] : [],
            lastLoginAt: null,
          })),
          ...progress
            .filter((p) => !statsBy.has(p.user_id))
            .map((p) => ({
              id: p.user_id,
              name: p.full_name || p.email,
              email: p.email,
              firstName: null,
              lastName: null,
              status: 'active',
              classes: [],
              lastLoginAt: null,
            })),
        ];

    const students = base.map((s) => {
      const st = statsBy.get(s.id);
      const pr = progressBy.get(s.id);
      return {
        ...s,
        email: s.email || pr?.email || '',
        submitted: st?.submitted ?? 0,
        annulled: st?.annulled ?? 0,
        live: st?.live ?? 0,
        avgGrade: st?.avg_grade == null ? null : Math.round(st.avg_grade * 100) / 100,
        lastExamAt: st?.last_at ?? null,
        xp: xpOf(pr?.data),
        gymAt: pr?.updated_at ?? null,
      };
    });

    const classes = sortClasses(new Set(students.flatMap((s) => s.classes)));
    return jsonOk({ students, classes, source: roster ? 'auth' : 'db', nomi: knownNames(fromRoster) });
  } catch (e) {
    return jsonError(500, `Errore DB: ${e instanceof Error ? e.message : String(e)}`);
  }
};
