# 华为 OD 学习站第一版 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the retained Huawei OD materials into a searchable static learning site with browser-local progress and a separately deployable, constrained multi-language code runner.

**Architecture:** A Node content pipeline archives and normalizes source files into versioned JSON plus a search index. A Vite/React static site consumes only generated JSON and retains learning state in localStorage. A Node gateway validates run requests before forwarding them to a private Judge0 CE Docker Compose stack; browsers never contact Judge0, Redis, or PostgreSQL directly.

**Tech Stack:** Node.js 24, npm, TypeScript, Vite, React, Vitest, Cheerio, Mammoth, FlexSearch, Monaco Editor, Fastify, Docker Compose, Judge0 CE, Redis, PostgreSQL.

## Global Constraints

- Preserve every current source file under `archive/original/`; verify count and SHA-256 manifest before removing any original source-root copy.
- Serve the frontend as a static build; do not require user accounts, a database, or a server to read/search/track learning progress.
- Store all user learning state locally and provide versioned JSON export/import with validation.
- Permit code execution only for Java, Python, JavaScript, and C++; enforce code/input/output/time/memory/rate limits in the gateway.
- Do not expose Judge0, PostgreSQL, or Redis to a browser-facing port.
- Treat incomplete Word files as index-only records and source all recruiting-policy claims as non-official material.
- Use the bundled Node/npm runtime; add no Python project dependency.

---

## File Structure

```text
.gitignore                         Ignore dependencies, builds, archive, secrets and brainstorm artifacts
openspec/                          Project-local change specifications
archive/original/                  Immutable original material tree
content/problems/*.json            Generated normalized problem records
content/index.json                 Generated catalog, duplicate groups and search metadata
scripts/archive-sources.mjs        Copy + manifest source material safely
scripts/build-corpus.mjs           Parse, normalize, deduplicate and write corpus data
scripts/lib/*.mjs                  Parsing, IDs, metadata and validation units
scripts/tests/*.test.mjs           Pipeline unit tests and fixtures
web/                               Static React application
services/runner/gateway/           Fastify validation/proxy service
services/runner/docker-compose.yml Judge0 CE private service topology
services/runner/.env.example       Safe deploy-time configuration template
```

## Phase 1: Corpus and Static Learning Site

### Task 1: Initialize the project and specification baseline

**Files:**
- Create: `.gitignore`
- Create: `package.json`
- Create: `README.md`
- Create: `openspec/` via `openspec init --tools codex .`
- Modify: `openspec/changes/<change-id>/proposal.md`

**Interfaces:**
- Produces root npm scripts: `test`, `lint`, `typecheck`, `build:corpus`, `build:web`, `verify`.
- Produces an OpenSpec change named `build-huawei-od-learning-site` with requirements matching the approved design.

- [ ] **Step 1: Initialize Git and OpenSpec without adding raw material to version control**

Run:

```powershell
git init
openspec init --tools codex .
openspec new change build-huawei-od-learning-site
```

Expected: `.git/` and `openspec/changes/build-huawei-od-learning-site/` exist; no source material has been moved.

- [ ] **Step 2: Write the initial ignore rules and package contract**

Create `.gitignore` with these mandatory entries:

```gitignore
node_modules/
dist/
coverage/
archive/
content/problems/
.env
.superpowers/
```

Create root `package.json` with `"type": "module"`, Node `>=24`, and scripts that delegate to `scripts/build-corpus.mjs` and `web` npm scripts. Use `npm` rather than adding another package manager.

- [ ] **Step 3: Add a failing tooling contract test**

Create `scripts/tests/project-contract.test.mjs`:

```js
import { readFile } from 'node:fs/promises';
import { test, expect } from 'vitest';

test('root scripts expose the required verification commands', async () => {
  const pkg = JSON.parse(await readFile('package.json', 'utf8'));
  expect(pkg.scripts).toMatchObject({
    test: expect.any(String),
    typecheck: expect.any(String),
    'build:corpus': expect.any(String),
    'build:web': expect.any(String),
    verify: expect.any(String),
  });
});
```

- [ ] **Step 4: Install base tooling and make the contract pass**

Run:

