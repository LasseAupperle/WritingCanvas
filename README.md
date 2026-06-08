# Canvas

A local-first Milanote-style visual board app. Infinite, pannable, zoomable canvas with nested boards, rich text notes, todos, images, tables, connectors, and more. All data lives in IndexedDB — no accounts, no server. Installable as a PWA.

## Run locally

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`.

## Deploy to Netlify

The repo is pre-configured for Netlify (`netlify.toml` sets build command and SPA redirects).

**One-time setup:**
1. Go to [app.netlify.com](https://app.netlify.com) and log in
2. Click **Add new site → Import an existing project**
3. Choose **GitHub** and select `LasseAupperle/WritingCanvas`
4. Build settings are auto-detected from `netlify.toml` — no changes needed
5. Click **Deploy site**

After the first deploy, every `git push` to `main` automatically triggers a new deploy.

**Build details:**
- Build command: `npm run build`
- Publish directory: `dist`
- Node version: 20

## Install as a desktop app (PWA)

Canvas is an installable Progressive Web App — no `.exe` download needed.

### Supported browsers

| Browser | PWA install | Notes |
|---|---|---|
| **Chrome** | ✅ Full support | Best experience |
| **Edge** | ✅ Full support | Same engine as Chrome |
| **Brave** | ✅ Full support | Chromium-based |
| **Opera** | ✅ Full support | Chromium-based |
| **Safari (macOS 14+)** | ✅ Supported | Use "Add to Dock" from File menu |
| **Firefox** | ❌ Not supported | Mozilla has no plans to support PWA install |
| **Firefox (Android)** | ❌ Not supported | Same |

> **Short version:** any Chromium-based browser works. Firefox does not support PWA installation.

### How to install (Chrome / Edge)

1. Open the hosted app in Chrome or Edge
2. Look for the **install icon** (⊕) in the address bar — far right side
3. Click it → **Install**
4. The app opens in its own window with no browser UI, like a native app

**Alternative:** click the browser menu (⋮) → **Cast, save and share** → **Install page as app**

### How to install (Edge specifically)

1. Click the **…** menu → **Apps** → **Install this site as an app**
2. Give it a name → **Install**

### After installing

- App appears in your Start Menu / taskbar / dock like any other app
- Opens offline — all data is already stored locally in IndexedDB
- Updates automatically in the background when you push a new version

### Uninstall

- **Chrome/Edge:** open the app window → menu (⋮) → **Uninstall**
- Or: `chrome://apps` → right-click Canvas → Remove

## Codebase map

- **`src/db/`** — Dexie schema (`db.ts`) and all read/write helpers (`persistence.ts`). Two tables: `boards` and `items`. Blobs stored separately.
- **`src/state/`** — Zustand store (`store.ts`) holding all runtime state (boards, items, selection, viewport, armed tool). Command history for undo/redo (`history.ts`).
- **`src/canvas/`** — The canvas engine: `Viewport.tsx` handles pan/zoom/pointer events and culling; `World.tsx` is the CSS-transformed DOM layer; `SvgConnectorLayer.tsx` renders lines; `useViewport.ts` provides zoom-around-cursor math; `lod.ts` computes level-of-detail thresholds; `selection.ts` has rubber-band and alignment-guide logic.
- **`src/items/`** — One file per item type. `ItemRenderer.tsx` switches on `item.type`, applies LOD, and handles drag-to-move + Alt-drag-duplicate. `CardShell.tsx` provides the shared card wrapper with 8-handle resize.
- **`src/ui/`** — `TopBar.tsx`, `Toolbar.tsx` (drag-out + click-to-place), `Breadcrumb.tsx`, `ZoomControl.tsx`, `UnsortedPanel.tsx`, `SearchOverlay.tsx` (full-workspace search), `AlignToolbar.tsx` (multi-select align/distribute).
- **`src/routes/BoardView.tsx`** — Main route, wires up keyboard shortcuts, external-paste → Unsorted, and the overall layout.
- **`src/lib/`** — `constants.ts` (MIN_ZOOM, MAX_ZOOM, …), `coords.ts` (screen↔world math), `ids.ts` (nanoid + HOME_BOARD_ID).
