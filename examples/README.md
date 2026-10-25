# DiapoLab add-on examples

DiapoLab supports two import formats, each with its own code and its own
import button in the **Add-ons** panel:

| Format | Code | Adds |
| --- | --- | --- |
| App | `diapolabApp({ name, author, apps: [...] })` | interactive mini-tools (paint, video) |
| Pack | `diapolabPack({ name, author, widgets: [...] })` | drop-in groups of canvas elements |

## How to use

1. Open the **Add-ons** panel in DiapoLab.
2. Click **Import app code** or **Import pack code**.
3. Paste the full content of one of the example files below and press Import.

## Files

- [`app-plugin.example.js`](./app-plugin.example.js) — a paint app with a custom
  pastel palette, brush sizes and background (`type: "paint"`). Apps of type
  `"video"` are also supported (no config).
- [`pack-plugin.example.js`](./pack-plugin.example.js) — three widget groups
  (section header, quote block, stat tile) built from `text` and `shape`
  elements. Coordinates are in slide pixels (the slide is 1920×1080).

## App config options (paint apps)

```js
config: {
  colors: ["#0f172a", "#2563eb"],  // swatches in the picker (max 12)
  defaultColor: "#2563eb",
  brushSizes: [4, 8, 16, 28],      // palette sizes in px (max 6)
  bg: "#ffffff",                   // "transparent" for a checkered pad
  width: 960, height: 540,         // export size in canvas pixels
}
```

Widgets accept any combination of `text`, `shape`, `image` and `video`
elements — or a function returning the element array (fresh on every insert).
