/**
 * Virgola mobile IEEE 754: scomposizione e ricomposizione dei formati
 * half (16 bit), single (32 bit) e double (64 bit).
 *
 * Il valore mostrato è SEMPRE ottenuto decodificando i bit effettivamente
 * memorizzati: così l'errore di rappresentazione (es. 0,1 che non è esatto in
 * binario) emerge in modo onesto e verificabile.
 */

export type Format = 'half' | 'single' | 'double';

export interface FormatSpec {
  total: number;
  expBits: number;
  mantBits: number;
  bias: number;
  label: string;
}

export const FORMATS: Record<Format, FormatSpec> = {
  half: { total: 16, expBits: 5, mantBits: 10, bias: 15, label: 'Half (16 bit)' },
  single: { total: 32, expBits: 8, mantBits: 23, bias: 127, label: 'Single (32 bit)' },
  double: { total: 64, expBits: 11, mantBits: 52, bias: 1023, label: 'Double (64 bit)' },
};

export type Kind = 'zero' | 'subnormal' | 'normal' | 'infinity' | 'nan';

export interface Decoded {
  sign: 0 | 1;
  /** Esponente memorizzato (grezzo, con bias). */
  expRaw: number;
  /** Mantissa memorizzata (senza il bit implicito). */
  mantRaw: bigint;
  kind: Kind;
  /** Esponente reale (expRaw - bias), null per zero/inf/nan. */
  exponent: number | null;
  /** Valore numerico effettivo dei bit. */
  value: number;
  /** Formula leggibile, es. "(-1)^0 × 1,1001 × 2^3". */
  formula: string;
}

function bitsToBigInt(bits: string): bigint {
  return bits.length ? BigInt('0b' + bits) : 0n;
}

/* ---------- half (16 bit) — implementazione manuale ---------- */

function f16BitsToNumber(h: number): number {
  const sign = (h >>> 15) & 1 ? -1 : 1;
  const exp = (h >>> 10) & 0x1f;
  const mant = h & 0x3ff;
  if (exp === 0) return sign * mant * Math.pow(2, -24); // zero o subnormale
  if (exp === 0x1f) return mant ? NaN : sign * Infinity;
  return sign * (1 + mant / 1024) * Math.pow(2, exp - 15);
}

function numberToF16Bits(x: number): number {
  if (Number.isNaN(x)) return 0x7e00;
  const f32 = new Float32Array(1);
  const u32 = new Uint32Array(f32.buffer);
  f32[0] = x;
  const bits = u32[0];
  const sign = (bits >>> 31) & 1;
  const exp = (bits >>> 23) & 0xff;
  let mant = bits & 0x7fffff;

  if (exp === 0xff) return (sign << 15) | (0x1f << 10) | (mant ? 0x200 : 0);

  const e = exp - 127 + 15;
  if (e >= 0x1f) return (sign << 15) | (0x1f << 10); // overflow → infinito
  if (e <= 0) {
    if (e < -10) return sign << 15; // underflow → zero
    mant |= 0x800000;
    const shift = 14 - e;
    let half = mant >>> shift;
    if ((mant >>> (shift - 1)) & 1) half += 1; // arrotondamento
    return (sign << 15) | half;
  }
  let half = (e << 10) | (mant >>> 13);
  if (mant & 0x1000) half += 1; // arrotondamento al più vicino
  return (sign << 15) | half;
}

/* ---------- API pubblica ---------- */

/** Codifica un numero nel formato dato, restituendo la stringa di bit. */
export function encode(value: number, format: Format): string {
  const spec = FORMATS[format];
  if (format === 'half') {
    return (numberToF16Bits(value) >>> 0).toString(2).padStart(16, '0');
  }
  const buf = new ArrayBuffer(8);
  const view = new DataView(buf);
  if (format === 'single') {
    view.setFloat32(0, value);
    return view.getUint32(0).toString(2).padStart(32, '0');
  }
  view.setFloat64(0, value);
  return view.getBigUint64(0).toString(2).padStart(spec.total, '0');
}

