/**
 * Generatore PDF minimale — abbastanza per stampare il poster della tabella
 * dei caratteri, e non una riga di più.
 *
 * Perché scritto a mano invece di una libreria: la CSP del sito
 * (`public/_headers`) vieta gli script da CDN, e una dipendenza npm da ~350 kB
 * peserebbe su una PWA che deve funzionare offline. Un PDF, del resto, è solo
 * testo: un'intestazione, degli oggetti numerati, uno stream di comandi di
 * disegno e una tabella di offset in byte.
 *
 * ─── I font ────────────────────────────────────────────────────────────────
 * Senza font incorporati si possono usare i 14 font standard, garantiti da
 * ogni lettore PDF. Con WinAnsiEncoding (che è di fatto CP1252) Courier ed
 * Helvetica coprono ASCII, Latin-1 e Windows-1252 al completo, con il testo
 * che resta SELEZIONABILE e CERCABILE nel PDF.
 *
 * Fuori restano ~76 glifi di CP437. Per quelli la strategia è a tre livelli:
 *   1. WinAnsi        → Courier (à ± ° ÷ ² µ ƒ ½ ¿ « » …)
 *   2. font Symbol    → greco e matematica (Symbol mappa α su «a», Σ su «S»…)
 *   3. disegno        → box-drawing e blocchi: sono pura geometria, si
 *                       tracciano con linee e rettangoli.
 * `planGlyph()` sceglie il livello; il test `ascii-export` verifica che per
 * OGNI carattere di OGNI code page ne esista uno — nessun glifo può sparire
 * in silenzio.
 */

import { UNICODE_NAMES, CP1252_HIGH } from '../../shared/engine/text';
import type { PosterDoc, PosterFont } from './poster';

/* ============================================================
   Byte, stringhe, numeri
   ============================================================ */

/** Le stringhe che scriviamo nel PDF sono ASCII o già byte WinAnsi: 1 char = 1 byte. */
function ascii(s: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < s.length; i++) out.push(s.charCodeAt(i) & 0xff);
  return out;
}

function n(v: number): string {
  // 3 decimali: sotto il decimo di punto nessuna stampante vede la differenza,
  // e lo stream resta leggero.
  return (Math.round(v * 1000) / 1000).toString();
}

/** #rrggbb → «r g b» con componenti 0..1, come vuole l'operatore `rg`/`RG`. */
function rgb(hex: string): string {
  const h = hex.replace('#', '');
  const v = parseInt(h, 16);
  return `${n(((v >> 16) & 0xff) / 255)} ${n(((v >> 8) & 0xff) / 255)} ${n((v & 0xff) / 255)}`;
}

/* ============================================================
   Font
   ============================================================ */

const FONT_RES = {
  helv: '/F1',
  helvB: '/F2',
  cour: '/F3',
  courB: '/F4',
  sym: '/F5',
} as const;

type FontKey = keyof typeof FONT_RES;

const POSTER_FONT: Record<PosterFont, FontKey> = {
  sans: 'helv',
  'sans-bold': 'helvB',
  mono: 'cour',
  'mono-bold': 'courB',
  glyph: 'cour',
};

/** Courier è monospaziato: 600/1000 di em per ogni carattere, sempre. */
const COURIER_ADVANCE = 0.6;

/* ============================================================
   Copertura dei glifi
   ============================================================ */

/**
 * Code point → byte WinAnsi. La metà alta di WinAnsi coincide con CP1252,
 * quindi la tabella che serve l'abbiamo già nel motore.
 */
function winAnsiByte(cp: number): number | null {
  if (cp >= 0x20 && cp <= 0x7e) return cp;
  const i = CP1252_HIGH.indexOf(cp);
  return i >= 0 ? 128 + i : null;
}

/**
 * Caratteri che WinAnsi non ha ma che capitano nei testi dell'interfaccia
 * (titoli, legenda, note). Senza questa tabella «→» finirebbe stampato come
 * un punto interrogativo.
 */
const WINANSI_FALLBACK: Record<number, string> = {
  0x2192: '->',
  0x2190: '<-',
  0x21d2: '=>',
  0x2212: '-',
  0x2261: '=',
  0x00a0: ' ',
  0x2420: 'SP',
};

