// @vitest-environment jsdom
/**
 * La navbar strumenti sostituisce il "torna alla home": switch diretto tra le
 * modalità. Qui si verifica che le voci ci siano, che l'attiva rifletta la
 * rotta corrente, che il guscio la nasconda durante una verifica (nav=false),
 * e che il toggle lingua — ora dentro l'header — cambi davvero lingua.
 */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';

import { I18nProvider } from '../i18n';
import { ToolNav } from '../components/ui/ToolNav';
import { AppShell } from '../components/ui/AppShell';

beforeAll(() => {
  if (!window.matchMedia) {
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }));
  }
  Object.defineProperty(window.navigator, 'language', { value: 'it-IT', configurable: true });
});

afterEach(() => cleanup());

function atRoute(path: string, node: ReactNode) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <I18nProvider>{node}</I18nProvider>
    </MemoryRouter>
  );
}

describe('navbar strumenti', () => {
  it('mostra i sette strumenti con le rotte giuste', () => {
    atRoute('/', <ToolNav />);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(7);
    expect(screen.getByRole('link', { name: /Convertitore/ }).getAttribute('href')).toBe('/convertitore');
    expect(screen.getByRole('link', { name: /Palestra/ }).getAttribute('href')).toBe('/palestra');
    expect(screen.getByRole('link', { name: /Verifica/ }).getAttribute('href')).toBe('/verifica');
  });

  it('evidenzia la voce corrispondente alla rotta corrente', () => {
    atRoute('/segno', <ToolNav />);
    expect(screen.getByRole('link', { name: /Segno/ }).className).toContain('active');
    expect(screen.getByRole('link', { name: /Convertitore/ }).className).not.toContain('active');
  });

  it('il guscio nasconde la navbar quando nav=false (verifica in corso)', () => {
    atRoute('/verifica', <AppShell nav={false}><div>prova</div></AppShell>);
    expect(screen.queryByLabelText('Strumenti')).toBeNull();
  });

  it('il guscio mostra la navbar per impostazione predefinita', () => {
    atRoute('/', <AppShell><div>contenuto</div></AppShell>);
    expect(screen.getByLabelText('Strumenti')).toBeTruthy();
  });

  it('il toggle lingua nell’header cambia lingua', () => {
    atRoute('/', <AppShell><div>contenuto</div></AppShell>);
    const conv = () => screen.getByRole('link', { name: /Convert/ });
    expect(conv().textContent).toContain('Convertitore'); // IT
    fireEvent.click(screen.getByRole('button', { name: 'EN' }));
    expect(conv().textContent).toContain('Converter'); // EN
  });
});
