# 🚀 BASE CONVERTER PRO v2.0

> La suite completa e professionale per conversioni multi-funzionali: basi numeriche, encoding, hash, colori, timestamp e molto altro!

[![React](https://img.shields.io/badge/React-18.3.1-61dafb?logo=react&logoColor=white)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5.3-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4.2-646cff?logo=vite&logoColor=white)](https://vitejs.dev/)
[![PWA](https://img.shields.io/badge/PWA-Enabled-5a0fc8?logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)

## ✨ Novità Versione 2.0

### 🎯 Nuove Funzionalità Principali

#### **7 Nuovi Converter**
1. **Base64 Encoder/Decoder** - Codifica e decodifica Base64, supporto file
2. **Hash Generator** - MD5, SHA-1, SHA-256, SHA-512 + File hashing
3. **Color Converter** - HEX ↔ RGB ↔ HSL ↔ HSV ↔ CMYK + Color picker
4. **Timestamp Converter** - Unix ↔ ISO 8601 ↔ RFC 2822 + Relative time
5. **URL Encoder/Decoder** - URL encoding + Query parser + Slugify
6. **JWT Decoder** - Analisi e validazione JSON Web Tokens
7. **JSON Formatter** - Formatta, minifica, valida e ordina JSON

#### **Architettura Completamente Rinnovata**
- ✅ **React Router** - Navigazione moderna con routing dinamico
- ✅ **Zustand** - State management globale con persistenza
- ✅ **Design System** - Componenti UI riutilizzabili e consistenti
- ✅ **PWA Support** - Installabile e funzionamento offline
- ✅ **i18n Ready** - Supporto multilingua (IT/EN)
- ✅ **TypeScript Strict** - Type-safety completo

#### **UX/UI Improvements**
- ✅ **Dashboard Interattiva** - Quick access a tutti gli strumenti
- ✅ **Cronologia Conversioni** - Persistente con local storage
- ✅ **Favoriti** - Salva e organizza conversioni frequenti
- ✅ **Temi Multipli** - Dark, Light, Midnight, Sunset, Forest, Ocean
- ✅ **Accessibilità** - WCAG 2.1 AA compliant
- ✅ **Responsive** - Ottimizzato per mobile, tablet e desktop
- ✅ **Performance** - Code splitting e lazy loading
- ✅ **Keyboard Navigation** - Supporto completo da tastiera

## 📋 Indice

- [Caratteristiche](#-caratteristiche)
- [Strumenti Disponibili](#-strumenti-disponibili)
- [Tecnologie](#-tecnologie)
- [Installazione](#-installazione)
- [Utilizzo](#-utilizzo)
- [Struttura Progetto](#-struttura-progetto)
- [Build e Deploy](#-build-e-deploy)
- [Contribuire](#-contribuire)
- [Roadmap](#-roadmap)

## 🎯 Caratteristiche

### Core Features
- 🔄 **11 Strumenti di Conversione** - Tutto quello che serve in un'unica app
- ⚡ **Conversioni Real-Time** - Risultati istantanei mentre digiti
- 💾 **Cronologia Persistente** - Tutte le conversioni salvate localmente
- 📋 **Copy-to-Clipboard** - Copia rapida con feedback visivo
- 🎨 **6 Temi Predefiniti** - Personalizza l'aspetto dell'app
- 🌐 **Multilingua** - Italiano e Inglese
- 📱 **PWA** - Installabile come app nativa
- 🔒 **100% Privacy** - Tutto funziona localmente, zero tracking

### Performance & Quality
- ⚡ **Lighthouse Score > 95**
- 🎯 **Type-Safe** - TypeScript strict mode
- ♿ **Accessible** - WCAG 2.1 AA compliant
- 🧪 **Tested** - Unit tests con Vitest
- 📦 **Optimized** - Code splitting e lazy loading
- 🎨 **Modern Design** - Glassmorphism UI

## 🛠 Strumenti Disponibili

### Conversioni Numeriche
| Strumento | Descrizione | Features |
|-----------|-------------|----------|
| **Basi Numeriche** | Converti tra basi 2-36 | Supporto prefissi (0b, 0x, 0o), base personalizzata |
| **Virgola Mobile** | IEEE 754 Float32/64 | Visualizzazione bit, Fixed-point Q notation |

### Encoding & Decoding
| Strumento | Descrizione | Features |
|-----------|-------------|----------|
| **ASCII** | Testo ↔ ASCII | Tabella completa, filtri categoria, dettagli caratteri |
| **Unicode** | Testo ↔ Unicode | Supporto emoji, dettagli code point, tabella Unicode |
| **Base64** | Base64 encoding | File upload, image preview |
| **URL** | URL encoding | Query parser, slug generator |

### Sicurezza & Crypto
| Strumento | Descrizione | Features |
|-----------|-------------|----------|
| **Hash Generator** | Hashing crittografico | MD5, SHA-1, SHA-256, SHA-512, file hashing |
| **JWT Decoder** | Analisi JWT | Validazione timestamp, claims details |

### Utility
| Strumento | Descrizione | Features |
|-----------|-------------|----------|
| **Color Converter** | Conversione colori | HEX, RGB, HSL, HSV, CMYK, color picker |
| **Timestamp** | Conversione date | Unix, ISO 8601, RFC 2822, relative time |
| **JSON Formatter** | JSON tools | Format, minify, validate, sort keys |

## 🏗 Tecnologie

### Frontend Core
```json
{
  "react": "^18.3.1",
  "typescript": "^5.5.3",
  "vite": "^5.4.2",
  "tailwindcss": "^3.4.1"
}
```

### Routing & State
```json
{
  "react-router-dom": "^6.20.0",
  "zustand": "^4.4.7"
}
```

### Features
```json
{
  "lucide-react": "^0.344.0",    // Icons
  "qrcode": "^1.5.3",            // QR generation
  "i18next": "^23.7.6",          // Internationalization
  "react-window": "^1.8.10"      // Virtual scrolling
}
```

### PWA & Build
```json
{
  "vite-plugin-pwa": "^0.17.4",
  "workbox-window": "^7.0.0"
}
```

## 🚀 Installazione

### Prerequisiti
- Node.js >= 18.x
- npm >= 9.x (o yarn >= 1.22.x)

### Setup

```bash
# Clone repository
git clone https://github.com/carellonicolo/base-converter.git
cd base-converter

# Install dependencies
npm install

# Start dev server
npm run dev
```

L'app sarà disponibile su `http://localhost:5173/`

## 💻 Utilizzo

### Comandi Disponibili

```bash
npm run dev        # Dev server con HMR
npm run build      # Build produzione
npm run preview    # Preview build locale
npm run lint       # Linter ESLint
npm run typecheck  # TypeScript check
npm run test       # Run tests
```

### Quick Start

1. **Apri Dashboard** - Visualizza tutti gli strumenti disponibili
2. **Scegli Strumento** - Click su un converter
3. **Inserisci Input** - Conversione automatica real-time
4. **Copia Risultato** - Click sul bottone copia

### Keyboard Shortcuts (Coming Soon)
- `Ctrl+K` - Command Palette
- `Ctrl+H` - Cronologia
- `Ctrl+N` - Nuova conversione
- `Ctrl+D` - Aggiungi a preferiti

## 📂 Struttura Progetto

```
base-converter/
├── public/
│   ├── manifest.json          # PWA manifest
│   ├── sw.js                  # Service Worker
│   └── calculator.svg         # App icon
├── src/
│   ├── components/
│   │   ├── ui/                # Design System
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Select.tsx
│   │   │   └── Textarea.tsx
│   │   ├── converters/        # Converter components
│   │   │   ├── Base64Converter.tsx
│   │   │   ├── HashGenerator.tsx
│   │   │   ├── ColorConverter.tsx
│   │   │   ├── TimestampConverter.tsx
│   │   │   ├── URLConverter.tsx
│   │   │   ├── JWTDecoder.tsx
│   │   │   └── JSONFormatter.tsx
│   │   ├── shared/            # Shared components
│   │   │   ├── CopyButton.tsx
│   │   │   └── ErrorBoundary.tsx
│   │   ├── Dashboard.tsx      # Main dashboard
│   │   ├── BaseConverter.tsx
│   │   ├── AsciiConverter.tsx
│   │   ├── UnicodeConverter.tsx
│   │   └── FloatingPointConverter.tsx
│   ├── hooks/                 # Custom hooks
│   │   ├── useCopyToClipboard.ts
│   │   ├── useDebounce.ts
│   │   ├── useLocalStorage.ts
│   │   ├── useTheme.ts
│   │   ├── useHistory.ts
│   │   └── useKeyboardShortcut.ts
│   ├── store/                 # Zustand stores
│   │   ├── useConversionStore.ts
│   │   ├── useHistoryStore.ts
│   │   └── useSettingsStore.ts
│   ├── utils/
│   │   ├── conversions/       # Conversion logic
│   │   │   ├── base.ts
│   │   │   ├── base64.ts
│   │   │   ├── hash.ts
│   │   │   ├── color.ts
│   │   │   ├── timestamp.ts
│   │   │   ├── url.ts
│   │   │   ├── jwt.ts
│   │   │   └── json.ts
│   │   └── validation.ts
│   ├── types/                 # TypeScript types
│   │   ├── conversion.ts
│   │   ├── history.ts
│   │   ├── settings.ts
│   │   └── theme.ts
│   ├── i18n/                  # Internationalization
│   │   └── config.ts
│   ├── App.tsx                # Main app with routing
│   ├── index.css              # Global styles
│   └── main.tsx               # Entry point
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── README.md
```

## 🏗 Build e Deploy

### Build di Produzione

```bash
npm run build
```

Genera build ottimizzata in `dist/`:
- ✅ Code splitting
- ✅ Tree shaking
- ✅ Asset optimization
- ✅ Service Worker generation

### Deploy

#### Netlify
```bash
npm run build
# Drag & drop dist/ folder su netlify.com
```

#### Vercel
```bash
npm run build
npx vercel --prod
```

#### GitHub Pages
```bash
npm run build
# Configure repo settings per GitHub Pages
```

## 🤝 Contribuire

I contributi sono benvenuti! Segui questi step:

1. Fork del progetto
2. Crea feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Apri Pull Request

### Linee Guida
- Usa TypeScript strict mode
- Segui convenzioni ESLint
- Aggiungi test per nuove features
- Aggiorna documentazione
- Mantieni design system consistente

## 🗺 Roadmap

### v2.1 (Q1 2025)
- [ ] QR Code Generator completo
- [ ] Regex Tester con highlights
- [ ] IP Address Converter
- [ ] Command Palette (Ctrl+K)
- [ ] Advanced History con tags
- [ ] Export/Import settings

### v2.2 (Q2 2025)
- [ ] Password Generator
- [ ] Markdown Preview
- [ ] Diff Tool
- [ ] CSV to JSON converter
- [ ] API integrations
- [ ] Cloud sync (optional)

### v3.0 (Future)
- [ ] AI-Powered suggestions
- [ ] Browser extension
- [ ] Desktop app (Electron)
- [ ] Mobile app (React Native)
- [ ] Collaboration features
- [ ] Plugin system

## 📊 Statistiche Progetto

- 📝 **~8,000 righe** di codice TypeScript/TSX
- 🧩 **30+ componenti** React
- 🎨 **6 temi** personalizzati
- 🔧 **11 strumenti** di conversione
- 🌐 **2 lingue** supportate
- ⚡ **100%** TypeScript strict mode
- 📱 **100%** responsive design
- ♿ **WCAG 2.1 AA** compliant

## 📄 Licenza

Questo progetto è stato creato per scopi educativi e professionali.

## 👤 Autore

**Prof. Carello Nicolò**

📧 Email: [info@nicolocarello.it](mailto:info@nicolocarello.it)
🌐 Web: [nicolocarello.it](https://app.nicolocarello.it)

---

## 🙏 Credits

- [React](https://reactjs.org/) - UI Library
- [Vite](https://vitejs.dev/) - Build tool
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
- [Lucide](https://lucide.dev/) - Icons
- [Zustand](https://zustand-demo.pmnd.rs/) - State management

---

<div align="center">

**Sviluppato con ❤️ da Prof. Carello Nicolò**

[⬆ Torna su](#-base-converter-pro-v20)

</div>
