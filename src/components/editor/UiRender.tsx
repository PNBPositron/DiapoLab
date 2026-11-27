import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { UI_STYLE_THEMES, type UiElement, type UiTheme } from "@/store/editor";

type WidgetCtx = {
  element: UiElement;
  preview: boolean;
  interactive: boolean;
  t: UiTheme & {
    bg: string;
    fg: string;
    muted: string;
    border: string;
    borderWidth: number;
    radius: number;
    shadow: string;
    font: string;
    uppercase: boolean;
  };
  accent: string;
  onAccent: string;
  s: number;
  sharp: boolean;
  softFill: string;
  line: string;
  shell: CSSProperties;
  chromeShell: CSSProperties;
  titleStyle: CSSProperties;
  bodyStyle: CSSProperties;
  xpTitleBar: ReactNode;
};

function stopEv(e: React.SyntheticEvent) {
  e.stopPropagation();
}

function interactiveHandlers(interactive: boolean, onActivate?: () => void) {
  if (!interactive) return {};
  return {
    onMouseDown: stopEv,
    onPointerDown: stopEv,
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation();
      onActivate?.();
    },
  };
}

function WidgetControl({
  interactive,
  style,
  onActivate,
  onMouseEnter,
  onMouseLeave,
  children,
}: {
  interactive: boolean;
  style: CSSProperties;
  onActivate?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  children: ReactNode;
}) {
  if (!interactive) {
    return <div style={style}>{children}</div>;
  }
  return (
    <button
      type="button"
      style={style}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      {...interactiveHandlers(true, onActivate)}
    >
      {children}
    </button>
  );
}

function getTimeParts(
  now: Date | null,
  tz: string,
): {
  hours24: number;
  minutes: number;
  seconds: number;
  dateLabel: string;
} {
  if (!now) {
    return { hours24: 9, minutes: 41, seconds: 0, dateLabel: "Wed, Nov 25" };
  }
  const timeZone = tz && tz !== "Local" ? tz : undefined;
  try {
    const timeFmt = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const parts = timeFmt.formatToParts(now);
    const num = (type: string, fallback: number) => {
      const v = Number(parts.find((p) => p.type === type)?.value);
      return Number.isFinite(v) ? v : fallback;
    };
    const dateLabel = new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "short",
      month: "short",
      day: "numeric",
    }).format(now);
    return {
      hours24: num("hour", 9) % 24,
      minutes: num("minute", 41) % 60,
      seconds: num("second", 0) % 60,
      dateLabel,
    };
  } catch {
    return {
      hours24: now.getHours(),
      minutes: now.getMinutes(),
      seconds: now.getSeconds(),
      dateLabel: now.toDateString().slice(0, 10),
    };
  }
}

function pad2(n: number) {
  return String(Math.max(0, Math.floor(n))).padStart(2, "0");
}

function ClockWidget({ ctx }: { ctx: WidgetCtx }) {
  const {
    element,
    preview,
    interactive,
    t,
    accent,
    onAccent,
    s,
    sharp,
    softFill,
    line,
    shell,
    titleStyle,
    bodyStyle,
    xpTitleBar,
  } = ctx;
  const baseMode = element.files?.[0] === "analog" ? "analog" : "digital";
  const base12h = element.files?.[1] === "12h";
  const showSeconds = element.files?.[2] !== "off";
  const tz = element.files?.[3] || "Local";

  const [modeOverride, setModeOverride] = useState<"digital" | "analog" | null>(null);
  const [use12hOverride, setUse12hOverride] = useState<boolean | null>(null);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    if (!interactive) {
      setModeOverride(null);
      setUse12hOverride(null);
    }
  }, [interactive, baseMode, base12h]);

  useEffect(() => {
    if (preview) return;
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, [preview]);

  const mode = modeOverride ?? baseMode;
  const use12h = use12hOverride ?? base12h;
  const { hours24, minutes, seconds, dateLabel } = getTimeParts(preview ? null : now, tz);

  const period = hours24 >= 12 ? "PM" : "AM";
  const displayHour = use12h ? hours24 % 12 || 12 : hours24;
  const hourStr = use12h ? String(displayHour) : pad2(displayHour);
  const minStr = pad2(minutes);
  const secStr = pad2(seconds);

  const hourDeg = ((hours24 % 12) + minutes / 60) * 30;
  const minDeg = (minutes + seconds / 60) * 6;
  const secDeg = seconds * 6;

  const pillBtn = (active: boolean): CSSProperties => ({
    padding: `${3 * s}px ${8 * s}px`,
    fontSize: 11 * s,
    fontWeight: 700,
    borderRadius: sharp ? 0 : Math.min(8, t.radius || 6),
    border: `1px solid ${active ? accent : line}`,
    background: active ? accent : softFill,
    color: active ? onAccent : t.muted,
    cursor: interactive ? "pointer" : "default",
    pointerEvents: interactive ? "auto" : "none",
    lineHeight: 1.2,
  });

  return (
    <div
      style={{
        ...shell,
        padding: (preview ? 18 : 24) * s * (element.padScale ?? 1),
        gap: 8 * s,
        justifyContent: "space-between",
      }}
    >
      {xpTitleBar}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8 * s,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 * s, minWidth: 0 }}>
          <span
            style={{
              width: 8 * s,
              height: 8 * s,
              borderRadius: sharp ? 0 : "50%",
              background: accent,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              ...bodyStyle,
              fontSize: 16 * s,
              fontWeight: 700,
              color: t.fg,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {element.title || "Local Time"}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 * s, flexShrink: 0 }}>
          {interactive && (
            <>
              <button
                type="button"
                style={pillBtn(mode === "analog")}
                {...interactiveHandlers(interactive, () =>
                  setModeOverride((prev) =>
                    (prev ?? baseMode) === "analog" ? "digital" : "analog",
                  ),
                )}
              >
                {mode === "analog" ? "Digital" : "Analog"}
              </button>
              <button
                type="button"
                style={pillBtn(use12h)}
                {...interactiveHandlers(interactive, () =>
                  setUse12hOverride((prev) => !(prev ?? base12h)),
                )}
              >
                {use12h ? "12h" : "24h"}
              </button>
            </>
          )}
          <span
            style={{
              padding: `${3 * s}px ${8 * s}px`,
              fontSize: 11 * s,
              fontWeight: 600,
              borderRadius: sharp ? 0 : 999,
              background: softFill,
              border: `1px solid ${line}`,
              color: t.muted,
            }}
          >
            {tz.includes("/") ? tz.split("/").pop()?.replace(/_/g, " ") : tz}
          </span>
        </div>
      </div>

      {mode === "analog" ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16 * s,
            flex: 1,
            minHeight: 0,
          }}
        >
          <svg
            viewBox="0 0 120 120"
            style={{
              height: "100%",
              maxHeight: 112 * s,
              width: "auto",
              aspectRatio: "1 / 1",
              flexShrink: 0,
            }}
          >
            <circle cx="60" cy="60" r="55" fill={softFill} stroke={line} strokeWidth="2.5" />
            {Array.from({ length: 12 }, (_, i) => {
              const angle = (i * 30 * Math.PI) / 180;
              const inner = i % 3 === 0 ? 43 : 47;
              const outer = 51;
              return (
                <line
                  key={i}
                  x1={60 + inner * Math.sin(angle)}
                  y1={60 - inner * Math.cos(angle)}
                  x2={60 + outer * Math.sin(angle)}
                  y2={60 - outer * Math.cos(angle)}
                  stroke={i % 3 === 0 ? accent : t.muted}
                  strokeWidth={i % 3 === 0 ? "2.4" : "1.4"}
                  strokeLinecap="round"
                />
              );
            })}
            <line
              x1="60"
              y1="60"
              x2="60"
              y2="30"
              stroke={t.fg}
              strokeWidth="4.2"
              strokeLinecap="round"
              transform={`rotate(${hourDeg} 60 60)`}
            />
            <line
              x1="60"
              y1="60"
              x2="60"
              y2="18"
              stroke={t.fg}
              strokeWidth="2.8"
              strokeLinecap="round"
              transform={`rotate(${minDeg} 60 60)`}
            />
            {showSeconds && (
              <line
                x1="60"
                y1="68"
                x2="60"
                y2="15"
                stroke={accent}
                strokeWidth="1.8"
                strokeLinecap="round"
                transform={`rotate(${secDeg} 60 60)`}
              />
            )}
            <circle cx="60" cy="60" r="4" fill={accent} />
          </svg>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 4 * s,
              minWidth: 0,
            }}
          >
            <div
              style={{
                ...titleStyle,
                fontSize: 34 * s,
                fontVariantNumeric: "tabular-nums",
                lineHeight: 1,
              }}
            >
              {hourStr}:{minStr}
              {use12h && (
                <span style={{ fontSize: 14 * s, marginLeft: 5 * s, color: accent }}>{period}</span>
              )}
            </div>
            <div style={{ ...bodyStyle, fontSize: 14 * s }}>{dateLabel}</div>
          </div>
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 6 * s,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          <span
            style={{
              ...titleStyle,
              fontSize: 56 * s,
              lineHeight: 1,
              letterSpacing: "-0.02em",
              color: t.fg,
            }}
          >
            {hourStr}:{minStr}
          </span>
          {showSeconds && (
            <span
              style={{
                ...titleStyle,
                fontSize: 28 * s,
                lineHeight: 1,
                color: accent,
                fontWeight: 700,
              }}
            >
              :{secStr}
            </span>
          )}
          {use12h && (
            <span
              style={{
                marginLeft: 6 * s,
                padding: `${3 * s}px ${8 * s}px`,
                borderRadius: sharp ? 0 : 6 * s,
                background: accent,
                color: onAccent,
                fontSize: 13 * s,
                fontWeight: 800,
              }}
            >
              {period}
            </span>
          )}
        </div>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8 * s,
        }}
      >
        <span style={{ ...bodyStyle, fontSize: 14 * s }}>{dateLabel}</span>
        {element.body && element.body !== "Live clock" && (
          <span style={{ ...bodyStyle, fontSize: 13 * s, opacity: 0.85 }}>{element.body}</span>
        )}
      </div>
    </div>
  );
}

