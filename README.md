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
| **Testo e codifiche** | Tabella ASCII completa, esploratore Unicode per blocchi, codifica UTF-8/16/32 byte per byte, Base64 con la scomposizione 3 byte → 24 bit → 4 sestetti, URL-encoding. |
| **Palestra** | Esercizi generati automaticamente su tutti i moduli, tre livelli, XP e livelli, serie (streak), statistiche per argomento, 16 traguardi da sbloccare e **modalità tutor** che corregge un passaggio alla volta. |
| **Verifiche** | Prova ufficiale con timer, correzione automatica lato server, voto in decimi e revisione domanda per domanda. |
| **Console docente** | Configurazione per classe (moduli, difficoltà, durata, numero domande, soglia di sufficienza), risultati con export CSV e vista «in diretta» delle prove in corso. |

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

## Struttura

```
shared/            logica condivisa frontend + backend (la stessa che corregge le verifiche)
  engine/          bases, arithmetic, signed, ieee754, text  (+ test)
  exercises/       generatore deterministico di esercizi     (+ test)
  exam/            configurazione e correzione delle prove    (+ test)
src/
  components/      screens/ (pagine) e ui/ (guscio e componenti condivisi)
  hooks/           useAuth, useFocusMonitor, useCopy
  lib/             auth SSO, progressi e badge, sync, formattazioni
  i18n/            dizionari IT/EN
functions/         Pages Functions: /api/profile, /api/exam/*, /api/teacher/*
migrations/        0001_bc_init.sql (tabelle bc_* nel D1 condiviso `ccna1`)
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
delle verifiche e il rendering di tutte le schermate pubbliche.

## Deploy

Il push su `main` avvia la build su Cloudflare Pages (`dist/`). I binding sono
dichiarati in `wrangler.toml` (D1 `ccna1`, tabelle prefissate `bc_`).

Alla **prima messa in produzione** va applicata una volta la migrazione:

```bash
npx wrangler d1 execute ccna1 --remote --file=migrations/0001_bc_init.sql
```

## Licenza

MIT — vedi [LICENSE](LICENSE).

---

<sub>Sviluppato con l'ausilio dell'intelligenza artificiale.</sub>
