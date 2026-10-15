import { describe, expect, it } from 'vitest';
import { analyzeByCategory, categoryOf } from './analysis';
import type { QuestionOutcome } from './config';

const q = (kind: string, params: Record<string, string | number>, correct: boolean, points = 1): QuestionOutcome => ({
  index: 0,
  module: 'converter',
  kind,
  params,
  given: '',
  expected: '',
  correct,
  points,
  earned: correct ? points : 0,
});

describe('analisi per tipo di esercizio', () => {
  it('il tipo dipende da ciò che cambia la natura, non dai numeri', () => {
    expect(categoryOf(q('conv', { value: '1011', from: 2, to: 10 }, true)).key).toBe('conv:2>10');
    expect(categoryOf(q('conv', { value: '7', from: 2, to: 10 }, true)).key).toBe('conv:2>10');
    expect(categoryOf(q('arith', { a: '1', b: '1', base: 2, op: 'sub' }, true)).key).toBe('arith:sub:2');
    expect(categoryOf(q('signedEncode', { value: -3, bits: 8, repr: 'twos' }, true)).key).toBe('signedEncode:twos');
  });

  it('somma le prove e mette in cima il tipo più sbagliato', () => {
    const stats = analyzeByCategory([
      [q('conv', { from: 2, to: 10 }, true), q('conv', { from: 16, to: 2 }, false)],
      [q('conv', { from: 2, to: 10 }, true), q('conv', { from: 16, to: 2 }, true)],
    ]);
    expect(stats.map((s) => [s.key, s.correct, s.total])).toEqual([
      ['conv:16>2', 1, 2],
      ['conv:2>10', 2, 2],
    ]);
  });
});
