/**
 * Codifiche del testo: ASCII, Unicode, UTF-8/16/32, Base64 e URL-encoding.
 *
 * Obiettivo didattico: mostrare la catena completa
 *   carattere → code point → byte → bit → Base64
 * in modo che ogni passaggio sia ispezionabile.
 */

import {
  C1_NAMES,
  CP437_HIGH,
  CP1252_HIGH,
  LATIN1_HIGH,
  UNASSIGNED,
  UNICODE_NAMES,
} from './codepages';

// Ri-esportate da qui perché `text.ts` resta l'unico punto d'ingresso del
// modulo «testo»: chi consuma il motore non deve sapere che i dati stanno in
// un file a parte.
export { C1_NAMES, CP437_HIGH, CP1252_HIGH, LATIN1_HIGH, UNASSIGNED, UNICODE_NAMES } from './codepages';

/* ============================================================
   ASCII
   ============================================================ */

/** Nomi e descrizioni dei caratteri di controllo ASCII (0..31 e 127). */
export const CONTROL_NAMES: Record<number, { abbr: string; name: string }> = {
  0: { abbr: 'NUL', name: 'Null' },
  1: { abbr: 'SOH', name: 'Start of Heading' },
  2: { abbr: 'STX', name: 'Start of Text' },
  3: { abbr: 'ETX', name: 'End of Text' },
  4: { abbr: 'EOT', name: 'End of Transmission' },
  5: { abbr: 'ENQ', name: 'Enquiry' },
  6: { abbr: 'ACK', name: 'Acknowledge' },
  7: { abbr: 'BEL', name: 'Bell' },
  8: { abbr: 'BS', name: 'Backspace' },
  9: { abbr: 'HT', name: 'Horizontal Tab' },
  10: { abbr: 'LF', name: 'Line Feed' },
  11: { abbr: 'VT', name: 'Vertical Tab' },
  12: { abbr: 'FF', name: 'Form Feed' },
  13: { abbr: 'CR', name: 'Carriage Return' },
  14: { abbr: 'SO', name: 'Shift Out' },
  15: { abbr: 'SI', name: 'Shift In' },
  16: { abbr: 'DLE', name: 'Data Link Escape' },
  17: { abbr: 'DC1', name: 'Device Control 1' },
  18: { abbr: 'DC2', name: 'Device Control 2' },
  19: { abbr: 'DC3', name: 'Device Control 3' },
  20: { abbr: 'DC4', name: 'Device Control 4' },
  21: { abbr: 'NAK', name: 'Negative Acknowledge' },
  22: { abbr: 'SYN', name: 'Synchronous Idle' },
  23: { abbr: 'ETB', name: 'End of Transmission Block' },
  24: { abbr: 'CAN', name: 'Cancel' },
  25: { abbr: 'EM', name: 'End of Medium' },
  26: { abbr: 'SUB', name: 'Substitute' },
  27: { abbr: 'ESC', name: 'Escape' },
  28: { abbr: 'FS', name: 'File Separator' },
  29: { abbr: 'GS', name: 'Group Separator' },
  30: { abbr: 'RS', name: 'Record Separator' },
  31: { abbr: 'US', name: 'Unit Separator' },
  127: { abbr: 'DEL', name: 'Delete' },
};

/** Simbolo con cui rendiamo visibile uno spazio (U+2420 SYMBOL FOR SPACE). */
const SPACE_GLYPH = '␠';

export type CharCategory =
  | 'control'
  | 'digit'
  | 'upper'
  | 'lower'
  | 'punct'
  | 'space'
  | 'extended'
  | 'unassigned';

export interface AsciiEntry {
  /** Il byte (0..255): quello che sta davvero in memoria. */
  code: number;
  /** Il carattere reso in JavaScript (stringa vuota se il byte non è assegnato). */
  char: string;
  /** Cosa scrivere in tabella: il glifo, oppure la sigla per i controlli. */
  display: string;
  isControl: boolean;
  name: string;
  category: CharCategory;
  /**
   * Code point Unicode corrispondente, o UNASSIGNED (-1).
   * Sotto 128 coincide sempre con `code`; sopra dipende dalla code page —
   * ed è precisamente il motivo per cui Unicode è stato inventato.
   */
  cp: number;
}

/* ------------------------------------------------------------
   Code page: quale tabella si sta guardando.
   ------------------------------------------------------------ */

export type CodePage = 'ascii' | 'cp437' | 'latin1' | 'cp1252';

export interface CodePageInfo {
  key: CodePage;
  /** Etichetta breve per i controlli dell'interfaccia. */
  label: string;
  /** Nome per esteso, da mostrare in intestazione ed export. */
  fullName: string;
  bits: 7 | 8;
  /** 128 per ASCII, 256 per le code page estese. */
  size: number;
  year: number;
}

