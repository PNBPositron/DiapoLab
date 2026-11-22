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
import { PanelHeader, SegmentedControl } from "../ui/selectors";

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
 * DesignPanel — organised exactly like the Components (presets) panel:
 * PanelHeader, then the shared SegmentedControl to pick the active tool,
 * a micro-caption section label, then the tool's content below.
 */
export function DesignPanel() {
  const [section, setSection] = useState<SectionId>("canvas");
  const active = SECTIONS.find((s) => s.id === section) ?? SECTIONS[0];
  const ActiveIcon = active.Icon;
  const SHORT: Record<SectionId, string> = {
    canvas: "Fmt",
    brand: "Brand",
    background: "BG",
    master: "Master",
  };

  return (
    <div className="space-y-4">
      <PanelHeader
        kicker="Design"
        title="Shape your slide"
        description="Tune the canvas, brand language, and background from one place."
        icon={Palette}
      />

      {/* ── Same shared SegmentedControl as the ComponentsPanel ── */}
      <div>
        <SegmentedControl
          value={section}
          onChange={setSection}
          label="Design category"
          options={SECTIONS.map(({ id, title, subtitle }) => ({
            value: id,
            label: SHORT[id],
            title: title + " — " + subtitle,
          }))}
        />
      </div>

      {/* ── Active section — caption label, then content ── */}
      <div>
        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
          <ActiveIcon className="size-3.5 text-blue-600" />
          <span>{active.title}</span>
          <span className="font-normal text-slate-400">
            · {active.subtitle}
          </span>
        </div>
        <div className="animate-in fade-in-50 duration-150">{active.children}</div>
      </div>
    </div>
  );
}

export default DesignPanel;
