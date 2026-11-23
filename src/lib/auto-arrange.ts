import type { AnyElement } from "@/store/editor";

export type ArrangeMode = "smart" | "grid" | "row" | "column" | "align-tidy";
export type ArrangeAlign = "start" | "center" | "end";
export type ArrangeAnchor = "canvas" | "selection";

export interface ArrangeOptions {
  mode: ArrangeMode;
  gap: number;
  margin: number;
  align: ArrangeAlign;
  anchor: ArrangeAnchor;
  keepInBounds: boolean;
  allowResize: boolean;
}

export const DEFAULT_ARRANGE_OPTIONS: ArrangeOptions = {
  mode: "smart",
  gap: 32,
  margin: 80,
  align: "center",
  anchor: "canvas",
  keepInBounds: true,
  allowResize: true,
};

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface ItemBox {
  id: string;
  el: AnyElement;
  origIndex: number;
  width: number;
  height: number;
  aabbW: number;
  aabbH: number;
  left: number;
  top: number;
  scale: number;
}

export function getElementAabb(el: Pick<AnyElement, "x" | "y" | "width" | "height" | "rotation">) {
  const rad = ((el.rotation ?? 0) * Math.PI) / 180;
  const c = Math.abs(Math.cos(rad));
  const s = Math.abs(Math.sin(rad));
  const aabbW = Math.max(8, el.width * c + el.height * s);
  const aabbH = Math.max(8, el.width * s + el.height * c);
  const cx = el.x + el.width / 2;
  const cy = el.y + el.height / 2;
  return {
    left: cx - aabbW / 2,
    top: cy - aabbH / 2,
    aabbW,
    aabbH,
  };
}

function getAabbSize(width: number, height: number, rotation = 0) {
  const rad = (rotation * Math.PI) / 180;
  const c = Math.abs(Math.cos(rad));
  const s = Math.abs(Math.sin(rad));
  return {
    aabbW: Math.max(8, width * c + height * s),
    aabbH: Math.max(8, width * s + height * c),
  };
}

function toItemBoxes(elements: AnyElement[]): ItemBox[] {
  return elements.map((el, origIndex) => {
    const aabb = getElementAabb(el);
    return {
      id: el.id,
      el,
      origIndex,
      width: Math.max(8, el.width),
      height: Math.max(8, el.height),
      aabbW: aabb.aabbW,
      aabbH: aabb.aabbH,
      left: aabb.left,
      top: aabb.top,
      scale: 1,
    };
  });
}

function scaleBox(box: ItemBox, factor: number) {
  if (factor >= 0.999 || factor <= 0) return;
  const clamped = Math.max(0.15, factor);
  box.scale *= clamped;
  box.width = Math.max(8, box.width * clamped);
  box.height = Math.max(8, box.height * clamped);
  const next = getAabbSize(box.width, box.height, box.el.rotation);
  box.aabbW = next.aabbW;
  box.aabbH = next.aabbH;
}

function boxesOverlap(a: { left: number; top: number; aabbW: number; aabbH: number }, b: { left: number; top: number; aabbW: number; aabbH: number }, minGap = 0): boolean {
  return (
    a.left < b.left + b.aabbW + minGap - 0.01 &&
    a.left + a.aabbW + minGap - 0.01 > b.left &&
    a.top < b.top + b.aabbH + minGap - 0.01 &&
    a.top + a.aabbH + minGap - 0.01 > b.top
  );
}

/** Counts how many pairs of elements currently have overlapping axis-aligned bounds. */
export function countElementOverlaps(elements: AnyElement[]): number {
  const aabbs = elements.map((e) => getElementAabb(e));
  let overlaps = 0;
  for (let i = 0; i < aabbs.length; i++) {
    for (let j = i + 1; j < aabbs.length; j++) {
      if (boxesOverlap(aabbs[i], aabbs[j], 0)) overlaps++;
    }
  }
  return overlaps;
}

