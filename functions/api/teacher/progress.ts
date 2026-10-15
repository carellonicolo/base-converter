/**
 * GET /api/teacher/progress — progressi della palestra di ogni studente.
 *
 * Il dato grezzo è già in bc_progress (una riga per studente che ha salvato).
 * Qui si incrocia con le classi da AUTH — bc_progress non le memorizza — così
 * il docente può filtrare per classe. Se AUTH non risponde, il super-admin
 * vede gli studenti senza classe; un docente riceve 502, perché senza
 * registro non si sa quali studenti siano suoi.
 *
 * La MATEMATICA (livello, precisione, badge) NON viene fatta qui: si mandano i
 * progressi grezzi e li elabora il client, che possiede già quelle funzioni
 * (src/lib/progress.ts) usate anche dallo studente. Un'unica fonte di verità.
 *
 * Solo docente, nel suo perimetro (_lib/perimeter.ts).
 */
import { jsonOk, jsonError, requireTeacher, type Env } from '../../_lib/shared';
import { listAllProgress } from '../../_lib/examdb';
import { knownNames, rosterStudents, sortClasses } from '../../_lib/roster';
import { classesInView, loadPerimeter, seesStudent } from '../../_lib/perimeter';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const access = await requireTeacher(request);
  if (access instanceof Response) return access;

  // Il perimetro (_lib/perimeter.ts): un docente vede la palestra dei suoi
  // studenti, il super-admin di tutti.
  const p = await loadPerimeter(request, access);
  if (p instanceof Response) return p;

  try {
    const rows = (await listAllProgress(env)).filter((r) => seesStudent(p, r.user_id));

    // Mappa userId → classi approvate, da AUTH. Per il super-admin degrada a
    // vuoto se muto: nessuna classe, ma i progressi si vedono lo stesso.
    const roster = p.roster;
    const registry = roster ? rosterStudents(roster).map((s) => ({ ...s, classes: classesInView(p, s.classes) })) : [];
    const classesByUser = new Map(registry.filter((u) => u.classes.length).map((u) => [u.id, u.classes]));

    const students = rows.map((r) => {
      let progress: unknown = null;
      try {
        progress = JSON.parse(r.data);
      } catch {
        progress = null;
      }
      return {
        userId: r.user_id,
        name: r.full_name || r.email,
        email: r.email,
        classes: classesByUser.get(r.user_id) ?? [],
        progress,
        updatedAt: r.updated_at as string | null,
      };
    });

    // Anche chi non si è mai allenato: in classifica c'è, a zero XP, così
    // il docente vede chi manca all'appello invece di una classe più corta.
    const withProgress = new Set(rows.map((r) => r.user_id));
    for (const u of registry) {
      if (withProgress.has(u.id) || u.classes.length === 0) continue;
      students.push({ userId: u.id, name: u.name, email: u.email, classes: u.classes, progress: null, updatedAt: null });
    }

    // Elenco classi presenti, per popolare il selettore senza una seconda chiamata.
    const classSet = new Set<string>();
    for (const s of students) for (const c of s.classes) classSet.add(c);

    return jsonOk({ students, classes: sortClasses(classSet), nomi: knownNames(registry) });
  } catch (e) {
    return jsonError(500, `Errore DB: ${e instanceof Error ? e.message : String(e)}`);
  }
};
