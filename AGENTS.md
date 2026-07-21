# AGENTS.md

Compact guidance for OpenCode agents working in this repo. For full architecture, read `CLAUDE.md`.

## Commands

- Build: `pnpm build` → output in `build/chrome-mv3-prod/`
- Dev: `pnpm dev`
- Test (all): `pnpm test` (jest + ts-jest + jsdom)
- Single test file: `npx jest src/database`  ·  by name: `npx jest -t "addItem"`
- Format (run before committing): `pnpm format` — uses prettier with the import-sort plugin

Package manager: use **pnpm** locally (repo has `pnpm-lock.yaml`). CI uses `npm` (`package-lock.json` also present) — both resolve the same deps, don't "fix" the lockfile mismatch.

## Prettier import ordering (easy to fight)

`.prettierrc.mjs` uses `@ianvs/prettier-plugin-sort-imports` with this group order:
builtins → third-party → blank → `@plasmo/*` → blank → `@plasmohq/*` → blank → `~*` → blank → relative (`./`, `../`).
Also: `semi: false`, `singleQuote: false`, `trailingComma: "none"`, `bracketSameLine: true`, `printWidth: 80`.
Keep new imports in the right group or `pnpm format` will reorder them.

## Testing quirks

`src/test/setup.ts` polyfills `fake-indexeddb/auto`, `crypto.subtle` (webcrypto), `TextEncoder/Decoder`, and a mock `chrome` global. That's why DB/hash code runs under jest without a browser. No network or real Chrome needed.

## Architecture (verified)

Plasmo browser extension. Real entrypoints:
- `src/options.tsx` — options_ui page (the whole management UI; composes `src/components/*`)
- `src/background.ts` — Service Worker (context menus, capture)
- `src/content-scripts/capture.ts` — injected page script (Ctrl+Shift+S shortcut, not Alt+S)

`src/components/` holds 11 presentational/smart components. `src/utils/useExportImage.ts` is the shared hook for image export, used by both `ItemCard` and `ItemDialog` — do not duplicate that logic.

Data: IndexedDB only (`src/database`), no backend. UI prefs (preset) live in `chrome.storage.sync`.

### Project-centric organization (key model)

Cards are organized by **Project**, not by website/page:
- `Project { id, name(UNIQUE), createdAt, note? }` stored in `projects` object store (name has unique index).
- `Item` has `projectId?`, `note?`, and `order?` (manual sort within a project).
- Right-click menu "拾句" → "新建项目并加入" / "加入已有项目 ▸ (project list)". Project names must be unique — `getProjectByName` enforces it.
- Options page left drawer = project manager (create with uniqueness check, open/switch). Opening a project filters the main view to that project's cards only.
- Within a project, cards render as a flex-wrap waterfall (responsive 1/2/3 cols) and are reorderable by drag-and-drop (persisted via `Item.order` through `updateItem`).
- `GroupSection.tsx` is now a `CardGrid` (no group headers/collapse/focus) — do not reintroduce website grouping there.
- Card editing: `ItemDialog` has an edit mode (content + note) calling `onSave` → `updateItem`.

## Conventions that differ from defaults

- `ColorPalette.tsx` must read dot colors from the exported `palettes` object in `src/theme/index.ts` — do not hardcode hex values there.
- Popover positioning convention: `anchorOrigin: {bottom, right}` + `transformOrigin: {top, right}` (top-right dropdown).
- Grouping layout uses flex-wrap (responsive 1/2/3 cols), not masonry — `react-masonry-css` is a dependency but unused by current UI.
- `tsconfig.json` extends `plasmo/templates/tsconfig.base` and sets `ignoreDeprecations: "5.0"`.

## SRS (spaced repetition)

Cards support an optional `Item.srs?: SrsData` field for SM-2 spaced repetition scheduling.
- `src/hooks/useSrs.ts`: `ensureSrs(item)` initializes first-time cards; `rateCard(item, 1-4)` runs SM-2 and returns a new `Item`; `getDueItems(items)` filters and sorts by `srs.dueDate`.
- `src/components/ReviewSession.tsx`: Review UI — 3D card-flip animation, 1-4 rating buttons, keyboard shortcuts (1-4 for rating, Enter/Space for flip), progress counter, completion summary with accuracy.
- `AppHeader` shows a `<SchoolRoundedIcon>` button with a `<Badge>` counting cards due today (`dueBefore: Date.now()`).
- `SearchQuery.dueBefore` filters items whose `srs.dueDate <= dueBefore` or have no `srs` yet.
- DB_VERSION 6 — removed deprecated `categories`/`sources` stores (migrated out in v6 upgrade). No active stores besides `items` and `projects`.