function sortReadingOrder(boxes: ItemBox[]): ItemBox[] {
  const byY = [...boxes].sort((a, b) => a.top + a.aabbH / 2 - (b.top + b.aabbH / 2) || a.left - b.left);
  const rows: ItemBox[][] = [];
  for (const b of byY) {
    const cy = b.top + b.aabbH / 2;
    const lastRow = rows[rows.length - 1];
    if (!lastRow) {
      rows.push([b]);
      continue;
    }
    const avgRowCy =
      lastRow.reduce((sum, item) => sum + item.top + item.aabbH / 2, 0) / lastRow.length;
    const avgRowH = lastRow.reduce((sum, item) => sum + item.aabbH, 0) / lastRow.length;
    const threshold = Math.max(24, Math.min(avgRowH, b.aabbH) * 0.5);
    if (Math.abs(cy - avgRowCy) <= threshold) {
      lastRow.push(b);
    } else {
      rows.push([b]);
    }
  }
  return rows.flatMap((row) =>
    row.sort((a, b) => a.left + a.aabbW / 2 - (b.left + b.aabbW / 2) || a.top - b.top),
  );
}

function computeTargetRegion(
  boxes: ItemBox[],
  canvasW: number,
  canvasH: number,
  options: ArrangeOptions,
): Rect {
  const safeMargin = Math.max(0, Math.min(options.margin, Math.floor(Math.min(canvasW, canvasH) * 0.35)));
  const canvasRegion: Rect = {
    x: safeMargin,
    y: safeMargin,
    w: Math.max(120, canvasW - safeMargin * 2),
    h: Math.max(120, canvasH - safeMargin * 2),
  };
  if (options.anchor === "canvas") return canvasRegion;

  const minX = Math.min(...boxes.map((b) => b.left));
  const minY = Math.min(...boxes.map((b) => b.top));
  const maxX = Math.max(...boxes.map((b) => b.left + b.aabbW));
  const maxY = Math.max(...boxes.map((b) => b.top + b.aabbH));
  const selW = Math.max(160, maxX - minX);
  const selH = Math.max(120, maxY - minY);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  const w = options.keepInBounds ? Math.min(canvasRegion.w, Math.max(selW, Math.min(canvasRegion.w, selW * 1.15))) : selW;
  const h = options.keepInBounds ? Math.min(canvasRegion.h, Math.max(selH, Math.min(canvasRegion.h, selH * 1.15))) : selH;
  let x = cx - w / 2;
  let y = cy - h / 2;
  if (options.keepInBounds) {
    x = Math.max(canvasRegion.x, Math.min(canvasRegion.x + canvasRegion.w - w, x));
    y = Math.max(canvasRegion.y, Math.min(canvasRegion.y + canvasRegion.h - h, y));
  }
  return { x, y, w, h };
}

function clampRegionOffset(
  totalW: number,
  totalH: number,
  region: Rect,
  align: ArrangeAlign,
  canvasW: number,
  canvasH: number,
  margin: number,
  keepInBounds: boolean,
): { ox: number; oy: number } {
  let ox =
    align === "start"
      ? region.x
      : align === "end"
        ? region.x + region.w - totalW
        : region.x + (region.w - totalW) / 2;
  let oy =
    align === "start"
      ? region.y
      : align === "end"
        ? region.y + region.h - totalH
        : region.y + (region.h - totalH) / 2;

  if (keepInBounds) {
    const safeM = Math.max(0, Math.min(margin, Math.floor(Math.min(canvasW, canvasH) * 0.35)));
    if (totalW <= canvasW - safeM * 2) {
      ox = Math.max(safeM, Math.min(canvasW - safeM - totalW, ox));
    } else {
      ox = (canvasW - totalW) / 2;
    }
    if (totalH <= canvasH - safeM * 2) {
      oy = Math.max(safeM, Math.min(canvasH - safeM - totalH, oy));
    } else {
      oy = (canvasH - totalH) / 2;
    }
  }
  return { ox, oy };
}

