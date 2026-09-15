import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { ColorPanel } from "./ColorPanel";
import { SizePanel } from "./SizePanel";
import { BrandKitPanel } from "./BrandKitPanel";
import { PanelHeader } from "./TextPanel";

function DesignSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="overflow-hidden border border-teal/25 bg-surface/40">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-teal hover:bg-blue-deep/30"
      >
        <ChevronDown className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
        <span className="font-display text-[10px] uppercase tracking-[0.2em]">{title}</span>
        <span className="ml-auto font-mono text-[9px] text-teal/45">{open ? "OPEN" : "CLOSED"}</span>
      </button>
      {open && <div className="border-t border-teal/20 p-3">{children}</div>}
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
