import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card.jsx';

export function PerformanceChart({ data = [] }) {
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-xl bg-slate-900 border border-slate-700/80 p-3 shadow-xl text-xs space-y-1">
          <p className="font-semibold text-white">{label}</p>
          <p className="text-violet-400 font-medium">
            Score: <span className="text-white font-bold">{payload[0].value}/100</span>
          </p>
          {payload[1] && (
            <p className="text-blue-400">
              Target: <span className="text-white">{payload[1].value}/100</span>
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Performance Analytics</CardTitle>
            <CardDescription>
              Interview readiness score progression across recent mock sessions
            </CardDescription>
          </div>
          <span className="hidden sm:inline-block px-2.5 py-1 text-xs font-semibold rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
            Target: 80%
          </span>
        </div>
      </CardHeader>

      <CardContent className="flex-1 min-h-[260px] w-full min-w-0 pt-4">
        <div className="h-64 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#7C3AED" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
              <XAxis
                dataKey="date"
                stroke="#64748B"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#64748B"
                fontSize={11}
                domain={[40, 100]}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="score"
                stroke="#8B5CF6"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#scoreGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export default PerformanceChart;

