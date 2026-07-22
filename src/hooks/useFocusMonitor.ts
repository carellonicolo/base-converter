import { useEffect, useRef } from 'react';

export interface FocusEvent {
  startedAt: string;
  durataMs: number;
}

/**
 * Traccia quando lo studente lascia la pagina durante la verifica (cambio tab,
 * minimize, passaggio ad altra app). Quando torna, chiama `onEvent` con inizio
 * e durata.
 *
 * Porting fedele dell'implementazione VLSM: usa sia `visibilitychange` (tab e
 * minimize) sia `blur`/`focus` (cambio applicazione). Lo stato "lontano" è
 * l'unione dei due segnali: uno qualsiasi lo accende, servono entrambi spenti
 * per chiuderlo. I blur sotto i 250 ms sono ignorati (popup di sistema).
 */
export function useFocusMonitor(active: boolean, onEvent: (e: FocusEvent) => void) {
  const stateRef = useRef<{
    awayStart: number | null;
    visibilityHidden: boolean;
    windowBlurred: boolean;
  }>({ awayStart: null, visibilityHidden: false, windowBlurred: false });
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!active) return;

    const startAway = () => {
      const s = stateRef.current;
      if (s.awayStart === null) s.awayStart = Date.now();
    };

    const endAwayIfBoth = () => {
      const s = stateRef.current;
      if (!s.visibilityHidden && !s.windowBlurred && s.awayStart !== null) {
        const startedAt = s.awayStart;
        const durataMs = Date.now() - startedAt;
        s.awayStart = null;
        if (durataMs >= 250) {
          onEventRef.current({ startedAt: new Date(startedAt).toISOString(), durataMs });
        }
      }
    };

    const onVisibility = () => {
      stateRef.current.visibilityHidden = document.hidden;
      if (document.hidden) startAway();
      else endAwayIfBoth();
    };
    const onBlur = () => {
      stateRef.current.windowBlurred = true;
      startAway();
    };
    const onFocus = () => {
      stateRef.current.windowBlurred = false;
      endAwayIfBoth();
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);

    stateRef.current.visibilityHidden = document.hidden;
    if (document.hidden) startAway();

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
    };
  }, [active]);
}
