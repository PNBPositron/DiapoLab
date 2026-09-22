import * as LucideIcons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { newChart, newIcon, newImage, newQuiz, useEditor } from "@/store/editor";
import { PanelHeader } from "./TextPanel";
import { ShapesPanel } from "./ShapesPanel";

type ElementSection = "shapes" | "icons" | null;

const ICONS: Array<{ label: string; Icon: LucideIcon }> = Object.entries(LucideIcons)
  .filter(([name, icon]) => name !== "createLucideIcon" && typeof icon === "function" && /^[A-Z]/.test(name))
  .map(([name, Icon]) => ({
    label: name.replace(/([a-z])([A-Z])/g, "$1 $2"),
    Icon: Icon as LucideIcon,
  }))
  .sort((a, b) => a.label.localeCompare(b.label));

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
    <div className="space-y-4">
      <PanelHeader title="Elements" />
      <div className="grid grid-cols-3 gap-2">
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
          <div className="grid grid-cols-3 gap-2">
          {filteredIcons.map(({ label, Icon }) => (
            <button key={label} title={`Add ${label}`} onClick={() => add(newIcon(label))} className="brutal-press flex h-20 flex-col items-center justify-center gap-2 rounded-lg border border-teal/20 bg-surface text-teal transition-colors hover:border-teal hover:bg-surface-2">
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
