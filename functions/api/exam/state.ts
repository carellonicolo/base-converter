/**
 * GET /api/exam/state — stato della verifica per lo studente loggato.
 *
 * La verifica è l'ASSEGNAZIONE aperta per una delle sue classi o per lui
 * personalmente (vedi _lib/current.ts). Ritorna cosa deve fare (senza
 * risposte!) e l'eventuale tentativo in corso o già svolto, così un refresh
 * non fa perdere la prova né permette di rifarla.
 */
import { jsonOk, jsonError, requireExamAccess, type Env } from '../../_lib/shared';
import { resolveCurrent } from '../../_lib/current';
import { deadlineOf, savedAnswers } from '../../_lib/examdb';
import { buildExam, parseConfig, type ExamConfig } from '../../../shared/exam/config';
import { parseFocusEvents } from '../../../shared/exam/assignments';
import type { ExamSpec } from '../../../shared/exam/catalog';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const access = await requireExamAccess(request);
  if (access instanceof Response) return access;

  try {
    const user = {
      name: access.identity.name,
      email: access.identity.email,
      class: access.classes[0] ?? null,
      isTeacher: access.isTeacher,
    };
    if (access.isTeacher) return jsonOk({ user, assigned: false, current: null, submitted: null });

    const cur = await resolveCurrent(env, access.identity.userId, access.classes);

    switch (cur.kind) {
      case 'none':
        // Nessuna verifica assegnata: stato esplicito, non un errore.
        return jsonOk({ user, assigned: false, current: null, submitted: null });

      case 'stale':
        // Il catalogo non ha più questa verifica: meglio dirlo che generare a caso.
        return jsonOk({ user, assigned: false, current: null, submitted: null, staleExam: true });

      case 'done': {
        const a = cur.attempt;
        return jsonOk({
          user,
          assigned: true,
          exam: examMeta(cur.spec),
          current: null,
          submitted: a
            ? {
                state: a.state,
                grade: a.grade,
                correctCount: a.correct_count,
                totalCount: a.total_count,
                annulledReason: a.annulled_reason,
              }
            : null,
        });
      }

      case 'ready':
        return jsonOk({
          user,
          assigned: true,
          exam: examMeta(cur.spec),
          config: publicConfig(cur.config),
          openUntil: cur.assignment.open_until,
          current: null,
          submitted: null,
        });

      case 'running': {
        const a = cur.attempt;
        const cfg = parseConfig(JSON.parse(a.config));
        return jsonOk({
          user,
          assigned: true,
          exam: cur.spec ? examMeta(cur.spec) : undefined,
          config: publicConfig(cfg),
          current: {
            id: a.id,
            startedAt: a.started_at,
            deadline: new Date(deadlineOf(a)).toISOString(),
            config: publicConfig(cfg),
            questions: buildExam(cfg, a.seed).map((ex, i) => ({
              index: i,
              module: ex.module,
              kind: ex.kind,
              params: ex.params,
              points: ex.points,
            })),
            answers: savedAnswers(a.answers, cfg.questionCount),
            // Le distrazioni già registrate: dopo un ricaricamento il
            // conteggio riparte da qui, non da zero.
            focusEvents: parseFocusEvents(a.focus_events),
            awayEvents: a.away_events,
            awayMs: a.away_ms,
            fullscreenExits: a.fullscreen_exits ?? 0,
          },
          submitted: null,
        });
      }
    }
  } catch (e) {
    return jsonError(500, `Errore DB: ${e instanceof Error ? e.message : String(e)}`);
  }
};

function examMeta(spec: ExamSpec) {
  return { id: spec.id, topic: spec.topic, level: spec.level, modules: spec.modules };
}

function publicConfig(cfg: ExamConfig) {
  return {
    durationMin: cfg.durationMin,
    questionCount: cfg.questionCount,
    modules: cfg.modules,
    difficulty: cfg.difficulty,
    passGrade: cfg.passGrade,
  };
}