/** Converte un testo in byte WinAnsi, traslitterando ciò che non è rappresentabile. */
function toWinAnsiText(text: string): number[] {
  const out: number[] = [];
  for (const ch of text) {
    const cp = ch.codePointAt(0) ?? 0x3f;
    const b = winAnsiByte(cp);
    if (b !== null) {
      out.push(b);
      continue;
    }
    const alt = WINANSI_FALLBACK[cp];
    if (alt) out.push(...ascii(alt));
    else out.push(0x3f);
  }
  return out;
}

/**
 * Greco e matematica presenti nel font Symbol: code point → [codice nel font,
 * larghezza in millesimi di em] (serve per centrare: Symbol non è monospaziato).
 */
const SYMBOL_GLYPHS: Record<number, [number, number]> = {
  0x03b1: [97, 631], // α
  0x0393: [71, 603], // Γ
  0x03c0: [112, 549], // π
  0x03a3: [83, 592], // Σ
  0x03c3: [115, 603], // σ
  0x03c4: [116, 439], // τ
  0x03a6: [70, 763], // Φ
  0x0398: [81, 791], // Θ
  0x03a9: [87, 768], // Ω
  0x03b4: [100, 494], // δ
  0x03c6: [102, 521], // φ
  0x03b5: [101, 439], // ε
  0x221e: [165, 713], // ∞
  0x2229: [199, 768], // ∩
  0x2261: [186, 549], // ≡
  0x2265: [179, 549], // ≥
  0x2264: [163, 549], // ≤
  0x2248: [187, 549], // ≈
  0x221a: [214, 549], // √
  0x2219: [183, 460], // ∙
  0x2320: [243, 686], // ⌠
  0x2321: [245, 686], // ⌡
};

/**
 * Blocchi e mezzi blocchi: frazione [x0, y0, x1, y1] della cella del carattere,
 * più la densità di grigio (1 = nero pieno).
 *
 * ░▒▓ nel font originale sono retini a punti; qui diventano grigi pieni della
 * stessa densità. A 14 pt la resa è indistinguibile e non serve un pattern.
 */
const BLOCK_GLYPHS: Record<number, [number, number, number, number, number]> = {
  0x2588: [0, 0, 1, 1, 1], // █
  0x2584: [0, 0.5, 1, 1, 1], // ▄
  0x2580: [0, 0, 1, 0.5, 1], // ▀
  0x258c: [0, 0, 0.5, 1, 1], // ▌
  0x2590: [0.5, 0, 1, 1, 1], // ▐
  0x2591: [0, 0, 1, 1, 0.3], // ░
  0x2592: [0, 0, 1, 1, 0.55], // ▒
  0x2593: [0, 0, 1, 1, 0.78], // ▓
  0x25a0: [0.18, 0.2, 0.82, 0.8, 1], // ■
};

/** Braccia di un carattere box-drawing: [su, destra, giù, sinistra], 0/1/2 linee. */
type Arms = [number, number, number, number];

const ARM_INDEX: Record<string, number[]> = {
  Up: [0],
  Right: [1],
  Down: [2],
  Left: [3],
  Vertical: [0, 2],
  Horizontal: [1, 3],
};
const ARM_WEIGHT: Record<string, number> = { Light: 1, Single: 1, Double: 2 };

/**
 * Ricava le braccia dal nome Unicode del carattere, che è già la sua specifica:
 *   «Box Drawings Light Down And Right»        → giù e destra, linea singola
 *   «Box Drawings Down Single And Right Double» → giù singola, destra doppia
 * Restituisce null se il nome non è di un box-drawing (o non è riconosciuto).
 */
export function boxArms(cp: number): Arms | null {
  const name = UNICODE_NAMES[cp];
  const prefix = 'Box Drawings ';
  if (!name || !name.startsWith(prefix)) return null;

  const arms: Arms = [0, 0, 0, 0];
  const segments = name.slice(prefix.length).split(' And ');
  const first = segments[0].split(' ');

  if (ARM_WEIGHT[first[0]] !== undefined) {
    // Un peso solo, valido per tutte le direzioni elencate.
    const w = ARM_WEIGHT[first[0]];
    const dirs = [first.slice(1).join(' '), ...segments.slice(1)];
    for (const d of dirs) {
      const ix = ARM_INDEX[d];
      if (!ix) return null;
      for (const i of ix) arms[i] = w;
    }
  } else {
    // Un peso per direzione.
    for (const seg of segments) {
      const parts = seg.split(' ');
      const w = ARM_WEIGHT[parts[parts.length - 1]];
      const ix = ARM_INDEX[parts.slice(0, -1).join(' ')];
      if (w === undefined || !ix) return null;
      for (const i of ix) arms[i] = w;
    }
  }
  return arms;
}

