import type { ReactNode } from 'react';
import { AUTH_ORIGIN } from '../../lib/auth';
import { Footer } from './Footer';
import { LangToggle } from './LangToggle';

interface Props {
  children: ReactNode;
  /** Riga opzionale (es. breadcrumb / "torna indietro") sotto l'header. */
  back?: ReactNode;
}

/**
 * Guscio dell'app: top bar unificata Carello (web component, vedi
 * public/carello-shell.js) + contenuto + footer. Tema e launcher sono gestiti
 * dalla shell; l'avatar apre Profilo / Dashboard / Logout SSO.
 */
export function AppShell({ children, back }: Props) {
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
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '0 0 0.75rem' }}>
        <LangToggle />
      </div>
      {back}
      {children}
      <Footer />
    </div>
  );
}
