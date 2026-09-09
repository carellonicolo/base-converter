import { Fragment } from 'react';
import { BookOpen } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { useI18n } from '../../i18n';
import { theory, type TheoryKey } from '../../i18n/theory';

/**
 * Rende il minimo di formattazione ammesso nei testi di `theory.ts`:
 * i backtick diventano <code>, i doppi asterischi <strong>.
 *
 * Serve a tenere il contenuto come stringhe traducibili invece che come JSX:
 * un traduttore può spostare un `U+0041` dentro la frase senza toccare codice.
 */
function Rich({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
          return <code key={i}>{part.slice(1, -1)}</code>;
        }
        if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}

export default function TheoryContent({ topic, onClose }: { topic: TheoryKey; onClose: () => void }) {
  const { lang } = useI18n();
  const doc = theory(topic, lang);

  return (
    <Modal
      onClose={onClose}
      className="theory-modal"
      title={
        <span className="theory-head">
          <BookOpen size={18} aria-hidden /> {doc.title}
        </span>
      }
    >
      <p className="theory-lead">{doc.lead}</p>

      {doc.sections.map((s) => (
        <section className="theory-section" key={s.heading}>
          <h3>{s.heading}</h3>
          {s.paragraphs.map((p, i) => (
            <p key={i}>
              <Rich text={p} />
            </p>
          ))}
        </section>
      ))}

      <div className="theory-timeline">
        <h3>{doc.timelineTitle}</h3>
        <div className="theory-events">
          {doc.timeline.map((e) => (
            <Fragment key={e.year + e.label}>
              <span className="theory-year">{e.year}</span>
              <span className="theory-event">{e.label}</span>
            </Fragment>
          ))}
        </div>
      </div>
    </Modal>
  );
}
