/**
 * Il client delle API della console docente: tipi e chiamate in un posto
 * solo. Le forme rispecchiano functions/_lib/views.ts.
 */
import { authFetch, type ApiResult } from './auth';
import { registerNames } from './names';
import type { TopicKey, Level } from '../../shared/exam/catalog';
import type { AssignmentState, FocusEvent, TargetType } from '../../shared/exam/assignments';
import type { CategoryStat } from '../../shared/exam/analysis';
import type { QuestionOutcome } from '../../shared/exam/config';

export interface ExamRef {
  id: string;
  topic: TopicKey;
  level: Level;
  questionCount: number;
  durationMin: number;
  passGrade: number;
}

export interface CatalogExam {
  id: string;
  topic: TopicKey;
  level: Level;
  modules: string[];
  difficulty: string;
  questionCount: number;
  durationMin: number;
  passGrade: number;
}

export interface SessionSummary {
  id: string;
  examId: string;
  exam: ExamRef | null;
  missing: boolean;
  class: string;
  targetType: TargetType;
  studentId: string | null;
  studentName: string | null;
  status: string;
  state: AssignmentState;
  openUntil: string | null;
  reopenedAt: string | null;
  durationMin: number | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  attempts: number;
  submitted: number;
  live: number;
  annulled: number;
  avgGrade: number | null;
  passed: number;
  enrolled: number | null;
}

export type AttemptState = 'in_corso' | 'consegnata' | 'annullata';

export interface AttemptSummary {
  id: string;
  studentId: string;
  name: string;
  email: string;
  class: string | null;
  assignmentId: string | null;
  examId: string | null;
  exam: ExamRef | null;
  state: AttemptState;
  grade: number | null;
  score: number | null;
  maxScore: number | null;
  correctCount: number;
  totalCount: number;
  awayEvents: number;
  awayMs: number;
  fullscreenExits: number;
  warnings: number;
  startedAt: string;
  deadlineAt: string;
  submittedAt: string | null;
  lastSeenAt: string;
  submitReason: 'volontaria' | 'tempo' | 'server' | null;
  annulledReason: string | null;
}

export interface LiveAttempt extends AttemptSummary {
  answered: number;
  total: number;
}

export interface Enrolled {
  id: string;
  name: string;
  email: string;
}

export interface SessionDetail {
  session: SessionSummary;
  attempts: AttemptSummary[];
  enrolled: Enrolled[] | null;
  analysis: CategoryStat[];
  now: string;
}

export interface TeacherEvent {
  id: number;
  type: 'alert' | 'ammonizione' | 'annulla';
  message: string | null;
  createdAt: string;
}

export interface AttemptDetail {
  attempt: AttemptSummary;
  durationMin: number;
  provisional: boolean;
  outcome: { grade: number; score: number; maxScore: number; correctCount: number; totalCount: number };
  questions: QuestionOutcome[];
  focusEvents: FocusEvent[];
  events: TeacherEvent[];
}

export interface StudentRow {
  id: string;
  name: string;
  email: string;
  status: string;
  classes: string[];
  lastLoginAt: string | null;
  submitted: number;
  annulled: number;
  live: number;
  avgGrade: number | null;
  lastExamAt: string | null;
  xp: number | null;
  gymAt: string | null;
}

export interface StudentDetail {
  student: { id: string; name: string; email: string; classes: string[]; lastLoginAt: string | null };
  attempts: AttemptSummary[];
  progress: unknown;
  progressAt: string | null;
}

export interface ProgressStudentRaw {
  userId: string;
  name: string;
  email: string;
  classes: string[];
  progress: unknown;
  updatedAt: string | null;
}

/** Registra i nomi divisi che la risposta porta con sé, poi la restituisce. */
function withNames<T>(res: ApiResult<T>): ApiResult<T> {
  if (res.ok && res.data) registerNames((res.data as { nomi?: unknown }).nomi);
  return res;
}

const json = (body: unknown, method: string): RequestInit => ({ method, body: JSON.stringify(body) });

export const teacherApi = {
  catalog: () => authFetch<{ exams: CatalogExam[] }>('/api/teacher/exams'),
  classes: () => authFetch<{ classes: string[]; source: string }>('/api/teacher/classes'),
  sessions: () => authFetch<{ assignments: SessionSummary[]; now: string }>('/api/teacher/assignments'),
  session: async (id: string) => withNames(await authFetch<SessionDetail>(`/api/teacher/session?id=${encodeURIComponent(id)}`)),
  assign: (body: {
    examId: string;
    targetType: TargetType;
    class?: string;
    studentId?: string;
    studentName?: string;
    studentClass?: string;
    durationMin: number | null;
    openForMin: number | null;
  }) => authFetch<{ ok: boolean; id: string; closedPrevious: number }>('/api/teacher/assignments', json(body, 'POST')),
  closeSession: (id: string) => authFetch('/api/teacher/assignments', json({ id, action: 'close' }, 'PATCH')),
  reopenSession: (id: string, openForMin: number | null) =>
    authFetch<{ ok: boolean; closedPrevious: number }>('/api/teacher/assignments', json({ id, action: 'reopen', openForMin }, 'PATCH')),
  extendSession: (id: string, minutes: number) => authFetch('/api/teacher/assignments', json({ id, action: 'extend', minutes }, 'PATCH')),
  live: () => authFetch<{ live: LiveAttempt[]; now: string }>('/api/teacher/live'),
  attempt: (id: string) => authFetch<AttemptDetail>(`/api/teacher/attempt?id=${encodeURIComponent(id)}`),
  deleteAttempt: (id: string) => authFetch(`/api/teacher/attempt?id=${encodeURIComponent(id)}`, { method: 'DELETE' }),
  intervene: (attemptId: string, type: TeacherEvent['type'], message: string) =>
    authFetch('/api/teacher/intervene', json({ attemptId, type, message }, 'POST')),
  results: (q: { class?: string; student?: string; all?: boolean }) => {
    const p = new URLSearchParams();
    if (q.class) p.set('class', q.class);
    if (q.student) p.set('student', q.student);
    if (q.all) p.set('state', 'all');
    return authFetch<{ results: AttemptSummary[] }>(`/api/teacher/results?${p}`);
  },
  students: async () => withNames(await authFetch<{ students: StudentRow[]; classes: string[]; source: string }>('/api/teacher/students')),
  student: async (id: string) => withNames(await authFetch<StudentDetail>(`/api/teacher/students?id=${encodeURIComponent(id)}`)),
  progress: async () => withNames(await authFetch<{ students: ProgressStudentRaw[]; classes: string[] }>('/api/teacher/progress')),
};
