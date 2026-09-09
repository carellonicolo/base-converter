/**
 * Poster della tabella dei caratteri: modello di disegno + resa in SVG.
 *
 * L'idea è avere UNA sola descrizione geometrica del poster (`PosterDoc`) e due
 * motori che la disegnano: qui l'SVG (da cui nasce anche il PNG, rasterizzando),
 * in `pdf.ts` il PDF vettoriale. Se il layout fosse scritto due volte, prima o
 * poi PDF e PNG divergerebbero — e il PDF è quello che finisce stampato.
 *
 * Unità di misura: punti tipografici (pt), come nel PDF. A4 = 595.28 × 841.89.
 * Origine in alto a sinistra, y che cresce verso il basso (come in SVG); è il
 * renderer PDF a capovolgere l'asse, non il layout.
 */

import { charTable, codePageInfo, type CharCategory, type CodePage } from '../../shared/engine/text';

/* ============================================================
   Modello di disegno
   ============================================================ */

/** Famiglie disponibili: il PDF le mappa sui font base-14, l'SVG su stack di sistema. */
export type PosterFont = 'sans' | 'sans-bold' | 'mono' | 'mono-bold' | 'glyph';

export type PosterOp =
  | { k: 'rect'; x: number; y: number; w: number; h: number; fill?: string; stroke?: string; lw?: number }
  | { k: 'line'; x1: number; y1: number; x2: number; y2: number; stroke: string; lw: number }
  | {
      k: 'text';
      x: number;
      /** Coordinata della LINEA DI BASE del testo, non del suo bordo superiore. */
      y: number;
      s: string;
      size: number;
      font: PosterFont;
      fill: string;
      /** `middle` è usato solo con i font monospaziati: così il PDF centra esatto. */
      anchor?: 'start' | 'middle';
    };

export interface PosterDoc {
  width: number;
  height: number;
  bg: string;
  ops: PosterOp[];
  /** Titolo del documento (metadati PDF e nome del file scaricato). */
  title: string;
}

/* ============================================================
   Palette del poster
   ============================================================
   Volutamente NON legata ai token del tema: un poster si stampa, e si stampa
   su carta bianca. Nessun `var(--…)` qui dentro, altrimenti in dark mode
   l'export uscirebbe con testo chiaro su fondo chiaro. */

const INK = '#23201c';
const INK_SOFT = '#6f665c';
const BRAND = '#e0662b';
const PAPER = '#ffffff';
const LINE = '#ddd3c6';
const LINE_STRONG = '#b9aa98';

/** Tinta di fondo di ogni cella, per categoria. */
const CATEGORY_FILL: Record<CharCategory, string> = {
  control: '#eee9e2',
  space: '#eee9e2',
  digit: '#dce9f7',
  upper: '#fadfcd',
  lower: '#fdefe3',
  punct: '#ffffff',
  extended: '#e0f0e7',
  unassigned: '#f7f4f0',
};

/** Ordine in cui le categorie compaiono in legenda. */
const LEGEND_ORDER: CharCategory[] = [
  'control',
  'space',
  'digit',
  'upper',
  'lower',
  'punct',
  'extended',
  'unassigned',
];

/* ============================================================
   Testi (arrivano da i18n: il poster parla la lingua dell'app)
   ============================================================ */

export interface PosterStrings {
  title: string;
  hint: string;
  /** Titolo dell'elenco dei caratteri di controllo sotto la griglia. */
  controls: string;
  legend: Record<CharCategory, string>;
  footer: string;
}

/* ============================================================
   Costruzione del poster
   ============================================================ */

const A4_W = 595.28;
const A4_H = 841.89;
const MARGIN = 32;

/** I 33 controlli C0 (0–31 più DEL) elencati su 4 colonne. */
const CTL_COLS = 4;
const CTL_ROWS = Math.ceil(33 / CTL_COLS);

/**
 * Compone il poster A4 verticale di una code page.
 *
 * Struttura: titolo, griglia (16 colonne × 8 o 16 righe), legenda, piè di pagina.
 * Le intestazioni di riga e colonna portano la cifra esadecimale **e i suoi
 * quattro bit**: così la griglia non è solo un elenco ordinato, spiega la
 * codifica — il codice di una cella è «bit di riga + bit di colonna».
 */
