// @vitest-environment jsdom
/**
 * La console docente si monta e mostra il pool, l'anteprima con le soluzioni e
 * il dialogo di assegnazione — l'intero flusso richiesto, senza SSO reale.
 *
 * Complementa i test di logica (constraints, catalog) e la simulazione SQL
 * dell'auto-chiusura: qui si verifica che l'INTERFACCIA nuova non esploda al
 * montaggio e che i pezzi chiave compaiano davvero.
 */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';

import { I18nProvider } from '../i18n';
import { ToastProvider } from '../components/ui/Toast';
import { ConfirmProvider } from '../components/ui/Confirm';
import { AuthProvider } from '../hooks/useAuth';
import { AdminPage } from '../components/screens/AdminPage';
import { EXAMS } from '../../shared/exam/catalog';
import { configFromSpec, buildExam } from '../../shared/exam/config';

const TEACHER = {
  id: 'u1',
  email: 'prof@example.it',
  name: 'Prof',
  status: 'active',
  isTeacher: true,
  isSuperAdmin: false,
  classes: [],
};

/** Risponde come farebbero le Function nuove, con un docente autenticato. */
function stubFetch() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status });

      if (url.includes('/api/profile')) return json({ user: TEACHER });
      if (url.includes('/api/teacher/exams') && url.includes('id=')) {
        const id = new URL(url, 'http://x').searchParams.get('id')!;
        const spec = EXAMS.find((e) => e.id === id)!;
        const questions = buildExam(configFromSpec(spec), 7).map((ex, i) => ({
          index: i,
          module: ex.module,
          kind: ex.kind,
          params: ex.params,
          points: ex.points,
          answer: ex.answer,
        }));
        return json({ exam: spec, seed: 7, questions });
      }
      if (url.includes('/api/teacher/exams')) {
        return json({ exams: EXAMS });
      }
      if (url.includes('/api/teacher/classes')) return json({ classes: ['3A', '3B'], source: 'auth' });
      if (url.includes('/api/teacher/assignments')) return json({ assignments: [] });
      return json({});
    })
  );
}

beforeAll(() => {
  if (!window.matchMedia) {
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }));
  }
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

describe('console docente — nuovo modello a pool', () => {
  it('mostra i sette argomenti del catalogo', async () => {
    stubFetch();
    render(
      <Providers>
        <AdminPage />
      </Providers>
    );
    await waitFor(() => expect(screen.getByText('Binario')).toBeTruthy());
    for (const label of ['Binario', 'Esadecimale', 'Basi miste', 'Somme e sottrazioni', 'Virgola mobile', 'Numeri con segno', 'Complemento a due']) {
      expect(screen.getByText(label)).toBeTruthy();
    }
  });

  it('apre l’anteprima con le soluzioni', async () => {
    stubFetch();
    render(
      <Providers>
        <AdminPage />
      </Providers>
    );
    await waitFor(() => expect(screen.getAllByText(/Anteprima/).length).toBeGreaterThan(0));
    fireEvent.click(screen.getAllByRole('button', { name: /Anteprima/ })[0]);
    // La colonna "Soluzione" compare solo nell'anteprima riservata al docente.
    await waitFor(() => expect(screen.getByText('Soluzione')).toBeTruthy());
  });

  it('apre il dialogo di assegnazione con l’elenco delle classi', async () => {
    stubFetch();
    render(
      <Providers>
        <AdminPage />
      </Providers>
    );
    await waitFor(() => expect(screen.getAllByRole('button', { name: /^Assegna$/ }).length).toBeGreaterThan(0));
    fireEvent.click(screen.getAllByRole('button', { name: /^Assegna$/ })[0]);
    // Nel dialogo appare la select delle classi, popolata da /api/teacher/classes.
    const dialog = await screen.findByText(/Scegli la classe/);
    expect(dialog).toBeTruthy();
    await waitFor(() => expect(screen.getByRole('option', { name: '3A' })).toBeTruthy());
  });

  it('passa alla scheda Assegnazioni e mostra lo stato vuoto', async () => {
    stubFetch();
    render(
      <Providers>
        <AdminPage />
      </Providers>
    );
    await waitFor(() => expect(screen.getByText('Binario')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Assegnazioni' }));
    await waitFor(() => expect(screen.getByText(/Nessuna verifica assegnata/)).toBeTruthy());
  });
});
