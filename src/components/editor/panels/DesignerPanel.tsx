import { useEditor } from "@/store/editor";
import { applyLayout, SUGGESTIONS } from "@/lib/designer";
import { PanelHeader } from "./TextPanel";

export function DesignerPanel() {
  const { pages, currentIndex, canvasW, canvasH, loadTemplate } = useEditor();
  const page = pages[currentIndex];
  const els = page?.elements ?? [];

  const preview = (id: (typeof SUGGESTIONS)[number]["id"]) =>
    applyLayout(els, id, canvasW, canvasH);

  return (
    <div className="space-y-3">
      <PanelHeader title="Layouts" />
      <p className="font-mono text-[10px] leading-relaxed text-teal/60">
        Same content, new composition. Click a layout to apply it to this slide.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {SUGGESTIONS.map((s) => {
          const laid = preview(s.id);
          return (
            <button
              key={s.id}
              disabled={els.length === 0}
              onClick={() => loadTemplate(laid)}
              className="brutal-border-2 brutal-press bg-surface p-2 text-left text-teal/80 hover:border-teal hover:text-teal disabled:opacity-40"
            >
              <div
                className="relative mb-1.5 w-full border border-current/40"
                style={{ aspectRatio: `${canvasW} / ${canvasH}`, background: page?.bgColor }}
              >
                {laid.slice(0, 12).map((e) => (
                  <span
                    key={e.id}
                    className="absolute bg-current opacity-60"
                    style={{
                      left: `${(e.x / canvasW) * 100}%`,
                      top: `${(e.y / canvasH) * 100}%`,
                      width: `${(e.width / canvasW) * 100}%`,
                      height: `${(e.height / canvasH) * 100}%`,
                    }}
                  />
                ))}
              </div>
              <span className="block font-display text-[10px] uppercase tracking-[0.15em]">
                {s.label}
              </span>
              <span className="block font-mono text-[9px] opacity-60">{s.hint}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
