import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, Sun, Moon, ArrowRight } from 'lucide-react';
import { useTheme } from '../context/ThemeContext.jsx';
import { Button } from '../components/ui/Button.jsx';

export function MainLayout({ children }) {
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0B1020] text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Public Header */}
      <header className="border-b border-slate-200 dark:border-[#27324A] bg-white/80 dark:bg-[#0B1020]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-violet-500/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
                InterviewAI
              </span>
              <span className="text-[10px] text-violet-600 dark:text-violet-400 font-semibold tracking-wider uppercase hidden sm:inline">
                AI Coach
              </span>
            </div>
          </Link>

          {/* Nav links */}
          <nav className="hidden md:flex items-center space-x-8 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300">
            <a href="#features" className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
              How It Works
            </a>
            <a href="#categories" className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
              Interview Categories
            </a>
            <Link to="/dashboard" className="text-violet-600 dark:text-violet-400 hover:underline">
              Dashboard Demo
            </Link>
          </nav>

          {/* Right Action */}
          <div className="flex items-center space-x-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-600" />}
            </button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/dashboard')}
              iconRight={ArrowRight}
            >
              <span className="hidden sm:inline">Launch </span>Dashboard
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-[#27324A] bg-white dark:bg-[#070B16] py-12 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <div className="h-7 w-7 rounded-lg bg-violet-600 text-white flex items-center justify-center">
                <Sparkles className="h-4 w-4" />
              </div>
              <span className="font-bold text-slate-900 dark:text-white text-sm">
                InterviewAI
              </span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
              Production-grade AI-powered platform for targeted mock interviews, real-time evaluation, and behavioral coaching.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Product</h4>
            <ul className="space-y-2">
              <li><Link to="/preparations/new" className="hover:text-violet-500">JD Analysis</Link></li>
              <li><Link to="/mock-interviews" className="hover:text-violet-500">Live Mock Interviews</Link></li>
              <li><Link to="/coding" className="hover:text-violet-500">Coding Arena</Link></li>
              <li><Link to="/system-design" className="hover:text-violet-500">System Design</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Practice Tracks</h4>
            <ul className="space-y-2">
              <li><Link to="/practice/technical" className="hover:text-violet-500">Technical Questions</Link></li>
              <li><Link to="/practice/hr" className="hover:text-violet-500">HR & Behavioral</Link></li>
              <li><Link to="/improvement-plan" className="hover:text-violet-500">Improvement Plan</Link></li>
              <li><Link to="/reports" className="hover:text-violet-500">Evaluation Reports</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Platform Architecture</h4>
            <p className="text-slate-500 dark:text-slate-400 mb-2">
              Built on React 18, Vite, Express 5, Prisma ORM 6.19.3, and PostgreSQL.
            </p>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              Single-Port Production Ready
            </span>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-100 dark:border-slate-800/80 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 InterviewAI. All rights reserved.</p>
          <div className="flex items-center space-x-6">
            <Link to="/dashboard" className="hover:text-slate-900 dark:hover:text-white">Dashboard</Link>
            <Link to="/settings" className="hover:text-slate-900 dark:hover:text-white">Settings</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default MainLayout;
