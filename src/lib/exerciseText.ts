/**
 * Rende il testo di un esercizio nella lingua corrente.
 *
 * Gli esercizi viaggiano come `kind` + `params` (indipendenti dalla lingua):
 * qui li trasformiamo nella frase mostrata allo studente. Così la correzione
 * lato server non deve sapere nulla di italiano o inglese.
 */

import type { Exercise } from '../../shared/exercises/generator';
import { baseName } from '../../shared/engine/bases';

type Tfn = (key: string, vars?: Record<string, string | number>) => string;

const OP_SYMBOL: Record<string, string> = { add: '+', sub: '−', mul: '×' };

function reprName(repr: string, t: Tfn): string {
  switch (repr) {
    case 'twos':
      return t('ex.reprTwos');
    case 'ones':
      return t('ex.reprOnes');
    case 'signMag':
      return t('ex.reprSignMag');
    case 'excess':
      return t('ex.reprExcess');
    default:
      return repr;
  }
}

/** Testo della consegna. */
export function exercisePrompt(ex: Exercise, t: Tfn): string {
  const p = ex.params;
  switch (ex.kind) {
    case 'conv':
      return t('ex.conv', { value: String(p.value), from: Number(p.from), to: Number(p.to) });
    case 'arith':
      return t('ex.arith', {
        a: String(p.a),
        b: String(p.b),
        base: Number(p.base),
        opSym: OP_SYMBOL[String(p.op)] ?? String(p.op),
      });
    case 'signedEncode':
      return t('ex.signedEncode', { value: Number(p.value), bits: Number(p.bits), reprName: reprName(String(p.repr), t) });
    case 'signedDecode':
      return t('ex.signedDecode', { bits: String(p.bits), reprName: reprName(String(p.repr), t) });
    case 'ieeeValue':
      return t('ex.ieeeValue', { bits: String(p.bits), format: String(p.format) });
    case 'ieeeExponent':
      return t('ex.ieeeExponent', { value: String(p.value) });
    case 'asciiCode':
      return t('ex.asciiCode', { char: String(p.char), radix: Number(p.radix) });
    case 'asciiChar':
      return t('ex.asciiChar', { code: Number(p.code) });
    case 'utf8len':
      return t('ex.utf8len', { char: String(p.char) });
    case 'base64':
      return t('ex.base64', { text: String(p.text) });
    default:
      return '';
  }
}

/** Etichetta breve della base/formato atteso in risposta (aiuto visivo). */
export function expectedHint(ex: Exercise): string {
  const p = ex.params;
  switch (ex.kind) {
    case 'conv':
      return baseName(Number(p.to));
    case 'arith':
      return baseName(Number(p.base));
    case 'signedEncode':
      return `${p.bits} bit`;
    case 'signedDecode':
    case 'ieeeExponent':
    case 'utf8len':
      return 'DEC';
    case 'asciiCode':
      return baseName(Number(p.radix));
    case 'ieeeValue':
      return 'DEC';
    case 'base64':
      return 'Base64';
    default:
      return '';
  }
}

/** Nome leggibile del modulo. */
export function moduleLabel(module: string, t: Tfn): string {
  switch (module) {
    case 'converter':
      return t('home.convTitle');
    case 'arithmetic':
      return t('home.arithTitle');
    case 'signed':
      return t('home.signedTitle');
    case 'ieee':
      return t('home.ieeeTitle');
    case 'text':
      return t('home.textTitle');
    default:
      return module;
  }
}
