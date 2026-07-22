import { Check, Copy } from 'lucide-react';
import { useCopy } from '../../hooks/useCopy';

interface Props {
  value: string;
  size?: number;
  label?: string;
  className?: string;
}

/** Piccolo pulsante "copia" con feedback ✓. */
export function CopyButton({ value, size = 16, label = 'Copia', className }: Props) {
  const { copy, copied } = useCopy();
  const done = copied === value;
  return (
    <button
      type="button"
      className={`copy-btn${className ? ` ${className}` : ''}`}
      onClick={() => copy(value)}
      aria-label={label}
      title={label}
    >
      {done ? <Check size={size} color="var(--success)" /> : <Copy size={size} />}
    </button>
  );
}
