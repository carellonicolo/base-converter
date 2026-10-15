# Base Converter

> Basi numeriche e codifiche — toolkit didattico del Prof. Nicolò Carello

Strumento per capire (non solo calcolare) come i numeri e il testo vivono dentro
il computer: conversioni di base con i **passaggi svolti come sul quaderno**,
aritmetica in colonna, complemento a due, IEEE 754, ASCII/Unicode, una palestra
di esercizi con traguardi e le **verifiche ufficiali** con correzione automatica.

Fa parte dell'infrastruttura di app didattiche su `nicolocarello.it` e ne
condivide grafica, header unificato e login SSO.

- **Produzione**: [converter.nicolocarello.it](https://converter.nicolocarello.it)
  (alias: `baseconverter.nicolocarello.it`)
- **Deploy**: automatico su Cloudflare Pages a ogni push su `main`

## Moduli

| Modulo | Cosa fa |
|:--|:--|
| **Convertitore di basi** | Basi 2–36, interi e frazionari, negativi, precisione arbitraria (BigInt), raggruppamento a nibble/byte, rilevamento delle frazioni periodiche. Passaggi: divisioni successive, moltiplicazioni successive, pesi posizionali. |
| **Aritmetica in base** | Addizione, sottrazione e moltiplicazione in colonna in base 2/8/10/16, con riporti, prestiti e prodotti parziali espliciti, più controprova in base 10. |
| **Numeri con segno** | Complemento a due e a uno, modulo e segno, eccesso-K su 4/8/16/32 bit. Bit cliccabili, intervallo rappresentabile, overflow, e i passaggi «inverti + aggiungi 1». |
| **IEEE 754** | Half/single/double: campi segno, esponente e mantissa colorati e modificabili bit a bit, casi speciali (zero, denormali, ±∞, NaN) ed errore di rappresentazione reale. |
| **Testo e codifiche** | Tabella dei caratteri come **griglia 16×16** (riga = 4 bit alti, colonna = 4 bit bassi) su quattro code page — ASCII a 7 bit, CP437, ISO 8859-1, Windows-1252 — con il confronto dello stesso byte tra le code page, **due righe di spiegazione per ogni carattere** e l'**export del poster A4 in PDF vettoriale e PNG**. Modali con i cenni storici su ASCII e su Unicode, linea del tempo inclusa. Poi esploratore Unicode per blocchi, codifica UTF-8/16/32 byte per byte, Base64 con la scomposizione 3 byte → 24 bit → 4 sestetti, URL-encoding. |
| **Palestra** | Esercizi generati automaticamente su tutti i moduli, tre livelli, XP e livelli, serie (streak), statistiche per argomento, 16 traguardi da sbloccare e **modalità tutor** che corregge un passaggio alla volta. |
| **Verifiche** | Prova ufficiale a schermo intero con timer, correzione automatica lato server, voto in decimi e revisione domanda per domanda. Le risposte si salvano durante la prova: se il computer si spegne, la consegna la fa il server. Uscite dalla pagina e dallo schermo intero registrate una per una. |
| **Console docente** | Barra laterale come VLSM e CCNA1 — vedi sotto. |

### Console docente (`/admin`)

| Scheda | Cosa fa |
|:--|:--|
| **Assegna** | Una verifica del catalogo a una **classe** o a un **singolo studente** (recuperi, assenze lunghe), con la durata e la **finestra** per iniziarla: passata, si chiude da sola e chi l'ha iniziata la porta a termine. In cima, le verifiche aperte adesso (+15 min, chiudi). |
| **Sessioni live** | Le prove in corso ogni 5 s: avanzamento, tempo, ultimo segnale, distrazioni. **Avviso**, **ammonizione** e **interruzione** arrivano allo studente in pochi secondi. |
| **Storico verifiche** | Ogni assegnazione è una sessione da riaprire in seguito: statistiche, istogramma dei voti, studenti ordinabili, *dove sbaglia la classe* per tipo di esercizio, assenti, prove da guardare, CSV. **Riapri per gli assenti**: la stessa sessione, ma la può iniziare solo chi non l'ha svolta. |
| **Risultati** | Tutte le prove, filtrabili per classe, verifica, esito e studente; CSV. |
| **Classifica** | La palestra per classe: podio, classifica per XP ordinabile per colonna, dove sbaglia la classe, dettaglio dello studente. |
| **Studenti** | Il registro dell'IdP per classe; la cartella di ogni studente (verifiche, palestra) e l'assegnazione personale. |
| **Catalogo** | Sette argomenti × tre livelli, con anteprima e soluzioni. |

Da ogni elenco si apre la **revisione della prova**: risposta data e attesa, uscite dalla pagina con ora e durata, interventi del docente, ed **elimina prova** per lasciarla rifare. Studenti come «Cognome Nome» e ordinati per cognome, come in VLSM. La scheda aperta sta nell'indirizzo (`/admin?tab=history&session=…`).

## Accesso

L'app è a **uso libero**: strumenti, teoria e palestra funzionano senza login e
anche offline. Il login SSO (`auth.nicolocarello.it`) serve solo per:

- salvare i progressi della palestra su tutti i dispositivi;
- svolgere le **verifiche ufficiali**, riservate agli account attivi con
  **classe approvata** dal docente;
- la console docente (`isTeacher` / `isSuperAdmin`).

## Tecnologie

Vite 6 · React 18 · TypeScript 5.7 (strict) · React Router 6 · Cloudflare Pages
Functions · D1 · PWA installabile e offline. Nessun framework CSS: il tema
Carello è scritto a mano in `src/index.css`.

**Zero dipendenze per l'export.** Il poster della tabella dei caratteri nasce da
un unico modello geometrico (`src/lib/poster.ts`) reso da due motori: SVG — da
cui si ricava il PNG rasterizzando su canvas — e un **generatore PDF scritto a
mano** (`src/lib/pdf.ts`). La CSP del sito vieta gli script da CDN e una
libreria PDF peserebbe centinaia di kB su una PWA che deve funzionare offline;
il PDF esce vettoriale, con il testo selezionabile, e sta in ~80 kB. I glifi che
i font standard del PDF non hanno (box-drawing e blocchi di CP437) sono
disegnati come geometria, ricavando le braccia dal nome Unicode del carattere.

## Struttura

```
shared/            logica condivisa frontend + backend (la stessa che corregge le verifiche)
  engine/          bases, arithmetic, signed, ieee754, text, codepages  (+ test)
  exercises/       generatore deterministico di esercizi     (+ test)
  exam/            configurazione e correzione delle prove    (+ test)
src/
  components/      screens/ (pagine) e ui/ (guscio e componenti condivisi)
  hooks/           useAuth, useFocusMonitor, useCopy
  lib/             auth SSO, progressi e badge, sync, formattazioni, poster/pdf/download
  i18n/            dizionari IT/EN, note sui caratteri e cenni teorici (bilingui, appaiati)
functions/         Pages Functions: /api/profile, /api/exam/*, /api/teacher/*  (+ test su SQLite)
migrations/        0001–0004 (tabelle bc_* nel D1 condiviso `piattaforma`), SCHEMA.sql
```

Il codice in `shared/` è il **cuore didattico**: la stessa identica logica che
lo studente usa nella palestra è quella che lo corregge in verifica, così non
può esserci divergenza tra ciò che si impara e ciò che viene valutato.

## Sviluppo

```bash
npm install
npm run dev
```

Per lavorare anche sulle API (Pages Functions + D1), in un secondo terminale:

```bash
npm run pages:dev
```

Vite inoltra `/api` a `localhost:8788`.

### Verifiche di qualità

```bash
npm run build && npm test && npm run typecheck:functions
```

`npm test` copre il motore di conversione, l'aritmetica, le rappresentazioni con
segno, IEEE 754, le codifiche di testo, il generatore di esercizi, la correzione
delle verifiche e il rendering di tutte le schermate pubbliche. Le regole della
console (finestre, recupero per gli assenti, assegnazione personale, consegna
del server, interventi) girano sulle Functions vere contro un SQLite con lo
schema di produzione (`functions/_lib/testing/database.ts`, richiede Node ≥ 22.13);
la console stessa si prova scheda per scheda in `src/tests/console.test.tsx`.

## Deploy

Il push su `main` avvia la build su Cloudflare Pages (`dist/`). I binding sono
dichiarati in `wrangler.toml` (D1 `ccna1`, tabelle prefissate `bc_`).

**Prima del deploy della console nuova** va applicata la migrazione 0004
(sole aggiunte di colonne, compatibile col codice in produzione):

```bash
npx wrangler d1 execute piattaforma --remote --file=migrations/0004_bc_console.sql
```

Interventi del docente e prove usano anche le tabelle condivise `verifiche` e
`attempt_events` (app = 'bc'), già presenti nel database della piattaforma.

## Licenza

MIT — vedi [LICENSE](LICENSE).

---

<sub>Sviluppato con l'ausilio dell'intelligenza artificiale.</sub>
