import React from 'react';
import { CheckCircle2, XCircle, Ban, Loader2 } from 'lucide-react';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const normalized = status.toLowerCase();

  if (normalized === 'succeeded') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 ${className}`}
      >
        <CheckCircle2 className="w-3.5 h-3.5" />
        Succeeded
      </span>
    );
  }

  if (normalized === 'failed') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20 ${className}`}
      >
        <XCircle className="w-3.5 h-3.5" />
        Failed
      </span>
    );
  }

  if (normalized === 'cancelled') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 ${className}`}
      >
        <Ban className="w-3.5 h-3.5" />
        Cancelled
      </span>
    );
  }

  if (normalized === 'running') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-sky-500/10 text-sky-400 border border-sky-500/20 ${className}`}
      >
        <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
        Running
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700 ${className}`}
    >
      {status}
    </span>
  );
};
