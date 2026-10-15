import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Tiene la pagina a schermo intero finché `active` è vero (la verifica), e
 * conta le uscite. Stesso comportamento di VLSM.
 *
 * All'attivazione lo chiede da sé: arriva subito dopo il clic su «Inizia»,
 * quindi il browser lo concede. Dopo un ricaricamento, o se lo studente esce
 * con Esc, il browser non lo concede più senza un nuovo gesto: `isFullscreen`
 * torna falso e la pagina mostra il pulsante che chiama `enter`. Alla fine
 * della verifica esce da sé.
 *
 * `supported` è falso dove l'API non c'è (Safari su iPhone): lì non si chiede
 * niente, non si mostra niente e non si conta niente.
 */
export function useFullscreen(active: boolean, onExit: () => void) {
  const supported = typeof document !== 'undefined' && !!document.fullscreenEnabled;
  const [isFullscreen, setIsFullscreen] = useState(() => typeof document !== 'undefined' && !!document.fullscreenElement);
  const activeRef = useRef(active);
  activeRef.current = active;
  const onExitRef = useRef(onExit);
  onExitRef.current = onExit;

  useEffect(() => {
    const onChange = () => {
      const now = !!document.fullscreenElement;
      setIsFullscreen(now);
      if (!now && activeRef.current) onExitRef.current();
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const enter = useCallback(() => {
    if (!supported || document.fullscreenElement) return;
    // Rifiutata senza un gesto dell'utente: resta il pulsante.
    document.documentElement.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
  }, [supported]);

  useEffect(() => {
    if (!active) return;
    enter();
    return () => {
      // Prima si spegne il conteggio: l'uscita alla consegna non è una distrazione.
      activeRef.current = false;
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, [active, enter]);

  return { supported, isFullscreen, enter };
}
