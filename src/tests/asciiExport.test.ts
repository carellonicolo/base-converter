/**
 * Copertura dell'export della tabella dei caratteri.
 *
 * Il rischio vero di un PDF senza font incorporati è che un glifo sparisca in
 * silenzio: il file si apre lo stesso, la cella è solo vuota. Qui verifichiamo
 * che OGNI carattere di OGNI code page abbia una strategia di disegno reale,
 * e che il PDF prodotto sia strutturalmente valido.
 */
import { describe, it, expect } from 'vitest';
import { CODE_PAGES, charTable, codePageInfo } from '../../shared/engine/text';
import { buildAsciiPoster, renderPosterSvg, type PosterStrings } from '../lib/poster';
import { boxArms, planGlyph, renderPosterPdf } from '../lib/pdf';

const STRINGS: PosterStrings = {
  title: 'Tabella dei caratteri',
  hint: 'Codice = 4 bit di riga + 4 bit di colonna.',
  controls: 'Caratteri di controllo',
  legend: {
    control: 'controllo',
    space: 'spazio',
    digit: 'cifra',
    upper: 'maiuscola',
    lower: 'minuscola',
    punct: 'punteggiatura',
    extended: 'esteso',
    unassigned: 'non assegnato',
  },
  footer: 'test',
};

describe('code page', () => {
  it('ASCII resta a 128 voci, le estese a 256', () => {
    expect(charTable('ascii')).toHaveLength(128);
    for (const p of CODE_PAGES.filter((x) => x.key !== 'ascii')) {
      expect(charTable(p.key)).toHaveLength(256);
    }
  });

  it('la metà bassa è identica in tutte le code page', () => {
    const ascii = charTable('ascii');
    for (const p of CODE_PAGES) {
      const t = charTable(p.key);
      for (let c = 0; c < 128; c++) {
        expect(t[c].char).toBe(ascii[c].char);
        expect(t[c].name).toBe(ascii[c].name);
      }
    }
  });

  it('lo stesso byte cambia carattere secondo la code page', () => {
    // 0xE0: «α» sul PC IBM, «à» in Latin-1 e Windows-1252.
    expect(charTable('cp437')[0xe0].char).toBe('α');
    expect(charTable('latin1')[0xe0].char).toBe('à');
    expect(charTable('cp1252')[0xe0].char).toBe('à');
    // 0x80: € solo in Windows-1252; in Latin-1 è il controllo C1 «PAD».
    expect(charTable('cp1252')[0x80].char).toBe('€');
    expect(charTable('latin1')[0x80].display).toBe('PAD');
    expect(charTable('latin1')[0x80].isControl).toBe(true);
    expect(charTable('cp437')[0x80].char).toBe('Ç');
  });

  it('Latin-1 mappa il byte sul code point identico', () => {
    const t = charTable('latin1');
    for (let c = 128; c < 256; c++) expect(t[c].cp).toBe(c);
  });

  it('Windows-1252 lascia cinque byte non assegnati', () => {
    const t = charTable('cp1252');
    const holes = t.filter((e) => e.category === 'unassigned').map((e) => e.code);
    expect(holes).toEqual([0x81, 0x8d, 0x8f, 0x90, 0x9d]);
  });

  it('ogni carattere assegnato ha un nome', () => {
    for (const p of CODE_PAGES) {
      for (const e of charTable(p.key)) {
        if (e.category === 'unassigned') continue;
        expect(e.name, `${p.key} ${e.code}`).toBeTruthy();
        expect(e.name).not.toMatch(/^U\+/); // niente ripieghi sul code point
      }
    }
  });
});

