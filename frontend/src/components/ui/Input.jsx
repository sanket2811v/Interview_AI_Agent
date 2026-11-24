import React, { forwardRef } from 'react';

export const Input = forwardRef(function Input(
  {
    label,
    helperText,
    error,
    iconLeft: IconLeft,
    iconRight: IconRight,
    className = '',
    id,
    type = 'text',
    ...props
  },
  ref
) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          {label}
        </label>
      )}

      <div className="relative rounded-xl shadow-sm">
        {IconLeft && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
            <IconLeft className="h-4 w-4" />
          </div>
        )}

        <input
          id={inputId}
          ref={ref}
          type={type}
          className={`block w-full rounded-xl border bg-white dark:bg-[#0B1020] text-slate-900 dark:text-slate-100 placeholder-slate-400 text-sm py-2.5 transition-colors focus:outline-none focus:ring-2 ${
            IconLeft ? 'pl-10' : 'pl-3.5'
          } ${IconRight ? 'pr-10' : 'pr-3.5'} ${
            error
              ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20'
              : 'border-slate-200 dark:border-[#27324A] focus:border-violet-500 focus:ring-violet-500/20'
          } ${className}`}
          {...props}
        />

        {IconRight && (
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400">
            <IconRight className="h-4 w-4" />
          </div>
        )}
      </div>

      {error ? (
        <p className="text-xs text-rose-500 mt-1">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{helperText}</p>
      ) : null}
    </div>
  );
});

export const Textarea = forwardRef(function Textarea(
  { label, helperText, error, className = '', id, rows = 4, ...props },
  ref
) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          {label}
        </label>
      )}

      <textarea
        id={inputId}
        ref={ref}
        rows={rows}
        className={`block w-full rounded-xl border bg-white dark:bg-[#0B1020] text-slate-900 dark:text-slate-100 placeholder-slate-400 text-sm p-3 transition-colors focus:outline-none focus:ring-2 resize-y ${
          error
            ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20'
            : 'border-slate-200 dark:border-[#27324A] focus:border-violet-500 focus:ring-violet-500/20'
        } ${className}`}
        {...props}
      />

      {error ? (
        <p className="text-xs text-rose-500 mt-1">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{helperText}</p>
      ) : null}
    </div>
  );
});

export default Input;

