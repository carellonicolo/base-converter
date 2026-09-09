/**
 * Copertura delle note sui caratteri.
 *
 * La regola è che nessuna cella resti muta: se manca la nota specifica deve
 * scattare quella di gruppo, e in ultima istanza quella di categoria. Qui
 * verifichiamo che la cascata non abbia buchi in nessuna delle quattro code
 * page e in nessuna delle due lingue.
 */
import { describe, it, expect } from 'vitest';
import { CODE_PAGES, charTable } from '../../shared/engine/text';
import { charNote } from '../i18n/charNotes';
import { theory } from '../i18n/theory';

const LANGS = ['it', 'en'] as const;

describe('note sui caratteri', () => {
  it('ogni carattere di ogni code page ha una nota in entrambe le lingue', () => {
    for (const p of CODE_PAGES) {
      for (const e of charTable(p.key)) {
        for (const lang of LANGS) {
          const note = charNote(e, lang);
          expect(note, `${p.key} ${e.code} ${lang}`).toBeTruthy();
          // «Due righe»: la soglia bassa è il vero controllo di qualità — impedisce
          // che una nota si riduca a ripetere il nome del carattere.
          expect(note.length, `${p.key} ${e.code} ${lang}`).toBeGreaterThan(55);
          expect(note.length, `${p.key} ${e.code} ${lang}`).toBeLessThan(400);
        }
      }
    }
  });

  it('i 33 caratteri di controllo hanno tutti una nota propria', () => {
    const generic = charNote(charTable('ascii')[0], 'it');
    const controls = charTable('ascii').filter((e) => e.isControl);
    expect(controls).toHaveLength(33);
    const notes = new Set(controls.map((e) => charNote(e, 'it')));
    // Nessuna ripetizione: se due controlli condividessero la nota, uno dei due
    // starebbe ricadendo sul ripiego di categoria.
    expect(notes.size).toBe(33);
    expect(generic).toContain('fine di una stringa'); // NUL, non il testo generico
  });

  it('scende al gruppo quando non c’è la nota specifica', () => {
    const cp437 = charTable('cp437');
    expect(charNote(cp437[0xb3], 'it')).toContain('cornice'); // │ box drawing
    expect(charNote(cp437[0xdb], 'it')).toContain('Blocco'); // █ blocco pieno
    expect(charNote(cp437[0xe2], 'it')).toContain('greca'); // Γ lettera greca
    expect(charNote(cp437[0x85], 'it')).toContain('accentata'); // à
    expect(charNote(charTable('latin1')[0x85], 'it')).toContain('C1'); // NEL
  });

  it('scende alla categoria per lettere e cifre, dove è il testo più utile', () => {
    const ascii = charTable('ascii');
    expect(charNote(ascii[65], 'it')).toContain('un bit soltanto');
    expect(charNote(ascii[97], 'it')).toContain('32 sopra le maiuscole');
    expect(charNote(ascii[53], 'it')).toContain('quattro bit bassi');
    expect(charNote(ascii[65], 'en')).toContain('only one bit changes');
  });

  it('i byte non assegnati lo dicono', () => {
    expect(charNote(charTable('cp1252')[0x81], 'it')).toContain('non ha alcun carattere');
  });

  it('lo stesso byte ha note diverse secondo la code page', () => {
    const nota = (page: 'cp437' | 'latin1' | 'cp1252') => charNote(charTable(page)[0xe0], 'it');
    expect(nota('cp437')).toContain('greca'); // α
    expect(nota('latin1')).toContain('accentata'); // à
    expect(nota('latin1')).toBe(nota('cp1252'));
  });
});

describe('cenni teorici', () => {
  it('ASCII e Unicode hanno contenuto in entrambe le lingue', () => {
    for (const key of ['ascii', 'unicode'] as const) {
      for (const lang of LANGS) {
        const doc = theory(key, lang);
        expect(doc.title, `${key} ${lang}`).toBeTruthy();
        expect(doc.lead.length).toBeGreaterThan(100);
        expect(doc.sections.length).toBeGreaterThanOrEqual(5);
        expect(doc.timeline.length).toBeGreaterThanOrEqual(8);
        for (const s of doc.sections) {
          expect(s.heading, `${key} ${lang}`).toBeTruthy();
          expect(s.paragraphs.length).toBeGreaterThan(0);
          for (const p of s.paragraphs) expect(p.length).toBeGreaterThan(80);
        }
        for (const e of doc.timeline) {
          expect(e.year).toMatch(/^(\d{4}|oggi|today)$/);
          expect(e.label.length).toBeGreaterThan(15);
        }
      }
    }
  });

  it('la linea del tempo è in ordine cronologico', () => {
    for (const key of ['ascii', 'unicode'] as const) {
      const years = theory(key, 'it')
        .timeline.map((e) => Number(e.year))
        .filter((y) => !Number.isNaN(y));
      expect(years).toEqual([...years].sort((a, b) => a - b));
    }
  });

  it('i delimitatori di formattazione sono bilanciati', () => {
    // Backtick dispari o asterischi spaiati passerebbero a schermo come testo
    // grezzo: qui li intercettiamo prima.
    for (const key of ['ascii', 'unicode'] as const) {
      for (const lang of LANGS) {
        for (const s of theory(key, lang).sections) {
          for (const p of s.paragraphs) {
            expect((p.match(/`/g) ?? []).length % 2, p).toBe(0);
            expect((p.match(/\*\*/g) ?? []).length % 2, p).toBe(0);
          }
        }
      }
    }
  });

  it('le due lingue hanno la stessa struttura', () => {
    for (const key of ['ascii', 'unicode'] as const) {
      const [a, b] = LANGS.map((l) => theory(key, l));
      expect(a.sections.length).toBe(b.sections.length);
      expect(a.timeline.map((e) => e.year)).toEqual(b.timeline.map((e) => e.year));
      a.sections.forEach((s, i) => expect(s.paragraphs.length).toBe(b.sections[i].paragraphs.length));
    }
  });
});
