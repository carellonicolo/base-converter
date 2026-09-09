/**
 * Due righe di spiegazione per ogni carattere della tabella.
 *
 * Serve soprattutto per i caratteri di cui è difficile immaginare l'esistenza:
 * cosa ci fa un «separatore di unità» in una tabella di caratteri, perché
 * esiste un trattino invisibile, da dove salta fuori la peseta.
 *
 * ─── Come è organizzato ────────────────────────────────────────────────────
 * Le traduzioni stanno APPAIATE, `[italiano, inglese]`, invece che in due
 * mappe parallele: con un centinaio di voci tecniche due oggetti separati
 * divergerebbero alla prima aggiunta, e nessun controllo di tipo se ne
 * accorgerebbe. Così una voce a metà è un errore di compilazione.
 *
 * La risoluzione è a cascata, e non lascia mai una cella muta:
 *   1. nota sul singolo code point   (BEL, NBSP, €, ⌐ …)
 *   2. nota di gruppo                 (cornici, blocchi, greco, accentate, C1)
 *   3. nota di categoria              (lettere, cifre, punteggiatura)
 *
 * Al livello 3 la nota individuale varrebbe poco («la lettera B») mentre
 * quella di categoria dice la cosa davvero utile: che tra «A» e «a» cambia un
 * bit solo, e che i quattro bit bassi di una cifra ne sono il valore.
 */

import type { AsciiEntry, CharCategory } from '../../shared/engine/text';
import type { Lang } from './index';

/** `[italiano, inglese]`. */
type Bilingual = readonly [string, string];

/* ============================================================
   1. Note per code point
   ============================================================ */

