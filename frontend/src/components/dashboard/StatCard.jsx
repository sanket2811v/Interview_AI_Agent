import React from 'react';
import { Card } from '../ui/Card.jsx';
import { TrendingUp, TrendingDown } from 'lucide-react';

export function StatCard({
  title,
  value,
  change,
  trend = 'up',
  icon: Icon,
  subtitle,
  iconBg = 'bg-violet-500/10 text-violet-500'
}) {
  return (
    <Card className="p-5 sm:p-6 transition-all hover:border-violet-500/40">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {title}
          </p>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {value}
            </span>
          </div>
        </div>

        {Icon && (
          <div className={`p-2.5 rounded-xl ${iconBg} shrink-0`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>

      {(change || subtitle) && (
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#27324A]/60 flex items-center justify-between text-xs">
          {change && (
            <span
              className={`inline-flex items-center font-semibold ${
                trend === 'up'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {trend === 'up' ? (
                <TrendingUp className="h-3.5 w-3.5 mr-1" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5 mr-1" />
              )}
              {change}
            </span>
          )}
          {subtitle && (
            <span className="text-slate-400 truncate ml-2">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </Card>
  );
}

export default StatCard;

