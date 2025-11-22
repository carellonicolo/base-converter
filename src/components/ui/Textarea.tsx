import React from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      helperText,
      fullWidth = false,
      className = '',
      ...props
    },
    ref
  ) => {
    const baseStyles = 'liquid-input text-white placeholder-slate-400 resize-none';
    const widthStyles = fullWidth ? 'w-full' : '';
    const errorStyles = error ? 'border-red-500/50 focus:border-red-500' : '';

    const textareaClasses = `${baseStyles} ${widthStyles} ${errorStyles} ${className}`;

    return (
      <div className={fullWidth ? 'w-full' : ''}>
        {label && (
          <label className="block text-sm font-semibold text-slate-200 mb-3 tracking-wide">
            {label}
          </label>
        )}

        <textarea ref={ref} className={textareaClasses} {...props} />

        {error && (
          <p className="mt-2 text-sm text-red-400">{error}</p>
        )}

        {helperText && !error && (
          <p className="mt-2 text-xs text-slate-400">{helperText}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export default Textarea;