function layoutGrid(boxes: ItemBox[], region: Rect, canvasW: number, canvasH: number, options: ArrangeOptions) {
  const ordered = sortReadingOrder(boxes);
  const n = ordered.length;
  const gap = Math.max(0, options.gap);

  const avgAspect =
    ordered.reduce((sum, b) => sum + b.aabbW / Math.max(1, b.aabbH), 0) / Math.max(1, n);
  const regionAspect = region.w / Math.max(1, region.h);

  let bestCols = 1;
  let bestScore = -Infinity;

  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols);
    const cellW = Math.max(16, (region.w - gap * (cols - 1)) / cols);
    const cellH = Math.max(16, (region.h - gap * (rows - 1)) / rows);

    let scaleSum = 0;
    let minScale = 1;
    for (const b of ordered) {
      const s = Math.min(1, cellW / b.aabbW, cellH / b.aabbH);
      scaleSum += s;
      minScale = Math.min(minScale, s);
    }
    const avgScale = scaleSum / n;
    const emptyCells = cols * rows - n;
    const emptyPenalty = (emptyCells / (cols * rows)) * 0.22;
    const gridAspect = (cols * avgAspect) / rows;
    const aspectPenalty = Math.abs(Math.log(Math.max(0.1, gridAspect / regionAspect))) * 0.14;
    // Slight preference for multi-column over a giant 1-col stack on wide slides when n >= 3
    const singleTrackPenalty = n >= 3 && (cols === 1 || rows === 1) && n > 4 ? 0.15 : 0;

    const score = avgScale * 2.2 + minScale * 0.8 - emptyPenalty - aspectPenalty - singleTrackPenalty;
    if (score > bestScore) {
      bestScore = score;
      bestCols = cols;
    }
  }

  const cols = bestCols;
  const rows = Math.ceil(n / cols);
  const cellW = Math.max(16, (region.w - gap * (cols - 1)) / cols);
  const cellH = Math.max(16, (region.h - gap * (rows - 1)) / rows);

  if (options.allowResize) {
    for (const b of ordered) {
      if (b.aabbW > cellW || b.aabbH > cellH) {
        scaleBox(b, Math.min(cellW / b.aabbW, cellH / b.aabbH));
      }
    }
  }

  const colWidths = Array.from({ length: cols }, () => 0);
  const rowHeights = Array.from({ length: rows }, () => 0);
  ordered.forEach((b, idx) => {
    const r = Math.floor(idx / cols);
    const c = idx % cols;
    colWidths[c] = Math.max(colWidths[c], b.aabbW);
    rowHeights[r] = Math.max(rowHeights[r], b.aabbH);
  });

  const totalW = colWidths.reduce((s, v) => s + v, 0) + gap * (cols - 1);
  const totalH = rowHeights.reduce((s, v) => s + v, 0) + gap * (rows - 1);
  const { ox, oy } = clampRegionOffset(
    totalW,
    totalH,
    region,
    options.align,
    canvasW,
    canvasH,
    options.margin,
    options.keepInBounds,
  );

  const colOffsets: number[] = [];
  let cx = ox;
  for (let c = 0; c < cols; c++) {
    colOffsets.push(cx);
    cx += colWidths[c] + gap;
  }

  const rowOffsets: number[] = [];
  let cy = oy;
  for (let r = 0; r < rows; r++) {
    rowOffsets.push(cy);
    cy += rowHeights[r] + gap;
  }

  ordered.forEach((b, idx) => {
    const r = Math.floor(idx / cols);
    const c = idx % cols;
    const cw = colWidths[c];
    const ch = rowHeights[r];
    const rx = colOffsets[c];
    const ry = rowOffsets[r];

    b.left =
      options.align === "start"
        ? rx
        : options.align === "end"
          ? rx + cw - b.aabbW
          : rx + (cw - b.aabbW) / 2;
    b.top =
      options.align === "start"
        ? ry
        : options.align === "end"
          ? ry + ch - b.aabbH
          : ry + (ch - b.aabbH) / 2;
  });
}

function packIntoShelves(ordered: ItemBox[], maxWidth: number, gap: number): ItemBox[][] {
  const shelves: ItemBox[][] = [];
  let current: ItemBox[] = [];
  let currentW = 0;

  for (const b of ordered) {
    const needed = current.length === 0 ? b.aabbW : currentW + gap + b.aabbW;
    if (current.length > 0 && needed > maxWidth) {
      shelves.push(current);
      current = [b];
      currentW = b.aabbW;
    } else {
      current.push(b);
      currentW = needed;
    }
  }
  if (current.length > 0) shelves.push(current);
  return shelves;
}

