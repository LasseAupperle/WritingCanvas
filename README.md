# Canvas

A local-first Milanote-style visual board app. Infinite, pannable, zoomable canvas with nested boards, rich text notes, todos, images, tables, connectors, and more. All data lives in IndexedDB — no accounts, no server. Installable as a PWA.

## Run

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`.

## Codebase map

- **`src/db/`** — Dexie schema (`db.ts`) and all read/write helpers (`persistence.ts`). Two tables: `boards` and `items`. Blobs stored separately.
- **`src/state/`** — Zustand store (`store.ts`) holding all runtime state (boards, items, selection, viewport, armed tool). Command history for undo/redo (`history.ts`).
- **`src/canvas/`** — The canvas engine: `Viewport.tsx` handles pan/zoom/pointer events and culling; `World.tsx` is the CSS-transformed DOM layer; `SvgConnectorLayer.tsx` renders lines; `useViewport.ts` provides zoom-around-cursor math; `lod.ts` computes level-of-detail thresholds; `selection.ts` has rubber-band and alignment-guide logic.
- **`src/items/`** — One file per item type. `ItemRenderer.tsx` switches on `item.type`, applies LOD, and handles drag-to-move + Alt-drag-duplicate. `CardShell.tsx` provides the shared card wrapper with 8-handle resize.
- **`src/ui/`** — `TopBar.tsx`, `Toolbar.tsx` (drag-out + click-to-place), `Breadcrumb.tsx`, `ZoomControl.tsx`, `UnsortedPanel.tsx`, `SearchOverlay.tsx` (full-workspace search), `AlignToolbar.tsx` (multi-select align/distribute).
- **`src/routes/BoardView.tsx`** — Main route, wires up keyboard shortcuts, external-paste → Unsorted, and the overall layout.
- **`src/lib/`** — `constants.ts` (MIN_ZOOM, MAX_ZOOM, …), `coords.ts` (screen↔world math), `ids.ts` (nanoid + HOME_BOARD_ID).
