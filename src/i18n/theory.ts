/**
 * Cenni teorici e storici mostrati dalle modali «Teoria» delle schede
 * Tabella ASCII e Unicode.
 *
 * Il contenuto sta qui come DATI e non come JSX: così è traducibile con la
 * stessa disciplina del resto dell'app (le due lingue appaiate, come in
 * `charNotes.ts`), verificabile da un test, e la modale resta un componente
 * che sa impaginare senza sapere nulla di ASCII.
 *
 * Nei paragrafi i backtick delimitano il testo a spaziatura fissa —
 * `U+00E0`, `c - '0'` — reso poi in <code> da `TheoryModal`.
 */

import type { Lang } from './index';

/** `[italiano, inglese]`. */
type Bilingual = readonly [string, string];

interface RawSection {
  heading: Bilingual;
  paragraphs: readonly Bilingual[];
}

interface RawEvent {
  year: string;
  label: Bilingual;
}

interface RawTheory {
  title: Bilingual;
  lead: Bilingual;
  sections: readonly RawSection[];
  timelineTitle: Bilingual;
  timeline: readonly RawEvent[];
}

/* ============================================================
   ASCII
   ============================================================ */

const ASCII: RawTheory = {
  title: ['ASCII: come e perché', 'ASCII: how and why'],
  lead: [
    'ASCII è la tabella con cui i computer si sono messi d’accordo su cosa voglia dire «la lettera A». Ha sessant’anni, sta in sette bit, ed è ancora sotto ogni pagina web che apri.',
    'ASCII is the table by which computers agreed on what “the letter A” means. It is sixty years old, it fits in seven bits, and it still sits underneath every web page you open.',
  ],
  timelineTitle: ['Come ci siamo arrivati', 'How we got here'],
  sections: [
    {
      heading: ['Prima c’era il caos', 'Before it, chaos'],
      paragraphs: [
        [
          'Fino agli anni Sessanta ogni costruttore aveva la propria codifica. Le telescriventi usavano il codice Baudot, a 5 bit: 32 combinazioni soltanto, troppo poche per lettere e cifre insieme, e si rimediava alternando due «registri» come il tasto delle maiuscole.',
          'Until the 1960s every manufacturer had its own encoding. Teleprinters used the 5-bit Baudot code: just 32 combinations, too few for letters and digits together, worked around by switching between two “shifts” like a caps key.',
        ],
        [
          'IBM aveva EBCDIC, dove le lettere non sono nemmeno contigue: tra `I` e `J` c’è un buco di sette codici. Scambiare un file fra due macchine di marca diversa voleva dire scrivere un traduttore.',
          'IBM had EBCDIC, where the letters are not even contiguous: there is a gap of seven codes between `I` and `J`. Moving a file between two machines of different brands meant writing a translator.',
        ],
      ],
    },
    {
      heading: ['1963: un solo alfabeto', '1963: one alphabet'],
      paragraphs: [
        [
          'Il comitato X3.2 dell’American Standards Association pubblica ASA X3.4-1963. L’obiettivo dichiarato non erano i computer ma le telescriventi: da lì vengono i 33 caratteri di controllo, che oggi sembrano archeologia e allora erano il punto.',
          'The American Standards Association’s X3.2 committee publishes ASA X3.4-1963. The stated target was not computers but teleprinters: that is where the 33 control characters come from, archaeology today, the whole point back then.',
        ],
        [
          'La revisione del 1967 aggiunge le minuscole ed è, nella sostanza, quella che usiamo ancora. L’anno dopo un decreto del presidente Johnson impone ASCII a tutti i calcolatori federali statunitensi: è la spinta che lo rende inevitabile.',
          'The 1967 revision adds lowercase letters and is, in substance, the one still in use. The following year a memorandum from President Johnson mandates ASCII on all US federal computers: the push that made it inevitable.',
        ],
      ],
    },
    {
      heading: ['Perché sette bit e non otto', 'Why seven bits and not eight'],
      paragraphs: [
        [
          'Trasmettere costava, e ogni bit in più erano soldi. Sette bit davano 128 caratteri, che per l’inglese sembravano abbondanti. L’ottavo bit del byte non restava sprecato: serviva da bit di parità, per accorgersi degli errori di linea.',
          'Transmission cost money, and every extra bit was money. Seven bits gave 128 characters, which for English felt generous. The byte’s eighth bit was not wasted: it served as a parity bit, to catch line errors.',
        ],
        [
          'È una scelta ragionevole che si è pagata cara vent’anni dopo, quando quell’ottavo bit è servito a tutti — e ciascuno se l’è preso per conto proprio.',
          'A reasonable choice that came at a price twenty years later, when everyone needed that eighth bit — and each took it their own way.',
        ],
      ],
    },
    {
      heading: ['L’ordine non è casuale', 'The order is not accidental'],
      paragraphs: [
        [
          'Le cifre stanno da `0x30` a `0x39`: i quattro bit bassi **sono** il valore della cifra, ed è per questo che `c - \'0\'` basta a convertirla in numero.',
          'The digits sit from `0x30` to `0x39`: the low four bits **are** the digit’s value, which is why `c - \'0\'` is enough to turn it into a number.',
        ],
        [
          'Le maiuscole partono da `0x41`, le minuscole da `0x61`: 32 esatti di distanza, cioè un bit solo. Cambiare maiuscolo e minuscolo è un’operazione logica su un bit, non una tabella di conversione.',
          'Capitals start at `0x41`, lowercase at `0x61`: exactly 32 apart, that is a single bit. Changing case is a one-bit logic operation, not a lookup table.',
        ],
        [
          'I controlli stanno tutti sotto `0x20`, così si riconoscono guardando i due bit alti. E `DEL` è `0x7F`, tutti i bit a uno: su nastro perforato cancellare voleva dire bucare tutti i fori, un’operazione senza ritorno. Ecco perché sta in fondo alla tabella e non insieme agli altri controlli.',
          'The controls all sit below `0x20`, so they are recognisable from the top two bits alone. And `DEL` is `0x7F`, all bits set: on punched tape, erasing meant punching every hole, an operation with no way back. That is why it sits at the end of the table and not with the other controls.',
        ],
      ],
    },
    {
      heading: ['L’ottavo bit, e di nuovo il caos', 'The eighth bit, and chaos again'],
      paragraphs: [
        [
          'Quando la memoria costò meno, tutti presero l’ottavo bit e ci misero i caratteri che servivano a loro: IBM con CP437 sul PC, ISO con 8859-1 come norma internazionale, Microsoft con Windows-1252 sul desktop, e decine di altre code page per gli altri alfabeti.',
          'Once memory got cheaper, everyone took the eighth bit and put in the characters they needed: IBM with CP437 on the PC, ISO with 8859-1 as the international standard, Microsoft with Windows-1252 on the desktop, and dozens of other code pages for other alphabets.',
        ],
        [
          'Lo stesso byte, 224, è `α` su un PC del 1981 e `à` su una macchina Windows. Da qui nascono le pagine piene di `Ã¨` e i file di testo «rotti»: non sono rotti affatto, sono letti con la tabella sbagliata.',
          'The same byte, 224, is `α` on a 1981 PC and `à` on a Windows machine. This is where pages full of `Ã¨` and “broken” text files come from: they are not broken at all, they are being read with the wrong table.',
        ],
      ],
    },
    {
      heading: ['Perché conta ancora oggi', 'Why it still matters'],
      paragraphs: [
        [
          'UTF-8 è compatibile con ASCII per costruzione: ogni file ASCII è già un file UTF-8 valido, byte per byte. Nessuno ha dovuto riscrivere niente, ed è la ragione principale per cui UTF-8 ha vinto sulle alternative.',
          'UTF-8 is ASCII-compatible by construction: every ASCII file is already a valid UTF-8 file, byte for byte. Nobody had to rewrite anything, and that is the main reason UTF-8 beat the alternatives.',
        ],
        [
          'HTTP, SMTP, DNS, JSON, i nomi dei file, il codice sorgente di qualunque linguaggio: sono ASCII. Sessant’anni dopo, i primi 128 codici sono ancora esattamente quelli fissati nel 1967.',
          'HTTP, SMTP, DNS, JSON, file names, the source code of every language: all ASCII. Sixty years on, the first 128 codes are still exactly those fixed in 1967.',
        ],
      ],
    },
  ],
  timeline: [
    { year: '1874', label: ['Émile Baudot brevetta il suo codice a 5 bit per il telegrafo', 'Émile Baudot patents his 5-bit telegraph code'] },
    { year: '1963', label: ['Pubblicato ASA X3.4: nasce ASCII', 'ASA X3.4 is published: ASCII is born'] },
    { year: '1964', label: ['IBM lancia il System/360 con EBCDIC, la codifica rivale', 'IBM ships the System/360 with EBCDIC, the rival encoding'] },
    { year: '1967', label: ['ASCII-1967 aggiunge le minuscole: è la versione che usiamo', 'ASCII-1967 adds lowercase: this is the version we still use'] },
    { year: '1968', label: ['Johnson impone ASCII ai calcolatori federali statunitensi', 'Johnson mandates ASCII on US federal computers'] },
    { year: '1981', label: ['L’IBM PC esce con CP437: l’ottavo bit pieno di cornici e greco', 'The IBM PC ships with CP437: the eighth bit full of box frames and Greek'] },
    { year: '1987', label: ['ISO 8859-1 standardizza la metà alta per l’Europa occidentale', 'ISO 8859-1 standardises the upper half for Western Europe'] },
    { year: '1991', label: ['Unicode 1.0: un numero unico per ogni carattere del mondo', 'Unicode 1.0: one unique number for every character in the world'] },
    { year: '1992', label: ['Ken Thompson e Rob Pike disegnano UTF-8', 'Ken Thompson and Rob Pike design UTF-8'] },
    { year: '2008', label: ['UTF-8 diventa la codifica più diffusa sul web', 'UTF-8 becomes the most common encoding on the web'] },
  ],
};

