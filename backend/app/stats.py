import math
from datetime import datetime, timedelta, date
from typing import List, Optional
from collections import defaultdict

from app.models import GlobalStats, AgentStats, DailyRunCount, Run
from app.data import dataset_store


def calculate_percentile(data: List[float], p: float) -> Optional[float]:
    """Calculate percentile using standard linear interpolation."""
    if not data:
        return None
    sorted_data = sorted(data)
    n = len(sorted_data)
    if n == 1:
        return float(sorted_data[0])
    idx = (n - 1) * (p / 100.0)
    floor_idx = int(math.floor(idx))
    ceil_idx = int(math.ceil(idx))
    if floor_idx == ceil_idx:
        return float(sorted_data[floor_idx])
    weight = idx - floor_idx
    return float((1.0 - weight) * sorted_data[floor_idx] + weight * sorted_data[ceil_idx])


def compute_global_stats() -> GlobalStats:
    runs = dataset_store.runs
    total_runs = len(runs)

    # Success rate calculation: exclude running runs from denominator
    terminal_runs = [r for r in runs if r.status in ("succeeded", "failed", "cancelled")]
    succeeded_runs = [r for r in runs if r.status == "succeeded"]
    overall_success_rate = (
        round(len(succeeded_runs) / len(terminal_runs), 4) if terminal_runs else 0.0
    )

    # Valid durations: exclude running runs (null) and invalid negative durations
    valid_durations = [
        r.duration_ms for r in runs if r.duration_ms is not None and r.duration_ms >= 0
    ]
    median_duration_ms = calculate_percentile(valid_durations, 50)
    p95_duration_ms = calculate_percentile(valid_durations, 95)

    if median_duration_ms is not None:
        median_duration_ms = round(median_duration_ms, 2)
    if p95_duration_ms is not None:
        p95_duration_ms = round(p95_duration_ms, 2)

    # Count overall unpriced runs
    unpriced_runs_count = sum(1 for r in runs if r.cost_usd is None)

    # Per agent stats
    agent_groups = defaultdict(list)
    for r in runs:
        agent_groups[r.agent].append(r)

    agent_stats: List[AgentStats] = []
    # Sort agents alphabetically for consistent UI presentation
    for agent_name in sorted(agent_groups.keys()):
        agent_runs = agent_groups[agent_name]
        a_total = len(agent_runs)
        a_succ = sum(1 for r in agent_runs if r.status == "succeeded")
        a_fail = sum(1 for r in agent_runs if r.status == "failed")
        a_canc = sum(1 for r in agent_runs if r.status == "cancelled")
        a_runn = sum(1 for r in agent_runs if r.status == "running")

        a_terminal = a_succ + a_fail + a_canc
        a_rate = round(a_succ / a_terminal, 4) if a_terminal > 0 else 0.0

        a_cost = round(
            sum(r.cost_usd for r in agent_runs if r.cost_usd is not None), 6
        )
        a_unpriced = sum(1 for r in agent_runs if r.cost_usd is None)

        agent_stats.append(
            AgentStats(
                agent=agent_name,
                total_runs=a_total,
                succeeded_runs=a_succ,
                failed_runs=a_fail,
                cancelled_runs=a_canc,
                running_runs=a_runn,
                success_rate=a_rate,
                total_cost_usd=a_cost,
                unpriced_runs=a_unpriced,
            )
        )

    # Daily run counts over entire continuous dataset range
    # Dataset range: 2026-07-20 to 2026-08-31
    date_counts = defaultdict(int)
    for r in runs:
        day_str = r.started_at[:10]  # YYYY-MM-DD
        date_counts[day_str] += 1

    start_date = date(2026, 7, 20)
    end_date = date(2026, 8, 31)

    daily_runs: List[DailyRunCount] = []
    curr = start_date
    while curr <= end_date:
        d_str = curr.isoformat()
        daily_runs.append(
            DailyRunCount(
                date=d_str,
                count=date_counts.get(d_str, 0),
            )
        )
        curr += timedelta(days=1)

    return GlobalStats(
        total_runs=total_runs,
        overall_success_rate=overall_success_rate,
        median_duration_ms=median_duration_ms,
        p95_duration_ms=p95_duration_ms,
        unpriced_runs_count=unpriced_runs_count,
        agent_stats=agent_stats,
        daily_runs=daily_runs,
    )
