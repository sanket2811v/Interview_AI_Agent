import React from 'react';
import { Loader2 } from 'lucide-react';

export function LoadingState({ message = 'Loading content...', className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center p-12 text-center ${className}`}>
      <div className="p-3 rounded-2xl bg-violet-500/10 text-violet-500 mb-3 border border-violet-500/20">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
        {message}
      </p>
    </div>
  );
}

export default LoadingState;

