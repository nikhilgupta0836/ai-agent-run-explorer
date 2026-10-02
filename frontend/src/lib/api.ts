import { PaginatedRunsResponse, Run, GlobalStats, QueryParams } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Global request metrics tracker for the visible UI indicator
export const apiMetrics = {
  requestCount: 0,
  lastDurationMs: 0,
  lastEndpoint: '',
  listeners: new Set<() => void>(),

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  },

  notify() {
    this.listeners.forEach((l) => l());
  },
};

async function fetchWithMetrics<T>(url: string, options?: RequestInit): Promise<T> {
  const startTime = performance.now();
  apiMetrics.requestCount += 1;
  apiMetrics.lastEndpoint = url.replace(API_BASE, '');

  try {
    const res = await fetch(url, options);
    const duration = Math.round(performance.now() - startTime);
    apiMetrics.lastDurationMs = duration;
    apiMetrics.notify();

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ detail: res.statusText }));
      const error = new Error(errorData.detail || 'API request failed') as any;
      error.status = res.status;
      error.data = errorData;
      throw error;
    }

    return await res.json();
  } catch (err) {
    const duration = Math.round(performance.now() - startTime);
    apiMetrics.lastDurationMs = duration;
    apiMetrics.notify();
    throw err;
  }
}

export async function getRuns(params: QueryParams = {}): Promise<PaginatedRunsResponse> {
  const searchParams = new URLSearchParams();

  if (params.status && params.status.length > 0) {
    params.status.forEach((s) => searchParams.append('status', s));
  }
  if (params.agent && params.agent.length > 0) {
    params.agent.forEach((a) => searchParams.append('agent', a));
  }
  if (params.started_from) {
    searchParams.set('started_from', params.started_from);
  }
  if (params.started_to) {
    searchParams.set('started_to', params.started_to);
  }
  if (params.search) {
    searchParams.set('search', params.search);
  }
  if (params.tool) {
    searchParams.set('tool', params.tool);
  }
  if (params.sort_by) {
    searchParams.set('sort_by', params.sort_by);
  }
  if (params.sort_order) {
    searchParams.set('sort_order', params.sort_order);
  }
  if (params.page) {
    searchParams.set('page', params.page.toString());
  }
  if (params.page_size) {
    searchParams.set('page_size', params.page_size.toString());
  }

  const queryString = searchParams.toString();
  const url = `${API_BASE}/api/runs${queryString ? `?${queryString}` : ''}`;
  return fetchWithMetrics<PaginatedRunsResponse>(url);
}

export async function getRunDetail(id: string): Promise<Run> {
  const url = `${API_BASE}/api/runs/${encodeURIComponent(id)}`;
  return fetchWithMetrics<Run>(url);
}

export async function getGlobalStats(): Promise<GlobalStats> {
  const url = `${API_BASE}/api/stats`;
  return fetchWithMetrics<GlobalStats>(url);
}

export async function streamExplainRun(
  id: string,
  onChunk: (chunk: string) => void,
  onError: (err: Error) => void,
  onDone: () => void
): Promise<void> {
  const url = `${API_BASE}/api/runs/${encodeURIComponent(id)}/explain`;
  const startTime = performance.now();
  apiMetrics.requestCount += 1;
  apiMetrics.lastEndpoint = `/api/runs/${id}/explain`;

  try {
    const res = await fetch(url, { method: 'POST' });
    apiMetrics.lastDurationMs = Math.round(performance.now() - startTime);
    apiMetrics.notify();

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(errJson.detail || 'Failed to generate explanation');
    }

    if (!res.body) {
      throw new Error('ReadableStream not supported in this browser');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) {
        const textChunk = decoder.decode(value, { stream: true });
        onChunk(textChunk);
      }
    }
    onDone();
  } catch (err: any) {
    onError(err);
  }
}

// Formatters
export function formatDuration(ms: number | null): string {
  if (ms === null || ms === undefined) return 'N/A';
  if (ms < 0) return `${ms}ms (invalid)`;
  if (ms < 1000) return `${ms}ms`;
  const sec = (ms / 1000).toFixed(1);
  if (parseFloat(sec) < 60) return `${sec}s`;
  const min = Math.floor(ms / 60000);
  const remSec = ((ms % 60000) / 1000).toFixed(0);
  return `${min}m ${remSec}s`;
}

export function formatCost(cost: number | null): string {
  if (cost === null || cost === undefined) return 'Unpriced';
  return `$${cost.toFixed(4)}`;
}

export function formatDate(isoString: string | null): string {
  if (!isoString) return 'N/A';
  try {
    const d = new Date(isoString);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  } catch {
    return isoString;
  }
}
