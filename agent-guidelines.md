# Agent Guidelines

**Audience:** anyone using Claude, Codex, Cursor, or another coding agent on this repo.

This file is the condensed rulebook. Follow it for every feature, fix, and refactor. Prefer this over inventing patterns from habit or from other React apps (especially Next.js).

---

## Required reading (do this first)

Before writing or changing code, open and follow:

1. **This file** — `docs/agent-guidelines.md` (workflow, limits, tests, DoD)
2. **[architecture.md](./architecture.md)** — layers, data flow, auth, folders
3. The relevant existing feature under `src/features/<name>/` (match local patterns)

Also skim when relevant:

- [contributing.md](./contributing.md) — local setup, PR quality gates, Yarn scripts
- Root [AGENTS.md](../AGENTS.md) — Lovable / no history rewrites
- Root [CLAUDE.md](../CLAUDE.md) — Claude entrypoint that points here

---

## How to use this with Claude / Codex

1. Prefer the root `CLAUDE.md` (Claude) or paste / attach this file into Codex project instructions.
2. Before writing code, the agent should restate: feature name, layers touched, and which tests it will add.
3. Do not mark work done until types, lint, and tests for the changed behavior pass.
4. Prefer small, layer-correct diffs. Do not rewrite whole features unless asked.

Suggested agent preamble:

> Follow `docs/agent-guidelines.md` and `docs/architecture.md`. Feature-first clean architecture. Tests beside implementation. Never bypass the repository layer. Max file sizes apply. TanStack Start only — no Next.js.

---

## Stack (do not substitute)

| Concern | Required |
| --- | --- |
| Framework | **TanStack Start** (+ TanStack Router) — not Next.js, Remix, or React Router SPA alone |
| UI | React (functional only), TypeScript **strict**, no `any` |
| Server state | TanStack Query |
| Client state | Zustand (**UI / session metadata only** — never API data or tokens) |
| HTTP | Axios via `src/shared/services/http-client.ts`, `withCredentials: true` |
| Forms | React Hook Form + Zod |
| UI kit | shadcn/ui + Radix + Tailwind only (no inline styles, no large custom CSS) |
| Unit / integration tests | Vitest + React Testing Library + MSW |
| Accessibility tests | jest-axe where shared UI / forms apply |
| E2E | Playwright (`tests/e2e/`) |

Package manager in this repo is Yarn (`yarn`). Prefer `yarn test` / `yarn test:e2e` unless local docs say otherwise.

---

## Architecture (non-negotiable)

### Feature-first layout

Everything lives under a feature unless it is truly shared:

```text
src/features/<feature-name>/
├── domain/           # Types, business rules, repository interfaces — NO React
├── infrastructure/   # Axios repos, mappers, mock adapters
├── application/      # Hooks, query keys, mutations, UI stores for the feature
├── presentation/     # Pages, components, forms — UI only
├── api.ts            # Thin delegates to the repository
└── queries.ts        # Centralized TanStack Query keys/options (or under application/)
```

### Dependency rule

```text
Presentation → Application → Domain
Infrastructure implements Domain interfaces
```

Never reverse that flow. Domain must not import React, Axios, or infrastructure.

### API / repository rules

- All network calls go through **repositories**.
- ❌ Axios / `fetch` in components, pages, or hooks that bypass repos.
- ❌ Tokens in localStorage / Zustand — HttpOnly cookies only.
- Map backend payloads in infrastructure mappers; keep UI free of snake_case API shapes.
- Centralize endpoints in `src/shared/api/endpoints.ts`.
- Use `shouldUseMockForFeature(...)` from `src/shared/config/api-readiness.ts` when a feature still has mock fallbacks.

### Auth & HTTP client

All HTTP goes through `src/shared/services/http-client.ts`:

- `withCredentials: true` (cookies on every request)
- Request interceptor: logging / non-auth headers only — **never** attach tokens manually
- Response interceptor:
  - **401** → call refresh once → retry original request once → if refresh fails → logout / unauthorized handler
  - **403** → surface as authorization error (merchant-friendly copy in UI)
  - Network / other errors → normalize to `ApiError`
