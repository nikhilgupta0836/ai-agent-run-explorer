'use client';

import React, { useState, useEffect } from 'react';
import { apiMetrics } from '@/lib/api';
import { Activity } from 'lucide-react';

export const RequestMetrics: React.FC = () => {
  const [metrics, setMetrics] = useState({
    count: apiMetrics.requestCount,
    duration: apiMetrics.lastDurationMs,
    endpoint: apiMetrics.lastEndpoint,
  });

  useEffect(() => {
    const unsubscribe = apiMetrics.subscribe(() => {
      setMetrics({
        count: apiMetrics.requestCount,
        duration: apiMetrics.lastDurationMs,
        endpoint: apiMetrics.lastEndpoint,
      });
    });
    return unsubscribe;
  }, []);

  if (metrics.count === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 text-slate-300 border border-slate-700/80 shadow-xl backdrop-blur-md text-xs font-mono">
        <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
        <span className="text-slate-400">API:</span>
        <span className="text-emerald-400 font-semibold">{metrics.duration}ms</span>
        <span className="text-slate-600">•</span>
        <span className="text-slate-300">{metrics.count} reqs</span>
      </div>
    </div>
  );
};
