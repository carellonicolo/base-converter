import { describe, it, expect } from 'vitest';
import { addInBase, subInBase, mulInBase, compute } from './arithmetic';
import { encode, decode, rangeOf, twosComplementSteps, bitWeights, inRange, defaultBias } from './signed';
import { analyze, decode as ieeeDecode, encode as ieeeEncode, FORMATS } from './ieee754';
import {
  asciiTable,
  codePoints,
  utf8Bytes,
  utf8Explain,
  bytesToBase64,
  base64ToBytes,
  textToBase64,
  base64ToText,
  base64Steps,
  utf16Bytes,
  encodeText,
  bytesToHex,
} from './text';

/* ============================ ARITMETICA ============================ */

describe('addInBase', () => {
  it('adds in binary with carries', () => {
    const r = addInBase('1011', '1101', 2);
    expect(r.result).toBe('11000'); // 11 + 13 = 24
  });

  it('adds in hex', () => {
    expect(addInBase('FF', '1', 16).result).toBe('100');
    expect(addInBase('A', 'B', 16).result).toBe('15'); // 10+11=21=0x15
  });

  it('adds in decimal (sanity)', () => {
    expect(addInBase('156', '844', 10).result).toBe('1000');
  });

  it('exposes per-column carry', () => {
    const r = addInBase('1', '1', 2);
    expect(r.columns[0]).toMatchObject({ a: 1, b: 1, carryIn: 0, total: 2, digit: 0, carryOut: 1 });
    expect(r.result).toBe('10');
  });
});

describe('subInBase', () => {
  it('subtracts with borrow in binary', () => {
    expect(subInBase('1000', '1', 2).result).toBe('111'); // 8-1=7
  });

  it('subtracts in hex', () => {
    expect(subInBase('100', '1', 16).result).toBe('ff');
  });

  it('marks negative result when b > a', () => {
    const r = subInBase('1', '1000', 2);
    expect(r.negative).toBe(true);
    expect(r.result).toBe('111');
  });

  it('exposes borrow flags', () => {
    const r = subInBase('10', '1', 2); // 2-1=1
    expect(r.columns[0].borrowOut).toBe(1);
    expect(r.result).toBe('1');
  });
});

describe('mulInBase', () => {
  it('multiplies in binary', () => {
    expect(mulInBase('101', '11', 2).result).toBe('1111'); // 5*3=15
  });

  it('multiplies in hex', () => {
    expect(mulInBase('FF', 'FF', 16).result).toBe('fe01'); // 255*255=65025
  });

  it('produces one partial product per multiplier digit', () => {
    const r = mulInBase('101', '11', 2);
    expect(r.partials).toHaveLength(2);
    expect(r.partials[0]).toMatchObject({ byDigit: 1, shift: 0 });
    expect(r.partials[1]).toMatchObject({ byDigit: 1, shift: 1 });
  });
});

describe('compute', () => {
  it('returns decimal cross-check', () => {
    const r = compute('add', '1011', '1101', 2);
    expect(r.result).toBe('11000');
    expect(r.decimal).toBe('24');
  });

  it('handles negative subtraction result', () => {
    const r = compute('sub', '1', '1000', 2);
    expect(r.result).toBe('-111');
    expect(r.decimal).toBe('-7');
  });
});

/* ============================ SEGNO ============================ */

