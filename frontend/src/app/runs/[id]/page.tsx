'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getRunDetail,
  streamExplainRun,
  formatDuration,
  formatCost,
  formatDate,
} from '@/lib/api';
import { Run, Step } from '@/lib/types';
import { StatusBadge } from '@/components/StatusBadge';
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Cpu,
  Coins,
  Clock,
  Terminal,
  Database,
  Search,
  Globe,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
} from 'lucide-react';

export default function RunDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [run, setRun] = useState<Run | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; status?: number } | null>(null);

  // Streaming explanation state
  const [explanation, setExplanation] = useState<string>('');
  const [isExplaining, setIsExplaining] = useState(false);
  const [explainError, setExplainError] = useState<string | null>(null);
  const explainRef = useRef<HTMLDivElement>(null);

  // Expanded steps state
  const [expandedSteps, setExpandedSteps] = useState<Record<number, boolean>>({});

  // Fetch run detail
  useEffect(() => {
    async function loadDetail() {
      setLoading(true);
      setError(null);
      try {
        const data = await getRunDetail(id);
        setRun(data);

        // Expand all steps by default or deep-linked step
        const initialExpanded: Record<number, boolean> = {};
        data.steps.forEach((s) => {
          initialExpanded[s.index] = true;
        });
        setExpandedSteps(initialExpanded);
      } catch (err: any) {
        setError({
          message: err.message || 'Failed to load run detail',
          status: err.status,
        });
      } finally {
        setLoading(false);
      }
    }
    loadDetail();
  }, [id]);

  // Deep linking to step (#step-3)
  useEffect(() => {
    if (!run || run.steps.length === 0) return;

    const hash = window.location.hash;
    if (hash && hash.startsWith('#step-')) {
      const stepIdxStr = hash.replace('#step-', '');
      const stepIdx = parseInt(stepIdxStr, 10);
      if (!isNaN(stepIdx)) {
        setExpandedSteps((prev) => ({ ...prev, [stepIdx]: true }));
        setTimeout(() => {
          const el = document.getElementById(`step-${stepIdx}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('ring-2', 'ring-indigo-500');
            setTimeout(() => el.classList.remove('ring-2', 'ring-indigo-500'), 3000);
          }
        }, 300);
      }
    }
  }, [run]);

  // Handle Explain Stream
  const handleExplain = () => {
    setExplanation('');
    setExplainError(null);
    setIsExplaining(true);

    streamExplainRun(
      id,
      (chunk) => {
        setExplanation((prev) => prev + chunk);
        if (explainRef.current) {
          explainRef.current.scrollTop = explainRef.current.scrollHeight;
        }
      },
      (err) => {
        setExplainError(err.message || 'Error streaming explanation');
        setIsExplaining(false);
      },
      () => {
        setIsExplaining(false);
      }
    );
  };

  const toggleStep = (stepIndex: number) => {
    setExpandedSteps((prev) => ({
      ...prev,
      [stepIndex]: !prev[stepIndex],
    }));
  };

  // Helper for step tool icon
  const getToolIcon = (tool: string) => {
    switch (tool.toLowerCase()) {
      case 'llm':
        return <Cpu className="w-3.5 h-3.5 text-indigo-400" />;
      case 'sql':
        return <Database className="w-3.5 h-3.5 text-amber-400" />;
      case 'vector_search':
        return <Search className="w-3.5 h-3.5 text-emerald-400" />;
      case 'http':
        return <Globe className="w-3.5 h-3.5 text-sky-400" />;
      default:
        return <Terminal className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center space-y-4">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
        <p className="text-slate-400 text-sm">Loading execution trace for {id}...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <Link
          href="/runs"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Runs
        </Link>

        {error.status === 409 ? (
          <div className="bg-amber-950/40 border border-amber-800/80 rounded-xl p-6 space-y-3 shadow-lg">
            <div className="flex items-center gap-2 text-amber-400 font-semibold text-lg">
              <AlertTriangle className="w-6 h-6 text-amber-400" /> Ambiguous Dataset Record (409 Conflict)
            </div>
            <p className="text-sm text-amber-200/90 leading-relaxed">
              Multiple conflicting records exist for ID <code className="font-mono bg-amber-900/60 px-1.5 py-0.5 rounded text-amber-300">{id}</code> in the source dataset (<code className="font-mono">runs.jsonl</code>).
            </p>
            <p className="text-xs text-amber-300/70">
              Per data integrity rules, silent record overwrite or arbitrary selection is disabled.
            </p>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center space-y-4 shadow-lg">
            <XCircle className="w-10 h-10 text-rose-400 mx-auto" />
            <h2 className="text-lg font-bold text-slate-100">Run Not Found</h2>
            <p className="text-sm text-slate-400">{error.message}</p>
            <Link
              href="/runs"
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition shadow-md"
            >
              Return to Run Explorer
            </Link>
          </div>
        )}
      </div>
    );
  }

  if (!run) return null;

  return (
    <div className="space-y-6">
      {/* Top Bar Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Link
          href="/runs"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Run Explorer
        </Link>

        {/* Action: Explain Run */}
        <button
          onClick={handleExplain}
          disabled={isExplaining}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-500/20 disabled:opacity-50 transition"
        >
          {isExplaining ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4 text-violet-200" />
          )}
          <span>{isExplaining ? 'Streaming Analysis...' : 'Explain This Run'}</span>
        </button>
      </div>

      {/* Streaming Explanation Box (if active or done) */}
      {(explanation || isExplaining || explainError) && (
        <div className="bg-gradient-to-br from-indigo-950/60 to-slate-900 border border-indigo-500/30 rounded-xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-indigo-500/20 pb-3">
            <div className="flex items-center gap-2 text-indigo-300 font-semibold text-sm">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>AI Run Analysis</span>
              {isExplaining && (
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
                  Streaming
                </span>
              )}
            </div>
          </div>

          {explainError && (
            <div className="text-xs text-rose-400 font-mono bg-rose-950/40 p-3 rounded-lg border border-rose-900">
              {explainError}
            </div>
          )}

          {explanation && (
            <div
              ref={explainRef}
              className="max-h-64 overflow-y-auto text-xs text-slate-200 font-mono whitespace-pre-wrap leading-relaxed pr-2"
            >
              {explanation}
            </div>
          )}
        </div>
      )}

      {/* Metadata Card Header */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold font-mono text-indigo-400">{run.id}</h1>
              <StatusBadge status={run.status} />
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                Tenant: {run.tenant_id}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Agent: <span className="text-slate-200 font-semibold">{run.agent}</span> • Model:{' '}
              <span className="text-slate-200">{run.model}</span>
            </p>
          </div>
        </div>

        {/* Run Metadata Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-xs">
          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 space-y-1">
            <span className="text-slate-500 uppercase tracking-wider text-[10px] font-semibold flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" /> Started
            </span>
            <p className="font-mono text-slate-200 truncate" title={run.started_at}>
              {formatDate(run.started_at)}
            </p>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 space-y-1">
            <span className="text-slate-500 uppercase tracking-wider text-[10px] font-semibold flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" /> Duration
            </span>
            <p className="font-mono text-slate-200">{formatDuration(run.duration_ms)}</p>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 space-y-1">
            <span className="text-slate-500 uppercase tracking-wider text-[10px] font-semibold flex items-center gap-1">
              <Coins className="w-3 h-3 text-slate-400" /> Total Cost
            </span>
            <p className="font-mono font-semibold">
              {run.cost_usd === null ? (
                <span className="text-amber-400 italic">Unpriced</span>
              ) : (
                <span className="text-emerald-400">{formatCost(run.cost_usd)}</span>
              )}
            </p>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 space-y-1">
            <span className="text-slate-500 uppercase tracking-wider text-[10px] font-semibold">
              Input Tokens
            </span>
            <p className="font-mono text-slate-200">{run.input_tokens.toLocaleString()}</p>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 space-y-1">
            <span className="text-slate-500 uppercase tracking-wider text-[10px] font-semibold">
              Output Tokens
            </span>
            <p className="font-mono text-slate-200">{run.output_tokens.toLocaleString()}</p>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 space-y-1">
            <span className="text-slate-500 uppercase tracking-wider text-[10px] font-semibold">Steps</span>
            <p className="font-mono text-slate-200">{run.steps.length}</p>
          </div>
        </div>

        {/* Prompt Container */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Input Prompt
          </label>
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3.5 text-xs text-slate-200 font-mono whitespace-pre-wrap leading-relaxed">
            {run.prompt}
          </div>
        </div>
      </div>

      {/* Error Details Panel (if failed) */}
      {run.status === 'failed' && run.error && (
        <div className="bg-rose-950/30 border border-rose-900/80 rounded-xl p-5 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-rose-400 font-semibold text-sm">
            <XCircle className="w-5 h-5 text-rose-400" />
            <span>Failure Diagnostic</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-1">
            <div className="bg-slate-950/60 p-3 rounded-lg border border-rose-900/40">
              <span className="text-rose-400/80 font-mono text-[10px] uppercase">Error Type:</span>
              <p className="font-mono text-rose-200 font-semibold mt-0.5">{run.error.type}</p>
            </div>
            <div className="bg-slate-950/60 p-3 rounded-lg border border-rose-900/40">
              <span className="text-rose-400/80 font-mono text-[10px] uppercase">Step Index:</span>
              <p className="font-mono text-rose-200 font-semibold mt-0.5">
                {run.error.step_index !== null ? `Step #${run.error.step_index}` : 'Global/System'}
              </p>
            </div>
            <div className="bg-slate-950/60 p-3 rounded-lg border border-rose-900/40 md:col-span-1">
              <span className="text-rose-400/80 font-mono text-[10px] uppercase">Message:</span>
              <p className="font-mono text-rose-200 mt-0.5">{run.error.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* Execution Steps Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-100 tracking-tight">
            Execution Steps ({run.steps.length})
          </h2>
        </div>

        {run.steps.length === 0 ? (
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-8 text-center space-y-2">
            <Terminal className="w-8 h-8 text-slate-600 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-300">No steps recorded</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              This run has an empty execution steps array in the source dataset.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {run.steps.map((step) => {
              const isExpanded = Boolean(expandedSteps[step.index]);

              return (
                <div
                  key={step.index}
                  id={`step-${step.index}`}
                  className="bg-slate-900/70 border border-slate-800 rounded-xl overflow-hidden shadow-sm transition"
                >
                  {/* Step Header Bar */}
                  <div
                    onClick={() => toggleStep(step.index)}
                    className="w-full px-4 py-3 bg-slate-950/60 hover:bg-slate-950 flex items-center justify-between cursor-pointer border-b border-slate-800/60"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                        #{step.index}
                      </span>
                      <span className="font-semibold text-sm text-slate-200">{step.name}</span>
                      <span className="inline-flex items-center gap-1 font-mono text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                        {getToolIcon(step.tool)}
                        {step.tool}
                      </span>
                      <StatusBadge status={step.status} />
                    </div>

                    <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
                      <span>{formatDuration(step.duration_ms)}</span>
                      <span className="text-slate-500">
                        {step.tokens.input}in / {step.tokens.output}out
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Step Details */}
                  {isExpanded && (
                    <div className="p-4 space-y-4 bg-slate-950/40 text-xs">
                      {/* Input Block */}
                      <div className="space-y-1.5">
                        <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                          Step Input
                        </span>
                        <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800/80 font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                          {step.input || '(empty)'}
                        </pre>
                      </div>

                      {/* Output Block */}
                      <div className="space-y-1.5">
                        <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                          Step Output
                        </span>
                        <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800/80 font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                          {step.output ?? '(null - step failed or running)'}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
