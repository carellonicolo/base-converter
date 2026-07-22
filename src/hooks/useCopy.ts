import { useCallback, useState } from 'react';

/** Copia negli appunti con fallback e feedback "copiato" temporaneo. */
export function useCopy(resetMs = 1400) {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = useCallback(
    async (text: string, key = text) => {
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
        } else {
          const ta = document.createElement('textarea');
          ta.value = text;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
        }
        setCopied(key);
        setTimeout(() => setCopied((c) => (c === key ? null : c)), resetMs);
        return true;
      } catch {
        return false;
      }
    },
    [resetMs]
  );

  return { copy, copied };
}