/** Decodifica una stringa di bit nel formato dato. */
export function decode(bits: string, format: Format): Decoded {
  const spec = FORMATS[format];
  const clean = bits.replace(/[^01]/g, '').padStart(spec.total, '0').slice(-spec.total);
  const sign = (clean[0] === '1' ? 1 : 0) as 0 | 1;
  const expStr = clean.slice(1, 1 + spec.expBits);
  const mantStr = clean.slice(1 + spec.expBits);
  const expRaw = Number(bitsToBigInt(expStr));
  const mantRaw = bitsToBigInt(mantStr);

  const allOnes = expRaw === (1 << spec.expBits) - 1;
  let kind: Kind;
  if (allOnes) kind = mantRaw === 0n ? 'infinity' : 'nan';
  else if (expRaw === 0) kind = mantRaw === 0n ? 'zero' : 'subnormal';
  else kind = 'normal';

  let value: number;
  if (format === 'half') {
    value = f16BitsToNumber(Number(bitsToBigInt(clean)));
  } else {
    const buf = new ArrayBuffer(8);
    const view = new DataView(buf);
    if (format === 'single') {
      view.setUint32(0, Number(bitsToBigInt(clean)));
      value = view.getFloat32(0);
    } else {
      view.setBigUint64(0, bitsToBigInt(clean));
      value = view.getFloat64(0);
    }
  }

  const exponent = kind === 'normal' ? expRaw - spec.bias : kind === 'subnormal' ? 1 - spec.bias : null;

  let formula: string;
  if (kind === 'nan') formula = 'NaN';
  else if (kind === 'infinity') formula = `${sign ? '−' : '+'}∞`;
  else if (kind === 'zero') formula = `${sign ? '−' : '+'}0`;
  else {
    const lead = kind === 'normal' ? '1' : '0';
    const mantFrac = mantStr.replace(/0+$/, '') || '0';
    formula = `(−1)^${sign} × ${lead},${mantFrac} × 2^${exponent}`;
  }

  return { sign, expRaw, mantRaw, kind, exponent, value, formula };
}

export interface Analysis extends Decoded {
  bits: string;
  signBits: string;
  expBitsStr: string;
  mantBitsStr: string;
  /** Differenza tra il valore richiesto e quello effettivamente memorizzato. */
  error: number;
  exact: boolean;
}

/** Analizza un numero: lo codifica, lo ridecodifica e misura l'errore. */
export function analyze(value: number, format: Format): Analysis {
  const spec = FORMATS[format];
  const bits = encode(value, format);
  const dec = decode(bits, format);
  const error = Number.isFinite(value) && Number.isFinite(dec.value) ? dec.value - value : 0;
  return {
    ...dec,
    bits,
    signBits: bits.slice(0, 1),
    expBitsStr: bits.slice(1, 1 + spec.expBits),
    mantBitsStr: bits.slice(1 + spec.expBits),
    error,
    exact: error === 0,
  };
}

/** Analizza direttamente una stringa di bit (per l'editor a bit cliccabili). */
export function analyzeBits(bits: string, format: Format): Analysis {
  const spec = FORMATS[format];
  const clean = bits.replace(/[^01]/g, '').padStart(spec.total, '0').slice(-spec.total);
  const dec = decode(clean, format);
  return {
    ...dec,
    bits: clean,
    signBits: clean.slice(0, 1),
    expBitsStr: clean.slice(1, 1 + spec.expBits),
    mantBitsStr: clean.slice(1 + spec.expBits),
    error: 0,
    exact: true,
  };
}

/** Valori notevoli utili in classe. */
export const NOTABLE: { label: string; value: number }[] = [
  { label: '0,1', value: 0.1 },
  { label: '0,5', value: 0.5 },
  { label: '1', value: 1 },
  { label: '−2,75', value: -2.75 },
  { label: '3,14159', value: 3.14159 },
  { label: '255', value: 255 },
  { label: '∞', value: Infinity },
  { label: 'NaN', value: NaN },
];