function layoutShelves(
  ordered: ItemBox[],
  region: Rect,
  canvasW: number,
  canvasH: number,
  options: ArrangeOptions,
  forceSingleTrackIfClose = false,
) {
  const gap = Math.max(0, options.gap);
  const n = ordered.length;

  if (options.allowResize) {
    for (const b of ordered) {
      if (b.aabbW > region.w || b.aabbH > region.h) {
        scaleBox(b, Math.min(region.w / b.aabbW, region.h / b.aabbH));
      }
    }
  }

  const singleW = ordered.reduce((s, b) => s + b.aabbW, 0) + gap * (n - 1);
  let shelves: ItemBox[][];

  if (singleW <= region.w) {
    shelves = [ordered];
  } else if (forceSingleTrackIfClose && options.allowResize && n <= 5 && region.w / singleW >= 0.55) {
    const scale = (region.w - gap * (n - 1)) / ordered.reduce((s, b) => s + b.aabbW, 0);
    for (const b of ordered) scaleBox(b, scale);
    shelves = [ordered];
  } else {
    shelves = packIntoShelves(ordered, region.w, gap);
    // Balance rows slightly so the last row doesn't have an awkward single trailing item when avoidable
    if (shelves.length > 1) {
      const targetW = Math.min(region.w, Math.ceil(singleW / shelves.length) + 12);
      const balanced = packIntoShelves(ordered, targetW, gap);
      if (balanced.length <= shelves.length) {
        shelves = balanced;
      }
    }
  }

  // If total height of shelves overflows region.h and allowResize is on, scale down cleanly
  const measureShelves = () => {
    const rowH = shelves.map((row) => Math.max(...row.map((b) => b.aabbH)));
    const rowW = shelves.map((row) => row.reduce((s, b) => s + b.aabbW, 0) + gap * (row.length - 1));
    const totalH = rowH.reduce((s, v) => s + v, 0) + gap * Math.max(0, shelves.length - 1);
    const totalW = Math.max(...rowW, 0);
    return { rowH, rowW, totalW, totalH };
  };

  let stats = measureShelves();
  if (options.allowResize && stats.totalH > region.h) {
    const availH = Math.max(24, region.h - gap * Math.max(0, shelves.length - 1));
    const curSumH = stats.rowH.reduce((s, v) => s + v, 0);
    const sy = availH / Math.max(1, curSumH);
    for (const b of ordered) scaleBox(b, sy);
    stats = measureShelves();
  }

  const { ox, oy } = clampRegionOffset(
    stats.totalW,
    stats.totalH,
    region,
    options.align,
    canvasW,
    canvasH,
    options.margin,
    options.keepInBounds,
  );

  let curY = oy;
  shelves.forEach((row, rIdx) => {
    const rh = stats.rowH[rIdx];
    const rw = stats.rowW[rIdx];
    let curX =
      options.align === "start"
        ? ox
        : options.align === "end"
          ? ox + stats.totalW - rw
          : ox + (stats.totalW - rw) / 2;

    for (const b of row) {
      b.left = curX;
      b.top =
        options.align === "start"
          ? curY
          : options.align === "end"
            ? curY + rh - b.aabbH
            : curY + (rh - b.aabbH) / 2;
      curX += b.aabbW + gap;
    }
    curY += rh + gap;
  });
}

function layoutRow(boxes: ItemBox[], region: Rect, canvasW: number, canvasH: number, options: ArrangeOptions) {
  const ordered = [...boxes].sort(
    (a, b) => a.left + a.aabbW / 2 - (b.left + b.aabbW / 2) || a.top - b.top,
  );
  layoutShelves(ordered, region, canvasW, canvasH, options, true);
}

