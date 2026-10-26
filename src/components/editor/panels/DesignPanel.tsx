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
    <div className="relative">
      {/* Accent bar marking the open section */}
      {open && (
        <span
          aria-hidden
          className="absolute inset-y-2.5 left-0 w-[3px] rounded-full bg-gradient-to-b from-sky-400 to-indigo-500"
        />
      )}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className={`group flex w-full items-center gap-3 py-3 pl-4 pr-3 text-left transition-colors ${
          open ? "bg-slate-50/60" : "hover:bg-slate-50/80 active:bg-slate-100/60"
        }`}
      >
        {/* Soft tinted icon chip */}
        <div
          className={`flex size-8 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105 ${iconBg}`}
        >
          <Icon className={`size-4 ${iconColor}`} />
        </div>

        {/* Title & micro-detail — subtitle stays visible so the row keeps a
            stable height whether open or closed */}
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[12px] font-semibold leading-tight text-slate-800">
            {title}
          </span>
          <span className="truncate text-[10px] font-normal leading-tight text-slate-400">
            {subtitle}
          </span>
        </div>

        {/* Chevron */}
        <ChevronRight
          className={`ml-auto size-3.5 shrink-0 text-slate-300 transition-transform duration-200 ease-out group-hover:text-slate-500 ${
            open ? "rotate-90 text-slate-700" : ""
          }`}
        />
      </button>

      {/* Expanded child panel */}
      {open && (
        <div className="animate-in fade-in-50 slide-in-from-top-1 border-t border-slate-100/80 bg-slate-50/40 px-3.5 py-3.5 duration-200">
          {children}
        </div>
      )}
    </div>
  );
}

export function DesignPanel() {
  return (
    <div className="flex flex-col gap-4 p-1 text-slate-800">
      <PanelHeader
        kicker="Design"
        title="Shape your slide"
        description="Format, background, brand language and master style — one place."
        icon={Palette}
      />

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_10px_30px_-18px_rgba(15,23,42,0.3)]">
        <div className="divide-y divide-slate-100/80">
          <SectionRow
            title="Canvas format"
            subtitle="16:9 Presentation (1920 × 1080)"
            Icon={Maximize2}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
            defaultOpen
          >
            <SizePanel />
          </SectionRow>

          <SectionRow
            title="Background fill"
            subtitle="Solid, gradient, or canvas texture"
            Icon={Palette}
            iconBg="bg-violet-50"
            iconColor="text-violet-600"
          >
            <ColorPanel />
          </SectionRow>

          <SectionRow
            title="Brand kit"
            subtitle="Shared typography & colors"
            Icon={Sparkles}
            iconBg="bg-amber-50"
            iconColor="text-amber-600"
          >
            <BrandKitPanel />
          </SectionRow>

          <SectionRow
            title="Master style"
            subtitle="Push this slide's style deck-wide"
            Icon={Clapperboard}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
          >
            <MasterStylePanel />
          </SectionRow>
        </div>
      </div>

      <p className="px-1 text-[10px] leading-relaxed text-slate-400">
        Tip — Master style applies this slide's look to the whole deck in one click.
      </p>
    </div>
  );
}

export default DesignPanel;
