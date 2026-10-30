/* macOS-style traffic lights for app windows (Photopea, Paint, Video,
   Search, Runtime). Red closes the window, yellow always hides it to its
   docked title bar, green restores a hidden window — otherwise toggles
   fullscreen. Purely presentational + callbacks. */
import type { MouseEvent } from "react";

const DOT =
  "grid size-3 place-items-center rounded-full text-[7px] font-black leading-none text-black/60 transition-transform hover:scale-110";

export function TrafficLights({
  minimized = false,
  maximized = false,
  onClose,
  onMinimize,
  onMaximize,
}: {
  minimized?: boolean;
  maximized?: boolean;
  onClose: () => void;
  /** yellow dot — should always HIDE the window */
  onMinimize: () => void;
  /** green dot — should restore when hidden, else toggle fullscreen */
  onMaximize: () => void;
}) {
  const stop = (fn: () => void) => (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    fn();
  };
  return (
    <div className="flex shrink-0 items-center gap-2" role="group" aria-label="Window controls">
      <button type="button" title="Close" onClick={stop(onClose)} className={`${DOT} bg-[#ff5f57]`}>
        <span className="opacity-0 transition-opacity hover:opacity-100">×</span>
      </button>
      <button type="button" title="Hide" onClick={stop(onMinimize)} className={`${DOT} bg-[#febc2e]`}>
        <span className="opacity-0 transition-opacity hover:opacity-100">−</span>
      </button>
      <button
        type="button"
        title={minimized ? "Restore" : maximized ? "Restore size" : "Fullscreen"}
        onClick={stop(onMaximize)}
        className={`${DOT} bg-[#28c840]`}
      >
        <span className="opacity-0 transition-opacity hover:opacity-100">
          {minimized ? "⤢" : maximized ? "⤡" : "+"}
        </span>
      </button>
    </div>
  );
}
