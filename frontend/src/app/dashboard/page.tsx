'use client';

import React, { useEffect, useState } from 'react';
import { getGlobalStats, formatDuration } from '@/lib/api';
import { GlobalStats } from '@/lib/types';
import {
  Loader2,
  AlertCircle,
  Activity,
  CheckCircle2,
  Clock,
  Coins,
  TrendingUp,
  BarChart3,
  Users,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';

export default function DashboardPage() {
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStats() {
      setLoading(true);
      setError(null);
      try {
        const data = await getGlobalStats();
        setStats(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load statistics from server');
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="p-16 text-center space-y-4">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
        <p className="text-slate-400 text-sm">Computing dashboard analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center space-y-4 max-w-xl mx-auto">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
        <h2 className="text-lg font-bold text-slate-100">Error Loading Dashboard</h2>
        <p className="text-sm text-slate-400">{error}</p>
      </div>
    );
  }

  if (!stats) return null;

  // Custom Tooltip for Daily Runs Chart
  const CustomDailyTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl text-xs font-mono">
          <p className="text-slate-300 font-semibold">{label}</p>
          <p className="text-indigo-400 font-bold mt-1">
            {payload[0].value} run{payload[0].value !== 1 ? 's' : ''}
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom Tooltip for Cost Chart
  const CustomCostTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl text-xs font-mono space-y-1">
          <p className="text-slate-200 font-semibold">{data.agent}</p>
          <p className="text-emerald-400 font-bold">${data.total_cost_usd.toFixed(4)}</p>
          {data.unpriced_runs > 0 && (
            <p className="text-amber-400 text-[11px] italic">
              ({data.unpriced_runs} unpriced run{data.unpriced_runs !== 1 ? 's' : ''})
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  // Custom Tooltip for Success Rate Chart
  const CustomRateTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl text-xs font-mono space-y-1">
          <p className="text-slate-200 font-semibold">{data.agent}</p>
          <p className="text-emerald-400 font-bold">{(data.success_rate * 100).toFixed(1)}% Success</p>
          <p className="text-slate-400 text-[11px]">
            {data.succeeded_runs} / {data.succeeded_runs + data.failed_runs + data.cancelled_runs} terminal runs
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8">
      {/* Page Title & Context Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">System Analytics & Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">
            Global metrics across all 201 dataset agent executions
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-mono">
          <Activity className="w-3.5 h-3.5 text-indigo-400" />
          <span>Global statistics (unfiltered)</span>
        </div>
      </div>

      {/* Summary KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Runs */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Runs</span>
            <Activity className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-slate-100">{stats.total_runs}</p>
          <p className="text-[11px] text-slate-400">Continuous 43-day range</p>
        </div>

        {/* Overall Success Rate */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Success Rate</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-emerald-400">
            {(stats.overall_success_rate * 100).toFixed(1)}%
          </p>
          <p className="text-[11px] text-slate-400">Excludes active running runs</p>
        </div>

        {/* Median Duration */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Median Duration</span>
            <Clock className="w-4 h-4 text-sky-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-slate-100">
            {formatDuration(stats.median_duration_ms)}
          </p>
          <p className="text-[11px] text-slate-400">P50 completed executions</p>
        </div>

        {/* P95 Duration */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">P95 Duration</span>
            <TrendingUp className="w-4 h-4 text-violet-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-slate-100">
            {formatDuration(stats.p95_duration_ms)}
          </p>
          <p className="text-[11px] text-slate-400">Linear percentile method</p>
        </div>

        {/* Unpriced Runs */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Unpriced Runs</span>
            <Coins className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-amber-400">{stats.unpriced_runs_count}</p>
          <p className="text-[11px] text-slate-400">Records with cost_usd: null</p>
        </div>
      </div>

      {/* Chart 1: Daily Run Volume Over Time */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-100 tracking-tight flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-400" /> Daily Run Volume
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Continuous date timeline from July 20 to August 31, 2026</p>
          </div>
        </div>

        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stats.daily_runs} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="date"
                stroke="#64748b"
                fontSize={10}
                tickFormatter={(val) => val.slice(5)} // MM-DD
              />
              <YAxis stroke="#64748b" fontSize={10} allowDecimals={false} />
              <Tooltip content={<CustomDailyTooltip />} />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#6366f1"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorCount)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Two Column Grid for Charts 2 & 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 2: Total Cost per Agent */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-100 tracking-tight flex items-center gap-2">
              <Coins className="w-4 h-4 text-emerald-400" /> Total Cost per Agent ($)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Summed known cost with unpriced records noted</p>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.agent_stats} margin={{ top: 10, right: 10, left: -10, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="agent"
                  stroke="#64748b"
                  fontSize={10}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis stroke="#64748b" fontSize={10} tickFormatter={(v) => `$${v.toFixed(2)}`} />
                <Tooltip content={<CustomCostTooltip />} />
                <Bar dataKey="total_cost_usd" fill="#10b981" radius={[4, 4, 0, 0]}>
                  {stats.agent_stats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.unpriced_runs > 0 ? '#10b981' : '#10b981'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Success Rate per Agent */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-100 tracking-tight flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" /> Success Rate per Agent (%)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Percentage of completed runs that succeeded</p>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.agent_stats} margin={{ top: 10, right: 10, left: -10, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="agent"
                  stroke="#64748b"
                  fontSize={10}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={10}
                  domain={[0, 1]}
                  tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                />
                <Tooltip content={<CustomRateTooltip />} />
                <Bar dataKey="success_rate" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