/* ============================================================
   Unicode
   ============================================================ */

const UNICODE: RawTheory = {
  title: ['Unicode: come e perché', 'Unicode: how and why'],
  lead: [
    'Unicode è il tentativo — riuscito — di dare un numero unico a ogni carattere di ogni scrittura del mondo. Non è una codifica: è un catalogo. Le codifiche sono UTF-8, UTF-16 e UTF-32, e dicono come quel numero diventa byte.',
    'Unicode is the attempt — a successful one — to give a unique number to every character of every writing system. It is not an encoding: it is a catalogue. The encodings are UTF-8, UTF-16 and UTF-32, and they say how that number becomes bytes.',
  ],
  timelineTitle: ['Come ci siamo arrivati', 'How we got here'],
  sections: [
    {
      heading: ['Il problema da risolvere', 'The problem it had to solve'],
      paragraphs: [
        [
          'Alla fine degli anni Ottanta convivevano decine di code page a 8 bit incompatibili tra loro: una per l’Europa occidentale, una per il cirillico, una per il greco, una per il turco. Un documento che mescolasse due alfabeti semplicemente non si poteva scrivere.',
          'By the late 1980s dozens of mutually incompatible 8-bit code pages coexisted: one for Western Europe, one for Cyrillic, one for Greek, one for Turkish. A document mixing two alphabets simply could not be written.',
        ],
        [
          'E c’erano le scritture che in 256 posti non ci stavano proprio: cinese e giapponese contano migliaia di ideogrammi, e usavano sistemi a byte multipli diversi da paese a paese e da costruttore a costruttore.',
          'And there were scripts that could never fit in 256 slots: Chinese and Japanese have thousands of ideographs, and used multi-byte systems that differed by country and by vendor.',
        ],
      ],
    },
    {
      heading: ['L’idea: separare il numero dai byte', 'The idea: separate the number from the bytes'],
      paragraphs: [
        [
          'Nel 1988 Joe Becker, alla Xerox, propone un insieme unico per tutte le scritture. L’intuizione decisiva è la separazione che ad ASCII mancava: il carattere ha un **code point**, un numero d’archivio che si scrive `U+0041`; come quel numero finisca poi in memoria è un problema diverso e successivo.',
          'In 1988 Joe Becker, at Xerox, proposes a single set for all writing systems. The decisive insight is the separation ASCII lacked: a character has a **code point**, a catalogue number written `U+0041`; how that number ends up in memory is a different, later question.',
        ],
        [
          'Da qui il fatto che «à» sia `U+00E0` sempre e ovunque, e occupi un byte in Latin-1, due in UTF-8, quattro in UTF-32. Il carattere è lo stesso, cambia solo la scatola.',
          'Hence “à” is `U+00E0` always and everywhere, while taking one byte in Latin-1, two in UTF-8, four in UTF-32. The character is the same; only the box changes.',
        ],
      ],
    },
    {
      heading: ['Sedici bit non sono bastati', 'Sixteen bits were not enough'],
      paragraphs: [
        [
          'Unicode nasce a 16 bit: 65.536 caratteri, «più che sufficienti per tutte le scritture viventi». Nel 1996 è chiaro che non lo sono, e lo spazio si allarga a 17 piani da 65.536 ciascuno: 1.114.112 code point in tutto.',
          'Unicode starts at 16 bits: 65,536 characters, “more than enough for all living scripts”. By 1996 it is clear they are not, and the space widens to 17 planes of 65,536 each: 1,114,112 code points in all.',
        ],
        [
          'UTF-16, progettata quando 16 bit bastavano, si adatta con le **coppie surrogate**: due unità da 16 bit per un carattere fuori dal primo piano. È il motivo per cui in JavaScript `"😀".length` vale 2 e non 1.',
          'UTF-16, designed when 16 bits sufficed, adapts with **surrogate pairs**: two 16-bit units for a character outside the first plane. That is why in JavaScript `"😀".length` is 2 and not 1.',
        ],
      ],
    },
    {
      heading: ['UTF-8, e perché ha vinto', 'UTF-8, and why it won'],
      paragraphs: [
        [
          'Ken Thompson e Rob Pike la progettano nel settembre 1992, in una sera, su una tovaglietta di un locale del New Jersey. Ha quattro proprietà che le hanno fatto vincere il mondo.',
          'Ken Thompson and Rob Pike design it in September 1992, in one evening, on a diner placemat in New Jersey. It has four properties that won it the world.',
        ],
        [
          'Ogni file ASCII è già UTF-8 valido, quindi nessun sistema esistente andava riscritto. È **auto-sincronizzante**: preso un flusso a metà, si capisce subito dove comincia il carattere successivo. Non ha ordine dei byte, quindi niente `BOM` obbligatorio né varianti big e little endian. E il byte zero e la barra `/` non compaiono mai dentro una sequenza multi-byte: il kernel Unix non ha dovuto cambiare una riga.',
          'Every ASCII file is already valid UTF-8, so no existing system had to be rewritten. It is **self-synchronising**: pick up a stream halfway and you immediately know where the next character starts. It has no byte order, so no mandatory `BOM` and no big- and little-endian variants. And the zero byte and the slash `/` never appear inside a multi-byte sequence: the Unix kernel did not have to change a line.',
        ],
      ],
    },
    {
      heading: ['Carattere, code point, glifo, grafema', 'Character, code point, glyph, grapheme'],
      paragraphs: [
        [
          'Sono quattro cose diverse, e confonderle è la fonte di metà dei problemi che si incontrano lavorando sul testo. «è» può essere un code point solo (`U+00E8`) oppure due (`U+0065` più l’accento combinante `U+0300`): a occhio sono identici, per il computer sono stringhe diverse. È per questo che esiste la **normalizzazione**.',
          'These are four different things, and confusing them causes half the trouble people hit when working with text. “è” can be one code point (`U+00E8`) or two (`U+0065` plus the combining accent `U+0300`): identical to the eye, different strings to the computer. This is why **normalisation** exists.',
        ],
        [
          'Un’emoji di famiglia può essere fatta di cinque code point tenuti insieme da giunzioni invisibili. Ciò che l’occhio conta come un carattere è un **grafema**, e non coincide quasi mai con quello che `length` restituisce.',
          'A family emoji can be made of five code points held together by invisible joiners. What the eye counts as one character is a **grapheme**, and it almost never matches what `length` returns.',
        ],
      ],
    },
    {
      heading: ['Dove siamo oggi', 'Where we are today'],
      paragraphs: [
        [
          'Unicode conta oltre 150.000 caratteri e più di 160 scritture, comprese quelle morte da millenni, e ne aggiunge ogni anno. Il Consorzio decide cosa entra: non è un ente pubblico, è un’associazione di aziende e studiosi.',
          'Unicode holds over 150,000 characters and more than 160 scripts, including ones dead for millennia, and adds more every year. The Consortium decides what gets in: not a public body, but an association of companies and scholars.',
        ],
        [
          'UTF-8 è la codifica di oltre il 98% delle pagine web. Il caos delle code page è finito — ma i file vecchi restano, ed è anche per questo che questa pagina le fa ancora vedere.',
          'UTF-8 is the encoding of over 98% of web pages. The code page chaos is over — but old files remain, which is part of why this page still shows them.',
        ],
      ],
    },
  ],
  timeline: [
    { year: '1988', label: ['Joe Becker, alla Xerox, pubblica la proposta «Unicode 88»', 'Joe Becker, at Xerox, publishes the “Unicode 88” proposal'] },
    { year: '1991', label: ['Nasce il Consorzio Unicode ed esce Unicode 1.0', 'The Unicode Consortium is founded and Unicode 1.0 ships'] },
    { year: '1992', label: ['Thompson e Pike disegnano UTF-8', 'Thompson and Pike design UTF-8'] },
    { year: '1996', label: ['Unicode 2.0: i piani supplementari e le coppie surrogate', 'Unicode 2.0: supplementary planes and surrogate pairs'] },
    { year: '1999', label: ['Unicode 3.0 supera i 49.000 caratteri', 'Unicode 3.0 passes 49,000 characters'] },
    { year: '2008', label: ['UTF-8 supera ogni altra codifica sul web', 'UTF-8 overtakes every other encoding on the web'] },
    { year: '2010', label: ['Unicode 6.0 accoglie le emoji', 'Unicode 6.0 takes in the emoji'] },
    { year: 'oggi', label: ['Oltre 150.000 caratteri, e più del 98% del web in UTF-8', 'Over 150,000 characters, and more than 98% of the web in UTF-8'] },
  ],
};

/* ============================================================
   Risoluzione nella lingua corrente
   ============================================================ */

export interface Theory {
  title: string;
  lead: string;
  timelineTitle: string;
  sections: { heading: string; paragraphs: string[] }[];
  timeline: { year: string; label: string }[];
}

export type TheoryKey = 'ascii' | 'unicode';

const DOCS: Record<TheoryKey, RawTheory> = { ascii: ASCII, unicode: UNICODE };

export function theory(key: TheoryKey, lang: Lang): Theory {
  const i = lang === 'en' ? 1 : 0;
  const doc = DOCS[key];
  return {
    title: doc.title[i],
    lead: doc.lead[i],
    timelineTitle: doc.timelineTitle[i],
    sections: doc.sections.map((s) => ({ heading: s.heading[i], paragraphs: s.paragraphs.map((p) => p[i]) })),
    timeline: doc.timeline.map((e) => ({ year: e.year, label: e.label[i] })),
  };
}
