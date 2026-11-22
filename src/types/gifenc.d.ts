declare module "gifenc" {
  export type GifPaletteFormat = "rgb565" | "rgb444" | "rgba4444";
  export type GifQuantizeOptions = {
    format?: GifPaletteFormat;
    oneBitAlpha?: boolean | number;
    clearAlpha?: boolean;
    clearAlphaThreshold?: number;
    clearAlphaColor?: number;
  };
  export function GIFEncoder(): {
    writeFrame(index: Uint8Array, width: number, height: number, opts?: Record<string, unknown>): void;
    finish(): void;
    bytes(): Uint8Array;
  };
  export function quantize(
    data: Uint8ClampedArray | Uint8Array,
    maxColors: number,
    options?: GifQuantizeOptions,
  ): number[][];
  export function applyPalette(
    data: Uint8ClampedArray | Uint8Array,
    palette: number[][],
    format?: GifPaletteFormat,
  ): Uint8Array;
}
