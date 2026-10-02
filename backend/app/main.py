import os
from typing import List, Optional
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from app.models import Run, PaginatedRunsResponse, GlobalStats
from app.data import dataset_store
from app.stats import compute_global_stats
from app.explain import get_explain_provider

app = FastAPI(
    title="Oraczen Agent Run Explorer API",
    version="1.0.0",
    description="Backend monitoring and debugging dashboard API for AI-agent executions",
)

# CORS configuration
allowed_origins_raw = os.getenv("CORS_ORIGINS", "http://localhost:3000")
allowed_origins = [o.strip() for o in allowed_origins_raw.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {
        "service": "Oraczen Agent Run Explorer API",
        "status": "online",
        "total_runs_loaded": len(dataset_store.runs),
    }


@app.get("/api/runs", response_model=PaginatedRunsResponse)
def get_runs(
    status: Optional[List[str]] = Query(None, description="Filter by status (multiple allowed)"),
    agent: Optional[List[str]] = Query(None, description="Filter by agent (multiple allowed)"),
    started_from: Optional[str] = Query(None, description="Filter runs started on or after ISO date/time"),
    started_to: Optional[str] = Query(None, description="Filter runs started on or before ISO date/time"),
    search: Optional[str] = Query(None, description="Case-insensitive text search across prompt"),
    tool: Optional[str] = Query(None, description="Filter runs containing a step with specified tool"),
    sort_by: str = Query("started_at", description="Sort by field: started_at, duration_ms, cost_usd"),
    sort_order: str = Query("desc", description="Sort direction: asc or desc"),
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(25, ge=1, le=500, description="Items per page"),
):
    """
    List runs with pagination, multi-value filters, date range filtering,
    prompt search, tool filter, and sorting.
    """
    return dataset_store.query_runs(
        status=status,
        agent=agent,
        started_from=started_from,
        started_to=started_to,
        search=search,
        tool=tool,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        page_size=page_size,
    )


@app.get("/api/runs/{run_id}", response_model=Run)
def get_run_detail(run_id: str):
    """
    Get detailed information for a single run including all steps.
    Returns 404 if run does not exist, or 409 if ID is ambiguous (duplicate dataset records).
    """
    run, is_ambiguous = dataset_store.get_run_by_id(run_id)
    if is_ambiguous:
        raise HTTPException(
            status_code=409,
            detail=f"Multiple records exist for ID '{run_id}' in the dataset. Request is ambiguous.",
        )
    if not run:
        raise HTTPException(
            status_code=404,
            detail=f"Run with ID '{run_id}' not found.",
        )
    return run


@app.get("/api/stats", response_model=GlobalStats)
def get_stats():
    """
    Get global aggregated statistics for dashboard charts.
    """
    return compute_global_stats()


@app.post("/api/runs/{run_id}/explain")
def explain_run(run_id: str):
    """
    Stream natural language explanation of run execution and errors.
    """
    run, is_ambiguous = dataset_store.get_run_by_id(run_id)
    if is_ambiguous:
        raise HTTPException(
            status_code=409,
            detail=f"Multiple records exist for ID '{run_id}' in the dataset. Request is ambiguous.",
        )
    if not run:
        raise HTTPException(
            status_code=404,
            detail=f"Run with ID '{run_id}' not found.",
        )

    provider = get_explain_provider()
    generator = provider.stream_explanation(run)
    return StreamingResponse(generator, media_type="text/plain")
