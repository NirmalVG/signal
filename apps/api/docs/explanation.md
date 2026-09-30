# Signal — Feature Documentation

Signal is an AI-powered codebase Q&A system that lets developers ask natural-language questions about their codebase and receive cited, verified answers backed by the actual source code. It combines modern RAG (Retrieval-Augmented Generation) techniques with code-aware chunking, semantic search, and LLM-based answer generation.

---

## Architecture Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   FastAPI Backend│────▶│   Supabase      │
│   (Next.js)     │     │   (Python)       │     │   (PostgreSQL   │
│                 │     │                  │     │    + pgvector)  │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                              │
                              ▼
                     ┌──────────────────┐
                     │  External APIs   │
                     │  • Voyage AI     │
                     │  • Groq (LLM)    │
                     └──────────────────┘
```

---

## Core Features

### 1. Repository Ingestion Pipeline

**Endpoint:** `POST /api/ingest`

Upload a codebase as a `.zip` file for processing and indexing.

**Workflow:**
1. **Upload & Validation** — Accepts `.zip` files up to 200MB
2. **Safe Extraction** — Extracts to isolated directory with path traversal protection
3. **Repo Registration** — Creates entry in `repos` table with status tracking
4. **Background Indexing** — Non-blocking async processing via FastAPI `BackgroundTasks`

**Status Transitions:**
```
processing → extracted → indexing → indexed
                    ↘ failed (on any error)
```

**Security Features:**
- Path traversal protection during zip extraction
- File size limits (200MB max)
- Isolated extraction per repo (UUID-based directories)
- Automatic cleanup of uploaded zip after extraction

---

### 2. Multi-Strategy Code Chunking

**Location:** `app/services/chunker.py`

Signal uses **dual chunking strategies** for code and **paragraph-aware chunking** for documentation.

#### Code Files (`.py`, `.js`, `.jsx`, `.ts`, `.tsx`, `.go`)

| Strategy | Description | Use Case |
|----------|-------------|----------|
| **Semantic** (`code_semantic`) | One chunk per function/class via Tree-sitter AST parsing | Precise retrieval of specific definitions |
| **Window** (`code_window`) | Fixed 200-line non-overlapping slices across entire file | Context for large functions, cross-reference lookup |

**Why Dual Strategy?**
- Semantic chunks capture *intent* (function signatures, class definitions)
- Window chunks capture *context* (implementation details, surrounding code)
- Together they maximize retrieval recall for diverse query types

#### Documentation Files (`.md`, `.mdx`, `.txt`)

- **Paragraph-merged chunking** — Paragraphs merged until ~1500 chars (min 200)
- Preserves approximate line numbers for citations
- Handles consecutive blank lines gracefully

#### Ignored Directories
`.git`, `node_modules`, `dist`, `build`, `.next`, `vendor`, `__pycache__`

---

### 3. Tree-sitter AST Parsing

**Location:** `app/services/parser.py`

Uses `tree-sitter-language-pack` for language-agnostic AST parsing.

**Supported Languages & Definitions:**

| Language | Extensions | Definition Types Extracted |
|----------|------------|---------------------------|
| Python | `.py` | `function_definition`, `class_definition` |
| JavaScript | `.js`, `.jsx` | `function_declaration`, `class_declaration`, `method_definition` |
| TypeScript | `.ts` | `function_declaration`, `class_declaration`, `method_definition` |
| TSX | `.tsx` | `function_declaration`, `class_declaration`, `method_definition` |
| Go | `.go` | `function_declaration`, `method_declaration`, `type_declaration` |

**Output per Definition:**
```json
{
  "type": "function_definition",
  "name": "calculate_total",
  "start_line": 42,
  "end_line": 67
}
```

---

### 4. Vector Embeddings with Voyage AI

**Location:** `app/services/embedder.py`

**Model:** `voyage-code-3` (1024 dimensions)
**Batch Size:** 128 texts per API call

**Critical Design Decision — Asymmetric Embedding:**
| Context | `input_type` | Why |
|---------|--------------|-----|
| Stored chunks (documents) | `"document"` | Optimized for corpus-side representation |
| User queries | `"query"` | Optimized for question-side representation |

Voyage's models are trained asymmetrically — using the same encoding for both hurts retrieval quality. Signal explicitly distinguishes these at both indexing and query time.

---

### 5. Vector Search with pgvector

**Location:** `app/services/indexer.py` — `search_chunks()`

**Database:** Supabase (PostgreSQL + pgvector)
**RPC Function:** `match_chunks` (server-side similarity search)

**Search Parameters:**
- `match_count`: 5 (configurable)
- `SIMILARITY_FLOOR`: 0.3 — chunks below this are discarded before LLM context

**Retrieval Flow:**
1. Embed user question as `"query"`
2. Call `match_chunks` RPC with repo_id + query embedding
3. Filter by similarity ≥ 0.3
4. Return top chunks with metadata (file_path, lines, kind, similarity score)

---

### 6. Cited Answer Generation

**Location:** `app/services/answering.py`

**LLM:** Groq — `openai/gpt-oss-120b`
**Temperature:** 0.2 (low for factual consistency)

**System Prompt Enforces:**
- Only use provided context — no hallucination
- **Exact citation format:** `[file_path:line_number]` (plain ASCII brackets)
- No invention of file paths, line numbers, or function names
- Explicit "I don't know" when context insufficient

**Citation Validation Pipeline:**
1. Extract all citations from model output (matches ASCII `[...]` OR full-width `【...】`)
2. Verify every cited path exists in retrieved chunks
3. **Retry once** with stricter reminder if invalid citations found
4. **Normalize** full-width brackets → ASCII brackets in final output
5. Fail gracefully if still invalid after retry

**Response Structure:**
```json
{
  "answer": "The root layout... [app/layout.tsx:20]",
  "context": [
    {
      "file_path": "app/layout.tsx",
      "line_number": 20,
      "end_line": 35,
      "text": "...",
      "kind": "code_semantic",
      "similarity": 0.87
    }
  ],
  "confidence": 0.87,
  "latency_ms": 1247
}
```

**Query Logging:** All queries logged to `queries` table with SHA-256 hash of answer for deduplication/analytics.

---

### 7. Repository Management

**Endpoints:**
- `GET /api/repos` — List all repositories (newest first)
- `GET /api/repos/{repo_id}/status` — Get detailed status for one repo

**Repo Schema (Supabase `repos` table):**
```sql
id              UUID PRIMARY KEY
name            TEXT
status          TEXT  -- processing | extracted | indexing | indexed | failed
ingested_at     TIMESTAMPTZ NULLABLE
```

---

### 8. Health Check

**Endpoint:** `GET /api/health`

Verifies database connectivity by querying `repos` table.
Returns:
```json
{
  "status": "ok",
  "db_reachable": true,
  "sample_count": 0
}
```

---

## Frontend Features (Next.js)

**Location:** `apps/web/app/page.tsx`

### Upload Flow
- Drag-and-drop / file picker for `.zip`
- Real-time status polling (2s interval) via `/api/repos/{id}/status`
- Visual status badges with color coding
- Auto-refresh repo list on completion

### Query Interface
- Disabled until repo status = `indexed`
- Question input with placeholder examples
- Loading states and error handling

### Answer Display
- **Rendered citations** — `[file:line]` converted to styled chips
- **Confidence & latency** metrics display
- **Expandable source panels** — Each citation shows:
  - File path + line range
  - Similarity score badge
  - Syntax-highlighted code snippet (via `<pre><code>`)

### Repository History
- Sidebar listing all previously indexed repos
- Click to select and query any indexed repo
- Status badges reflect current state

---

## Configuration

**Environment Variables** (`.env` in `apps/api`):

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (bypasses RLS) |
| `GROQ_API_KEY` | Groq API key for LLM |
| `VOYAGE_API_KEY` | Voyage AI API key for embeddings |
| `SIGNAL_API_KEY` | Reserved for future auth |

**Constants (in code):**
- `MAX_UPLOAD_BYTES` = 200MB
- `CODE_WINDOW_SIZE` = 200 lines
- `DOC_CHUNK_MIN_CHARS` = 200
- `DOC_CHUNK_MAX_CHARS` = 1500
- `INSERT_BATCH_SIZE` = 100 (Supabase inserts)
- `EMBEDDING_BATCH_SIZE` = 128 (Voyage API)
- `MAX_CONTEXT_CHUNKS` = 5 (LLM context window)
- `SIMILARITY_FLOOR` = 0.3

---

## Data Flow Summary

### Ingestion
```
POST /api/ingest (.zip)
    │
    ▼
