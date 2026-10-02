# Oraczen AI — Agent Run Explorer

A full-stack monitoring and debugging dashboard for AI-agent executions built with **Python (FastAPI)** and **Next.js (App Router, TypeScript, Tailwind CSS, Recharts)**.

---

## Project Overview

The **Agent Run Explorer** allows support engineers, developers, and platform operators to inspect, filter, search, and analyze execution traces across 201 agent runs stored in `data/runs.jsonl`.

### Key Features
- **Run Explorer (`/runs`)**: Server/Client list view with URL search param synchronization (`status`, `agent`, `started_from`, `started_to`, `search`, `tool`, `sort_by`, `sort_order`, `page`), debounced search, tool filter, keyboard navigation (`↑` `↓` `Enter`), and visible request latency indicator.
- **Run Inspection (`/runs/[id]`)**: Deep-dive execution detail displaying step breakdowns, expandable cards, deep linking to steps (`#step-3`), error diagnostics, and streaming AI explanations.
- **Progressive Streaming Explanation**: `POST /api/runs/{id}/explain` streams progressive natural language analysis using a mock provider without external API keys.
- **Global Dashboard (`/dashboard`)**: Aggregate KPI cards and continuous timeline charts powered by global backend analytics.
- **Edge-Case Safety**: Robust handling for duplicate IDs (`409 Conflict`), unpriced runs (`cost_usd: null`), running runs (`null` duration), negative duration (`run_0064`), and irregular empty-step records (`run_0089`).

---

## Tech Stack & Architecture

```
Browser (Next.js Frontend @ http://localhost:3000)
    ↓ HTTP REST / Streaming
FastAPI Backend (@ http://localhost:8000)
    ↓ In-memory JSONL Loader
data/runs.jsonl (201 records preserved untouched)
```

- **Backend**: Python 3.9+, FastAPI, Pydantic v2, Uvicorn, Pytest.
- **Frontend**: Next.js 14+ (App Router), React 19, TypeScript, Tailwind CSS, Recharts, Lucide React.

---

## Requirements

Ensure you have installed:
- **Python**: `3.9` or higher
- **Node.js**: `18.0.0` or higher
- **npm**: `9.0.0` or higher

---

## Quick Start (Clean Machine Instructions)

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI server on port 8000
uvicorn app.main:app --reload --port 8000
```

The backend server will start at **`http://localhost:8000`**.

### 2. Frontend Setup

In a new terminal window:

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start Next.js development server on port 3000
npm run dev
```

The frontend application will start at **`http://localhost:3000`**.

---

## Application URLs

| Service / View | URL |
| --- | --- |
| **Frontend Run Explorer** | [http://localhost:3000/runs](http://localhost:3000/runs) |
| **Frontend Metrics Dashboard** | [http://localhost:3000/dashboard](http://localhost:3000/dashboard) |
| **Backend API Root** | [http://localhost:8000](http://localhost:8000) |
| **Swagger API Docs** | [http://localhost:8000/docs](http://localhost:8000/docs) |

---

## Running Tests

### Backend Test Suite (Pytest)

Run backend unit tests verifying composed filters, hand-calculated statistics assertions, 404/409 duplicate ID handling, and sorting:

```bash
cd backend
source .venv/bin/activate
PYTHONPATH=. pytest -v tests/
```

### Frontend Typecheck & Production Build

Verify frontend TypeScript types and production build:

```bash
cd frontend
npm run build
```

---

## Environment Variables

See `.env.example` for all configurable environment variables:

| Variable | Default | Description |
| --- | --- | --- |
| `EXPLAIN_PROVIDER` | `mock` | Selects streaming explanation provider (`mock`) |
| `PORT` | `8000` | Backend server port |
| `CORS_ORIGINS` | `http://localhost:3000` | Allowed CORS origins |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend API base URL for frontend |

---

## Dataset Edge-Case Summary

1. **Duplicate ID (`run_0031`)**: Retained in list views; detail endpoint returns `409 Conflict`.
2. **Negative Duration (`run_0064`)**: Preserved in raw dataset; excluded from duration stats calculations.
3. **Running Runs (9 records)**: Sorted after numeric durations; excluded from success rate denominator.
4. **Unpriced Runs (3 records)**: Sums known costs; explicitly tags `Unpriced` in UI.
5. **Irregular Record (`run_0089`)**: Safe bounds checking prevents `IndexError`; renders "No steps recorded."