export type GlyphPlan =
  | { kind: 'winansi'; byte: number }
  | { kind: 'symbol'; code: number; advance: number }
  | { kind: 'block'; box: [number, number, number, number]; density: number }
  | { kind: 'box'; arms: Arms }
  | { kind: 'shape'; shape: 'notReversed' | 'superN' | 'peseta' }
  | { kind: 'label'; text: string; scale: number };

/** Sceglie come disegnare un carattere nel PDF. Non restituisce mai null. */
export function planGlyph(ch: string): GlyphPlan {
  if (ch === '␠') return { kind: 'label', text: 'SP', scale: 0.5 };

  const cp = ch.codePointAt(0);
  if (cp === undefined) return { kind: 'label', text: '?', scale: 0.6 };

  const win = winAnsiByte(cp);
  if (win !== null) return { kind: 'winansi', byte: win };

  const sym = SYMBOL_GLYPHS[cp];
  if (sym) return { kind: 'symbol', code: sym[0], advance: sym[1] / 1000 };

  const block = BLOCK_GLYPHS[cp];
  if (block) return { kind: 'block', box: [block[0], block[1], block[2], block[3]], density: block[4] };

  const arms = boxArms(cp);
  if (arms) return { kind: 'box', arms };

  if (cp === 0x2310) return { kind: 'shape', shape: 'notReversed' }; // ⌐
  if (cp === 0x207f) return { kind: 'shape', shape: 'superN' }; // ⁿ
  if (cp === 0x20a7) return { kind: 'shape', shape: 'peseta' }; // ₧

  // Rete di sicurezza: meglio il code point che una cella vuota.
  return { kind: 'label', text: 'U+' + cp.toString(16).toUpperCase().padStart(4, '0'), scale: 0.32 };
}

/* ============================================================
   Stream dei comandi di disegno
   ============================================================ */

/**
 * Accumula i comandi del content stream lavorando in coordinate del poster
 * (origine in alto a sinistra, y verso il basso) e capovolgendo l'asse solo al
 * momento di scrivere: nel PDF l'origine è in basso a sinistra.
 */
class Pen {
  private out: number[] = [];
  constructor(private readonly pageHeight: number) {}

  private y(v: number): number {
    return this.pageHeight - v;
  }

  private w(s: string) {
    this.out.push(...ascii(s));
  }

  rect(x: number, y: number, w: number, h: number, fill: string) {
    this.w(`${rgb(fill)} rg\n${n(x)} ${n(this.y(y + h))} ${n(w)} ${n(h)} re f\n`);
  }

  strokeRect(x: number, y: number, w: number, h: number, stroke: string, lw: number) {
    this.w(`${rgb(stroke)} RG ${n(lw)} w\n${n(x)} ${n(this.y(y + h))} ${n(w)} ${n(h)} re S\n`);
  }

  line(x1: number, y1: number, x2: number, y2: number, stroke: string, lw: number) {
    this.w(`${rgb(stroke)} RG ${n(lw)} w\n${n(x1)} ${n(this.y(y1))} m ${n(x2)} ${n(this.y(y2))} l S\n`);
  }

  /** Testo con la linea di base in `y`, `x` è il bordo sinistro. */
  text(x: number, y: number, bytes: number[], font: FontKey, size: number, fill: string) {
    this.w(`BT ${FONT_RES[font]} ${n(size)} Tf ${rgb(fill)} rg 1 0 0 1 ${n(x)} ${n(this.y(y))} Tm (`);
    for (const b of bytes) {
      // Parentesi e backslash vanno protetti; il resto passa come byte grezzo.
      if (b === 0x28 || b === 0x29 || b === 0x5c) this.out.push(0x5c);
      this.out.push(b);
    }
    this.w(') Tj ET\n');
  }

  bytes(): number[] {
    return this.out;
  }
}

/* ============================================================
   Disegno dei glifi non coperti dai font
   ============================================================ */

