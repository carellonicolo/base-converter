/**
 * POST /api/exam/start — avvia (o riprende) la verifica assegnata.
 *
 * Il seed è generato QUI (server) e salvato: la prova si ricostruisce identica
 * per la correzione e la revisione senza salvare il testo delle domande. Al
 * client vanno solo le consegne, mai le risposte attese.
 *
 * La scadenza si fissa alla nascita della prova e non si sposta: la finestra
 * dell'assegnazione decide fino a quando si può INIZIARE, non quanto dura.
 */
import { jsonOk, jsonError, requireExamAccess, type Env } from '../../_lib/shared';
import { resolveCurrent } from '../../_lib/current';
import { createAttempt } from '../../_lib/examdb';
import { buildExam } from '../../../shared/exam/config';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const access = await requireExamAccess(request);
  if (access instanceof Response) return access;
  if (access.isTeacher) return jsonError(403, 'Il docente non svolge le verifiche.', 'teacher');

  try {
    const cur = await resolveCurrent(env, access.identity.userId, access.classes);
    switch (cur.kind) {
      case 'none':
        return jsonError(403, 'Nessuna verifica assegnata alla tua classe.', 'not_assigned');
      case 'stale':
        return jsonError(409, 'La verifica assegnata non è più disponibile.', 'stale_exam');
      case 'done':
        return jsonError(409, 'Hai già svolto questa verifica.', 'already_done');
      case 'running':
        // In corso: si riprende (il client ricarica lo stato completo).
        return jsonOk({ resumed: true, id: cur.attempt.id });
      case 'ready': {
        const { assignment, spec, config } = cur;
        const seed = Math.floor(Math.random() * 2_000_000_000);
        const id = crypto.randomUUID();
        // La classe con cui la prova compare in console: quella
        // dell'assegnazione; per un'assegnazione personale, quella dello
        // studente.
        const cls = assignment.target_type === 'student' ? access.classes[0] ?? (assignment.class || null) : assignment.class;
        const { startedAt, deadline } = await createAttempt(env, id, access.identity, cls, seed, config, assignment.id, spec.id);

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
          startedAt,
          deadline,
          config: {
            durationMin: config.durationMin,
            questionCount: config.questionCount,
            modules: config.modules,
            difficulty: config.difficulty,
            passGrade: config.passGrade,
          },
          questions,
        });
      }
    }
  } catch (e) {
    return jsonError(500, `Errore DB: ${e instanceof Error ? e.message : String(e)}`);
  }
};
