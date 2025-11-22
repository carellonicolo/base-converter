import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      icon: Icon,
      iconPosition = 'left',
      fullWidth = false,
      className = '',
      ...props
    },
    ref
  ) => {
    const baseStyles = 'liquid-input text-white placeholder-slate-400';
    const widthStyles = fullWidth ? 'w-full' : '';
    const errorStyles = error ? 'border-red-500/50 focus:border-red-500' : '';
    const iconPaddingStyles = Icon
      ? iconPosition === 'left'
        ? 'pl-11'
        : 'pr-11'
      : '';

    const inputClasses = `${baseStyles} ${widthStyles} ${errorStyles} ${iconPaddingStyles} ${className}`;

    return (
      <div className={fullWidth ? 'w-full' : ''}>
        {label && (
          <label className="block text-sm font-semibold text-slate-200 mb-3 tracking-wide">
            {label}
          </label>
        )}

        <div className="relative">
          {Icon && iconPosition === 'left' && (
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
              <Icon className="w-5 h-5 text-slate-400" />
            </div>
          )}

          <input ref={ref} className={inputClasses} {...props} />

          {Icon && iconPosition === 'right' && (
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
              <Icon className="w-5 h-5 text-slate-400" />
            </div>
          )}
        </div>

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

Input.displayName = 'Input';

export default Input;
