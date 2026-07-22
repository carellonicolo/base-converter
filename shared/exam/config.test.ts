import { describe, it, expect } from 'vitest';
import { parseConfig, buildExam, computeGrade, gradeExam, DEFAULT_CONFIG } from './config';
import { MODULES } from '../exercises/generator';

describe('parseConfig', () => {
  it('falls back to safe defaults on garbage', () => {
    const c = parseConfig(null);
    expect(c.durationMin).toBe(DEFAULT_CONFIG.durationMin);
    expect(c.questionCount).toBe(DEFAULT_CONFIG.questionCount);
    expect(c.modules.length).toBeGreaterThan(0);
  });

  it('clamps out-of-range numbers', () => {
    expect(parseConfig({ durationMin: 99999 }).durationMin).toBe(240);
    expect(parseConfig({ durationMin: -5 }).durationMin).toBe(1);
    expect(parseConfig({ questionCount: 1000 }).questionCount).toBe(50);
    expect(parseConfig({ passGrade: 42 }).passGrade).toBe(10);
    expect(parseConfig({ passGrade: -3 }).passGrade).toBe(0);
  });

  it('drops unknown modules and never leaves an empty list', () => {
    expect(parseConfig({ modules: ['converter', 'nope'] }).modules).toEqual(['converter']);
    expect(parseConfig({ modules: ['nope'] }).modules).toEqual([...MODULES]);
  });

  it('only accepts known difficulties', () => {
    expect(parseConfig({ difficulty: 'hard' }).difficulty).toBe('hard');
    expect(parseConfig({ difficulty: 'impossible' }).difficulty).toBe('medium');
  });
});

describe('computeGrade', () => {
  it('is linear and rounded to 0.25 (stessa scala di CCNA1/VLSM)', () => {
    expect(computeGrade(0)).toBe(0);
    expect(computeGrade(1)).toBe(10);
    expect(computeGrade(0.6)).toBe(6);
    expect(computeGrade(0.5)).toBe(5);
    expect(computeGrade(0.77)).toBe(7.75);
  });

  it('never leaves [0, 10]', () => {
    expect(computeGrade(-1)).toBe(0);
    expect(computeGrade(2)).toBe(10);
  });
});

describe('buildExam', () => {
  it('rebuilds the identical exam from the same seed', () => {
    const cfg = parseConfig({ questionCount: 10, difficulty: 'medium' });
    expect(buildExam(cfg, 4242)).toEqual(buildExam(cfg, 4242));
  });

  it('produces the configured number of questions', () => {
    const cfg = parseConfig({ questionCount: 7 });
    expect(buildExam(cfg, 1)).toHaveLength(7);
  });
});

describe('gradeExam', () => {
  const cfg = parseConfig({ questionCount: 10, difficulty: 'easy', passGrade: 6 });
  const seed = 24680;

  it('gives full marks when every answer is right', () => {
    const exam = buildExam(cfg, seed);
    const out = gradeExam(cfg, seed, exam.map((e) => e.answer));
    expect(out.correctCount).toBe(10);
    expect(out.grade).toBe(10);
    expect(out.passed).toBe(true);
    expect(out.score).toBe(out.maxScore);
  });

  it('gives zero when everything is blank', () => {
    const out = gradeExam(cfg, seed, new Array(10).fill(''));
    expect(out.correctCount).toBe(0);
    expect(out.grade).toBe(0);
    expect(out.passed).toBe(false);
  });

  it('treats missing answers as blank rather than crashing', () => {
    const out = gradeExam(cfg, seed, []);
    expect(out.totalCount).toBe(10);
    expect(out.correctCount).toBe(0);
  });

  it('scores partially and weights by points', () => {
    const exam = buildExam(cfg, seed);
    const answers = exam.map((e, i) => (i < 5 ? e.answer : 'sbagliato'));
    const out = gradeExam(cfg, seed, answers);
    expect(out.correctCount).toBe(5);
    const expectedScore = exam.slice(0, 5).reduce((s, e) => s + e.points, 0);
    expect(out.score).toBe(expectedScore);
    expect(out.grade).toBeGreaterThan(0);
    expect(out.grade).toBeLessThan(10);
  });

  it('reports the expected answer for every question (per la revisione)', () => {
    const exam = buildExam(cfg, seed);
    const out = gradeExam(cfg, seed, new Array(10).fill(''));
    expect(out.questions).toHaveLength(10);
    out.questions.forEach((q, i) => {
      expect(q.expected).toBe(exam[i].answer);
      expect(q.correct).toBe(false);
      expect(q.earned).toBe(0);
    });
  });

  it('respects a custom pass threshold', () => {
    const strict = parseConfig({ questionCount: 10, difficulty: 'easy', passGrade: 8 });
    const exam = buildExam(strict, seed);
    const answers = exam.map((e, i) => (i < 7 ? e.answer : ''));
    const out = gradeExam(strict, seed, answers);
    expect(out.passed).toBe(out.grade >= 8);
  });

  it('is stable: grading twice gives the same result', () => {
    const answers = new Array(10).fill('x');
    expect(gradeExam(cfg, seed, answers)).toEqual(gradeExam(cfg, seed, answers));
  });

  it('ignores extra answers beyond the question count', () => {
    const exam = buildExam(cfg, seed);
    const answers = [...exam.map((e) => e.answer), 'extra', 'extra'];
    const out = gradeExam(cfg, seed, answers);
    expect(out.totalCount).toBe(10);
    expect(out.correctCount).toBe(10);
  });
});