/** Metà bassa: i 128 caratteri di ASCII. */
const ASCII_NOTES: Record<number, Bilingual> = {
  /* ---- controlli C0 (0–31): il cuore didattico della tabella ---- */
  0x00: [
    'Byte a zero. In C segna la fine di una stringa: è per questo che una parola «lunga 5» occupa in memoria 6 byte.',
    'A zero byte. In C it marks the end of a string: that is why a “5-character” word takes 6 bytes in memory.',
  ],
  0x01: [
    'Start of Heading: apriva l’intestazione di un messaggio — mittente, destinatario, priorità — prima del testo vero e proprio.',
    'Start of Heading: it opened a message’s header — sender, recipient, priority — before the text itself.',
  ],
  0x02: [
    'Start of Text: qui finisce l’intestazione e comincia il messaggio. Ancora vivo in molti protocolli seriali industriali.',
    'Start of Text: the header ends here and the message begins. Still alive in many industrial serial protocols.',
  ],
  0x03: [
    'End of Text: chiude il messaggio. È il carattere che il terminale invia con Ctrl+C, da cui l’abitudine di interrompere così un programma.',
    'End of Text: it closes the message. It is what the terminal sends on Ctrl+C, which is why that key interrupts a program.',
  ],
  0x04: [
    'End of Transmission: la trasmissione è finita, la linea si chiude. Su Unix è Ctrl+D, che segnala la fine dell’input.',
    'End of Transmission: the transmission is over and the line closes. On Unix it is Ctrl+D, signalling end of input.',
  ],
  0x05: [
    'Enquiry: «ci sei?». La macchina all’altro capo doveva rispondere identificandosi.',
    'Enquiry: “are you there?”. The machine at the other end was expected to answer by identifying itself.',
  ],
  0x06: [
    'Acknowledge: «ricevuto, tutto bene». La conferma positiva nelle trasmissioni a blocchi.',
    'Acknowledge: “received, all good”. The positive confirmation in block-by-block transmission.',
  ],
  0x07: [
    'Faceva suonare un campanello vero sulla telescrivente, per richiamare l’operatore. Oggi «\\a» fa il beep del terminale.',
    'It rang an actual bell on the teleprinter to call the operator. Today “\\a” makes the terminal beep.',
  ],
  0x08: [
    'Backspace: arretrava la testina di una posizione. Sulla carta serviva a sovrastampare due caratteri, per esempio per accentare una vocale.',
    'Backspace: it moved the print head back one position. On paper it was used to overstrike two characters, e.g. to accent a vowel.',
  ],
  0x09: [
    'Tabulazione: salta alla prossima colonna prefissata. Un solo byte al posto di molti spazi — nasce come risparmio di nastro.',
    'Tab: jump to the next preset column. One byte instead of many spaces — it was born to save tape.',
  ],
  0x0a: [
    'Line Feed: fa avanzare la carta di una riga. Su Unix e nel web è da solo «vai a capo»; su Windows lavora in coppia con CR.',
    'Line Feed: advance the paper by one line. On Unix and the web it alone means “new line”; on Windows it pairs with CR.',
  ],
  0x0b: [
    'Tabulazione verticale: saltava a una riga prestabilita del modulo. Serviva con la carta prestampata, oggi non lo usa quasi nessuno.',
    'Vertical tab: it jumped to a preset line of the form. Useful with pre-printed paper, almost unused today.',
  ],
  0x0c: [
    'Form Feed: espelle il foglio e passa al successivo. Nel codice sorgente sopravvive come separatore di sezione.',
    'Form Feed: eject the page and move to the next. In source code it survives as a section separator.',
  ],
  0x0d: [
    'Carriage Return: riporta la testina a inizio riga senza cambiare riga. Con LF forma il CRLF di Windows e dei protocolli di rete.',
    'Carriage Return: bring the head back to the start of the line without changing line. With LF it forms the CRLF of Windows and network protocols.',
  ],
  0x0e: [
    'Shift Out: da qui in poi si usa un secondo set di caratteri. Un modo pre-Unicode per superare il muro dei 128.',
    'Shift Out: from here on, use a second character set. A pre-Unicode way around the 128-character wall.',
  ],
  0x0f: [
    'Shift In: torna al set di caratteri normale, chiudendo quanto aperto da SO.',
    'Shift In: back to the normal character set, closing what SO opened.',
  ],
  0x10: [
    'Data Link Escape: cambia il significato dei byte che seguono. Serve a far viaggiare dati binari su una linea che usa caratteri di controllo.',
    'Data Link Escape: it changes the meaning of the bytes that follow, so binary data can travel over a line that uses control characters.',
  ],
  0x11: [
    'Device Control 1, meglio noto come XON: «riprendi a trasmettere». È il Ctrl+Q che sblocca un terminale fermo.',
    'Device Control 1, better known as XON: “resume sending”. It is the Ctrl+Q that unfreezes a stuck terminal.',
  ],
  0x12: [
    'Device Control 2: comando generico per una periferica, il significato lo sceglieva il costruttore.',
    'Device Control 2: a generic command for a peripheral; the manufacturer decided what it meant.',
  ],
  0x13: [
    'Device Control 3, cioè XOFF: «fermati, non riesco a starti dietro». È il Ctrl+S che blocca lo scorrimento del terminale.',
    'Device Control 3, i.e. XOFF: “stop, I can’t keep up”. It is the Ctrl+S that freezes terminal scrolling.',
  ],
  0x14: [
    'Device Control 4: quarto comando libero per la periferica, spesso usato per spegnerla.',
    'Device Control 4: a fourth free command for the peripheral, often used to turn it off.',
  ],
  0x15: [
    'Negative Acknowledge: «ricevuto male, ritrasmetti». Il gemello negativo di ACK.',
    'Negative Acknowledge: “received badly, send again”. The negative twin of ACK.',
  ],
  0x16: [
    'Synchronous Idle: riempitivo mandato quando non c’è nulla da dire, per tenere sincronizzate le due macchine.',
    'Synchronous Idle: filler sent when there is nothing to say, to keep the two machines in step.',
  ],
  0x17: [
    'End of Transmission Block: chiude un blocco quando il messaggio è troppo lungo e va spezzato.',
    'End of Transmission Block: it closes a block when the message is too long and must be split.',
  ],
  0x18: [
    'Cancel: «quello che ti ho appena mandato è sbagliato, buttalo». Annullava il blocco in corso senza chiudere la trasmissione.',
    'Cancel: “what I just sent you is wrong, discard it”. It voided the block in progress without closing the transmission.',
  ],
  0x19: [
    'End of Medium: la carta o il nastro sono finiti prima del messaggio.',
    'End of Medium: the paper or tape ran out before the message did.',
  ],
  0x1a: [
    'Substitute: prende il posto di un carattere arrivato corrotto. Su MS-DOS marcava la fine di un file di testo (Ctrl+Z).',
    'Substitute: it stands in for a character that arrived corrupted. On MS-DOS it marked end of a text file (Ctrl+Z).',
  ],
  0x1b: [
    'Escape: annuncia che i byte successivi non sono testo ma comandi. Apre le sequenze ANSI, quelle che colorano il testo e muovono il cursore.',
    'Escape: it announces that the following bytes are commands, not text. It opens the ANSI sequences that colour text and move the cursor.',
  ],
  0x1c: [
    'File Separator: il più grosso dei quattro separatori, divideva file diversi dentro lo stesso flusso di dati.',
    'File Separator: the coarsest of the four separators, it divided different files inside one data stream.',
  ],
  0x1d: [
    'Group Separator: divide gruppi di record. Ancora usato oggi dentro i codici a barre GS1.',
    'Group Separator: it divides groups of records. Still used today inside GS1 barcodes.',
  ],
  0x1e: [
    'Record Separator: divide un record dal successivo — l’antenato del «vai a capo» nei file di dati.',
    'Record Separator: it divides one record from the next — the ancestor of the newline in data files.',
  ],
  0x1f: [
    'Unit Separator: il più fine dei separatori, divide i campi dentro un record. Fa quello che nei CSV fa la virgola, ma senza ambiguità.',
    'Unit Separator: the finest separator, dividing fields inside a record. It does what the comma does in a CSV, but without the ambiguity.',
  ],
  0x7f: [
    'Tutti e sette i bit a uno. Su nastro perforato non si poteva togliere un buco: si cancellava un carattere bucandoli tutti. È per questo che DEL sta in fondo alla tabella e non tra gli altri controlli.',
    'All seven bits set. On punched tape you could not un-punch a hole: you erased a character by punching them all. That is why DEL sits at the end of the table rather than with the other controls.',
  ],

  /* ---- ASCII stampabili con una storia da raccontare ---- */
  0x20: [
    'Lo spazio è un carattere a tutti gli effetti e occupa un byte come una lettera: una riga di soli spazi non è una riga vuota.',
    'Space is a character like any other and takes one byte, just like a letter: a line of spaces is not an empty line.',
  ],
  0x21: ['Punto esclamativo. In molti linguaggi di programmazione è anche la negazione logica: «!x» si legge «non x».', 'Exclamation mark. In many programming languages it is also logical negation: “!x” reads “not x”.'],
  0x22: [
    'Virgolette dritte, non tipografiche: ASCII ne ha una forma sola, che apre e chiude. Le virgolette «curve» arrivano molto dopo, con le code page.',
    'Straight quotes, not typographic: ASCII has a single form that both opens and closes. Curly quotes arrive much later, with the code pages.',
  ],
  0x23: ['Cancelletto: da simbolo di numero e di libbra a marcatore di commento in mezza informatica, fino all’hashtag.', 'Number sign: from “number” and “pound” to comment marker in half of computing, and finally the hashtag.'],
  0x24: [
    'Dollaro. Nella variante nazionale britannica di ASCII questo stesso codice mostrava la sterlina: la prima crepa nell’idea di uno standard unico.',
    'Dollar sign. In the British national variant of ASCII this same code showed the pound sign: the first crack in the idea of one single standard.',
  ],
  0x25: ['Percentuale. Nelle URL introduce le sequenze «%XX» con cui si scrivono i byte non ammessi.', 'Percent. In URLs it introduces the “%XX” sequences used to write bytes that are not allowed.'],
  0x26: ['E commerciale: è la legatura delle lettere di «et», il latino per «e». In HTML apre le entità come «&amp;».', 'Ampersand: it is a ligature of the letters of “et”, Latin for “and”. In HTML it opens entities like “&amp;”.'],
  0x27: ['Apostrofo dritto, che fa anche da virgoletta singola. Come per le doppie, ASCII non distingue apertura e chiusura.', 'Straight apostrophe, doubling as a single quote. As with double quotes, ASCII does not distinguish opening from closing.'],
  0x2a: ['Asterisco: moltiplicazione, richiamo di nota, e il jolly che significa «qualunque cosa» in mezza informatica.', 'Asterisk: multiplication, footnote marker, and the wildcard meaning “anything” across computing.'],
  0x2b: ['Più. Nelle URL, storicamente, sta per lo spazio nei dati inviati da un modulo.', 'Plus. In URLs it historically stands for a space in data submitted by a form.'],
  0x2c: [
    'Virgola: separatore decimale in Italia e separatore di campo nei CSV. Le due cose insieme causano più guai di quanti sembri.',
    'Comma: decimal separator in much of Europe and field separator in CSV. The two together cause more trouble than one would think.',
  ],
  0x2d: [
    'Trattino-meno: ASCII ne ha uno solo per il segno meno, il trattino d’unione e la lineetta. Unicode li distingue in caratteri diversi.',
    'Hyphen-minus: ASCII has a single character for the minus sign, the hyphen and the dash. Unicode separates them into distinct characters.',
  ],
  0x2e: ['Punto: fine frase, separatore decimale in inglese, e separatore nei nomi di file e nei domini.', 'Full stop: end of sentence, decimal separator in English, and separator in file names and domains.'],
  0x2f: [
    'Barra: divisione, e separatore di cartelle su Unix e nelle URL. Proprio per questo non può comparire in un nome di file.',
    'Slash: division, and the folder separator on Unix and in URLs. That is exactly why it cannot appear in a file name.',
  ],
  0x3b: ['Punto e virgola: fine istruzione in mezza informatica, dal C in poi.', 'Semicolon: end of statement across much of computing, from C onwards.'],
  0x3c: ['Minore. In HTML apre un tag, ed è il motivo per cui va scritto «&lt;» quando serve davvero il segno.', 'Less-than. In HTML it opens a tag, which is why you must write “&lt;” when you mean the sign itself.'],
  0x3d: ['Uguale: in quasi tutti i linguaggi assegna un valore, e va raddoppiato («==») per confrontare.', 'Equals: in most languages it assigns a value, and must be doubled (“==”) to compare.'],
  0x3e: ['Maggiore. Chiude un tag HTML e, nella shell, redirige l’output su un file.', 'Greater-than. It closes an HTML tag and, in the shell, redirects output to a file.'],
  0x3f: ['Punto interrogativo. È anche il carattere che compare al posto di quelli che una conversione di codifica non è riuscita a tradurre.', 'Question mark. It is also what appears in place of characters an encoding conversion could not translate.'],
  0x40: [
    'Chiocciola. Ray Tomlinson la scelse nel 1971 per separare l’utente dalla macchina nel primo indirizzo di posta elettronica: gli serviva un simbolo che non potesse comparire in un nome.',
    'At sign. Ray Tomlinson picked it in 1971 to separate user from machine in the first email address: he needed a symbol that could never appear in a name.',
  ],
  0x5c: [
    'Barra rovesciata: fu aggiunta ad ASCII apposta per poter scrivere gli operatori «/\\» e «\\/» di ALGOL. Oggi è il carattere di escape («\\n») e il separatore di cartelle su Windows.',
    'Backslash: it was added to ASCII specifically so ALGOL’s “/\\” and “\\/” operators could be written. Today it is the escape character (“\\n”) and the folder separator on Windows.',
  ],
  0x5e: [
    'Accento circonflesso: nato come accento da sovrastampare su una vocale, oggi indica l’elevamento a potenza, lo XOR e il tasto Ctrl («^C»).',
    'Circumflex: born as an accent to overstrike on a vowel, today it means exponentiation, XOR, and the Ctrl key (“^C”).',
  ],
  0x5f: ['Trattino basso: nasce per sottolineare sovrastampando, oggi tiene insieme le parole dove lo spazio non è ammesso.', 'Underscore: born to underline by overstriking, today it joins words where a space is not allowed.'],
  0x60: [
    'Accento grave: come il circonflesso, era un accento da sovrastampare. Oggi apre i comandi nella shell e i blocchi di codice in Markdown.',
    'Grave accent: like the circumflex, it was an accent to overstrike. Today it opens shell commands and code blocks in Markdown.',
  ],
  0x7b: ['Parentesi graffa aperta: delimita i blocchi in C e discendenti, e gli oggetti in JSON.', 'Opening brace: it delimits blocks in C and its descendants, and objects in JSON.'],
  0x7c: [
    'Barra verticale: OR logico, alternativa nelle espressioni regolari, e la «pipe» che nella shell collega l’uscita di un comando all’ingresso del successivo.',
    'Vertical bar: logical OR, alternation in regular expressions, and the pipe that connects one command’s output to the next one’s input.',
  ],
  0x7e: [
    'Tilde: era un accento da sovrastampare per la «ñ». Oggi è la cartella personale su Unix e il «circa» in matematica.',
    'Tilde: it was an accent to overstrike for “ñ”. Today it is the home directory on Unix and “approximately” in mathematics.',
  ],
};

