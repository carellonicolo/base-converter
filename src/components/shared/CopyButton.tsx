import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import useCopyToClipboard from '../../hooks/useCopyToClipboard';

interface CopyButtonProps {
  text: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const CopyButton: React.FC<CopyButtonProps> = ({ text, className = '', size = 'md' }) => {
  const [copyStatus, copy] = useCopyToClipboard();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await copy(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sizeStyles = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <button
      onClick={handleCopy}
      className={`rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center ${sizeStyles[size]} ${className}`}
      title={copied ? 'Copiato!' : 'Copia negli appunti'}
      aria-label={copied ? 'Copiato' : 'Copia negli appunti'}
    >
      {copied || copyStatus === 'copied' ? (
        <Check className={`${iconSizes[size]} text-green-400`} />
      ) : (
        <Copy className={`${iconSizes[size]} text-slate-300 group-hover:text-white transition-colors`} />
      )}
    </button>
  );
};

export default CopyButton;
