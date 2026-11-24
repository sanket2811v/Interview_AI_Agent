import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card.jsx';
import { Badge } from '../ui/Badge.jsx';
import { Button } from '../ui/Button.jsx';
import { ArrowRight, Briefcase } from 'lucide-react';

export function RecentSessions({ preparations = [] }) {
  const navigate = useNavigate();

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Recent Preparation Sessions</CardTitle>
            <CardDescription>
              Your active job target workspaces and mock interview tracks
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/preparations')}
            iconRight={ArrowRight}
          >
            View All
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 divide-y divide-slate-100 dark:divide-[#27324A]/60 pt-0">
        {preparations.map((prep) => (
          <div
            key={prep.id}
            className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-[#151C2E]/60 -mx-6 px-6 transition-colors"
          >
            <div className="flex items-center space-x-3.5">
              <div className="h-10 w-10 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center shrink-0 border border-violet-500/20">
                <Briefcase className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {prep.role}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {prep.company} • Added on {prep.date}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4 self-end sm:self-center">
              <div className="text-right hidden md:block">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {prep.progress}% Readiness
                </span>
                <div className="w-24 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 mt-1 overflow-hidden">
                  <div
                    className="h-full bg-violet-600 rounded-full"
                    style={{ width: `${prep.progress}%` }}
                  />
                </div>
              </div>

              <Badge
                variant={prep.status === 'Completed' ? 'success' : 'primary'}
                size="sm"
              >
                {prep.status}
              </Badge>

              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/preparations/${prep.id}`)}
              >
                Open Workspace
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default RecentSessions;