export const CODE_PAGES: readonly CodePageInfo[] = [
  { key: 'ascii', label: 'ASCII', fullName: 'US-ASCII (ISO 646) — 7 bit', bits: 7, size: 128, year: 1963 },
  { key: 'cp437', label: 'CP437', fullName: 'Code page 437 — IBM PC / DOS', bits: 8, size: 256, year: 1981 },
  { key: 'latin1', label: 'Latin-1', fullName: 'ISO 8859-1 (Latin-1)', bits: 8, size: 256, year: 1987 },
  { key: 'cp1252', label: 'Windows-1252', fullName: 'Windows-1252 (ANSI)', bits: 8, size: 256, year: 1990 },
];

export function codePageInfo(page: CodePage): CodePageInfo {
  return CODE_PAGES.find((p) => p.key === page) ?? CODE_PAGES[0];
}

/** Metà alta (128..255) di ogni code page, come code point Unicode. */
const HIGH_HALF: Record<Exclude<CodePage, 'ascii'>, readonly number[]> = {
  cp437: CP437_HIGH,
  latin1: LATIN1_HIGH,
  cp1252: CP1252_HIGH,
};

function asciiCategory(code: number): CharCategory {
  if (code < 32 || code === 127) return 'control';
  if (code === 32) return 'space';
  if (code >= 48 && code <= 57) return 'digit';
  if (code >= 65 && code <= 90) return 'upper';
  if (code >= 97 && code <= 122) return 'lower';
  return 'punct';
}

/** Voce della metà bassa: identica in tutte le code page, perché è ASCII. */
function lowEntry(code: number): AsciiEntry {
  const ctl = CONTROL_NAMES[code];
  const isControl = !!ctl;
  return {
    code,
    char: String.fromCharCode(code),
    display: isControl ? ctl.abbr : code === 32 ? SPACE_GLYPH : String.fromCharCode(code),
    isControl,
    name: isControl ? ctl.name : code === 32 ? 'Space' : String.fromCharCode(code),
    category: asciiCategory(code),
    cp: code,
  };
}

/** Voce della metà alta: qui le tre code page divergono. */
function highEntry(code: number, page: Exclude<CodePage, 'ascii'>): AsciiEntry {
  const cp = HIGH_HALF[page][code - 128] ?? UNASSIGNED;

  if (cp === UNASSIGNED) {
    return {
      code,
      char: '',
      display: '—',
      isControl: false,
      name: 'Unassigned',
      category: 'unassigned',
      cp: UNASSIGNED,
    };
  }

  // In Latin-1 i byte 128–159 sono i controlli C1: occupano lo spazio ma non
  // hanno un glifo. In CP437 e CP1252 quegli stessi byte sono caratteri veri.
  const c1 = page === 'latin1' ? C1_NAMES[code] : undefined;
  if (c1) {
    return {
      code,
      char: String.fromCodePoint(cp),
      display: c1.abbr,
      isControl: true,
      name: c1.name,
      category: 'control',
      cp,
    };
  }

  const char = String.fromCodePoint(cp);
  return {
    code,
    char,
    // U+00A0 (spazio unificatore) è invisibile: gli diamo lo stesso trattamento
    // riservato allo spazio ASCII, altrimenti la cella sembrerebbe vuota.
    display: cp === 0x00a0 ? SPACE_GLYPH : char,
    isControl: false,
    name: UNICODE_NAMES[cp] ?? 'U+' + cp.toString(16).toUpperCase().padStart(4, '0'),
    category: 'extended',
    cp,
  };
}

/**
 * Le tabelle sono immutabili e vengono ricostruite di continuo (griglia,
 * ricerca, confronto tra code page, export): le costruiamo una volta sola.
 */
const TABLE_CACHE = new Map<CodePage, readonly AsciiEntry[]>();

/**
 * Tabella dei caratteri di una code page: 128 voci per ASCII, 256 per le
 * estensioni a 8 bit. L'array restituito NON va modificato (è congelato).
 */
export function charTable(page: CodePage = 'ascii'): readonly AsciiEntry[] {
  const cached = TABLE_CACHE.get(page);
  if (cached) return cached;

  const out: AsciiEntry[] = [];
  for (let code = 0; code < 128; code++) out.push(lowEntry(code));
  if (page !== 'ascii') {
    for (let code = 128; code < 256; code++) out.push(highEntry(code, page));
  }
  const frozen = Object.freeze(out);
  TABLE_CACHE.set(page, frozen);
  return frozen;
}

