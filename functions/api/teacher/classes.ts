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
 */
import { jsonOk, jsonError, requireTeacher, type Env } from '../../_lib/shared';
import { listKnownClasses } from '../../_lib/examdb';
import { fetchRoster, rosterClasses } from '../../_lib/roster';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const access = await requireTeacher(request);
  if (access instanceof Response) return access;

  const roster = await fetchRoster(request);
  let classes: string[] = roster ? rosterClasses(roster) : [];
  let source = roster ? 'auth' : 'fallback';

  // AUTH muto o senza classi: usa quelle note dal DB così la console resta usabile.
  if (classes.length === 0) {
    try {
      classes = await listKnownClasses(env);
      if (source === 'auth') source = 'db';
    } catch (e) {
      return jsonError(500, `Errore DB: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return jsonOk({ classes, source });
};