export function buildAsciiPoster(page: CodePage, s: PosterStrings): PosterDoc {
  const info = codePageInfo(page);
  const table = charTable(page);
  const rows = table.length / 16;
  const ops: PosterOp[] = [];

  /* ---- intestazione ---- */
  let y = MARGIN + 16;
  ops.push({ k: 'text', x: MARGIN, y, s: s.title, size: 19, font: 'sans-bold', fill: INK });
  y += 15;
  ops.push({ k: 'text', x: MARGIN, y, s: info.fullName, size: 10, font: 'sans', fill: BRAND });
  y += 12;
  ops.push({
    k: 'text',
    x: MARGIN,
    y,
    s: `${info.bits} bit · ${table.length} caratteri · ${info.year}`,
    size: 8.5,
    font: 'mono',
    fill: INK_SOFT,
  });

  /* ---- geometria della griglia ----
     I blocchi in fondo (piè di pagina, legenda, nota) sono ancorati al bordo
     inferiore; la griglia scorre dall'alto. Così il poster a 128 caratteri,
     che ha metà righe, non si ritrova le celle stirate su tutta la pagina. */
  const gridTop = y + 16;
  const headW = 34; // colonna delle intestazioni di riga
  const headH = 20; // riga delle intestazioni di colonna
  const gridW = A4_W - 2 * MARGIN;
  const cellW = (gridW - headW) / 16;

  // In legenda solo le categorie presenti: ASCII non ha caratteri estesi,
  // Latin-1 non ha buchi. Una voce che non compare in tabella confonde.
  const present = new Set(table.map((e) => e.category));
  const legend = LEGEND_ORDER.filter((c) => present.has(c));
  const legendRows = Math.ceil(legend.length / 4);
  const bottomH = 30 + 16 + legendRows * 14 + 12; // piè di pagina + nota + legenda
  const ctlH = CTL_ROWS * 10 + 16; // elenco dei caratteri di controllo
  const available = A4_H - MARGIN - bottomH - ctlH - gridTop - headH;

  // La griglia occupa tutto lo spazio disponibile, e i caratteri crescono con
  // le celle: il poster a 128 voci ha metà righe, quindi lettere molto più
  // grandi — che è esattamente ciò che serve appeso a una parete.
  const cellH = Math.min(available / rows, cellW * 2.15);
  const glyphSize = Math.max(12, Math.min(26, cellH * 0.45));
  const abbrSize = Math.max(6.6, Math.min(13, cellH * 0.26));

  const gridLeft = MARGIN;
  const bodyTop = gridTop + headH;

  /* ---- angolo + intestazioni ---- */
  ops.push({ k: 'rect', x: gridLeft, y: gridTop, w: headW, h: headH, fill: '#f4eee6' });
  ops.push({
    k: 'text',
    x: gridLeft + headW / 2,
    y: gridTop + headH / 2 + 2.4,
    s: 'hi\\lo',
    size: 6,
    font: 'mono',
    fill: INK_SOFT,
    anchor: 'middle',
  });

  const nibble = (n: number) => n.toString(2).padStart(4, '0');

  for (let c = 0; c < 16; c++) {
    const x = gridLeft + headW + c * cellW;
    ops.push({ k: 'rect', x, y: gridTop, w: cellW, h: headH, fill: '#f4eee6' });
    ops.push({
      k: 'text',
      x: x + cellW / 2,
      y: gridTop + 9.5,
      s: c.toString(16).toUpperCase(),
      size: 9,
      font: 'mono-bold',
      fill: BRAND,
      anchor: 'middle',
    });
    ops.push({
      k: 'text',
      x: x + cellW / 2,
      y: gridTop + 17,
      s: nibble(c),
      size: 5.4,
      font: 'mono',
      fill: INK_SOFT,
      anchor: 'middle',
    });
  }

  for (let r = 0; r < rows; r++) {
    const yy = bodyTop + r * cellH;
    ops.push({ k: 'rect', x: gridLeft, y: yy, w: headW, h: cellH, fill: '#f4eee6' });
    ops.push({
      k: 'text',
      x: gridLeft + headW / 2,
      y: yy + cellH / 2,
      s: r.toString(16).toUpperCase(),
      size: 9,
      font: 'mono-bold',
      fill: BRAND,
      anchor: 'middle',
    });
    ops.push({
      k: 'text',
      x: gridLeft + headW / 2,
      y: yy + cellH / 2 + 8,
      s: nibble(r),
      size: 5.4,
      font: 'mono',
      fill: INK_SOFT,
      anchor: 'middle',
    });
  }

  /* ---- celle ---- */
  for (const e of table) {
    const r = Math.floor(e.code / 16);
    const c = e.code % 16;
    const x = gridLeft + headW + c * cellW;
    const yy = bodyTop + r * cellH;

    ops.push({ k: 'rect', x, y: yy, w: cellW, h: cellH, fill: CATEGORY_FILL[e.category] });

    // Codice decimale in alto a sinistra, esadecimale in alto a destra:
    // sono i due modi in cui la stessa cella viene citata a lezione.
    ops.push({
      k: 'text',
      x: x + cellW / 2 - cellW / 4,
      y: yy + 7,
      s: String(e.code),
      size: 5.4,
      font: 'mono',
      fill: INK_SOFT,
      anchor: 'middle',
    });
    ops.push({
      k: 'text',
      x: x + cellW / 2 + cellW / 4,
      y: yy + 7,
      s: e.code.toString(16).toUpperCase().padStart(2, '0'),
      size: 5.4,
      font: 'mono',
      fill: INK_SOFT,
      anchor: 'middle',
    });

    const cx = x + cellW / 2;
    const cy = yy + cellH / 2 + 5;
    if (e.category === 'unassigned') {
      ops.push({ k: 'text', x: cx, y: cy - 1, s: '—', size: 9, font: 'mono', fill: '#c3b9ad', anchor: 'middle' });
    } else if (e.isControl || e.category === 'space' || e.cp === 0x00a0) {
      // Chi non ha un aspetto viene scritto: la sigla del controllo, oppure SP
      // e NBSP per gli spazi. Meglio della resa «␠», che non tutti i font
      // hanno — e nel PNG un glifo mancante diventa un rettangolo vuoto.
      const label = e.isControl ? e.display : e.cp === 0x00a0 ? 'NBSP' : 'SP';
      const size = label.length > 3 ? abbrSize * 0.8 : abbrSize;
      ops.push({ k: 'text', x: cx, y: cy - 1, s: label, size, font: 'mono-bold', fill: INK_SOFT, anchor: 'middle' });
    } else {
      ops.push({ k: 'text', x: cx, y: cy, s: e.display, size: glyphSize, font: 'glyph', fill: INK, anchor: 'middle' });
    }
  }

  /* ---- reticolo (sopra le tinte, sotto niente) ---- */
  const gridRight = gridLeft + headW + 16 * cellW;
  const gridBottom = bodyTop + rows * cellH;
  for (let c = 0; c <= 16; c++) {
    const x = gridLeft + headW + c * cellW;
    ops.push({ k: 'line', x1: x, y1: gridTop, x2: x, y2: gridBottom, stroke: LINE, lw: 0.4 });
  }
  ops.push({ k: 'line', x1: gridLeft, y1: gridTop, x2: gridLeft, y2: gridBottom, stroke: LINE, lw: 0.4 });
  for (let r = 0; r <= rows; r++) {
    const yy = bodyTop + r * cellH;
    ops.push({ k: 'line', x1: gridLeft, y1: yy, x2: gridRight, y2: yy, stroke: LINE, lw: 0.4 });
  }
  ops.push({ k: 'line', x1: gridLeft, y1: gridTop, x2: gridRight, y2: gridTop, stroke: LINE, lw: 0.4 });

  // Riga marcata a metà tabella: sopra ci sta ASCII (7 bit), sotto l'estensione.
  if (rows === 16) {
    const yy = bodyTop + 8 * cellH;
    ops.push({ k: 'line', x1: gridLeft, y1: yy, x2: gridRight, y2: yy, stroke: LINE_STRONG, lw: 1.1 });
  }
  ops.push({ k: 'rect', x: gridLeft, y: gridTop, w: gridRight - gridLeft, h: gridBottom - gridTop, stroke: LINE_STRONG, lw: 0.9 });

  /* ---- elenco dei caratteri di controllo ----
     Nella griglia i controlli mostrano solo la sigla: qui sotto c'è il nome per
     esteso. È la parte del poster che serve davvero quando si legge un dump. */
  const ctlTop = gridBottom + 18;
  ops.push({ k: 'text', x: MARGIN, y: ctlTop, s: s.controls, size: 8, font: 'sans-bold', fill: INK });
  const ctlColW = (A4_W - 2 * MARGIN) / CTL_COLS;
  table
    .filter((e) => e.isControl && e.code < 128)
    .forEach((e, i) => {
      const cx = MARGIN + (i % CTL_COLS) * ctlColW;
      const cy = ctlTop + 12 + Math.floor(i / CTL_COLS) * 10;
      ops.push({
        k: 'text',
        x: cx,
        y: cy,
        s: `${e.code.toString(16).toUpperCase().padStart(2, '0')} ${e.display.padEnd(4, ' ')}${e.name}`,
        size: 5.9,
        font: 'mono',
        fill: INK_SOFT,
      });
    });

  /* ---- legenda, nota e piè di pagina: ancorati al bordo inferiore ---- */
  const footY = A4_H - MARGIN - 4;
  ops.push({ k: 'line', x1: MARGIN, y1: footY - 10, x2: A4_W - MARGIN, y2: footY - 10, stroke: LINE, lw: 0.5 });
  ops.push({ k: 'text', x: MARGIN, y: footY, s: s.footer, size: 7, font: 'sans', fill: INK_SOFT });

  const hintY = footY - 28;
  ops.push({ k: 'text', x: MARGIN, y: hintY, s: s.hint, size: 7.4, font: 'sans', fill: INK });

  const colW = (A4_W - 2 * MARGIN) / 4;
  const legendTop = hintY - 16 - (legendRows - 1) * 14;
  legend.forEach((cat, i) => {
    const lx = MARGIN + (i % 4) * colW;
    const yy = legendTop + Math.floor(i / 4) * 14;
    ops.push({ k: 'rect', x: lx, y: yy - 6.5, w: 9, h: 9, fill: CATEGORY_FILL[cat], stroke: LINE_STRONG, lw: 0.4 });
    ops.push({ k: 'text', x: lx + 13, y: yy, s: s.legend[cat], size: 7.4, font: 'sans', fill: INK_SOFT });
  });

  return {
    width: A4_W,
    height: A4_H,
    bg: PAPER,
    ops,
    title: `${s.title} — ${info.fullName}`,
  };
}