describe('signed — two’s complement', () => {
  it('encodes positive and negative on 8 bits', () => {
    expect(encode(5n, 8, 'twos')).toBe('00000101');
    expect(encode(-5n, 8, 'twos')).toBe('11111011');
    expect(encode(-1n, 8, 'twos')).toBe('11111111');
    expect(encode(-128n, 8, 'twos')).toBe('10000000');
  });

  it('round-trips every 8-bit value', () => {
    for (let v = -128; v <= 127; v++) {
      const bits = encode(BigInt(v), 8, 'twos');
      expect(decode(bits, 'twos')).toBe(BigInt(v));
    }
  });

  it('has the expected range', () => {
    expect(rangeOf(8, 'twos')).toEqual({ min: -128n, max: 127n });
    expect(rangeOf(16, 'twos')).toEqual({ min: -32768n, max: 32767n });
  });

  it('rejects out-of-range values', () => {
    expect(inRange(128n, 8, 'twos')).toBe(false);
    expect(() => encode(128n, 8, 'twos')).toThrow(RangeError);
  });

  it('gives negative weight to the top bit', () => {
    expect(bitWeights(8, 'twos')[0]).toBe(-128n);
    expect(bitWeights(8, 'ones')[0]).toBe(128n);
  });

  it('explains invert-and-add-one', () => {
    const steps = twosComplementSteps(-5n, 8);
    expect(steps.map((s) => s.bits)).toEqual(['00000101', '11111010', '11111011']);
  });
});

describe('signed — other representations', () => {
  it('ones complement round-trips', () => {
    for (const v of [0n, 1n, -1n, 63n, -63n, 127n, -127n]) {
      expect(decode(encode(v, 8, 'ones'), 'ones')).toBe(v);
    }
  });

  it('sign-magnitude round-trips', () => {
    for (const v of [1n, -1n, 63n, -63n, 127n, -127n]) {
      expect(decode(encode(v, 8, 'signMag'), 'signMag')).toBe(v);
    }
  });

  it('sign-magnitude puts sign in the top bit', () => {
    expect(encode(-1n, 8, 'signMag')).toBe('10000001');
    expect(encode(1n, 8, 'signMag')).toBe('00000001');
  });

  it('excess-K shifts by the bias', () => {
    const bias = defaultBias(8); // 128
    expect(bias).toBe(128n);
    expect(encode(0n, 8, 'excess')).toBe('10000000');
    expect(decode('10000000', 'excess')).toBe(0n);
    expect(encode(-128n, 8, 'excess')).toBe('00000000');
  });

  it('ones complement and sign-magnitude have symmetric range', () => {
    expect(rangeOf(8, 'ones')).toEqual({ min: -127n, max: 127n });
    expect(rangeOf(8, 'signMag')).toEqual({ min: -127n, max: 127n });
  });
});

/* ============================ IEEE 754 ============================ */

describe('ieee754', () => {
  it('encodes 1.0 single precision correctly', () => {
    // 1.0 = 0 01111111 00000000000000000000000
    expect(ieeeEncode(1, 'single')).toBe('00111111100000000000000000000000');
  });

  it('encodes -2.0 single precision', () => {
    expect(ieeeEncode(-2, 'single')).toBe('11000000000000000000000000000000');
  });

  it('round-trips common values in all formats', () => {
    for (const f of ['half', 'single', 'double'] as const) {
      for (const v of [0, 1, -1, 0.5, -2.75, 255]) {
        const bits = ieeeEncode(v, f);
        expect(ieeeDecode(bits, f).value).toBe(v);
      }
    }
  });

  it('shows 0.1 is not exact in single precision', () => {
    const a = analyze(0.1, 'single');
    expect(a.exact).toBe(false);
    expect(Math.abs(a.error)).toBeGreaterThan(0);
    expect(a.kind).toBe('normal');
  });

  it('0.1 is exactly representable as a double round-trip of itself', () => {
    // Il double È il tipo nativo JS: codifica/decodifica non perde nulla.
    const a = analyze(0.1, 'double');
    expect(a.value).toBe(0.1);
    expect(a.exact).toBe(true);
  });

  it('detects special values', () => {
    expect(analyze(Infinity, 'single').kind).toBe('infinity');
    expect(analyze(-Infinity, 'single').kind).toBe('infinity');
    expect(analyze(NaN, 'single').kind).toBe('nan');
    expect(analyze(0, 'single').kind).toBe('zero');
  });

  it('detects subnormal numbers', () => {
    const tiny = Math.pow(2, -140); // subnormale in single
    expect(analyze(tiny, 'single').kind).toBe('subnormal');
  });

  it('splits the bit fields by format spec', () => {
    const a = analyze(1, 'single');
    expect(a.signBits).toHaveLength(1);
    expect(a.expBitsStr).toHaveLength(FORMATS.single.expBits);
    expect(a.mantBitsStr).toHaveLength(FORMATS.single.mantBits);
    expect(a.exponent).toBe(0); // 2^0
  });

  it('half precision handles 1.0', () => {
    expect(ieeeEncode(1, 'half')).toBe('0011110000000000');
    expect(ieeeDecode('0011110000000000', 'half').value).toBe(1);
  });
});

