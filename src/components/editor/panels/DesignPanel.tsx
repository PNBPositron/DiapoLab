import { useState, type ReactNode } from "react";
import {
  ChevronRight,
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

interface SectionConfig {
  id: string;
  title: string;
  subtitle: string;
  Icon: LucideIcon;
  children: ReactNode;
  defaultOpen?: boolean;
}

/** Accordion row — same card language as the other panels (rounded-2xl,
 * white card, soft lift on hover, slate chip that turns blue, blue chevron). */
function SectionRow({
  title,
  subtitle,
  Icon,
  children,
  defaultOpen = false,
}: Omit<SectionConfig, "id">) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className={`overflow-hidden rounded-2xl border bg-white transition-all duration-200 ${
        open
          ? "border-blue-200/80 shadow-[0_12px_26px_-10px_rgba(37,99,235,0.22)]"
          : "border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.05)] hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_12px_26px_-12px_rgba(37,99,235,0.25)]"
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="group flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-slate-50/80 active:bg-slate-100/60"
      >
        {/* Icon chip — matches the TextPanel preset rows */}
        <div
          className={`grid size-8 shrink-0 place-items-center rounded-lg transition-colors duration-200 ${
            open
              ? "bg-blue-50 text-blue-600"
              : "bg-slate-100/80 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600"
          }`}
        >
          <Icon className="size-4" />
        </div>

        {/* Title & micro-detail */}
        <div className="flex min-w-0 flex-col">
          <span className={`text-xs font-semibold leading-tight ${
            open ? "text-slate-900" : "text-slate-800 group-hover:text-slate-950"
          }`}>
            {title}
          </span>
          {!open && (
            <span className="text-[10px] font-normal leading-tight text-slate-400">
              {subtitle}
            </span>
          )}
        </div>

        {/* Chevron */}
        <ChevronRight
          className={`ml-auto size-4 transition-transform duration-200 ease-out ${
            open ? "rotate-90 text-blue-600" : "text-slate-300 group-hover:text-slate-500"
          }`}
        />
      </button>

      {/* Expanded child panel */}
      {open && (
        <div className="animate-in fade-in-50 border-t border-slate-100 bg-slate-50/50 px-3 py-3 duration-150">
          {children}
        </div>
      )}
    </div>
  );
}

export function DesignPanel() {
  return (
    <div className="flex flex-col gap-4 p-3 text-slate-800">
      <PanelHeader kicker="Design" title="Shape your slide" description="Tune the canvas, brand language, and background from one place." icon={Palette} />

      <div className="flex flex-col gap-2.5">
        <SectionRow
          title="Canvas format"
          subtitle="16:9 Presentation (1920 × 1080)"
          Icon={Maximize2}
          defaultOpen
        >
          <SizePanel />
        </SectionRow>

        <SectionRow
          title="Brand kit"
          subtitle="Shared typography & colors"
          Icon={Sparkles}
        >
          <BrandKitPanel />
        </SectionRow>

        <SectionRow
          title="Background fill"
          subtitle="Solid, gradient, or canvas texture"
          Icon={Palette}
        >
          <ColorPanel />
        </SectionRow>

        <SectionRow
          title="Master style"
          subtitle="Push this slide's style deck-wide"
          Icon={Clapperboard}
        >
          <MasterStylePanel />
        </SectionRow>
      </div>
    </div>
  );
}

export default DesignPanel;
