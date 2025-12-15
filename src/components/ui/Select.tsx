import React from 'react';

export interface SelectOption {
  value: string | number;
  label: string;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: string;
  options: SelectOption[];
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
  onChange?: (value: string) => void;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      options,
      error,
      helperText,
      fullWidth = false,
      className = '',
      onChange,
      value,
      ...props
    },
    ref
  ) => {
    const baseStyles = 'liquid-input text-white appearance-none cursor-pointer';
    const widthStyles = fullWidth ? 'w-full' : '';
    const errorStyles = error ? 'border-red-500/50 focus:border-red-500' : '';

    const selectClasses = `${baseStyles} ${widthStyles} ${errorStyles} ${className}`;

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (onChange) {
        onChange(e.target.value);
      }
    };

    return (
      <div className={fullWidth ? 'w-full' : ''}>
        {label && (
          <label className="block text-sm font-semibold text-slate-200 mb-3 tracking-wide">
            {label}
          </label>
        )}

        <select
          ref={ref}
          className={selectClasses}
          onChange={handleChange}
          value={value}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

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

Select.displayName = 'Select';

export default Select;
