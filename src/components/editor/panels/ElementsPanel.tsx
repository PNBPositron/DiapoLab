import { useState, type ChangeEvent } from "react";
import * as LucideIcons from "lucide-react";
import { Upload, Shapes, Star, BarChart3, TrendingUp, HelpCircle, Search, ImagePlus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { newChart, newIcon, newImage, newQuiz, useEditor } from "@/store/editor";
import { ShapesPanel } from "./ShapesPanel";
import { PanelHeader } from "./TextPanel";

type ElementSection = "shapes" | "icons" | null;

const ICONS: Array<{ name: string; label: string; Icon: LucideIcon }> = Object.entries(LucideIcons)
  .filter(([name, icon]) => {
    const isLucideComponent = typeof icon === "object" && icon !== null && "render" in icon;
    return name !== "createLucideIcon" && isLucideComponent && /^[A-Z]/.test(name);
  })
  .map(([name, Icon]) => ({
    name,
    label: name.replace(/([a-z])([A-Z])/g, "$1 $2"),
    Icon: Icon as LucideIcon,
  }))
  .sort((a, b) => a.label.localeCompare(b.label))
  .slice(0, 500);

export function ElementsPanel() {
  const { add } = useEditor();
  const [section, setSection] = useState<ElementSection>(null);
  const [iconQuery, setIconQuery] = useState("");
  const filteredIcons = ICONS.filter(({ label }) => label.toLowerCase().includes(iconQuery.trim().toLowerCase()));
  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    files.forEach((file) => add(newImage(URL.createObjectURL(file))));
  };

  return (
    <div className="panel-content">
      <PanelHeader title="Elements" />
      <div className="panel-intro">Drop in visual building blocks for your slide.</div>
      <div className="panel-action-grid">
        <label className="brutal-border-2 brutal-press flex h-20 cursor-pointer flex-col items-center justify-center gap-2 bg-surface text-teal hover:border-teal">
          <Upload className="size-5" />
          <span className="font-display text-[9px] uppercase tracking-[0.12em]">Upload</span>
          <input type="file" accept="image/*" multiple onChange={onFile} className="hidden" />
        </label>
        <button onClick={() => setSection(section === "shapes" ? null : "shapes")} className={`brutal-border-2 brutal-press flex h-20 flex-col items-center justify-center gap-2 ${section === "shapes" ? "border-teal bg-blue-deep" : "bg-surface"} text-teal hover:border-teal`}>
          <Shapes className="size-5" />
          <span className="font-display text-[9px] uppercase tracking-[0.12em]">Shapes</span>
        </button>
        <button onClick={() => setSection(section === "icons" ? null : "icons")} className={`brutal-border-2 brutal-press flex h-20 flex-col items-center justify-center gap-2 ${section === "icons" ? "border-teal bg-blue-deep" : "bg-surface"} text-teal hover:border-teal`}>
          <Star className="size-5" />
          <span className="font-display text-[9px] uppercase tracking-[0.12em]">Icons</span>
        </button>
        <button onClick={() => add(newChart("bar"))} title="Add chart" className="brutal-border-2 brutal-press flex h-20 flex-col items-center justify-center gap-2 bg-surface text-teal hover:border-teal">
          <BarChart3 className="size-5" />
          <span className="font-display text-[9px] uppercase tracking-[0.12em]">Chart</span>
        </button>
        <button onClick={() => add(newChart("line"))} title="Add graph" className="brutal-border-2 brutal-press flex h-20 flex-col items-center justify-center gap-2 bg-surface text-teal hover:border-teal">
          <TrendingUp className="size-5" />
          <span className="font-display text-[9px] uppercase tracking-[0.12em]">Graph</span>
        </button>
        <button onClick={() => add(newQuiz())} title="Add quiz" className="brutal-border-2 brutal-press flex h-20 flex-col items-center justify-center gap-2 bg-surface text-teal hover:border-teal">
          <HelpCircle className="size-5" />
          <span className="font-display text-[9px] uppercase tracking-[0.12em]">Quiz</span>
        </button>
      </div>

      {section === "shapes" && <ShapesPanel embedded />}
      {section === "icons" && (
        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-2 rounded-lg border border-teal/20 bg-surface px-3 py-2 text-teal/70">
            <Search className="size-4" />
            <input value={iconQuery} onChange={(event) => setIconQuery(event.target.value)} placeholder="Search all Lucide icons" aria-label="Search icons" className="min-w-0 flex-1 bg-transparent font-mono text-[10px] text-teal outline-none placeholder:text-teal/45" />
          </label>
      <div className="panel-section-label">Add to canvas</div>
      <div className="grid grid-cols-3 gap-2">
          {filteredIcons.map(({ name, label, Icon }) => (
            <button key={name} title={`Add ${label}`} onClick={() => add(newIcon(name))} className="brutal-press flex h-20 flex-col items-center justify-center gap-2 rounded-lg border border-teal/20 bg-surface text-teal transition-colors hover:border-teal hover:bg-surface-2">
              <Icon className="size-7" strokeWidth={2} />
              <span className="truncate px-1 font-mono text-[8px] text-ink/70">{label}</span>
            </button>
          ))}
          </div>
        </div>
      )}

      {section === null && (
        <div className="flex items-center gap-2 border border-teal/20 bg-surface p-3 font-mono text-[9px] text-teal/50">
          <ImagePlus className="size-4" /> Choose a category above
        </div>
      )}
    </div>
  );
}
