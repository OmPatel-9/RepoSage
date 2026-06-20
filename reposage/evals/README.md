# RepoSage Evals

> **Latest run (placeholder — run `pnpm evals:run` to generate real numbers):**
> Recall@5 — · Recall@10 — · Citation Precision — · Avg Quality —/5

Evals turn RepoSage from "works on my machine" into a measurable system. This
directory contains the golden dataset, runner, and all historical results.

---

## Dataset

**30 hand-written cases across three real-world repos:**

| Repo                                                  | Questions | Focus                                                         |
| ----------------------------------------------------- | --------- | ------------------------------------------------------------- |
| [sindresorhus/is](https://github.com/sindresorhus/is) | 10        | Small Node/TS library — type predicates, namespace assembly   |
| [colinhacks/zod](https://github.com/colinhacks/zod)   | 10        | Medium TS library — schema internals, error types, transforms |
| [pallets/flask](https://github.com/pallets/flask)     | 10        | Python web framework — routing, contexts, blueprints, CLI     |

Each case in `src/evals/dataset.ts` has:

```ts
type EvalCase = {
  id: string // "is-01", "zod-03", "flask-07", etc.
  repo: string // GitHub URL — cloned and indexed automatically
  question: string // Realistic question a developer would ask
  expectedFiles: string[] // Repo-relative paths the answer MUST cite
  idealAnswer: string // 2-3 sentence rubric for the LLM judge
}
```

### Adding cases

1. Open `src/evals/dataset.ts`.
2. Add a new `EvalCase` object to the appropriate array (or create a new one
   for a new repo).
3. Set `expectedFiles` to the repo-relative paths you expect the answer to
   cite. You can find actual paths by browsing the GitHub repo or, after
   indexing, by querying `SELECT DISTINCT file_path FROM chunks WHERE repo_id = '...'`.
4. Write a 2-3 sentence `idealAnswer` rubric (what a 5/5 answer covers —
   _not_ the exact text).
5. Re-run `pnpm evals:run`.

### Choosing expected files

`expectedFiles` should list the files whose content is _necessary_ for a
correct answer — not every file that's tangentially related. One or two files
is usually right; five or more is a smell that the question is too broad.

---

## Metrics

### Retrieval

| Metric        | Formula | Interpretation          |
| ------------- | ------- | ----------------------- | --- | -------- | --- | ----------------------------------------------------------------- |
| **Recall@5**  | `       | expected ∩ top-5 files  | /   | expected | `   | Can the retriever find the right files in the first five results? |
| **Recall@10** | `       | expected ∩ top-10 files | /   | expected | `   | Same, with a wider net.                                           |

"A file appears in top-k" if **any chunk** from that file ranks in the top-k
by cosine similarity. We use file-level recall because the answer needs the
right file, not necessarily the exact chunk.

### Answer quality

| Metric                     | Formula   | Interpretation                         |
| -------------------------- | --------- | -------------------------------------- | --- | ---------------- | --- | ------------------------------------------------------------------------------ |
| **Citation Precision**     | `         | cited files that exist in DB           | /   | unique citations | `   | Are the model's `[file:L-L]` references real files that were actually indexed? |
| **Expected File Coverage** | `         | expected files cited                   | /   | expected         | `   | Does the final answer actually reference the files we expected?                |
| **Accuracy** (1-5)         | LLM judge | Factual correctness against the rubric |
| **Completeness** (1-5)     | LLM judge | Coverage of key rubric points          |
| **Conciseness** (1-5)      | LLM judge | Tight, focused prose vs. padding       |

### Latency

- **p50** and **p95** are computed over all passing cases (error cases excluded).
- Latency = wall-clock time from first `searchChunks` call to end of
  `complete()` (does not include LLM judge time, which runs separately).

---

## Running evals

### Prerequisites

- Docker services running: `docker compose up -d`
- `.env.local` configured (same as normal development). At minimum:
  `DATABASE_URL`, `GROQ_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`.
- If you don't have Clerk/Posthog keys available, prefix the command:
  `SKIP_ENV_VALIDATION=1 pnpm evals:run`

### Run

```bash
pnpm evals:run
```

**First run** clones and indexes all three repos (15-30 min total). Subsequent
runs skip repos already in the DB with `status = 'ready'`. Re-index a repo
by deleting it from the `repos` table:

```sql
DELETE FROM repos WHERE github_url = 'https://github.com/owner/name';
```

### Output

Results are written to `evals/results/YYYY-MM-DD.md`. A summary is also
printed to stdout.

---

## Reading results

### Summary table

The top-level table shows averages across all 30 cases. Track these over time
to detect regressions.

| Column             | Good  | Needs work |
| ------------------ | ----- | ---------- |
| Recall@5           | ≥ 70% | < 50%      |
| Recall@10          | ≥ 85% | < 65%      |
| Citation Precision | ≥ 90% | < 75%      |
| Expected Coverage  | ≥ 60% | < 40%      |
| Accuracy           | ≥ 4.0 | < 3.0      |

### Per-repo breakdown

Averages split by repo, letting you spot whether a regression is
retrieval-wide or language/repo-specific (e.g. "Python recall is fine but
TypeScript recall dropped after a chunking change").

### Per-case table

Individual case metrics. Sort by Recall@5 = 0% or Accuracy < 3 to find the
worst cases; those also appear in the **Failures** section.

### Failures section

Any case where `recall@5 = 0` OR `accuracy < 3` OR `completeness < 3` is
flagged. The section shows the question, scores, and the judge's brief
reasoning. Use this as a triage queue when improving retrieval or prompts.

---

## Architecture notes

- **Indexing** calls `handleIndexRepo` directly (bypassing BullMQ) so evals
  can run without Redis or the worker process.
- **Rate limiting** is bypassed via `skipRateLimit: true` on all `complete()`
  calls.
- **Eval user** — a synthetic user row (`clerk_id = 'eval_system'`) is inserted
  once and reused. API usage is still logged so token costs are tracked.
- **LLM judge** uses the `smart` model tier with a structured-output Zod
  schema to produce consistent 1-5 scores.

---

## Results history

| Date                      | R@5 | R@10 | Cit.Prec | Accuracy | Notes |
| ------------------------- | --- | ---- | -------- | -------- | ----- |
| _(run evals to populate)_ | —   | —    | —        | —        | —     |
