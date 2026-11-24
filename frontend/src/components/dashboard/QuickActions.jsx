import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/Card.jsx';
import { PlusCircle, Video, Terminal, FileBarChart2 } from 'lucide-react';

export function QuickActions() {
  const navigate = useNavigate();

  const actions = [
    {
      title: 'Create Preparation',
      desc: 'Paste a Job Description to generate tailored questions & analysis',
      icon: PlusCircle,
      path: '/preparations/new',
      gradient: 'from-violet-600 to-indigo-600'
    },
    {
      title: 'Start Mock Interview',
      desc: 'Simulate a live AI interview with voice and real-time evaluation',
      icon: Video,
      path: '/mock-interviews',
      gradient: 'from-blue-600 to-cyan-600'
    },
    {
      title: 'Coding Arena',
      desc: 'Solve data structures, algorithms and frontend coding challenges',
      icon: Terminal,
      path: '/coding',
      gradient: 'from-emerald-600 to-teal-600'
    },
    {
      title: 'Review Reports',
      desc: 'Check detailed AI evaluation scores, transcripts and feedback',
      icon: FileBarChart2,
      path: '/reports',
      gradient: 'from-amber-600 to-orange-600'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {actions.map((act) => {
        const Icon = act.icon;
        return (
          <div
            key={act.title}
            onClick={() => navigate(act.path)}
            className="group relative overflow-hidden rounded-2xl border border-slate-200 dark:border-[#27324A] bg-white dark:bg-[#151C2E] p-5 shadow-sm hover:shadow-lg dark:hover:shadow-violet-500/5 hover:border-violet-500/50 transition-all duration-200 cursor-pointer"
          >
            <div className={`h-10 w-10 rounded-xl bg-gradient-to-tr ${act.gradient} text-white flex items-center justify-center mb-3 shadow-md`}>
              <Icon className="h-5 w-5" />
            </div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-violet-500 dark:group-hover:text-violet-400 transition-colors">
              {act.title}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              {act.desc}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export default QuickActions;

