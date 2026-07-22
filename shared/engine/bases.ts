/**
 * Motore di conversione tra basi numeriche — CUORE DIDATTICO dell'app.
 *
 * Condiviso tra frontend (UI) e Cloudflare Functions (correzione delle
 * verifiche lato server): la stessa identica logica che lo studente vede
 * nella palestra è quella che lo corregge in verifica. Nessuna divergenza.
 *
 * Caratteristiche:
 *  - Basi 2..36 (cifre 0-9 a-z).
 *  - Interi a precisione arbitraria (BigInt).
 *  - Parte frazionaria esatta (razionale num/den) con rilevamento di periodicità.
 *  - Numeri negativi.
 *  - Passaggi svolti (divisioni successive, moltiplicazioni successive, pesi
 *    posizionali) per la spiegazione "come sul quaderno".
 *
 * Nessuna dipendenza esterna: usabile ovunque (browser e Workers).
 */

export const MIN_BASE = 2;
export const MAX_BASE = 36;
const DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz';

export type ConvErrorCode = 'empty' | 'bad-base' | 'invalid-digit' | 'multiple-dots' | 'lone-sign';

export class ConvError extends Error {
  code: ConvErrorCode;
  params: Record<string, string | number>;
  constructor(code: ConvErrorCode, params: Record<string, string | number> = {}) {
    super(code);
    this.name = 'ConvError';
    this.code = code;
    this.params = params;
  }
}

/** Valore di una cifra (0..35) oppure -1 se non è una cifra. */
export function digitValue(ch: string): number {
  const c = ch.toLowerCase();
  const v = DIGITS.indexOf(c);
  return v;
}

/** Carattere per un valore di cifra 0..35 (minuscolo per lettere). */
export function digitChar(v: number): string {
  if (v < 0 || v >= MAX_BASE) throw new ConvError('invalid-digit', { d: String(v) });
  return DIGITS[v];
}

export function assertBase(base: number): void {
  if (!Number.isInteger(base) || base < MIN_BASE || base > MAX_BASE) {
    throw new ConvError('bad-base', { base });
  }
}

/** Cifre valide (maiuscole) per una base — utile per abilitare tasti/validare input. */
export function digitsForBase(base: number): string[] {
  assertBase(base);
  return DIGITS.slice(0, base).toUpperCase().split('');
}

/** Numero canonico: segno + parte intera (bigint) + parte frazionaria razionale in [0,1). */
export interface ParsedNumber {
  negative: boolean;
  intValue: bigint;
  /** Frazione = fracNum / fracDen, con 0 <= fracNum < fracDen. fracDen >= 1. */
  fracNum: bigint;
  fracDen: bigint;
}

/** True se il numero è esattamente zero. */
export function isZero(n: ParsedNumber): boolean {
  return n.intValue === 0n && n.fracNum === 0n;
}

/**
 * Interpreta una stringa scritta in `base` in un numero canonico.
 * Accetta segno iniziale (+/-), separatore decimale '.' o ',', spazi e
 * underscore come separatori di raggruppamento.
 */
export function parseNumber(text: string, base: number): ParsedNumber {
  assertBase(base);
  let s = text.trim();
  if (s === '') throw new ConvError('empty');

  let negative = false;
  if (s[0] === '+' || s[0] === '-') {
    negative = s[0] === '-';
    s = s.slice(1);
  }
  // separatori di raggruppamento ammessi
  s = s.replace(/[\s_]/g, '');
  // normalizza la virgola come separatore decimale
  s = s.replace(',', '.');

  if (s === '') throw new ConvError('lone-sign');
  const dotCount = (s.match(/\./g) || []).length;
  if (dotCount > 1) throw new ConvError('multiple-dots');

  const [intPart, fracPart = ''] = s.split('.');

  const B = BigInt(base);

  let intValue = 0n;
  for (const ch of intPart) {
    const d = digitValue(ch);
    if (d < 0 || d >= base) throw new ConvError('invalid-digit', { d: ch, base });
    intValue = intValue * B + BigInt(d);
  }

  let fracNum = 0n;
  let fracDen = 1n;
  for (const ch of fracPart) {
    const d = digitValue(ch);
    if (d < 0 || d >= base) throw new ConvError('invalid-digit', { d: ch, base });
    fracNum = fracNum * B + BigInt(d);
    fracDen = fracDen * B;
  }
  // riduci la frazione ai minimi termini (per una periodicità corretta)
  if (fracNum === 0n) {
    fracDen = 1n;
  } else {
    const g = gcd(fracNum, fracDen);
    fracNum /= g;
    fracDen /= g;
  }

  // -0 → 0
  if (intValue === 0n && fracNum === 0n) negative = false;
  return { negative, intValue, fracNum, fracDen };
}