function TimerWidget({ ctx }: { ctx: WidgetCtx }) {
  const {
    element,
    preview,
    interactive,
    t,
    accent,
    onAccent,
    s,
    sharp,
    softFill,
    line,
    shell,
    titleStyle,
    bodyStyle,
    xpTitleBar,
  } = ctx;
  const initialSec = Math.max(10, Math.round(element.value || 300));
  const [remaining, setRemaining] = useState(initialSec);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!interactive && !running) {
      setRemaining(initialSec);
    }
  }, [initialSec, interactive, running]);

  useEffect(() => {
    if (!running || preview) return;
    const id = window.setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          setRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running, preview]);

  const hrs = Math.floor(remaining / 3600);
  const mins = Math.floor((remaining % 3600) / 60);
  const secs = remaining % 60;
  const formatted = hrs > 0 ? `${hrs}:${pad2(mins)}:${pad2(secs)}` : `${pad2(mins)}:${pad2(secs)}`;
  const pct = Math.max(0, Math.min(100, (remaining / Math.max(1, initialSec)) * 100));

  const ctrlBtn = (primary = false): CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: `${6 * s}px ${12 * s}px`,
    fontSize: 13 * s,
    fontWeight: 700,
    borderRadius: sharp ? 0 : Math.min(10, (t.radius || 8) / 1.4),
    border: `1px solid ${primary ? accent : line}`,
    background: primary ? accent : softFill,
    color: primary ? onAccent : t.fg,
    cursor: interactive ? "pointer" : "default",
    pointerEvents: interactive ? "auto" : "none",
  });

  return (
    <div style={{ ...shell, justifyContent: "space-between" }}>
      {xpTitleBar}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8 * s,
        }}
      >
        <span style={{ ...bodyStyle, fontSize: 17 * s, fontWeight: 700, color: t.fg }}>
          {element.title || "Break Timer"}
        </span>
        <span
          style={{
            padding: `${3 * s}px ${9 * s}px`,
            borderRadius: sharp ? 0 : 999,
            fontSize: 11 * s,
            fontWeight: 700,
            background: remaining === 0 ? accent : softFill,
            color: remaining === 0 ? onAccent : running ? accent : t.muted,
            border: `1px solid ${remaining === 0 || running ? accent : line}`,
          }}
        >
          {remaining === 0 ? "Time up" : running ? "Running" : element.files?.[0] || "Ready"}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 10 * s,
        }}
      >
        <span
          style={{
            ...titleStyle,
            fontSize: 54 * s,
            lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
            color: remaining === 0 ? accent : t.fg,
          }}
        >
          {formatted}
        </span>
        {element.body && (
          <span style={{ ...bodyStyle, fontSize: 14 * s, textAlign: "right" }}>{element.body}</span>
        )}
      </div>

      <div
        style={{
          height: 10 * s,
          background: softFill,
          border: `1px solid ${line}`,
          borderRadius: sharp ? 0 : 999,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: accent,
            transition: "width 250ms linear",
          }}
        />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 * s }}>
        <WidgetControl
          interactive={interactive}
          style={ctrlBtn(true)}
          onActivate={() => {
            if (remaining === 0) setRemaining(initialSec);
            setRunning((r) => !r);
          }}
        >
          {running ? "Pause" : remaining === 0 ? "Restart" : "Start"}
        </WidgetControl>
        <WidgetControl
          interactive={interactive}
          style={ctrlBtn(false)}
          onActivate={() => {
            setRunning(false);
            setRemaining(initialSec);
          }}
        >
          Reset
        </WidgetControl>
        <WidgetControl
          interactive={interactive}
          style={{ ...ctrlBtn(false), marginLeft: "auto" }}
          onActivate={() => setRemaining((r) => Math.max(0, r - 60))}
        >
          −1m
        </WidgetControl>
        <WidgetControl
          interactive={interactive}
          style={ctrlBtn(false)}
          onActivate={() => setRemaining((r) => r + 60)}
        >
          +1m
        </WidgetControl>
      </div>
    </div>
  );
}

