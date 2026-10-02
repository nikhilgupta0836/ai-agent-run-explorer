from typing import List, Optional
from pydantic import BaseModel, Field


class StepTokens(BaseModel):
    input: int = 0
    output: int = 0


class Step(BaseModel):
    index: int
    name: str
    tool: str
    status: str
    started_at: str
    duration_ms: Optional[float] = None
    input: str
    output: Optional[str] = None
    tokens: StepTokens = Field(default_factory=StepTokens)


class RunError(BaseModel):
    type: str
    message: str
    step_index: Optional[int] = None


class Run(BaseModel):
    id: str
    agent: str
    model: str
    status: str
    started_at: str
    ended_at: Optional[str] = None
    duration_ms: Optional[float] = None
    input_tokens: int = 0
    output_tokens: int = 0
    cost_usd: Optional[float] = None
    prompt: str
    error: Optional[RunError] = None
    tenant_id: str
    steps: List[Step] = Field(default_factory=list)


class RunSummary(BaseModel):
    id: str
    agent: str
    model: str
    status: str
    started_at: str
    ended_at: Optional[str] = None
    duration_ms: Optional[float] = None
    input_tokens: int = 0
    output_tokens: int = 0
    cost_usd: Optional[float] = None
    prompt: str
    error: Optional[RunError] = None
    tenant_id: str
    step_count: int


class PaginatedRunsResponse(BaseModel):
    items: List[RunSummary]
    page: int
    page_size: int
    total: int
    total_pages: int


class AgentStats(BaseModel):
    agent: str
    total_runs: int
    succeeded_runs: int
    failed_runs: int
    cancelled_runs: int
    running_runs: int
    success_rate: float
    total_cost_usd: float
    unpriced_runs: int


class DailyRunCount(BaseModel):
    date: str  # YYYY-MM-DD
    count: int


class GlobalStats(BaseModel):
    total_runs: int
    overall_success_rate: float
    median_duration_ms: Optional[float] = None
    p95_duration_ms: Optional[float] = None
    unpriced_runs_count: int
    agent_stats: List[AgentStats]
    daily_runs: List[DailyRunCount]
