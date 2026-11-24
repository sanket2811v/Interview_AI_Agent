import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HelpCircle, Home, LayoutDashboard } from 'lucide-react';
import { Button } from '../components/ui/Button.jsx';

export function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <div className="h-16 w-16 rounded-2xl bg-violet-500/10 text-violet-500 flex items-center justify-center mb-6 border border-violet-500/20 shadow-lg shadow-violet-500/10">
        <HelpCircle className="h-8 w-8" />
      </div>

      <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
        404
      </h1>
      <h2 className="text-lg sm:text-xl font-bold text-slate-700 dark:text-slate-200 mt-2">
        Page Not Found
      </h2>
      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md">
        The interview preparation resource or page you are looking for does not exist or has been moved.
      </p>

      <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
        <Button
          variant="outline"
          size="md"
          iconLeft={Home}
          onClick={() => navigate('/')}
        >
          Landing Page
        </Button>
        <Button
          variant="primary"
          size="md"
          iconLeft={LayoutDashboard}
          onClick={() => navigate('/dashboard')}
        >
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}

export default NotFound;

