import { useEditor } from "@/store/editor";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Clock3, RotateCcw, Save } from "lucide-react";
import { useState } from "react";

export function VersionHistoryDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const versions = useEditor((state) => state.versions);
  const saveVersion = useEditor((state) => state.saveVersion);
  const restoreVersion = useEditor((state) => state.restoreVersion);
  const [name, setName] = useState("");

  const createVersion = () => {
    saveVersion(name);
    setName("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-3xl sm:rounded-3xl border border-slate-200 bg-white p-0 shadow-[0_24px_64px_-16px_rgba(15,23,42,0.18)]">
        <DialogHeader className="border-b border-slate-200 bg-white px-5 py-4">
          <DialogTitle className="flex items-center gap-2.5 text-sm font-semibold text-slate-900">
            <span className="grid size-8 place-items-center rounded-xl border border-blue-100 bg-blue-50 text-blue-600">
              <Clock3 className="size-4" />
            </span>
            Slide version history
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 p-5">
          <div className="flex gap-2">
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name this version (optional)" className="min-w-0 flex-1 rounded-full border border-slate-200 bg-slate-50/60 px-4 py-2 text-xs text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/15" />
            <button onClick={createVersion} className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"><Save className="size-3.5" /> Save</button>
          </div>
          {versions.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center text-xs text-slate-500">Save a checkpoint before experimenting with a slide.</div> : <div className="flex max-h-72 flex-col gap-2 overflow-y-auto">{versions.map((version) => <div key={version.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 transition-colors hover:border-slate-300"><div className="min-w-0"><p className="truncate text-xs font-semibold text-slate-900">{version.name}</p><p className="mt-0.5 font-mono text-[10px] tabular-nums text-slate-500">{new Date(version.createdAt).toLocaleString()} · {version.pages.length} slides</p></div><button onClick={() => { restoreVersion(version.id); onOpenChange(false); }} className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"><RotateCcw className="size-3" /> Restore</button></div>)}</div>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