/** Riquadro occupato da un glifo di dimensione `size` con base in (cx, baseY). */
function glyphBox(cx: number, baseY: number, size: number) {
  // Approssima la cella di un font monospaziato: larghezza ≈ avanzamento di
  // Courier, altezza dall'ascendente a poco sotto la linea di base.
  const w = size * 0.64;
  const h = size * 0.84;
  const left = cx - w / 2;
  const top = baseY - size * 0.76;
  return { left, top, right: left + w, bottom: top + h, w, h, mx: cx, my: top + h / 2 };
}

function grey(density: number): string {
  const v = Math.round(255 * (1 - density));
  const hex = v.toString(16).padStart(2, '0');
  return `#${hex}${hex}${hex}`;
}

function drawBox(pen: Pen, arms: Arms, cx: number, baseY: number, size: number, ink: string) {
  const b = glyphBox(cx, baseY, size);
  const lw = size * 0.075;
  const d = size * 0.09; // metà distanza tra le due linee di un braccio doppio
  const [up, right, down, left] = arms;

  // Ogni braccio parte dal lato OPPOSTO dell'incrocio: così gli angoli si
  // chiudono senza dover gestire i giunti caso per caso. Nei nodi doppi
  // (╬ ╠ …) le linee si sovrappongono invece di interrompersi come nel font
  // originale: a 14 pt la lettura è la stessa.
  const offs = (wgt: number) => (wgt === 2 ? [-d, d] : [0]);

  for (const o of offs(up)) if (up) pen.line(b.mx + o, b.my + d, b.mx + o, b.top, ink, lw);
  for (const o of offs(down)) if (down) pen.line(b.mx + o, b.my - d, b.mx + o, b.bottom, ink, lw);
  for (const o of offs(left)) if (left) pen.line(b.mx + d, b.my + o, b.left, b.my + o, ink, lw);
  for (const o of offs(right)) if (right) pen.line(b.mx - d, b.my + o, b.right, b.my + o, ink, lw);
}

function drawShape(pen: Pen, shape: 'notReversed' | 'superN' | 'peseta', cx: number, baseY: number, size: number, ink: string) {
  const b = glyphBox(cx, baseY, size);
  if (shape === 'notReversed') {
    // ⌐ : la barra orizzontale con il piedino a SINISTRA (¬ ce l'ha a destra).
    const lw = size * 0.07;
    const y = b.my - size * 0.1;
    pen.line(b.left, y, b.right, y, ink, lw);
    pen.line(b.left, y, b.left, y + size * 0.24, ink, lw);
  } else if (shape === 'superN') {
    // ⁿ : una «n» piccola alzata alla quota degli esponenti.
    pen.text(cx - COURIER_ADVANCE * size * 0.6 * 0.5, baseY - size * 0.36, ascii('n'), 'cour', size * 0.6, ink);
  } else {
    // ₧ : nessun font base-14 ha il simbolo della peseta; «Pts» è l'abbreviazione storica.
    pen.text(cx - COURIER_ADVANCE * size * 0.46 * 1.5, baseY, ascii('Pts'), 'cour', size * 0.46, ink);
  }
}

/* ============================================================
   Assemblaggio del file PDF
   ============================================================ */

/** Stringa di testo PDF in UTF-16BE (con BOM): l'unico modo sicuro per gli accenti nei metadati. */
function utf16Literal(s: string): number[] {
  const out = [0xfe, 0xff];
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    out.push((c >> 8) & 0xff, c & 0xff);
  }
  return out;
}

const FONT_OBJECTS = [
  '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
  '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
  '<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>',
  '<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold /Encoding /WinAnsiEncoding >>',
  // Symbol tiene la propria codifica interna: è lì che vivono α, Σ, ∞, √…
  '<< /Type /Font /Subtype /Type1 /BaseFont /Symbol >>',
];

