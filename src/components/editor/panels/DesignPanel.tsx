import { useState } from "react";
import {
  Clapperboard,
  Layers,
  LayoutGrid,
  Maximize2,
  Palette,
  type LucideIcon,
} from "lucide-react";
import { ColorPanel } from "./ColorPanel";
import { SizePanel } from "./SizePanel";
import { BrandKitPanel } from "./BrandKitPanel";
import { MasterStylePanel } from "./MasterStylePanel";
import { AutoArrangePanel } from "./AutoArrangePanel";
import { PanelHeader, SegmentedControl } from "../ui/selectors";

type SectionId = "canvas" | "brand" | "background" | "arrange";

function BrandAndMasterSection() {
  return (
    <div className="space-y-5">
      <BrandKitPanel />
      <div className="border-t border-slate-100 px-4 pt-4">
        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
          <Clapperboard className="size-3.5 text-blue-600" />
          <span>Master style</span>
          <span className="font-normal text-slate-400">· Push slide deck-wide</span>
        </div>
        <MasterStylePanel />
      </div>
    </div>
  );
}

const SECTIONS: {
  id: SectionId;
  short: string;
  title: string;
  subtitle: string;
  Icon: LucideIcon;
  children: React.ReactNode;
}[] = [
  {
    id: "canvas",
    short: "Format",
    title: "Canvas format",
    subtitle: "16:9 Presentation (1920 × 1080)",
    Icon: Maximize2,
    children: <SizePanel />,
  },
  {
    id: "brand",
    short: "Brand",
    title: "Brand & master",
    subtitle: "Brand kit, typography & deck-wide style",
    Icon: Layers,
    children: <BrandAndMasterSection />,
  },
  {
    id: "background",
    short: "Fill",
    title: "Background fill",
    subtitle: "Solid, gradient, or canvas texture",
    Icon: Palette,
    children: <ColorPanel />,
  },
  {
    id: "arrange",
    short: "Arrange",
    title: "Auto-arrange",
    subtitle: "Overlap-free layout for selected items",
    Icon: LayoutGrid,
    children: <AutoArrangePanel />,
  },
];

/**
 * DesignPanel — organised like the Components (presets) panel:
 * PanelHeader, then the shared SegmentedControl with icons to pick the active tool,
 * a micro-caption section label, then the tool's content below.
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

      {/* ── Same shared SegmentedControl as ComponentsPanel & LibraryPanel ── */}
      <div>
        <SegmentedControl
          value={section}
          onChange={setSection}
          label="Design category"
          options={SECTIONS.map(({ id, short, title, subtitle, Icon }) => ({
            value: id,
            label: short,
            icon: Icon,
            title: title + " — " + subtitle,
          }))}
        />
      </div>

      {/* ── Active section — caption label, then content ── */}
      <div>
        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
          <ActiveIcon className="size-3.5 text-blue-600" />
          <span>{active.title}</span>
          <span className="font-normal text-slate-400">· {active.subtitle}</span>
        </div>
        <div className="animate-in fade-in-50 duration-150">{active.children}</div>
      </div>
    </div>
  );
}

export default DesignPanel;
