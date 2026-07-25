# Ollama Transport Retrieval Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make RailAgent chat and friendly transfer use local transport documents when relevant, while allowing explicitly marked model-knowledge answers otherwise.

**Architecture:** A dependency-free JSONL retriever ranks local documents and returns sources. The two APIs inject this context into the existing Ollama prompt and return a mode plus sources.

**Tech Stack:** TypeScript, Node fs, Vitest, existing Ollama client.

## Global Constraints

- Local-source answers expose source URL and download time.
- No-match answers use `model-knowledge` and say local data was not used.
- Timetable, fare, operations, safety and accessibility answers retain official-current-information guidance.
- Missing or malformed JSONL cannot stop either API.

### Task 1: Build and test the local document retriever

**Files:** Create `local-api/src/transportKnowledge/retriever.ts`, `retriever.test.ts`.

- [ ] Write a failing test that writes JSONL with a Taipei accessibility document, calls `retrieveTransportKnowledge('臺北站無障礙服務', root)`, and expects one source plus `knowledgeMode: 'local-sources'`.
- [ ] Run `npm.cmd test -- src/transportKnowledge/retriever.test.ts`; expect a missing-module failure.
- [ ] Implement `retrieveTransportKnowledge(question, root)` using safe JSONL loading, normalized keyword overlap, maximum five documents, and `{ knowledgeMode: 'local-sources' | 'model-knowledge', documents, sources }`.
- [ ] Add a no-match and malformed-file test; rerun targeted test, typecheck and full suite.
- [ ] Commit with Lore protocol.

### Task 2: Wire retrieval into both Ollama routes

**Files:** Modify `local-api/src/localServer.ts`, `local-api/src/localServer.test.ts`.

- [ ] Write a failing server test that injects a local matching document, posts to `/api/passenger-chat`, and asserts the Ollama prompt contains the source text and response exposes `knowledgeMode: 'local-sources'` with sources.
- [ ] Write a failing no-match test asserting prompt permits general knowledge and response has `knowledgeMode: 'model-knowledge'`.
- [ ] Run `npm.cmd test -- src/localServer.test.ts`; observe the new assertions fail.
- [ ] Implement a shared prompt builder that injects sources for passenger chat and friendly transfer, tells Ollama not to present general knowledge as official local data, and adds current-information guidance for high-stakes transport queries.
- [ ] Run target test, typecheck, full suite and build; commit with Lore protocol.

## Self-review

- Tasks cover retrieval, source traceability, model-knowledge fallback, safe file failure behavior, both API routes, and regression testing.
- All function names and response fields are used consistently.
