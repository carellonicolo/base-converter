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

describe('Tabella dei caratteri — comportamento', () => {
  function renderText() {
    return render(
      <Providers>
        <TextPage />
      </Providers>
    );
  }

  it('mostra 128 celle in ASCII e 256 con una code page estesa', () => {
    const { container } = renderText();
    expect(container.querySelectorAll('.ascii-cell')).toHaveLength(128);
    fireEvent.click(screen.getByText('CP437'));
    expect(container.querySelectorAll('.ascii-cell')).toHaveLength(256);
  });

  it('un byte esteso mostra il confronto tra le code page', () => {
    const { container } = renderText();
    fireEvent.click(screen.getByText('CP437'));
    fireEvent.click(container.querySelector('[data-code="224"]')!);
    expect(screen.getByText(/Lo stesso byte nelle altre code page/i)).toBeTruthy();
    // Lo stesso byte 224: «α» sul PC IBM, «à» negli altri due.
    expect(screen.getAllByText('Greek Small Letter Alpha').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Latin Small Letter A With Grave').length).toBe(2);
  });

  it('tornando ad ASCII la selezione rientra nei 128 caratteri', () => {
    const { container } = renderText();
    fireEvent.click(screen.getByText('CP437'));
    fireEvent.click(container.querySelector('[data-code="224"]')!);
    fireEvent.click(screen.getByText('ASCII'));
    // 224 non esiste in ASCII: si ripiega su 224 − 128 = 96.
    expect(container.querySelector('.ascii-cell.sel')?.getAttribute('data-code')).toBe('96');
  });

  it('la ricerca smorza i caratteri che non corrispondono', () => {
    const { container } = renderText();
    fireEvent.change(screen.getByLabelText(/Cerca carattere/i), { target: { value: 'line feed' } });
    expect(container.querySelectorAll('.ascii-cell.dim')).toHaveLength(127);
    expect(container.querySelector('.ascii-cell:not(.dim)')?.getAttribute('data-code')).toBe('10');
  });

  it('con un solo carattere cerca il carattere, non i nomi che lo contengono', () => {
    const { container } = renderText();
    const box = screen.getByLabelText(/Cerca carattere/i);
    // «a» da solo → «A» (65), «a» (97) e il byte 0x0A (10, LF): tre letture
    // legittime della stessa stringa. Con la ricerca sui nomi si
    // accenderebbero anche Space, Cancel, Backspace… e non servirebbe a nulla.
    fireEvent.change(box, { target: { value: 'a' } });
    const lit = [...container.querySelectorAll('.ascii-cell:not(.dim)')].map((c) => Number(c.getAttribute('data-code')));
    expect(lit.sort((x, y) => x - y)).toEqual([10, 65, 97]);
    // Con due caratteri torna a cercare anche nei nomi.
    fireEvent.change(box, { target: { value: 'escape' } });
    expect(container.querySelectorAll('.ascii-cell:not(.dim)').length).toBeGreaterThan(1);
  });

  it('trova un carattere esteso dal suo code point Unicode', () => {
    const { container } = renderText();
    fireEvent.click(screen.getByText('CP437'));
    fireEvent.change(screen.getByLabelText(/Cerca carattere/i), { target: { value: 'U+03B1' } });
    const lit = [...container.querySelectorAll('.ascii-cell:not(.dim)')].map((c) => c.getAttribute('data-code'));
    expect(lit).toEqual(['224']); // α sta al byte 224 in CP437
  });

  it('le frecce spostano la selezione nella griglia', () => {
    const { container } = renderText();
    const grid = container.querySelector('.ascii-grid')!;
    fireEvent.click(container.querySelector('[data-code="65"]')!);
    fireEvent.keyDown(grid, { key: 'ArrowDown' }); // +16
    expect(container.querySelector('.ascii-cell.sel')?.getAttribute('data-code')).toBe('81');
    fireEvent.keyDown(grid, { key: 'ArrowLeft' });
    expect(container.querySelector('.ascii-cell.sel')?.getAttribute('data-code')).toBe('80');
  });
});
