import { useEffect, useState } from "react";
import { Loader2, Upload, X } from "lucide-react";

export type PublishMeta = {
  name: string;
  style: string;
  description: string;
  author_name: string;
  tags: string[];
  license: string;
};

export const PUBLISH_LICENSES = ["CC BY 4.0", "CC BY-NC 4.0", "MIT", "All rights reserved"];

export const PUBLISH_STYLES = [
  "Minimal",
  "Editorial",
  "Brutalist",
  "Cyber",
  "Glass",
  "Retro",
  "Corporate",
  "Playful",
  "Dark",
  "Other",
];

export function PublishMetaDialog({
  open,
  kind,
  defaultName,
  defaultAuthor,
  busy,
  error,
  onCancel,
  onSubmit,
}: {
  open: boolean;
  kind: "template" | "theme";
  defaultName?: string;
  defaultAuthor?: string;
  busy?: boolean;
  error?: string | null;
  onCancel: () => void;
  onSubmit: (meta: PublishMeta) => void;
}) {
  const [name, setName] = useState(defaultName ?? "");
  const [style, setStyle] = useState(PUBLISH_STYLES[0]);
  const [description, setDescription] = useState("");
  const [author, setAuthor] = useState(defaultAuthor ?? "");
  const [tags, setTags] = useState("");
  const [license, setLicense] = useState(PUBLISH_LICENSES[0]);

  useEffect(() => {
    if (open) {
      setName(defaultName ?? "");
      setAuthor(defaultAuthor ?? "");
    }
  }, [open, defaultName, defaultAuthor]);

  if (!open) return null;

  const submit = () =>
    onSubmit({
      name: name.trim() || (kind === "theme" ? "Untitled theme" : "Untitled template"),
      style,
      description: description.trim(),
      author_name: author.trim(),
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 8),
      license,
    });

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-ink/85 p-6"
      onClick={onCancel}
    >
      <div
        className="brutal-border-2 relative w-full max-w-md bg-ink p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onCancel}
          aria-label="Cancel publishing"
          className="absolute right-3 top-3 grid h-7 w-7 place-items-center border border-teal/40 text-teal hover:border-teal"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        <h2 className="mb-1 font-display text-sm tracking-[0.2em] text-teal">
          ▸ PUBLISH {kind === "theme" ? "THEME" : "TEMPLATE"}
        </h2>
        <p className="mb-4 font-mono text-[10px] text-teal/60">
          &gt; this info shows up in the marketplace listing
        </p>

        <div className="space-y-3">
          <label className="block">
            <span className="font-mono text-[10px] text-teal/70">name *</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full border border-teal/40 bg-surface px-2 py-1.5 font-mono text-[11px] text-teal outline-none focus:border-teal"
            />
          </label>

          <label className="block">
            <span className="font-mono text-[10px] text-teal/70">style</span>
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              className="mt-1 w-full border border-teal/40 bg-surface px-2 py-1.5 font-mono text-[11px] text-teal outline-none focus:border-teal"
            >
              {PUBLISH_STYLES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="font-mono text-[10px] text-teal/70">license</span>
            <select
              value={license}
              onChange={(e) => setLicense(e.target.value)}
              className="mt-1 w-full border border-teal/40 bg-surface px-2 py-1.5 font-mono text-[11px] text-teal outline-none focus:border-teal"
            >
              {PUBLISH_LICENSES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>

          <label className="block">
            <span className="font-mono text-[10px] text-teal/70">author name</span>
            <input
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="how you want to be credited"
              className="mt-1 w-full border border-teal/40 bg-surface px-2 py-1.5 font-mono text-[11px] text-teal placeholder:text-teal/30 outline-none focus:border-teal"
            />
          </label>

          <label className="block">
            <span className="font-mono text-[10px] text-teal/70">description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="what is it for, what makes it good"
              className="mt-1 w-full resize-none border border-teal/40 bg-surface p-2 font-mono text-[11px] text-teal placeholder:text-teal/30 outline-none focus:border-teal"
            />
          </label>

          <label className="block">
            <span className="font-mono text-[10px] text-teal/70">tags (comma separated)</span>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="pitch, startup, dark"
              className="mt-1 w-full border border-teal/40 bg-surface px-2 py-1.5 font-mono text-[11px] text-teal placeholder:text-teal/30 outline-none focus:border-teal"
            />
          </label>
        </div>

        {error && <p className="mt-3 font-mono text-[10px] text-[#ff0080]">! {error}</p>}

        <div className="mt-4 flex gap-2">
          <button
            onClick={submit}
            disabled={busy || !name.trim()}
            className="brutal-border brutal-press flex flex-1 items-center justify-center gap-2 bg-blue px-3 py-2 font-display text-[11px] tracking-[0.2em] text-ink disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            PUBLISH
          </button>
          <button
            onClick={onCancel}
            className="brutal-border brutal-press bg-surface-2 px-3 py-2 font-display text-[11px] tracking-[0.2em] text-teal"
          >
            CANCEL
          </button>
        </div>
      </div>
    </div>
  );
}
