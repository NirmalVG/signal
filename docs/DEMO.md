# Demo script

Use this for interviews and screen recordings. Practise it once so the flow feels effortless.

## Before you start

1. Zip the Signal repository itself (exclude `node_modules`, `.next`, `.venv`, `data`).
2. Upload it and wait until the status dot is teal. Signal answering questions about its own code is the strongest demo: the interviewer can verify every citation.
3. Have the landing page open in one tab and the workspace in another.

## 60-second pitch

> Signal answers questions about a codebase and shows its receipts. It chunks code by function and class with tree-sitter, embeds it with Jina into pgvector, retrieves the closest chunks, and has the model answer from only that context. Then it checks that every file the model cites was actually retrieved. If not, it retries once, then falls back safely. Click any citation and you're reading the real file at the cited lines.

## The walkthrough (about 4 minutes)

**1. Landing page (30s).** Let the hero demo loop once. Point out that the card is the real chat UI, not a mock-up.

**2. Ask: "How does Signal stop the model from inventing citations?"**

- Show the shimmer, then the cited answer.
- Click a teal chip. The drawer opens on `answering.py`, scrolled to the cited lines.
- Mention the match badge: it's retrieval similarity, not a fake accuracy score.

**3. Ask: "How are repositories chunked for retrieval?"**

- Open the `chunker.py` citation. Talk about definition chunks plus 200-line windows and why both exist.

**4. Ask: "How does the file preview stay inside the repo folder?"**

- Open the `repos.py` citation. Talk about resolve-then-check, and mention the tests.

**5. Show the edges (30s).** Collapse the sidebar, resize the window to show the drawer becoming a sheet, delete a repo with the confirm dialog.

## Questions to expect, and honest answers

**Why pgvector instead of a dedicated vector database?**
The data is relational (repos, chunks, queries) and small. One database means transactional deletes and simpler operations. I'd revisit at much larger scale.

**Why validate citations by path, and what does that miss?**
It's a cheap, deterministic check against invented files. It doesn't verify line numbers or that a claim is true. A stronger version would check that the cited line range overlaps a retrieved chunk, or use an entailment check.

**What stops prompt injection from files in the uploaded repo?**
Not fully solved. The model has no tools or actions, so the blast radius is a misleading answer, not data exfiltration. Citations are validated against retrieved chunks, and the UI always shows the underlying source so a reader can check.

**How would you scale it?**
Move uploads to object storage, run indexing in a worker queue, add authentication and per-user repository ownership, and add rate limits.

**What would you build next?**
Streaming answers, multi-turn memory with conversation-aware retrieval, an evaluation set of question and expected-citation pairs to measure retrieval quality, and more AST languages.

## Do not claim

- That answers are "always correct" or "100% verified". Only cited file paths are checked.
- That it has user accounts or multi-user isolation. It doesn't.
- That its rate limits are production-grade. They are in-memory, which is right for one process and wrong for a scaled-out deployment.