- No infinite refresh loops
- Zustand `auth-store` holds **session metadata only** (business name, phone, merchant ID)

### Routes

Routes under `src/routes/` stay thin: compose presentation pages and handle routing. No business logic in routes.

### State

- TanStack Query for **all** server/API state (cache, mutations, invalidation).
- Zustand only for theme, modals, filters, auth **user metadata** (not tokens, not lists from the API).
- Query keys must be centralized (`invoiceKeys.detail(id)`), never inline string arrays in components.

---

## Hard file size limits

| Kind | Max lines |
| --- | --- |
| Components | 400 (prefer &lt; 200) |
| Pages | 400 |
| Hooks | 300 |
| Stores | 300 |
| Repositories | 300 |

If approaching the limit: split components, extract hooks/utils, or move UI sections into presentation children. Do not grow monolith files.

---

## Naming & TypeScript

- Files: **kebab-case** (`invoice-detail-page.tsx`, `use-retry-invoice-delivery.ts`)
- Components: `.tsx`; logic: `.ts`
- Prefer `interface` for object shapes; unions for variants; generics where reuse is real
- Strict types; no `any`; no loose `as` escapes without a clear mapper boundary

---

## UI / UX / a11y

- Prefer shadcn components; extend, don’t rewrite.
- Tailwind only; use class composition helpers; no inline `style={}`.
- Mobile-first; subtle motion only.
- Semantic HTML; every input has a label; every button has an accessible name.
- No `div`-only click targets — use `<button>` / proper interactive elements.
- Aim for WCAG 2.1 AA; use jest-axe on shared UI and forms.

---

## Definition of Done (every change)

A task is **not complete** until:

1. Types are correct (strict TS).
2. Lint is clean for touched files.
3. **Tests exist and pass** for the new/changed behavior.
4. Loading, error, empty states are handled where the UI fetches or mutates.
5. Accessibility requirements are respected for new interactive UI.
6. Architecture layers and repository boundary are respected.
7. File size limits are not breached.

---

## Testing rules (write with the feature)

### Mandatory

- Generate or update tests **alongside** implementation. Do not leave TODO / placeholder tests.
- Colocate tests next to code:
  - `use-users.ts` → `use-users.test.ts`
  - `invoice-detail-page.tsx` → `invoice-detail-page.test.tsx`
- Prefer **behavior** over internals (what the user sees/does, what business rules produce).

### Stack & mocks

- Vitest + RTL; MSW for HTTP; Playwright for e2e.
- Do **not** mock TanStack Query itself — mock the network with MSW (or exercise the repository with a mocked `apiClient` in repo unit tests).
- Prefer MSW + DI; avoid mocking React internals.

### Coverage priority

1. Business logic / mappers  
2. Repositories  
3. Hooks / mutations  
4. Zustand stores  
5. Components  
6. User flows / integration  
7. Route guards / auth  

### What to assert by layer

| Layer | Assert |
| --- | --- |
| Mapper | Field normalization, fallbacks, invalid payloads |
| Repository | Correct endpoint/payload, mapped result, error mapping |
| Hook / mutation | Success, failure, loading, cache invalidation / setQueryData |
| Component / page | Visible copy, actions, disabled/loading, a11y name |
| Forms | Validation errors, submit, disabled/loading/success via **user interactions** (RHF + Zod) |
| Integration | Page + hook + MSW together |
| Auth / guards | Login, logout, protected routes, unauthorized redirect |

### Form testing (required for form work)

- Drive the form with RTL `userEvent` (type, blur, click submit) — do not assert on RHF internals.
- Cover: required/format validation messages, successful submit path, submit button disabled while pending, error toast / field errors from API validation (`422`).
- Keep labels associated (`htmlFor` / `id`) so tests and a11y use accessible names.

### Auth testing (when touching auth or protected flows)

- Unit / integration: session metadata updates, logout clears client state, 403/permission copy in UI.
- Prefer MSW for login/refresh/logout endpoints over mocking the Axios instance in page tests.
- E2E: unauthenticated redirect + login → dashboard exist in `tests/e2e/auth-dashboard.spec.ts`; extend when changing auth or shell navigation.

