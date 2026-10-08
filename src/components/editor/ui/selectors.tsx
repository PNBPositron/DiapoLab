import type { ReactNode } from "react";
import { Check, Search, X, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type SelectorOption<T extends string> = {
  value: T;
  label: ReactNode;
  title?: string;
  icon?: LucideIcon;
  preview?: ReactNode;
};

export function PanelHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="selector-header">
      <h3>{title}</h3>
      {children}
    </div>
  );
}

export function SearchField({
  value,
  onChange,
  placeholder = "Search options…",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="selector-search">
      <Search className="size-4 shrink-0" aria-hidden="true" />
      <input
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="selector-clear"
          aria-label="Clear search"
          title="Clear search"
          onClick={() => onChange("")}
        >
          <X />
        </Button>
      )}
    </div>
  );
}

export function ChipGroup<T extends string>({
  value,
  options,
  onChange,
  label = "Categories",
}: {
  value: T;
  options: Array<T | { value: T; label: ReactNode }>;
  onChange: (value: T) => void;
  label?: string;
}) {
  return (
    <div className="selector-chips" role="group" aria-label={label}>
      {options.map((item) => {
        const option = typeof item === "string" ? { value: item, label: item } : item;
        return (
          <Button
            type="button"
            variant="ghost"
            key={option.value}
            className="selector-chip"
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </Button>
        );
      })}
    </div>
  );
}

export function OptionGrid<T extends string>({
  value,
  options,
  onChange,
  columns = 2,
  onPreview,
  label = "Options",
  className,
}: {
  value?: T;
  options: SelectorOption<T>[];
  onChange: (value: T) => void;
  columns?: 2 | 3;
  onPreview?: (value: T | null) => void;
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn("selector-grid", columns === 3 ? "grid-cols-3" : "grid-cols-2", className)}
      role="group"
      aria-label={label}
      onMouseLeave={() => onPreview?.(null)}
    >
      {options.map((option) => {
        const Icon = option.icon;
        return (
          <Button
            key={option.value}
            type="button"
            variant="ghost"
            title={option.title ?? (typeof option.label === "string" ? option.label : undefined)}
            aria-pressed={value === undefined ? undefined : value === option.value}
            className="selector-option group rounded-xl"
            onClick={() => onChange(option.value)}
            onMouseEnter={() => onPreview?.(option.value)}
            onFocus={() => onPreview?.(option.value)}
            onBlur={() => onPreview?.(null)}
          >
            <span className="selector-option-art">
              {option.preview ?? (Icon && <Icon className="size-5" aria-hidden="true" />)}
            </span>
            <span className="selector-option-label">{option.label}</span>
            {value === option.value && (
              <Check className="selector-check size-3" aria-hidden="true" />
            )}
          </Button>
        );
      })}
      {options.length === 0 && <p className="selector-empty col-span-full">No matching options</p>}
    </div>
  );
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  label = "Selection",
}: {
  value: T;
  options: SelectorOption<T>[];
  onChange: (value: T) => void;
  label?: string;
}) {
  return (
    <div className="selector-segments" role="group" aria-label={label}>
      {options.map((option) => {
        const Icon = option.icon;
        return (
          <Button
            key={option.value}
            type="button"
            variant="ghost"
            title={option.title ?? option.value}
            aria-label={
              typeof option.label === "string" ? option.label : (option.title ?? option.value)
            }
            aria-pressed={value === option.value}
            className="selector-segment"
            onClick={() => onChange(option.value)}
          >
            {Icon && <Icon className="size-3.5" />}
            {option.label}
          </Button>
        );
      })}
    </div>
  );
}

export function ToggleGrid({
  options,
  columns = 2,
  label = "Settings",
}: {
  options: Array<{
    id: string;
    label: string;
    icon?: LucideIcon;
    checked: boolean;
    onChange: (checked: boolean) => void;
  }>;
  columns?: 2 | 3;
  label?: string;
}) {
  return (
    <div
      className={cn("selector-toggles grid", columns === 3 ? "grid-cols-3" : "grid-cols-2")}
      role="group"
      aria-label={label}
    >
      {options.map((option) => {
        const Icon = option.icon;
        return (
          <Button
            key={option.id}
            type="button"
            variant="ghost"
            aria-pressed={option.checked}
            title={option.label}
            className="selector-toggle"
            onClick={() => option.onChange(!option.checked)}
          >
            {Icon && <Icon className="size-4" />}
            <span>{option.label}</span>
            <span className="selector-toggle-track" aria-hidden="true">
              <span />
            </span>
          </Button>
        );
      })}
    </div>
  );
}