/* ------------------------------------------------------------
   Metà alta: simboli di Latin-1, Windows-1252 e CP437.
   Sono i caratteri che più spesso lasciano perplessi — un trattino
   invisibile, una valuta che non è nessuna valuta, una barra spezzata.
   ------------------------------------------------------------ */
const HIGH_NOTES: Record<number, Bilingual> = {
  0x00a0: [
    'Spazio unificatore: si vede come uno spazio normale ma vieta l’a capo. Tiene insieme «10 kg» o «pag. 5», che spezzati a fine riga si leggerebbero male.',
    'Non-breaking space: it looks like an ordinary space but forbids a line break. It holds “10 kg” or “p. 5” together, which would read badly if split across lines.',
  ],
  0x00a1: ['Punto esclamativo rovesciato: in spagnolo apre la frase esclamativa, che si chiude con quello normale.', 'Inverted exclamation mark: in Spanish it opens an exclamation, closed by the ordinary one.'],
  0x00a2: ['Centesimo di dollaro. Aveva un tasto dedicato sulle macchine da scrivere americane, e le code page se lo sono portato dietro da lì.', 'Cent, one hundredth of a dollar. It had a dedicated key on American typewriters, and the code pages inherited it from there.'],
  0x00a3: ['Sterlina britannica. Il simbolo è una «L» corsiva di «libra», la libbra romana — la stessa parola da cui viene l’abbreviazione «lb» del peso.', 'British pound. The symbol is a cursive “L” for “libra”, the Roman pound — the same word behind the weight abbreviation “lb”.'],
  0x00a4: [
    'Simbolo di valuta generico: sta per «una moneta qualsiasi». Lo volle ISO per non privilegiare una valuta sulle altre; in Windows-1252 il suo posto se l’è preso l’euro.',
    'Generic currency sign: it stands for “some currency”. ISO wanted it so no single currency was privileged; in Windows-1252 the euro took its place.',
  ],
  0x00a5: ['Yen giapponese — lo stesso simbolo indica anche lo yuan cinese.', 'Japanese yen — the same symbol also stands for the Chinese yuan.'],
  0x00a6: [
    'Barra verticale spezzata: su vecchi terminali serviva a distinguerla dalla «pipe» piena. Oggi non ha più uno scopo, ed è forse il carattere più inutile della tabella.',
    'Broken bar: on old terminals it distinguished this from the solid pipe. Today it serves no purpose, and is arguably the most useless character in the table.',
  ],
  0x00a7: ['Paragrafo: numera gli articoli nei testi di legge e nei regolamenti.', 'Section sign: it numbers articles in legal texts and regulations.'],
  0x00a8: ['Dieresi isolata, senza lettera sotto: serviva a comporre le lettere accentate sovrastampando due caratteri.', 'Standalone diaeresis, with no letter under it: it was used to build accented letters by overstriking two characters.'],
  0x00a9: ['Copyright. Oggi la tutela è automatica, ma per decenni negli Stati Uniti un’opera pubblicata senza questo simbolo cadeva in pubblico dominio.', 'Copyright. Protection is automatic today, but for decades in the United States a work published without this symbol fell into the public domain.'],
  0x00aa: ['Indicatore ordinale femminile: la piccola «a» di «1ª», prima.', 'Feminine ordinal indicator: the small “a” of “1ª”, first.'],
  0x00ab: ['Virgoletta caporale aperta: in italiano e in francese apre il discorso diretto.', 'Opening guillemet: in Italian and French it opens direct speech.'],
  0x00ac: ['Segno di negazione: il «non» della logica, «¬p» si legge «non p». Nei linguaggi di programmazione lo stesso ruolo ce l’ha il punto esclamativo.', 'Not sign: logic’s “not”; “¬p” reads “not p”. In programming languages the exclamation mark plays the same role.'],
  0x00ad: [
    'Trattino morbido: è invisibile, e dice al programma dove può spezzare la parola se serve andare a capo. Se la riga non va spezzata, non si vede affatto.',
    'Soft hyphen: invisible, it tells the renderer where a word may be broken if a line break is needed. If no break is needed, it shows nothing at all.',
  ],
  0x00ae: ['Marchio registrato: a differenza di «™» si può usare solo se il marchio è davvero depositato presso un ufficio brevetti.', 'Registered trade mark: unlike “™” it may be used only when the mark is actually filed with a trade mark office.'],
  0x00af: ['Macron: la lineetta che si sovrastampava sopra una vocale per indicarne la lunghezza.', 'Macron: the bar overstruck above a vowel to mark it as long.'],
  0x00b0: ['Grado: temperature e ampiezze angolari. Non è una «o» in apice, e da solo non significa Celsius: quello si scrive «°C», due caratteri.', 'Degree sign: temperatures and angles. It is not a superscript “o”, and alone it does not mean Celsius: that is written “°C”, two characters.'],
  0x00b1: ['Più o meno: indica la tolleranza di una misura, «12 ± 0,5».', 'Plus-minus: it states the tolerance of a measurement, “12 ± 0.5”.'],
  0x00b2: ['Due in apice: il «al quadrato» di «m²». Esiste come carattere a sé perché una macchina da scrivere non sapeva alzare i caratteri.', 'Superscript two: the “squared” of “m²”. It exists as its own character because a typewriter could not raise characters.'],
  0x00b3: ['Tre in apice: il «al cubo» di «m³». Insieme a «¹» e «²» è l’unico apice delle code page a 8 bit — dal quattro in poi non c’è nulla.', 'Superscript three: the “cubed” of “m³”. With “¹” and “²” it is the only superscript in the 8-bit code pages — from four onwards there is nothing.'],
  0x00b4: ['Accento acuto isolato. È un carattere di testo, non un accento combinante: messo dopo una «e» resta «e´», non diventa «é».', 'Standalone acute accent. It is a text character, not a combining accent: placed after an “e” it stays “e´”, it does not become “é”.'],
  0x00b5: ['Mu: il prefisso «micro», cioè un milionesimo. «µs» sono microsecondi.', 'Micro sign: the “micro” prefix, one millionth. “µs” means microseconds.'],
  0x00b6: ['Segno di capoverso: nei programmi di videoscrittura marca la fine di un paragrafo, di solito nascosto.', 'Pilcrow: in word processors it marks the end of a paragraph, usually hidden.'],
  0x00b7: ['Punto mediano: moltiplicazione, separazione di voci in un elenco, o divisione in sillabe.', 'Middle dot: multiplication, separating items in a list, or splitting syllables.'],
  0x00b8: ['Cediglia isolata: il ricciolo che sta sotto la «ç», da sovrastampare.', 'Standalone cedilla: the hook that goes under “ç”, meant to be overstruck.'],
  0x00b9: ['Uno in apice, usato soprattutto per i rimandi alle note. Curiosamente arrivò dopo «²» e «³», che erano già nelle prime code page.', 'Superscript one, used mostly for footnote references. Oddly it arrived after “²” and “³”, which were already in the earliest code pages.'],
  0x00ba: ['Indicatore ordinale maschile: la piccola «o» di «1º», primo.', 'Masculine ordinal indicator: the small “o” of “1º”, first.'],
  0x00bb: ['Virgoletta caporale chiusa: chiude il discorso diretto aperto da «».', 'Closing guillemet: it closes the direct speech opened by “«”.'],
  0x00bc: ['Un quarto. Le frazioni comuni ebbero un carattere proprio perché una macchina da scrivere non poteva comporle.', 'One quarter. Common fractions got their own characters because a typewriter could not compose them.'],
  0x00bd: ['Un mezzo. Come «¼» e «¾» ha un carattere tutto suo perché una macchina da scrivere non sapeva comporre le frazioni.', 'One half. Like “¼” and “¾” it gets a character of its own because a typewriter could not compose fractions.'],
  0x00be: ['Tre quarti. Le code page si fermano a questi tre: un quinto o un settimo vanno scritti a mano con la barra.', 'Three quarters. The code pages stop at these three: a fifth or a seventh must be written by hand with a slash.'],
  0x00bf: ['Punto interrogativo rovesciato: in spagnolo apre la domanda, che si chiude con quello normale.', 'Inverted question mark: in Spanish it opens a question, closed by the ordinary one.'],

  /* ---- lettere che non sono «una lettera con un accento» ---- */
  0x00c6: ['Legatura di A ed E: in danese, norvegese e islandese è una lettera a sé, con un posto suo nell’alfabeto.', 'Ligature of A and E: in Danish, Norwegian and Icelandic it is a letter in its own right, with its own place in the alphabet.'],
  0x00e6: ['Legatura di a ed e: una lettera vera delle lingue nordiche, non una decorazione tipografica.', 'Ligature of a and e: a real letter of the Nordic languages, not a typographic flourish.'],
  0x00d0: ['Eth: la «th» sonora dell’islandese, il suono iniziale dell’inglese «this».', 'Eth: the voiced “th” of Icelandic, the initial sound of English “this”.'],
  0x00f0: ['Eth minuscola: la «th» sonora dell’islandese e dell’inglese antico.', 'Lowercase eth: the voiced “th” of Icelandic and Old English.'],
  0x00de: [
    'Thorn: la «th» sorda, come in «think». L’inglese la usò per secoli; i tipografi con caratteri tedeschi la sostituirono con una «y», da cui il finto arcaico «Ye Olde».',
    'Thorn: the voiceless “th”, as in “think”. English used it for centuries; printers with German type substituted “y”, which is where the fake-archaic “Ye Olde” comes from.',
  ],
  0x00fe: ['Thorn minuscola: la «th» sorda, come in «think». L’inglese la usò per secoli, poi sparì con l’arrivo dei caratteri da stampa importati dal continente.', 'Lowercase thorn: the voiceless “th”, as in “think”. English used it for centuries, then it vanished when printing type was imported from the continent.'],
  0x00df: ['Eszett tedesca: vale una doppia s. Esiste solo minuscola — in maiuscolo si scrive «SS».', 'German eszett: it stands for a double s. It exists only in lowercase — in capitals it is written “SS”.'],
  0x00d7: ['Segno di moltiplicazione, che NON è la lettera x. In «1920 × 1080» è questo carattere, non una ics.', 'Multiplication sign, which is NOT the letter x. In “1920 × 1080” this is the character used, not an ex.'],
  0x00f7: ['Segno di divisione: la barra con i due punti che si impara alle elementari.', 'Division sign: the bar with two dots learnt in primary school.'],
  0x00d8: ['O barrata: vocale a sé in danese e norvegese. Un simbolo quasi identico indica in matematica l’insieme vuoto.', 'O with stroke: a vowel of its own in Danish and Norwegian. A nearly identical symbol denotes the empty set in mathematics.'],
  0x00f8: ['o barrata: vocale delle lingue scandinave, non una «o» sbarrata per errore.', 'o with stroke: a Scandinavian vowel, not an “o” crossed out by mistake.'],
  0x00c5: ['A con anello: vocale delle lingue scandinave. In maiuscolo è anche il simbolo dell’ångström, un decimiliardesimo di metro.', 'A with ring: a Scandinavian vowel. In capitals it is also the symbol for the ångström, one ten-billionth of a metre.'],
  0x00e5: ['a con anello: vocale di svedese, danese e norvegese. Nasce da una doppia «a» medievale, con la seconda scritta piccola sopra la prima.', 'a with ring: a vowel of Swedish, Danish and Norwegian. It comes from a medieval double “a”, the second written small above the first.'],

  /* ---- tipografia di Windows-1252: i caratteri che «rompono» i file ---- */
  0x20ac: [
    'Euro. Aggiunto a Windows-1252 nel 1998 occupando un byte che ISO teneva libero per un controllo: è per questo che in Latin-1 il simbolo dell’euro semplicemente non esiste.',
    'Euro. Added to Windows-1252 in 1998, taking a byte ISO had reserved for a control: that is why Latin-1 simply has no euro sign.',
  ],
  0x201a: ['Virgoletta bassa singola: apre il discorso diretto in tedesco.', 'Single low quotation mark: it opens direct speech in German.'],
  0x0192: ['Effe con uncino: il fiorino olandese. Nei primi fogli di calcolo indicava anche «funzione».', 'F with hook: the Dutch guilder. In early spreadsheets it also stood for “function”.'],
  0x201e: ['Virgolette basse doppie: aprono il discorso diretto in tedesco e in polacco.', 'Double low quotation marks: they open direct speech in German and Polish.'],
  0x2026: ['Puntini di sospensione come carattere unico invece di tre punti separati: così non vengono spezzati a fine riga.', 'Ellipsis as a single character rather than three separate dots, so it cannot be broken across lines.'],
  0x2020: ['Croce: rimando alla seconda nota a piè di pagina, dopo l’asterisco.', 'Dagger: the second footnote reference, after the asterisk.'],
  0x2021: ['Doppia croce: la terza nota a piè di pagina, dopo l’asterisco e la croce singola. L’ordine dei richiami è una convenzione tipografica secolare.', 'Double dagger: the third footnote reference, after the asterisk and the single dagger. The order of these marks is a centuries-old typographic convention.'],
  0x02c6: ['Circonflesso isolato. Come gli altri accenti sciolti della tabella, serviva a costruire le lettere accentate sovrastampando due battute.', 'Standalone circumflex. Like the other loose accents in the table, it was used to build accented letters by overstriking two keystrokes.'],
  0x2030: ['Per mille: come la percentuale, ma su mille invece che su cento.', 'Per mille: like percent, but out of a thousand instead of a hundred.'],
  0x0160: ['S con caron: la «sc» di «scena» in ceco, croato, sloveno.', 'S with caron: the “sh” sound in Czech, Croatian and Slovenian.'],
  0x0161: ['s con caron: si legge come la «sc» di «scena». In ceco, croato e sloveno è una lettera a sé, con un posto suo nell’alfabeto.', 's with caron: pronounced like English “sh”. In Czech, Croatian and Slovenian it is a letter in its own right, with its own place in the alphabet.'],
  0x2039: ['Virgoletta caporale singola aperta, usata in francese e nello svizzero tedesco.', 'Single opening guillemet, used in French and Swiss German.'],
  0x203a: ['Virgoletta caporale singola chiusa. In francese e nello svizzero tedesco chiude una citazione contenuta dentro un’altra citazione.', 'Single closing guillemet. In French and Swiss German it closes a quotation nested inside another quotation.'],
  0x0152: ['Legatura di O ed E del francese, come in «cœur» e «sœur». Non è un vezzo tipografico: scriverla staccata è un errore di ortografia.', 'Ligature of O and E from French, as in “cœur” and “sœur”. It is not a typographic flourish: writing the letters apart is a spelling mistake.'],
  0x0153: ['Legatura di o ed e: in francese è una lettera, non due lettere attaccate.', 'Ligature of o and e: in French it counts as one letter, not two stuck together.'],
  0x017d: ['Z con caron: la «j» francese di «jour», nelle lingue slave.', 'Z with caron: the French “j” of “jour”, in Slavic languages.'],
  0x017e: ['z con caron: la «j» francese di «jour». Come «š», nelle lingue slave è una lettera dell’alfabeto e non una «z» decorata.', 'z with caron: the French “j” of “jour”. Like “š”, in Slavic languages it is a letter of the alphabet, not a decorated “z”.'],
  0x2018: [
    'Virgoletta singola di apertura, «curva». È il carattere che i programmi di videoscrittura mettono al posto dell’apostrofo dritto — e che manda in crisi il codice che si aspetta ASCII.',
    'Curly opening single quote. It is what word processors substitute for the straight apostrophe — and what breaks code that expects ASCII.',
  ],
  0x2019: ['Virgoletta singola di chiusura, usata anche come apostrofo tipografico: «un’altra».', 'Curly closing single quote, also used as the typographic apostrophe: “don’t”.'],
  0x201c: ['Virgolette doppie di apertura, «curve». Sono ciò che i programmi di videoscrittura sostituiscono in automatico al doppio apice dritto di ASCII.', 'Curly opening double quote. It is what word processors automatically substitute for the straight ASCII double quote.'],
  0x201d: ['Virgolette doppie di chiusura, diverse da quelle di apertura. Il carattere ASCII, dritto, faceva entrambi i lavori: la distinzione arriva solo qui.', 'Curly closing double quote, different from the opening one. The straight ASCII character did both jobs: the distinction only arrives here.'],
  0x2022: ['Punto elenco: il pallino davanti alle voci di un elenco. In Windows-1252 c’è perché la videoscrittura ne aveva bisogno e Latin-1 non lo prevedeva.', 'Bullet: the dot in front of list items. It is in Windows-1252 because word processing needed it and Latin-1 did not provide one.'],
  0x2013: ['Lineetta enne: unisce gli estremi di un intervallo, «pagine 10–15». Larga quanto una «n».', 'En dash: it joins the ends of a range, “pages 10–15”. As wide as an “n”.'],
  0x2014: ['Lineetta emme: apre e chiude un inciso — come questo. Larga quanto una «m».', 'Em dash: it opens and closes a parenthetical — like this one. As wide as an “m”.'],
  0x02dc: ['Tilde isolata, alta e piccola. Non va confusa con la tilde ASCII «~», che è un carattere di testo a tutti gli effetti e sta a mezza altezza.', 'Standalone small tilde, raised and small. Not to be confused with the ASCII tilde “~”, which is a full text character sitting at mid height.'],
  0x2122: ['Marchio di fabbrica, non registrato: chiunque può usarlo, a differenza di ®.', 'Trade mark sign, unregistered: anyone may use it, unlike ®.'],
  0x0178: ['Y con dieresi: rarissima, serve quasi solo a scrivere in maiuscolo alcuni nomi propri francesi.', 'Y with diaeresis: extremely rare, needed almost only to capitalise certain French proper names.'],

  /* ---- matematica e curiosità di CP437 ---- */
  0x20a7: ['Peseta: la vecchia moneta spagnola, sparita con l’euro. IBM le diede un carattere perché la Spagna era un mercato che contava.', 'Peseta: the old Spanish currency, gone with the euro. IBM gave it a character because Spain was a market that mattered.'],
  0x2310: ['Negazione rovesciata: gemella speculare di «¬», serviva a comporre riquadri e formule.', 'Reversed not sign: the mirror twin of “¬”, used to build boxes and formulas.'],
  0x207f: ['Enne in apice: serviva a scrivere le potenze generiche, «xⁿ», quando gli apici non esistevano.', 'Superscript n: used to write general powers, “xⁿ”, back when superscripts did not exist.'],
  0x221e: ['Infinito. Il simbolo lo introdusse John Wallis nel Seicento; in virgola mobile è anche un valore vero e proprio, il risultato di una divisione per zero.', 'Infinity. John Wallis introduced the symbol in the seventeenth century; in floating point it is also a real value, the result of dividing by zero.'],
  0x2229: ['Intersezione: gli elementi che due insiemi hanno in comune. Il simbolo lo si deve a Giuseppe Peano, che lo introdusse alla fine dell’Ottocento.', 'Intersection: the elements two sets have in common. The symbol is due to Giuseppe Peano, who introduced it in the late nineteenth century.'],
  0x2261: ['Identicamente uguale, o congruo: più forte del semplice «uguale».', 'Identical to, or congruent: stronger than plain “equals”.'],
  0x2265: ['Maggiore o uguale. Sta in CP437 perché un PC del 1981 doveva poter stampare le formule, non perché servisse a programmare.', 'Greater than or equal to. It is in CP437 because a 1981 PC had to be able to print formulas, not because programming needed it.'],
  0x2264: ['Minore o uguale. Nei linguaggi di programmazione si scrive «<=» con due caratteri, proprio perché ASCII questo simbolo non ce l’ha.', 'Less than or equal to. Programming languages spell it “<=” with two characters, precisely because ASCII does not have this symbol.'],
  0x2248: ['Circa uguale: due quantità vicine ma non identiche. In informatica serve di continuo, perché due numeri in virgola mobile quasi mai coincidono esattamente.', 'Approximately equal to: two quantities close but not identical. Computing needs it constantly, because two floating-point numbers are almost never exactly equal.'],
  0x221a: ['Radice quadrata. Il segno nasce come una «r» corsiva di «radix»; la barra orizzontale sopra il radicando fu aggiunta da Cartesio.', 'Square root. The sign began as a cursive “r” for “radix”; the horizontal bar over the radicand was added by Descartes.'],
  0x2219: ['Punto di operazione: la moltiplicazione tra numeri, distinta dal punto della punteggiatura.', 'Bullet operator: multiplication between numbers, distinct from the punctuation dot.'],
  0x2320: ['Metà superiore del segno di integrale: si impilava su due righe per disegnare un integrale alto, quando la grafica non c’era.', 'Top half of an integral sign: stacked over two lines to draw a tall integral, back when there were no graphics.'],
  0x2321: ['Metà inferiore del segno di integrale, da mettere sotto la precedente.', 'Bottom half of an integral sign, to be placed under the previous one.'],
  0x25a0: ['Quadrato pieno: pallino di elenco, cursore, o mattone per disegnare.', 'Black square: list bullet, cursor, or a brick for drawing.'],
};

