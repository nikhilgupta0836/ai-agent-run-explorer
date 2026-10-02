export interface StepTokens {
  input: number;
  output: number;
}

export interface Step {
  index: number;
  name: string;
  tool: string;
  status: 'succeeded' | 'failed' | 'cancelled' | 'running' | string;
  started_at: string;
  duration_ms: number | null;
  input: string;
  output: string | null;
  tokens: StepTokens;
}

export interface RunError {
  type: string;
  message: string;
  step_index: number | null;
}

export interface Run {
  id: string;
  agent: string;
  model: string;
  status: 'succeeded' | 'failed' | 'cancelled' | 'running' | string;
  started_at: string;
  ended_at: string | null;
  duration_ms: number | null;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number | null;
  prompt: string;
  error: RunError | null;
  tenant_id: string;
  steps: Step[];
}

export interface RunSummary {
  id: string;
  agent: string;
  model: string;
  status: 'succeeded' | 'failed' | 'cancelled' | 'running' | string;
  started_at: string;
  ended_at: string | null;
  duration_ms: number | null;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number | null;
  prompt: string;
  error: RunError | null;
  tenant_id: string;
  step_count: number;
}

export interface PaginatedRunsResponse {
  items: RunSummary[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface AgentStats {
  agent: string;
  total_runs: number;
  succeeded_runs: number;
  failed_runs: number;
  cancelled_runs: number;
  running_runs: number;
  success_rate: number;
  total_cost_usd: number;
  unpriced_runs: number;
}

export interface DailyRunCount {
  date: string;
  count: number;
}

export interface GlobalStats {
  total_runs: number;
  overall_success_rate: number;
  median_duration_ms: number | null;
  p95_duration_ms: number | null;
  unpriced_runs_count: number;
  agent_stats: AgentStats[];
  daily_runs: DailyRunCount[];
}

export interface QueryParams {
  status?: string[];
  agent?: string[];
  started_from?: string;
  started_to?: string;
  search?: string;
  tool?: string;
  sort_by?: 'started_at' | 'duration_ms' | 'cost_usd' | string;
  sort_order?: 'asc' | 'desc' | string;
  page?: number;
  page_size?: number;
}
