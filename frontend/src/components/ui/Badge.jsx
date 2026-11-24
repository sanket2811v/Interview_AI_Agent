import React from 'react';

const VARIANTS = {
  primary: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20',
  secondary: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
  success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
  danger: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
  info: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20',
  outline: 'bg-transparent text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
};

const SIZES = {
  sm: 'text-[11px] px-2 py-0.5 rounded-full',
  md: 'text-xs px-2.5 py-1 rounded-full'
};

export function Badge({
  children,
  variant = 'primary',
  size = 'md',
  dot = false,
  className = ''
}) {
  return (
    <span
      className={`inline-flex items-center font-medium gap-1.5 select-none ${VARIANTS[variant] || VARIANTS.primary} ${SIZES[size] || SIZES.md} ${className}`}
    >
      {dot && (
        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      )}
      {children}
    </span>
  );
}

export default Badge;

