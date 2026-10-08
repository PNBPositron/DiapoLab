## Scope

Six independent changes to the editor. I'll do them as one coordinated update so the AI generator and presentation mode are touched only once.

### 1. Remove 3D "spin" feature

- Drop the `spinSpeed` control everywhere it's user-facing (sphere presets, properties panel, AI 3D scene generator prompt).
- Keep `Model3DElement` typing for backward compatibility but force `spinSpeed: 0` so nothing rotates.
- Remove the `positron-spin3d` keyframe usage from `Model3DRender`.

### 2. Save current design as a public template

- New `public_templates` table (`id, user_id, name, canvas_w, canvas_h, pages jsonb, thumbnail, created_at`) with RLS:
  - everyone (anon + auth) can `SELECT`
  - only owner can `INSERT/UPDATE/DELETE`
- "Publish as template" button in the Toolbar (visible only when signed in). Asks for a name, snapshots current `pages/canvasW/canvasH`, writes a row.
- Templates panel gets a new **Community** tab listing public templates (thumbnail + name). Clicking one loads it as a brand-new multi-page design (replaces current pages, asks for confirm).

### 3. Multi-slide AI templates

- `generateAiTemplate` returns an array of pages (1 title + 2–5 content + 1 summary) instead of one. New return shape:
  ```
  { pages: [{ bg, elements }, ...] }
  ```
- The system prompt instructs the model to produce a cohesive deck: a Title slide, Content slides with clear roles, and a Summary slide — all sharing palette and type.
- Templates panel: when the user generates, it loads ALL returned pages into the design (replacing existing pages) instead of stamping a single canvas.

### 4. Image backgrounds

- Extend `Page` with optional `bgImage: string` (data URL or http URL) and `bgFit: "cover" | "contain"`.
- Canvas / PresentationMode render `bgImage` behind elements when set.
- New "Background" section in the Color panel: upload image (reuses existing uploads flow) or paste URL, plus a "remove image" button. Solid color still applies when no image.

### 5. Slide transitions + element animations

- Extend `Page` with `transition: "none" | "fade" | "slide" | "glitch" | "zoom" | "flip"`.
- PresentationMode wraps each slide in a keyed wrapper and plays the chosen CSS animation on enter (keyframes added in `styles.css`, including a `glitch` keyframe with RGB-shift + clip-path jitter).
- Pages bar / Properties panel: new "Transition" dropdown per page.
- Element entrance animations: extend `ElementBase` with optional `animation: "none" | "fade-up" | "pop" | "glitch"`; in present mode only, elements play it on slide enter. Properties panel exposes a small selector.

### 6. Slide jump buttons in presentation mode

- Add a bottom-center thumbnail strip overlay in `PresentationMode` (auto-hides after 2 s of mouse idle, shows on mouse-move). Each thumbnail is a click-to-jump button; current slide highlighted. Keyboard `1-9` jumps to that slide index.

## Technical notes

- DB: one migration creates `public_templates` + RLS + `updated_at` trigger reusing `touch_updated_at`. Thumbnails stored as data URLs in the row (no new storage bucket).
- AI generator change is breaking: bump the response schema and update both `TemplatesPanel` and the `Ai3DScene` panel call site (3D panel keeps working — only `generateAiTemplate` shape changes).
- `bgImage` / `transition` / element `animation` default to undefined → existing designs keep rendering unchanged. Loader normalizes missing fields.
- Glitch keyframe: `@keyframes glitch` with text-shadow RGB-split + clip-path slices, ~600 ms duration.
- The "publish" and "community templates" features require auth (already wired via `requireSupabaseAuth`); the button is hidden when signed out.

## Out of scope

- No new storage bucket (background images uploaded inline reuse existing image-upload data-URL flow).
- No template versioning, likes, or moderation.
- No reordering / DnD on the presenter thumbnail strip.

Ready to build this in one pass?
