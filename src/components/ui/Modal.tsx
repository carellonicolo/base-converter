import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { useI18n } from '../../i18n';

interface Props {
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  /** `sm` per i dialoghi brevi (una scelta, una conferma); default largo. */
  size?: 'sm' | 'md';
  /** Classi extra sul pannello, per i casi che vogliono un'impaginazione propria. */
  className?: string;
}

/**
 * Guscio delle finestre di dialogo con intestazione.
 *
 * Le classi sono quelle già in uso nel foglio di stile (`.modal-backdrop`,
 * `.modal-head`, `.modal-body`): questo componente non introduce un aspetto
 * nuovo, raccoglie quello esistente e ci aggiunge le due cose che mancavano
 * ovunque — chiusura con Esc e fuoco che torna a chi ha aperto la modale.
 */
export function Modal({ title, onClose, children, size = 'md', className }: Props) {
  const { t } = useI18n();
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  // `onClose` arriva quasi sempre come funzione anonima, quindi cambia a ogni
  // render: tenerla in un ref evita che l'effetto si riesegua e rubi il fuoco.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, []);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        ref={panelRef}
        className={`modal${size === 'sm' ? ' modal-sm' : ''}${className ? ` ${className}` : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2 id={titleId}>{title}</h2>
          <button className="icon-btn" type="button" onClick={onClose} aria-label={t('common.close')}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
