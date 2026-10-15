/**
 * Come escono verso la console le righe del DB: un'unica forma per
 * assegnazione e prova, usata da tutti gli endpoint del docente. Così lo
 * Storico, i Risultati, la scheda Studenti e le Sessioni live mostrano gli
 * stessi campi con gli stessi nomi.
 */
import type { AssignmentWithCounts, AttemptRow } from './examdb';
import { deadlineOf, savedAnswers } from './examdb';
import { assignmentState } from '../../shared/exam/assignments';
import { findExam } from '../../shared/exam/catalog';
import { parseConfig } from '../../shared/exam/config';

export function examRef(examId: string | null) {
  const spec = examId ? findExam(examId) : null;
  return spec
    ? { id: spec.id, topic: spec.topic, level: spec.level, questionCount: spec.questionCount, durationMin: spec.durationMin, passGrade: spec.passGrade }
    : null;
}

export function assignmentView(
  a: AssignmentWithCounts,
  nowMs: number,
  grades: (number | null)[],
  enrolled: number | null
) {
  const exam = examRef(a.exam_id);
  const passGrade = exam?.passGrade ?? 6;
  const valid = grades.filter((g): g is number => typeof g === 'number');
  return {
    id: a.id,
    examId: a.exam_id,
    exam,
    missing: !exam,
    class: a.class,
    targetType: a.target_type ?? 'class',
    studentId: a.target_student,
    studentName: a.target_student_name,
    status: a.status,
    state: assignmentState(a, nowMs),
    openUntil: a.open_until,
    reopenedAt: a.reopened_at,
    durationMin: a.duration_min ?? exam?.durationMin ?? null,
    createdBy: a.created_by,
    createdAt: a.created_at,
    updatedAt: a.updated_at,
    attempts: a.attempts,
    submitted: a.submitted,
    live: a.live,
    annulled: a.annulled,
    avgGrade: valid.length ? Math.round((valid.reduce((s, g) => s + g, 0) / valid.length) * 100) / 100 : null,
    passed: valid.filter((g) => g >= passGrade).length,
    enrolled,
  };
}

/** Quante risposte non vuote ha salvato una prova. */
export function answeredCount(row: AttemptRow): { answered: number; total: number } {
  let total = row.total_count;
  try {
    total = parseConfig(JSON.parse(row.config)).questionCount;
  } catch {
    /* il totale salvato */
  }
  return { answered: savedAnswers(row.answers, total).filter((a) => a.trim() !== '').length, total };
}

export function attemptView(row: AttemptRow) {
  const exam = examRef(row.exam_id);
  return {
    id: row.id,
    studentId: row.user_id,
    name: row.full_name || row.email,
    email: row.email,
    class: row.class,
    assignmentId: row.assignment_id,
    examId: row.exam_id,
    exam,
    state: row.state,
    grade: row.grade,
    score: row.score,
    maxScore: row.max_score,
    correctCount: row.correct_count,
    totalCount: row.total_count,
    awayEvents: row.away_events,
    awayMs: row.away_ms,
    fullscreenExits: row.fullscreen_exits ?? 0,
    warnings: row.warnings ?? 0,
    startedAt: row.started_at,
    deadlineAt: new Date(deadlineOf(row)).toISOString(),
    submittedAt: row.submitted_at,
    lastSeenAt: row.last_seen_at,
    submitReason: row.submit_reason,
    annulledReason: row.annulled_reason,
  };
}
