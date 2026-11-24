import React from 'react';
import { CheckCircle2, XCircle, Loader2, AlertCircle, RefreshCw } from 'lucide-react';

export function StatusCard({
  title,
  subtitle,
  icon: Icon,
  status,
  data,
  error,
  loading,
  onRefresh
}) {
  const isConnected = status && !loading;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 p-6 shadow-xl backdrop-blur-sm transition-all hover:border-slate-700">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className={`p-2.5 rounded-xl ${isConnected ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : loading ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white tracking-tight">{title}</h3>
            <p className="text-xs text-slate-400">{subtitle}</p>
          </div>
        </div>

        {/* Status Badge */}
        <div>
          {loading ? (
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Checking...</span>
            </span>
          ) : isConnected ? (
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Connected</span>
            </span>
          ) : (
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/30">
              <XCircle className="h-3.5 w-3.5" />
              <span>Disconnected</span>
            </span>
          )}
        </div>
      </div>

      {/* Details Box */}
      <div className="mt-5 pt-4 border-t border-slate-800/80">
        {loading ? (
          <div className="py-2 text-xs text-slate-500 font-mono animate-pulse">
            Probing endpoint communication...
          </div>
        ) : isConnected && data ? (
          <div className="space-y-1.5 font-mono text-xs">
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-500">Message:</span>
              <span className="text-slate-200 truncate max-w-[200px] sm:max-w-[260px]">{data.message}</span>
            </div>
            {data.environment && (
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-500">Environment:</span>
                <span className="text-indigo-400">{data.environment}</span>
              </div>
            )}
            {data.responseTimeMs !== undefined && (
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-500">Response Latency:</span>
                <span className="text-emerald-400">{data.responseTimeMs} ms</span>
              </div>
            )}
            <div className="flex justify-between text-slate-400">
              <span className="text-slate-500">Timestamp:</span>
              <span className="truncate max-w-[180px] text-slate-400">{data.timestamp}</span>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-start space-x-2 text-rose-400 text-xs">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error || 'Unable to establish connection.'}</span>
            </div>
          </div>
        )}
      </div>

      {/* Card Action */}
      {onRefresh && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center space-x-1 text-xs text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50"
            title="Refresh probe"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            <span>Recheck</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default StatusCard;

