/**
 * I vincoli restringono DAVVERO cosa esce, su tutti i seed.
 *
 * È il cuore del nuovo modello: una verifica "solo binario" non deve mai
 * produrre una conversione 10→16, e una "complemento a due" non deve mai
 * chiedere il modulo e segno. Se questi test passano, il pool è affidabile;
 * se falliscono, uno studente si vedrebbe un argomento che non stava studiando.
 */
import { describe, it, expect } from 'vitest';
import { generateSet, type Constraints, type ModuleKey } from './generator';

/** Genera molte prove con seed diversi e raccoglie tutti gli esercizi. */
function sample(modules: ModuleKey[], c: Constraints, n = 200) {
  const out = [];
  for (let seed = 1; seed <= n; seed++) {
    out.push(...generateSet(modules, 'hard', 3, seed * 1000 + 7, c));
  }
  return out;
}

describe('vincolo anchorBase (solo binario / solo esadecimale)', () => {
  it('ogni conversione "solo binario" ha la base 2 da un lato', () => {
    for (const ex of sample(['converter'], { anchorBase: 2, bases: [8, 10, 16] })) {
      const from = Number(ex.params.from);
      const to = Number(ex.params.to);
      expect(from === 2 || to === 2).toBe(true);
    }
  });

  it('esercita entrambi i versi (verso e da binario)', () => {
    const s = sample(['converter'], { anchorBase: 2, bases: [10] });
    expect(s.some((ex) => Number(ex.params.from) === 2)).toBe(true);
    expect(s.some((ex) => Number(ex.params.to) === 2)).toBe(true);
  });

  it('ogni conversione "solo esadecimale" ha la base 16 da un lato', () => {
    for (const ex of sample(['converter'], { anchorBase: 16, bases: [2, 8, 10] })) {
      const from = Number(ex.params.from);
      const to = Number(ex.params.to);
      expect(from === 16 || to === 16).toBe(true);
    }
  });
});

describe('vincolo bases (mista)', () => {
  it('usa solo le basi ammesse, in entrambe le direzioni', () => {
    const allowed = new Set([2, 8, 10, 16]);
    for (const ex of sample(['converter'], { bases: [2, 8, 10, 16] })) {
      expect(allowed.has(Number(ex.params.from))).toBe(true);
      expect(allowed.has(Number(ex.params.to))).toBe(true);
    }
  });
});

describe('vincolo ops (somme e sottrazioni)', () => {
  it('non produce mai moltiplicazioni quando ops = add, sub', () => {
    for (const ex of sample(['arithmetic'], { bases: [2, 8, 16], ops: ['add', 'sub'] })) {
      expect(['add', 'sub']).toContain(String(ex.params.op));
    }
  });

  it('con ops = add produce solo addizioni', () => {
    for (const ex of sample(['arithmetic'], { bases: [2], ops: ['add'] })) {
      expect(ex.params.op).toBe('add');
      expect(ex.params.base).toBe(2);
    }
  });
});

describe('vincolo reprs/bits (segno vs complemento a due)', () => {
  it('"complemento a due" non chiede mai altre rappresentazioni', () => {
    for (const ex of sample(['signed'], { reprs: ['twos'], bits: [8, 16] })) {
      const repr = ex.params.repr;
      expect(repr).toBe('twos');
    }
  });

  it('"numeri con segno" esclude il complemento a due', () => {
    for (const ex of sample(['signed'], { reprs: ['signMag', 'ones', 'excess'], bits: [8, 16] })) {
      expect(ex.params.repr).not.toBe('twos');
    }
  });

  it('rispetta le ampiezze in bit ammesse', () => {
    for (const ex of sample(['signed'], { reprs: ['twos'], bits: [16, 32] })) {
      // Attenzione: in signedEncode `bits` è il NUMERO di bit; in signedDecode
      // `bits` è la stringa binaria e l'ampiezza sta in `width`.
      const w = ex.kind === 'signedEncode' ? Number(ex.params.bits) : Number(ex.params.width);
      expect([16, 32]).toContain(w);
    }
  });
});

describe('vincolo formats (virgola mobile)', () => {
  it('usa solo i formati ammessi', () => {
    for (const ex of sample(['ieee'], { formats: ['single'] })) {
      expect(ex.params.format).toBe('single');
    }
  });
});

describe('retrocompatibilità', () => {
  it('senza vincoli la palestra continua a spaziare su più basi', () => {
    const s = generateSet(['converter'], 'hard', 40, 12345);
    const bases = new Set(s.flatMap((ex) => [Number(ex.params.from), Number(ex.params.to)]));
    // Difficoltà alta senza vincoli: attinge a molte basi, non solo 2 e 10.
    expect(bases.size).toBeGreaterThan(3);
  });
});