function layoutColumn(boxes: ItemBox[], region: Rect, canvasW: number, canvasH: number, options: ArrangeOptions) {
  // Transpose into shelf layout along vertical axis, then transpose back!
  const ordered = [...boxes].sort(
    (a, b) => a.top + a.aabbH / 2 - (b.top + b.aabbH / 2) || a.left - b.left,
  );
  const gap = Math.max(0, options.gap);
  const n = ordered.length;

  if (options.allowResize) {
    for (const b of ordered) {
      if (b.aabbW > region.w || b.aabbH > region.h) {
        scaleBox(b, Math.min(region.w / b.aabbW, region.h / b.aabbH));
      }
    }
  }

  const singleH = ordered.reduce((s, b) => s + b.aabbH, 0) + gap * (n - 1);
  let cols: ItemBox[][] = [];

  const packCols = (maxColH: number) => {
    const result: ItemBox[][] = [];
    let current: ItemBox[] = [];
    let curH = 0;
    for (const b of ordered) {
      const needed = current.length === 0 ? b.aabbH : curH + gap + b.aabbH;
      if (current.length > 0 && needed > maxColH) {
        result.push(current);
        current = [b];
        curH = b.aabbH;
      } else {
        current.push(b);
        curH = needed;
      }
    }
    if (current.length > 0) result.push(current);
    return result;
  };

  if (singleH <= region.h) {
    cols = [ordered];
  } else if (options.allowResize && n <= 5 && region.h / singleH >= 0.55) {
    const scale = (region.h - gap * (n - 1)) / ordered.reduce((s, b) => s + b.aabbH, 0);
    for (const b of ordered) scaleBox(b, scale);
    cols = [ordered];
  } else {
    cols = packCols(region.h);
    if (cols.length > 1) {
      const targetH = Math.min(region.h, Math.ceil(singleH / cols.length) + 12);
      const balanced = packCols(targetH);
      if (balanced.length <= cols.length) cols = balanced;
    }
  }

  const measureCols = () => {
    const colW = cols.map((col) => Math.max(...col.map((b) => b.aabbW)));
    const colH = cols.map((col) => col.reduce((s, b) => s + b.aabbH, 0) + gap * (col.length - 1));
    const totalW = colW.reduce((s, v) => s + v, 0) + gap * Math.max(0, cols.length - 1);
    const totalH = Math.max(...colH, 0);
    return { colW, colH, totalW, totalH };
  };

  let stats = measureCols();
  if (options.allowResize && stats.totalW > region.w) {
    const availW = Math.max(24, region.w - gap * Math.max(0, cols.length - 1));
    const curSumW = stats.colW.reduce((s, v) => s + v, 0);
    const sx = availW / Math.max(1, curSumW);
    for (const b of ordered) scaleBox(b, sx);
    stats = measureCols();
  }

  const { ox, oy } = clampRegionOffset(
    stats.totalW,
    stats.totalH,
    region,
    options.align,
    canvasW,
    canvasH,
    options.margin,
    options.keepInBounds,
  );

  let curX = ox;
  cols.forEach((col, cIdx) => {
    const cw = stats.colW[cIdx];
    const ch = stats.colH[cIdx];
    let curY =
      options.align === "start"
        ? oy
        : options.align === "end"
          ? oy + stats.totalH - ch
          : oy + (stats.totalH - ch) / 2;

    for (const b of col) {
      b.top = curY;
      b.left =
        options.align === "start"
          ? curX
          : options.align === "end"
            ? curX + cw - b.aabbW
            : curX + (cw - b.aabbW) / 2;
      curY += b.aabbH + gap;
    }
    curX += cw + gap;
  });
}

function snapAxis(values: number[], threshold: number): number[] {
  const indexed = values.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const out = [...values];
  let cluster: typeof indexed = [];

  const flush = () => {
    if (cluster.length < 2) return;
    const avg = cluster.reduce((s, p) => s + p.v, 0) / cluster.length;
    for (const p of cluster) out[p.i] = avg;
  };

  for (const item of indexed) {
    if (cluster.length === 0 || Math.abs(item.v - cluster[cluster.length - 1].v) <= threshold) {
      cluster.push(item);
    } else {
      flush();
      cluster = [item];
    }
  }
  flush();
  return out;
}

function resolveCollisions(
  boxes: ItemBox[],
  minGap: number,
  bounds: Rect,
  keepInBounds: boolean,
  maxPasses = 90,
): boolean {
  const clampBox = (b: ItemBox) => {
    if (!keepInBounds) return;
    if (b.aabbW <= bounds.w) {
      b.left = Math.max(bounds.x, Math.min(bounds.x + bounds.w - b.aabbW, b.left));
    } else {
      b.left = bounds.x + (bounds.w - b.aabbW) / 2;
    }
    if (b.aabbH <= bounds.h) {
      b.top = Math.max(bounds.y, Math.min(bounds.y + bounds.h - b.aabbH, b.top));
    } else {
      b.top = bounds.y + (bounds.h - b.aabbH) / 2;
    }
  };

  for (const b of boxes) clampBox(b);

  for (let pass = 0; pass < maxPasses; pass++) {
    let moved = false;
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i];
        const b = boxes[j];
        const acx = a.left + a.aabbW / 2;
        const acy = a.top + a.aabbH / 2;
        const bcx = b.left + b.aabbW / 2;
        const bcy = b.top + b.aabbH / 2;

        const dx = bcx - acx;
        const dy = bcy - acy;
        const reqX = (a.aabbW + b.aabbW) / 2 + minGap;
        const reqY = (a.aabbH + b.aabbH) / 2 + minGap;
        const overlapX = reqX - Math.abs(dx);
        const overlapY = reqY - Math.abs(dy);

        if (overlapX > 0.05 && overlapY > 0.05) {
          moved = true;
          if (overlapX <= overlapY) {
            const dir = dx === 0 ? (i < j ? -1 : 1) : Math.sign(dx);
            const push = overlapX / 2 + 0.5;
            a.left -= dir * push;
            b.left += dir * push;
          } else {
            const dir = dy === 0 ? (i < j ? -1 : 1) : Math.sign(dy);
            const push = overlapY / 2 + 0.5;
            a.top -= dir * push;
            b.top += dir * push;
          }
          clampBox(a);
          clampBox(b);
        }
      }
    }
    if (!moved) return true;
  }

  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      if (boxesOverlap(boxes[i], boxes[j], 0)) return false;
    }
  }
  return true;
}

