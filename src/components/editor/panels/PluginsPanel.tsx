import { useEffect, useState } from "react";
import { Puzzle, Plus, Trash2, Check, Code2, Wand2, PackageOpen, Layers, Brush, Clapperboard, Play } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useEditor } from "@/store/editor";
import {
  usePlugins,
  allPlugins,
  instantiateWidget,
  SAMPLE_PLUGIN_CODE,
  type EditorPlugin,
  type PluginApp,
} from "@/lib/plugins";
import { PanelHeader } from "../ui/selectors";
import { PaintAppDialog } from "../paint/PaintApp";
import { VideoAppDialog } from "../video/VideoApp";

export function PluginsPanel() {
  const addGroup = useEditor((s) => s.addGroup);
  const plugins = usePlugins((s) => s.plugins);
  const removePlugin = usePlugins((s) => s.removePlugin);
  const togglePlugin = usePlugins((s) => s.togglePlugin);

  const [importOpen, setImportOpen] = useState(false);
  const [appOpen, setAppOpen] = useState<PluginApp | null>(null);
  const [pluginCode, setPluginCode] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  const tryImport = () => {
    setImportError(null);
    setImportSuccess(null);
    try {
      const plugin = usePlugins.getState().importPlugin(pluginCode);
      setImportSuccess(`✓ Imported "${plugin.name}" — ${plugin.widgets.length} widget${plugin.widgets.length === 1 ? "" : "s"}`);
      setPluginCode("");
    } catch (e) {
      setImportError(e instanceof Error ? e.message : "Import failed");
    }
  };

  // preinstalled plugins (Paint…) merged with user-imported ones
  const all = allPlugins(plugins);
  const enabledWidgets = all
    .filter((p) => p.enabled)
    .flatMap((p) => p.widgets.map((w, i) => ({ key: `${p.id}:${i}`, pluginName: p.name, widget: w })));

  const enabledApps = all
    .filter((p) => p.enabled)
    .flatMap((p) => (p.apps ?? []).map((a, i) => ({ key: `${p.id}:app:${i}`, pluginName: p.name, app: a })));

  // The command palette can request an app by name (diapolab:open-app event).
  useEffect(() => {
    const onOpenApp = (e: Event) => {
      const appName = (e as CustomEvent).detail?.appName;
      if (!appName) return;
      const found = enabledApps.find((x) => x.app.name === appName);
      if (found) setAppOpen(found.app);
    };
    window.addEventListener("diapolab:open-app", onOpenApp);
    return () => window.removeEventListener("diapolab:open-app", onOpenApp);
  }, [enabledApps]);

  return (
    <div className="space-y-4">
      <PanelHeader
        kicker="Plugins"
        title="Widget packs"
        description="Import plugin code, then drop its widgets straight onto the canvas."
        icon={Puzzle}
      />

      {/* Import button */}
      <div className="px-4">
        <button
          onClick={() => { setImportOpen(true); setImportError(null); setImportSuccess(null); }}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-2.5 text-xs font-semibold text-white shadow-[0_8px_20px_rgba(37,99,235,0.25)] transition-all hover:brightness-110 active:scale-[0.98]"
        >
          <Code2 className="size-3.5" /> Import plugin code
        </button>
      </div>

      {all.length === 0 ? (
        <div className="mx-4 flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 py-10 text-center">
          <span className="grid size-11 place-items-center rounded-xl bg-indigo-50 text-indigo-500">
            <PackageOpen className="size-5" />
          </span>
          <div>
            <p className="text-xs font-medium text-slate-600">No plugins installed</p>
            <p className="mt-1 max-w-[220px] text-[11px] leading-relaxed text-slate-400">
              Plugins add widget presets to this panel and to Presets → Blocks. Find
              examples on GitHub or click "Load sample" in the import dialog.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3 px-4">
          {/* Installed plugins */}
          <div>
            <span className="mb-1.5 flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
              <Layers className="size-2.5" /> Installed ({all.length})
            </span>
            <div className="space-y-2">
              {all.map((p) => (
                <PluginRow
                  key={p.id}
                  plugin={p}
                  builtin={p.id.startsWith("builtin-")}
                  onToggle={() => togglePlugin(p.id)}
                  onRemove={() => removePlugin(p.id)}
                />
              ))}
            </div>
          </div>

          {/* Apps */}
          {enabledApps.length > 0 && (
            <div>
              <span className="mb-1.5 flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.14em] text-indigo-500">
                <Brush className="size-2.5" /> Apps ({enabledApps.length})
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {enabledApps.map(({ key, pluginName, app }) => (
                  <button
                    key={key}
                    title={app.description || `from ${pluginName}`}
                    onClick={() => setAppOpen(app)}
                    className="group flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50/60 px-2 py-1.5 text-left transition-all duration-150 hover:border-indigo-400 hover:bg-indigo-100/60 active:scale-[0.97]"
                  >
                    <span className="grid size-5 shrink-0 place-items-center rounded-md text-indigo-600 transition-colors group-hover:bg-indigo-600 group-hover:text-white">
                      {app.type === "video" ? (
                        <Clapperboard className="size-3" />
                      ) : (
                        <Brush className="size-3" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[10px] font-semibold text-slate-700">
                      {app.name}
                    </span>
                    <Play className="size-2.5 shrink-0 text-indigo-400 transition-colors group-hover:text-indigo-600" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Widgets */}
          {enabledWidgets.length > 0 && (
            <div>
              <span className="mb-1.5 flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.14em] text-indigo-500">
                <Puzzle className="size-2.5" /> Widgets ({enabledWidgets.length})
              </span>
              <div className="grid grid-cols-2 gap-2">
                {enabledWidgets.map(({ key, pluginName, widget }) => (
                  <button
                    key={key}
                    title={widget.description || `from ${pluginName}`}
                    onClick={() => addGroup(instantiateWidget(widget))}
                    className="group flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-2.5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-50/40 hover:shadow-[0_10px_24px_-10px_rgba(79,70,229,0.35)] active:scale-[0.97]"
                  >
                    <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500 transition-colors group-hover:bg-indigo-600 group-hover:text-white">
                      <Plus className="size-3.5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[11px] font-semibold text-slate-800">{widget.name}</span>
                      <span className="block truncate text-[9px] text-slate-400">{pluginName}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Plugin app (e.g. paint) */}
      {appOpen &&
        (appOpen.type === "video" ? (
          <VideoAppDialog app={appOpen} open onOpenChange={(v) => !v && setAppOpen(null)} />
        ) : (
          <PaintAppDialog app={appOpen} open onOpenChange={(v) => !v && setAppOpen(null)} />
        ))}

      {/* Import dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-xl border-slate-200 bg-white p-0">
          <DialogHeader className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
            <DialogTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-800">
              <span className="grid size-7 place-items-center rounded-lg bg-indigo-600 text-white">
                <Code2 className="size-3.5" />
              </span>
              Import plugin
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 p-5">
            <p className="text-xs leading-relaxed text-slate-500">
              Paste plugin code below. Call{" "}
              <code className="rounded bg-slate-100 px-1 font-mono text-[10px] text-blue-600">
                diapolabPlugin(&#123; name, widgets: [...] &#125;)
              </code>{" "}
              with an array of widgets — each widget is a named set of canvas
              elements that becomes an insertable preset.
            </p>
            <textarea
              value={pluginCode}
              onChange={(e) => { setPluginCode(e.target.value); setImportError(null); setImportSuccess(null); }}
              spellCheck={false}
              placeholder="// Paste your plugin code here…"
              className="h-52 w-full resize-y rounded-xl border border-slate-700 bg-slate-950 p-3 font-mono text-xs leading-relaxed text-slate-200 outline-none transition-colors focus:border-blue-500"
            />
            {importError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-600">
                {importError}
              </div>
            )}
            {importSuccess && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-600">
                {importSuccess}
              </div>
            )}
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => setPluginCode(SAMPLE_PLUGIN_CODE)}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-500 transition hover:border-blue-300 hover:text-blue-600"
              >
                <Wand2 className="size-3.5" /> Load sample
              </button>
              <button
                onClick={tryImport}
                disabled={!pluginCode.trim()}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-[11px] font-semibold text-white shadow-[0_8px_20px_rgba(37,99,235,0.25)] transition-all hover:bg-blue-700 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40"
              >
                <Check className="size-3.5" /> Import plugin
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PluginRow({
  plugin,
  builtin,
  onToggle,
  onRemove,
}: {
  plugin: EditorPlugin;
  builtin?: boolean;
  onToggle: () => void;
  onRemove: () => void;
}) {
  return (
    <div
      className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 transition-all ${
        plugin.enabled
          ? "border-indigo-200 bg-indigo-50/50"
          : "border-slate-200 bg-white opacity-70"
      }`}
    >
      <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${
        plugin.enabled ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-400"
      }`}>
        <Puzzle className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 truncate text-[11px] font-semibold text-slate-800" title={plugin.name}>
          <span className="truncate">{plugin.name}</span>
          {builtin && (
            <span className="shrink-0 rounded-md bg-slate-100 px-1 py-px text-[8px] font-bold uppercase tracking-wide text-slate-500">
              Built-in
            </span>
          )}
        </div>
        <div className="truncate text-[9px] text-slate-400">
          {plugin.widgets.length} widget{plugin.widgets.length === 1 ? "" : "s"}
          {plugin.apps?.length ? ` · ${plugin.apps.length} app${plugin.apps.length > 1 ? "s" : ""}` : ""}
          {plugin.author ? ` · ${plugin.author}` : ""}
        </div>
      </div>
      {!builtin && (
      <button
        onClick={onToggle}
        role="switch"
        aria-checked={plugin.enabled}
        aria-label={`${plugin.enabled ? "Disable" : "Enable"} ${plugin.name}`}
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ${
          plugin.enabled ? "bg-indigo-600" : "bg-slate-200"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow transition-transform duration-200 ${
            plugin.enabled ? "translate-x-4" : ""
          }`}
        />
      </button>
      )}
      {!builtin && (
      <button
        onClick={onRemove}
        title="Remove plugin"
        className="grid size-7 shrink-0 place-items-center rounded-lg text-slate-300 transition hover:bg-rose-50 hover:text-rose-500"
      >
        <Trash2 className="size-3.5" />
      </button>
      )}
    </div>
  );
}
