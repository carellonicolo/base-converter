/**
 * GET /api/exam/state — stato della verifica per lo studente loggato.
 *
 * Ritorna la configurazione applicabile (senza risposte!) e l'eventuale
 * tentativo già in corso, così un refresh della pagina non fa perdere la prova.
 */
import { jsonOk, jsonError, requireExamAccess, type Env } from '../../_lib/shared';
import { resolveConfig, findOpenAttempt, getExamsEnabled } from '../../_lib/examdb';
import { buildExam, parseConfig } from '../../../shared/exam/config';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const access = await requireExamAccess(request);
  if (access instanceof Response) return access;

  try {
    const globallyEnabled = await getExamsEnabled(env);
    const resolved = await resolveConfig(env, access.classes);
    const cls = access.classes[0] ?? null;

    const open = await findOpenAttempt(env, access.identity.userId);
    let current = null;
    if (open) {
      const cfg = parseConfig(JSON.parse(open.config));
      const deadline = new Date(new Date(open.started_at).getTime() + cfg.durationMin * 60_000).toISOString();
      current = {
        id: open.id,
        startedAt: open.started_at,
        deadline,
        config: cfg,
        // Le domande SENZA risposta attesa.
        questions: buildExam(cfg, open.seed).map((ex, i) => ({
          index: i,
          module: ex.module,
          kind: ex.kind,
          params: ex.params,
          points: ex.points,
        })),
        answers: safeParseArray(open.answers),
      };
    }

    return jsonOk({
      user: {
        name: access.identity.name,
        email: access.identity.email,
        class: cls,
        isTeacher: access.isTeacher,
      },
      enabled: globallyEnabled && resolved.config.enabled,
      config: {
        durationMin: resolved.config.durationMin,
        questionCount: resolved.config.questionCount,
        modules: resolved.config.modules,
        difficulty: resolved.config.difficulty,
        passGrade: resolved.config.passGrade,
      },
      current,
    });
  } catch (e) {
    return jsonError(500, `Errore DB: ${e instanceof Error ? e.message : String(e)}`);
  }
};

function safeParseArray(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.map((x) => (x == null ? '' : String(x))) : [];
  } catch {
    return [];
  }
}
