import { useEffect, useState } from "react";
import { Loader2, Upload, Globe2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Dropdown } from "./ui/Dropdown";

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

  const field =
    "mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15";
  const label = "block text-xs font-semibold text-foreground";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !busy) onCancel();
      }}
    >
      <DialogContent
        className="w-[calc(100vw-2rem)] max-w-lg max-h-[min(90vh,760px)] overflow-y-auto rounded-lg border-border bg-card p-0 text-card-foreground shadow-2xl"
        onInteractOutside={(event) => {
          if (busy) event.preventDefault();
        }}
        onEscapeKeyDown={(event) => {
          if (busy) event.preventDefault();
        }}
      >
        <div className="border-b border-border px-6 pb-5 pt-6">
          <div className="mb-4 flex size-10 items-center justify-center rounded-md bg-primary/15 text-primary">
            <Globe2 className="size-5" />
          </div>
          <DialogHeader>
            <DialogTitle className="text-left font-display text-xl font-semibold text-card-foreground">
              Publish {kind === "theme" ? "theme" : "template"}
            </DialogTitle>
            <DialogDescription className="text-left text-sm text-muted-foreground">
              Add the details people will see in the marketplace.
            </DialogDescription>
          </DialogHeader>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
          className="space-y-4 px-6 pb-6"
        >
          <label className={label}>
            Name <span className="text-primary">*</span>
            <input
              autoFocus
              required
              maxLength={100}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Give it a name"
              className={field}
            />
          </label>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className={label}>
              Style
              <span className="mt-1.5 block">
                <Dropdown value={style} options={PUBLISH_STYLES} onChange={setStyle} />
              </span>
            </label>
            <label className={label}>
              License
              <span className="mt-1.5 block">
                <Dropdown value={license} options={PUBLISH_LICENSES} onChange={setLicense} />
              </span>
            </label>
          </div>
          <label className={label}>
            Author name
            <input
              maxLength={100}
              value={author}
              onChange={(event) => setAuthor(event.target.value)}
              placeholder="How you want to be credited"
              className={field}
            />
          </label>
          <label className={label}>
            Description
            <textarea
              maxLength={500}
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What makes this useful?"
              className={`${field} resize-none`}
            />
          </label>
          <label className={label}>
            Tags
            <input
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="pitch, startup, dark"
              className={field}
            />
            <span className="mt-1 block text-[11px] font-normal text-muted-foreground">
              Separate tags with commas
            </span>
          </label>
          {error && (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2 border-t border-border pt-5">
            <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || !name.trim()}>
              {busy ? <Loader2 className="animate-spin" /> : <Upload />}Publish
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
