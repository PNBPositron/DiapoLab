if (el.type === "shape" || el.type === "container" || el.type === "card") {
  // Detect if the element has glass enabled from editor properties
  const isGlass =
    el.isGlass ||
    el.glassEffect ||
    el.variant === "glass" ||
    el.fill === "glass" ||
    (typeof el.fill === "string" && el.fill.includes("rgba") && el.fill.endsWith(",0)"));

  const glassStyle = isGlass ? getLiquidGlassStyle(true) : {};

  return (
    <div
      style={{
        ...baseStyle,
        ...glassStyle,
        backgroundColor: isGlass ? undefined : el.fill || "#38bdf8",
        borderRadius: `${el.cornerRadius ?? 16}px`,
        borderWidth: isGlass ? undefined : `${el.strokeWidth ?? 0}px`,
        borderColor: isGlass ? undefined : el.stroke || "transparent",
        borderStyle: el.strokeStyle || "solid",
      }}
      onClick={handleClick}
      className="relative overflow-hidden transition-all duration-300"
    >
      {/* Specular liquid sheen streak across the glass */}
      {isGlass && (
        <div
          className="pointer-events-none absolute -inset-full bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-40 -rotate-45"
          aria-hidden="true"
        />
      )}
      {el.content && <div className="relative z-10 p-4">{el.content}</div>}
    </div>
  );
}