function layoutAlignTidy(boxes: ItemBox[], region: Rect, canvasW: number, canvasH: number, options: ArrangeOptions) {
  const safeMargin = Math.max(0, Math.min(options.margin, Math.floor(Math.min(canvasW, canvasH) * 0.35)));
  const bounds: Rect =
    options.anchor === "canvas"
      ? {
          x: safeMargin,
          y: safeMargin,
          w: Math.max(120, canvasW - safeMargin * 2),
          h: Math.max(120, canvasH - safeMargin * 2),
        }
      : region;

  const snapThresh = Math.max(24, options.gap);
  const xKeys = boxes.map((b) =>
    options.align === "start" ? b.left : options.align === "end" ? b.left + b.aabbW : b.left + b.aabbW / 2,
  );
  const yKeys = boxes.map((b) =>
    options.align === "start" ? b.top : options.align === "end" ? b.top + b.aabbH : b.top + b.aabbH / 2,
  );
  const snappedX = snapAxis(xKeys, snapThresh);
  const snappedY = snapAxis(yKeys, snapThresh);

  boxes.forEach((b, idx) => {
    b.left =
      options.align === "start"
        ? snappedX[idx]
        : options.align === "end"
          ? snappedX[idx] - b.aabbW
          : snappedX[idx] - b.aabbW / 2;
    b.top =
      options.align === "start"
        ? snappedY[idx]
        : options.align === "end"
          ? snappedY[idx] - b.aabbH
          : snappedY[idx] - b.aabbH / 2;
  });

  const gap = Math.max(0, options.gap);
  let clean = resolveCollisions(boxes, gap, bounds, options.keepInBounds);

  if (!clean && options.allowResize) {
    for (let shrinkRound = 0; shrinkRound < 6 && !clean; shrinkRound++) {
      for (const b of boxes) scaleBox(b, 0.86);
      clean = resolveCollisions(boxes, gap, bounds, options.keepInBounds);
    }
  }

  // Final guaranteed de-overlap even if bounds were impossibly tight with allowResize=false
  if (!clean) {
    resolveCollisions(boxes, Math.max(8, Math.min(gap, 24)), bounds, false, 120);
  }
}

function layoutSmart(boxes: ItemBox[], region: Rect, canvasW: number, canvasH: number, options: ArrangeOptions) {
  const n = boxes.length;
  const gap = Math.max(0, options.gap);

  const cxs = boxes.map((b) => b.left + b.aabbW / 2);
  const cys = boxes.map((b) => b.top + b.aabbH / 2);
  const spreadX = Math.max(...cxs) - Math.min(...cxs);
  const spreadY = Math.max(...cys) - Math.min(...cys);

  const widths = boxes.map((b) => b.aabbW);
  const heights = boxes.map((b) => b.aabbH);
  const minW = Math.min(...widths);
  const maxW = Math.max(...widths);
  const minH = Math.min(...heights);
  const maxH = Math.max(...heights);

  const sumW = widths.reduce((s, v) => s + v, 0) + gap * (n - 1);
  const sumH = heights.reduce((s, v) => s + v, 0) + gap * (n - 1);

  if (n <= 5 && sumW <= region.w && (spreadX > spreadY * 1.35 || (n <= 3 && maxH >= maxW * 0.8))) {
    layoutRow(boxes, region, canvasW, canvasH, options);
    return;
  }

  if (n <= 5 && sumH <= region.h && spreadY > spreadX * 1.35) {
    layoutColumn(boxes, region, canvasW, canvasH, options);
    return;
  }

  if (n >= 3 && (maxW / Math.max(1, minW) > 2.0 || maxH / Math.max(1, minH) > 2.0)) {
    layoutShelves(sortReadingOrder(boxes), region, canvasW, canvasH, options, false);
    return;
  }

  layoutGrid(boxes, region, canvasW, canvasH, options);
}