```powershell
npm install -D vitest typescript eslint @eslint/js typescript-eslint
npm test -- scripts/tests/project-contract.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Document exact local commands**

Write `README.md` with prerequisites (Node 24 and Docker Desktop), the static-site commands, and a statement that code execution is unavailable until Phase 2 containers are started.

### Task 2: Archive source materials safely and generate a manifest

**Files:**
- Create: `scripts/archive-sources.mjs`
- Create: `scripts/lib/source-files.mjs`
- Create: `scripts/tests/source-files.test.mjs`
- Create: `archive/original/.manifest.json` (generated, ignored)

**Interfaces:**
- `listSourceFiles(root: string): Promise<SourceFile[]>`, where `SourceFile = { relativePath: string; size: number; sha256: string }`.
- `archiveSources({ root, archiveRoot, sourceRoots }): Promise<ArchiveManifest>` copies each material exactly once and refuses a mismatching existing archive file.

- [ ] **Step 1: Write the failing source-file test**

```js
test('archiveSources preserves relative paths and records content hashes', async () => {
  const manifest = await archiveSources({ root: fixtureRoot, archiveRoot, sourceRoots: ['set'] });
  expect(manifest.files).toEqual([
    expect.objectContaining({ relativePath: 'set/a.html', sha256: expect.any(String) }),
  ]);
  expect(await readFile(join(archiveRoot, 'set/a.html'), 'utf8')).toBe('<h1>A</h1>');
});
```

- [ ] **Step 2: Run the test and verify failure**

Run: `npm test -- scripts/tests/source-files.test.mjs`

Expected: FAIL because `archiveSources` is not exported.

- [ ] **Step 3: Implement copy-first archival**

Implement SHA-256 streaming, copy into `archive/original/`, and JSON manifest output. Exclude project directories (`archive`, `content`, `web`, `services`, `scripts`, `docs`, `.git`, `.superpowers`) from the source scan. If a destination exists, hash it and fail on mismatch; never overwrite it.

- [ ] **Step 4: Run tests then archive the real corpus**

Run:

```powershell
npm test -- scripts/tests/source-files.test.mjs
npm run archive:sources
```

`archive:sources` must pass these explicit roots to `archiveSources`: `ABCD卷`, `2025 E卷-2025A卷`, `2025B卷`, `2025.12月-2026.3月【双机位C卷】`, `2026.4月-7月【新系统机试】真题-持续更新`, `刷前必看⭐️刷题攻略.docx`, `在线oj.docx`, and `机考技术面辅导+助力offer.pdf`.

Expected: manifest records 1,092 files and the archived count equals the initial inventory.

- [ ] **Step 5: Verify the archive before any source-root move**

Run a command that compares manifest count and hash values against original source roots. Do not remove or move the originals in this task. Record the result in `docs/archive-verification.md`.

### Task 3: Build and validate the normalized corpus

**Files:**
- Create: `scripts/lib/problem-schema.mjs`
- Create: `scripts/lib/html-parser.mjs`
- Create: `scripts/lib/document-parser.mjs`
- Create: `scripts/lib/metadata.mjs`
- Create: `scripts/build-corpus.mjs`
- Create: `scripts/tests/html-parser.test.mjs`
- Create: `scripts/tests/metadata.test.mjs`
- Create: `scripts/tests/fixtures/problem.html`
- Create: `content/index.json` (generated)
- Create: `content/problems/*.json` (generated)

**Interfaces:**

```ts
type ProblemRecord = {
  id: string;
  title: string;
  sourcePaths: string[];
  sourceKinds: ('html' | 'docx' | 'pdf')[];
  score: 100 | 200 | null;
  collection: string;
  sections: { description?: string; input?: string; output?: string; examples: string[]; solution?: string; complexity?: string };
  solutions: Partial<Record<'java' | 'python' | 'javascript' | 'cpp', string>>;
  tags: string[];
  completeness: 'complete' | 'index-only';
  duplicateOf: string | null;
};
```

- [ ] **Step 1: Write parser tests from the known HTML shape**

```js
test('parseHtmlProblem extracts headings, sections and language code blocks', async () => {
  const problem = await parseHtmlProblem(fixturePath, { collection: 'ABCD卷' });
  expect(problem.sections.description).toContain('虚拟 IPv4');
  expect(problem.sections.input).toContain('输入一行');
  expect(problem.solutions.python).toContain('print');
  expect(problem.score).toBe(100);
});
```

- [ ] **Step 2: Verify the test fails**

Run: `npm test -- scripts/tests/html-parser.test.mjs`

Expected: FAIL because `parseHtmlProblem` does not exist.

- [ ] **Step 3: Implement schema-safe extraction**

Use Cheerio to strip style/script nodes, read `#write` when present, preserve heading hierarchy, map known Chinese headings to sections, and extract code from language-labelled blocks. Use Mammoth for DOCX text. Parse title/score/collection only from filename and source path; leave unrecognized values `null` rather than guessing.

- [ ] **Step 4: Implement deterministic IDs and duplicate grouping**

ID formula: `od-` + first 12 hex characters of SHA-256 over normalized `title + complete body hash` (all structured sections and reference code). Group exact normalized-body hashes; select the version with complete sections and the newest collection order as default, but preserve every source path. Same-title non-identical bodies receive distinct IDs, `duplicateOf: null` and tag `variant-candidate`.

- [ ] **Step 5: Run corpus build and validation**

Run:

```powershell
npm test -- scripts/tests/html-parser.test.mjs scripts/tests/metadata.test.mjs
npm run build:corpus
```

Expected: `content/index.json` validates against the schema, every generated record has an ID/title/source path, and the generated summary reports total, complete, index-only and exact-duplicate counts.

### Task 4: Create the static app foundation, catalog search and local progress store

**Files:**
- Create: `web/package.json`
- Create: `web/vite.config.ts`
- Create: `web/tsconfig.json`
- Create: `web/src/main.tsx`
- Create: `web/src/app/App.tsx`
- Create: `web/src/lib/catalog.ts`
- Create: `web/src/lib/progress.ts`
- Create: `web/src/lib/search.ts`
- Create: `web/src/lib/progress.test.ts`
- Create: `web/src/pages/HomePage.tsx`
- Create: `web/src/pages/ProblemPage.tsx`

**Interfaces:**

```ts
export type ProgressStatus = 'new' | 'in-progress' | 'mastered' | 'review';
export type ProgressEntry = { status: ProgressStatus; starred: boolean; note: string; updatedAt: string };
export type ProgressState = { version: 1; problems: Record<string, ProgressEntry> };
export function loadProgress(storage: Storage): ProgressState;
export function importProgress(json: string, mode: 'merge' | 'replace'): ProgressState;
export function searchCatalog(query: string, filters: CatalogFilters): CatalogResult[];
```

- [ ] **Step 1: Scaffold Vite React TypeScript and add failing progress tests**

Run: `npm create vite@latest web -- --template react-ts`

Then create:

```ts
it('merges an imported record without dropping newer local data', () => {
  expect(importProgress(JSON.stringify(imported), 'merge').problems['od-a'].status).toBe('mastered');
});

it('rejects an unsupported backup version', () => {
  expect(() => importProgress('{"version":99,"problems":{}}', 'merge')).toThrow('Unsupported backup version');
});
```

- [ ] **Step 2: Run the tests to verify failure**

Run: `npm --prefix web test -- src/lib/progress.test.ts`

Expected: FAIL because the progress module is missing.

- [ ] **Step 3: Implement catalog loading and Chinese-capable search**

Load `content/index.json` and record chunks as static assets. Build FlexSearch documents with title, body excerpt, tags, collection and score. Combine search results with filters; return exact title matches first. Degrade to a normal filtered list with a visible error if the index fails to load.

- [ ] **Step 4: Implement versioned local progress and backups**

Persist `ProgressState` under `od-learning-progress-v1`. Validate imported JSON shape, reject unknown versions, use ISO timestamps, merge by newer `updatedAt`, and offer replace only after a confirmation dialog. Download an export named `od-learning-progress-v1.json`.

- [ ] **Step 5: Build the minimal navigable UI**

Home page: query field, filters for collection/score/tag/language, result count and current-path panel. Problem page: metadata, sections, source variants and state controls. Configure a shareable problem route using the stable record ID.

- [ ] **Step 6: Verify frontend quality**

Run:

```powershell
npm --prefix web test
npm --prefix web run build
npm --prefix web run lint
```

Expected: all commands pass and `web/dist/` is static output.

### Task 5: Add digital-book presentation, learning paths and editor shell

**Files:**
- Create: `web/src/lib/paths.ts`
- Create: `web/src/components/ProblemReader.tsx`
- Create: `web/src/components/PathPanel.tsx`
- Create: `web/src/components/CodeEditor.tsx`
- Create: `web/src/components/RunnerPanel.tsx`
- Create: `web/src/lib/paths.test.ts`
- Modify: `web/src/pages/HomePage.tsx`
- Modify: `web/src/pages/ProblemPage.tsx`

**Interfaces:**

```ts
export type LearningPath = { id: string; title: string; tags: string[]; problemIds: string[] };
export const LEARNING_PATHS: LearningPath[];
export type RunRequest = { language: 'java' | 'python' | 'javascript' | 'cpp'; sourceCode: string; stdin: string };
export type RunResult = { kind: 'success' | 'compile-error' | 'runtime-error' | 'timeout' | 'unavailable'; stdout: string; stderr: string; timeMs?: number };
```

- [ ] **Step 1: Write the failing learning-path test**

```ts
it('only includes indexed IDs and preserves path order', () => {
  expect(resolvePath(LEARNING_PATHS[0], catalog)).toEqual(['od-ipv4', 'od-tlv']);
});
```

- [ ] **Step 2: Verify failure, then implement deterministic paths**

Run: `npm --prefix web test -- src/lib/paths.test.ts`

Implement six paths from the approved design. Map using explicit record IDs generated by the corpus script; skip missing IDs with a development warning rather than showing a broken card.

- [ ] **Step 3: Implement the reader and editor shell**

Use Monaco for syntax highlighting. The reader renders content sections with a sticky table of contents, collapsible reference solutions, a source-variant notice, and mobile-friendly one-column layout. The editor defaults to the selected reference language but keeps unsaved code only in browser memory for this phase.

- [ ] **Step 4: Implement an unavailable runner state before the service exists**

`RunnerPanel` sends no request when `VITE_RUNNER_URL` is missing; it shows “运行服务未配置” and keeps copy/download code actions available. This ensures the static site remains usable before Phase 2 deployment.

- [ ] **Step 5: Run browser smoke verification**

Start `npm --prefix web run dev -- --host 127.0.0.1`, then verify: search returns a known IPv4 record, route loads its body/reference code, a status change survives reload, export/import works, and the editor shows the configured language.

## Phase 2: Constrained Multi-language Runner

### Task 6: Build the validated Judge0 gateway

**Files:**
- Create: `services/runner/gateway/package.json`
- Create: `services/runner/gateway/src/server.ts`
- Create: `services/runner/gateway/src/validation.ts`
- Create: `services/runner/gateway/src/judge0.ts`
- Create: `services/runner/gateway/src/validation.test.ts`
- Create: `services/runner/gateway/tsconfig.json`

**Interfaces:**

```ts
export const ALLOWED_LANGUAGES = ['java', 'python', 'javascript', 'cpp'] as const;
export function validateRunRequest(body: unknown): RunRequest;
export async function executeRun(request: RunRequest): Promise<RunResult>;
```

- [ ] **Step 1: Write gateway validation tests first**

```ts
it('rejects unapproved language before Judge0 is called', () => {
  expect(() => validateRunRequest({ language: 'bash', sourceCode: 'id', stdin: '' })).toThrow('Unsupported language');
});

it('rejects source exceeding the configured limit', () => {
  expect(() => validateRunRequest({ language: 'python', sourceCode: 'x'.repeat(50_001), stdin: '' })).toThrow('Source code exceeds 50000 characters');
});
```

- [ ] **Step 2: Verify tests fail**

Run: `npm --prefix services/runner/gateway test -- src/validation.test.ts`

Expected: FAIL because validation module is absent.

- [ ] **Step 3: Implement fixed limits and Judge0 mapping**

Use Fastify with `@fastify/rate-limit`, JSON body limit 80 KiB, source limit 50,000 characters, stdin limit 10,000 characters, request limit 10/minute/IP, and one execution per request. Map the four app languages to Judge0 language IDs via environment variables. Submit `wall_time_limit: 2`, `cpu_time_limit: 2`, `memory_limit: 128000`, `max_file_size: 1024`, and reject a Judge0 response exceeding 32,000 output characters.

- [ ] **Step 4: Implement response normalization and CORS**

Translate Judge0 status into `success`, `compile-error`, `runtime-error` or `timeout`; never return Judge0 internal URLs or raw API fields. Configure CORS from `RUNNER_ALLOWED_ORIGIN` only. Add `/healthz` that does not reveal service versions or credentials.

- [ ] **Step 5: Run gateway tests**

Run: `npm --prefix services/runner/gateway test && npm --prefix services/runner/gateway run typecheck`

Expected: PASS.

### Task 7: Add local Docker Compose deployment and connect the frontend

**Files:**
- Create: `services/runner/docker-compose.yml`
- Create: `services/runner/.env.example`
- Create: `services/runner/README.md`
- Modify: `web/src/components/RunnerPanel.tsx`
- Create: `web/src/lib/runner-client.ts`
- Create: `web/src/lib/runner-client.test.ts`

**Interfaces:**

```ts
export async function runCode(baseUrl: string, request: RunRequest, signal?: AbortSignal): Promise<RunResult>;
```

- [ ] **Step 1: Write a failing runner-client test**

```ts
it('normalizes a non-200 response into an unavailable result', async () => {
  mockFetch.mockResolvedValue(new Response('busy', { status: 429 }));
  await expect(runCode('http://localhost:8787', request)).resolves.toMatchObject({ kind: 'unavailable' });
});
```

- [ ] **Step 2: Implement private compose topology**

Compose services: `db`, `redis`, `judge0-server`, `judge0-workers`, `gateway`. Publish only gateway port `127.0.0.1:8787:8787` for local development. Do not add host ports for PostgreSQL, Redis or Judge0. Use `.env` for passwords and `JUDGE0_URL=http://judge0-server:2358` inside the gateway network.

- [ ] **Step 3: Implement the frontend runner client**

Require `VITE_RUNNER_URL`; use `AbortController` with a 7-second client timeout; preserve editor text on all failures; render stdout/stderr separately; disable Run while request is in flight.

- [ ] **Step 4: Start services and execute language smoke tests**

Run:

```powershell
Copy-Item services/runner/.env.example services/runner/.env
docker compose --env-file services/runner/.env -f services/runner/docker-compose.yml up -d --build
```

Use the gateway to run `print('ok')`, `console.log('ok')`, `System.out.println("ok")`, and `std::cout << "ok";`. Also verify an infinite loop returns timeout and a syntax error returns compile-error.

- [ ] **Step 5: Build the frontend against the local gateway**

Run:

```powershell
$env:VITE_RUNNER_URL='http://127.0.0.1:8787'
npm --prefix web test
npm --prefix web run build
```

Expected: code runner results render correctly while the static build remains independent of Docker.

### Task 8: Complete documentation, final integrity checks and controlled source migration

**Files:**
- Create: `docs/deployment.md`
- Create: `docs/content-maintenance.md`
- Modify: `README.md`
- Modify: `docs/archive-verification.md`

- [ ] **Step 1: Document normal operations and recovery**

Document: build corpus, add a new source file, rerun dedupe, static build/deploy, local runner start/stop, backup export/import, environment variables, rate-limit behavior, and how to restore any archived source path.

- [ ] **Step 2: Verify original/archive equality a second time**

Run the archive manifest verifier against every original material file. Require equal count and equal SHA-256 for every path before migration.

- [ ] **Step 3: Move source roots only after verified archive equality**

Move the five collection directories and three top-level original documents into `archive/original/` using explicit absolute paths. Do not move `web`, `services`, `scripts`, `content`, `docs`, `openspec`, `.git`, `.superpowers`, or project configuration. Immediately rerun the manifest verifier against the archive.

- [ ] **Step 4: Run the full verification suite**

Run:

```powershell
npm test
npm run typecheck
npm run build:corpus
npm --prefix web run build
docker compose --env-file services/runner/.env -f services/runner/docker-compose.yml ps
```

Expected: all tests/builds pass, archive integrity matches, static output exists, and only gateway is host-published.

- [ ] **Step 5: Review changed files and commit code/configuration only**

Check for secrets, generated archives, `node_modules`, builds and `.env` before staging. Commit source, specs, tests and documentation; do not commit raw archives, generated corpus or local secrets.

## Plan Self-Review

- Spec coverage: Tasks 2–3 cover archive/normalization/deduplication; Tasks 4–5 cover search, digital-book reading, paths, progress and editor; Tasks 6–7 cover four-language constrained execution and Compose; Task 8 covers documentation, migration and full verification.
- Placeholder scan: no deferred requirements or unnamed checks remain; every testable component has named files, interfaces and commands.
- Type consistency: `ProblemRecord`, `ProgressState`, `RunRequest` and `RunResult` are defined once and consumed with the same field names throughout the plan.
