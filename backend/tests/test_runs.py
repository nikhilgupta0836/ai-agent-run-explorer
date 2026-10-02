import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_composed_filters():
    """Test 1: Prove two filters compose correctly (status + agent)."""
    # Fetch runs matching status=failed AND agent=support-router
    response = client.get("/api/runs?status=failed&agent=support-router&page_size=100")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 11
    for item in data["items"]:
        assert item["status"] == "failed"
        assert item["agent"] == "support-router"

    # Multi-value filter composition: status=(failed, cancelled) & agent=(support-router, kpi-analyst)
    res_multi = client.get(
        "/api/runs?status=failed&status=cancelled&agent=support-router&agent=kpi-analyst&page_size=100"
    )
    assert res_multi.status_code == 200
    data_multi = res_multi.json()
    assert data_multi["total"] == 22
    for item in data_multi["items"]:
        assert item["status"] in ("failed", "cancelled")
        assert item["agent"] in ("support-router", "kpi-analyst")


def test_run_detail_and_edge_cases():
    """Test 3: Detail endpoint, 404, 409 duplicate ID, empty steps, and sorting with nulls."""
    # 1. Valid single run detail
    res_valid = client.get("/api/runs/run_0003")
    assert res_valid.status_code == 200
    valid_data = res_valid.json()
    assert valid_data["id"] == "run_0003"
    assert len(valid_data["steps"]) == 4

    # 2. 404 Not Found
    res_404 = client.get("/api/runs/run_nonexistent_9999")
    assert res_404.status_code == 404
    assert "not found" in res_404.json()["detail"].lower()

    # 3. 409 Conflict for duplicate ID (run_0031)
    res_409 = client.get("/api/runs/run_0031")
    assert res_409.status_code == 409
    assert "multiple records" in res_409.json()["detail"].lower()

    # 4. Irregular record with empty steps (run_0089)
    res_89 = client.get("/api/runs/run_0089")
    assert res_89.status_code == 200
    data_89 = res_89.json()
    assert data_89["id"] == "run_0089"
    assert data_89["status"] == "failed"
    assert data_89["steps"] == []
    assert data_89["error"]["step_index"] == 3  # step index out of bounds handled safely

    # 5. Null sorting test: duration_ms desc puts nulls last
    res_sort = client.get("/api/runs?sort_by=duration_ms&sort_order=desc&page_size=201")
    assert res_sort.status_code == 200
    items = res_sort.json()["items"]

    # The last items should be the running ones with duration_ms == null
    null_durations = [i for i in items if i["duration_ms"] is None]
    assert len(null_durations) == 10
    assert items[-1]["duration_ms"] is None

    # Check non-null durations are descending
    non_null_durs = [i["duration_ms"] for i in items if i["duration_ms"] is not None]
    assert non_null_durs == sorted(non_null_durs, reverse=True)


def test_text_search_and_tool_filter():
    """Test text search and tool filter."""
    # Case insensitive search
    res_search = client.get("/api/runs?search=OUTAGE")
    assert res_search.status_code == 200
    data_search = res_search.json()
    assert data_search["total"] > 0
    for item in data_search["items"]:
        assert "outage" in item["prompt"].lower()

    # Tool filter
    res_tool = client.get("/api/runs?tool=vector_search&page_size=100")
    assert res_tool.status_code == 200
    assert res_tool.json()["total"] > 0
