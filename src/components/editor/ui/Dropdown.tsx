import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";

/**
 * Modern Dropdown — replaces native <select> controls with a consistent,
 * styled menu (rounded panel, hover + active states, keyboard navigation,
 * click-outside to close). Same mental model as a controlled <select>:
 * value / options / onChange.
 */

export type DropdownOption<T extends string = string> = {
  value: T;
  label?: string;
  /** optional leading swatch (color square) */
  swatch?: string;
  /** optional leading icon node */
  icon?: ReactNode;
};

export function Dropdown<T extends string = string>({
  value,
  options,
  onChange,
  className = "",
  placeholder,
  disabled,
  title,
}: {
  value: T | "";
  options: readonly (T | DropdownOption<T>)[];
  onChange: (v: T) => void;
  /** extra classes for the trigger button (width, text size...) */
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const normalized: DropdownOption<T>[] = options.map((o) =>
    typeof o === "string" ? { value: o } : o,
  );
  const selected = normalized.find((o) => o.value === value);

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const select = (v: T) => {
    onChange(v);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!open && (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      setActiveIndex(Math.max(0, normalized.findIndex((o) => o.value === value)));
      setOpen(true);
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => {
        const next = e.key === "ArrowDown" ? i + 1 : i - 1;
        const clamped = (next + normalized.length) % normalized.length;
        listRef.current?.children[clamped]?.scrollIntoView({ block: "nearest" });
        return clamped;
      });
    } else if (e.key === "Enter") {
      e.preventDefault();
      const o = normalized[activeIndex];
      if (o) select(o.value);
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="relative w-full">
      <button
        type="button"
        title={title}
        disabled={disabled}
        onClick={() => {
          if (!open)
            setActiveIndex(Math.max(0, normalized.findIndex((o) => o.value === value)));
          setOpen((v) => !v);
        }}
        onKeyDown={onKeyDown}
        className={`flex w-full items-center justify-between gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-left text-xs text-slate-800 transition hover:border-slate-300 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-50 ${open ? "border-indigo-400 ring-2 ring-indigo-100" : ""} ${className}`}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          {selected?.swatch && (
            <span
              className="size-2.5 shrink-0 rounded-sm border border-slate-200"
              style={{ background: selected.swatch }}
            />
          )}
          {selected?.icon}
          <span className="truncate">{selected?.label ?? selected?.value ?? placeholder ?? ""}</span>
        </span>
        <ChevronDown
          className={`size-3.5 shrink-0 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          strokeWidth={2.4}
        />
      </button>

      {open && (
        <div
          ref={listRef}
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg animate-in fade-in zoom-in-95 duration-150"
        >
          {normalized.map((o, i) => {
            const active = i === activeIndex;
            const isSelected = o.value === value;
            return (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => select(o.value)}
                className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors ${
                  isSelected
                    ? "bg-indigo-50 text-indigo-700"
                    : active
                      ? "bg-slate-100 text-slate-900"
                      : "text-slate-700"
                }`}
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  {o.swatch && (
                    <span
                      className="size-2.5 shrink-0 rounded-sm border border-slate-200"
                      style={{ background: o.swatch }}
                    />
                  )}
                  {o.icon}
                  <span className="truncate">{o.label ?? o.value}</span>
                </span>
                {isSelected && <Check className="size-3 shrink-0 text-indigo-600" strokeWidth={2.5} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
