/**
 * POST /api/exam/start — avvia una verifica.
 *
 * Il seed è generato QUI (server) e salvato: la prova può essere ricostruita
 * identica per la correzione e la revisione senza salvare il testo delle
 * domande. Al client vanno solo le consegne, mai le risposte attese.
 */
import { jsonOk, jsonError, requireExamAccess, type Env } from '../../_lib/shared';
import { resolveConfig, findOpenAttempt, createAttempt, getExamsEnabled } from '../../_lib/examdb';
import { buildExam } from '../../../shared/exam/config';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const access = await requireExamAccess(request);
  if (access instanceof Response) return access;
  if (access.isTeacher) return jsonError(403, 'Il docente non svolge le verifiche.', 'teacher');

  try {
    if (!(await getExamsEnabled(env))) {
      return jsonError(403, 'Le verifiche non sono attive.', 'disabled');
    }
    const resolved = await resolveConfig(env, access.classes);
    if (!resolved.config.enabled) {
      return jsonError(403, 'La tua classe non ha una verifica attiva.', 'disabled_class');
    }

    // Un tentativo aperto esiste già → lo si riprende invece di crearne un altro.
    const open = await findOpenAttempt(env, access.identity.userId);
    if (open) return jsonOk({ resumed: true, id: open.id });

    const seed = Math.floor(Math.random() * 2_000_000_000);
    const id = crypto.randomUUID();
    const cls = access.classes[0] ?? null;
    await createAttempt(env, id, access.identity, cls, seed, resolved.config);

    const questions = buildExam(resolved.config, seed).map((ex, i) => ({
      index: i,
      module: ex.module,
      kind: ex.kind,
      params: ex.params,
      points: ex.points,
    }));

    return jsonOk({
      resumed: false,
      id,
      startedAt: new Date().toISOString(),
      config: resolved.config,
      questions,
    });
  } catch (e) {
    return jsonError(500, `Errore DB: ${e instanceof Error ? e.message : String(e)}`);
  }
};
