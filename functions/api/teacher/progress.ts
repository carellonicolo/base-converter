/**
 * GET /api/teacher/progress — progressi della palestra di ogni studente.
 *
 * Il dato grezzo è già in bc_progress (una riga per studente che ha salvato).
 * Qui si incrocia con le classi da AUTH — bc_progress non le memorizza — così
 * il docente può filtrare per classe. Se AUTH non risponde gli studenti
 * restano senza classe (finiscono nella vista "Tutte").
 *
 * La MATEMATICA (livello, precisione, badge) NON viene fatta qui: si mandano i
 * progressi grezzi e li elabora il client, che possiede già quelle funzioni
 * (src/lib/progress.ts) usate anche dallo studente. Un'unica fonte di verità.
 *
 * Solo docente.
 */
import { jsonOk, jsonError, requireTeacher, type Env } from '../../_lib/shared';
import { listAllProgress } from '../../_lib/examdb';

const AUTH_ORIGIN = 'https://auth.nicolocarello.it';

interface AuthUsers {
  users?: { id?: string; enrollments?: { classe?: string; approved?: boolean }[] }[];
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const access = await requireTeacher(request);
  if (access instanceof Response) return access;

  try {
    const rows = await listAllProgress(env);

    // Mappa userId → classi approvate, da AUTH. Degrada a vuoto se muto.
    const classesByUser = new Map<string, string[]>();
    try {
      const res = await fetch(`${AUTH_ORIGIN}/api/admin/users`, { headers: { cookie: request.headers.get('cookie') ?? '' } });
      if (res.ok) {
        const data = (await res.json()) as AuthUsers;
        for (const u of data.users ?? []) {
          if (!u.id) continue;
          const cls = (u.enrollments ?? []).filter((e) => e.approved && e.classe).map((e) => e.classe as string);
          if (cls.length) classesByUser.set(u.id, cls);
        }
      }
    } catch {
      /* AUTH non raggiungibile: nessuna classe, ma i progressi si vedono lo stesso. */
    }

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
        updatedAt: r.updated_at,
      };
    });

    // Elenco classi presenti, per popolare il selettore senza una seconda chiamata.
    const classSet = new Set<string>();
    for (const s of students) for (const c of s.classes) classSet.add(c);

    return jsonOk({ students, classes: [...classSet].sort() });
  } catch (e) {
    return jsonError(500, `Errore DB: ${e instanceof Error ? e.message : String(e)}`);
  }
};