Save zip → Extract safely → Register repo (status=processing)
    │
    ▼
status=extracted → BackgroundTasks.add_task(run_indexing)
    │
    ▼
run_indexing():
    status=indexing
    chunk_repo() ──────────────▶ chunks (semantic + window + doc)
    embed_texts(input_type="document")
    Batch insert into `chunks` table
    status=indexed + ingested_at
```

### Query
```
POST /api/query { repo_id, question }
    │
    ▼
embed_texts([question], input_type="query")
    │
    ▼
match_chunks RPC (vector similarity search)
    │
    ▼
Filter similarity ≥ 0.3
    │
    ▼
Build context string with citations
    │
    ▼
Groq LLM (gpt-oss-120b) with strict system prompt
    │
    ▼
Validate citations → Retry once if needed → Normalize brackets
    │
    ▼
Log to `queries` table → Return answer + context + metrics
```

---

## Design Principles

1. **Citations First** — Every claim must be traceable to source code
2. **No Hallucination** — Explicit "I don't know" preferred over guessing
3. **Async by Default** — Ingestion never blocks API; polling for status
4. **Dual Chunking** — Semantic + window maximizes recall for code
5. **Asymmetric Embeddings** — Correct `input_type` for documents vs queries
6. **Defensive Output** — Validate + normalize LLM citations, don't trust prompt alone
7. **Observable** — Structured logging, latency metrics, query history

---

## Future Extensibility Points

| Area | Possible Enhancement |
|------|---------------------|
| Auth | Per-user repo isolation, API keys |
| Chunking | Add more languages (Rust, Java, C#), regex fallback |
| Retrieval | Hybrid search (BM25 + vector), reranking |
| Answering | Streaming responses, multi-hop reasoning |
| UI | Code navigation, diff view, conversation history |
| Indexing | Incremental updates, git-aware chunking |

---

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/ingest` | Upload `.zip`, start indexing |
| `GET` | `/api/repos` | List all repositories |
| `GET` | `/api/repos/{id}/status` | Get repo status & metadata |
| `POST` | `/api/query` | Ask question about indexed repo |
| `GET` | `/api/health` | Health check |

---

## Error Handling

| Scenario | HTTP Status | Response |
|----------|-------------|----------|
| Non-zip upload | 400 | `"Only .zip files are accepted"` |
| File > 200MB | 413 | `"Archive too large"` |
| Invalid zip / path traversal | 400 | `"Unsafe path in archive: ..."` |
| Repo not found | 404 | `"Repo not found"` |
| Query before indexed | 400 | Handled frontend (input disabled) |
| LLM citation validation fail | 200 | Graceful fallback message |
| Supabase unavailable | 500 | Propagated from client |

---

*Generated from codebase analysis — Signal v1.0*