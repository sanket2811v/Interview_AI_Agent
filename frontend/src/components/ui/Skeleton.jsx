import React from 'react';

export function Skeleton({ className = '', variant = 'text' }) {
  const variantClasses = {
    text: 'h-4 w-full rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-xl'
  };

  return (
    <div
      className={`animate-pulse bg-slate-200 dark:bg-slate-800 ${variantClasses[variant] || ''} ${className}`}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-2xl p-6 border border-slate-200 dark:border-[#27324A] bg-white dark:bg-[#151C2E] space-y-4">
      <div className="flex items-center space-x-3">
        <Skeleton variant="circular" className="h-10 w-10" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-12 w-full" variant="rectangular" />
    </div>
  );
}

export default Skeleton;

