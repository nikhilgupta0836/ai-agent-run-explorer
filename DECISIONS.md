# Architecture & Design Decisions

This document outlines key technical decisions, dataset edge-case handling, and architectural trade-offs made during the development of the **Agent Run Explorer**.

---

## 1. Unpriced Runs (`cost_usd = null`)

### Findings & Dataset Reality
- Three runs in the dataset (`run_0008`, `run_0042`, `run_0153`) have `cost_usd: null`.

### Decision & Implementation
- **Meaning**: `null` signifies that pricing metadata was unavailable from the provider or the run did not execute billable LLM steps.
- **Aggregation**: Total cost calculations sum all non-null `cost_usd` values (`sum(r.cost_usd for r in agent_runs if r.cost_usd is not None)`). Null values are NOT silently replaced with `0.0`.
- **UI Transparency**: The UI explicitly displays `Unpriced` for records with `cost_usd: null` rather than `$0.0000`. Statistics cards and charts explicitly display the count of unpriced runs per agent and globally ("3 unpriced runs").
- **Sorting**: When sorting by `cost_usd`, `null` values are sorted at the end of the dataset regardless of `asc` or `desc` sort direction.

---

## 2. Active Runs (`status = "running"`)

### Findings & Dataset Reality
- Nine runs are currently `running` and therefore have `ended_at: null` and `duration_ms: null`.

### Decision & Implementation
- **Sorting**: Sorting by `duration_ms` sorts `null` duration records at the end of the list regardless of sort direction (`asc` or `desc`).
- **Success Rate**: `running` runs are **excluded from the success rate denominator**.
  - Formula: `success_rate = succeeded / (succeeded + failed + cancelled)`.
  - **Rationale**: A run that is currently in progress has neither succeeded nor failed. Including running runs in the denominator would artificially lower the success rate metric.

---

## 3. Broken / Irregular Record (`run_0089`)

### Problematic Record Identification
- **Record**: `run_0089` (Line 1 in JSONL dataset).
- **Issue**: `status: "failed"`, `error.step_index: 3`, but `steps: []` (empty list).

### Naive Loader Risk
- A naive backend or frontend loader that attempts to access `run.steps[run.error.step_index]` (e.g. `run.steps[3]`) without bounds checking will crash with an unhandled `IndexError` / `TypeError`.

### Handling Strategy
- The Pydantic model defaults `steps` to `List[Step] = []` and `step_index` to `Optional[int]`.
- Both backend and frontend perform safe bounds checks (`0 <= step_index < len(steps)`) before referencing step array elements.
- The UI safely renders the failure diagnostic card with the step index indicator while rendering a "No steps recorded" banner for the empty steps array.

---

## 4. Percentile Method & Global Stats (P95)

### Global vs Filtered Stats
- **Decision**: Dashboard statistics (`/api/stats`) are **global** across the entire 201-run dataset and do not change based on list page filters (`/runs`).
- **Rationale**: The dashboard provides high-level system observability across the entire platform. A banner on `/dashboard` explicitly notes: *"Global statistics (unfiltered)"*.

### P95 Percentile Method
- **Method**: Standard linear interpolation percentile over completed valid runs (`duration_ms is not None and duration_ms >= 0`).
  - Formula: `idx = (n - 1) * (p / 100.0)` with linear interpolation `(1 - weight) * data[floor] + weight * data[ceil]`.
  - Excludes `running` runs (`null`) and invalid negative duration runs (`run_0064`).
- **Result on dataset**: Median = **23,593.0 ms** (23.6s), P95 = **41,265.4 ms** (41.3s).

---

## 5. Duplicate ID Handling (`run_0031`)

### Dataset Reality
- Record ID `run_0031` appears twice in `data/runs.jsonl`: Line 75 (`status: succeeded`) and Line 187 (`status: running`).

### Decision & Implementation
- **Storage**: The loader maintains both raw records in memory (`List[Run]`).
- **List API (`GET /api/runs`)**: Both records are included in the list output, total count (201), and pagination.
- **Detail API (`GET /api/runs/{id}`)**: Returns `409 Conflict` with message *"Multiple records exist for ID 'run_0031' in the dataset. Request is ambiguous."* to prevent returning arbitrary data.

---

## 6. Negative Duration Handling (`run_0064`)

### Dataset Reality
- `run_0064` has `duration_ms: -4000` because `ended_at` (`17:28:35Z`) precedes `started_at` (`17:28:39Z`).

### Decision & Implementation
- **Source Data**: Preserved as `-4000` ms in source dataset and list views.
- **Analytics**: Explicitly filtered out (`duration_ms >= 0`) when computing median and P95 statistics.

---

## 7. Frontend Test Strategy & Trade-offs

### Strategy Overview
- Unit & integration test coverage was prioritized for backend dataset loading, composed filters, percentiles, streaming, and edge cases (`pytest` suite with 100% pass rate).
- **Highest-Value Frontend Test**: An end-to-end Cypress or Playwright test validating:
  1. URL search parameter persistence upon page refresh (`/runs?status=failed&agent=support-router`).
  2. Keyboard navigation (`ArrowDown`, `ArrowUp`, `Enter`).
  3. Progressive text rendering from `POST /api/runs/{id}/explain`.

---

## 8. Future Improvements (With Another Day)

1. **Database Indexing**: Transition from in-memory list filtering to PostgreSQL / SQLite indexed JSONB queries for handling millions of records.
2. **Server-Sent Events (SSE)**: Standardize streaming explain endpoint to explicit `text/event-stream` SSE events.
3. **Table Virtualization**: Implement `@tanstack/react-virtual` for smooth rendering of runs with 500+ steps or large list pages.