function gcd(a: bigint, b: bigint): bigint {
  a = a < 0n ? -a : a;
  b = b < 0n ? -b : b;
  while (b) {
    [a, b] = [b, a % b];
  }
  return a || 1n;
}

/** Formatta una parte intera (bigint non negativo) nella base data. */
export function formatIntInBase(value: bigint, base: number): string {
  assertBase(base);
  if (value < 0n) value = -value;
  if (value === 0n) return '0';
  const B = BigInt(base);
  let out = '';
  let v = value;
  while (v > 0n) {
    const d = Number(v % B);
    out = DIGITS[d] + out;
    v /= B;
  }
  return out;
}

export interface FractionOut {
  digits: string;
  periodic: boolean;
  truncated: boolean;
  /** Indice (in `digits`) da cui inizia il periodo, oppure -1 se non periodica. */
  periodStart: number;
}

/**
 * Converte la frazione razionale in cifre nella base target, fermandosi quando
 * la frazione diventa 0 (esatta), quando si ripete un resto (periodica) o al
 * limite `maxDigits`. Quando è periodica, `digits` contiene l'antiperiodo
 * seguito da UNA ripetizione del periodo, e `periodStart` indica dove inizia.
 */
export function formatFractionInBase(
  fracNum: bigint,
  fracDen: bigint,
  base: number,
  maxDigits = 20
): FractionOut {
  assertBase(base);
  if (fracNum === 0n) return { digits: '', periodic: false, truncated: false, periodStart: -1 };
  const B = BigInt(base);
  const seen = new Map<string, number>();
  let num = fracNum;
  let digits = '';
  let periodic = false;
  let truncated = false;
  let periodStart = -1;
  for (let i = 0; i < maxDigits; i++) {
    if (num === 0n) break;
    const key = num.toString();
    if (seen.has(key)) {
      periodic = true;
      periodStart = seen.get(key)!;
      break;
    }
    seen.set(key, digits.length);
    num *= B;
    const d = Number(num / fracDen);
    digits += DIGITS[d];
    num = num % fracDen;
  }
  if (num !== 0n && !periodic) truncated = true;
  return { digits, periodic, truncated, periodStart };
}

export interface ConversionResult {
  negative: boolean;
  fromBase: number;
  toBase: number;
  intDigits: string;
  fracDigits: string;
  periodic: boolean;
  truncated: boolean;
  /** Indice in `fracDigits` da cui inizia il periodo, -1 se non periodica. */
  periodStart: number;
  /** Testo completo: "-INT.FRAC" (senza raggruppamento). */
  text: string;
}

/** Formatta un numero canonico nella base target. */
export function formatNumber(n: ParsedNumber, toBase: number, maxFracDigits = 20): ConversionResult {
  const intDigits = formatIntInBase(n.intValue, toBase);
  const frac = formatFractionInBase(n.fracNum, n.fracDen, toBase, maxFracDigits);
  const sign = n.negative && (n.intValue !== 0n || n.fracNum !== 0n) ? '-' : '';
  const text = sign + intDigits + (frac.digits ? '.' + frac.digits : '');
  return {
    negative: n.negative,
    fromBase: 0,
    toBase,
    intDigits,
    fracDigits: frac.digits,
    periodic: frac.periodic,
    truncated: frac.truncated,
    periodStart: frac.periodStart,
    text,
  };
}

/** Converte una stringa da una base all'altra. */
export function convert(text: string, fromBase: number, toBase: number, maxFracDigits = 20): ConversionResult {
  const n = parseNumber(text, fromBase);
  const res = formatNumber(n, toBase, maxFracDigits);
  res.fromBase = fromBase;
  return res;
}

/* ============================================================
   PASSAGGI SVOLTI (per la spiegazione didattica)
   ============================================================ */

export interface DivStep {
  dividend: string; // in base 10 (leggibile) — valore prima della divisione
  quotient: string;
  remainder: number;
  digit: string;
}

/**
 * Passaggi delle divisioni successive per convertire la parte intera in una
 * base. Le cifre del risultato sono i resti letti dal basso verso l'alto.
 */
export function integerDivisionSteps(intValue: bigint, toBase: number): DivStep[] {
  assertBase(toBase);
  let v = intValue < 0n ? -intValue : intValue;
  const B = BigInt(toBase);
  const steps: DivStep[] = [];
  if (v === 0n) {
    return [{ dividend: '0', quotient: '0', remainder: 0, digit: '0' }];
  }
  while (v > 0n) {
    const q = v / B;
    const r = Number(v % B);
    steps.push({ dividend: v.toString(), quotient: q.toString(), remainder: r, digit: DIGITS[r] });
    v = q;
  }
  return steps;
}