/* ============================================================
   Resa in SVG
   ============================================================ */

/**
 * Stack di font *di sistema*: l'SVG viene anche caricato in un `<img>` per
 * ricavarne il PNG, e in quel contesto il browser NON scarica risorse esterne —
 * niente Lexend né JetBrains Mono da Google Fonts. Con gli stack generici il
 * poster resta identico ovunque.
 */
const SVG_FONTS: Record<PosterFont, string> = {
  sans: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  'sans-bold': "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  mono: "ui-monospace, 'SF Mono', Menlo, Consolas, 'DejaVu Sans Mono', monospace",
  'mono-bold': "ui-monospace, 'SF Mono', Menlo, Consolas, 'DejaVu Sans Mono', monospace",
  glyph: "ui-monospace, 'SF Mono', Menlo, Consolas, 'DejaVu Sans Mono', monospace",
};

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function num(n: number): string {
  return (Math.round(n * 100) / 100).toString();
}

/** Serializza un PosterDoc in un SVG autonomo (nessuna risorsa esterna). */
export function renderPosterSvg(doc: PosterDoc): string {
  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${num(doc.width)}" height="${num(doc.height)}" ` +
      `viewBox="0 0 ${num(doc.width)} ${num(doc.height)}" role="img" aria-label="${esc(doc.title)}">`
  );
  parts.push(`<title>${esc(doc.title)}</title>`);
  parts.push(`<rect width="100%" height="100%" fill="${doc.bg}"/>`);

  for (const op of doc.ops) {
    if (op.k === 'rect') {
      const fill = op.fill ?? 'none';
      const stroke = op.stroke ? ` stroke="${op.stroke}" stroke-width="${num(op.lw ?? 1)}"` : '';
      parts.push(
        `<rect x="${num(op.x)}" y="${num(op.y)}" width="${num(op.w)}" height="${num(op.h)}" fill="${fill}"${stroke}/>`
      );
    } else if (op.k === 'line') {
      parts.push(
        `<line x1="${num(op.x1)}" y1="${num(op.y1)}" x2="${num(op.x2)}" y2="${num(op.y2)}" ` +
          `stroke="${op.stroke}" stroke-width="${num(op.lw)}"/>`
      );
    } else {
      const bold = op.font === 'sans-bold' || op.font === 'mono-bold' ? ' font-weight="700"' : '';
      const anchor = op.anchor === 'middle' ? ' text-anchor="middle"' : '';
      parts.push(
        `<text x="${num(op.x)}" y="${num(op.y)}" font-family="${SVG_FONTS[op.font]}" ` +
          `font-size="${num(op.size)}" fill="${op.fill}"${bold}${anchor} xml:space="preserve">${esc(op.s)}</text>`
      );
    }
  }

  parts.push('</svg>');
  return parts.join('\n');
}
