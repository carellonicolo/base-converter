import type { ReactNode } from 'react';
import { AUTH_ORIGIN } from '../../lib/auth';
import { Footer } from './Footer';
import { LangToggle } from './LangToggle';
import { ToolNav } from './ToolNav';

interface Props {
  children: ReactNode;
  /**
   * Mostra la barra di navigazione tra gli strumenti (default true).
   * Va messa a false durante una verifica in corso, per non offrire una via
   * di fuga dalla prova.
   */
  nav?: boolean;
}

/**
 * Guscio dell'app: top bar unificata Carello (web component, vedi
 * public/carello-shell.js) + navbar strumenti + contenuto + footer.
 *
 * - Il toggle IT/EN vive DENTRO l'header, nello slot `app-actions` previsto
 *   dalla shell per i controlli specifici dell'app (nessuna modifica al web
 *   component condiviso).
 * - Non c'è più un pulsante "torna alla home": il nome dell'app nell'header
 *   è già un link alla home.
 */
export function AppShell({ children, nav = true }: Props) {
  return (
    <div className="shell">
      <carello-shell
        app-name="Base Converter"
        app-icon="Binary"
        accent="#e0662b"
        user="NC"
        data-hub-url="https://nicolocarello.it"
        data-auth-url={AUTH_ORIGIN}
        data-dash-url="/dashboard"
        data-dash-label="Dashboard"
        data-theme-key="bc_theme"
        data-console-url="/admin"
      >
        <span slot="app-actions" className="shell-lang">
          <LangToggle />
        </span>
      </carello-shell>
      {nav && <ToolNav />}
      {children}
      <Footer />
    </div>
  );
}