const BY_CODE_POINT: Record<number, Bilingual> = { ...ASCII_NOTES, ...HIGH_NOTES };

/* ============================================================
   2. Note di gruppo
   ============================================================ */

type GroupKey = 'c1' | 'box' | 'block' | 'greek' | 'accented';

const BY_GROUP: Record<GroupKey, Bilingual> = {
  c1: [
    'Controllo C1: la seconda serie di caratteri di controllo, aggiunta da ISO per i terminali degli anni Settanta. Non li usa quasi più nessuno, ma i loro byte restano occupati — ed è per questo che Latin-1 offre 96 caratteri in più e non 128.',
    'A C1 control: the second run of control characters, added by ISO for 1970s terminals. Almost nobody uses them any more, but their bytes stay taken — which is why Latin-1 adds 96 characters and not 128.',
  ],
  box: [
    'Pezzo di cornice. Prima delle interfacce grafiche, i menu e le finestre dei programmi DOS si disegnavano così, incastrando questi caratteri come i pezzi di un puzzle.',
    'A piece of a frame. Before graphical interfaces, the menus and windows of DOS programs were drawn like this, fitting these characters together like puzzle pieces.',
  ],
  block: [
    'Blocco pieno o retinato. Con questi caratteri si facevano barre di avanzamento, istogrammi e ombreggiature, quando il testo era l’unica grafica disponibile.',
    'A solid or shaded block. These characters made progress bars, bar charts and shading back when text was the only graphics available.',
  ],
  greek: [
    'Lettera greca, messa in CP437 per scrivere le formule: senza, su un PC del 1981, non c’era modo di stampare una sigma o un pi greco.',
    'A Greek letter, put into CP437 to write formulas: without it, on a 1981 PC, there was no way to print a sigma or a pi.',
  ],
  accented: [
    'Lettera accentata dell’Europa occidentale. È l’aggiunta che ha reso queste code page usabili fuori dai paesi anglofoni: con il solo ASCII, «perché» si poteva scrivere solo «perche’».',
    'A Western European accented letter. This is the addition that made these code pages usable outside English-speaking countries: with ASCII alone, “café” could only be written “cafe”.',
  ],
};

