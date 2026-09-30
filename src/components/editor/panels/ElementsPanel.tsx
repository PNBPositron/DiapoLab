import { useState, type ChangeEvent } from "react";
import * as LucideIcons from "lucide-react";
import {
  Link2,
  Shapes,
  Star,
  Search,
  ImagePlus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { newIcon, newImage, useEditor } from "@/store/editor";
import { ShapesPanel } from "./ShapesPanel";

type ElementSection = "shapes" | "icons" | null;

const ICONS: Array<{ name: string; label: string; Icon: LucideIcon }> = Object.entries(LucideIcons)
  .filter(([name, icon]) => {
    const isLucideComponent = typeof icon === "object" && icon !== null && "render" in icon;
    return name !== "createLucideIcon" && isLucideComponent && /^[A-Z]/.test(name);
  })
  .map(([name, Icon]) => ({ name, label: name.replace(/([a-z])([A-Z])/g, "$1 $2"), Icon: Icon as LucideIcon }))
  .sort((a, b) => a.label.localeCompare(b.label))
  .slice(0, 500);

/* Modern tile: frosted white card, gradient icon chip, blue accent when active. */
function ActionTile({
  Icon,
  label,
  active = false,
  onClick,
  asLabel = false,
  children,
}: {
  Icon: LucideIcon;
  label: string;
  active?: boolean;
  onClick?: () => void;
  asLabel?: boolean;
  children?: React.ReactNode;
}) {
  const base =
    "group relative flex h-[5.5rem] cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]";
  const state = active
    ? "border-blue-500/50 bg-blue-50/80 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.35),0_8px_20px_-8px_rgba(59,130,246,0.45)]"
    : "border-slate-200/80 bg-white/80 shadow-[0_1px_2px_rgba(15,23,42,0.05)] hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:shadow-[0_10px_24px_-8px_rgba(15,23,42,0.18)]";
  const chip = active
    ? "bg-linear-to-tr from-blue-500 to-indigo-600 text-white shadow-xs"
    : "bg-slate-100/80 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600";
  const inner = (
    <>
      <span className={`grid size-9 place-items-center rounded-xl transition-all duration-200 ${chip}`}>
        <Icon className="size-4" />
      </span>
      <span className="text-[10px] font-semibold tracking-wide text-slate-600 uppercase group-hover:text-slate-800">
        {label}
      </span>
      {children}
    </>
  );
  if (asLabel) {
    return (
      <label className={`${base} ${state}`}>
        {inner}
      </label>
    );
  }
  return (
    <button onClick={onClick} className={`${base} ${state}`}>
      {inner}
    </button>
  );
}

export function ElementsPanel() {
  const { add } = useEditor();
  const [section, setSection] = useState<ElementSection>(null);
  const [iconQuery, setIconQuery] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const filteredIcons = ICONS.filter(({ label }) =>
    label.toLowerCase().includes(iconQuery.trim().toLowerCase()),
  );

  const addByUrl = () => {
    const trimmed = imageUrl.trim();
    setUrlError(null);
    if (!trimmed) return;
    if (!/^https?:\/\//i.test(trimmed)) {
      setUrlError("Lien invalide — doit commencer par http:// ou https://");
      return;
    }
    add(newImage(trimmed));
    setImageUrl("");
  };

  return (
    <div className="panel-content">
      {/* No panel header — the panel starts directly with its content. */}
      <div className="panel-intro">Drop in visual building blocks for your slide.</div>

      {/* Add image by URL — permanent, survives refresh & design sharing. */}
      <div className="space-y-1.5">
        <label className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 transition-all duration-200 focus-within:border-blue-400 focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(59,130,246,0.14)]">
          <Link2 className="size-4 shrink-0 text-slate-400" />
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addByUrl()}
            placeholder="Coller le lien d'une image…"
            aria-label="Image URL"
            className="min-w-0 flex-1 bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400"
          />
          <button
            type="button"
            onClick={addByUrl}
            className="shrink-0 rounded-lg bg-slate-900 px-2.5 py-1 text-[10px] font-semibold text-white transition hover:bg-slate-700 active:scale-95"
          >
            Ajouter
          </button>
        </label>
        {urlError && (
          <p className="px-1 text-[10px] font-medium text-rose-500">{urlError}</p>
        )}
      </div>

      <div className="panel-action-grid">
        <ActionTile
          Icon={Shapes}
          label="Shapes"
          active={section === "shapes"}
          onClick={() => setSection(section === "shapes" ? null : "shapes")}
        />
        <ActionTile
          Icon={Star}
          label="Icons"
          active={section === "icons"}
          onClick={() => setSection(section === "icons" ? null : "icons")}
        />
      </div>

      {section === "shapes" && <ShapesPanel embedded />}

      {section === "icons" && (
        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-slate-400 transition-all duration-200 focus-within:border-blue-400 focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(59,130,246,0.14)]">
            <Search className="size-4" />
            <input
              value={iconQuery}
              onChange={(event) => setIconQuery(event.target.value)}
              placeholder="Search all Lucide icons"
              aria-label="Search icons"
              className="min-w-0 flex-1 bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400"
            />
          </label>
          <div className="panel-section-label">Add to canvas</div>
          <div className="grid grid-cols-3 gap-2">
            {filteredIcons.map(({ name, label, Icon }) => (
              <button
                key={name}
                title={`Add ${label}`}
                onClick={() => add(newIcon(name))}
                className="group flex h-20 flex-col items-center justify-center gap-1.5 overflow-hidden rounded-xl border border-slate-200/80 bg-white/70 text-slate-500 transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:border-blue-300 hover:bg-white hover:text-blue-600 hover:shadow-[0_8px_18px_-6px_rgba(15,23,42,0.15)] active:translate-y-0 active:scale-[0.97]"
              >
                <Icon className="size-6 transition-transform duration-200 group-hover:scale-110" strokeWidth={2} />
                <span className="w-full truncate px-1.5 text-[8px] font-medium text-slate-400 group-hover:text-slate-600">
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
