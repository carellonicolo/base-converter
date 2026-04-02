# Base Converter Pro

> Suite completa di conversione: basi numeriche, encoding, hash, colori, timestamp e molto altro

[![Licenza MIT](https://img.shields.io/badge/Licenza-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=white)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5-646cff?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06b6d4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![PWA](https://img.shields.io/badge/PWA-Installabile-5a0fc8?logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![i18n](https://img.shields.io/badge/i18n-IT%20%7C%20EN-yellow)](https://www.i18next.com/)
[![GitHub stars](https://img.shields.io/github/stars/carellonicolo/base-converter?style=social)](https://github.com/carellonicolo/base-converter)
[![GitHub issues](https://img.shields.io/github/issues/carellonicolo/base-converter)](https://github.com/carellonicolo/base-converter/issues)

## Panoramica

Base Converter Pro e una suite di conversione multi-funzionale che riunisce oltre 11 strumenti in un'unica applicazione web. Dalla conversione tra basi numeriche (da base 2 a base 36) all'encoding Base64, dalla generazione di hash alla manipolazione di colori, timestamp, URL e JWT — tutto accessibile da un'interfaccia moderna, veloce e installabile come PWA.

L'applicazione e disponibile in italiano e inglese, funziona completamente offline dopo la prima installazione ed e pensata per sviluppatori, studenti di informatica e chiunque lavori quotidianamente con conversioni di dati.

## Funzionalita Principali

- **Conversione basi numeriche** — Supporto completo da base 2 a base 36 con visualizzazione binaria, ottale, decimale, esadecimale
- **Base64 Encoder/Decoder** — Codifica e decodifica di testo e file
- **ASCII/Unicode** — Tabella completa con ricerca e conversione
- **Generatore Hash** — MD5, SHA-1, SHA-256, SHA-512 e altri algoritmi
- **Color Converter** — Conversione tra HEX, RGB, HSL, CMYK con color picker visuale
- **Timestamp Converter** — Conversione Unix timestamp, ISO 8601 e formati personalizzati
- **URL Encoder/Decoder** — Encoding e decoding di URL
- **JWT Decoder** — Decodifica e ispezione di JSON Web Token
- **JSON Formatter** — Formattazione e validazione JSON
- **QR Code Generator** — Generazione di codici QR da testo
- **Multilingua** — Interfaccia disponibile in italiano e inglese
- **PWA** — Installabile e funzionante offline
- **Dark mode** — Tema chiaro e scuro

## Tech Stack

| Tecnologia | Utilizzo |
|:--|:--|
| ![React](https://img.shields.io/badge/React_18-61dafb?logo=react&logoColor=white) | Framework UI |
| ![TypeScript](https://img.shields.io/badge/TypeScript_5-3178c6?logo=typescript&logoColor=white) | Linguaggio tipizzato |
| ![Vite](https://img.shields.io/badge/Vite_5-646cff?logo=vite&logoColor=white) | Build tool |
| ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06b6d4?logo=tailwindcss&logoColor=white) | Styling |
| ![Zustand](https://img.shields.io/badge/Zustand-433e38) | State management |
| ![i18next](https://img.shields.io/badge/i18next-26a69a) | Internazionalizzazione |
| ![PWA](https://img.shields.io/badge/PWA-5a0fc8) | Offline e installabilita |

## Requisiti

- **Node.js** >= 18
- **npm** >= 9 (oppure bun)

## Installazione

```bash
git clone https://github.com/carellonicolo/base-converter.git
cd base-converter
npm install
npm run dev
```

L'applicazione sara disponibile su `http://localhost:8080`.

## Utilizzo

1. Seleziona lo strumento desiderato dal menu laterale
2. Inserisci i dati nel campo di input
3. I risultati vengono calcolati in tempo reale
4. Utilizza i pulsanti di copia per trasferire i risultati negli appunti

## Struttura del Progetto

```
base-converter/
├── src/
│   ├── components/     # Componenti React per ogni convertitore
│   ├── store/          # Store Zustand
│   ├── lib/            # Logica di conversione
│   ├── i18n/           # File di traduzione IT/EN
│   ├── pages/          # Pagine dell'applicazione
│   └── hooks/          # Custom hooks
├── public/             # Asset statici e manifest PWA
├── index.html          # Entry point HTML
└── vite.config.ts      # Configurazione Vite + PWA
```

## Deploy

```bash
npm run build
```

La cartella `dist/` e deployabile su Cloudflare Pages, Netlify, Vercel o qualsiasi hosting statico.

## Contribuire

I contributi sono benvenuti! Consulta le [linee guida per contribuire](CONTRIBUTING.md) per maggiori dettagli.

## Licenza

Distribuito con licenza MIT. Vedi il file [LICENSE](LICENSE) per i dettagli completi.

## Autore

**Nicolo Carello**
- GitHub: [@carellonicolo](https://github.com/carellonicolo)
- Website: [nicolocarello.it](https://nicolocarello.it)

---

<sub>Sviluppato con l'ausilio dell'intelligenza artificiale.</sub>

## Progetti Correlati

Questo progetto fa parte di una collezione di strumenti didattici e applicazioni open-source:

| Progetto | Descrizione |
|:--|:--|
| [DFA Visual Editor](https://github.com/carellonicolo/AFS) | Editor visuale per automi DFA |
| [Turing Machine](https://github.com/carellonicolo/Turing-Machine) | Simulatore di Macchina di Turing |
| [Scheduler](https://github.com/carellonicolo/Scheduler) | Simulatore di scheduling CPU |
| [Subnet Calculator](https://github.com/carellonicolo/Subnet) | Calcolatore subnet IPv4/IPv6 |
| [Gioco del Lotto](https://github.com/carellonicolo/giocodellotto) | Simulatore Lotto e SuperEnalotto |
| [MicroASM](https://github.com/carellonicolo/microasm) | Simulatore assembly |
| [Flow Charts](https://github.com/carellonicolo/flow-charts) | Editor di diagrammi di flusso |
| [Cypher](https://github.com/carellonicolo/cypher) | Toolkit di crittografia |
| [Snake](https://github.com/carellonicolo/snake) | Snake game retro |
| [Pong](https://github.com/carellonicolo/pongcarello) | Pong game |
| [Calculator](https://github.com/carellonicolo/calculator-carello) | Calcolatrice scientifica |
| [IPSC Score](https://github.com/carellonicolo/IPSC) | Calcolatore punteggi IPSC |
| [Quiz](https://github.com/carellonicolo/quiz) | Piattaforma quiz scolastici |
| [Carello Hub](https://github.com/carellonicolo/carello-hub) | Dashboard educativa |
| [Prof Carello](https://github.com/carellonicolo/prof-carello) | Gestionale lezioni private |
| [DOCSITE](https://github.com/carellonicolo/DOCSITE) | Piattaforma documentale |
