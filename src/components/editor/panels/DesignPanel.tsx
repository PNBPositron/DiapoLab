import { useState } from "react";
import {
  Clapperboard,
  Maximize2,
  Palette,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { ColorPanel } from "./ColorPanel";
import { SizePanel } from "./SizePanel";
import { BrandKitPanel } from "./BrandKitPanel";
import { MasterStylePanel } from "./MasterStylePanel";
import { PanelHeader } from "../ui/selectors";

type SectionId = "canvas" | "brand" | "background" | "master";

const SECTIONS: {
  id: SectionId;
  title: string;
  subtitle: string;
  Icon: LucideIcon;
  children: React.ReactNode;
}[] = [
  {
    id: "canvas",
    title: "Canvas format",
    subtitle: "16:9 Presentation (1920 × 1080)",
    Icon: Maximize2,
    children: <SizePanel />,
  },
  {
    id: "brand",
    title: "Brand kit",
    subtitle: "Shared typography & colors",
    Icon: Sparkles,
    children: <BrandKitPanel />,
  },
  {
    id: "background",
    title: "Background fill",
    subtitle: "Solid, gradient, or canvas texture",
    Icon: Palette,
    children: <ColorPanel />,
  },
  {
    id: "master",
    title: "Master style",
    subtitle: "Push this slide's style deck-wide",
    Icon: Clapperboard,
    children: <MasterStylePanel />,
  },
];

/**
 * DesignPanel — organised like the Templates (presets) panel:
 * a grid of quick tiles to pick the active tool, a micro-caption section
 * label, then the tool's content below.
 */
export function DesignPanel() {
  const [section, setSection] = useState<SectionId>("canvas");
  const active = SECTIONS.find((s) => s.id === section) ?? SECTIONS[0];
  const ActiveIcon = active.Icon;

  return (
    <div className="space-y-4">
      <PanelHeader
        kicker="Design"
        title="Shape your slide"
        description="Tune the canvas, brand language, and background from one place."
        icon={Palette}
      />

      {/* ── Quick tiles — same grid as the TemplatesPanel quick start ── */}
      <div className="grid grid-cols-4 gap-2 px-4">
        {SECTIONS.map(({ id, title, Icon }) => {
          const on = id === section;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setSection(id)}
              aria-pressed={on}
              className={`group flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97] ${
                on
                  ? "border-blue-600 bg-blue-50/70 shadow-[0_10px_24px_-10px_rgba(37,99,235,0.3)]"
                  : "border-slate-200 bg-white hover:border-blue-300 hover:shadow-[0_10px_24px_-10px_rgba(37,99,235,0.3)]"
              }`}
            >
              <span
                className={`grid size-8 place-items-center rounded-lg transition-colors ${
                  on
                    ? "bg-blue-600 text-white"
                    : "bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white"
                }`}
              >
                <Icon className="size-4" />
              </span>
              <span
                className={`text-[10px] font-semibold leading-tight ${
                  on ? "text-blue-700" : "text-slate-700"
                }`}
              >
                {title.split(" ")[0]}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Active section — micro-caption label, then content ── */}
      <div>
        <div className="mb-1.5 flex items-center gap-1.5 px-4 text-[9px] font-bold tracking-[0.14em] text-slate-400">
          <ActiveIcon className="size-3 text-blue-400" />
          {active.title.toUpperCase()}
          <span className="font-normal tracking-normal text-slate-300 normal-case">
            {active.subtitle}
          </span>
        </div>
        <div className="animate-in fade-in-50 duration-150">{active.children}</div>
      </div>
    </div>
  );
}

export default DesignPanel;
