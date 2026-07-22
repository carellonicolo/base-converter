/**
 * Aritmetica in colonna in una base qualsiasi (2..36).
 *
 * Riproduce fedelmente l'algoritmo che si svolge a mano sul quaderno, esponendo
 * ogni colonna con il suo riporto (addizione), prestito (sottrazione) o
 * prodotto parziale (moltiplicazione). Serve sia alla pagina didattica sia al
 * generatore di esercizi e alla correzione delle verifiche.
 */

import { assertBase, digitValue, digitChar, parseNumber, formatIntInBase, ConvError } from './bases';

export type Op = 'add' | 'sub' | 'mul';

/** Valida e normalizza un operando intero non negativo scritto in `base`. */
function parseOperand(text: string, base: number): bigint {
  const n = parseNumber(text, base);
  if (n.fracNum !== 0n) throw new ConvError('invalid-digit', { d: '.', base });
  return n.negative ? -n.intValue : n.intValue;
}

/** Cifre di un valore in una base, come array di numeri (più significativa per prima). */
function digitsOf(value: bigint, base: number): number[] {
  const s = formatIntInBase(value, base);
  return s.split('').map((c) => digitValue(c));
}

export interface AddColumn {
  /** Posizione della colonna, 0 = cifra meno significativa. */
  pos: number;
  a: number;
  b: number;
  carryIn: number;
  total: number;
  digit: number;
  carryOut: number;
}

export interface AddResult {
  base: number;
  a: string;
  b: string;
  result: string;
  columns: AddColumn[]; // dalla colonna meno significativa alla più significativa
}

/** Addizione in colonna con riporti. Operandi non negativi. */
export function addInBase(aText: string, bText: string, base: number): AddResult {
  assertBase(base);
  const av = parseOperand(aText, base);
  const bv = parseOperand(bText, base);
  const A = digitsOf(av < 0n ? -av : av, base).reverse();
  const B = digitsOf(bv < 0n ? -bv : bv, base).reverse();
  const n = Math.max(A.length, B.length);
  const columns: AddColumn[] = [];
  let carry = 0;
  for (let i = 0; i < n; i++) {
    const da = A[i] ?? 0;
    const db = B[i] ?? 0;
    const total = da + db + carry;
    const digit = total % base;
    const carryOut = Math.floor(total / base);
    columns.push({ pos: i, a: da, b: db, carryIn: carry, total, digit, carryOut });
    carry = carryOut;
  }
  if (carry > 0) {
    columns.push({ pos: n, a: 0, b: 0, carryIn: carry, total: carry, digit: carry % base, carryOut: 0 });
  }
  const result = columns
    .map((c) => digitChar(c.digit))
    .reverse()
    .join('')
    .replace(/^0+(?=.)/, '');
  return { base, a: formatIntInBase(av, base), b: formatIntInBase(bv, base), result, columns };
}

export interface SubColumn {
  pos: number;
  a: number;
  b: number;
  borrowIn: number;
  /** Cifra in alto dopo aver eventualmente ricevuto il prestito. */
  topAfter: number;
  digit: number;
  borrowOut: number;
}

export interface SubResult {
  base: number;
  a: string;
  b: string;
  result: string;
  /** true se b > a: l'algoritmo è svolto come b - a e il risultato è negativo. */
  negative: boolean;
  columns: SubColumn[];
}

/**
 * Sottrazione in colonna con prestiti. Se il sottraendo è maggiore, svolge
 * la sottrazione invertita e marca il risultato come negativo (come si insegna).
 */
export function subInBase(aText: string, bText: string, base: number): SubResult {
  assertBase(base);
  let av = parseOperand(aText, base);
  let bv = parseOperand(bText, base);
  if (av < 0n) av = -av;
  if (bv < 0n) bv = -bv;
  const negative = bv > av;
  const hi = negative ? bv : av;
  const lo = negative ? av : bv;

  const A = digitsOf(hi, base).reverse();
  const B = digitsOf(lo, base).reverse();
  const columns: SubColumn[] = [];
  let borrow = 0;
  for (let i = 0; i < A.length; i++) {
    const da = A[i] ?? 0;
    const db = B[i] ?? 0;
    let top = da - borrow;
    let borrowOut = 0;
    if (top < db) {
      top += base;
      borrowOut = 1;
    }
    const digit = top - db;
    columns.push({ pos: i, a: da, b: db, borrowIn: borrow, topAfter: top, digit, borrowOut });
    borrow = borrowOut;
  }
  const result = columns
    .map((c) => digitChar(c.digit))
    .reverse()
    .join('')
    .replace(/^0+(?=.)/, '');
  return { base, a: formatIntInBase(av, base), b: formatIntInBase(bv, base), result, negative, columns };
}

export interface PartialProduct {
  /** Cifra del moltiplicatore usata (valore). */
  byDigit: number;
  /** Posizione della cifra nel moltiplicatore (0 = meno significativa) → shift. */
  shift: number;
  /** Prodotto parziale già shiftato, nella base. */
  value: string;
}

export interface MulResult {
  base: number;
  a: string;
  b: string;
  result: string;
  partials: PartialProduct[];
}

/** Moltiplicazione con prodotti parziali (uno per cifra del moltiplicatore). */
export function mulInBase(aText: string, bText: string, base: number): MulResult {
  assertBase(base);
  const av0 = parseOperand(aText, base);
  const bv0 = parseOperand(bText, base);
  const av = av0 < 0n ? -av0 : av0;
  const bv = bv0 < 0n ? -bv0 : bv0;
  const B = BigInt(base);
  const bDigits = digitsOf(bv, base).reverse(); // meno significativa per prima
  const partials: PartialProduct[] = [];
  for (let i = 0; i < bDigits.length; i++) {
    const d = bDigits[i];
    const val = av * BigInt(d) * B ** BigInt(i);
    partials.push({ byDigit: d, shift: i, value: formatIntInBase(val, base) });
  }
  const result = formatIntInBase(av * bv, base);
  return { base, a: formatIntInBase(av, base), b: formatIntInBase(bv, base), result, partials };
}

export interface ComputeResult {
  op: Op;
  base: number;
  a: string;
  b: string;
  /** Risultato nella base (con eventuale segno '-'). */
  result: string;
  /** Controprova in base 10. */
  decimal: string;
  add?: AddResult;
  sub?: SubResult;
  mul?: MulResult;
}

/** Esegue l'operazione richiesta restituendo risultato + passaggi + controprova. */
export function compute(op: Op, aText: string, bText: string, base: number): ComputeResult {
  const av = parseOperand(aText, base);
  const bv = parseOperand(bText, base);
  let decimalValue: bigint;
  const out: ComputeResult = { op, base, a: aText, b: bText, result: '', decimal: '' };
  if (op === 'add') {
    const r = addInBase(aText, bText, base);
    out.add = r;
    out.result = r.result;
    decimalValue = av + bv;
  } else if (op === 'sub') {
    const r = subInBase(aText, bText, base);
    out.sub = r;
    out.result = (r.negative ? '-' : '') + r.result;
    decimalValue = av - bv;
  } else {
    const r = mulInBase(aText, bText, base);
    out.mul = r;
    out.result = r.result;
    decimalValue = av * bv;
  }
  out.decimal = decimalValue.toString();
  return out;
}
