/**
 * Generatore di esercizi — deterministico dato un seed.
 *
 * Il determinismo è essenziale: la verifica ufficiale viene generata dal seed
 * salvato sul server, quindi la stessa prova può essere ricostruita
 * identica per la correzione e per la revisione con lo studente, senza
 * memorizzare l'intero testo delle domande.
 *
 * I testi delle domande NON sono qui: l'esercizio porta `kind` + `params` e
 * l'interfaccia li rende nella lingua scelta. Così la correzione lato server
 * è indipendente dalla lingua.
 */

import { convert, formatIntInBase, baseName } from '../engine/bases';
import { compute, type Op } from '../engine/arithmetic';
import { encode as signEncode, decode as signDecode, type Repr } from '../engine/signed';
import { encode as ieeeEncode, analyzeBits } from '../engine/ieee754';
import { utf8Bytes, textToBase64, asciiTable } from '../engine/text';

export type ModuleKey = 'converter' | 'arithmetic' | 'signed' | 'ieee' | 'text';
export type Difficulty = 'easy' | 'medium' | 'hard';

export const MODULES: ModuleKey[] = ['converter', 'arithmetic', 'signed', 'ieee', 'text'];

export type ExerciseKind =
  | 'conv'
  | 'arith'
  | 'signedEncode'
  | 'signedDecode'
  | 'ieeeValue'
  | 'ieeeExponent'
  | 'asciiCode'
  | 'asciiChar'
  | 'utf8len'
  | 'base64';

export interface Exercise {
  id: string;
  module: ModuleKey;
  kind: ExerciseKind;
  difficulty: Difficulty;
  /** Parametri per rendere il testo della domanda nella lingua scelta. */
  params: Record<string, string | number>;
  /** Risposta canonica (minuscola, senza separatori). */
  answer: string;
  /** Punti assegnati (usati per il voto della verifica). */
  points: number;
}

/* ---------------- PRNG deterministico (mulberry32) ---------------- */

export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hash stringa → intero, per derivare seed da stringhe (es. email+data). */
export function hashSeed(text: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length) % arr.length];
}