/* ============================ TESTO ============================ */

describe('ascii', () => {
  it('has 128 entries', () => {
    const t = asciiTable();
    expect(t).toHaveLength(128);
    expect(t[65].char).toBe('A');
    expect(t[65].category).toBe('upper');
  });

  it('names control characters', () => {
    const t = asciiTable();
    expect(t[0].name).toBe('Null');
    expect(t[10].display).toBe('LF');
    expect(t[10].isControl).toBe(true);
    expect(t[127].display).toBe('DEL');
  });
});

describe('unicode / utf', () => {
  it('extracts code points including astral chars', () => {
    const cps = codePoints('A€😀');
    expect(cps).toHaveLength(3);
    expect(cps[0].cp).toBe(65);
    expect(cps[1].hex).toBe('U+20AC');
    expect(cps[2].cp).toBe(0x1f600);
    expect(cps[2].plane).toBe(1);
  });

  it('encodes UTF-8 with the right byte counts', () => {
    expect(utf8Bytes('A')).toEqual([0x41]);
    expect(utf8Bytes('€')).toHaveLength(3);
    expect(utf8Bytes('😀')).toHaveLength(4);
  });

  it('explains the UTF-8 bit pattern', () => {
    const e = utf8Explain(0x20ac); // €
    expect(e.length).toBe(3);
    expect(e.pattern[0].startsWith('1110')).toBe(true);
    expect(e.pattern[1].startsWith('10|')).toBe(true);
  });

  it('encodes UTF-16 big and little endian', () => {
    expect(utf16Bytes('A', false)).toEqual([0x00, 0x41]);
    expect(utf16Bytes('A', true)).toEqual([0x41, 0x00]);
  });

  it('encodeText dispatches by encoding', () => {
    expect(encodeText('A', 'utf8')).toEqual([0x41]);
    expect(encodeText('A', 'utf32be')).toEqual([0, 0, 0, 0x41]);
  });

  it('formats bytes as hex', () => {
    expect(bytesToHex([0, 255, 16])).toBe('00 FF 10');
  });
});

describe('base64', () => {
  it('encodes known vectors', () => {
    expect(textToBase64('Man')).toBe('TWFu');
    expect(textToBase64('Ma')).toBe('TWE=');
    expect(textToBase64('M')).toBe('TQ==');
    expect(textToBase64('Hello, World!')).toBe('SGVsbG8sIFdvcmxkIQ==');
  });

  it('round-trips text including unicode', () => {
    for (const s of ['ciao', 'Hello, World!', 'àèìòù', '😀 emoji']) {
      expect(base64ToText(textToBase64(s))).toBe(s);
    }
  });

  it('round-trips raw bytes', () => {
    const bytes = [0, 1, 2, 250, 255];
    expect(base64ToBytes(bytesToBase64(bytes))).toEqual(bytes);
  });

  it('explains 3-byte → 4-char packing', () => {
    const groups = base64Steps(utf8Bytes('Man'));
    expect(groups).toHaveLength(1);
    expect(groups[0].bits).toHaveLength(24);
    expect(groups[0].sextets).toHaveLength(4);
    expect(groups[0].chars.join('')).toBe('TWFu');
    expect(groups[0].padding).toBe(0);
  });

  it('marks padding on incomplete groups', () => {
    const g = base64Steps(utf8Bytes('M'));
    expect(g[0].padding).toBe(2);
    expect(g[0].chars.join('')).toBe('TQ==');
  });
});
