import { describe, it, expect } from 'vitest';
import {
  convert,
  parseNumber,
  formatIntInBase,
  formatFractionInBase,
  formatNumber,
  integerDivisionSteps,
  fractionMultiplicationSteps,
  positionalWeightSteps,
  groupInteger,
  groupFraction,
  digitsForBase,
  ConvError,
  isZero,
} from './bases';

describe('parseNumber', () => {
  it('parses simple decimal integers', () => {
    const n = parseNumber('156', 10);
    expect(n.intValue).toBe(156n);
    expect(n.fracNum).toBe(0n);
    expect(n.negative).toBe(false);
  });

  it('parses hex with letters (case-insensitive)', () => {
    expect(parseNumber('ff', 16).intValue).toBe(255n);
    expect(parseNumber('FF', 16).intValue).toBe(255n);
    expect(parseNumber('9c', 16).intValue).toBe(156n);
  });

  it('parses negative numbers', () => {
    const n = parseNumber('-1010', 2);
    expect(n.negative).toBe(true);
    expect(n.intValue).toBe(10n);
  });

  it('normalizes -0 to non-negative zero', () => {
    const n = parseNumber('-0', 10);
    expect(n.negative).toBe(false);
    expect(isZero(n)).toBe(true);
  });

  it('accepts grouping separators (space and underscore)', () => {
    expect(parseNumber('1001 1100', 2).intValue).toBe(156n);
    expect(parseNumber('1001_1100', 2).intValue).toBe(156n);
  });

  it('accepts comma as decimal separator', () => {
    const n = parseNumber('10,5', 10);
    expect(n.intValue).toBe(10n);
    expect(n.fracNum).toBe(1n);
    expect(n.fracDen).toBe(2n);
  });

  it('parses fractional binary exactly', () => {
    // 0.11b = 3/4
    const n = parseNumber('0.11', 2);
    expect(n.intValue).toBe(0n);
    expect(n.fracNum).toBe(3n);
    expect(n.fracDen).toBe(4n);
  });

  it('handles very large integers (BigInt, arbitrary precision)', () => {
    const big = '123456789012345678901234567890';
    expect(parseNumber(big, 10).intValue).toBe(123456789012345678901234567890n);
  });

  it('throws on empty input', () => {
    expect(() => parseNumber('   ', 10)).toThrow(ConvError);
    try {
      parseNumber('', 10);
    } catch (e) {
      expect((e as ConvError).code).toBe('empty');
    }
  });

  it('throws on invalid digit for base', () => {
    try {
      parseNumber('2', 2);
    } catch (e) {
      expect((e as ConvError).code).toBe('invalid-digit');
      expect((e as ConvError).params.d).toBe('2');
    }
  });

  it('throws on multiple dots', () => {
    try {
      parseNumber('1.2.3', 10);
    } catch (e) {
      expect((e as ConvError).code).toBe('multiple-dots');
    }
  });

  it('throws on bad base', () => {
    expect(() => parseNumber('10', 37)).toThrow(ConvError);
    expect(() => parseNumber('10', 1)).toThrow(ConvError);
  });
});

describe('formatIntInBase', () => {
  it('formats zero', () => {
    expect(formatIntInBase(0n, 2)).toBe('0');
    expect(formatIntInBase(0n, 16)).toBe('0');
  });

  it('formats across bases', () => {
    expect(formatIntInBase(156n, 2)).toBe('10011100');
    expect(formatIntInBase(156n, 8)).toBe('234');
    expect(formatIntInBase(156n, 16)).toBe('9c');
    expect(formatIntInBase(255n, 16)).toBe('ff');
    expect(formatIntInBase(35n, 36)).toBe('z');
  });
});

describe('convert — integers', () => {
  const cases: [string, number, number, string][] = [
    ['156', 10, 2, '10011100'],
    ['10011100', 2, 10, '156'],
    ['156', 10, 16, '9c'],
    ['9c', 16, 10, '156'],
    ['255', 10, 16, 'ff'],
    ['777', 8, 10, '511'],
    ['0', 10, 2, '0'],
    ['z', 36, 10, '35'],
  ];
  for (const [input, from, to, expected] of cases) {
    it(`${input} (b${from}) → ${expected} (b${to})`, () => {
      expect(convert(input, from, to).text).toBe(expected);
    });
  }
});

describe('convert — fractions', () => {
  it('converts exact binary fraction to decimal', () => {
    // 0.11b = 0.75
    expect(convert('0.11', 2, 10).text).toBe('0.75');
  });

  it('converts decimal fraction to exact binary', () => {
    // 0.5 = 0.1b, 0.25 = 0.01b
    expect(convert('0.5', 10, 2).text).toBe('0.1');
    expect(convert('0.25', 10, 2).text).toBe('0.01');
    expect(convert('0.75', 10, 2).text).toBe('0.11');
  });

  it('detects periodic fraction', () => {
    // 0.1 decimal is periodic in binary
    const r = convert('0.1', 10, 2, 12);
    expect(r.periodic).toBe(true);
    expect(r.fracDigits.length).toBeLessThanOrEqual(12);
  });

  it('converts mixed integer + fraction', () => {
    // 10.5 decimal = 1010.1 binary
    expect(convert('10.5', 10, 2).text).toBe('1010.1');
    // A.8 hex = 10.5 decimal
    expect(convert('A.8', 16, 10).text).toBe('10.5');
  });

  it('preserves sign on fractional numbers', () => {
    expect(convert('-10.5', 10, 2).text).toBe('-1010.1');
  });

  it('one third (0.1 base 3) is periodic 0.(3) in decimal', () => {
    // 0.1 base3 = 1/3 → decimal 0.333… : periodo di lunghezza 1, cifra "3"
    const r = convert('0.1', 3, 10, 10);
    expect(r.periodic).toBe(true);
    expect(r.fracDigits).toBe('3');
    expect(r.periodStart).toBe(0);
  });

  it('one sixth is 0.1(6): antiperiodo poi periodo', () => {
    // 1/6 = 0.1666… : antiperiodo "1", periodo "6"
    const r = convert('1', 10, 10); // sanity
    expect(r.text).toBe('1');
    const sixth = formatFractionInBase(1n, 6n, 10, 20);
    expect(sixth.digits).toBe('16');
    expect(sixth.periodic).toBe(true);
    expect(sixth.periodStart).toBe(1); // il periodo "6" inizia dopo "1"
  });
});

