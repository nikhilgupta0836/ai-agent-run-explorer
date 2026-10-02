import json
import os
from typing import List, Dict, Optional, Tuple
from datetime import datetime, date

from app.models import Run, RunSummary, PaginatedRunsResponse


class DatasetStore:
    def __init__(self, filepath: Optional[str] = None):
        if not filepath:
            # Default location: data/runs.jsonl relative to project root or current working dir
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            filepath = os.path.join(base_dir, "data", "runs.jsonl")
            if not os.path.exists(filepath):
                # Fallback to local cwd
                filepath = os.path.join(os.getcwd(), "data", "runs.jsonl")

        self.filepath = filepath
        self.runs: List[Run] = []
        self.runs_by_id: Dict[str, List[Run]] = {}
        self.load_data()

    def load_data(self) -> None:
        """Read and validate JSONL records at startup."""
        self.runs.clear()
        self.runs_by_id.clear()

        if not os.path.exists(self.filepath):
            raise FileNotFoundError(f"Dataset file not found at {self.filepath}")

        with open(self.filepath, "r", encoding="utf-8") as f:
            for line_idx, line in enumerate(f, 1):
                line = line.strip()
                if not line:
                    continue
                try:
                    data = json.loads(line)
                    run = Run.model_validate(data)
                    self.runs.append(run)
                    if run.id not in self.runs_by_id:
                        self.runs_by_id[run.id] = []
                    self.runs_by_id[run.id].append(run)
                except Exception as e:
                    # Log or handle unexpected JSON parsing error per line
                    print(f"Warning: Failed to parse line {line_idx}: {e}")

    def get_run_by_id(self, run_id: str) -> Tuple[Optional[Run], bool]:
        """
        Returns (run, is_ambiguous).
        - If id does not exist: (None, False)
        - If id exists once: (run, False)
        - If id has duplicate records: (None, True) -> triggering 409 Conflict
        """
        records = self.runs_by_id.get(run_id, [])
        if not records:
            return None, False
        if len(records) > 1:
            return None, True
        return records[0], False

    def query_runs(
        self,
        status: Optional[List[str]] = None,
        agent: Optional[List[str]] = None,
        started_from: Optional[str] = None,
        started_to: Optional[str] = None,
        search: Optional[str] = None,
        tool: Optional[str] = None,
        sort_by: str = "started_at",
        sort_order: str = "desc",
        page: int = 1,
        page_size: int = 25,
    ) -> PaginatedRunsResponse:
        """Filter, sort, and paginate runs."""
        filtered = self.runs

        # Filter by status (multi-value allowed)
        if status:
            status_set = set(status)
            filtered = [r for r in filtered if r.status in status_set]

        # Filter by agent (multi-value allowed)
        if agent:
            agent_set = set(agent)
            filtered = [r for r in filtered if r.agent in agent_set]

        # Filter by started_at date range
        if started_from:
            try:
                # support YYYY-MM-DD or full ISO
                start_dt = started_from if "T" in started_from else f"{started_from}T00:00:00Z"
                filtered = [r for r in filtered if r.started_at >= start_dt]
            except Exception:
                pass

        if started_to:
            try:
                # end of day if YYYY-MM-DD
                end_dt = started_to if "T" in started_to else f"{started_to}T23:59:59Z"
                filtered = [r for r in filtered if r.started_at <= end_dt]
            except Exception:
                pass

        # Text search across prompt (case-insensitive, whitespace trimmed)
        if search:
            query = search.strip().lower()
            filtered = [r for r in filtered if query in r.prompt.strip().lower()]

        # Tool filter (matches runs containing a step using that tool)
        if tool:
            filtered = [
                r for r in filtered if any(s.tool == tool for s in r.steps)
            ]

        # Sorting
        is_desc = (sort_order.lower() == "desc")

        if sort_by == "duration_ms":
            # Null duration_ms must sort last regardless of asc/desc
            def key_fn(r: Run):
                val = r.duration_ms
                if val is None:
                    return (1, 0)
                return (0, -val if is_desc else val)
            filtered = sorted(filtered, key=key_fn)

        elif sort_by == "cost_usd":
            # Null cost_usd must sort last regardless of asc/desc
            def key_fn(r: Run):
                val = r.cost_usd
                if val is None:
                    return (1, 0)
                return (0, -val if is_desc else val)
            filtered = sorted(filtered, key=key_fn)

        else:
            # Default to started_at
            def key_fn(r: Run):
                return r.started_at
            filtered = sorted(filtered, key=key_fn, reverse=is_desc)

        # Pagination calculations
        total = len(filtered)
        page = max(1, page)
        page_size = max(1, min(500, page_size))
        total_pages = max(1, (total + page_size - 1) // page_size)

        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        paginated_items = filtered[start_idx:end_idx]

        # Transform to RunSummary without full steps array
        summaries = [
            RunSummary(
                id=r.id,
                agent=r.agent,
                model=r.model,
                status=r.status,
                started_at=r.started_at,
                ended_at=r.ended_at,
                duration_ms=r.duration_ms,
                input_tokens=r.input_tokens,
                output_tokens=r.output_tokens,
                cost_usd=r.cost_usd,
                prompt=r.prompt,
                error=r.error,
                tenant_id=r.tenant_id,
                step_count=len(r.steps),
            )
            for r in paginated_items
        ]

        return PaginatedRunsResponse(
            items=summaries,
            page=page,
            page_size=page_size,
            total=total,
            total_pages=total_pages,
        )


# Global singleton dataset store instance
dataset_store = DatasetStore()
