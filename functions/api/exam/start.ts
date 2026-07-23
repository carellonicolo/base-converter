/**
 * POST /api/exam/start — avvia (o riprende) la verifica assegnata.
 *
 * Il seed è generato QUI (server) e salvato: la prova si ricostruisce identica
 * per la correzione e la revisione senza salvare il testo delle domande. Al
 * client vanno solo le consegne, mai le risposte attese.
 */
import { jsonOk, jsonError, requireExamAccess, type Env } from '../../_lib/shared';
import { findOpenAssignment, findAttemptForAssignment, createAttempt } from '../../_lib/examdb';
import { buildExam, configFromSpec } from '../../../shared/exam/config';
import { findExam } from '../../../shared/exam/catalog';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const access = await requireExamAccess(request);
  if (access instanceof Response) return access;
  if (access.isTeacher) return jsonError(403, 'Il docente non svolge le verifiche.', 'teacher');

  try {
    const assignment = await findOpenAssignment(env, access.classes);
    if (!assignment) return jsonError(403, 'Nessuna verifica assegnata alla tua classe.', 'not_assigned');

    const spec = findExam(assignment.exam_id);
    if (!spec) return jsonError(409, 'La verifica assegnata non è più disponibile.', 'stale_exam');
    const config = configFromSpec(spec, assignment.duration_min);

    const existing = await findAttemptForAssignment(env, access.identity.userId, assignment.id);
    // Già consegnata: non si ripete.
    if (existing?.submitted_at) return jsonError(409, 'Hai già svolto questa verifica.', 'already_done');
    // In corso: si riprende.
    if (existing) return jsonOk({ resumed: true, id: existing.id });

    const seed = Math.floor(Math.random() * 2_000_000_000);
    const id = crypto.randomUUID();
    const cls = assignment.class;
    await createAttempt(env, id, access.identity, cls, seed, config, assignment.id, spec.id);

    const questions = buildExam(config, seed).map((ex, i) => ({
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
      config: {
        durationMin: config.durationMin,
        questionCount: config.questionCount,
        modules: config.modules,
        difficulty: config.difficulty,
        passGrade: config.passGrade,
      },
      questions,
    });
  } catch (e) {
    return jsonError(500, `Errore DB: ${e instanceof Error ? e.message : String(e)}`);
  }
};