function StopwatchWidget({ ctx }: { ctx: WidgetCtx }) {
  const {
    element,
    preview,
    interactive,
    t,
    accent,
    onAccent,
    s,
    sharp,
    softFill,
    line,
    shell,
    titleStyle,
    bodyStyle,
    xpTitleBar,
  } = ctx;
  const [elapsedMs, setElapsedMs] = useState(0);
  const [running, setRunning] = useState(false);
  const [laps, setLaps] = useState<number[]>([]);

  useEffect(() => {
    if (!running || preview) return;
    const base = Date.now() - elapsedMs;
    const id = window.setInterval(() => {
      setElapsedMs(Date.now() - base);
    }, 50);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, preview]);

  const fmtMs = (ms: number) => {
    const m = Math.floor(ms / 60000);
    const sec = Math.floor((ms % 60000) / 1000);
    const tenth = Math.floor((ms % 1000) / 100);
    return `${pad2(m)}:${pad2(sec)}.${tenth}`;
  };

  const ctrlBtn = (primary = false): CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: `${6 * s}px ${12 * s}px`,
    fontSize: 13 * s,
    fontWeight: 700,
    borderRadius: sharp ? 0 : Math.min(10, (t.radius || 8) / 1.4),
    border: `1px solid ${primary ? accent : line}`,
    background: primary ? accent : softFill,
    color: primary ? onAccent : t.fg,
    cursor: interactive ? "pointer" : "default",
    pointerEvents: interactive ? "auto" : "none",
  });

  return (
    <div style={{ ...shell, justifyContent: "space-between" }}>
      {xpTitleBar}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8 * s,
        }}
      >
        <span style={{ ...bodyStyle, fontSize: 17 * s, fontWeight: 700, color: t.fg }}>
          {element.title || "Stopwatch"}
        </span>
        <span style={{ ...bodyStyle, fontSize: 13 * s }}>{element.body || "Elapsed"}</span>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 10 * s,
        }}
      >
        <span
          style={{
            ...titleStyle,
            fontSize: 52 * s,
            lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
            color: running ? accent : t.fg,
          }}
        >
          {fmtMs(elapsedMs)}
        </span>
        {laps.length > 0 && (
          <div
            style={{ display: "flex", gap: 6 * s, flexWrap: "wrap", justifyContent: "flex-end" }}
          >
            {laps.slice(0, 2).map((lap, idx) => (
              <span
                key={idx}
                style={{
                  padding: `${2 * s}px ${7 * s}px`,
                  fontSize: 11 * s,
                  fontVariantNumeric: "tabular-nums",
                  borderRadius: sharp ? 0 : 6 * s,
                  background: softFill,
                  border: `1px solid ${line}`,
                  color: t.muted,
                }}
              >
                #{laps.length - idx} {fmtMs(lap)}
              </span>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 * s }}>
        <WidgetControl
          interactive={interactive}
          style={ctrlBtn(true)}
          onActivate={() => setRunning((r) => !r)}
        >
          {running ? "Pause" : "Start"}
        </WidgetControl>
        <WidgetControl
          interactive={interactive}
          style={ctrlBtn(false)}
          onActivate={() => {
            if (elapsedMs > 0) setLaps((prev) => [elapsedMs, ...prev].slice(0, 5));
          }}
        >
          Lap
        </WidgetControl>
        <WidgetControl
          interactive={interactive}
          style={{ ...ctrlBtn(false), marginLeft: "auto" }}
          onActivate={() => {
            setRunning(false);
            setElapsedMs(0);
            setLaps([]);
          }}
        >
          Reset
        </WidgetControl>
      </div>
    </div>
  );
}

function CounterWidget({ ctx }: { ctx: WidgetCtx }) {
  const {
    element,
    interactive,
    t,
    accent,
    onAccent,
    s,
    sharp,
    softFill,
    line,
    shell,
    titleStyle,
    bodyStyle,
    xpTitleBar,
  } = ctx;
  const initial = Number.isFinite(element.value) ? element.value : 0;
  const step = Math.max(1, Number(element.files?.[0]) || 1);
  const [count, setCount] = useState(initial);

  useEffect(() => {
    if (!interactive) setCount(initial);
  }, [initial, interactive]);

  const btnStyle = (primary = false): CSSProperties => ({
    width: 44 * s,
    height: 40 * s,
    display: "grid",
    placeItems: "center",
    fontSize: 22 * s,
    fontWeight: 800,
    borderRadius: sharp ? 0 : Math.min(12, (t.radius || 8) / 1.2),
    border: `1px solid ${primary ? accent : line}`,
    background: primary ? accent : softFill,
    color: primary ? onAccent : t.fg,
    cursor: interactive ? "pointer" : "default",
    pointerEvents: interactive ? "auto" : "none",
  });

  return (
    <div style={{ ...shell, justifyContent: "space-between" }}>
      {xpTitleBar}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8 * s,
        }}
      >
        <span style={{ ...bodyStyle, fontSize: 17 * s, fontWeight: 700, color: t.fg }}>
          {element.title || "Counter"}
        </span>
        {count !== initial && interactive && (
          <button
            type="button"
            style={{
              padding: `${2 * s}px ${8 * s}px`,
              fontSize: 11 * s,
              fontWeight: 700,
              borderRadius: sharp ? 0 : 6 * s,
              background: softFill,
              border: `1px solid ${line}`,
              color: t.muted,
              cursor: "pointer",
            }}
            {...interactiveHandlers(interactive, () => setCount(initial))}
          >
            Reset
          </button>
        )}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12 * s,
        }}
      >
        <WidgetControl
          interactive={interactive}
          style={btnStyle(false)}
          onActivate={() => setCount((c) => c - step)}
        >
          −
        </WidgetControl>
        <span
          style={{
            ...titleStyle,
            fontSize: 60 * s,
            lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
            color: accent,
          }}
        >
          {count.toLocaleString("en-US")}
        </span>
        <WidgetControl
          interactive={interactive}
          style={btnStyle(true)}
          onActivate={() => setCount((c) => c + step)}
        >
          +
        </WidgetControl>
      </div>

      <div style={{ ...bodyStyle, fontSize: 14 * s, textAlign: "center" }}>{element.body}</div>
    </div>
  );
}

