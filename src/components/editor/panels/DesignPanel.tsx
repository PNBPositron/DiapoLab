import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { ColorPanel } from "./ColorPanel";
import { SizePanel } from "./SizePanel";
import { BrandKitPanel } from "./BrandKitPanel";
import { PanelHeader } from "./TextPanel";

function DesignSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_4px_rgba(15,23,42,0.04)]">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-slate-700 transition-colors hover:bg-slate-50"
      >
        <ChevronDown className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
        <span className="font-display text-[10px] uppercase tracking-[0.2em]">{title}</span>
        <span className="ml-auto font-mono text-[9px] text-slate-400">{open ? "OPEN" : "CLOSED"}</span>
      </button>
      {open && <div className="border-t border-slate-100 p-3">{children}</div>}
    </section>
  );
}

export function DesignPanel() {
  return (
    <div className="flex flex-col gap-3">
      <PanelHeader title="Design" />
      <DesignSection title="Canvas size"><SizePanel /></DesignSection>
      <DesignSection title="Brand kit"><BrandKitPanel /></DesignSection>
      <DesignSection title="Background & color"><ColorPanel /></DesignSection>
    </div>
  );
}

export default DesignPanel;
