import React from 'react';
import { Loader2 } from 'lucide-react';

const VARIANTS = {
  primary: 'bg-violet-600 hover:bg-violet-700 text-white shadow-sm hover:shadow-glow focus-visible:ring-violet-500 border border-violet-500/30',
  secondary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm focus-visible:ring-blue-500 border border-blue-500/30',
  outline: 'border border-slate-700 dark:border-slate-700/80 hover:bg-slate-800/50 text-slate-800 dark:text-slate-200 focus-visible:ring-slate-400',
  ghost: 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 focus-visible:ring-slate-400',
  danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm focus-visible:ring-rose-500 border border-rose-500/30'
};

const SIZES = {
  sm: 'text-xs px-2.5 py-1.5 rounded-md gap-1.5',
  md: 'text-sm px-4 py-2 rounded-lg gap-2',
  lg: 'text-base px-5 py-2.5 rounded-xl gap-2.5'
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  isLoading = false,
  disabled = false,
  iconLeft: IconLeft,
  iconRight: IconRight,
  className = '',
  type = 'button',
  onClick,
  ...props
}) {
  const isBusy = loading || isLoading;
  const baseClasses = 'inline-flex items-center justify-center font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer select-none';
  const variantClass = VARIANTS[variant] || VARIANTS.primary;
  const sizeClass = SIZES[size] || SIZES.md;

  return (
    <button
      type={type}
      disabled={disabled || isBusy}
      onClick={onClick}
      className={`${baseClasses} ${variantClass} ${sizeClass} ${className}`}
      {...props}
    >
      {isBusy ? (
        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
      ) : IconLeft ? (
        <IconLeft className="h-4 w-4 shrink-0" />
      ) : null}
      
      {children}

      {!isBusy && IconRight && (
        <IconRight className="h-4 w-4 shrink-0" />
      )}
    </button>
  );
}

export default Button;