function RatingWidget({ ctx }: { ctx: WidgetCtx }) {
  const {
    element,
    interactive,
    t,
    accent,
    s,
    softFill,
    line,
    shell,
    titleStyle,
    bodyStyle,
    xpTitleBar,
  } = ctx;
  const initial = Math.max(1, Math.min(5, Math.round(element.value || 4)));
  const [score, setScore] = useState(initial);
  const [hovered, setHovered] = useState<number | null>(null);

  useEffect(() => {
    if (!interactive) setScore(initial);
  }, [initial, interactive]);

  const active = hovered ?? score;
  const labels =
    element.items.length > 0 ? element.items : ["Poor", "Fair", "Good", "Great", "Loved it"];
  const feedback = labels[Math.min(labels.length - 1, Math.max(0, active - 1))] ?? `${active} / 5`;

  return (
    <div style={{ ...shell, justifyContent: "space-between" }}>
      {xpTitleBar}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8 * s,
        }}
      >
        <span style={{ ...titleStyle, fontSize: 22 * s }}>
          {element.title || "Rate this session"}
        </span>
        <span
          style={{
            padding: `${3 * s}px ${9 * s}px`,
            borderRadius: 6 * s,
            background: softFill,
            border: `1px solid ${line}`,
            fontSize: 13 * s,
            fontWeight: 700,
            color: accent,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {active}.0 / 5
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 * s }}>
        {[1, 2, 3, 4, 5].map((n) => {
          const filled = n <= active;
          return (
            <WidgetControl
              key={n}
              interactive={interactive}
              onMouseEnter={() => setHovered(n)}
              onMouseLeave={() => setHovered(null)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: "transparent",
                border: "none",
                padding: 2 * s,
                cursor: interactive ? "pointer" : "default",
                pointerEvents: interactive ? "auto" : "none",
                transform: interactive && hovered === n ? "scale(1.12)" : "scale(1)",
                transition: "transform 120ms ease",
              }}
              onActivate={() => setScore(n)}
            >
              <svg
                width={34 * s}
                height={34 * s}
                viewBox="0 0 24 24"
                fill={filled ? accent : "none"}
                stroke={filled ? accent : t.muted}
                strokeWidth="2"
                strokeLinejoin="round"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </WidgetControl>
          );
        })}
        <span
          style={{
            ...bodyStyle,
            fontSize: 16 * s,
            fontWeight: 700,
            color: t.fg,
            marginLeft: 4 * s,
          }}
        >
          {feedback}
        </span>
      </div>

      <div style={{ ...bodyStyle, fontSize: 14 * s }}>{element.body}</div>
    </div>
  );
}

function InteractiveTabsWidget({ ctx }: { ctx: WidgetCtx }) {
  const { element, interactive, t, accent, s, softFill, line, chromeShell, titleStyle, bodyStyle } =
    ctx;
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    if (!interactive) setActiveTab(0);
  }, [interactive]);

  const idx = Math.min(Math.max(0, activeTab), Math.max(0, element.items.length - 1));
  const activeLabel = element.items[idx] || element.title;
  const panelBody = element.files?.[idx] || element.body;

  return (
    <div style={chromeShell}>
      <div style={{ display: "flex", flexShrink: 0 }}>
        {element.items.map((it, i) => {
          const isAct = i === idx;
          return (
            <WidgetControl
              key={i}
              interactive={interactive}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: `${12 * s}px ${18 * s}px`,
                fontSize: 16 * s,
                fontWeight: 700,
                border: "none",
                borderBottom: `${3 * s}px solid ${isAct ? accent : "transparent"}`,
                color: isAct ? accent : t.muted,
                background: isAct ? softFill : "transparent",
                cursor: interactive ? "pointer" : "default",
                pointerEvents: interactive ? "auto" : "none",
              }}
              onActivate={() => setActiveTab(i)}
            >
              {it}
            </WidgetControl>
          );
        })}
      </div>
      <div
        style={{
          padding: 20 * s,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 10 * s,
          borderTop: `1px solid ${line}`,
        }}
      >
        <div style={{ ...titleStyle, fontSize: 26 * s }}>
          {interactive ? activeLabel : element.title}
        </div>
        <div style={bodyStyle}>{panelBody}</div>
      </div>
    </div>
  );
}

