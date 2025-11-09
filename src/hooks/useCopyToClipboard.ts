import { useState, useCallback } from 'react';

type CopyStatus = 'inactive' | 'copied' | 'error';

function useCopyToClipboard(): [CopyStatus, (text: string) => Promise<void>] {
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('inactive');

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('inactive'), 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
      setCopyStatus('error');
      setTimeout(() => setCopyStatus('inactive'), 2000);
    }
  }, []);

  return [copyStatus, copy];
}

export default useCopyToClipboard;
