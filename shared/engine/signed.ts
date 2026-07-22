/**
 * Rappresentazione dei numeri con segno su un numero fisso di bit.
 *
 * Copre le quattro rappresentazioni del programma: complemento a due,
 * complemento a uno, modulo e segno, eccesso-K. Espone anche i passaggi
 * (inverti i bit, aggiungi 1) per la spiegazione didattica.
 */

export type Repr = 'twos' | 'ones' | 'signMag' | 'excess';
export type WordSize = 4 | 8 | 16 | 32;

export const WORD_SIZES: WordSize[] = [4, 8, 16, 32];

export interface Range {
  min: bigint;
  max: bigint;
}

/** Bias predefinito per l'eccesso-K: 2^(n-1) (convenzione più usata a scuola). */
export function defaultBias(bits: number): bigint {
  return 1n << BigInt(bits - 1);
}

export function rangeOf(bits: number, repr: Repr, bias = defaultBias(bits)): Range {
  const half = 1n << BigInt(bits - 1);
  switch (repr) {
    case 'twos':
      return { min: -half, max: half - 1n };
    case 'ones':
    case 'signMag':
      return { min: -(half - 1n), max: half - 1n };
    case 'excess':
      return { min: -bias, max: (1n << BigInt(bits)) - 1n - bias };
  }
}

export function inRange(value: bigint, bits: number, repr: Repr, bias = defaultBias(bits)): boolean {
  const r = rangeOf(bits, repr, bias);
  return value >= r.min && value <= r.max;
}

function toBitString(v: bigint, bits: number): string {
  const mask = (1n << BigInt(bits)) - 1n;
  const masked = v & mask;
  return masked.toString(2).padStart(bits, '0');
}

/**
 * Codifica un valore con segno nella rappresentazione richiesta.
 * Lancia RangeError se il valore non è rappresentabile su `bits` bit.
 */
export function encode(value: bigint, bits: number, repr: Repr, bias = defaultBias(bits)): string {
  if (!inRange(value, bits, repr, bias)) {
    throw new RangeError(`overflow:${bits}`);
  }
  const half = 1n << BigInt(bits - 1);
  switch (repr) {
    case 'twos':
      return toBitString(value, bits);
    case 'ones':
      return value >= 0n ? toBitString(value, bits) : toBitString(~(-value) & ((1n << BigInt(bits)) - 1n), bits);
    case 'signMag': {
      const mag = value < 0n ? -value : value;
      const sign = value < 0n ? half : 0n;
      return toBitString(sign | mag, bits);
    }
    case 'excess':
      return toBitString(value + bias, bits);
  }
}

/** Decodifica una stringa di bit nella rappresentazione richiesta. */
export function decode(bitsStr: string, repr: Repr, bias?: bigint): bigint {
  const clean = bitsStr.replace(/[^01]/g, '');
  const bits = clean.length;
  if (bits === 0) return 0n;
  const b = bias ?? defaultBias(bits);
  const raw = BigInt('0b' + clean);
  const half = 1n << BigInt(bits - 1);
  const full = 1n << BigInt(bits);
  switch (repr) {
    case 'twos':
      return raw >= half ? raw - full : raw;
    case 'ones':
      return raw >= half ? -(full - 1n - raw) : raw;
    case 'signMag': {
      const mag = raw & (half - 1n);
      return raw >= half ? -mag : mag;
    }
    case 'excess':
      return raw - b;
  }
}

export interface TwosStep {
  label: string;
  bits: string;
}

/**
 * Passaggi per ottenere il complemento a due di un numero negativo:
 * modulo → inverti i bit → aggiungi 1.
 */
export function twosComplementSteps(value: bigint, bits: number): TwosStep[] {
  if (value >= 0n) {
    return [{ label: 'value', bits: toBitString(value, bits) }];
  }
  const mag = -value;
  const magBits = toBitString(mag, bits);
  const inverted = magBits
    .split('')
    .map((c) => (c === '0' ? '1' : '0'))
    .join('');
  const plusOne = toBitString(BigInt('0b' + inverted) + 1n, bits);
  return [
    { label: 'magnitude', bits: magBits },
    { label: 'invert', bits: inverted },
    { label: 'addOne', bits: plusOne },
  ];
}

/** Peso di ciascun bit nella rappresentazione (il bit più a sinistra è negativo nel C2). */
export function bitWeights(bits: number, repr: Repr): bigint[] {
  const out: bigint[] = [];
  for (let i = bits - 1; i >= 0; i--) {
    const w = 1n << BigInt(i);
    if (i === bits - 1 && repr === 'twos') out.push(-w);
    else out.push(w);
  }
  return out;
}

/** True se la somma di due valori va in overflow nella rappresentazione data. */
export function additionOverflows(a: bigint, b: bigint, bits: number, repr: Repr): boolean {
  return !inRange(a + b, bits, repr);
}
