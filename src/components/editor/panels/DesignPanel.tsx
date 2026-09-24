import { useState, type ReactNode } from "react";
import {
  ChevronRight,
  Maximize2,
  Palette,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { ColorPanel } from "./ColorPanel";
import { SizePanel } from "./SizePanel";
import { BrandKitPanel } from "./BrandKitPanel";

interface SectionConfig {
  id: string;
  title: string;
  subtitle: string;
  Icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

function SectionRow({
  title,
  subtitle,
  Icon,
  iconBg,
  iconColor,
  children,
  defaultOpen = false,
}: Omit<SectionConfig, "id">) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="transition-colors duration-150">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="group flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-slate-50/80 active:bg-slate-100/60"
      >
        {/* Soft Tinted Icon Chip */}
        <div
          className={`flex size-7 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105 ${iconBg} ${iconColor}`}
        >
          <Icon className="size-3.5" />
        </div>

        {/* Title & Micro-detail */}
        <div className="flex flex-col min-w-0">
          <span className="text-[12px] font-medium text-slate-850 leading-tight">
            {title}
          </span>
          {!open && (
            <span className="text-[10px] text-slate-400 font-normal leading-tight">
              {subtitle}
            </span>
          )}
        </div>

        {/* Chevron */}
        <ChevronRight
          className={`ml-auto size-3.5 text-slate-300 transition-transform duration-200 ease-out group-hover:text-slate-500 ${
            open ? "rotate-90 text-slate-700" : ""
          }`}
        />
      </button>

      {/* Expanded Child Panel */}
      {open && (
        <div className="border-t border-slate-100/80 bg-slate-50/40 px-3.5 py-3 animate-in fade-in-50 duration-150">
          {children}
        </div>
      )}
    </div>
  );
}

export function DesignPanel() {
  return (
    <div className="flex flex-col gap-3 p-2 text-slate-800">
      {/* Section Header */}
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Slide Attributes
        </span>
      </div>

      {/* Unified Inset Surface */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.03)] divide-y divide-slate-100/80">
        <SectionRow
          title="Canvas format"
          subtitle="16:9 Presentation (1920 × 1080)"
          Icon={Maximize2}
          iconBg="bg-blue-50 text-blue-600 dark:bg-blue-950/40"
          iconColor="text-blue-600"
          defaultOpen
        >
          <SizePanel />
        </SectionRow>

        <SectionRow
          title="Brand kit"
          subtitle="Shared typography & colors"
          Icon={Sparkles}
          iconBg="bg-amber-50 text-amber-600 dark:bg-amber-950/40"
          iconColor="text-amber-600"
        >
          <BrandKitPanel />
        </SectionRow>

        <SectionRow
          title="Background fill"
          subtitle="Solid, gradient, or canvas texture"
          Icon={Palette}
          iconBg="bg-violet-50 text-violet-600 dark:bg-violet-950/40"
          iconColor="text-violet-600"
        >
          <ColorPanel />
        </SectionRow>
      </div>
    </div>
  );
}

export default DesignPanel;