### Example pattern (mutation hook)

```ts
// application/use-retry-invoice-delivery.ts + matching tests
// - MSW or repo test for PATCH + refetch
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { retryInvoiceDelivery } from "../api";
import { invoiceKeys } from "./invoice.queries";

export function useRetryInvoiceDelivery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => retryInvoiceDelivery(id),
    onSuccess: (invoice) => {
      queryClient.setQueryData(invoiceKeys.detail(invoice.id), invoice);
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
    },
  });
}
```

E2E: add Playwright for critical journeys when the feature is user-facing and stable (`tests/e2e/`). Auth/dashboard is the current baseline; expand for invoices, team access, etc. as flows ship.

---

## Workflow agents must follow

When implementing a ticket:

1. **Orient** — read existing feature folder, endpoints, tests, and related pages. Match conventions already in the feature (transactions / invoices are good references).
2. **Plan layers** — domain types → mapper/repo → `api.ts` / query keys → application hook → presentation → MSW (if needed) → tests.
3. **Implement + test in lockstep** — do not “ship UI first, tests later.”
4. **Wire readiness** — if a new live API capability ships, add it to `IMPLEMENTED_BACKEND_FEATURES` in `api-readiness` and cover that in `api-readiness.test.ts`.
5. **Verify** — run the focused Vitest files for the feature; fix failures before claiming done.
6. **Stay in scope** — no drive-by refactors, no new docs unless asked, no unrelated formatting sweeps.

### Temporary backend gaps

If an endpoint is missing, isolate the fallback (dedicated hook/repo method + clear `TODO`) rather than scattering hacks in the UI. Prefer refreshing full detail as source of truth after mutations.

### Role / permissions UI

Backend enforces security. Frontend may hide/disable actions using workspace role helpers (`useWorkspaceAccess`, capability helpers in shared domain). Always show permission failures with merchant-friendly copy — never raw provider/stack traces.

---

## Anti-patterns (reject these)

- Business logic in route files or fat page components
- Axios/`fetch` outside infrastructure repositories
- Storing tokens or server lists in Zustand
- Inline TanStack Query keys
- New framework (Next.js) or alternate HTTP client
- Skipping tests “until later”
- Giant new files over the line limits
- Channel pickers / scope creep features that were not requested
- Force-push / rebase of history already on the Lovable-connected remote (see root `AGENTS.md`)

---

## Do not casually edit

| Path | Why |
| --- | --- |
| `vite.config.ts` | Lovable-managed wrapper |
| `src/routeTree.gen.ts` | Generated |
| `src/server.ts`, `src/start.ts` | SSR entry / error handling |
| Pushed git history | Lovable sync — no force-push / history rewrite |

---

## Quick checklist for the agent (copy into PR / task notes)

- [ ] Feature folder / shared placement is correct  
- [ ] Domain → application → presentation dependency direction OK  
- [ ] Repository (+ mapper) owns API I/O  
- [ ] Query keys centralized; cache updated/invalidated after mutations  
- [ ] Loading / error / empty handled  
- [ ] File under line limits  
- [ ] Colocated tests added/updated and passing  
- [ ] MSW updated if handlers are required for app/tests  
- [ ] No secrets committed; no token storage  
- [ ] Merchant-friendly errors only  

---

## Quality gates before PR

```bash
yarn lint
yarn exec tsc --noEmit
yarn test
yarn test:e2e    # when touching auth, routing, or critical flows
```

App / Playwright baseline: [http://localhost:8080](http://localhost:8080) (`yarn dev`).

---

## Pointers

- Architecture detail: [architecture.md](./architecture.md)  
- Contributing / setup: [contributing.md](./contributing.md)  
- Claude entrypoint: [CLAUDE.md](../CLAUDE.md)  
- Lovable git note: [AGENTS.md](../AGENTS.md)  
- Cursor rules live under `.cursor/rules/` (always-applied); this doc mirrors the essentials for Claude/Codex sessions outside Cursor.