describe('copertura dei glifi nel PDF', () => {
  it('nessun carattere ricade sull’etichetta di emergenza', () => {
    for (const p of CODE_PAGES) {
      for (const e of charTable(p.key)) {
        if (e.isControl || e.category === 'unassigned') continue;
        const plan = planGlyph(e.display);
        if (plan.kind === 'label') {
          expect(plan.text, `${p.key} ${e.code} (${e.name})`).toBe('SP');
        }
      }
    }
  });

  it('i box-drawing di CP437 sono tutti riconosciuti', () => {
    // CP437 usa 0xB3–0xDA per le cornici: 40 caratteri (0xB0–0xB2 sono retini,
    // 0xDB–0xDF blocchi pieni, e non passano da boxArms).
    const box = charTable('cp437').filter((e) => e.name.startsWith('Box Drawings'));
    expect(box.length).toBe(40);
    for (const e of box) {
      const arms = boxArms(e.cp);
      expect(arms, e.name).not.toBeNull();
      expect(arms!.some((a) => a > 0), e.name).toBe(true);
    }
  });

  it('legge correttamente le braccia dai nomi Unicode', () => {
    expect(boxArms(0x2500)).toEqual([0, 1, 0, 1]); // ─ orizzontale singola
    expect(boxArms(0x2551)).toEqual([2, 0, 2, 0]); // ║ verticale doppia
    expect(boxArms(0x250c)).toEqual([0, 1, 1, 0]); // ┌ giù e destra
    expect(boxArms(0x2555)).toEqual([0, 0, 1, 2]); // ╕ giù singola, sinistra doppia
    expect(boxArms(0x256c)).toEqual([2, 2, 2, 2]); // ╬ incrocio doppio
    expect(boxArms(0x2568)).toEqual([2, 1, 0, 1]); // ╨ su doppia, orizzontale singola
  });
});

describe('poster', () => {
  it('l’SVG contiene tutte le celle e nessun riferimento esterno', () => {
    const svg = renderPosterSvg(buildAsciiPoster('cp437', STRINGS));
    expect(svg.startsWith('<svg')).toBe(true);
    // L'SVG viene caricato in un <img> per ricavarne il PNG: in quel contesto il
    // browser non scarica nulla, quindi non deve esserci nulla da scaricare.
    // (`xmlns` è un identificatore di namespace, non un URL che viene risolto.)
    expect(svg).not.toMatch(/(href|url\(|@import)/);
    // Ogni cella disegna il proprio codice decimale: 256 celle → 256 testi.
    for (const code of [0, 65, 128, 255]) {
      expect(svg).toContain(`>${code}<`);
    }
  });

  it('il poster ASCII ha 8 righe, quello esteso 16', () => {
    const a = buildAsciiPoster('ascii', STRINGS);
    const b = buildAsciiPoster('latin1', STRINGS);
    expect(a.title).toContain(codePageInfo('ascii').fullName);
    expect(b.height).toBe(a.height); // sempre A4
    // La griglia estesa disegna più righe orizzontali.
    const lines = (d: typeof a) => d.ops.filter((o) => o.k === 'line').length;
    expect(lines(b)).toBeGreaterThan(lines(a));
  });

  it('il PDF è strutturalmente valido', () => {
    const pdf = renderPosterPdf(buildAsciiPoster('cp437', STRINGS));
    const head = new TextDecoder('latin1').decode(pdf.slice(0, 9));
    const text = new TextDecoder('latin1').decode(pdf);
    expect(head).toBe('%PDF-1.4\n');
    expect(text.endsWith('%%EOF\n')).toBe(true);

    // Gli offset dichiarati nella xref devono puntare davvero a «N 0 obj».
    const xrefAt = Number(text.slice(text.lastIndexOf('startxref') + 9).trim().split('\n')[0]);
    expect(text.slice(xrefAt, xrefAt + 4)).toBe('xref');
    const entries = [...text.matchAll(/^(\d{10}) 00000 n$/gm)].map((m) => Number(m[1]));
    expect(entries).toHaveLength(10);
    entries.forEach((off, i) => {
      expect(text.slice(off, off + `${i + 1} 0 obj`.length)).toBe(`${i + 1} 0 obj`);
    });

    // La lunghezza dichiarata dello stream deve coincidere con quella reale.
    const declared = Number(/\/Length (\d+)/.exec(text)![1]);
    const start = text.indexOf('stream\n') + 'stream\n'.length;
    expect(text.indexOf('\nendstream', start) - start).toBe(declared);
  });

  it('ogni code page produce un PDF non vuoto', () => {
    for (const p of CODE_PAGES) {
      const pdf = renderPosterPdf(buildAsciiPoster(p.key, STRINGS));
      expect(pdf.byteLength, p.key).toBeGreaterThan(10_000);
    }
  });
});
