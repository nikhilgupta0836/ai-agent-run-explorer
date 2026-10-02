'use client';

import React, { useEffect, useState, useCallback, useTransition, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  getRuns,
  formatDuration,
  formatCost,
  formatDate,
} from '@/lib/api';
import { PaginatedRunsResponse, QueryParams } from '@/lib/types';
import { StatusBadge } from '@/components/StatusBadge';
import {
  Search,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
  Keyboard,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

const ALL_AGENTS = [
  'contract-reviewer',
  'email-drafter',
  'invoice-extractor',
  'kpi-analyst',
  'support-router',
];

const ALL_STATUSES = ['succeeded', 'failed', 'cancelled', 'running'];

const ALL_TOOLS = ['llm', 'sql', 'vector_search', 'http', 'none'];

function RunsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Parse state from URL search params
  const currentSearch = searchParams.get('search') || '';
  const currentStatuses = searchParams.getAll('status');
  const currentAgents = searchParams.getAll('agent');
  const currentStartedFrom = searchParams.get('started_from') || '';
  const currentStartedTo = searchParams.get('started_to') || '';
  const currentTool = searchParams.get('tool') || '';
  const currentSortBy = searchParams.get('sort_by') || 'started_at';
  const currentSortOrder = searchParams.get('sort_order') || 'desc';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const currentPageSize = parseInt(searchParams.get('page_size') || '25', 10);

  // Local state for debounced search input
  const [searchInput, setSearchInput] = useState(currentSearch);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  // Data fetching state
  const [data, setData] = useState<PaginatedRunsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch runs on searchParams change
  const loadRuns = useCallback(async () => {
    setLoading(true);
    setError(null);

    const query: QueryParams = {
      status: currentStatuses,
      agent: currentAgents,
      started_from: currentStartedFrom || undefined,
      started_to: currentStartedTo || undefined,
      search: currentSearch || undefined,
      tool: currentTool || undefined,
      sort_by: currentSortBy,
      sort_order: currentSortOrder,
      page: currentPage,
      page_size: currentPageSize,
    };

    try {
      const res = await getRuns(query);
      setData(res);
      setSelectedIndex(-1);
    } catch (err: any) {
      setError(err.message || 'Failed to load runs from server');
    } finally {
      setLoading(false);
    }
  }, [
    currentStatuses.join(','),
    currentAgents.join(','),
    currentStartedFrom,
    currentStartedTo,
    currentSearch,
    currentTool,
    currentSortBy,
    currentSortOrder,
    currentPage,
    currentPageSize,
  ]);

  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  // Sync input when searchParam changes
  useEffect(() => {
    setSearchInput(currentSearch);
  }, [currentSearch]);

  // Helper to update URL search params
  const updateUrlParams = useCallback(
    (updates: Record<string, string | string[] | null | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
          params.delete(key);
        } else if (Array.isArray(value)) {
          params.delete(key);
          value.forEach((v) => params.append(key, v));
        } else {
          params.set(key, value);
        }
      });

      if (!('page' in updates)) {
        params.set('page', '1');
      }

      startTransition(() => {
        router.push(`/runs?${params.toString()}`);
      });
    },
    [router, searchParams]
  );

  // Debounce search update
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== currentSearch) {
        updateUrlParams({ search: searchInput });
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput, currentSearch, updateUrlParams]);

  // Handle Status Checkbox Toggle
  const handleStatusToggle = (statusName: string) => {
    const next = currentStatuses.includes(statusName)
      ? currentStatuses.filter((s) => s !== statusName)
      : [...currentStatuses, statusName];
    updateUrlParams({ status: next });
  };

  // Handle Agent Checkbox Toggle
  const handleAgentToggle = (agentName: string) => {
    const next = currentAgents.includes(agentName)
      ? currentAgents.filter((a) => a !== agentName)
      : [...currentAgents, agentName];
    updateUrlParams({ agent: next });
  };

  // Keyboard navigation handler (Up/Down arrow & Enter)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!data || !data.items || data.items.length === 0) return;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < data.items.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : data.items.length - 1));
      } else if (e.key === 'Enter' && selectedIndex >= 0 && selectedIndex < data.items.length) {
        e.preventDefault();
        const selectedRun = data.items[selectedIndex];
        router.push(`/runs/${selectedRun.id}`);
      } else if (e.key === 'Escape') {
        setSelectedIndex(-1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [data, selectedIndex, router]);

  // Reset all filters
  const resetFilters = () => {
    setSearchInput('');
    startTransition(() => {
      router.push('/runs');
    });
  };

  const hasActiveFilters =
    currentStatuses.length > 0 ||
    currentAgents.length > 0 ||
    Boolean(currentStartedFrom) ||
    Boolean(currentStartedTo) ||
    Boolean(currentSearch) ||
    Boolean(currentTool);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Agent Run Explorer</h1>
          <p className="text-sm text-slate-400 mt-1">
            Browse, filter, and inspect AI agent execution traces across tenants
          </p>
        </div>
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
          >
            <X className="w-3.5 h-3.5 text-slate-400" />
            Reset all filters
          </button>
        )}
      </div>

      {/* Control Bar: Search & Filter Toolbar */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-4 shadow-sm backdrop-blur-sm">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search prompt text (e.g. 'outage', 'invoice')..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Date range filters */}
          <div className="md:col-span-4 grid grid-cols-2 gap-2">
            <div className="relative">
              <input
                type="date"
                value={currentStartedFrom}
                onChange={(e) => updateUrlParams({ started_from: e.target.value })}
                className="w-full px-2.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition"
                title="Started From Date"
              />
            </div>
            <div className="relative">
              <input
                type="date"
                value={currentStartedTo}
                onChange={(e) => updateUrlParams({ started_to: e.target.value })}
                className="w-full px-2.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition"
                title="Started To Date"
              />
            </div>
          </div>

          {/* Sort & Tool Filter */}
          <div className="md:col-span-3 grid grid-cols-2 gap-2">
            {/* Tool filter */}
            <select
              value={currentTool}
              onChange={(e) => updateUrlParams({ tool: e.target.value })}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition"
            >
              <option value="">All Tools</option>
              {ALL_TOOLS.map((t) => (
                <option key={t} value={t}>
                  Tool: {t}
                </option>
              ))}
            </select>

            {/* Sort Field & Order */}
            <div className="flex items-center gap-1">
              <select
                value={currentSortBy}
                onChange={(e) => updateUrlParams({ sort_by: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition"
              >
                <option value="started_at">Sort: Start Time</option>
                <option value="duration_ms">Sort: Duration</option>
                <option value="cost_usd">Sort: Cost</option>
              </select>
              <button
                onClick={() =>
                  updateUrlParams({
                    sort_order: currentSortOrder === 'asc' ? 'desc' : 'asc',
                  })
                }
                title={`Toggle sort order (current: ${currentSortOrder.toUpperCase()})`}
                className="p-2 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-lg transition"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Checkbox Filter Chips */}
        <div className="flex flex-wrap gap-4 pt-2 border-t border-slate-800/60 text-xs">
          {/* Status filters */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Status:</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {ALL_STATUSES.map((st) => {
                const checked = currentStatuses.includes(st);
                return (
                  <button
                    key={st}
                    onClick={() => handleStatusToggle(st)}
                    className={`px-2.5 py-1 rounded-md transition font-medium capitalize ${
                      checked
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    {st}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="h-4 w-px bg-slate-800 self-center hidden sm:block" />

          {/* Agent filters */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Agent:</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {ALL_AGENTS.map((ag) => {
                const checked = currentAgents.includes(ag);
                return (
                  <button
                    key={ag}
                    onClick={() => handleAgentToggle(ag)}
                    className={`px-2.5 py-1 rounded-md transition font-mono text-[11px] ${
                      checked
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    {ag}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Runs Table / Cards Area */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {/* Table Top Status Bar */}
        <div className="px-4 py-3 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between text-xs text-slate-400">
          <div>
            {loading || isPending ? (
              <span className="inline-flex items-center gap-1.5 text-indigo-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Fetching runs...
              </span>
            ) : data ? (
              <span>
                Showing <strong className="text-slate-200">{(currentPage - 1) * currentPageSize + 1}</strong>–
                <strong className="text-slate-200">
                  {Math.min(currentPage * currentPageSize, data.total)}
                </strong>{' '}
                of <strong className="text-slate-200">{data.total}</strong> runs
              </span>
            ) : null}
          </div>
          <div className="hidden sm:flex items-center gap-2 text-slate-500 font-mono text-[11px]">
            <Keyboard className="w-3.5 h-3.5" />
            <span>Use ↑ ↓ keys to navigate, Enter to inspect</span>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="p-8 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
            <h3 className="text-base font-semibold text-slate-200">Error Loading Runs</h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto">{error}</p>
            <button
              onClick={loadRuns}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && data && data.items.length === 0 && (
          <div className="p-12 text-center space-y-3">
            <Search className="w-8 h-8 text-slate-600 mx-auto" />
            <h3 className="text-base font-semibold text-slate-200">No matching agent runs found</h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              Try adjusting your prompt search, date range, or agent/status filter selection.
            </p>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition border border-slate-700"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}

        {/* Table View */}
        {!error && data && data.items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-950/70">
                  <th className="py-3 px-4">Run ID</th>
                  <th className="py-3 px-4">Agent</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Model</th>
                  <th className="py-3 px-4">Started At</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Cost</th>
                  <th className="py-3 px-4">Prompt Preview</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {data.items.map((run, idx) => {
                  const isSelected = selectedIndex === idx;

                  return (
                    <tr
                      key={`${run.id}-${idx}`}
                      onClick={() => setSelectedIndex(idx)}
                      onDoubleClick={() => router.push(`/runs/${run.id}`)}
                      className={`group transition cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-950/40 ring-1 ring-indigo-500/50'
                          : 'hover:bg-slate-800/40'
                      }`}
                    >
                      {/* Run ID */}
                      <td className="py-3.5 px-4 font-mono font-medium text-indigo-400 text-xs whitespace-nowrap">
                        <Link href={`/runs/${run.id}`} className="hover:underline flex items-center gap-1">
                          {run.id}
                        </Link>
                      </td>

                      {/* Agent */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-xs text-slate-300">
                        {run.agent}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusBadge status={run.status} />
                      </td>

                      {/* Model */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-xs text-slate-400">
                        {run.model}
                      </td>

                      {/* Started At */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-400 font-mono">
                        {formatDate(run.started_at)}
                      </td>

                      {/* Duration */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-xs font-mono text-slate-300">
                        {formatDuration(run.duration_ms)}
                      </td>

                      {/* Cost */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-xs font-mono">
                        {run.cost_usd === null ? (
                          <span className="text-amber-400/80 italic">Unpriced</span>
                        ) : (
                          <span className="text-emerald-400">{formatCost(run.cost_usd)}</span>
                        )}
                      </td>

                      {/* Prompt preview */}
                      <td className="py-3.5 px-4 text-xs text-slate-300 max-w-xs truncate" title={run.prompt}>
                        {run.prompt}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <Link
                          href={`/runs/${run.id}`}
                          className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-medium hover:underline"
                        >
                          Inspect <ExternalLink className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {data && data.total_pages > 1 && (
          <div className="px-4 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
            <div>
              Page <strong className="text-slate-200">{currentPage}</strong> of{' '}
              <strong className="text-slate-200">{data.total_pages}</strong>
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage <= 1}
                onClick={() => updateUrlParams({ page: (currentPage - 1).toString() })}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 font-medium transition border border-slate-700"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </button>
              <button
                disabled={currentPage >= data.total_pages}
                onClick={() => updateUrlParams({ page: (currentPage + 1).toString() })}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 font-medium transition border border-slate-700"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function RunsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center space-y-3">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
          <p className="text-slate-400 text-sm">Loading explorer...</p>
        </div>
      }
    >
      <RunsContent />
    </Suspense>
  );
}
