/**
 * Il catalogo è coerente e ogni verifica genera una prova valida e ricostruibile.
 *
 * "Ricostruibile" è la proprietà da cui dipendono correzione e revisione: la
 * stessa config + lo stesso seed devono dare esattamente gli stessi esercizi,
 * altrimenti si correggerebbe una prova diversa da quella somministrata.
 */
import { describe, it, expect } from 'vitest';
import { EXAMS, TOPICS, findExam, examsByTopic } from './catalog';
import { configFromSpec, buildExam, gradeExam } from './config';

describe('catalogo', () => {
  it('ha i sette argomenti richiesti, ciascuno in tre livelli', () => {
    expect(TOPICS).toHaveLength(7);
    for (const topic of TOPICS) {
      const levels = examsByTopic(topic).map((e) => e.level).sort();
      expect(levels).toEqual([1, 2, 3]);
    }
  });

  it('gli id sono unici', () => {
    const ids = EXAMS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('findExam trova le voci esistenti e ignora le altre', () => {
    expect(findExam('binary-1')?.topic).toBe('binary');
    expect(findExam('twos-3')?.level).toBe(3);
    expect(findExam('inesistente')).toBeNull();
  });

  it('ogni verifica genera esattamente il numero di domande dichiarato', () => {
    for (const spec of EXAMS) {
      const config = configFromSpec(spec);
      const exercises = buildExam(config, 4242);
      expect(exercises).toHaveLength(spec.questionCount);
      expect(exercises.every((ex) => spec.modules.includes(ex.module))).toBe(true);
    }
  });

  it('è deterministico: stesso seed → stessa prova', () => {
    for (const spec of EXAMS.slice(0, 5)) {
      const config = configFromSpec(spec);
      const a = buildExam(config, 999).map((e) => e.answer);
      const b = buildExam(config, 999).map((e) => e.answer);
      expect(a).toEqual(b);
    }
  });

  it('rispondendo con le soluzioni si prende 10, sbagliando tutto si prende 0', () => {
    for (const spec of EXAMS) {
      const config = configFromSpec(spec);
      const seed = 7;
      const exercises = buildExam(config, seed);
      const perfect = gradeExam(config, seed, exercises.map((e) => e.answer));
      expect(perfect.grade).toBe(10);
      expect(perfect.correctCount).toBe(spec.questionCount);

      const zero = gradeExam(config, seed, exercises.map(() => ''));
      expect(zero.grade).toBe(0);
      expect(zero.correctCount).toBe(0);
    }
  });

  it('la durata può essere sovrascritta e resta nei limiti', () => {
    const spec = findExam('binary-1')!;
    expect(configFromSpec(spec, 15).durationMin).toBe(15);
    expect(configFromSpec(spec, 99999).durationMin).toBe(240);
    expect(configFromSpec(spec, null).durationMin).toBe(spec.durationMin);
  });
});
