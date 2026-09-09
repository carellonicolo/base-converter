import { lazy, Suspense, useState } from 'react';
import { BookOpen } from 'lucide-react';
import { useI18n } from '../../i18n';
import type { TheoryKey } from '../../i18n/theory';

// Il testo storico (e i suoi due dizionari) arriva solo al primo clic.
const TheoryContent = lazy(() => import('./TheoryContent'));

/**
 * Il pulsante «Teoria» con la sua modale: un solo componente da collocare,
 * perché lo stato aperto/chiuso non interessa a chi lo ospita.
 */
export function TheoryButton({ topic }: { topic: TheoryKey }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className="btn btn-ghost btn-sm theory-btn"
        type="button"
        onClick={() => setOpen(true)}
        title={t(topic === 'ascii' ? 'text.theoryAscii' : 'text.theoryUnicode')}
      >
        <BookOpen size={15} aria-hidden />
        {t('text.theoryButton')}
      </button>
      {open && (
        <Suspense fallback={null}>
          <TheoryContent topic={topic} onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  );
}
