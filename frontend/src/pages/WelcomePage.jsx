import React from 'react';
import { Server, Database, ShieldCheck, ArrowRight, Layers, Cpu, Terminal, RefreshCw } from 'lucide-react';
import { useHealthCheck } from '../hooks/useHealthCheck.js';
import { StatusCard } from '../components/StatusCard.jsx';

export function WelcomePage() {
  const { backendStatus, databaseStatus, refresh } = useHealthCheck();

  const isAllSystemsOperational =
    backendStatus.connected && databaseStatus.connected;

  return (
    <div className="space-y-10 max-w-5xl mx-auto">
      {/* Hero Section */}
      <section className="text-center space-y-4 pt-4 sm:pt-8">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs sm:text-sm font-medium">
          <span className="flex h-2 w-2 rounded-full bg-indigo-400"></span>
          <span>Phase 1: Environment & Architecture Verification</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white">
          AI-Powered Interview Platform
        </h1>

        <p className="max-w-2xl mx-auto text-sm sm:text-base lg:text-lg text-slate-400 leading-relaxed">
          Welcome to <span className="text-indigo-400 font-semibold">InterviewAI</span>. A production-grade,
          intelligent mock interview and feedback system built for high-performance preparation.
        </p>

        {/* Global System Health Summary Banner */}
        <div className="pt-2">
          <div className={`inline-flex items-center space-x-3 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium border ${
            isAllSystemsOperational
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
              : 'bg-amber-950/40 border-amber-500/30 text-amber-300'
          }`}>
            <span className={`h-2.5 w-2.5 rounded-full ${isAllSystemsOperational ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`}></span>
            <span>
              {isAllSystemsOperational
                ? 'All Core Services Operational (Backend API & PostgreSQL Online)'
                : 'System Diagnostics In Progress or Services Starting'}
            </span>
            <button
              onClick={refresh}
              className="ml-2 hover:opacity-80 transition-opacity p-1"
              title="Refresh all diagnostics"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* Diagnostics Grid: Backend Health & Database Health */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-200 tracking-tight flex items-center space-x-2">
            <Terminal className="h-4 w-4 text-indigo-400" />
            <span>Live Health Diagnostics (Phase 1 Connectivity)</span>
          </h2>
          <span className="text-xs text-slate-500 font-mono">Auto-probing /api/health*</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Backend Health Card */}
          <StatusCard
            title="Express API Service"
            subtitle="GET /api/health"
            icon={Server}
            status={backendStatus.connected}
            loading={backendStatus.loading}
            data={backendStatus.data}
            error={backendStatus.error}
            onRefresh={refresh}
          />

          {/* Database Health Card */}
          <StatusCard
            title="PostgreSQL via Prisma ORM"
            subtitle="GET /api/health/database"
            icon={Database}
            status={databaseStatus.connected}
            loading={databaseStatus.loading}
            data={databaseStatus.data}
            error={databaseStatus.error}
            onRefresh={refresh}
          />
        </div>
      </section>

      {/* Architecture Highlights */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 sm:p-8 backdrop-blur-sm">
        <h3 className="text-base sm:text-lg font-semibold text-white mb-4 flex items-center space-x-2">
          <Layers className="h-5 w-5 text-indigo-400" />
          <span>Established Architecture & Technical Stack</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div className="text-xs text-indigo-400 font-mono font-medium">Frontend Layer</div>
            <div className="text-sm font-semibold text-slate-200 mt-1">React + Vite</div>
            <div className="text-xs text-slate-500 mt-1">Tailwind CSS, React Router, Reusable API Client</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div className="text-xs text-indigo-400 font-mono font-medium">Backend Layer</div>
            <div className="text-sm font-semibold text-slate-200 mt-1">Node.js Express (ESM)</div>
            <div className="text-xs text-slate-500 mt-1">Modular controllers, routes, centralized error middleware</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div className="text-xs text-indigo-400 font-mono font-medium">Data Storage</div>
            <div className="text-sm font-semibold text-slate-200 mt-1">PostgreSQL + Prisma 6</div>
            <div className="text-xs text-slate-500 mt-1">Prisma ORM v6.19.3, connection pooling, graceful shutdown</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div className="text-xs text-indigo-400 font-mono font-medium">Production Strategy</div>
            <div className="text-sm font-semibold text-slate-200 mt-1">Single-Port Architecture</div>
            <div className="text-xs text-slate-500 mt-1">Zero-Docker, ngrok tunnel ready, Vite proxy dev support</div>
          </div>
        </div>
      </section>

      {/* Next Steps Guide */}
      <section className="text-center py-4 border-t border-slate-800/80">
        <p className="text-xs sm:text-sm text-slate-400">
          Phase 1 setup complete and validated. Ready for Phase 2: Frontend Layout, Authentication & User Management.
        </p>
      </section>
    </div>
  );
}

export default WelcomePage;

