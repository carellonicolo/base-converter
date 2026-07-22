import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { BackgroundDecor } from './components/ui/BackgroundDecor';
import { I18nProvider } from './i18n';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BackgroundDecor />
      <I18nProvider>
        <App />
      </I18nProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

// PWA: registra il service worker solo in produzione (in dev disturberebbe la
// cache/HMR). Il SW non tocca mai /api (vedi public/sw.js).
//
// ⚠️ MIGRAZIONE DALLA VECCHIA PWA: la versione precedente di questa app usava
// vite-plugin-pwa/Workbox, il cui service worker resta registrato sul dominio e
// CONTROLLA il primo caricamento dopo il deploy, servendo asset vecchi (tipico
// sintomo: la pagina appare senza CSS). Il nuovo SW fa skipWaiting +
// clients.claim, quindi prende il controllo subito: quando succede ricarichiamo
// UNA volta, così l'utente vede immediatamente la versione nuova e coerente.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    // Se non c'era alcun controller siamo alla prima installazione: nessun
    // ricaricamento (non c'è niente di stantio da sostituire).
    const hadOldController = !!navigator.serviceWorker.controller;
    let reloaded = false;

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadOldController || reloaded) return;
      reloaded = true;
      window.location.reload();
    });

    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => reg.update())
      .catch(() => {
        /* registrazione non disponibile: l'app funziona comunque */
      });
  });
}
