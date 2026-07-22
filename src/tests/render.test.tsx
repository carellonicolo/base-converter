// @vitest-environment jsdom
/**
 * Smoke test di rendering: monta ogni schermata pubblica e verifica che non
 * lanci. Serve a intercettare errori a runtime (hook usati male, proprietà
 * indefinite, componenti mancanti) che la sola build NON rileva — importante
 * perché ogni push su main va in produzione automaticamente.
 */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';

import { I18nProvider } from '../i18n';
import { ToastProvider } from '../components/ui/Toast';
import { ConfirmProvider } from '../components/ui/Confirm';
import { AuthProvider } from '../hooks/useAuth';

import { HomePage } from '../components/screens/HomePage';
import { ConverterPage } from '../components/screens/ConverterPage';
import { ArithmeticPage } from '../components/screens/ArithmeticPage';
import { SignedPage } from '../components/screens/SignedPage';
import { IeeePage } from '../components/screens/IeeePage';
import { TextPage } from '../components/screens/TextPage';
import { GymPage } from '../components/screens/GymPage';

beforeAll(() => {
  // Nessuna sessione SSO nei test: /api/profile risponde 401 come in modalità libera.
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify({ authenticated: false }), { status: 401 }))
  );
  // matchMedia non esiste in jsdom ma serve al bootstrap del tema.
  if (!window.matchMedia) {
    vi.stubGlobal('matchMedia', () => ({
      matches: false,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
  }
  // jsdom dichiara navigator.language = 'en-US' e qui localStorage non è
  // disponibile (origine opaca): l'app ricadrebbe sull'inglese. Fissiamo
  // l'italiano così le asserzioni sono deterministiche.
  Object.defineProperty(window.navigator, 'language', { value: 'it-IT', configurable: true });
});

afterEach(() => cleanup());

function Providers({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter>
      <I18nProvider>
        <ToastProvider>
          <ConfirmProvider>
            <AuthProvider>{children}</AuthProvider>
          </ConfirmProvider>
        </ToastProvider>
      </I18nProvider>
    </MemoryRouter>
  );
}

const PAGES: [string, () => JSX.Element][] = [
  ['HomePage', HomePage],
  ['ConverterPage', ConverterPage],
  ['ArithmeticPage', ArithmeticPage],
  ['SignedPage', SignedPage],
  ['IeeePage', IeeePage],
  ['TextPage', TextPage],
  ['GymPage', GymPage],
];

describe('rendering delle schermate pubbliche', () => {
  for (const [name, Page] of PAGES) {
    it(`${name} si monta senza errori`, () => {
      expect(() =>
        render(
          <Providers>
            <Page />
          </Providers>
        )
      ).not.toThrow();
    });
  }
});

describe('Convertitore — comportamento', () => {
  it('mostra le conversioni del valore iniziale 156', () => {
    render(
      <Providers>
        <ConverterPage />
      </Providers>
    );
    // 156 decimale, raggruppato a nibble di default → "1001 1100"
    expect(screen.getAllByText(/1001 1100/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/234/).length).toBeGreaterThan(0); // ottale
  });

  it('aggiorna le altre basi quando cambia l’input', () => {
    render(
      <Providers>
        <ConverterPage />
      </Providers>
    );
    const input = screen.getByLabelText(/Numero da convertire/i);
    fireEvent.change(input, { target: { value: '255' } });
    expect(screen.getAllByText(/1111 1111/).length).toBeGreaterThan(0);
  });

  it('segnala una cifra non valida per la base', () => {
    render(
      <Providers>
        <ConverterPage />
      </Providers>
    );
    const input = screen.getByLabelText(/Numero da convertire/i);
    fireEvent.change(input, { target: { value: '9' } });
    // base di partenza 10 → "9" è valido; passiamo a una cifra impossibile
    fireEvent.change(input, { target: { value: 'Z' } });
    expect(screen.getByText(/non esiste in base/i)).toBeTruthy();
  });
});

describe('Palestra — comportamento', () => {
  it('mostra un esercizio e accetta una risposta', () => {
    render(
      <Providers>
        <GymPage />
      </Providers>
    );
    const input = screen.getByLabelText(/La tua risposta/i);
    fireEvent.change(input, { target: { value: 'qualcosa' } });
    const check = screen.getByRole('button', { name: /Verifica/i });
    fireEvent.click(check);
    // Dopo la verifica compare il pulsante per il prossimo esercizio.
    expect(screen.getByRole('button', { name: /Prossimo esercizio/i })).toBeTruthy();
  });
});

describe('cambio lingua', () => {
  it('passa a inglese e ritorna in italiano', () => {
    render(
      <Providers>
        <HomePage />
      </Providers>
    );
    fireEvent.click(screen.getByRole('button', { name: 'EN' }));
    expect(screen.getByText(/Number bases and encodings/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'IT' }));
    expect(screen.getByText(/Basi numeriche e codifiche/i)).toBeTruthy();
  });
});
