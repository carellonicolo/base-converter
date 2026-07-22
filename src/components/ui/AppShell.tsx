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
      {/* Una sola riga sotto la shell: percorso a sinistra, lingua a destra.
          Prima la lingua stava su una banda separata e sembrava staccata. */}
      <div className="topbar-row">
        <div>{back}</div>
        <LangToggle />
      </div>
      {children}
      <Footer />
    </div>
  );
}
