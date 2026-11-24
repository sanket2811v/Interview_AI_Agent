import React, { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  X,
  Sparkles,
  LayoutDashboard,
  Briefcase,
  Code2,
  Users2,
  Terminal,
  Network,
  Video,
  FileBarChart2,
  TrendingUp,
  History,
  Settings,
  BarChart3,
  Target,
  ListTodo,
  CheckCircle2
} from 'lucide-react';
import { useSidebar } from '../../context/SidebarContext.jsx';

const MOBILE_NAV_GROUPS = [
  {
    group: 'MAIN',
    items: [
      { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { name: 'My Preparations', path: '/preparations', icon: Briefcase }
    ]
  },
  {
    group: 'PRACTICE',
    items: [
      { name: 'Technical Practice', path: '/practice/technical', icon: Code2 },
      { name: 'HR Practice', path: '/practice/hr', icon: Users2 },
      { name: 'Coding Arena', path: '/coding', icon: Terminal },
      { name: 'System Design', path: '/system-design', icon: Network }
    ]
  },
  {
    group: 'INTERVIEWS',
    items: [
      { name: 'Mock Interviews', path: '/mock-interviews', icon: Video, badge: 'AI Live' },
      { name: 'Interview Reports', path: '/reports', icon: FileBarChart2 }
    ]
  },
  {
    group: 'ANALYTICS & PROGRESS',
    items: [
      { name: 'Analytics', path: '/analytics', icon: BarChart3 },
      { name: 'Skill Gaps', path: '/analytics/skill-gaps', icon: Target },
      { name: 'Improvement Plan', path: '/improvement-plan', icon: TrendingUp },
      { name: 'Learning Tasks', path: '/learning-tasks', icon: ListTodo },
      { name: 'Progress', path: '/progress', icon: CheckCircle2 },
      { name: 'History', path: '/history', icon: History }
    ]
  },
  {
    group: 'PREFERENCES',
    items: [
      { name: 'Settings', path: '/settings', icon: Settings }
    ]
  }
];

export function MobileNavigation() {
  const { isMobileOpen, closeMobile } = useSidebar();
  const location = useLocation();

  // Handle body scroll locking and Escape key dismiss
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') closeMobile();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [isMobileOpen, closeMobile]);

  if (!isMobileOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
        onClick={closeMobile}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-white dark:bg-[#0B1020] border-r border-slate-200 dark:border-[#27324A] shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200"
        role="dialog"
        aria-label="Mobile Navigation"
      >
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-200 dark:border-[#27324A] shrink-0">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center text-white shadow-md">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="font-bold text-base text-slate-900 dark:text-white">
              InterviewAI
            </span>
          </div>
          <button
            onClick={closeMobile}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 overscroll-contain">
          {MOBILE_NAV_GROUPS.map((group) => (
            <div key={group.group} className="space-y-1">
              <h4 className="px-3 text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase mb-2">
                {group.group}
              </h4>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path ||
                  (item.path !== '/dashboard' && location.pathname.startsWith(item.path));

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={closeMobile}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-violet-600 text-white font-semibold shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </div>
                    {item.badge && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                        isActive ? 'bg-white/20 text-white' : 'bg-violet-500/10 text-violet-500'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default MobileNavigation;

