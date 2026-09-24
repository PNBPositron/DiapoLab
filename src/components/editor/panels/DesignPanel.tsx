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

interface DesignSectionProps {
  title: string;
  icon: LucideIcon;
  badge?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

function DesignSection({
  title,
  icon: Icon,
  badge,
  defaultOpen = false,
  children,
}: DesignSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className={`group rounded-xl border transition-all duration-150 ${
        open
          ? "border-slate-300/80 bg-white shadow-xs"
          : "border-slate-200/70 bg-white/60 hover:border-slate-300 hover:bg-white"
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left transition-colors select-none"
      >
        <div
          className={`flex size-6 shrink-0 items-center justify-center rounded-md transition-colors ${
            open
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-800"
          }`}
        >
          <Icon className="size-3.5" />
        </div>

        <span className="text-xs font-medium text-slate-800 tracking-tight">
          {title}
        </span>

        <div className="ml-auto flex items-center gap-2">
          {badge && !open && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
              {badge}
            </span>
          )}
          <ChevronRight
            className={`size-3.5 text-slate-400 transition-transform duration-200 ease-out ${
              open ? "rotate-90 text-slate-700" : "group-hover:text-slate-600"
            }`}
          />
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-100 px-3.5 py-3 animate-in fade-in-50 duration-150">
          {children}
        </div>
      )}
    </div>
  );
}

export function DesignPanel() {
  return (
    <div className="flex flex-col gap-2 p-3 text-slate-800">
      <div className="flex items-center justify-between px-0.5 pb-1">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Canvas & Theming
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <DesignSection
          title="Canvas size"
          icon={Maximize2}
          badge="16:9"
          defaultOpen
        >
          <SizePanel />
        </DesignSection>

        <DesignSection
          title="Brand kit"
          icon={Sparkles}
          badge="Tokens"
        >
          <BrandKitPanel />
        </DesignSection>

        <DesignSection
          title="Background & color"
          icon={Palette}
          badge="Fill"
        >
          <ColorPanel />
        </DesignSection>
      </div>
    </div>
  );
}

export default DesignPanel;