/**
 * Computes non-overlapping element patches for `elements` inside a `canvasW × canvasH` slide.
 */
export function computeAutoArrange(
  elements: AnyElement[],
  canvasW: number,
  canvasH: number,
  partialOptions?: Partial<ArrangeOptions>,
): Map<string, Partial<AnyElement>> {
  const patches = new Map<string, Partial<AnyElement>>();
  if (elements.length < 2) return patches;

  const options: ArrangeOptions = { ...DEFAULT_ARRANGE_OPTIONS, ...partialOptions };
  const boxes = toItemBoxes(elements);
  const region = computeTargetRegion(boxes, canvasW, canvasH, options);

  switch (options.mode) {
    case "row":
      layoutRow(boxes, region, canvasW, canvasH, options);
      break;
    case "column":
      layoutColumn(boxes, region, canvasW, canvasH, options);
      break;
    case "grid":
      layoutGrid(boxes, region, canvasW, canvasH, options);
      break;
    case "align-tidy":
      layoutAlignTidy(boxes, region, canvasW, canvasH, options);
      break;
    case "smart":
    default:
      layoutSmart(boxes, region, canvasW, canvasH, options);
      break;
  }

  // Round to integers and guard against any 1px rounding graze
  const rounded = boxes.map((b) => {
    const rw = Math.max(8, Math.round(b.width));
    const rh = Math.max(8, Math.round(b.height));
    const rx = Math.round(b.left + (b.aabbW - rw) / 2);
    const ry = Math.round(b.top + (b.aabbH - rh) / 2);
    const aabb = getElementAabb({ x: rx, y: ry, width: rw, height: rh, rotation: b.el.rotation });
    return {
      box: b,
      x: rx,
      y: ry,
      width: rw,
      height: rh,
      left: aabb.left,
      top: aabb.top,
      aabbW: aabb.aabbW,
      aabbH: aabb.aabbH,
    };
  });

  // Final micro-separation pass on exact integer positions to prevent any 1px rounding touch/overlap
  for (let pass = 0; pass < 12; pass++) {
    let anyFix = false;
    for (let i = 0; i < rounded.length; i++) {
      for (let j = i + 1; j < rounded.length; j++) {
        const a = rounded[i];
        const b = rounded[j];
        const acx = a.left + a.aabbW / 2;
        const acy = a.top + a.aabbH / 2;
        const bcx = b.left + b.aabbW / 2;
        const bcy = b.top + b.aabbH / 2;
        const ox = (a.aabbW + b.aabbW) / 2 - Math.abs(bcx - acx);
        const oy = (a.aabbH + b.aabbH) / 2 - Math.abs(bcy - acy);
        if (ox > 0.01 && oy > 0.01) {
          anyFix = true;
          if (ox <= oy) {
            const step = Math.ceil(ox);
            const dir = bcx >= acx ? 1 : -1;
            b.x += dir * step;
            b.left += dir * step;
          } else {
            const step = Math.ceil(oy);
            const dir = bcy >= acy ? 1 : -1;
            b.y += dir * step;
            b.top += dir * step;
          }
        }
      }
    }
    if (!anyFix) break;
  }

  for (const r of rounded) {
    const patch: Partial<AnyElement> = {
      x: r.x,
      y: r.y,
    };
    if (r.box.scale < 0.999) {
      patch.width = r.width;
      patch.height = r.height;
      const fs = (r.box.el as { fontSize?: unknown }).fontSize;
      if (typeof fs === "number") {
        (patch as { fontSize?: number }).fontSize = Math.max(8, Math.round(fs * r.box.scale));
      }
    }
    patches.set(r.box.id, patch);
  }

  return patches;
}
