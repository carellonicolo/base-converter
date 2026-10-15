/**
 * Quale verifica ha davanti uno studente, adesso.
 *
 * Una sola funzione per /api/exam/state e /api/exam/start, così ciò che lo
 * studente vede e ciò che il server gli lascia iniziare non possono
 * divergere. L'ordine conta:
 *
 *  1. le prove abbandonate oltre la scadenza le consegna il server;
 *  2. una prova IN CORSO si riprende, anche se nel frattempo l'assegnazione
 *     si è chiusa o la finestra è scaduta: chi l'ha iniziata la porta a
 *     termine;
 *  3. fra le assegnazioni aperte (della classe o personali) vale la più
 *     recente non ancora svolta (shared/exam/assignments.ts);
 *  4. se le ha svolte tutte, si mostra l'esito dell'ultima.
 */
import type { Env } from './shared';
import {
  attemptStatesFor,
  finalizeAbandoned,
  findAttemptForAssignment,
  findOpenAttempt,
  getAssignment,
  listOpenAssignmentsFor,
  type AssignmentRow,
  type AttemptRow,
} from './examdb';
import { pickAssignment } from '../../shared/exam/assignments';
import { configFromSpec, type ExamConfig } from '../../shared/exam/config';
import { findExam, type ExamSpec } from '../../shared/exam/catalog';

export type Current =
  | { kind: 'running'; attempt: AttemptRow; assignment: AssignmentRow | null; spec: ExamSpec | null }
  | { kind: 'ready'; assignment: AssignmentRow; spec: ExamSpec; config: ExamConfig }
  | { kind: 'done'; assignment: AssignmentRow; spec: ExamSpec; attempt: AttemptRow | null }
  | { kind: 'stale'; assignment: AssignmentRow }
  | { kind: 'none' };

export async function resolveCurrent(env: Env, userId: string, classes: string[]): Promise<Current> {
  await finalizeAbandoned(env, userId);

  const running = await findOpenAttempt(env, userId);
  if (running) {
    const assignment = running.assignment_id ? await getAssignment(env, running.assignment_id) : null;
    return { kind: 'running', attempt: running, assignment, spec: running.exam_id ? findExam(running.exam_id) : null };
  }

  const open = await listOpenAssignmentsFor(env, userId, classes);
  const states = await attemptStatesFor(env, userId, open.map((a) => a.id));
  const pick = pickAssignment(open, states, Date.now());
  if (!pick) return { kind: 'none' };

  const spec = findExam(pick.assignment.exam_id);
  if (!spec) return { kind: 'stale', assignment: pick.assignment };
  if (pick.attempt === null) {
    return { kind: 'ready', assignment: pick.assignment, spec, config: configFromSpec(spec, pick.assignment.duration_min) };
  }
  const attempt = await findAttemptForAssignment(env, userId, pick.assignment.id);
  return { kind: 'done', assignment: pick.assignment, spec, attempt };
}
