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
    sm: 'p-1.5 w-3.5 h-3.5',
    md: 'p-2.5 w-4 h-4',
    lg: 'p-3 w-5 h-5',
  };

  return (
    <button
      onClick={handleCopy}
      className={`glass-morphism rounded-xl transition-all duration-300 hover:scale-110 hover:bg-white/10 ${className}`}
      title={copied ? 'Copiato!' : 'Copia'}
      aria-label={copied ? 'Copiato' : 'Copia negli appunti'}
    >
      {copied || copyStatus === 'copied' ? (
        <Check className={`${sizeStyles[size]} text-green-400`} />
      ) : (
        <Copy className={`${sizeStyles[size]} text-slate-300 hover:text-white transition-colors`} />
      )}
    </button>
  );
};

export default CopyButton;
