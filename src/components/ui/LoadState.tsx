import { RefreshCw } from 'lucide-react';

type Tfn = (k: string, v?: Record<string, string | number>) => string;

interface Props {
  t: Tfn;
  /** Messaggio d'errore del server, oppure null se si sta ancora caricando. */
  error: string | null;
  onRetry: () => void;
}

/**
 * Attesa di un blocco che dipende dal server: "Caricamento…" oppure l'errore
 * con il pulsante Riprova.
 *
 * ⚠️ Un fallimento DEVE restare visibile. Le due varianti di questo errore si
 * erano già viste entrambe: la console docente restava su "Caricamento…" per
 * sempre (sembrava morta), e la dashboard dello studente mostrava "Nessuna
 * verifica svolta" — una frase tranquilla e falsa, che fa credere di aver perso
 * il compito appena consegnato. Meglio dire cosa è andato storto.
 */
export function LoadState({ t, error, onRetry }: Props) {
  if (!error) return <p>{t('common.loading')}</p>;
  return (
    <div className="feedback ko" style={{ display: 'block' }}>
      <strong>{t('errors.loadFailed')}</strong>
      <p className="mono" style={{ margin: '0.5rem 0 0.75rem', fontSize: '0.85rem', wordBreak: 'break-word' }}>{error}</p>
      <button className="btn btn-sm btn-secondary" type="button" onClick={onRetry}>
        <RefreshCw size={14} /> {t('errors.retry')}
      </button>
    </div>
  );
}
