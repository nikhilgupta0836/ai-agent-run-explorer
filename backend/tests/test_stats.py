import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_hand_calculated_statistics():
    """Test 2: Check global statistics against hand-computed exact values from data/runs.jsonl."""
    response = client.get("/api/stats")
    assert response.status_code == 200
    stats = response.json()

    # 1. Total runs in dataset
    assert stats["total_runs"] == 201

    # 2. Overall success rate = 140 succeeded / 192 terminal runs = 0.7292
    assert stats["overall_success_rate"] == 0.7292

    # 3. Unpriced runs count (cost_usd == null)
    assert stats["unpriced_runs_count"] == 3

    # 4. P95 duration over 190 valid runs
    assert stats["p95_duration_ms"] == 41265.4

    # 5. Median duration over valid runs
    assert stats["median_duration_ms"] == 23593.0

    # 6. Continuous daily runs date range (2026-07-20 through 2026-08-31 = 43 days)
    daily = stats["daily_runs"]
    assert len(daily) == 43
    assert daily[0]["date"] == "2026-07-20"
    assert daily[-1]["date"] == "2026-08-31"

    # 7. Agent breakdown validation
    agents = {a["agent"]: a for a in stats["agent_stats"]}
    assert len(agents) == 5
    assert "contract-reviewer" in agents
    assert "invoice-extractor" in agents
