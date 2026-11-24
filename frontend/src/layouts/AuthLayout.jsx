import React from 'react';
import { Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export function AuthLayout({ children, title, subtitle }) {
  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-slate-50 dark:bg-[#0B1020] text-slate-900 dark:text-slate-100 transition-colors">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center space-x-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-violet-500/20">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            InterviewAI
          </span>
        </Link>
        {title && (
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {title}
          </h2>
        )}
        {subtitle && (
          <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {subtitle}
          </p>
        )}
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-3 sm:px-0">
        <div className="bg-white dark:bg-[#151C2E] py-6 sm:py-8 px-4 sm:px-10 shadow-xl rounded-2xl border border-slate-200 dark:border-[#27324A]">
          {children}
        </div>
      </div>
    </div>
  );
}

export default AuthLayout;

