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
      <DialogContent className="max-w-lg border-slate-200 bg-white p-0">
        <DialogHeader className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Clock3 className="size-4 text-blue-600" /> Slide version history</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 p-5">
          <div className="flex gap-2">
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name this version (optional)" className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
            <button onClick={createVersion} className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"><Save className="size-3.5" /> Save</button>
          </div>
          {versions.length === 0 ? <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-xs text-slate-400">Save a checkpoint before experimenting with a slide.</div> : <div className="flex max-h-72 flex-col gap-2 overflow-y-auto">{versions.map((version) => <div key={version.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5"><div className="min-w-0"><p className="truncate text-xs font-semibold text-slate-800">{version.name}</p><p className="mt-0.5 font-mono text-[10px] text-slate-400">{new Date(version.createdAt).toLocaleString()} · {version.pages.length} slides</p></div><button onClick={() => { restoreVersion(version.id); onOpenChange(false); }} className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-semibold text-slate-600 transition hover:border-blue-300 hover:text-blue-600"><RotateCcw className="size-3" /> Restore</button></div>)}</div>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
