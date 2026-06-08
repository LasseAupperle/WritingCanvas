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
| **Firefox** | ❌ Not supported | Mozilla has no plans to support PWA installation |
| **Firefox (Android)** | ❌ Not supported | Same |

> **Short version:** any Chromium-based browser works. Firefox does not support PWA installation.

### How to install (Chrome / Edge)

1. Open the hosted app in Chrome or Edge
2. Look for the **install icon** (⊕) in the address bar — far right side
3. Click it → **Install**
4. The app opens in its own window with no browser UI, like a native app

**Alternative:** click the browser menu (⋮) → **Cast, save and share** → **Install page as app**

### After installing

- App appears in your Start Menu / taskbar / dock like any other app
- Opens offline — all data is already stored locally in IndexedDB
- Updates automatically in the background when you push a new version

### Uninstall

- **Chrome/Edge:** open the app window → menu (⋮) → **Uninstall**
- Or: `chrome://apps` → right-click Canvas → Remove

## Canvas controls

| Action | How |
|---|---|
| Pan | Scroll (trackpad two-finger) or Space + drag |
| Zoom | Ctrl/⌘ + scroll or pinch |
| Select | Click item |
| Multi-select | Shift + click, or rubber-band drag on empty canvas |
| Move item | Drag from any padding/border area of the card |
| Resize item | Drag the 8 handles that appear when selected |
| Delete item | Select → Delete key, or drag onto the Trash button |
| Duplicate | Alt + drag |
| Undo / Redo | Ctrl+Z / Ctrl+Y |

## Item types

| Tool | How it works |
|---|---|
| **Note** | Rich text (bold, italic, lists, checkboxes, headings). Click padding/border to drag; click text area to edit. |
| **Link** | Paste a URL → shows favicon + domain. Click the link to open. |
| **To-do** | Checklist. Enter adds a new task; hover a task to reveal the delete button. |
| **Line** | Click once to set start point, click again to set end point. Press L to arm. |
| **Board** | Nested board. Double-click to navigate inside. |
| **Column** | Vertical list container. Drop other items onto it to group them. |
| **Comment** | Sticky note with yellow background. |
| **Table** | Editable grid. Hover column header to delete a column; hover row to delete a row. |
| **Image** | Clicking opens a file picker; the image is placed at viewport center. |
| **Upload** | Same as Image but accepts any file type. Click the card to download. |
| **Draw** | Coming in a future update. |

## View menu

- **Smart guides** — shows alignment guides while dragging
- **Snap to grid** — snaps items to a 32 px grid (also enables the grid overlay)
- **Grid overlay** — shows 32 px grid lines on the canvas

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `?` | Open keyboard shortcut reference |
| `Ctrl+F` | Search across all boards |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Redo |
| `Ctrl+A` | Select all |
| `Ctrl+C / X / V` | Copy / cut / paste selected items |
| `Delete` / `Backspace` | Delete selected items |
| `Arrow keys` | Nudge 1 px (+ Shift = 10 px) |
| `L` | Arm line tool |
| `Escape` | Clear selection / cancel armed tool |
| `Shift+1` | Zoom to fit all items |
| `Ctrl+U` | Navigate to parent board |

## Codebase map

- **`src/db/`** — Dexie schema (`db.ts`) and all read/write helpers (`persistence.ts`). Two tables: `boards` and `items`. Blobs stored separately in IndexedDB.
- **`src/state/`** — Zustand store (`store.ts`) holding all runtime state (boards, items, selection, viewport, armed tool). Command history for undo/redo (`history.ts`).
- **`src/canvas/`** — Canvas engine: `Viewport.tsx` handles pan/zoom/pointer events, culling, and grid rendering; `World.tsx` is the CSS-transformed DOM layer; `SvgConnectorLayer.tsx` renders line items; `useViewport.ts` provides zoom-around-cursor math; `lod.ts` computes level-of-detail thresholds.
- **`src/items/`** — One file per item type. `ItemRenderer.tsx` switches on `item.type`, applies LOD, and handles drag-to-move + Alt-drag-duplicate. `CardShell.tsx` provides the shared card wrapper with 8-handle resize.
- **`src/ui/`** — `TopBar.tsx`, `Toolbar.tsx` (click-to-place + drag-out), `Breadcrumb.tsx`, `ZoomControl.tsx`, `UnsortedPanel.tsx` (inbox for pasted items), `SearchOverlay.tsx` (full-workspace search), `AlignToolbar.tsx` (multi-select align/distribute), `HotkeyPanel.tsx` (rebindable shortcuts).
- **`src/routes/BoardView.tsx`** — Main route, wires up keyboard shortcuts, external-paste → Unsorted inbox, and overall layout.
- **`src/lib/`** — `constants.ts` (MIN_ZOOM, MAX_ZOOM, …), `coords.ts` (screen↔world math), `ids.ts` (nanoid + HOME_BOARD_ID), `hotkeys.ts` (rebindable hotkey definitions).
