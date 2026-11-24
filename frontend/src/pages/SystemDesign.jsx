import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Network,
  Server,
  Database,
  Cpu,
  Layers,
  ArrowRight,
  Shield,
  Zap,
  CheckCircle2,
  Radio,
  Globe,
  HardDrive,
  Smartphone
} from 'lucide-react';
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { SYSTEM_DESIGN_PROBLEMS } from '../data/systemDesignProblems.js';

function getTopologyIcon(type) {
  switch (type) {
    case 'client':
      return Smartphone;
    case 'apiGateway':
      return Shield;
    case 'loadBalancer':
      return Layers;
    case 'cache':
      return Zap;
    case 'messageQueue':
      return Radio;
    case 'database':
      return Database;
    case 'cdn':
      return Globe;
    case 'storage':
      return HardDrive;
    default:
      return Cpu;
  }
}

export function SystemDesign() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('url-shortener');

  const currentProblem =
    SYSTEM_DESIGN_PROBLEMS.find((p) => p.id === activeTab) || SYSTEM_DESIGN_PROBLEMS[0];

  const handleLaunchWhiteboard = (problemId = activeTab) => {
    navigate(`/system-design/whiteboard?problem=${problemId}`);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <PageHeader
        title="System Design Architecture"
        subtitle="Practice distributed systems, high availability, database partitioning, and trade-off justification."
      />

      {/* Problem Selection Pills */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {SYSTEM_DESIGN_PROBLEMS.map((p) => (
          <button
            key={p.id}
            onClick={() => setActiveTab(p.id)}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              activeTab === p.id
                ? 'border-violet-600 bg-violet-500/10 shadow-sm ring-1 ring-violet-500/30'
                : 'border-slate-200 dark:border-[#27324A] bg-white dark:bg-[#151C2E] hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                {p.title}
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">{p.scale}</p>
            <span className="inline-block mt-2 text-[10px] font-semibold text-violet-600 dark:text-violet-400">
              {p.readWriteRatio}
            </span>
          </button>
        ))}
      </div>

      {/* System Design Blueprint Card */}
      <Card className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-[#27324A]/60 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="primary" size="sm">System Design Blueprint</Badge>
              <Badge variant="outline" size="sm">{currentProblem.readWriteRatio}</Badge>
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
              {currentProblem.title}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
              {currentProblem.description}
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            iconRight={ArrowRight}
            onClick={() => handleLaunchWhiteboard(currentProblem.id)}
            className="cursor-pointer shrink-0"
          >
            Launch Interactive Whiteboard
          </Button>
        </div>

        {/* Requirements & Capacity Estimation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              1. System Requirements
            </h4>
            <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
              {currentProblem.requirements.map((req, idx) => (
                <p key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{req}</span>
                </p>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              2. Back-of-the-Envelope Calculations
            </h4>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B1020] border border-slate-200 dark:border-[#27324A] font-mono text-xs space-y-1 text-slate-600 dark:text-slate-300">
              {currentProblem.calculations.map((calc, idx) => (
                <p key={idx}>{calc}</p>
              ))}
            </div>
          </div>
        </div>

        {/* Architecture Components Visual Blocks */}
        <div className="space-y-3 pt-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              3. Recommended Component Topology
            </h4>
            <span
              className="text-[11px] text-violet-600 dark:text-violet-400 font-semibold cursor-pointer hover:underline"
              onClick={() => handleLaunchWhiteboard(currentProblem.id)}
            >
              Open in Whiteboard &rarr;
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            {currentProblem.recommendedTopology.map((comp, idx) => {
              const IconComp = getTopologyIcon(comp.type);
              return (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-[#27324A] bg-white dark:bg-[#151C2E] space-y-1 hover:border-violet-500/40 transition-colors"
                >
                  <IconComp className="h-5 w-5 text-violet-500 mx-auto" />
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{comp.name}</p>
                  <p className="text-[10px] text-slate-400">{comp.role}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Banner Call to Action */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-violet-600/10 via-indigo-600/10 to-transparent border border-violet-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
              Ready to diagram your architecture solution?
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Design, connect, simulate, and export system design diagrams with drag-and-drop components and directional connectors.
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleLaunchWhiteboard(currentProblem.id)}
            iconRight={ArrowRight}
            className="shrink-0"
          >
            Open Interactive Canvas
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default SystemDesign;
