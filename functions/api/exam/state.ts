/**
 * GET /api/exam/state — stato della verifica per lo studente loggato.
 *
 * La verifica del giorno è l'ASSEGNAZIONE aperta per una delle sue classi.
 * Ritorna cosa deve fare (senza risposte!) e l'eventuale tentativo in corso o
 * già consegnato, così un refresh non fa perdere la prova né permette di
 * rifarla.
 */
import { jsonOk, jsonError, requireExamAccess, type Env } from '../../_lib/shared';
import { findOpenAssignment, findAttemptForAssignment } from '../../_lib/examdb';
import { buildExam, parseConfig, configFromSpec } from '../../../shared/exam/config';
import { findExam } from '../../../shared/exam/catalog';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const access = await requireExamAccess(request);
  if (access instanceof Response) return access;

  try {
    const cls = access.classes[0] ?? null;
    const user = {
      name: access.identity.name,
      email: access.identity.email,
      class: cls,
      isTeacher: access.isTeacher,
    };

    const assignment = await findOpenAssignment(env, access.classes);
    if (!assignment) {
      // Nessuna verifica assegnata: stato esplicito, non un errore.
      return jsonOk({ user, assigned: false, current: null, submitted: null });
    }

    const spec = findExam(assignment.exam_id);
    if (!spec) {
      // Il catalogo non ha più questa verifica: meglio dirlo che generare a caso.
      return jsonOk({ user, assigned: false, current: null, submitted: null, staleExam: true });
    }
    const config = configFromSpec(spec, assignment.duration_min);

    const existing = await findAttemptForAssignment(env, access.identity.userId, assignment.id);

    // Già consegnata: non si ripete.
    if (existing?.submitted_at) {
      return jsonOk({
        user,
        assigned: true,
        exam: examMeta(spec),
        current: null,
        submitted: { grade: existing.grade, correctCount: existing.correct_count, totalCount: existing.total_count },
      });
    }

    // Tentativo in corso: si riprende dallo stesso punto.
    let current = null;
    if (existing) {
      const cfg = parseConfig(JSON.parse(existing.config));
      const deadline = new Date(new Date(existing.started_at).getTime() + cfg.durationMin * 60_000).toISOString();
      current = {
        id: existing.id,
        startedAt: existing.started_at,
        deadline,
        config: publicConfig(cfg),
        questions: buildExam(cfg, existing.seed).map((ex, i) => ({
          index: i,
          module: ex.module,
          kind: ex.kind,
          params: ex.params,
          points: ex.points,
        })),
        answers: safeParseArray(existing.answers),
      };
    }

    return jsonOk({
      user,
      assigned: true,
      exam: examMeta(spec),
      config: publicConfig(config),
      current,
      submitted: null,
    });
  } catch (e) {
    return jsonError(500, `Errore DB: ${e instanceof Error ? e.message : String(e)}`);
  }
};

function examMeta(spec: NonNullable<ReturnType<typeof findExam>>) {
  return { id: spec.id, topic: spec.topic, level: spec.level, modules: spec.modules };
}

function publicConfig(cfg: { durationMin: number; questionCount: number; modules: string[]; difficulty: string; passGrade: number }) {
  return {
    durationMin: cfg.durationMin,
    questionCount: cfg.questionCount,
    modules: cfg.modules,
    difficulty: cfg.difficulty,
    passGrade: cfg.passGrade,
  };
}

function safeParseArray(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.map((x) => (x == null ? '' : String(x))) : [];
  } catch {
    return [];
  }
}
