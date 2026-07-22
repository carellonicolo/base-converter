import { useState, type ReactNode } from 'react';
import { ChevronDown, GraduationCap, Lightbulb, TriangleAlert } from 'lucide-react';

type Tone = 'info' | 'tip' | 'warn';

interface Props {
  title: string;
  children: ReactNode;
  tone?: Tone;
  /** Se true parte già chiuso. */
  collapsedByDefault?: boolean;
}

const ICONS = {
  info: GraduationCap,
  tip: Lightbulb,
  warn: TriangleAlert,
};

/**
 * Riquadro didattico contestuale, richiudibile. Usato accanto agli strumenti
 * per spiegare "come funziona" senza rubare spazio.
 */
export function InfoBox({ title, children, tone = 'info', collapsedByDefault = false }: Props) {
  const [collapsed, setCollapsed] = useState(collapsedByDefault);
  const Icon = ICONS[tone];
  return (
    <div className={`infobox ${tone}${collapsed ? ' collapsed' : ''}`}>
      <div
        className="infobox-head"
        onClick={() => setCollapsed((c) => !c)}
        role="button"
        tabIndex={0}
        aria-expanded={!collapsed}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setCollapsed((c) => !c);
          }
        }}
      >
        <Icon size={18} aria-hidden />
        <span>{title}</span>
        <ChevronDown className="chev" size={18} aria-hidden />
      </div>
      {!collapsed && <div className="infobox-body">{children}</div>}
    </div>
  );
}