/** Traduce il modello di disegno del poster nei comandi del content stream. */
function drawPoster(doc: PosterDoc): number[] {
  const pen = new Pen(doc.height);
  pen.rect(0, 0, doc.width, doc.height, doc.bg);

  for (const op of doc.ops) {
    if (op.k === 'rect') {
      if (op.fill) pen.rect(op.x, op.y, op.w, op.h, op.fill);
      if (op.stroke) pen.strokeRect(op.x, op.y, op.w, op.h, op.stroke, op.lw ?? 1);
      continue;
    }
    if (op.k === 'line') {
      pen.line(op.x1, op.y1, op.x2, op.y2, op.stroke, op.lw);
      continue;
    }

    if (op.font !== 'glyph') {
      const s = toWinAnsiText(op.s);
      // Solo i font monospaziati vengono centrati: per loro la larghezza è nota
      // con esattezza, senza tabelle di metriche.
      const width = op.anchor === 'middle' ? COURIER_ADVANCE * op.size * s.length : 0;
      pen.text(op.x - width / 2, op.y, s, POSTER_FONT[op.font], op.size, op.fill);
      continue;
    }

    // Glifo di una cella: qui entra in gioco la strategia a tre livelli.
    const plan = planGlyph(op.s);
    switch (plan.kind) {
      case 'winansi':
        pen.text(op.x - (COURIER_ADVANCE * op.size) / 2, op.y, [plan.byte], 'cour', op.size, op.fill);
        break;
      case 'symbol':
        pen.text(op.x - (plan.advance * op.size) / 2, op.y, [plan.code], 'sym', op.size, op.fill);
        break;
      case 'label':
        pen.text(
          op.x - (COURIER_ADVANCE * op.size * plan.scale * plan.text.length) / 2,
          op.y,
          ascii(plan.text),
          'cour',
          op.size * plan.scale,
          op.fill
        );
        break;
      case 'block': {
        const b = glyphBox(op.x, op.y, op.size);
        const [x0, y0, x1, y1] = plan.box;
        pen.rect(b.left + x0 * b.w, b.top + y0 * b.h, (x1 - x0) * b.w, (y1 - y0) * b.h, grey(plan.density));
        break;
      }
      case 'box':
        drawBox(pen, plan.arms, op.x, op.y, op.size, op.fill);
        break;
      case 'shape':
        drawShape(pen, plan.shape, op.x, op.y, op.size, op.fill);
        break;
    }
  }
  return pen.bytes();
}

/**
 * Serializza il poster in un PDF/1.4 a pagina singola, vettoriale e con il
 * testo selezionabile. Nessuna compressione: lo stream resta ispezionabile con
 * un editor di testo, e per una tabella di caratteri pesa comunque poco.
 */
export function renderPosterPdf(doc: PosterDoc): Uint8Array<ArrayBuffer> {
  const content = drawPoster(doc);

  const bodies: number[][] = [];
  const add = (s: string) => bodies.push(ascii(s));

  // 1 catalogo · 2 albero pagine · 3 pagina · 4 contenuto · 5-9 font · 10 info
  add('<< /Type /Catalog /Pages 2 0 R >>');
  add('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  add(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${n(doc.width)} ${n(doc.height)}] ` +
      '/Resources << /Font << /F1 5 0 R /F2 6 0 R /F3 7 0 R /F4 8 0 R /F5 9 0 R >> >> /Contents 4 0 R >>'
  );
  bodies.push([...ascii(`<< /Length ${content.length} >>\nstream\n`), ...content, ...ascii('\nendstream')]);
  for (const f of FONT_OBJECTS) add(f);
  bodies.push([
    ...ascii('<< /Title ('),
    ...utf16Literal(doc.title),
    ...ascii(') /Creator (Base Converter) /Producer (Base Converter) >>'),
  ]);

  const out: number[] = [];
  const offsets: number[] = [];
  out.push(...ascii('%PDF-1.4\n'));
  // Commento con byte alti: segnala ai programmi che il file è binario.
  out.push(0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a);

  bodies.forEach((body, i) => {
    offsets.push(out.length);
    out.push(...ascii(`${i + 1} 0 obj\n`), ...body, ...ascii('\nendobj\n'));
  });

  const xref = out.length;
  out.push(...ascii(`xref\n0 ${bodies.length + 1}\n`));
  out.push(...ascii('0000000000 65535 f\r\n'));
  for (const off of offsets) {
    out.push(...ascii(`${String(off).padStart(10, '0')} 00000 n\r\n`));
  }
  out.push(
    ...ascii(
      `trailer\n<< /Size ${bodies.length + 1} /Root 1 0 R /Info ${bodies.length} 0 R >>\nstartxref\n${xref}\n%%EOF\n`
    )
  );

  return new Uint8Array(out);
}
