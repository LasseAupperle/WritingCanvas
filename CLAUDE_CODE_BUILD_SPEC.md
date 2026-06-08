# BUILD SPEC — "Canvas" (a Milanote-style visual board app)

> **For Claude Code.** This is a complete, single-run build brief. Build the whole MVP described in
> Sections 1–13 in one pass. Treat Section 12 ("Definition of Done") as the acceptance checklist.
> Phase-2 items in Section 14 are **out of scope for this run** — do not build them, but do not
> architect in a way that blocks them.

---

## 0. What we're building (one paragraph)

A **local-first desktop-focused web app** that clones the core experience of Milanote: an infinite,
pannable, zoomable canvas where the user creates cards (notes, to-dos, images, tables, links, etc.)
by dragging tools out of a left toolbar. The defining feature is **nested boards** — a board is a
canvas, and a board can contain other boards; opening a board navigates into its own canvas, with a
breadcrumb trail back up. The app must support an **extra-large canvas with deeper zoom-out than
Milanote** (down to 0.5% vs Milanote's 3%). No accounts, no server, no cloud — all state persists
locally in IndexedDB. Ship it as an **installable PWA** (works offline, installable as a desktop app)
— no native executable, no Tauri/Electron in this run.

**Platform:** desktop browsers only (Chrome/Edge/Firefox). Do **not** spend effort on mobile/touch
layouts or responsive breakpoints.

---

## 1. Tech stack (use exactly this unless something is unavailable)

- **Vite + React 18 + TypeScript**
- **Zustand** for state management
- **Dexie.js** (IndexedDB wrapper) for persistence
- **React Router** (`react-router-dom`) — the URL route encodes the current board id
- **TipTap** (`@tiptap/react`, `@tiptap/starter-kit`) for rich-text notes, with markdown input rules
- **lucide-react** for icons
- **vite-plugin-pwa** — make the app installable as a PWA + offline-capable (see Section 15)
- **Tailwind CSS** for styling (configure design tokens in `tailwind.config` per Section 11). CSS
  variables are also fine; pick one and be consistent.
- **@use-gesture/react** is allowed for wheel/drag gesture handling, but a custom pointer/wheel
  handler is also acceptable. Do **not** pull in a heavyweight diagram/whiteboard library
  (no tldraw, no react-flow) — we want full control of the canvas.

Keep the dependency list small. Do not add a backend, auth library, or realtime/CRDT library.

---

## 2. The canvas — core technique (read this first; it constrains everything)

Render the world as **real DOM elements inside a single transformed container**, NOT on an HTML5
`<canvas>` element. Notes contain editable rich text, so they must be real DOM nodes.

Structure:

```
<Viewport>                         // fixed-size div, overflow hidden, the "camera"
  <World style="transform: translate(panX, panY) scale(zoom); transform-origin: 0 0">
    <SvgConnectorLayer/>           // absolutely positioned SVG covering the world, for lines/arrows
    <ItemLayer>                    // each item is an absolutely-positioned div at world (x,y)
      <CardNote/> <CardBoard/> <CardTodo/> ...
    </ItemLayer>
  </World>
  <OverlayUI/>                     // toolbar, top bar, unsorted pill — NOT transformed
</Viewport>
```

- **World coordinates** are the source of truth for item `x,y,w,h`. Screen = `world * zoom + pan`.
- **Pan:** hold **Space + drag**, or middle-mouse drag, or drag empty canvas. Updates `panX/panY`.
- **Zoom:** mouse wheel (and `Z` modifier per shortcuts) zooms **around the cursor position** (keep
  the world point under the cursor fixed). Also a zoom dropdown in the top bar.
- **Zoom range:** `MIN_ZOOM = 0.005` (0.5%), `MAX_ZOOM = 4` (400%), default `1.0` (100%). Expose
  these as constants.
- **Coordinate space:** effectively unbounded. Allow item positions in the range ±1,000,000 px.
  Do not clamp the canvas to a fixed rectangle.
- **Hit-testing / selection** is done against DOM elements (pointer events on the item divs), so you
  get this largely for free.

### 2a. Performance requirements (mandatory because of deep zoom-out)
- **Culling:** only render items whose world-space bounding box intersects the current viewport
  (with a small margin). Items far off-screen are not in the DOM.
- **Level-of-detail (LOD):** when `zoom < 0.2` (20%), render each card as a **simplified placeholder**
  — a colored rounded rectangle of the card's size with (optionally) a 1-line truncated title — instead
  of its full interactive contents. Below `zoom < 0.05`, render a plain filled rectangle only.
  This keeps a board with hundreds of cards smooth at extreme zoom-out.
- Use `will-change: transform` on the World layer and avoid re-rendering all items on every pan frame
  (pan should update a transform, not React state for every item).

---

## 3. Data model

Two Dexie tables. All ids are short uuids (e.g. nanoid).

```ts
type BoardId = string;
type ItemId = string;

interface Board {
  id: BoardId;
  title: string;            // "" allowed; shows placeholder
  color: string;            // swatch color shown in breadcrumb + board card, hex
  parentId: BoardId | null; // null only for the single Home board
  viewport: { panX: number; panY: number; zoom: number }; // restored when board is opened
  createdAt: number;
  updatedAt: number;
}

type ItemType =
  | 'note' | 'board' | 'todo' | 'link' | 'image' | 'file'
  | 'table' | 'column' | 'line' | 'comment';
  // ('drawing','video','audio','map','color' are Phase 2 — do not build now)

interface Item {
  id: ItemId;
  boardId: BoardId;         // which board canvas this item sits on
  type: ItemType;
  x: number; y: number;     // world coords (top-left)
  w: number; h: number;     // world size
  z: number;                // stacking order
  // type-specific payload:
  childBoardId?: BoardId;   // for type 'board' -> the board it opens into
  content?: any;            // see per-type content shapes in Section 5
  createdAt: number;
  updatedAt: number;
}
```

- **Nesting is modeled here:** a nested board is an `Item` of `type: 'board'` whose `childBoardId`
  points at a `Board` row. That child `Board.parentId` equals the board the item sits on.
- On first run, seed exactly one **Home** board (`parentId: null`, title "Home").
- Persist every mutation to Dexie (debounced ~300ms for text edits, immediate for create/delete/move-end).
- Load the board's `viewport` when navigating into it; save it on navigate-away.

---

## 4. Navigation & routing

- Route shape: `/b/:boardId`. The Home board has a stable id; `/` redirects to it.
- **Open a board:** double-click a `board` item → `navigate('/b/' + childBoardId)`.
- **Breadcrumb** (top-left): walk `parentId` up to Home and render `Home / ⬛ Parent / ⬛ Current`,
  each segment clickable, each prefixed by the board's color swatch. Home shows only the logo + "Home".
- **Keyboard nav:** `Cmd/Ctrl + [` = browser-style back, `Cmd/Ctrl + ]` = forward,
  `Cmd/Ctrl + U` = go to parent board.
- Title bar / document.title = current board title.

---

## 5. Item types — appearance & behavior

All cards: white background `--card-bg`, `border-radius: 6px`, subtle border + soft shadow,
selectable (click), movable (drag), resizable (corner/edge handles when selected), deletable
(Delete/Backspace when selected and not editing text).

### note
- Rich text via TipTap. Auto-grows in height as you type; width is user-resizable.
- Supports: large heading, normal heading, bold, italic, underline, strike, bullet list, numbered
  list, checkbox list, blockquote, code block, highlight, link, text-align center.
- **Markdown input rules** at line start: `# ` heading, `. ` bullet, `1. ` numbered, `[ ] ` checkbox,
  `> ` quote.
- `content: { html: string }`.

### board
- Card with: a color/emoji thumbnail block (use `Board.color`), bold title, and a gray meta line
  `"{n} boards, {n} cards, {n} docs"` computed from the child board's contents.
- **If the child board contains sub-boards, render a preview list** of up to ~5 child-board rows
  inside the card: small icon + child title + `"{n} cards"`. (This reproduces the "Structure" /
  "Characters" cards in the reference screenshots.)
- Double-click → navigate into `childBoardId`.

### todo
- Titled card. Rows of `{ done: boolean, text: string }`. Empty trailing row shows placeholder
  "Add a task…". Enter commits a row and creates the next. Checkbox toggles `done` (done = strikethrough).
- `content: { title: string, tasks: {id,done,text}[] }`.

### link
- Paste/enter a URL → show a link card with the URL, a title line, and (if available) a favicon.
  Do not fetch remote OpenGraph data (no backend); just show URL + domain + clickable open.
- `content: { url: string, title?: string }`.

### image
- Drag-drop an image file onto the canvas, or use the "Add image" tool → file picker. Store the
  image as a **Blob in Dexie** (or base64 in content for small images) and render it. Resizable.
  Optional caption line below ("Add a caption").
- `content: { blobKey?: string, dataUrl?: string, caption?: string }`.

### file
- Generic uploaded file (any type): show file icon + filename + size. Store blob in Dexie.
- `content: { blobKey: string, filename: string, size: number }`.

### table
- Editable grid. First row is a bold header. Add/remove rows & columns. Click a cell to edit.
- `content: { columns: string[], rows: string[][] }`.

### column
- A vertical container that **stacks child cards**. Items dropped into a column snap into a single
  vertical list and reflow; dragging an item out removes it from the column. A column has a title.
- Model: column is an Item; child items get `content.columnId` set OR (simpler) store an ordered
  `content.childIds: ItemId[]` on the column and lay them out vertically. Pick the simpler approach
  and keep child items as normal Items positioned by the column's layout.

### line
- A connector with two endpoints in world space, rendered in the SVG layer. Straight line with an
  optional arrowhead. Endpoints are **free-floating points** (no card-snapping required — do NOT spend
  effort on attach-to-card behavior).
- **Creation = two-click (REQUIRED).** When the Line tool is armed (clicked in the toolbar, or via its
  keyboard shortcut `L`): the **first canvas click sets the start point**, the **second click sets the
  end point**, then the line is created and the tool disarms (Esc cancels mid-draw). Show a live
  "rubber-band" preview line from the start point to the cursor between the two clicks. This lets the
  user keybind `L` and rapidly connect things.
- **Selectable / clickable (REQUIRED).** The line must be clickable to select it (give the SVG path a
  thick invisible hit-stroke, e.g. `stroke-width: 12` transparent, over the visible thin stroke).
  When selected, show its two endpoints as draggable handles so each end can be repositioned, and allow
  Delete to remove it. Optionally allow toggling the arrowhead on/off from a small inline control when
  selected.
- `content: { x1,y1,x2,y2, arrowEnd: boolean }` (absolute world coords).

### comment
- A small sticky-style card with author-less text (single user). Distinct tint from notes.
- `content: { text: string }`.

---

## 6. The left toolbar

Fixed, ~64px wide, full height, white, right border. Vertical list of buttons, each = icon (lucide)
+ tiny label beneath. Order (top→bottom):

`Note, Link, To-do, Line, Board, Column, Comment, Table, "…" (more), [divider], Add image, Upload, Draw*, [spacer], Trash`

(*Draw is Phase 2 — render the button but it can open a "coming soon" no-op, or omit. Don't build the
drawing engine.)

**Creation interactions (support BOTH):**
1. **Drag-out:** press on a tool and drag onto the canvas; on drop, create that item at the drop point
   (converted to world coords). Show a ghost preview while dragging.
2. **Click-to-place:** click a tool to "arm" it (highlight it), then the next click on empty canvas
   creates the item there and disarms. Esc disarms.

**Tool hotkeys (REQUIRED for Line, nice-to-have for others):** arming a tool can also be triggered by a
keyboard shortcut. Implement an extensible hotkey→tool map. Bind **`L` = arm Line tool** at minimum
(so the user can press `L` then click-click to connect things fast). The **Line tool uses the two-click
creation flow** described in its item-type entry (Section 5 → `line`), not drag-out.

**Trash:** dragging an item onto the Trash button deletes it. Clicking Trash opens a simple deleted-items
list with restore (optional; a basic confirm-delete is acceptable for v1).

---

## 7. Top bar

~52px tall, white, bottom border.
- **Left:** circular logo; then the breadcrumb (Section 4). On Home, just logo + "Home".
- **Center:** current board title, bold, click-to-rename inline (hidden on Home).
- **Right:** a **zoom control** — a `%` readout with a dropdown offering: `Zoom in (+)`, `Zoom out (-)`,
  `Zoom to fit`, `50%`, `100%`, `200%`, and a slider. Also include placeholder **Share** and
  **Export ▾** buttons that are visually present but no-op (tooltip "Phase 2"). Undo/redo buttons and a
  settings icon are optional. The **search icon is in scope** and opens the global search (Section 7a).

### 7a. Global search across all boards (IN SCOPE)

A search that spans the entire workspace, not just the current board.

- Open via the top-bar search icon or `Cmd/Ctrl + F`. Renders a search box/overlay with a results list.
- **Searches:** all `Board.title` values and the text content of all `Item`s across every board
  (notes' plain text, todo task text, table cell text, link titles/urls, comment text, image captions).
  Extract plain text from note HTML for indexing.
- **Results:** each row shows a snippet/title, the item/board type, and its **board path breadcrumb**
  (e.g. `test / Plot`). Live-filter as the user types (debounced).
- **Activate a result:** clicking it **navigates to the board** containing the item, then **centers the
  viewport on that item and selects it** (briefly highlight it). For a board-title match, navigate into
  that board.
- Implementation can be a simple in-memory scan over the Dexie tables (fine for a single-user local app);
  no fancy index needed, but lowercase-contains matching across all fields is required.

---

## 8. Unsorted (per-board inbox)

- A pill in the **top-right of the canvas overlay**: `"{n} Unsorted"`.
- Clicking expands a right-side panel. Items can be dropped into it (parked) and dragged back out onto
  the canvas. Model unsorted items as normal Items with a flag `content.unsorted = true` (not rendered
  on the canvas while flagged). Keep this simple.

---

## 9. Selection, movement, editing

- **Click** selects (shows selection outline + resize handles). **Shift-click** adds to selection.
- **Drag empty canvas** = rubber-band multi-select (when not in pan mode).
- **Drag selected** = move all selected items; movement is in world units (divide screen delta by zoom).
- **Resize** via 8 handles; maintain min sizes per type.
- **Double-click empty canvas** = create a new **note** there and focus it (Milanote's signature gesture).
- **Nudge:** arrow keys move selection 1px (world); Shift+arrows move 10px.
- **Z-order:** `Cmd/Ctrl+Shift+Up` send forward, `Cmd/Ctrl+Shift+Down` send back.
- **Duplicate:** hold `Alt/Option` and drag a selection to clone it.
- **Clipboard (IN SCOPE — two distinct behaviors):**
  - *Internal items:* `Cmd/Ctrl + C / X` copies/cuts selected items to an in-app clipboard;
    `Cmd/Ctrl + V` pastes them onto the current board near the cursor.
  - *External clipboard → auto-note (REQUIRED):* if the system clipboard contains **text or an image
    that did NOT originate from this app**, pressing `Cmd/Ctrl + V` (after clicking the app to focus it)
    **creates a new item from that content and places it in the current board's Unsorted inbox**, NOT on
    the canvas. Pasted **text → a new `note`** containing that text; pasted **image → a new `image`
    card**. This mirrors Milanote: the pasted content shows up in the Unsorted list, and the user drags
    it out onto the canvas where they want it. Briefly flash/badge the Unsorted pill so it's obvious
    something arrived.
  - *Precedence:* if the in-app clipboard has items AND a paste happens, paste the items to the canvas;
    otherwise read the system clipboard (use the `paste` event's `clipboardData`, falling back to
    `navigator.clipboard`) and route external text/image to Unsorted as above.
- `Cmd/Ctrl + A` select all on the board.
- **Delete:** `Delete`/`Backspace` removes selection (only when not editing text inside a card).
  NOTE: do NOT require notes to be empty before deletion (we are dropping that Milanote quirk).

### 9a. Snapping, grid & alignment (IN SCOPE)

The canvas stays freeform, but provide optional aids so the user can line things up cleanly:

- **Smart alignment guides (default ON):** while dragging or resizing an item, detect when its edges or
  centers line up with nearby on-screen items (and with the dragged item's start position). Draw thin
  guide lines at those alignment positions and **snap** the item to them when within a few screen pixels.
  Cover left/right/top/bottom edges, horizontal center, and vertical center. This is the primary
  "align things" mechanism.
- **Snap-to-grid (toggle, default OFF):** when enabled, item position (and optionally size) snaps to a
  configurable grid step (default 8px in world units). Expose the toggle in a small View/settings menu.
- **Visible grid overlay (toggle):** in addition to the subtle dot grid, allow toggling a stronger
  square grid overlay that scales with zoom, so the user can eyeball alignment. Independent of the
  snap-to-grid toggle.
- **Align & distribute actions (multi-select):** when 2+ items are selected, offer
  align left / center-horizontal / right / top / center-vertical / bottom, and (for 3+) distribute
  horizontally / vertically with equal spacing. Surface these in a small floating toolbar near the
  selection or a right-click context menu.
- **Modifier override:** holding `Alt`/`Ctrl` while dragging temporarily disables snapping for free
  placement.
- *Re: "draw lines/grids and snap them together":* freeform connector lines are the `line` item type
  (Section 5, two-click). The grid + smart guides above are what make items "snap together" and align.

---

## 10. Keyboard shortcuts (implement these)

| Action | Shortcut |
|---|---|
| New note at cursor | Double-click canvas |
| Pan | Space + drag (or middle-mouse drag) |
| Zoom around cursor | Mouse wheel (and while holding `Z`) |
| Zoom to fit | `Shift + 1` |
| Select all | `Cmd/Ctrl + A` |
| Arm Line tool (then click-click to connect) | `L` |
| Global search (all boards) | `Cmd/Ctrl + F` |
| Paste external text/image → Unsorted note | `Cmd/Ctrl + V` (when no in-app items copied) |
| Deselect / stop editing | `Esc` |
| Delete | `Delete` / `Backspace` |
| Duplicate | `Alt/Option + drag` |
| Copy / Cut / Paste | `Cmd/Ctrl + C / X / V` |
| Undo / Redo | `Cmd/Ctrl + Z` / `Cmd/Ctrl + Shift + Z` |
| Send forward / back | `Cmd/Ctrl + Shift + Up / Down` |
| Nudge / nudge more | Arrows / `Shift + Arrows` |
| Back / Forward / Parent board | `Cmd/Ctrl + [` / `]` / `U` |
| Text: bold/italic/underline/link | `Cmd/Ctrl + B / I / U / K` |
| Text: headings | `Cmd/Ctrl + Shift + 1 / 2` |

Undo/redo: implement a simple **command history** (stack of inverse operations) covering create,
delete, move, resize, edit-commit, and reparent. Per-action granularity is fine.

---

## 11. Visual design tokens (approximated from reference screenshots — get close, not pixel-perfect)

```
--bg-canvas:        #ECECEC   /* canvas surface */
--bg-canvas-dots:   #D6D6D6   /* dot grid dots */
--bg-panel:         #FFFFFF   /* top bar, toolbar */
--card-bg:          #FFFFFF
--card-border:      #E2E2E2
--card-shadow:      0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)
--text-primary:     #2B2F36
--text-muted:       #8A9099
--accent:           #2D7FF9   /* selected tool highlight (blue rounded square) */
--accent-orange:    #F0552A   /* "refer a friend" link color */
--radius-card:      6px
--toolbar-width:    64px
--topbar-height:    52px
```
- **Canvas background:** light gray with a subtle **dot grid** (radial-gradient dots, ~24px spacing
  at 100% zoom; the grid should scale with zoom). Make the dot grid toggleable.
- **Font:** a clean system sans (Inter or system-ui). Board titles slightly heavier.
- **Selected tool** = blue rounded-square background behind the icon (see "Board" tool in references).
- Keep it light, airy, minimal. Generous whitespace.

---

## 12. Definition of Done (acceptance checklist for this run)

The build is complete when ALL of these are true:

1. App runs with `npm install && npm run dev` and opens to the **Home** board.
2. I can **drag any toolbar tool onto the canvas** (and also click-to-place) to create that item.
3. **Note, board, todo, link, image, file, table, column, line, comment** all render and are
   create/move/resize/delete-able.
4. **Notes** are rich-text with working markdown shortcuts and the formatting shortcuts in Section 10.
5. **Nested boards work end-to-end:** create a board card → double-click → I'm inside its canvas →
   breadcrumb shows the path → I can add items there → `Cmd/Ctrl+U` returns to the parent → the parent
   board card shows correct counts and a preview list of any sub-boards.
6. **Pan** (space+drag) and **zoom** (wheel, around cursor) work; zoom range reaches **0.5%** and 400%;
   the **zoom dropdown** and **Zoom-to-fit** work; each board **remembers its viewport**.
7. At deep zoom-out, cards switch to **LOD placeholders** and the board with 200+ cards still pans
   smoothly (no per-frame React re-render of all items).
8. **Off-screen culling** is active (verify in devtools that far items aren't in the DOM).
9. **Undo/redo** works for create/delete/move/resize/edit.
10. **Everything persists** across a full page reload (IndexedDB) — items, boards, nesting, viewports,
    uploaded image/file blobs.
11. **Unsorted** pill parks and restores items.
12. Multi-select, rubber-band select, duplicate (Alt-drag), z-order, nudge all work.
13. **Line tool:** pressing `L` (or clicking it) then clicking two canvas points creates a connector
    with a live preview; the resulting line is **clickable/selectable**, its endpoints are draggable,
    and it can be deleted.
14. **External paste → Unsorted:** copying text in another Windows app and pressing `Ctrl+V` in this app
    creates a new note in the current board's **Unsorted** inbox (not on the canvas); pasting an image
    does the same as an image card. The Unsorted pill flashes to signal arrival.
15. **Global search:** `Cmd/Ctrl+F` searches titles + item text across ALL boards; clicking a result
    navigates to the right board and centers/selects the item.
16. **Alignment aids:** smart alignment guides appear and snap while dragging; snap-to-grid and a grid
    overlay can be toggled; multi-select align/distribute actions work; holding `Alt`/`Ctrl` disables
    snapping.
17. **PWA:** the app is installable (valid manifest + service worker) and loads offline after first run.
18. No console errors during normal use. Desktop only.

Provide a short `README.md` with run instructions and a one-paragraph map of the codebase.

---

## 13. Suggested project structure

```
src/
  main.tsx, App.tsx
  routes/BoardView.tsx
  canvas/
    Viewport.tsx          // camera, pan/zoom handling, culling
    World.tsx             // transformed layer
    useViewport.ts        // pan/zoom state + screen<->world conversions
    SvgConnectorLayer.tsx
    selection.ts          // selection + rubber-band + drag-move/resize
    lod.ts                // level-of-detail thresholds
  items/
    ItemRenderer.tsx      // switches on item.type, applies LOD
    Note.tsx Board.tsx Todo.tsx Link.tsx Image.tsx File.tsx
    Table.tsx Column.tsx Line.tsx Comment.tsx
  ui/
    TopBar.tsx Breadcrumb.tsx ZoomControl.tsx
    Toolbar.tsx ToolButton.tsx
    UnsortedPanel.tsx
  state/
    store.ts              // zustand: boards, items, selection, viewport, armedTool
    history.ts            // undo/redo command stack
  db/
    db.ts                 // dexie schema (boards, items, blobs)
    persistence.ts        // load/save, debounced writers
  lib/
    ids.ts coords.ts constants.ts (MIN_ZOOM, MAX_ZOOM, TOOLBAR_WIDTH...)
  styles/ (tailwind / tokens)
```

Build order: (1) Dexie + store + Home seed → (2) Viewport pan/zoom + World → (3) Toolbar +
create/drag-out + Note → (4) selection/move/resize/delete + persistence → (5) remaining item types
(incl. two-click Line) → (6) nested boards + routing + breadcrumb → (7) culling + LOD + perf pass →
(8) undo/redo, unsorted, external-paste-to-unsorted, zoom dropdown, shortcuts → (9) global search →
(10) snapping/alignment guides + grid → (11) PWA (manifest + service worker) → (12) polish to tokens
+ README. Verify Section 12 at the end.

---

## 14. Out of scope for this run (Phase 2 — do NOT build now)

Accounts/login, any backend or cloud sync, real-time multiplayer, sharing/read-only links,
password-protected boards, presentation mode, comments-with-mentions/notifications, templates library,
web-clipper extension, export to PDF/image, embeds, dark mode, the drawing engine,
video/audio/map/color-swatch cards, mobile/touch support. Leave clean seams for these but
implement none of them. (Note: global **search across all boards IS in scope** — see Section 7a.)

---

## 15. PWA installability (IN SCOPE)

Ship the app as an installable PWA so the user can install it as a desktop app (no `.exe`/Tauri/Electron
needed):

- Use **vite-plugin-pwa** with `registerType: 'autoUpdate'`.
- Provide a valid **web app manifest**: app name "Canvas", short_name, theme/background colors matching
  the design tokens, `display: 'standalone'`, and 192px + 512px icons (a simple generated icon is fine).
- Register a **service worker** that precaches the app shell so it **loads offline** after first run.
  (All user data already lives in IndexedDB, so the app is fully functional offline.)
- Verify the browser shows an install prompt / the install affordance works, and that reloading while
  offline still opens the app.

> No native desktop wrapper is required. If the user ever wants a true `.exe` later, the same codebase
> can be wrapped with Tauri or Electron with no rewrite — but do not set that up in this run.
