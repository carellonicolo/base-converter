/**
 * GET /api/teacher/exams        → catalogo delle verifiche (il pool).
 * GET /api/teacher/exams?id=ID  → anteprima completa CON le soluzioni.
 * GET /api/teacher/exams?id=ID&seed=N → riestrae l'anteprima con un altro seed.
 *
 * Solo docente. L'anteprima mostra le risposte: è ciò che permette al prof di
 * "visionare la verifica in ogni momento" come in CCNA1. Nessuna soluzione
 * esce mai da questo endpoint verso uno studente (il gate è requireTeacher).
 */
import { jsonOk, jsonError, requireTeacher, type Env } from '../../_lib/shared';
import { EXAMS, findExam } from '../../../shared/exam/catalog';
import { configFromSpec } from '../../../shared/exam/config';
import { buildExam } from '../../../shared/exam/config';

export const onRequestGet: PagesFunction<Env> = async ({ request }) => {
  const access = await requireTeacher(request);
  if (access instanceof Response) return access;

  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  if (!id) {
    // Il catalogo: dati statici, nessun accesso al DB.
    return jsonOk({
      exams: EXAMS.map((e) => ({
        id: e.id,
        topic: e.topic,
        level: e.level,
        modules: e.modules,
        difficulty: e.difficulty,
        questionCount: e.questionCount,
        durationMin: e.durationMin,
        passGrade: e.passGrade,
      })),
    });
  }

  const spec = findExam(id);
  if (!spec) return jsonError(404, 'Verifica non trovata.', 'not_found');

  // Seed d'anteprima: se non specificato, uno stabile derivato dall'id, così
  // riaprendo la stessa verifica il prof rivede la stessa estrazione.
  const seedParam = Number(url.searchParams.get('seed'));
  const seed = Number.isFinite(seedParam) && seedParam > 0 ? Math.floor(seedParam) : stableSeed(id);

  const config = configFromSpec(spec);
  const exercises = buildExam(config, seed);

  return jsonOk({
    exam: {
      id: spec.id,
      topic: spec.topic,
      level: spec.level,
      modules: spec.modules,
      difficulty: spec.difficulty,
      questionCount: spec.questionCount,
      durationMin: spec.durationMin,
      passGrade: spec.passGrade,
    },
    seed,
    // Con le soluzioni: questa è un'anteprima per il docente.
    questions: exercises.map((ex, i) => ({
      index: i,
      module: ex.module,
      kind: ex.kind,
      params: ex.params,
      points: ex.points,
      answer: ex.answer,
    })),
  });
};

/** Hash stabile id→seed positivo, così l'anteprima non cambia a ogni apertura. */
function stableSeed(id: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return (h % 2_000_000_000) + 1;
}