/**
 * Tabella ASCII completa (0..127), come copia modificabile.
 *
 * Resta una funzione a sé perché la usa anche il generatore di esercizi
 * (`shared/exercises/generator.ts`): la sua firma e il suo contenuto sono
 * vincolati, cambiarli cambierebbe le domande delle verifiche ufficiali.
 */
export function asciiTable(): AsciiEntry[] {
  return charTable('ascii').map((e) => ({ ...e }));
}

/**
 * Lo stesso byte letto con le tre code page estese.
 * È il confronto che rende evidente perché un file «con le accentate sbagliate»
 * non è un file rotto: è solo letto con la tabella sbagliata.
 */
export function compareAcrossPages(code: number): { page: CodePageInfo; entry: AsciiEntry }[] {
  return CODE_PAGES.filter((p) => p.key !== 'ascii').map((page) => ({
    page,
    entry: charTable(page.key)[code],
  }));
}

/* ============================================================
   Code point / Unicode
   ============================================================ */

export interface CodePointInfo {
  cp: number;
  char: string;
  hex: string;
  utf8: number[];
  utf16: number[];
  utf32: number[];
  /** Piano Unicode (0 = BMP). */
  plane: number;
}

/** Scompone una stringa nei suoi code point (gestisce le coppie surrogate). */
export function codePoints(text: string): CodePointInfo[] {
  const out: CodePointInfo[] = [];
  for (const ch of Array.from(text)) {
    const cp = ch.codePointAt(0)!;
    out.push({
      cp,
      char: ch,
      hex: 'U+' + cp.toString(16).toUpperCase().padStart(4, '0'),
      utf8: utf8Bytes(ch),
      utf16: utf16Units(ch),
      utf32: [cp],
      plane: Math.floor(cp / 0x10000),
    });
  }
  return out;
}

/** Byte UTF-8 di una stringa. */
export function utf8Bytes(text: string): number[] {
  return Array.from(new TextEncoder().encode(text));
}

/** Unità a 16 bit UTF-16 (non byte: le unità di codice). */
export function utf16Units(text: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < text.length; i++) out.push(text.charCodeAt(i));
  return out;
}

/** Byte UTF-16 (big-endian di default). */
export function utf16Bytes(text: string, littleEndian = false): number[] {
  const out: number[] = [];
  for (const u of utf16Units(text)) {
    const hi = (u >> 8) & 0xff;
    const lo = u & 0xff;
    out.push(...(littleEndian ? [lo, hi] : [hi, lo]));
  }
  return out;
}

/** Byte UTF-32 (big-endian di default). */
export function utf32Bytes(text: string, littleEndian = false): number[] {
  const out: number[] = [];
  for (const ch of Array.from(text)) {
    const cp = ch.codePointAt(0)!;
    const b = [(cp >>> 24) & 0xff, (cp >>> 16) & 0xff, (cp >>> 8) & 0xff, cp & 0xff];
    out.push(...(littleEndian ? b.reverse() : b));
  }
  return out;
}

export type Encoding = 'utf8' | 'utf16be' | 'utf16le' | 'utf32be' | 'utf32le';

export function encodeText(text: string, enc: Encoding): number[] {
  switch (enc) {
    case 'utf8':
      return utf8Bytes(text);
    case 'utf16be':
      return utf16Bytes(text, false);
    case 'utf16le':
      return utf16Bytes(text, true);
    case 'utf32be':
      return utf32Bytes(text, false);
    case 'utf32le':
      return utf32Bytes(text, true);
  }
}

/**
 * Spiega la struttura UTF-8 di un code point: quanti byte servono e come sono
 * distribuiti i bit (0xxxxxxx / 110xxxxx 10xxxxxx / …).
 */
export function utf8Explain(cp: number): { bytes: number[]; pattern: string[]; length: number } {
  const bytes = utf8Bytes(String.fromCodePoint(cp));
  const pattern = bytes.map((b, i) => {
    const bin = b.toString(2).padStart(8, '0');
    if (bytes.length === 1) return `0${bin.slice(1)}`;
    if (i === 0) {
      const lead = bytes.length === 2 ? '110' : bytes.length === 3 ? '1110' : '11110';
      return `${lead}|${bin.slice(lead.length)}`;
    }
    return `10|${bin.slice(2)}`;
  });
  return { bytes, pattern, length: bytes.length };
}

/* ============================================================
   Base64
   ============================================================ */

