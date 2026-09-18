import { UI_STYLE_THEMES, type UiElement } from "@/store/editor";

export function UiRender({ element, preview = false }: { element: UiElement; preview?: boolean }) {
  const base = UI_STYLE_THEMES[element.uiStyle];
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
  const frameRadius: React.CSSProperties["borderRadius"] =
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

  const shell: React.CSSProperties = {
    width: "100%",
    height: "100%",
    background: t.bg,
    color: t.fg,
    border: frameBorderStyle === "none" ? "none" : `${t.borderWidth}px ${frameBorderStyle} ${t.border}`,
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

  const titleStyle: React.CSSProperties = {
    fontSize: 34 * s,
    fontWeight: 800,
    lineHeight: 1.15,
    textTransform: t.uppercase ? "uppercase" : "none",
  };
  const bodyStyle: React.CSSProperties = { fontSize: 20 * s, lineHeight: 1.4, color: t.muted };

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

  const K = element.kind;

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
        <span style={{ ...titleStyle, fontSize: 30 * s, letterSpacing: t.letterSpacing }}>{element.title}</span>
      </div>
    );
  }

  if (K === "progress") {
    const pct = Math.max(0, Math.min(100, element.value));
    return (
      <div style={{ ...shell, justifyContent: "center" }}>
        {xpTitleBar}
        <div style={{ display: "flex", justifyContent: "space-between", ...bodyStyle, color: t.fg }}>
          <span>{element.body || element.title}</span>
          <span>{pct}%</span>
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
        <div style={{ ...bodyStyle, textTransform: t.uppercase ? "uppercase" : "none" }}>{element.title}</div>
        <div style={{ ...titleStyle, fontSize: 72 * s, color: accent }}>{element.value.toLocaleString()}</div>
        <div style={bodyStyle}>{element.body}</div>
      </div>
    );
  }

  if (K === "quote") {
    return (
      <div style={{ ...shell, justifyContent: "center" }}>
        <div style={{ fontSize: 64 * s, lineHeight: 0.6, color: accent }}>“</div>
        <div style={{ ...titleStyle, fontSize: 28 * s, fontWeight: 600, textTransform: "none" }}>{element.title}</div>
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

  if (K === "list" || K === "pricing") {
    return (
      <div style={shell}>
        {xpTitleBar}
        <div style={titleStyle}>{element.title}</div>
        {K === "pricing" && <div style={{ ...titleStyle, fontSize: 44 * s, color: accent }}>{element.body}</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 * s }}>
          {element.items.map((it, i) => (
            <div key={i} style={{ ...bodyStyle, display: "flex", gap: 10 * s, alignItems: "center", color: t.fg }}>
              <span style={{ color: accent, fontWeight: 800 }}>{element.uiStyle === "cyber" ? "▸" : "✓"}</span>
              {it}
            </div>
          ))}
        </div>
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

  // ---- Real UI chrome components ----
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

  const chromeShell: React.CSSProperties = { ...shell, padding: 0, gap: 0 };
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
  const bar = (label: string, right?: React.ReactNode) => (
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
      <span style={{ flex: 1, textAlign: isXP ? "left" : "center", overflow: "hidden", whiteSpace: "nowrap" }}>{label}</span>
      {right ?? (isXP ? <span style={{ letterSpacing: "0.2em" }}>_ □ ✕</span> : <span style={{ width: 46 * s }} />)}
    </div>
  );
  const field = (text: string, extra: React.CSSProperties = {}) => (
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
        <div style={{ display: "flex", gap: 16 * s, padding: `${8 * s}px ${14 * s}px`, borderBottom: `1px solid ${line}`, fontSize: 14 * s, color: t.muted }}>
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
        <div style={{ display: "flex", alignItems: "center", gap: 10 * s, padding: `${10 * s}px ${14 * s}px`, background: barBg, borderBottom: `${t.borderWidth}px solid ${line}` }}>
          {dots}
          <span style={{ color: barFg, fontSize: 15 * s, opacity: 0.8 }}>◀ ▶ ⟳</span>
          {field(element.body || "https://example.com", { borderRadius: 999 })}
        </div>
        <div style={{ display: "flex", gap: 18 * s, padding: `${10 * s}px ${16 * s}px`, borderBottom: `1px solid ${line}`, fontSize: 15 * s, color: t.muted }}>
          {element.items.map((it, i) => (
            <span key={i} style={i === 0 ? { color: accent, fontWeight: 700 } : undefined}>{it}</span>
          ))}
        </div>
        <div style={{ padding: 20 * s, flex: 1, display: "flex", flexDirection: "column", gap: 10 * s }}>
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
          {timelineItems.map((item, index) => <div key={`${item}-${index}`} style={{ display: "flex", alignItems: "center", flex: 1 }}><div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 * s, minWidth: 0 }}><div style={{ width: 12 * s, height: 12 * s, borderRadius: "50%", background: index / Math.max(1, timelineItems.length - 1) <= element.value / 100 ? element.accentColor : `${element.fgColor ?? "#fff"}55`, border: `2px solid ${element.accentColor}` }} /><span style={{ ...bodyStyle, fontSize: 8 * s, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 72 * s }}>{item}</span></div>{index < timelineItems.length - 1 && <div style={{ height: 2 * s, flex: 1, background: index / Math.max(1, timelineItems.length - 1) < element.value / 100 ? element.accentColor : `${element.fgColor ?? "#fff"}35` }} />}</div>)}
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
        {/* left: only the XP-era bar keeps a labelled Start button */}
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
        {/* centred window/app cluster, Windows 11 style */}
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
          {/* start orb */}
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
                <span key={i} style={{ width: 7 * s, height: 7 * s, background: accent, display: "block", borderRadius: sharp ? 0 : 1.5 * s }} />
              ))}
            </div>
          )}
          {/* search pill */}
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
              <span>⌕</span> Search
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
        {/* system tray + clock */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 * s, fontSize: 14 * s, color: barFg, opacity: 0.92, whiteSpace: "nowrap" }}>
          <span style={{ letterSpacing: "0.12em" }}>∧ ᯤ 🔊 ▮</span>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", lineHeight: 1.1 }}>
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
          <div style={{ display: "flex", alignItems: "center", gap: 8 * s, paddingBottom: 6 * s }}>{dots}</div>
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
              <span style={{ width: 10 * s, height: 10 * s, background: accent, borderRadius: "50%", flexShrink: 0 }} />
              {it}
            </div>
          ))}
          <div style={{ marginTop: "auto", fontSize: 14 * s, color: t.muted }}>+ New tab</div>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 * s, padding: `${10 * s}px ${14 * s}px`, borderBottom: `1px solid ${line}` }}>
            <span style={{ color: t.muted, fontSize: 15 * s }}>◀ ▶ ⟳</span>
            {field(element.body || "https://example.com", { borderRadius: 999 })}
          </div>
          <div style={{ padding: 20 * s, flex: 1, display: "flex", flexDirection: "column", gap: 10 * s }}>
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
      <div style={{ ...shell, flexDirection: "row", alignItems: "center", gap: 12 * s, padding: 16 * s }}>
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
        <div style={{ padding: 16 * s, fontFamily: "'JetBrains Mono', monospace", fontSize: 16 * s, lineHeight: 1.6, color: accent, flex: 1, overflow: "hidden" }}>
          {element.items.map((it, i) => (
            <div key={i} style={{ color: it.startsWith("$") ? accent : t.muted }}>{it}</div>
          ))}
          <div>
            <span style={{ color: accent }}>$ </span>
            {element.body}
            <span style={{ background: accent, marginLeft: 2 * s, display: "inline-block", width: 9 * s, height: 16 * s, verticalAlign: "middle" }} />
          </div>
        </div>
      </div>
    );
  }

  if (K === "phone") {
    return (
      <div style={{ ...chromeShell, borderRadius: sharp ? 0 : 36 * s, borderWidth: Math.max(4, t.borderWidth * 2) }}>
        <div style={{ display: "flex", justifyContent: "space-between", padding: `${10 * s}px ${18 * s}px`, fontSize: 13 * s, color: t.muted, flexShrink: 0 }}>
          <span>9:41</span>
          <span>▮▮▮ ▮</span>
        </div>
        <div style={{ padding: `${6 * s}px ${18 * s}px`, ...titleStyle, fontSize: 26 * s }}>{element.title}</div>
        <div style={{ padding: `0 ${18 * s}px`, ...bodyStyle, fontSize: 16 * s }}>{element.body}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 * s, padding: 18 * s, flex: 1 }}>
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
          <div style={{ marginTop: "auto", height: 6 * s, width: "40%", alignSelf: "center", background: t.muted, borderRadius: 999 }} />
        </div>
      </div>
    );
  }

  if (K === "modal") {
    return (
      <div style={{ ...chromeShell }}>
        {bar(element.title || "Confirm")}
        <div style={{ padding: 22 * s, ...bodyStyle, color: t.fg, flex: 1 }}>{element.body}</div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 * s, padding: 16 * s, borderTop: `1px solid ${line}` }}>
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

  if (K === "tabs") {
    return (
      <div style={chromeShell}>
        <div style={{ display: "flex", flexShrink: 0 }}>
          {element.items.map((it, i) => (
            <span
              key={i}
              style={{
                padding: `${12 * s}px ${18 * s}px`,
                fontSize: 16 * s,
                fontWeight: 700,
                borderBottom: `${3 * s}px solid ${i === 0 ? accent : "transparent"}`,
                color: i === 0 ? accent : t.muted,
                background: i === 0 ? softFill : "transparent",
              }}
            >
              {it}
            </span>
          ))}
        </div>
        <div style={{ padding: 20 * s, flex: 1, display: "flex", flexDirection: "column", gap: 10 * s, borderTop: `1px solid ${line}` }}>
          <div style={{ ...titleStyle, fontSize: 26 * s }}>{element.title}</div>
          <div style={bodyStyle}>{element.body}</div>
        </div>
      </div>
    );
  }

  if (K === "toggle") {
    return (
      <div style={shell}>
        <div style={titleStyle}>{element.title}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 * s }}>
          {element.items.map((it, i) => {
            const on = i % 2 === 0;
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", ...bodyStyle, color: t.fg }}>
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
                  }}
                >
                  <span style={{ width: 22 * s, height: 22 * s, borderRadius: sharp ? 0 : "50%", background: "#fff" }} />
                </span>
              </div>
            );
          })}
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
          <div key={i} style={{ display: "flex" }}>{field(it)}</div>
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
          Continue
        </div>
      </div>
    );
  }

  if (K === "notification") {
    return (
      <div style={{ ...shell, flexDirection: "row", alignItems: "center", gap: 14 * s, padding: 18 * s }}>
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

  if (K === "kdePanel") {
    return (
      <div
        style={{
          ...shell,
          flexDirection: "row",
          alignItems: "center",
          gap: 10 * s,
          padding: `${8 * s}px ${12 * s}px`,
        }}
      >
        <span
          style={{
            display: "grid",
            placeItems: "center",
            width: 46 * s,
            height: 46 * s,
            flexShrink: 0,
            background: accent,
            color: onAccent,
            borderRadius: sharp ? 0 : 8 * s,
            fontSize: 20 * s,
            fontWeight: 800,
          }}
        >
          ⬢
        </span>
        {element.items.slice(0, 5).map((it, i) => (
          <span
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8 * s,
              padding: `${8 * s}px ${12 * s}px`,
              fontSize: 17 * s,
              color: t.fg,
              background: i === 0 ? softFill : "transparent",
              borderBottom: i === 0 ? `${3 * s}px solid ${accent}` : `${3 * s}px solid transparent`,
              borderRadius: sharp ? 0 : 6 * s,
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ width: 18 * s, height: 18 * s, borderRadius: sharp ? 0 : 4 * s, background: accent, opacity: 0.85 }} />
            {it}
          </span>
        ))}
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 * s, fontSize: 17 * s, color: t.muted }}>
          <span>▲</span>
          <span>🔊</span>
          <span>🔋</span>
          <span style={{ color: t.fg, fontWeight: 700 }}>{element.body}</span>
        </span>
      </div>
    );
  }

  if (K === "kdeFiles") {
    const files = ["report.pdf", "notes.md", "photo.png", "budget.ods", "draft.txt", "archive.zip"];
    return (
      <div style={{ ...shell, padding: 0, gap: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10 * s,
            padding: `${10 * s}px ${14 * s}px`,
            borderBottom: `${Math.max(1, t.borderWidth - 1)}px solid ${line}`,
            background: softFill,
            fontSize: 17 * s,
          }}
        >
          <span style={{ color: t.muted }}>←  →  ↑</span>
          <span
            style={{
              flex: 1,
              padding: `${6 * s}px ${10 * s}px`,
              background: t.dark ? "rgba(0,0,0,0.3)" : "#fff",
              border: `${Math.max(1, t.borderWidth - 1)}px solid ${line}`,
              borderRadius: sharp ? 0 : 6 * s,
              color: t.fg,
              overflow: "hidden",
              whiteSpace: "nowrap",
            }}
          >
            {element.body}
          </span>
          <span style={{ color: t.muted }}>⌕</span>
        </div>
        <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
          <div
            style={{
              width: "30%",
              borderRight: `${Math.max(1, t.borderWidth - 1)}px solid ${line}`,
              padding: 10 * s,
              display: "flex",
              flexDirection: "column",
              gap: 4 * s,
              background: t.dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
            }}
          >
            {element.items.map((it, i) => (
              <span
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8 * s,
                  padding: `${7 * s}px ${9 * s}px`,
                  fontSize: 16 * s,
                  borderRadius: sharp ? 0 : 6 * s,
                  background: i === 2 ? accent : "transparent",
                  color: i === 2 ? onAccent : t.fg,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                }}
              >
                <span style={{ width: 14 * s, height: 14 * s, borderRadius: sharp ? 0 : 3 * s, background: i === 2 ? onAccent : accent, opacity: 0.8 }} />
                {it}
              </span>
            ))}
          </div>
          <div
            style={{
              flex: 1,
              padding: 14 * s,
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 12 * s,
              alignContent: "start",
            }}
          >
            {files.map((f, i) => (
              <span key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 * s }}>
                <span
                  style={{
                    width: "70%",
                    aspectRatio: "3 / 4",
                    background: i % 2 ? softFill : accent,
                    opacity: i % 2 ? 1 : 0.85,
                    borderRadius: sharp ? 0 : 6 * s,
                    border: `${Math.max(1, t.borderWidth - 1)}px solid ${line}`,
                  }}
                />
                <span style={{ fontSize: 14 * s, color: t.muted, whiteSpace: "nowrap", overflow: "hidden" }}>{f}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (K === "kdeRunner") {
    return (
      <div style={{ ...shell, padding: 0, gap: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 * s, padding: 18 * s }}>
          <span style={{ fontSize: 24 * s, color: accent }}>⌕</span>
          <span style={{ flex: 1, fontSize: 26 * s, fontWeight: 600, color: t.fg }}>
            {element.title}
            <span style={{ opacity: 0.6 }}>|</span>
          </span>
          <span style={{ fontSize: 14 * s, color: t.muted, letterSpacing: "0.12em" }}>{element.body}</span>
        </div>
        <div style={{ borderTop: `${Math.max(1, t.borderWidth - 1)}px solid ${line}`, padding: 8 * s, display: "flex", flexDirection: "column", gap: 4 * s }}>
          {element.items.map((it, i) => (
            <span
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12 * s,
                padding: `${10 * s}px ${12 * s}px`,
                fontSize: 17 * s,
                borderRadius: sharp ? 0 : 8 * s,
                background: i === 0 ? accent : "transparent",
                color: i === 0 ? onAccent : t.fg,
                whiteSpace: "nowrap",
                overflow: "hidden",
              }}
            >
              <span
                style={{
                  width: 26 * s,
                  height: 26 * s,
                  flexShrink: 0,
                  borderRadius: sharp ? 0 : 6 * s,
                  background: i === 0 ? onAccent : softFill,
                  opacity: 0.85,
                }}
              />
              {it}
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (K === "kdeSettings") {
    const rows = ["Global Theme", "Plasma Style", "Colors", "Icons", "Cursors"];
    return (
      <div style={{ ...shell, padding: 0, gap: 0, flexDirection: "row" }}>
        <div
          style={{
            width: "32%",
            padding: 12 * s,
            display: "flex",
            flexDirection: "column",
            gap: 4 * s,
            borderRight: `${Math.max(1, t.borderWidth - 1)}px solid ${line}`,
            background: t.dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
          }}
        >
          <span style={{ ...titleStyle, fontSize: 19 * s, marginBottom: 6 * s }}>{element.title}</span>
          {element.items.map((it, i) => (
            <span
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8 * s,
                padding: `${8 * s}px ${10 * s}px`,
                fontSize: 16 * s,
                borderRadius: sharp ? 0 : 6 * s,
                background: i === 0 ? accent : "transparent",
                color: i === 0 ? onAccent : t.fg,
                whiteSpace: "nowrap",
                overflow: "hidden",
              }}
            >
              <span style={{ width: 16 * s, height: 16 * s, borderRadius: sharp ? 0 : 4 * s, background: i === 0 ? onAccent : accent, opacity: 0.8 }} />
              {it}
            </span>
          ))}
        </div>
        <div style={{ flex: 1, padding: 16 * s, display: "flex", flexDirection: "column", gap: 12 * s, minWidth: 0 }}>
          <span style={{ ...titleStyle, fontSize: 24 * s }}>{element.body}</span>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 * s }}>
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                style={{
                  height: 62 * s,
                  borderRadius: sharp ? 0 : 8 * s,
                  border: `${i === 0 ? 3 * s : Math.max(1, t.borderWidth - 1)}px solid ${i === 0 ? accent : line}`,
                  background: i === 0 ? accent : softFill,
                  opacity: i === 0 ? 0.9 : 1,
                }}
              />
            ))}
          </div>
          {rows.map((r, i) => (
            <span
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: 16 * s,
                color: t.fg,
                paddingBottom: 8 * s,
                borderBottom: `${Math.max(1, t.borderWidth - 1)}px solid ${line}`,
              }}
            >
              {r}
              <span
                style={{
                  width: 44 * s,
                  height: 22 * s,
                  borderRadius: 999,
                  background: i % 2 === 0 ? accent : softFill,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: i % 2 === 0 ? "flex-end" : "flex-start",
                  padding: 3 * s,
                  boxSizing: "border-box",
                }}
              >
                <span style={{ width: 16 * s, height: 16 * s, borderRadius: "50%", background: "#fff" }} />
              </span>
            </span>
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
