# Mentor Agent Runtime

## Product contract

Mentor is one evidence-seeking teaching agent, not four role labels. It observes a public verdict and the learner's code, chooses tools, inspects tool results, replans, asks one prediction question, observes the edit, and stops when the current learning goal is reached. A judge verdict is immutable. Static findings and generated cases stay `unverified` until execution against a reviewed expected output supports them.

```text
public verdict + code
  -> AST / CFG / def-use inspection
  -> trusted corpus retrieval
  -> bounded candidate generation
  -> reviewed differential execution when available
  -> learner state prediction
  -> minimum necessary edit
  -> rerun observation
  -> different same-skill transfer task
  -> independent transfer verification
```

## Runtime architecture

- `code-parser.ts` uses Tree-sitter grammars for JavaScript, Python, Java, and C++. Parser errors are returned as evidence instead of being hidden.
- `code-intelligence.ts` builds a bounded language-neutral control-flow graph, def-use summary, structural hypotheses, runtime probe plans, diagnostic source copies, candidate inputs, and differential verification results. `semantic-analysis.ts` adds named function scopes, direct call edges, dominators, reaching definitions, and unverified path risks with `structural-interprocedural` precision.
- Runtime instrumentation executes a disposable copy and writes bounded JSON state traces to `stderr`. Each probe includes at most three conservatively visible expressions; `runtime-trace.ts` validates and parses only the Mentor trace schema. The learner's original source remains the only source used for the formal verdict.
- `mentor-tools.ts` defines seven strictly validated tools. Unknown tools, extra arguments, repeated actions, and exhausted step budgets are rejected.
- `mentor-engine.ts` runs at most eight observe/act steps. The model chooses tools and arguments, receives tool results, replans, can report missing evidence, and must explicitly ask or finish. A malformed or invalid tool action is returned to the model as a rejected tool result so it can correct itself; three rejected actions, provider failure, or an exhausted step budget triggers the deterministic evidence fallback and remains visible in the timeline.
- `deepseek-provider.ts` uses the OpenAI-compatible DeepSeek chat-completion contract with tool calls. The API key is read only from the gateway environment.
- `postgres-mentor-store.ts` transactionally persists owner-scoped sessions and learner twins with restart durability and bounded retention. `mentor-store.ts` remains the explicitly labelled `file-local` adapter and can be migrated once into PostgreSQL.

## Learner digital twin

The twin stores per-skill Bayesian evidence, confidence, half-life, failure count, assisted/independent/transfer passes, assistance ratio, misconception beliefs, timestamps, and stable evidence references. Assisted success contributes less than independent success; transfer success contributes most. Time decay moves probability toward the explicit baseline while retaining the evidence history.

The twin is an auditable learning-state estimate, not a psychological profile and not a model-generated score. Every update includes an observation kind and evidence reference.

## Trusted retrieval and differential evidence

`npm run build:mentor-index` creates `content/mentor-index.json` from the complete corpus. The current index contains 754 problems and separate problem, solution, skill, and misconception documents. Retrieval combines Chinese characters/bigrams, BM25-style lexical scoring, skill and misconception relevance, and trust ranking.

Retrieval trust and expected-output authority are never collapsed. Expected outputs use four explicit authorities:

- `human-reviewed`: an exact input/output pair reviewed in `verified-public-cases.json`.
- `reference-consensus`: at least two different-language corpus solutions executed successfully on the exact input and every successful reference agreed.
- `candidate`: useful generated or extracted content that still requires execution/review.
- `unverified`: model or structural hypothesis only.

Reviewed public input/output pairs live in `content/verified-public-cases.json`. Exact input matching is required. When no reviewed case exists, the server-only reference-consensus oracle can execute up to four independent language solutions on demand. It requires at least two successful different-language executions, rejects every disagreement, caches by input/content digest, and returns provenance without exposing source code. Generated counterexamples without either authority remain unverified.

## API and UI

```text
POST /mentor/sessions
POST /mentor/sessions/:id/turns
GET  /mentor/sessions/:id?learnerId=...
POST /auth/anonymous
```

Requests accept only public problem fields, the learner's current code/attempt, and an optional learner response. Hidden tests, reference solutions, arbitrary model fields, and oversized input are rejected. Responses include a bounded session timeline, executed tool summaries, provider mode/model, token counts, and latency; secrets and hidden tests are never returned.

The problem workspace renders Mentor continuously beside the editor. Its timeline states what was observed, the current hypothesis, missing evidence, tools/tests run, the minimum next change, and whether the change was verified. Prediction and reflection controls are inline, not hidden in a separate AI tab. If the service is unavailable, the UI labels the result `本地静态回退 · 未验证` and does not invent a model diagnosis.

## Configuration

Gateway-only environment variables:

```dotenv
DEEPSEEK_API_KEY=server-side-secret
DEEPSEEK_API_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash
MENTOR_DATA_FILE=/data/mentor.json
MENTOR_PG_HOST=db
MENTOR_PG_PORT=5432
MENTOR_AUTH_SECRET=at-least-32-random-characters
```

Browser-visible API locations:

```powershell
$env:VITE_RUNNER_URL='http://127.0.0.1:8787'
$env:VITE_LEARNING_API_URL='http://127.0.0.1:8787'
```

Never put the DeepSeek key or Mentor signing secret in a `VITE_` variable or static build. With `MENTOR_AUTH_SECRET` configured, the browser exchanges its persistent device learner ID for an expiring HMAC-SHA256 credential; every Mentor and learner-state request must present a matching subject. Without the secret, the health/UI contract reports `permissive-local` instead of pretending authentication exists.

## Local execution sandbox

The Compose stack runs JavaScript, Python, Java, and C++ through Judge0 rather than evaluating learner code in the browser or gateway process. Docker Desktop uses cgroups v2, so the local profile enables Judge0's per-process time and memory limits instead of the legacy cgroup-v1 path. Requests use a 5-second CPU limit, 10-second wall limit, and a 2 GB virtual-address ceiling; the latter is intentionally higher than a resident-memory cap because Node and the JVM reserve large address ranges.

`services/runner/judge0-language-tuning.sql` applies bounded Java heap, metaspace, and code-cache options after Judge0 seeds its language table. The gateway waits for this one-shot migration before accepting work. `RUNNER_ALLOWED_ORIGIN` is a comma-separated exact-origin allowlist, not a wildcard.

## Known limits

- Only eight public cases across four problems are human reviewed. On-demand consensus substantially expands executable coverage across the 722 problems with reference solutions, but compilation failures or disagreement correctly leave a candidate unresolved.
- Call graph, dominators, and reaching definitions are structural interprocedural evidence, not sound compiler-grade SSA, type, macro, pointer, or alias analysis.
- State tracing is bounded to eight probes and three conservatively visible expressions per probe; complex object graphs and expression side effects are intentionally excluded.
- Signed anonymous identity proves device-subject ownership, not a recoverable user account, organization role, or SSO identity.
- The DeepSeek loop is real and tool-driven, but its conclusions remain bounded by local validation, evidence trust, and execution availability.
