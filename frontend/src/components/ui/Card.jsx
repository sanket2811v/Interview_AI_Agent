import React from 'react';

const VARIANTS = {
  default: 'bg-white dark:bg-[#151C2E] border border-slate-200 dark:border-[#27324A] text-slate-900 dark:text-slate-100',
  elevated: 'bg-white dark:bg-[#151C2E] border border-slate-200 dark:border-[#27324A] shadow-md dark:shadow-2xl text-slate-900 dark:text-slate-100',
  interactive: 'bg-white dark:bg-[#151C2E] border border-slate-200 dark:border-[#27324A] hover:border-violet-500/50 hover:shadow-lg dark:hover:shadow-violet-500/5 transition-all duration-200 cursor-pointer text-slate-900 dark:text-slate-100',
  glass: 'glass-panel text-slate-900 dark:text-slate-100'
};

export function Card({ children, variant = 'default', className = '', ...props }) {
  return (
    <div
      className={`rounded-2xl overflow-hidden ${VARIANTS[variant] || VARIANTS.default} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }) {
  return (
    <div className={`p-5 sm:p-6 pb-3 ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '' }) {
  return (
    <h3 className={`text-base sm:text-lg font-semibold tracking-tight text-slate-900 dark:text-white ${className}`}>
      {children}
    </h3>
  );
}

export function CardDescription({ children, className = '' }) {
  return (
    <p className={`text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed ${className}`}>
      {children}
    </p>
  );
}

export function CardContent({ children, className = '' }) {
  return (
    <div className={`p-5 sm:p-6 pt-0 ${className}`}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = '' }) {
  return (
    <div className={`p-5 sm:p-6 pt-3 border-t border-slate-100 dark:border-[#27324A]/60 flex items-center justify-between ${className}`}>
      {children}
    </div>
  );
}

export default Card;

