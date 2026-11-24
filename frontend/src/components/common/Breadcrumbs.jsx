import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const ROUTE_LABELS = {
  dashboard: 'Dashboard',
  preparations: 'My Preparations',
  new: 'Create Preparation',
  analysis: 'Job Analysis',
  practice: 'Practice',
  technical: 'Technical Questions',
  hr: 'HR & Behavioral',
  coding: 'Coding Arena',
  'system-design': 'System Design',
  'mock-interviews': 'Mock Interviews',
  reports: 'Reports',
  'improvement-plan': 'Improvement Plan',
  history: 'History',
  profile: 'Profile',
  settings: 'Settings'
};

export function Breadcrumbs({ items }) {
  const location = useLocation();

  let breadcrumbs = items;
  if (!breadcrumbs) {
    const paths = location.pathname.split('/').filter(Boolean);
    breadcrumbs = paths.map((path, idx) => {
      const url = `/${paths.slice(0, idx + 1).join('/')}`;
      return {
        label: ROUTE_LABELS[path] || path,
        to: idx === paths.length - 1 ? null : url
      };
    });
  }

  if (breadcrumbs.length === 0) return null;

  return (
    <nav className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400 mb-2">
      <Link
        to="/dashboard"
        className="flex items-center hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
      >
        <Home className="h-3.5 w-3.5 mr-1" />
        <span className="hidden sm:inline">Home</span>
      </Link>

      {breadcrumbs.map((crumb, idx) => (
        <React.Fragment key={idx}>
          <ChevronRight className="h-3 w-3 text-slate-400 dark:text-slate-600 shrink-0" />
          {crumb.to ? (
            <Link
              to={crumb.to}
              className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors truncate max-w-[150px]"
            >
              {crumb.label}
            </Link>
          ) : (
            <span className="text-slate-800 dark:text-slate-200 font-medium truncate max-w-[200px]">
              {crumb.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

export default Breadcrumbs;

