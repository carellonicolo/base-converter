/**
 * GET /api/teacher/classes — elenco delle classi a cui assegnare una verifica.
 *
 * Le classi arrivano da AUTH (la fonte di verità delle iscrizioni), leggendo
 * l'elenco utenti del docente e raccogliendo le classi approvate. Così il prof
 * SCEGLIE da un elenco invece di digitare il nome: scriverlo a mano è metà del
 * guasto per cui una verifica finiva assegnata a una classe inesistente.
 *
 * Se AUTH non risponde si ripiega sulle classi già viste nei tentativi e nelle
 * assegnazioni, per non lasciare la console senza scelte.
 *
 * Un docente vede solo le sue classi, `teacherClasses` dell'IdP (vedi
 * _lib/perimeter.ts), anche quelle che non hanno ancora studenti; il
 * super-admin le vede tutte.
 */
import { jsonOk, jsonError, requireTeacher, type Env } from '../../_lib/shared';
import { listKnownClasses } from '../../_lib/examdb';
import { rosterClasses } from '../../_lib/roster';
import { loadPerimeter, visibleClasses } from '../../_lib/perimeter';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const access = await requireTeacher(request);
  if (access instanceof Response) return access;

  // Le classi di un docente le dice `teacherClasses`, non il registro: qui
  // il registro serve solo a scriverle come le scrive lui.
  const p = await loadPerimeter(request, access, { rosterOptional: true });
  if (p instanceof Response) return p;
  const roster = p.roster;
  let known: string[] = roster ? rosterClasses(roster) : [];
  let source = roster ? 'auth' : 'fallback';

  // AUTH muto o senza classi: usa quelle note dal DB così la console resta usabile.
  if (known.length === 0) {
    try {
      known = await listKnownClasses(env);
      if (source === 'auth') source = 'db';
    } catch (e) {
      return jsonError(500, `Errore DB: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // `scope`: 'own' = solo le classi del docente; la console allora non
  // propone di scrivere a mano il nome di un'altra classe.
  return jsonOk({ classes: visibleClasses(p, known), source, scope: p.superAdmin ? 'all' : 'own' });
};