describe('formatFractionInBase', () => {
  it('returns empty for zero fraction', () => {
    expect(formatFractionInBase(0n, 1n, 2).digits).toBe('');
  });

  it('marks truncation when maxDigits reached without closure', () => {
    // 1/10 in binary, cut at 4 digits
    const out = formatFractionInBase(1n, 10n, 2, 4);
    expect(out.digits.length).toBe(4);
  });
});

describe('integerDivisionSteps', () => {
  it('produces remainders read bottom-up = result', () => {
    const steps = integerDivisionSteps(156n, 2);
    const digits = steps.map((s) => s.digit).reverse().join('');
    expect(digits).toBe('10011100');
  });

  it('handles zero', () => {
    const steps = integerDivisionSteps(0n, 2);
    expect(steps).toHaveLength(1);
    expect(steps[0].digit).toBe('0');
  });

  it('first step for 156/2 has remainder 0', () => {
    const steps = integerDivisionSteps(156n, 2);
    expect(steps[0].remainder).toBe(0);
    expect(steps[0].quotient).toBe('78');
  });
});

describe('fractionMultiplicationSteps', () => {
  it('produces digits top-down = fractional result', () => {
    // 0.75 → binary 0.11
    const n = parseNumber('0.75', 10);
    const steps = fractionMultiplicationSteps(n.fracNum, n.fracDen, 2);
    const digits = steps.map((s) => s.digit).join('');
    expect(digits).toBe('11');
  });

  it('stops on periodic fraction without infinite loop', () => {
    const n = parseNumber('0.1', 10);
    const steps = fractionMultiplicationSteps(n.fracNum, n.fracDen, 2, 20);
    expect(steps.length).toBeGreaterThan(0);
    expect(steps.length).toBeLessThanOrEqual(20);
  });
});

describe('positionalWeightSteps', () => {
  it('explains 9C hex → 156', () => {
    const steps = positionalWeightSteps('9C', 16);
    expect(steps).toHaveLength(2);
    expect(steps[0]).toMatchObject({ digit: '9', position: 1, weight: '16', contribution: '144' });
    expect(steps[1]).toMatchObject({ digit: 'C', position: 0, weight: '1', contribution: '12' });
    const total = steps.reduce((acc, s) => acc + Number(s.contribution), 0);
    expect(total).toBe(156);
  });

  it('handles fractional positions', () => {
    const steps = positionalWeightSteps('0.11', 2);
    // positions -1 and -2
    expect(steps.map((s) => s.position)).toEqual([0, -1, -2]);
    expect(steps[1]).toMatchObject({ weight: '1/2', contribution: '1/2' });
    expect(steps[2]).toMatchObject({ weight: '1/4', contribution: '1/4' });
  });
});

describe('grouping', () => {
  it('groups integer digits from the right', () => {
    expect(groupInteger('10011100', 4)).toBe('1001 1100');
    expect(groupInteger('111100', 4)).toBe('11 1100');
    expect(groupInteger('10011100', 8)).toBe('10011100');
  });

  it('groups fraction digits from the left', () => {
    expect(groupFraction('11010110', 4)).toBe('1101 0110');
  });
});

describe('digitsForBase', () => {
  it('lists valid digits', () => {
    expect(digitsForBase(2)).toEqual(['0', '1']);
    expect(digitsForBase(16)).toEqual('0123456789ABCDEF'.split(''));
  });
});

describe('round-trip property', () => {
  it('integer round-trips across many bases', () => {
    for (let v = 0; v <= 500; v += 7) {
      for (const base of [2, 3, 8, 16, 36]) {
        const inBase = formatIntInBase(BigInt(v), base);
        const back = convert(inBase, base, 10).text;
        expect(back).toBe(String(v));
      }
    }
  });

  it('exact dyadic fractions round-trip 10 ↔ 2', () => {
    for (const dec of ['0.5', '0.25', '0.125', '0.75', '0.375', '10.5', '3.125']) {
      const bin = convert(dec, 10, 2);
      expect(bin.periodic).toBe(false);
      expect(convert(bin.text, 2, 10).text).toBe(dec);
    }
  });
});

describe('formatNumber', () => {
  it('assembles sign, integer and fraction', () => {
    const n = parseNumber('-1010.1', 2);
    const r = formatNumber(n, 10);
    expect(r.text).toBe('-10.5');
    expect(r.intDigits).toBe('10');
    expect(r.fracDigits).toBe('5');
    expect(r.negative).toBe(true);
  });
});