/* ============================================================
   3. Note di categoria — l'ultima rete, e la più didattica
   ============================================================ */

const BY_CATEGORY: Record<CharCategory, Bilingual> = {
  control: [
    'Carattere di controllo: non si stampa, comanda. Nato per pilotare telescriventi e linee di trasmissione.',
    'A control character: it does not print, it commands. Born to drive teleprinters and transmission lines.',
  ],
  space: [
    'Spazio: un carattere a tutti gli effetti, che occupa un byte come una lettera.',
    'A space: a character in its own right, taking one byte just like a letter.',
  ],
  digit: [
    'Le dieci cifre stanno ai codici 48–57, cioè da 0x30 a 0x39: i quattro bit bassi sono esattamente il valore della cifra. È per questo che in C basta «c − ’0’» per convertire un carattere nel numero che rappresenta.',
    'The ten digits sit at codes 48–57, that is 0x30 to 0x39: the low four bits are exactly the digit’s value. That is why in C “c − ’0’” is enough to turn a character into the number it stands for.',
  ],
  upper: [
    'Le maiuscole occupano i codici 65–90 (0x41–0x5A). Rispetto alla minuscola corrispondente cambia un bit soltanto, quello che vale 32: «’A’ | 32» dà «’a’». La disposizione non è casuale, è stata scelta apposta.',
    'Capitals occupy codes 65–90 (0x41–0x5A). Compared with the matching lowercase letter only one bit changes, the one worth 32: “’A’ | 32” gives “’a’”. The layout is not accidental, it was chosen on purpose.',
  ],
  lower: [
    'Le minuscole stanno ai codici 97–122 (0x61–0x7A), esattamente 32 sopra le maiuscole. Cambiare maiuscolo e minuscolo in ASCII è quindi un’operazione su un bit, non una tabella di conversione.',
    'Lowercase letters sit at codes 97–122 (0x61–0x7A), exactly 32 above the capitals. Changing case in ASCII is therefore a single-bit operation, not a lookup table.',
  ],
  punct: [
    'I simboli di ASCII riempiono i buchi tra controlli, cifre e lettere. Sono pochi e generici di proposito: ognuno è stato poi riusato da decine di linguaggi con significati diversi.',
    'ASCII’s symbols fill the gaps between controls, digits and letters. They are few and generic on purpose: each one was later reused by dozens of languages with different meanings.',
  ],
  extended: [
    'Carattere della metà alta della tabella: esiste solo perché questa code page lo mette qui. Letto con un’altra code page, lo stesso byte mostrerebbe un carattere diverso.',
    'A character from the upper half of the table: it exists only because this code page puts it here. Read with another code page, the same byte would show something else.',
  ],
  unassigned: [
    'Questo byte non ha alcun carattere assegnato in questa code page. Un programma che lo incontra può ignorarlo, sostituirlo con un segnaposto o rifiutare il file.',
    'This byte has no character assigned in this code page. A program that meets it may ignore it, replace it with a placeholder, or reject the file.',
  ],
};

