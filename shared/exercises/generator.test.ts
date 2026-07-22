import { describe, it, expect } from 'vitest';
import {
  generateExercise,
  generateSet,
  checkAnswer,
  makeRng,
  hashSeed,
  MODULES,
  type Difficulty,
} from './generator';
import { convert } from '../engine/bases';

const DIFFS: Difficulty[] = ['easy', 'medium', 'hard'];

describe('PRNG', () => {
  it('is deterministic for the same seed', () => {
    const a = makeRng(42);
    const b = makeRng(42);
    for (let i = 0; i < 20; i++) expect(a()).toBe(b());
  });

  it('differs across seeds', () => {
    expect(makeRng(1)()).not.toBe(makeRng(2)());
  });

  it('hashSeed is stable and non-zero', () => {
    expect(hashSeed('mario@scuola.it|2026-07-22')).toBe(hashSeed('mario@scuola.it|2026-07-22'));
    expect(hashSeed('a')).not.toBe(hashSeed('b'));
  });
});

describe('generateExercise — determinism', () => {
  it('produces identical exercises for identical seed', () => {
    for (const m of MODULES) {
      for (const d of DIFFS) {
        const a = generateExercise(m, d, 12345, 3);
        const b = generateExercise(m, d, 12345, 3);
        expect(a).toEqual(b);
      }
    }
  });

  it('produces different exercises for different index', () => {
    const a = generateExercise('converter', 'medium', 999, 0);
    const b = generateExercise('converter', 'medium', 999, 1);
    expect(a.id).not.toBe(b.id);
  });
});

describe('generateExercise — validity', () => {
  it('every generated exercise has a non-empty answer and points', () => {
    for (const m of MODULES) {
      for (const d of DIFFS) {
        for (let i = 0; i < 25; i++) {
          const ex = generateExercise(m, d, 1000 + i, i);
          expect(ex.module).toBe(m);
          expect(ex.difficulty).toBe(d);
          expect(ex.answer.length).toBeGreaterThan(0);
          expect(ex.points).toBeGreaterThan(0);
        }
      }
    }
  });

  it('its own answer always passes the checker', () => {
    for (const m of MODULES) {
      for (const d of DIFFS) {
        for (let i = 0; i < 25; i++) {
          const ex = generateExercise(m, d, 555 + i, i);
          expect(checkAnswer(ex, ex.answer)).toBe(true);
        }
      }
    }
  });

  it('converter answers match the engine', () => {
    for (let i = 0; i < 30; i++) {
      const ex = generateExercise('converter', 'medium', 77 + i, i);
      const expected = convert(String(ex.params.value), Number(ex.params.from), Number(ex.params.to)).text;
      expect(ex.answer).toBe(expected);
    }
  });

  it('subtraction exercises never have a negative result', () => {
    for (let i = 0; i < 60; i++) {
      const ex = generateExercise('arithmetic', 'hard', 31 + i, i);
      expect(ex.answer.startsWith('-')).toBe(false);
    }
  });
});

describe('generateSet', () => {
  it('generates the requested count', () => {
    expect(generateSet(['converter'], 'easy', 10, 5)).toHaveLength(10);
  });

  it('is reproducible from the seed', () => {
    const a = generateSet(MODULES, 'medium', 12, 8080);
    const b = generateSet(MODULES, 'medium', 12, 8080);
    expect(a).toEqual(b);
  });

  it('only uses the requested modules', () => {
    const set = generateSet(['signed', 'text'], 'easy', 30, 4242);
    for (const ex of set) expect(['signed', 'text']).toContain(ex.module);
  });

  it('falls back to all modules when none given', () => {
    const set = generateSet([], 'easy', 20, 11);
    expect(set).toHaveLength(20);
  });
});

describe('checkAnswer — tolerance', () => {
  it('ignores case and separators for base answers', () => {
    const ex = generateExercise('converter', 'easy', 1, 0);
    expect(checkAnswer(ex, ex.answer.toUpperCase())).toBe(true);
    expect(checkAnswer(ex, ' ' + ex.answer + ' ')).toBe(true);
  });

  it('accepts leading zeros on binary answers', () => {
    const ex = { id: 'x', module: 'converter', kind: 'conv', difficulty: 'easy', params: {}, answer: '1011', points: 1 } as const;
    expect(checkAnswer(ex, '00001011')).toBe(true);
  });

  it('accepts 0x / 0b prefixes', () => {
    const ex = { id: 'x', module: 'converter', kind: 'conv', difficulty: 'easy', params: {}, answer: 'ff', points: 1 } as const;
    expect(checkAnswer(ex, '0xFF')).toBe(true);
  });

  it('accepts equivalent decimal spellings', () => {
    const ex = { id: 'x', module: 'ieee', kind: 'ieeeValue', difficulty: 'easy', params: {}, answer: '3.5', points: 1 } as const;
    expect(checkAnswer(ex, '3,5')).toBe(true);
    expect(checkAnswer(ex, '3.50')).toBe(true);
  });

  it('rejects wrong answers', () => {
    const ex = { id: 'x', module: 'converter', kind: 'conv', difficulty: 'easy', params: {}, answer: '1011', points: 1 } as const;
    expect(checkAnswer(ex, '1010')).toBe(false);
    expect(checkAnswer(ex, '')).toBe(false);
  });

  it('keeps Base64 case-sensitive', () => {
    const ex = { id: 'x', module: 'text', kind: 'base64', difficulty: 'hard', params: {}, answer: 'TWFu', points: 3 } as const;
    expect(checkAnswer(ex, 'TWFu')).toBe(true);
    expect(checkAnswer(ex, 'twfu')).toBe(false);
  });
});