const B64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Codifica byte in Base64 (implementazione esplicita, utile a scopo didattico). */
export function bytesToBase64(bytes: number[]): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    const has1 = b1 !== undefined;
    const has2 = b2 !== undefined;
    const triple = (b0 << 16) | ((has1 ? b1 : 0) << 8) | (has2 ? b2 : 0);
    out += B64_ALPHABET[(triple >>> 18) & 0x3f];
    out += B64_ALPHABET[(triple >>> 12) & 0x3f];
    out += has1 ? B64_ALPHABET[(triple >>> 6) & 0x3f] : '=';
    out += has2 ? B64_ALPHABET[triple & 0x3f] : '=';
  }
  return out;
}

export function base64ToBytes(b64: string): number[] {
  const clean = b64.replace(/[^A-Za-z0-9+/=]/g, '');
  const out: number[] = [];
  for (let i = 0; i < clean.length; i += 4) {
    const c = [0, 1, 2, 3].map((k) => {
      const ch = clean[i + k];
      if (ch === undefined || ch === '=') return -1;
      return B64_ALPHABET.indexOf(ch);
    });
    if (c[0] < 0 || c[1] < 0) break;
    const triple = (c[0] << 18) | (c[1] << 12) | ((c[2] < 0 ? 0 : c[2]) << 6) | (c[3] < 0 ? 0 : c[3]);
    out.push((triple >>> 16) & 0xff);
    if (c[2] >= 0) out.push((triple >>> 8) & 0xff);
    if (c[3] >= 0) out.push(triple & 0xff);
  }
  return out;
}

export function textToBase64(text: string): string {
  return bytesToBase64(utf8Bytes(text));
}

export function base64ToText(b64: string): string {
  return new TextDecoder().decode(new Uint8Array(base64ToBytes(b64)));
}

export interface B64Group {
  bytes: number[];
  bits: string;
  sextets: string[];
  chars: string[];
  padding: number;
}

/** Scompone la codifica Base64 in gruppi 3 byte → 24 bit → 4 sestetti. */
export function base64Steps(bytes: number[]): B64Group[] {
  const groups: B64Group[] = [];
  for (let i = 0; i < bytes.length; i += 3) {
    const chunk = bytes.slice(i, i + 3);
    const padding = 3 - chunk.length;
    const padded = [...chunk, ...Array(padding).fill(0)];
    const bits = padded.map((b) => b.toString(2).padStart(8, '0')).join('');
    const sextets = [0, 1, 2, 3].map((k) => bits.slice(k * 6, k * 6 + 6));
    const chars = sextets.map((s, k) => {
      if (padding === 2 && k >= 2) return '=';
      if (padding === 1 && k >= 3) return '=';
      return B64_ALPHABET[parseInt(s, 2)];
    });
    groups.push({ bytes: chunk, bits, sextets, chars, padding });
  }
  return groups;
}

/* ============================================================
   URL encoding
   ============================================================ */

export function urlEncode(text: string): string {
  return encodeURIComponent(text);
}

export function urlDecode(text: string): string {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}

/* ============================================================
   Utilità di formattazione byte
   ============================================================ */

export function bytesToHex(bytes: number[], sep = ' '): string {
  return bytes.map((b) => b.toString(16).toUpperCase().padStart(2, '0')).join(sep);
}

export function bytesToBin(bytes: number[], sep = ' '): string {
  return bytes.map((b) => b.toString(2).padStart(8, '0')).join(sep);
}

export function bytesToDec(bytes: number[], sep = ' '): string {
  return bytes.map((b) => String(b)).join(sep);
}

/** Blocchi Unicode utili in classe (per il selettore dell'esploratore). */
export const UNICODE_BLOCKS: { name: string; start: number; end: number }[] = [
  { name: 'Basic Latin (ASCII)', start: 0x0000, end: 0x007f },
  { name: 'Latin-1 Supplement', start: 0x0080, end: 0x00ff },
  { name: 'Latin Extended-A', start: 0x0100, end: 0x017f },
  { name: 'Greek and Coptic', start: 0x0370, end: 0x03ff },
  { name: 'Cyrillic', start: 0x0400, end: 0x04ff },
  { name: 'General Punctuation', start: 0x2000, end: 0x206f },
  { name: 'Currency Symbols', start: 0x20a0, end: 0x20bf },
  { name: 'Arrows', start: 0x2190, end: 0x21ff },
  { name: 'Mathematical Operators', start: 0x2200, end: 0x22ff },
  { name: 'Box Drawing', start: 0x2500, end: 0x257f },
  { name: 'Geometric Shapes', start: 0x25a0, end: 0x25ff },
  { name: 'Miscellaneous Symbols', start: 0x2600, end: 0x26ff },
  { name: 'Dingbats', start: 0x2700, end: 0x27bf },
  { name: 'Emoticons', start: 0x1f600, end: 0x1f64f },
  { name: 'Transport and Map', start: 0x1f680, end: 0x1f6ff },
];