function randInt(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

/* ---------------- Generatori per modulo ---------------- */

function genConverter(rng: () => number, d: Difficulty, id: string): Exercise {
  let from: number;
  let to: number;
  let value: number;
  if (d === 'easy') {
    const pair = pick(rng, [
      [10, 2],
      [2, 10],
      [10, 16],
      [16, 10],
    ]);
    [from, to] = pair;
    value = randInt(rng, 1, 63);
  } else if (d === 'medium') {
    const bases = [2, 8, 10, 16];
    from = pick(rng, bases);
    to = pick(rng, bases.filter((b) => b !== from));
    value = randInt(rng, 16, 1023);
  } else {
    const bases = [3, 5, 7, 12, 20, 36, 2, 8, 16];
    from = pick(rng, bases);
    to = pick(rng, bases.filter((b) => b !== from));
    value = randInt(rng, 100, 65535);
  }
  const source = formatIntInBase(BigInt(value), from);
  const answer = convert(source, from, to).text;
  return {
    id,
    module: 'converter',
    kind: 'conv',
    difficulty: d,
    params: { value: source, from, to, fromName: baseName(from), toName: baseName(to) },
    answer,
    points: d === 'easy' ? 1 : d === 'medium' ? 2 : 3,
  };
}

function genArithmetic(rng: () => number, d: Difficulty, id: string): Exercise {
  const base = d === 'easy' ? 2 : pick(rng, [2, 8, 16]);
  const op: Op = d === 'easy' ? 'add' : d === 'medium' ? pick(rng, ['add', 'sub'] as Op[]) : pick(rng, ['add', 'sub', 'mul'] as Op[]);
  const maxV = d === 'easy' ? 15 : d === 'medium' ? 255 : 4095;
  let a = randInt(rng, 1, maxV);
  let b = randInt(rng, 1, op === 'mul' ? Math.min(15, maxV) : maxV);
  if (op === 'sub' && b > a) [a, b] = [b, a]; // evitiamo risultati negativi negli esercizi
  const aT = formatIntInBase(BigInt(a), base);
  const bT = formatIntInBase(BigInt(b), base);
  const r = compute(op, aT, bT, base);
  return {
    id,
    module: 'arithmetic',
    kind: 'arith',
    difficulty: d,
    params: { a: aT, b: bT, base, op, baseName: baseName(base) },
    answer: r.result,
    points: d === 'easy' ? 1 : d === 'medium' ? 2 : 3,
  };
}

function genSigned(rng: () => number, d: Difficulty, id: string): Exercise {
  const bits = d === 'easy' ? 8 : pick(rng, [8, 16]);
  const repr: Repr = d === 'easy' ? 'twos' : d === 'medium' ? pick(rng, ['twos', 'ones'] as Repr[]) : pick(rng, ['twos', 'ones', 'signMag', 'excess'] as Repr[]);
  const limit = bits === 8 ? 100 : 20000;
  const value = randInt(rng, -limit, limit);
  const encodeDirection = rng() < 0.5;
  const encoded = signEncode(BigInt(value), bits, repr);
  if (encodeDirection) {
    return {
      id,
      module: 'signed',
      kind: 'signedEncode',
      difficulty: d,
      params: { value, bits, repr },
      answer: encoded,
      points: d === 'easy' ? 1 : d === 'medium' ? 2 : 3,
    };
  }
  return {
    id,
    module: 'signed',
    kind: 'signedDecode',
    difficulty: d,
    params: { bits: encoded, width: bits, repr },
    answer: signDecode(encoded, repr).toString(),
    points: d === 'easy' ? 1 : d === 'medium' ? 2 : 3,
  };
}

function genIeee(rng: () => number, d: Difficulty, id: string): Exercise {
  const simple = [1, 2, 0.5, -1, -2, 4, 0.25, 8, -0.5];
  if (d === 'easy') {
    // Dato un valore semplice, quanti bit di esponente memorizzato?
    const v = pick(rng, simple);
    const bits = ieeeEncode(v, 'single');
    const info = analyzeBits(bits, 'single');
    return {
      id,
      module: 'ieee',
      kind: 'ieeeExponent',
      difficulty: d,
      params: { value: v, format: 'single' },
      answer: String(info.expRaw),
      points: 1,
    };
  }
  if (d === 'medium') {
    const v = pick(rng, simple);
    return {
      id,
      module: 'ieee',
      kind: 'ieeeValue',
      difficulty: d,
      params: { bits: ieeeEncode(v, 'half'), format: 'half' },
      answer: String(v),
      points: 2,
    };
  }
  const v = pick(rng, [3.5, -6.25, 12.75, 0.375, -1.5]);
  return {
    id,
    module: 'ieee',
    kind: 'ieeeValue',
    difficulty: d,
    params: { bits: ieeeEncode(v, 'half'), format: 'half' },
    answer: String(v),
    points: 3,
  };
}

function genText(rng: () => number, d: Difficulty, id: string): Exercise {
  const printable = asciiTable().filter((e) => !e.isControl && e.code !== 32);
  if (d === 'easy') {
    const e = pick(rng, printable);
    const asHex = rng() < 0.5;
    return {
      id,
      module: 'text',
      kind: 'asciiCode',
      difficulty: d,
      params: { char: e.char, radix: asHex ? 16 : 10 },
      answer: asHex ? e.code.toString(16) : String(e.code),
      points: 1,
    };
  }
  if (d === 'medium') {
    const kind = pick(rng, ['asciiChar', 'utf8len'] as const);
    if (kind === 'asciiChar') {
      const e = pick(rng, printable);
      return {
        id,
        module: 'text',
        kind: 'asciiChar',
        difficulty: d,
        params: { code: e.code },
        answer: e.char,
        points: 2,
      };
    }
    const ch = pick(rng, ['€', 'à', 'A', 'ß', '☃', '中']);
    return {
      id,
      module: 'text',
      kind: 'utf8len',
      difficulty: d,
      params: { char: ch },
      answer: String(utf8Bytes(ch).length),
      points: 2,
    };
  }
  const word = pick(rng, ['Man', 'Ciao', 'Bit', 'Sun', 'Hex']);
  return {
    id,
    module: 'text',
    kind: 'base64',
    difficulty: d,
    params: { text: word },
    answer: textToBase64(word),
    points: 3,
  };
}

const GENERATORS: Record<ModuleKey, (rng: () => number, d: Difficulty, id: string) => Exercise> = {
  converter: genConverter,
  arithmetic: genArithmetic,
  signed: genSigned,
  ieee: genIeee,
  text: genText,
};

/** Genera un singolo esercizio deterministico. */
export function generateExercise(module: ModuleKey, difficulty: Difficulty, seed: number, index = 0): Exercise {
  const rng = makeRng(seed + index * 7919);
  return GENERATORS[module](rng, difficulty, `${module}-${seed}-${index}`);
}

/**
 * Genera una serie di esercizi mescolando i moduli richiesti.
 * Usata dalla palestra (seed casuale) e dalla verifica (seed salvato).
 */
export function generateSet(
  modules: ModuleKey[],
  difficulty: Difficulty,
  count: number,
  seed: number
): Exercise[] {
  const mods = modules.length ? modules : MODULES;
  const out: Exercise[] = [];
  for (let i = 0; i < count; i++) {
    const rng = makeRng(seed + i * 104729);
    const m = mods[Math.floor(rng() * mods.length) % mods.length];
    out.push(generateExercise(m, difficulty, seed, i));
  }
  return out;
}

/* ---------------- Correzione ---------------- */

/** Normalizza una risposta per il confronto (case, separatori, prefissi, zeri). */
export function normalizeAnswer(kind: ExerciseKind, raw: string): string {
  let s = raw.trim().toLowerCase();
  if (kind === 'asciiChar') return raw.trim(); // il carattere è case-sensitive
  if (kind === 'base64') return raw.trim(); // Base64 è case-sensitive
  s = s.replace(/[\s_]/g, '');
  s = s.replace(/^0x|^0b|^0o/, '');
  s = s.replace(',', '.');
  return s;
}

/** True se la risposta dello studente è corretta. */
export function checkAnswer(ex: Exercise, raw: string): boolean {
  const given = normalizeAnswer(ex.kind, raw);
  const expected = normalizeAnswer(ex.kind, ex.answer);
  if (given === expected) return true;

  // Per le risposte numeriche in una base, accettiamo zeri non significativi.
  if (ex.kind === 'conv' || ex.kind === 'arith' || ex.kind === 'signedEncode') {
    const stripZeros = (x: string) => {
      const neg = x.startsWith('-');
      const body = (neg ? x.slice(1) : x).replace(/^0+(?=.)/, '');
      return (neg ? '-' : '') + body;
    };
    if (stripZeros(given) === stripZeros(expected)) return true;
  }
  // Valori numerici decimali equivalenti (es. "3.5" vs "3.50").
  if (ex.kind === 'ieeeValue' || ex.kind === 'signedDecode' || ex.kind === 'ieeeExponent' || ex.kind === 'utf8len') {
    const a = Number(given);
    const b = Number(expected);
    if (Number.isFinite(a) && Number.isFinite(b) && a === b) return true;
  }
  return false;
}