function InteractiveToggleWidget({ ctx }: { ctx: WidgetCtx }) {
  const { element, interactive, t, accent, s, sharp, line, shell, titleStyle, bodyStyle } = ctx;
  const [states, setStates] = useState<boolean[]>(() => element.items.map((_, i) => i % 2 === 0));

  useEffect(() => {
    if (!interactive) {
      setStates(element.items.map((_, i) => i % 2 === 0));
    }
  }, [interactive, element.items]);

  return (
    <div style={shell}>
      <div style={titleStyle}>{element.title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 * s }}>
        {element.items.map((it, i) => {
          const on = states[i] ?? i % 2 === 0;
          return (
            <WidgetControl
              key={i}
              interactive={interactive}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "transparent",
                border: "none",
                padding: 0,
                width: "100%",
                textAlign: "left",
                ...bodyStyle,
                color: t.fg,
                cursor: interactive ? "pointer" : "default",
                pointerEvents: interactive ? "auto" : "none",
              }}
              onActivate={() =>
                setStates((prev) =>
                  element.items.map((_, j) => (j === i ? !on : (prev[j] ?? j % 2 === 0))),
                )
              }
            >
              <span>{it}</span>
              <span
                style={{
                  width: 56 * s,
                  height: 30 * s,
                  borderRadius: sharp ? 0 : 999,
                  background: on ? accent : "rgba(128,128,128,0.4)",
                  border: `${Math.max(1, t.borderWidth)}px solid ${line}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: on ? "flex-end" : "flex-start",
                  padding: 3 * s,
                  boxSizing: "border-box",
                  transition: "background 150ms ease",
                }}
              >
                <span
                  style={{
                    width: 22 * s,
                    height: 22 * s,
                    borderRadius: sharp ? 0 : "50%",
                    background: "#fff",
                  }}
                />
              </span>
            </WidgetControl>
          );
        })}
      </div>
    </div>
  );
}

function InteractiveListWidget({ ctx }: { ctx: WidgetCtx }) {
  const { element, interactive, t, accent, s, shell, titleStyle, bodyStyle, xpTitleBar } = ctx;
  const [checked, setChecked] = useState<boolean[]>(() => element.items.map(() => false));

  useEffect(() => {
    if (!interactive) setChecked(element.items.map(() => false));
  }, [interactive, element.items]);

  return (
    <div style={shell}>
      {xpTitleBar}
      <div style={titleStyle}>{element.title}</div>
      {element.kind === "pricing" && (
        <div style={{ ...titleStyle, fontSize: 44 * s, color: accent }}>{element.body}</div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 * s }}>
        {element.items.map((it, i) => {
          const isChecked = element.kind === "list" && interactive ? !!checked[i] : false;
          return (
            <WidgetControl
              key={i}
              interactive={interactive && element.kind === "list"}
              style={{
                ...bodyStyle,
                display: "flex",
                gap: 10 * s,
                alignItems: "center",
                color: isChecked ? t.muted : t.fg,
                textDecoration: isChecked ? "line-through" : "none",
                background: "transparent",
                border: "none",
                padding: 0,
                textAlign: "left",
                cursor: interactive && element.kind === "list" ? "pointer" : "default",
                pointerEvents: interactive && element.kind === "list" ? "auto" : "none",
              }}
              onActivate={() =>
                setChecked((prev) => element.items.map((_, j) => (j === i ? !prev[j] : !!prev[j])))
              }
            >
              <span style={{ color: accent, fontWeight: 800 }}>
                {isChecked ? "☑" : element.uiStyle === "cyber" ? "▸" : "✓"}
              </span>
              {it}
            </WidgetControl>
          );
        })}
      </div>
    </div>
  );
}

export function UiRender({
  element,
  preview = false,
  interactive = false,
}: {
  element: UiElement;
  preview?: boolean;
  interactive?: boolean;
}) {
  const base = UI_STYLE_THEMES[element.uiStyle] ?? UI_STYLE_THEMES.cyber;
  const t = {
    ...base,
    bg: element.bgColor || base.bg,
    fg: element.fgColor || base.fg,
    muted: element.fgColor ? element.fgColor : base.muted,
    border: element.borderColorOverride || base.border,
    borderWidth: element.borderWidth ?? base.borderWidth,
    radius: element.cornerRadius ?? base.radius,
    shadow: element.shadowOff ? "none" : base.shadow,
    font: element.fontFamily ? `'${element.fontFamily}', ${base.font}` : base.font,
    uppercase: element.uppercase ?? base.uppercase,
  };
  const accent = element.accentColor || t.accent;
  const s = (preview ? 0.34 : 1) * (element.textScale ?? 1);
  const onAccent = t.onAccent ?? "#ffffff";
  const sharp = t.radius === 0;
  const softFill = t.dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)";

  // ---- frame shape ----
  const shape = element.cornerShape ?? "default";
  const cut = 18 * (preview ? 0.34 : 1);
  const frameRadius: CSSProperties["borderRadius"] =
    shape === "pill"
      ? 999
      : shape === "squircle"
        ? "28%"
        : shape === "leaf"
          ? `${Math.max(24, t.radius * 3)}px 0 ${Math.max(24, t.radius * 3)}px 0`
          : t.radius;
  const frameClip =
    shape === "cut"
      ? `polygon(${cut}px 0, 100% 0, 100% calc(100% - ${cut}px), calc(100% - ${cut}px) 100%, 0 100%, 0 ${cut}px)`
      : undefined;
  const frameBorderStyle = element.borderStyle ?? "solid";

  const shell: CSSProperties = {
    width: "100%",
    height: "100%",
    background: t.bg,
    color: t.fg,
    border:
      frameBorderStyle === "none" ? "none" : `${t.borderWidth}px ${frameBorderStyle} ${t.border}`,
    borderRadius: frameRadius,
    clipPath: frameClip,
    boxShadow: t.shadow,
    backdropFilter: t.backdrop,
    fontFamily: t.font,
    letterSpacing: t.letterSpacing,
    padding: 28 * s * (element.padScale ?? 1),
    display: "flex",
    flexDirection: "column",
    gap: 12 * s,
    overflow: "hidden",
    boxSizing: "border-box",
  };

  const titleStyle: CSSProperties = {
    fontSize: 34 * s,
    fontWeight: 800,
    lineHeight: 1.15,
    textTransform: t.uppercase ? "uppercase" : "none",
  };
  const bodyStyle: CSSProperties = { fontSize: 20 * s, lineHeight: 1.4, color: t.muted };

  const xpTitleBar = element.uiStyle === "xp" && (
    <div
      style={{
        margin: -28 * s,
        marginBottom: 4 * s,
        padding: `${8 * s}px ${12 * s}px`,
        background: "linear-gradient(180deg,#3b7dea 0%,#245edb 50%,#1941a5 100%)",
        color: "#fff",
        fontSize: 18 * s,
        fontWeight: 700,
        display: "flex",
        justifyContent: "space-between",
      }}
    >
      <span>{element.title || "Window"}</span>
      <span style={{ letterSpacing: "0.2em" }}>_ □ ✕</span>
    </div>
  );

  // ---- Real UI chrome helpers ----
  const isXP = element.uiStyle === "xp";
  const barBg = isXP
    ? "linear-gradient(180deg,#3b7dea 0%,#245edb 50%,#1941a5 100%)"
    : element.uiStyle === "neobrutalist"
      ? accent
      : element.uiStyle === "glass"
        ? "rgba(255,255,255,0.22)"
        : element.uiStyle === "sketch"
          ? "rgba(27,27,27,0.06)"
          : element.uiStyle === "cyber"
            ? "rgba(125,249,255,0.10)"
            : t.dark
              ? "rgba(255,255,255,0.07)"
              : "rgba(0,0,0,0.045)";
  const barFg = isXP ? "#fff" : element.uiStyle === "neobrutalist" ? onAccent : t.fg;
  const line = t.border;
  const chromeShell: CSSProperties = { ...shell, padding: 0, gap: 0 };

  const ctx: WidgetCtx = {
    element,
    preview,
    interactive,
    t,
    accent,
    onAccent,
    s,
    sharp,
    softFill,
    line,
    shell,
    chromeShell,
    titleStyle,
    bodyStyle,
    xpTitleBar,
  };

  const K = element.kind;

  if (K === "clock") return <ClockWidget ctx={ctx} />;
  if (K === "timer") return <TimerWidget ctx={ctx} />;
  if (K === "stopwatch") return <StopwatchWidget ctx={ctx} />;
  if (K === "counter") return <CounterWidget ctx={ctx} />;
  if (K === "rating") return <RatingWidget ctx={ctx} />;
  if (K === "tabs") return <InteractiveTabsWidget ctx={ctx} />;
  if (K === "toggle") return <InteractiveToggleWidget ctx={ctx} />;
  if (K === "list" || K === "pricing") return <InteractiveListWidget ctx={ctx} />;

  if (K === "badge") {
    return (
      <div
        style={{
          ...shell,
          alignItems: "center",
          justifyContent: "center",
          background: accent,
          color: onAccent,
          padding: 0,
        }}
      >
        <span style={{ ...titleStyle, fontSize: 30 * s, letterSpacing: t.letterSpacing }}>
          {element.title}
        </span>
      </div>
    );
  }

  if (K === "progress") {
    const pct = Math.max(0, Math.min(100, element.value));
    return (
      <div style={{ ...shell, justifyContent: "center" }}>
        {xpTitleBar}
        <div
          style={{ display: "flex", justifyContent: "space-between", ...bodyStyle, color: t.fg }}
        >
          <span>{element.body || element.title}</span>
          <span style={{ fontVariantNumeric: "tabular-nums" }}>{pct}%</span>
        </div>
        <div
          style={{
            height: 26 * s,
            background: "rgba(0,0,0,0.25)",
            border: `${Math.max(1, t.borderWidth - 1)}px solid ${t.border}`,
            borderRadius: t.radius ? t.radius / 2 : 0,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: "100%",
              background:
                element.uiStyle === "xp"
                  ? "repeating-linear-gradient(90deg,#3ec53e 0 12px, #ece9d8 12px 16px)"
                  : accent,
            }}
          />
        </div>
      </div>
    );
  }

  if (K === "stat") {
    return (
      <div style={{ ...shell, justifyContent: "center" }}>
        {xpTitleBar}
        <div style={{ ...bodyStyle, textTransform: t.uppercase ? "uppercase" : "none" }}>
          {element.title}
        </div>
        <div
          style={{
            ...titleStyle,
            fontSize: 72 * s,
            color: accent,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {element.value.toLocaleString("en-US")}
        </div>
        <div style={bodyStyle}>{element.body}</div>
      </div>
    );
  }

  if (K === "quote") {
    return (
      <div style={{ ...shell, justifyContent: "center" }}>
        <div style={{ fontSize: 64 * s, lineHeight: 0.6, color: accent }}>“</div>
        <div style={{ ...titleStyle, fontSize: 28 * s, fontWeight: 600, textTransform: "none" }}>
          {element.title}
        </div>
        <div style={{ ...bodyStyle, fontSize: 18 * s }}>— {element.body}</div>
      </div>
    );
  }

  if (K === "profile") {
    return (
      <div style={{ ...shell, flexDirection: "row", alignItems: "center", gap: 20 * s }}>
        <div
          style={{
            width: 88 * s,
            height: 88 * s,
            borderRadius: sharp ? 0 : "50%",
            background: accent,
            border: `${t.borderWidth}px solid ${t.border}`,
            display: "grid",
            placeItems: "center",
            fontSize: 34 * s,
            fontWeight: 800,
            color: onAccent,
            flexShrink: 0,
          }}
        >
          {(element.title || "?").slice(0, 1)}
        </div>
        <div>
          <div style={titleStyle}>{element.title}</div>
          <div style={bodyStyle}>{element.body}</div>
        </div>
      </div>
    );
  }

  if (K === "alert") {
    return (
      <div style={{ ...shell, borderLeft: `${8 * s}px solid ${accent}` }}>
        {xpTitleBar}
        <div style={{ ...titleStyle, fontSize: 26 * s, color: accent }}>! {element.title}</div>
        <div style={bodyStyle}>{element.body}</div>
      </div>
    );
  }

  if (K === "kbd") {
    return (
      <div style={{ ...shell, alignItems: "center", justifyContent: "center", gap: 8 * s }}>
        <span
          style={{
            ...titleStyle,
            fontSize: 30 * s,
            padding: `${8 * s}px ${18 * s}px`,
            border: `${Math.max(2, t.borderWidth)}px solid ${t.border}`,
            borderBottomWidth: Math.max(4, t.borderWidth * 2),
            borderRadius: t.radius || 6,
            background: softFill,
          }}
        >
          {element.title}
        </span>
        <span style={{ ...bodyStyle, fontSize: 16 * s }}>{element.body}</span>
      </div>
    );
  }

  const dots = (
    <div style={{ display: "flex", gap: 6 * s }}>
      {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
        <span
          key={c}
          style={{
            width: 12 * s,
            height: 12 * s,
            borderRadius: sharp ? 0 : "50%",
            background: c,
            border: t.borderWidth >= 3 ? `${2 * s}px solid ${line}` : "none",
            display: "inline-block",
          }}
        />
      ))}
    </div>
  );
  const bar = (label: string, right?: ReactNode) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10 * s,
        padding: `${10 * s}px ${14 * s}px`,
        background: barBg,
        color: barFg,
        borderBottom: `${t.borderWidth}px solid ${line}`,
        fontSize: 16 * s,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {isXP ? null : dots}
      <span
        style={{
          flex: 1,
          textAlign: isXP ? "left" : "center",
          overflow: "hidden",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      {right ??
        (isXP ? (
          <span style={{ letterSpacing: "0.2em" }}>_ □ ✕</span>
        ) : (
          <span style={{ width: 46 * s }} />
        ))}
    </div>
  );
  const field = (text: string, extra: CSSProperties = {}) => (
    <div
      style={{
        flex: 1,
        padding: `${8 * s}px ${12 * s}px`,
        border: `${Math.max(1, t.borderWidth)}px solid ${line}`,
        borderRadius: sharp ? 0 : (t.radius || 8) / 1.5 + 6 * s,
        background: isXP ? "#fff" : softFill,
        color: t.muted,
        fontSize: 16 * s,
        overflow: "hidden",
        whiteSpace: "nowrap",
        ...extra,
      }}
    >
      {text}
    </div>
  );

  if (K === "window") {
    return (
      <div style={chromeShell}>
        {bar(element.title || "Window")}
        <div
          style={{
            display: "flex",
            gap: 16 * s,
            padding: `${8 * s}px ${14 * s}px`,
            borderBottom: `1px solid ${line}`,
            fontSize: 14 * s,
            color: t.muted,
          }}
        >
          {element.items.map((it, i) => (
            <span key={i}>{it}</span>
          ))}
        </div>
        <div style={{ padding: 18 * s, ...bodyStyle, color: t.fg, flex: 1 }}>{element.body}</div>
      </div>
    );
  }

  if (K === "browser") {
    return (
      <div style={chromeShell}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10 * s,
            padding: `${10 * s}px ${14 * s}px`,
            background: barBg,
            borderBottom: `${t.borderWidth}px solid ${line}`,
          }}
        >
          {dots}
          <span style={{ color: barFg, fontSize: 15 * s, opacity: 0.8 }}>◀ ▶ ⟳</span>
          {field(element.body || "https://example.com", { borderRadius: 999 })}
        </div>
        <div
          style={{
            display: "flex",
            gap: 18 * s,
            padding: `${10 * s}px ${16 * s}px`,
            borderBottom: `1px solid ${line}`,
            fontSize: 15 * s,
            color: t.muted,
          }}
        >
          {element.items.map((it, i) => (
            <span key={i} style={i === 0 ? { color: accent, fontWeight: 700 } : undefined}>
              {it}
            </span>
          ))}
        </div>
        <div
          style={{
            padding: 20 * s,
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 10 * s,
          }}
        >
          <div style={{ ...titleStyle, fontSize: 28 * s }}>{element.title}</div>
          <div style={{ height: 10 * s, width: "80%", background: t.muted, opacity: 0.35 }} />
          <div style={{ height: 10 * s, width: "65%", background: t.muted, opacity: 0.35 }} />
          <div style={{ marginTop: "auto", height: 8 * s, width: "35%", background: accent }} />
        </div>
      </div>
    );
  }

  if (K === "timeline") {
    const timelineItems = element.items.length ? element.items : ["Research", "Build", "Ship"];
    return (
      <div style={{ ...shell, justifyContent: "center", gap: 10 * s, padding: 16 * s }}>
        <div style={{ ...titleStyle, fontSize: 11 * s }}>{element.title}</div>
        <div style={{ display: "flex", alignItems: "center", width: "100%", gap: 0 }}>
          {timelineItems.map((item, index) => (
            <div
              key={`${item}-${index}`}
              style={{ display: "flex", alignItems: "center", flex: 1 }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 5 * s,
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    width: 12 * s,
                    height: 12 * s,
                    borderRadius: "50%",
                    background:
                      index / Math.max(1, timelineItems.length - 1) <= element.value / 100
                        ? element.accentColor
                        : `${element.fgColor ?? "#fff"}55`,
                    border: `2px solid ${element.accentColor}`,
                  }}
                />
                <span
                  style={{
                    ...bodyStyle,
                    fontSize: 8 * s,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: 72 * s,
                  }}
                >
                  {item}
                </span>
              </div>
              {index < timelineItems.length - 1 && (
                <div
                  style={{
                    height: 2 * s,
                    flex: 1,
                    background:
                      index / Math.max(1, timelineItems.length - 1) < element.value / 100
                        ? element.accentColor
                        : `${element.fgColor ?? "#fff"}35`,
                  }}
                />
              )}
            </div>
          ))}
        </div>
        <div style={{ ...bodyStyle, fontSize: 9 * s }}>{element.body}</div>
      </div>
    );
  }

  if (K === "taskbar") {
    return (
      <div
        style={{
          ...shell,
          flexDirection: "row",
          alignItems: "center",
          gap: 8 * s,
          padding: `${6 * s}px ${12 * s}px`,
          background: barBg,
          color: barFg,
        }}
      >
        {isXP && (
          <div
            style={{
              padding: `${8 * s}px ${18 * s}px`,
              background: "linear-gradient(180deg,#5eac56 0%,#3f8f37 55%,#2f7a2a 100%)",
              color: "#fff",
              borderRadius: 0,
              fontWeight: 800,
              fontStyle: "italic",
              fontSize: 18 * s,
              whiteSpace: "nowrap",
            }}
          >
            {element.title || "start"}
          </div>
        )}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6 * s,
            flex: 1,
            justifyContent: isXP ? "flex-start" : "center",
            overflow: "hidden",
          }}
        >
          {!isXP && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 2.5 * s,
                padding: `${10 * s}px`,
                borderRadius: sharp ? 0 : 6 * s,
                background: softFill,
              }}
              title={element.title}
            >
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  style={{
                    width: 7 * s,
                    height: 7 * s,
                    background: accent,
                    display: "block",
                    borderRadius: sharp ? 0 : 1.5 * s,
                  }}
                />
              ))}
            </div>
          )}
          {!isXP && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7 * s,
                padding: `${7 * s}px ${14 * s}px`,
                borderRadius: sharp ? 0 : 999,
                background: softFill,
                border: `1px solid ${line}`,
                fontSize: 14 * s,
                color: barFg,
                opacity: 0.85,
                whiteSpace: "nowrap",
              }}
            >
              <span>⌕</span> {element.files?.[0] || "Search"}
            </div>
          )}
          {element.items.map((it, i) => (
            <div
              key={i}
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                gap: 8 * s,
                padding: isXP ? `${7 * s}px ${12 * s}px` : `${9 * s}px ${11 * s}px`,
                background: i === 0 ? softFill : "transparent",
                border: isXP ? `1px solid ${i === 0 ? line : "transparent"}` : "none",
                borderRadius: sharp ? 0 : 6 * s,
                fontSize: 15 * s,
                color: barFg,
                whiteSpace: "nowrap",
              }}
            >
              <span
                style={{
                  width: 16 * s,
                  height: 16 * s,
                  background: i % 2 === 0 ? accent : t.muted,
                  borderRadius: sharp ? 0 : 3 * s,
                  display: "inline-block",
                }}
              />
              {isXP ? it : null}
              {!isXP && (
                <span
                  style={{
                    position: "absolute",
                    bottom: 2 * s,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: (i === 0 ? 14 : 6) * s,
                    height: 3 * s,
                    borderRadius: 999,
                    background: accent,
                    opacity: i < 2 ? 1 : 0,
                  }}
                />
              )}
            </div>
          ))}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10 * s,
            fontSize: 14 * s,
            color: barFg,
            opacity: 0.92,
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ letterSpacing: "0.12em" }}>∧ ᯤ 🔊 ▮</span>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              lineHeight: 1.1,
            }}
          >
            <span style={{ fontWeight: 700 }}>{element.body}</span>
            <span style={{ fontSize: 11 * s, opacity: 0.75 }}>{element.title || "Windows"}</span>
          </div>
        </div>
      </div>
    );
  }

  if (K === "vtabs") {
    return (
      <div style={{ ...chromeShell, flexDirection: "row" }}>
        <div
          style={{
            width: 190 * s,
            flexShrink: 0,
            background: barBg,
            color: barFg,
            borderRight: `${t.borderWidth}px solid ${line}`,
            padding: `${12 * s}px ${10 * s}px`,
            display: "flex",
            flexDirection: "column",
            gap: 8 * s,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 * s, paddingBottom: 6 * s }}>
            {dots}
          </div>
          {element.items.map((it, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8 * s,
                padding: `${8 * s}px ${10 * s}px`,
                fontSize: 15 * s,
                background: i === 0 ? softFill : "transparent",
                border: `1px solid ${i === 0 ? line : "transparent"}`,
                borderLeft: i === 0 ? `${3 * s}px solid ${accent}` : "1px solid transparent",
                borderRadius: sharp ? 0 : (t.radius || 8) / 2,
                color: i === 0 ? t.fg : t.muted,
                fontWeight: i === 0 ? 700 : 400,
                whiteSpace: "nowrap",
                overflow: "hidden",
              }}
            >
              <span
                style={{
                  width: 10 * s,
                  height: 10 * s,
                  background: accent,
                  borderRadius: "50%",
                  flexShrink: 0,
                }}
              />
              {it}
            </div>
          ))}
          <div style={{ marginTop: "auto", fontSize: 14 * s, color: t.muted }}>
            {element.files?.[0] || "+ New tab"}
          </div>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10 * s,
              padding: `${10 * s}px ${14 * s}px`,
              borderBottom: `1px solid ${line}`,
            }}
          >
            <span style={{ color: t.muted, fontSize: 15 * s }}>◀ ▶ ⟳</span>
            {field(element.body || "https://example.com", { borderRadius: 999 })}
          </div>
          <div
            style={{
              padding: 20 * s,
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: 10 * s,
            }}
          >
            <div style={{ ...titleStyle, fontSize: 26 * s }}>{element.title}</div>
            <div style={{ height: 10 * s, width: "80%", background: t.muted, opacity: 0.35 }} />
            <div style={{ height: 10 * s, width: "62%", background: t.muted, opacity: 0.35 }} />
            <div style={{ marginTop: "auto", height: 8 * s, width: "35%", background: accent }} />
          </div>
        </div>
      </div>
    );
  }

  if (K === "search") {
    return (
      <div
        style={{
          ...shell,
          flexDirection: "row",
          alignItems: "center",
          gap: 12 * s,
          padding: 16 * s,
        }}
      >
        <span style={{ fontSize: 24 * s, color: accent }}>⌕</span>
        <span style={{ ...bodyStyle, flex: 1, fontSize: 22 * s }}>{element.title}</span>
        <span
          style={{
            fontSize: 15 * s,
            padding: `${6 * s}px ${12 * s}px`,
            border: `${Math.max(1, t.borderWidth)}px solid ${line}`,
            borderRadius: t.radius ? t.radius / 2 : 0,
            color: t.muted,
          }}
        >
          {element.body}
        </span>
      </div>
    );
  }

  if (K === "terminal") {
    return (
      <div style={{ ...chromeShell, background: element.uiStyle === "cyber" ? "#05080f" : t.bg }}>
        {bar(element.title || "terminal")}
        <div
          style={{
            padding: 16 * s,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 16 * s,
            lineHeight: 1.6,
            color: accent,
            flex: 1,
            overflow: "hidden",
          }}
        >
          {element.items.map((it, i) => (
            <div key={i} style={{ color: it.startsWith("$") ? accent : t.muted }}>
              {it}
            </div>
          ))}
          <div>
            <span style={{ color: accent }}>$ </span>
            {element.body}
            <span
              style={{
                background: accent,
                marginLeft: 2 * s,
                display: "inline-block",
                width: 9 * s,
                height: 16 * s,
                verticalAlign: "middle",
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (K === "phone") {
    return (
      <div
        style={{
          ...chromeShell,
          borderRadius: sharp ? 0 : 36 * s,
          borderWidth: Math.max(4, t.borderWidth * 2),
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: `${10 * s}px ${18 * s}px`,
            fontSize: 13 * s,
            color: t.muted,
            flexShrink: 0,
          }}
        >
          <span>9:41</span>
          <span>▮▮▮ ▮</span>
        </div>
        <div style={{ padding: `${6 * s}px ${18 * s}px`, ...titleStyle, fontSize: 26 * s }}>
          {element.title}
        </div>
        <div style={{ padding: `0 ${18 * s}px`, ...bodyStyle, fontSize: 16 * s }}>
          {element.body}
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10 * s,
            padding: 18 * s,
            flex: 1,
          }}
        >
          {element.items.map((it, i) => (
            <div
              key={i}
              style={{
                padding: `${12 * s}px ${14 * s}px`,
                border: `${Math.max(1, t.borderWidth)}px solid ${line}`,
                borderRadius: sharp ? 0 : 14 * s,
                fontSize: 16 * s,
                color: t.fg,
              }}
            >
              {it}
            </div>
          ))}
          <div
            style={{
              marginTop: "auto",
              height: 6 * s,
              width: "40%",
              alignSelf: "center",
              background: t.muted,
              borderRadius: 999,
            }}
          />
        </div>
      </div>
    );
  }

  if (K === "modal") {
    return (
      <div style={{ ...chromeShell }}>
        {bar(element.title || "Confirm")}
        <div style={{ padding: 22 * s, ...bodyStyle, color: t.fg, flex: 1 }}>{element.body}</div>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10 * s,
            padding: 16 * s,
            borderTop: `1px solid ${line}`,
          }}
        >
          {element.items.map((it, i) => (
            <span
              key={i}
              style={{
                padding: `${10 * s}px ${20 * s}px`,
                fontSize: 16 * s,
                fontWeight: 700,
                border: `${Math.max(1, t.borderWidth)}px solid ${line}`,
                borderRadius: t.radius ? t.radius / 2 : 0,
                background: i === element.items.length - 1 ? accent : "transparent",
                color: i === element.items.length - 1 ? onAccent : t.fg,
              }}
            >
              {it}
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (K === "login") {
    return (
      <div style={{ ...shell, justifyContent: "center", gap: 14 * s }}>
        <div style={{ ...titleStyle, fontSize: 32 * s }}>{element.title}</div>
        <div style={bodyStyle}>{element.body}</div>
        {element.items.map((it, i) => (
          <div key={i} style={{ display: "flex" }}>
            {field(it)}
          </div>
        ))}
        <div
          style={{
            marginTop: 6 * s,
            textAlign: "center",
            padding: `${12 * s}px 0`,
            background: accent,
            color: onAccent,
            fontWeight: 800,
            fontSize: 18 * s,
            border: `${t.borderWidth}px solid ${line}`,
            borderRadius: t.radius ? t.radius / 2 : 0,
          }}
        >
          {element.files?.[0] || "Continue"}
        </div>
      </div>
    );
  }

  if (K === "notification") {
    return (
      <div
        style={{
          ...shell,
          flexDirection: "row",
          alignItems: "center",
          gap: 14 * s,
          padding: 18 * s,
        }}
      >
        <span
          style={{
            width: 44 * s,
            height: 44 * s,
            flexShrink: 0,
            borderRadius: sharp ? 0 : "50%",
            background: accent,
            display: "grid",
            placeItems: "center",
            color: onAccent,
            fontSize: 22 * s,
            fontWeight: 800,
          }}
        >
          ✓
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ ...titleStyle, fontSize: 22 * s }}>{element.title}</div>
          <div style={{ ...bodyStyle, fontSize: 16 * s }}>{element.body}</div>
        </div>
        <span style={{ ...bodyStyle, fontSize: 18 * s }}>✕</span>
      </div>
    );
  }

  if (K === "code") {
    const lines = (element.body || "").split("\n");
    const dark = !!t.dark;
    const C = {
      comment: dark ? "rgba(255,255,255,0.45)" : "#94a3b8",
      string: dark ? "#a3e635" : "#a35b00",
      number: dark ? "#fbbf24" : "#b45309",
      keyword: dark ? accent : "#2563eb",
    };
    const RX =
      /(\/\/[^\n]*|#[^\n]*)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|\b(const|let|var|function|return|if|else|for|while|class|new|import|export|from|default|async|await|try|catch|throw|type|interface|def|fn|struct|enum|pub|mut)\b|\b(\d+(?:\.\d+)?)\b/g;
    const tokenize = (codeLine: string) => {
      const out: Array<{ text: string; kind: string }> = [];
      let last = 0;
      let m: RegExpExecArray | null;
      RX.lastIndex = 0;
      while ((m = RX.exec(codeLine))) {
        if (m.index > last) out.push({ text: codeLine.slice(last, m.index), kind: "" });
        const kind = m[1] ? "comment" : m[2] ? "string" : m[3] ? "keyword" : "number";
        out.push({ text: m[0], kind });
        last = m.index + m[0].length;
      }
      if (last < codeLine.length) out.push({ text: codeLine.slice(last), kind: "" });
      return out;
    };
    return (
      <div
        style={{
          ...shell,
          padding: 0,
          gap: 0,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          fontSize: 16 * s,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10 * s,
            padding: `${10 * s}px ${14 * s}px`,
            borderBottom: `${Math.max(1, t.borderWidth - 1)}px solid ${line}`,
            background: softFill,
          }}
        >
          <span style={{ display: "flex", gap: 6 * s }}>
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                style={{
                  width: 10 * s,
                  height: 10 * s,
                  borderRadius: "50%",
                  background: i === 0 ? "#ff5f57" : i === 1 ? "#febc2e" : "#28c840",
                }}
              />
            ))}
          </span>
          <span
            style={{
              flex: 1,
              textAlign: "center",
              color: t.muted,
              fontSize: 13 * s,
              whiteSpace: "nowrap",
              overflow: "hidden",
            }}
          >
            {element.title}
          </span>
          <span style={{ width: 10 * s }} />
        </div>
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflow: "hidden",
            padding: `${12 * s}px 0`,
            display: "flex",
            flexDirection: "column",
            gap: 3 * s,
          }}
        >
          {lines.map((ln, i) => (
            <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 12 * s }}>
              <span
                style={{
                  width: 40 * s,
                  flexShrink: 0,
                  textAlign: "right",
                  paddingRight: 14 * s,
                  color: t.muted,
                  opacity: 0.55,
                  fontSize: 12 * s,
                  userSelect: "none",
                }}
              >
                {i + 1}
              </span>
              <span style={{ whiteSpace: "pre", flex: 1, overflow: "hidden", color: t.fg }}>
                {tokenize(ln).map((tok, j) => (
                  <span
                    key={j}
                    style={{
                      color:
                        tok.kind === "comment"
                          ? C.comment
                          : tok.kind === "string"
                            ? C.string
                            : tok.kind === "keyword"
                              ? C.keyword
                              : tok.kind === "number"
                                ? C.number
                                : t.fg,
                      fontStyle: tok.kind === "comment" ? "italic" : undefined,
                    }}
                  >
                    {tok.text}
                  </span>
                ))}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // card
  return (
    <div style={shell}>
      {xpTitleBar}
      <div style={titleStyle}>{element.title}</div>
      <div style={bodyStyle}>{element.body}</div>
      <div style={{ marginTop: "auto", height: 6 * s, width: "40%", background: accent }} />
    </div>
  );
}