export interface MulStep {
  factor: string; // frazione prima della moltiplicazione, come "num/den"
  product: string;
  intPart: number;
  digit: string;
  fracAfter: string;
}

/**
 * Passaggi delle moltiplicazioni successive per convertire la parte frazionaria.
 * Ad ogni passo si moltiplica per la base: la parte intera del prodotto è la
 * cifra successiva.
 */
export function fractionMultiplicationSteps(
  fracNum: bigint,
  fracDen: bigint,
  toBase: number,
  maxSteps = 12
): MulStep[] {
  assertBase(toBase);
  if (fracNum === 0n) return [];
  const B = BigInt(toBase);
  const steps: MulStep[] = [];
  const seen = new Set<string>();
  let num = fracNum;
  for (let i = 0; i < maxSteps; i++) {
    if (num === 0n) break;
    const key = num.toString();
    if (seen.has(key)) break; // periodica: fermiamo la spiegazione
    seen.add(key);
    const prod = num * B;
    const d = Number(prod / fracDen);
    const rem = prod % fracDen;
    steps.push({
      factor: `${num}/${fracDen}`,
      product: `${prod}/${fracDen}`,
      intPart: d,
      digit: DIGITS[d],
      fracAfter: `${rem}/${fracDen}`,
    });
    num = rem;
  }
  return steps;
}

export interface WeightStep {
  digit: string;
  digitValue: number;
  position: number;
  weight: string; // base^position, in decimale
  contribution: string; // digitValue * weight, in decimale
}

/**
 * Passaggi della somma dei pesi posizionali: spiega perché un numero in base b
 * vale un certo numero in base 10. Copre parte intera (posizioni >= 0) e
 * frazionaria (posizioni negative, mostrate come frazioni).
 */
export function positionalWeightSteps(text: string, fromBase: number): WeightStep[] {
  assertBase(fromBase);
  const n = parseNumber(text, fromBase); // valida
  void n;
  let s = text.trim().replace(/^[+-]/, '').replace(/[\s_]/g, '').replace(',', '.');
  const [intPart, fracPart = ''] = s.split('.');
  const B = BigInt(fromBase);
  const steps: WeightStep[] = [];

  // parte intera: posizione da (len-1) giù a 0
  for (let i = 0; i < intPart.length; i++) {
    const ch = intPart[i];
    const d = digitValue(ch);
    const pos = intPart.length - 1 - i;
    const weight = B ** BigInt(pos);
    steps.push({
      digit: ch.toUpperCase(),
      digitValue: d,
      position: pos,
      weight: weight.toString(),
      contribution: (BigInt(d) * weight).toString(),
    });
  }
  // parte frazionaria: posizione -1, -2, ...
  for (let i = 0; i < fracPart.length; i++) {
    const ch = fracPart[i];
    const d = digitValue(ch);
    const pos = -(i + 1);
    const denom = B ** BigInt(i + 1);
    steps.push({
      digit: ch.toUpperCase(),
      digitValue: d,
      position: pos,
      weight: `1/${denom.toString()}`,
      contribution: d === 0 ? '0' : `${d}/${denom.toString()}`,
    });
  }
  return steps;
}

/* ============================================================
   UTILITÀ DI FORMATTAZIONE
   ============================================================ */

/** Raggruppa le cifre della parte intera da destra (es. nibble a 4). */
export function groupInteger(digits: string, size: number, sep = ' '): string {
  if (size <= 0) return digits;
  const rev = digits.split('').reverse();
  const chunks: string[] = [];
  for (let i = 0; i < rev.length; i += size) {
    chunks.push(rev.slice(i, i + size).reverse().join(''));
  }
  return chunks.reverse().join(sep);
}

/** Raggruppa le cifre della parte frazionaria da sinistra. */
export function groupFraction(digits: string, size: number, sep = ' '): string {
  if (size <= 0) return digits;
  const chunks: string[] = [];
  for (let i = 0; i < digits.length; i += size) {
    chunks.push(digits.slice(i, i + size));
  }
  return chunks.join(sep);
}

/** Nome leggibile di una base comune. */
export function baseName(base: number): string {
  switch (base) {
    case 2:
      return 'BIN';
    case 8:
      return 'OCT';
    case 10:
      return 'DEC';
    case 16:
      return 'HEX';
    default:
      return `B${base}`;
  }
}

/** Prefisso convenzionale di una base (0b/0o/0x), altrimenti stringa vuota. */
export function basePrefix(base: number): string {
  switch (base) {
    case 2:
      return '0b';
    case 8:
      return '0o';
    case 16:
      return '0x';
    default:
      return '';
  }
}
