import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BookOpen,
  Sparkles,
  LayoutGrid,
  Type,
  Shapes,
  Camera,
  Image,
  Layers,
  Layers3,
  Palette,
  WandSparkles,
  Command,
  Keyboard,
  Share2,
  FileUp,
  Presentation,
  ChevronRight,
  Zap,
  ArrowLeft,
  CircleHelp,
  MonitorPlay,
  Braces,
  Folder,
  Moon,
  Scissors,
  Puzzle,
  Plug,
} from "lucide-react";

export const Route = createFileRoute("/wiki")({
  component: Wiki,
  head: () => ({
    meta: [
      { title: "Wiki — DiapoLab documentation" },
      {
        name: "description",
        content:
          "Learn DiapoLab: formats, panels, elements, plugins and widget packs, motion paths, 3D scene transitions, audio, rotoscope, auto-arrange, shortcuts, effects and transitions, dark mode, accessibility, publishing templates and sharing decks.",
      },
      { property: "og:title", content: "Wiki — DiapoLab documentation" },
      { property: "og:description", content: "Guides and shortcuts for the DiapoLab editor." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://diapolab.vercel.app/screenshot.png" },
      { property: "og:image", content: "https://diapolab.vercel.app/screenshot.png" },
    ],
    links: [{ rel: "canonical", href: "https://diapolab.vercel.app/wiki" }],
  }),
});

const SECTIONS = [
  { id: "getting-started", label: "Getting started", icon: <Sparkles className="size-3.5" /> },
  { id: "formats", label: "Canvas formats", icon: <MonitorPlay className="size-3.5" /> },
  { id: "panels", label: "Panels", icon: <LayoutGrid className="size-3.5" /> },
  { id: "elements", label: "Elements", icon: <Shapes className="size-3.5" /> },
  { id: "plugins", label: "Plugins & packs", icon: <Puzzle className="size-3.5" /> },
  { id: "rotoscope", label: "Rotoscope", icon: <Scissors className="size-3.5" /> },
  { id: "palette", label: "Command palette", icon: <Command className="size-3.5" /> },
  { id: "ai", label: "AI slideshow JSON", icon: <Braces className="size-3.5" /> },
  { id: "shortcuts", label: "Shortcuts", icon: <Keyboard className="size-3.5" /> },
  { id: "effects", label: "Effects & motion", icon: <WandSparkles className="size-3.5" /> },
  { id: "accessibility", label: "Dark mode & a11y", icon: <Moon className="size-3.5" /> },
  { id: "publishing", label: "Publishing & sharing", icon: <Share2 className="size-3.5" /> },
  { id: "faq", label: "FAQ", icon: <CircleHelp className="size-3.5" /> },
];

const PANELS = [
  { icon: <LayoutGrid className="size-4" />, name: "Home", desc: "Community templates and starter decks, loaded in one click." },
  { icon: <Type className="size-4" />, name: "Text", desc: "Titles, headings and paragraphs, with custom fonts." },
  { icon: <Shapes className="size-4" />, name: "Elements", desc: "Shapes, icons, charts, tables, quizzes, buttons and more." },
  { icon: <Image className="size-4" />, name: "Library", desc: "Searchable stock photos and illustrations." },
  { icon: <Camera className="size-4" />, name: "Media", desc: "Upload your own photos, videos and audio, or record your screen and webcam." },
  { icon: <Layers className="size-4" />, name: "Presets", desc: "Ready-made widgets, whole-slide blocks and layout presets." },
  { icon: <Palette className="size-4" />, name: "Design", desc: "Colors, background presets, multi-stop gradients, brand kit, canvas size, magic resize and speaker notes." },
  { icon: <Layers3 className="size-4" />, name: "Layers", desc: "Select, reorder, hide, lock and multi-select elements on the current slide." },
  { icon: <Folder className="size-4" />, name: "Projects", desc: "Open and manage your saved designs." },
];

const ELEMENTS: Array<[string, string]> = [
  ["Text", "Inline-editable titles and paragraphs, with fonts, transforms, typewriter and count-up animations, masks."],
  ["Shapes", "Seventy-six vector shapes in six searchable categories (Basics, Arrows & Flow, Callouts, Stars & Nature, Cyber and Decorative), with five insert styles, plus fills, gradients, strokes and visual effects."],
  ["Icons", "A searchable icon library, recolorable per element, with animated icons."],
  ["Images", "Crop, shape masks, one-click remove background and rotoscope cutouts, plus filters including glitch, pixelate and posterize."],
  ["Photo grids", "Photo and illustration grids where any cell can be swapped for a video."],
  ["Whole-slide blocks", "Full-canvas blocks (cover, agenda, section, closing) you fill in a single pass."],
  ["Video & audio", "Trim window, playback speed, loop and a custom poster frame, straight on the slide."],
  ["Charts", "Bar, line, area, pie and donut charts, with a data editor in the inspector (type, style pack, title, data points and options)."],
  ["Tables", "Styled grids with headers, zebra rows and per-style recipes."],
  ["Quizzes & polls", "Right-or-wrong quizzes (re-skinned by the UI style pack), and live polls synced via Supabase Realtime, with a QR code so the audience votes from their phone."],
  ["QR codes", "A standalone QR element with editable colors and styling, ready to place on any slide."],
  ["Buttons", "Open a link or jump to any slide during a presentation."],
  ["UI components", "Twenty-four kinds (cards, terminals, phones...) in thirteen style packs."],
  ["FlowCraft diagrams", "Sixteen diagram types: flows, structures, networks and layouts, with per-style gradients and group restyling."],
  ["Embeds", "YouTube, Vimeo, Spotify, SoundCloud, Google Maps and Figma links become embeds automatically."],
];

const SHORTCUTS: Array<[string, string]> = [
  ["Ctrl K", "Toggle the command palette"],
  ["Ctrl Z", "Undo (Ctrl Shift Z redoes)"],
  ["Ctrl C / V", "Copy and paste the selection"],
  ["Ctrl D", "Duplicate the selection"],
  ["Del", "Delete the selection"],
  ["Ctrl F", "Find and replace across the whole deck"],
  ["Arrows", "Nudge the selection (Shift = 10 px steps)"],
  ["Shift Click", "Add an element to the selection"],
  ["Double-click", "Edit a text element inline"],
  ["Alt (while dragging)", "Temporarily bypass snapping"],
  ["Wheel", "Scroll the workspace"],
  ["Ctrl Wheel", "Zoom the canvas"],
  ["Esc", "Unpin the sidebar, close menus and dialogs"],
];

function Wiki() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Top navigation */}
      <nav className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-6">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight text-slate-900">
              <img src="/favicon.ico" alt="DiapoLab" className="size-6 rounded-lg object-contain" />
              <span>DiapoLab</span>
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-medium text-slate-500">Wiki</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/marketplace"
              className="hidden rounded-full px-3.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 sm:inline-flex"
            >
              Marketplace
            </Link>
            <Link
              to="/mcp-guide"
              className="hidden rounded-full px-3.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 sm:inline-flex"
            >
              MCP guide
            </Link>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
            >
              <ArrowLeft className="size-3.5" /> Back to editor
            </Link>
          </div>
        </div>
      </nav>

      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-10 sm:py-12">
          <div className="flex items-center gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-600">
              <BookOpen className="size-5" />
            </span>
            <div>
              <p className="text-xs font-semibold text-blue-600">Documentation</p>
              <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                DiapoLab Wiki
              </h1>
            </div>
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-600">
            Everything you need to build decks fast: formats, panels, elements,
            motion, audio, rotoscope cutouts, shortcuts, effects, dark mode, and how
            to share your work with the community.
          </p>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl gap-10 px-6 py-10">
        {/* TOC */}
        <aside className="sticky top-20 hidden h-fit w-52 shrink-0 flex-col gap-0.5 lg:flex">
          <p className="mb-2 px-3 text-xs font-semibold text-slate-500">
            On this page
          </p>
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-blue-600"
            >
              <span className="text-slate-400">{s.icon}</span>
              {s.label}
            </a>
          ))}
        </aside>

        {/* Content */}
        <main className="min-w-0 flex-1 space-y-6">
          <Section
            id="getting-started"
            icon={<Sparkles className="size-4" />}
            kicker="Basics"
            title="Getting started"
          >
            <p>
              The first time you open the editor, a welcome dialog walks you through
              three quick choices: your canvas format, whether to start from a public
              template, and which panel to open first. Prefer to explore on your own?
              Hit <em>Skip</em>. You can always pick a template later from the{" "}
              <strong>Home</strong> panel, a format from <strong>Design</strong>, and
              your saved designs from <strong>Projects</strong>.
            </p>
            <p>
              Name your deck in the toolbar, and press <strong>Save</strong> to store
              it in your account once you are signed in. The <strong>History</strong>{" "}
              button in the bottom dock snapshots versions of your deck so you can
              go back to any of them.
            </p>
            <Callout icon={<Zap className="size-3.5" />}>
              The fastest route to a finished deck: load a template from Home, restyle
              it with the Design panel and the brand kit, then hit{" "}
              <strong>Present</strong> in the toolbar.
            </Callout>
            <p>
              Each slide can also carry <strong>speaker notes</strong>, written in the{" "}
              <strong>Speaker notes</strong> section of the Design panel. They are
              saved with the slide, never rendered on the canvas, and show up in{" "}
              <strong>presenter view</strong> next to the timer and a preview of the
              next slide, and each slide thumbnail can show a badge when it carries
              notes, so nothing gets lost while you rehearse.
            </p>
            <p>
              Two more helpers live in the pages bar: the <strong>slide grid</strong>{" "}
              button opens an overview of every slide, so you can jump anywhere or
              reorder the deck at a glance, and the <strong>eye</strong> toggle on any
              slide hides it from the presentation — the deck keeps it while editing,
              but the audience never sees it during Present.
            </p>
            <p>
              Individual <strong>elements</strong> can be hidden from the presentation
              too, using the same <strong>Hide in presentation</strong> action from the
              element menu: handy for off-slide staging areas or helper notes.
            </p>
          </Section>

          <Section
            id="formats"
            icon={<MonitorPlay className="size-4" />}
            kicker="Canvas"
            title="Canvas formats"
          >
            <p>
              Pick the right canvas for the job. You can change the size at any time
              from <strong>Design</strong>: magic resize re-flows every slide to the
              new proportions, keeping the composition and scaling type along the way.
            </p>
            <ul>
              <li>• Slide 16:9 — 1920×1080, the default for decks</li>
              <li>• Landscape — 1920×1080</li>
              <li>• Square — 1080×1080, for feed posts</li>
              <li>• Story — 1080×1920, vertical social format</li>
              <li>• Post 4:5 — 1080×1350</li>
              <li>• A4 — 1240×1754, for print</li>
            </ul>
          </Section>

          <Section
            id="panels"
            icon={<LayoutGrid className="size-4" />}
            kicker="Sidebar"
            title="Panels"
          >
            <p>
              Hover the left rail to open the sidebar, or click a tool to pin it open.
              Each tool is a panel with its own job. Hide or show panels in{" "}
              <strong>Settings → Visible panels</strong>, and press{" "}
              <Kbd>Esc</Kbd> to unpin. Use the <strong>Layers</strong> panel under Design
              to toggle visibility, lock, reorder and multi-select elements.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {PANELS.map((p) => (
                <div
                  key={p.name}
                  className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 transition-colors hover:border-slate-300"
                >
                  <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700">
                    {p.icon}
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-900">{p.name}</div>
                    <div className="mt-0.5 text-xs leading-relaxed text-slate-500">{p.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section
            id="elements"
            icon={<Shapes className="size-4" />}
            kicker="Insert"
            title="Elements"
          >
            <p>
              Everything that can live on a slide. Insert them from the panels or the
              command palette, then style each one in the inspector on the right.
              Align and distribute actions work on a single element or a multi-selection,
              and smart snapping keeps everything on the grid (hold <Kbd>Alt</Kbd> to
              bypass it while dragging). To tidy a crowded slide, use{" "}
              <strong>Auto-arrange</strong> in the Design panel: <strong>Smart
              auto</strong>, <strong>Balanced grid</strong>, <strong>Row flow</strong>{" "}
              or <strong>Column flow</strong> places your selection (or every unlocked
              element on the slide) without overlaps, with an auto-fit for oversized
              items.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {ELEMENTS.map(([name, desc]) => (
                <div
                  key={name}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 transition-colors hover:border-slate-300"
                >
                  <div className="text-xs font-semibold text-slate-900">{name}</div>
                  <div className="mt-1 text-xs leading-relaxed text-slate-500">{desc}</div>
                </div>
              ))}
            </div>
          </Section>

          <Section
            id="plugins"
            icon={<Puzzle className="size-4" />}
            kicker="Extend"
            title="Plugins & widget packs"
          >
            <p>
              Plugins extend the editor with ready-made widgets and mini-apps. Four
              ships built in — you never have to install them: <strong>Widget
              packs</strong> (glitch, terminal, digital, glass and modern text and
              shape groups that drop on the canvas as one grouped block),{" "}
              <strong>Paint</strong> (a drawing studio: brush, shapes, arrows),{" "}
              <strong>Video</strong> (upload, trim and insert clips) and{" "}
              <strong>AI Search</strong> (web search with sourced results from
              Context.dev).
            </p>
            <p>
              You can also plug in your own: the plugin formats are small pieces of
              JavaScript — <code>diapolabPlugin({"{ name, apps, widgets }"})</code>,
              <code>diapolabApp({"{ name, apps }"})</code> for apps only, or{" "}
              <code>diapolabPack({"{ name, widgets }"})</code> for widget packs only.
              Import the code from the Components panel or the command palette, then
              enable, disable or remove each plugin. Apps of type{" "}
              <strong>runtime</strong> run your HTML in a sandboxed iframe with a tiny{" "}
              <code>diapolab.insert()</code> API that places elements on the slide, and
              any imported plugin can be exported back to portable code to share or
              publish it.
            </p>
            <Callout icon={<Zap className="size-3.5" />}>
              Plugin widgets behave like native elements: they are restyled by the
              inspector, group as one block, and can be saved inside any deck.
            </Callout>
          </Section>

          <Section
            id="rotoscope"
            icon={<Scissors className="size-4" />}
            kicker="Images"
            title="Rotoscope & cutouts"
          >
            <p>
              Select an image and open the <strong>rotoscope editor</strong> from the
              inspector to cut a subject out of its background. Paint over the areas to
              hide with the erase/restore brushes, or switch to{" "}
              <strong>Outline (points)</strong> mode and click point by point around the
              subject, then close the shape. The tinted overlay shows exactly what will
              be hidden, and you choose whether the outlined shape is kept or masked out.
            </p>
            <p>
              The cutout is stored as a <strong>non-destructive mask</strong> on the
              element: the original image is never modified, and you can reopen the
              editor at any time to refine the mask.
            </p>
            <Callout icon={<Zap className="size-3.5" />}>
              For a quick cutout, start from Outline mode and click a point every few
              pixels around the subject; undo a point with the step-back button.
            </Callout>
          </Section>

          <Section
            id="palette"
            icon={<Command className="size-4" />}
            kicker="Power tool"
            title="Command palette"
          >
            <p>
              Press <Kbd>Ctrl</Kbd> + <Kbd>K</Kbd> anywhere in the editor to open the
              command palette. It fuzzy-searches across actions, insertions, shortcuts,
              feature guides, add-on widgets and links, and remembers your recent
              commands. Type “insert chart”, “group”, or “undo”, navigate with the
              arrow keys, run with <Kbd>↵</Kbd>, close with <Kbd>Esc</Kbd>.
            </p>
          </Section>

          <Section
            id="ai"
            icon={<Braces className="size-4" />}
            kicker="For LLMs"
            title="Generate slideshows with AI"
          >
            <p>
              Give an LLM the editor contract below, then ask it to return only valid
              JSON. The example shows the shape of a complete deck: canvas settings,
              pages, and elements with position, size, styling, and content. Pages can
              also set a background, a transition and presenter notes, and elements
              cover the whole catalog above: shapes, images, text, charts, tables,
              quizzes, buttons, UI components and embeds. Keep element types and
              properties consistent with the example so the result can be imported
              safely as a .json design.
            </p>
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-950">
              <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2.5">
                <span className="font-mono text-xs font-semibold text-blue-300">slideshow.json</span>
                <span className="text-xs text-slate-400">Starter contract</span>
              </div>
              <pre className="overflow-x-auto p-4 font-mono text-[11px] leading-relaxed text-slate-200"><code>{`{
  "title": "Product launch",
  "canvas": { "width": 1920, "height": 1080, "format": "16:9" },
  "pages": [
    {
      "id": "page-1",
      "background": "#F8FAFC",
      "elements": [
        {
          "id": "title-1", "type": "text",
          "x": 140, "y": 180, "width": 1100, "height": 150,
          "text": "Ship better ideas",
          "fontSize": 76, "fontFamily": "Inter", "fontWeight": 700,
          "color": "#0F172A", "align": "left"
        },
        {
          "id": "hero-1", "type": "shape",
          "shape": "roundedRect", "x": 140, "y": 390,
          "width": 720, "height": 280, "fill": "#2563EB",
          "radius": 24, "opacity": 1
        },
        {
          "id": "image-1", "type": "image",
          "src": "https://images.unsplash.com/photo-example",
          "x": 980, "y": 180, "width": 720, "height": 490,
          "fit": "cover", "radius": 24
        }
      ]
    }
  ]
}`}</code></pre>
            </div>
            <Callout icon={<Braces className="size-3.5" />}>
              Prompt pattern: “Create a 5-page investor pitch about [topic]. Return only
              JSON matching the DiapoLab slideshow contract. Use unique ids, a
              1920×1080 canvas, and keep every element inside the page bounds.”
            </Callout>
          </Section>

          <Section
            id="shortcuts"
            icon={<Keyboard className="size-4" />}
            kicker="Speed"
            title="Shortcuts"
          >
            <div className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {SHORTCUTS.map(([keys, label]) => (
                <div
                  key={keys}
                  className="flex items-center justify-between gap-3 px-4 py-2.5"
                >
                  <span className="text-xs font-medium text-slate-700">{label}</span>
                  <Kbd>{keys}</Kbd>
                </div>
              ))}
            </div>
            <p className="mt-3">
              <strong>While presenting:</strong> <Kbd>←</Kbd> <Kbd>→</Kbd> or{" "}
              <Kbd>Space</Kbd> navigate slides, <Kbd>1</Kbd>–<Kbd>9</Kbd> jump to a
              slide, <Kbd>P</Kbd> toggles the presenter view (notes, timer and next
              slide), <Kbd>R</Kbd> replays the slide animations, and <Kbd>Esc</Kbd>{" "}
              leaves the presentation.
            </p>
          </Section>

          <Section
            id="effects"
            icon={<WandSparkles className="size-4" />}
            kicker="Motion"
            title="Effects & motion"
          >
            <ul className="space-y-2">
              <li>
                <strong>Slide transitions</strong> — fade, slide, zoom, flip, morph,
                tv, neon, cube, blur, three parallax modes, reveal, shutter, swirl,
                warp, prism and origami, plus five true 3D scene transitions rendered
                in WebGL: <strong>cube, carousel, flip, fold and helix</strong>. Pick
                one per slide from the dock under the canvas, with a live preview. A
                short sound can accompany each transition: enable{" "}
                <strong>Slide sound effects</strong> in Settings and pick a soft whoosh
                or a subtle click, then use <strong>Test sound</strong> to preview it.
              </li>
              <li>
                <strong>3D scenes</strong> — with a 3D transition selected, the{" "}
                <strong>3D Scene &amp; Colors</strong> dialog gives your slides a real
                Three.js stage: ten scene environments, a draggable live preview with
                front, hero and low camera angles, a duration slider (0.6–2.2 s),
                stage floor and floating prisms toggles, and per-part color pickers
                (backdrop, accent &amp; glow, frame, floor) with a palette shuffle.
                Apply the scene to all slides in one click.
              </li>
              <li>
                <strong>Element animations</strong> — entrance animations per element
                (pop, fade-up, glitch, bounce, spin, blur-in and more, including 3D
                entrances like flip, tumble, orbit or depth pop), with a delay to
                stagger objects.
              </li>
              <li>
                <strong>Typewriter & count-up</strong> — animate text typing itself
                letter by letter, and count numbers up to their final value, ideal for
                big figures and KPI slides.
              </li>
              <li>
                <strong>Motion paths</strong> — trace a custom path in the inspector and
                make any element travel along it, with audio cues that fire as the
                element passes each point.
              </li>
              <li>
                <strong>Audio & music</strong> — attach audio cues to elements, and set
                a background music track per slide. Everything stays synced to the slide
                timeline while presenting.
              </li>
              <li>
                <strong>Keyframe animations</strong> — capture any element state on a
                timeline and tween between keyframes with easing curves, from expo-out
                to overshoot.
              </li>
              <li>
                <strong>Shape effects</strong> — Liquid Glass for a frosted translucent
                look, plus neon, soft shadow, inner glow, holographic, glitch and
                honeycomb.
              </li>
              <li>
                <strong>Shape masks</strong> — clip text, shapes and images into
                circles, hexagons, blobs and more.
              </li>
              <li>
                <strong>Image filters</strong> — brightness, contrast, saturation,
                temperature and tint, blur, sepia and hue-rotate, plus live glitch,
                pixelate, posterize and film-grain noise effects.
              </li>
              <li>
                <strong>Gradients</strong> — build multi-stop gradients with up to six
                color stops and position sliders, for element fills and slide
                backgrounds alike.
              </li>
              <li>
                <strong>3D transforms</strong> — add perspective, rotate on X/Y, and
                optional cursor-following tilt in presentation mode.
              </li>
              <li>
                <strong>Interactions</strong> — hover effects (glitch, color, gradient)
                and click-to-jump so any element can navigate to another slide during
                a presentation.
              </li>
            </ul>
          </Section>

          <Section
            id="accessibility"
            icon={<Moon className="size-4" />}
            kicker="Comfort"
            title="Dark mode & accessibility"
          >
            <p>
              Toggle <strong>dark mode</strong> with the moon/sun pill at the bottom of
              the tool rail. The whole editor chrome switches to dark — panels, toolbar,
              zoom dock and scrollbars — while the canvas keeps your slide's own
              colors, so what you design is exactly what your audience sees.
            </p>
            <p>
              The built-in <strong>accessibility checker</strong> (in Settings) checks
              the current slide for WCAG contrast issues, fonts that are too small to
              read from a distance, and elements that sit outside the visible canvas,
              so you can fix them before presenting.
            </p>
            <p>
              Settings also gathers the rest of the comfort options: an{" "}
              <strong>editor theme</strong> picker for the chrome, a{" "}
              <strong>workspace background</strong> behind the canvas (a preset
              backdrop, a solid tint or your own image), and <strong>reduced motion</strong>{" "}
              controls with duration and spring sliders for panel animations.
              Preferences are stored on the device.
            </p>
          </Section>

          <Section
            id="publishing"
            icon={<Share2 className="size-4" />}
            kicker="Community"
            title="Publishing & sharing"
          >
            <p>
              <FileUp className="mr-1 inline size-3.5 text-blue-500" />
              <strong>Publish a template</strong> — from the toolbar menu, share your
              deck with the community. It appears in the Home panel and on the{" "}
              <Link to="/marketplace" className="font-medium text-blue-600 underline">marketplace</Link>,
              and you can rename or unpublish it at any time from{" "}
              <strong>Settings → My published templates</strong>.
            </p>
            <p className="mt-2">
              <Presentation className="mr-1 inline size-3.5 text-blue-500" />
              <strong>Share a deck</strong> — the share button copies a private share
              link. Anyone with the link opens a clean view-only page with a Present
              button and a page counter, without ever seeing your editor. Manage your
              links from <strong>Settings → Private share links</strong>: copy them
              again or revoke any link, cutting off access instantly.
            </p>
            <p className="mt-2">
              <strong>Export & import</strong> — the Export menu saves the current
              slide as PNG or JPG, the whole deck as PDF, PPTX or Markdown, an animated
              GIF, or the editable JSON source file. The import button brings{" "}
              .pptx decks and .json designs back into the editor.
            </p>
            <p className="mt-2">
              <strong>Creator profiles</strong> — sign in to set a username, display
              name and avatar. Your published templates appear on your public profile
              page, and other users can follow your work by subscribing to you from
              the marketplace and their profile pages.
            </p>
            <p className="mt-2">
              <Plug className="mr-1 inline size-3.5 text-blue-500" />
              <strong>Cloud saving</strong> — sign in to save your designs online and
              reopen them from the Projects panel on any device.
            </p>
          </Section>

          <Section
            id="faq"
            icon={<CircleHelp className="size-4" />}
            kicker="FAQ"
            title="Frequently asked questions"
          >
            <Faq q="Is DiapoLab free?">
              Yes. The editor, templates and themes are free to use and remix.
            </Faq>
            <Faq q="Where are my designs stored?">
              Locally in your browser, and in your account when you sign in. Publish
              or share to move them onto the server.
            </Faq>
            <Faq q="Can I import and export PowerPoint files?">
              Yes. The import button brings a .pptx into the editor, and the Export
              menu writes .pptx, PDF and more.
            </Faq>
            <Faq q="How do I report a bug?">
              Open an issue directly on{" "}
              <a
                href="https://github.com/PNBPositron/DiapoLab/issues"
                className="font-medium text-blue-600 underline"
              >
                GitHub
              </a>
              , or use the command palette (<Kbd>Ctrl</Kbd>+<Kbd>K</Kbd>) and search
              “report a bug”.
            </Faq>
          </Section>

          <footer className="border-t border-slate-200 pt-6">
            <div className="flex flex-wrap gap-2">
              {[
                { to: "/" as const, label: "Editor" },
                { to: "/marketplace" as const, label: "Marketplace" },
                { to: "/mcp-guide" as const, label: "MCP guide" },
                { to: "/privacypolicy" as const, label: "Privacy policy" },
                { to: "/license" as const, label: "License" },
              ].map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-medium text-slate-600 transition hover:border-blue-300 hover:text-blue-600"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}

/* ---------- Small building blocks ---------- */

function Section({
  id,
  icon,
  kicker,
  title,
  children,
}: {
  id: string;
  icon: React.ReactNode;
  kicker: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 rounded-3xl border border-slate-200 bg-white p-6">
      <div className="flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-xl border border-blue-100 bg-blue-50 text-blue-600">{icon}</span>
        <p className="text-xs font-semibold text-blue-600">{kicker}</p>
      </div>
      <h2 className="mt-2 font-display text-lg font-semibold tracking-tight text-slate-900">{title}</h2>
      <div className="mt-3 space-y-2.5 text-sm leading-relaxed text-slate-600">{children}</div>
    </section>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded-lg border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[11px] font-medium text-slate-700">
      {children}
    </kbd>
  );
}

function Callout({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mt-3 flex items-start gap-2.5 rounded-2xl border border-blue-200 bg-blue-50/50 px-4 py-3 text-xs leading-relaxed text-blue-900">
      <span className="mt-0.5 shrink-0 text-blue-600">{icon}</span>
      <span>{children}</span>
    </div>
  );
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <details className="group rounded-2xl border border-slate-200 bg-white px-4 py-3 [&_summary::-webkit-details-marker]:hidden">
      <summary className="flex cursor-pointer items-center justify-between gap-3 text-xs font-semibold text-slate-800">
        {q}
        <ChevronRight className="size-3.5 shrink-0 text-slate-400 transition-transform group-open:rotate-90" />
      </summary>
      <p className="mt-2 text-xs leading-relaxed text-slate-600">{children}</p>
    </details>
  );
}
