// @vitest-environment jsdom
/**
 * Un errore del server non deve mai travestirsi da risposta normale.
 *
 * Queste due schermate hanno già sbagliato in entrambi i modi possibili: la
 * console docente restava su "Caricamento…" all'infinito quando le tabelle
 * `bc_*` non erano ancora migrate, e la dashboard dello studente scriveva
 * "Nessuna verifica svolta" — una frase tranquilla e falsa, che fa credere di
 * aver perso il compito appena consegnato. Qui si verifica che a fronte di un
 * 500 compaia l'errore, e soprattutto che NON compaia la rassicurazione.
 */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';

import { I18nProvider } from '../i18n';
import { ToastProvider } from '../components/ui/Toast';
import { ConfirmProvider } from '../components/ui/Confirm';
import { AuthProvider } from '../hooks/useAuth';
import { DashboardPage } from '../components/screens/DashboardPage';
import { AdminPage } from '../components/screens/AdminPage';

const TEACHER = {
  id: 'u1',
  email: 'prof@example.it',
  name: 'Prof',
  status: 'active',
  isTeacher: true,
  isSuperAdmin: false,
  classes: [],
};

/** Sessione valida, ma ogni chiamata ai dati fallisce con 500 come faceva D1. */
function stubFetch(user: Record<string, unknown>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/profile')) {
        return new Response(JSON.stringify({ user }), { status: 200 });
      }
      return new Response(JSON.stringify({ error: 'D1_ERROR: no such table: bc_attempts' }), { status: 500 });
    })
  );
}

beforeAll(() => {
  if (!window.matchMedia) {
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }));
  }
  // Come in render.test.tsx: jsdom dichiara en-US e qui non c'è localStorage.
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

describe('errori del server visibili', () => {
  it('la dashboard segnala il guasto invece di dire "Nessuna verifica svolta"', async () => {
    stubFetch({ ...TEACHER, isTeacher: false, classes: ['3A'] });
    render(
      <Providers>
        <DashboardPage />
      </Providers>
    );

    await waitFor(() => expect(screen.getByText(/Non è stato possibile caricare i dati/i)).toBeTruthy());
    expect(screen.getByText(/no such table: bc_attempts/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Riprova/i })).toBeTruthy();
    // La bugia rassicurante non deve esserci.
    expect(screen.queryByText(/Nessuna verifica svolta/i)).toBeNull();
  });

  it('la console docente segnala il guasto invece di restare su "Caricamento"', async () => {
    stubFetch(TEACHER);
    render(
      <Providers>
        <AdminPage />
      </Providers>
    );

    await waitFor(() => expect(screen.getByText(/Non è stato possibile caricare i dati/i)).toBeTruthy());
    expect(screen.getByRole('button', { name: /Riprova/i })).toBeTruthy();
    expect(screen.queryByText(/^Caricamento…$/)).toBeNull();
  });
});
