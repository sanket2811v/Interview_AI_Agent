import React from 'react';

const SIZES = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-xl'
};

const STATUS_SIZES = {
  xs: 'h-1.5 w-1.5',
  sm: 'h-2 w-2',
  md: 'h-2.5 w-2.5',
  lg: 'h-3 w-3',
  xl: 'h-3.5 w-3.5'
};

const STATUS_COLORS = {
  online: 'bg-emerald-500',
  busy: 'bg-rose-500',
  away: 'bg-amber-500',
  offline: 'bg-slate-400'
};

export function Avatar({
  src,
  alt = 'User avatar',
  initials = 'JD',
  size = 'md',
  status,
  className = '',
  gradient = 'from-violet-600 to-indigo-500'
}) {
  const sizeClass = SIZES[size] || SIZES.md;
  const statusSize = STATUS_SIZES[size] || STATUS_SIZES.md;
  const statusColor = status ? STATUS_COLORS[status] || STATUS_COLORS.online : null;

  return (
    <div className={`relative inline-flex shrink-0 select-none ${className}`}>
      {src ? (
        <img
          src={src}
          alt={alt}
          className={`${sizeClass} rounded-full object-cover ring-2 ring-white dark:ring-[#151C2E]`}
        />
      ) : (
        <div
          className={`${sizeClass} rounded-full bg-gradient-to-tr ${gradient} text-white font-bold flex items-center justify-center shadow-sm shadow-violet-500/20 ring-2 ring-white dark:ring-[#151C2E]`}
          aria-label={alt}
        >
          {initials}
        </div>
      )}

      {status && (
        <span
          className={`absolute bottom-0 right-0 rounded-full ring-2 ring-white dark:ring-[#151C2E] ${statusSize} ${statusColor}`}
          aria-label={`Status: ${status}`}
        />
      )}
    </div>
  );
}

export default Avatar;