/* ============================================================
   Risoluzione
   ============================================================ */

/** Una lettera latina con un segno diacritico: «à» si scompone in «a» + accento. */
function isAccentedLatin(cp: number): boolean {
  if (cp < 0x00c0 || cp > 0x024f) return false;
  const decomposed = String.fromCodePoint(cp).normalize('NFD');
  return decomposed.length > 1 && /[A-Za-z]/.test(decomposed[0]);
}

function groupOf(entry: AsciiEntry): GroupKey | null {
  const { cp } = entry;
  if (cp < 0) return null;
  if (entry.isControl && cp >= 0x80 && cp <= 0x9f) return 'c1';
  if (cp >= 0x2500 && cp <= 0x257f) return 'box';
  if ((cp >= 0x2580 && cp <= 0x259f) || cp === 0x25a0) return 'block';
  if (cp >= 0x0370 && cp <= 0x03ff) return 'greek';
  if (isAccentedLatin(cp)) return 'accented';
  return null;
}

/**
 * Le due righe di spiegazione di un carattere.
 * Non restituisce mai stringa vuota: se non c'è una nota specifica scende alla
 * nota di gruppo, e in ultima istanza a quella di categoria.
 */
export function charNote(entry: AsciiEntry, lang: Lang): string {
  const i = lang === 'en' ? 1 : 0;
  const exact = entry.cp >= 0 ? BY_CODE_POINT[entry.cp] : undefined;
  if (exact) return exact[i];
  const group = groupOf(entry);
  if (group) return BY_GROUP[group][i];
  return BY_CATEGORY[entry.category][i];
}
