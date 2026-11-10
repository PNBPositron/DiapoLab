# DiapoLab

<div align="center">

<img src="./public/favicon.svg" alt="DiapoLab logo" width="72" />

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)

✨ A next generation slide editor with templates, AI-assistance, presets, interactive features and more.

</div>

## 📸 Screenshot

<p align="center">
  <img src="./public/screenshot.png" alt="DiapoLab editor screenshot" width="900" style="border-radius: 28px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.15);" />
</p>


## 🌍 Overview

DiapoLab is a browser-based presentation workspace built with React, Vite, TypeScript, and Supabase. It is designed for users who want a flexible editor that feels fast and expressive while remaining approachable for real-world deck creation.

The app includes:

- 🖼️ a multi-slide editor canvas
- 📝 rich text and layout controls
- 🧩 reusable design components and templates
- 🤖 AI-assisted slide analysis and improvement suggestions
- 🎨 theme customization and presentation mode
- 📦 import/export for sharing and downstream workflows
- 🔐 authenticated cloud saves and publishing


## ⚡ Features

### 🖊️ Editor Features

- Multi-slide deck editing
- Canvas-based positioning and manipulation for elements
- Text tools for creating and styling slide content
- Shape and illustration support
- Preset components and reusable blocks
- Slide thumbnails and page navigation
- Presentation mode with presenter view (notes, timer, next-slide preview)
- Undo/redo with accurate disabled states, duplicate, copy/paste, arrow-key nudging
- Smooth zoom controls (wheel, buttons, fit-to-screen on click)
- Slide transitions (18 presets) with per-slide configuration
- Version history with restore

### 🎨 Design & Styling

- Custom themes and editor styling controls
- Background and layout adjustments
- Template-driven starter experiences
- Presets in different styles
- Image filters: 9 one-click presets (Noir, Vintage, Faded, Crisp, Sunset, Golden, Glitch, VHS...) plus fine-tune sliders for brightness, contrast, saturation, blur, grain noise and tint
- Advanced effects: RGB-split glitch with animated jitter, film-grain noise, pixelate, posterize
- Color pickers with swatch popovers for fills, gradients and tints
- Local media library (images, videos, audio) stored in IndexedDB with drag-and-drop upload and one-click insert
- Flexible visual identity for presentation output

### 🤖 AI Assistance

- AI slide analysis for current slide content
- Suggestions for hierarchy and visual improvement
- Help generating or refining slide ideas
- Personalized editing assistance inside the editor

### ☁️ Cloud & Collaboration

- Sign-in flow with Supabase auth
- Save designs to user account
- Load and manage personal projects
- Private share links with secure tokens
- Public share links for published decks
- Marketplace and template publishing workflow

### 📤 Import / Export

- Import existing design JSON and PowerPoint (.pptx) files
- Export decks as:
  - PNG
  - JPG
  - PDF
  - PPTX
  - HTML
  - JSON
  - GIF
  - Markdown

### 🧭 App Experience

- Responsive modern UI
- Settings and preferences screen
- About, privacy policy, and license pages
- Open-source MIT license

## 🛠️ Tech Stack

- React 19
- TypeScript
- Vite
- TanStack Router
- Tailwind CSS
- Zustand for app state
- Supabase for auth and data persistence
- Radix UI primitives
- Lucide icons

## 📁 Project Structure

```text
.
├── public/
├── src/
│   ├── components/
│   │   ├── editor/
│   │   └── ui/
│   ├── hooks/
│   ├── integrations/
│   ├── lib/
│   ├── routes/
│   ├── store/
│   ├── types/
│   ├── router.tsx
│   ├── server.ts
│   ├── start.ts
│   ├── styles.css
│   └── routeTree.gen.ts
├── .env
├── .gitignore
├── components.json
├── eslint.config.js
├── LICENSE
├── package.json
├── tsconfig.json
├── vite.config.ts
├── wrangler.jsonc
├── README.md
└── bun.lock
```

## ✅ Requirements

Before starting the app, make sure you have:

- Node.js 18+
- npm 9+

## 🚀 Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/PNBPositron/DiapoLab.git
cd DiapoLab
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the project root with your Supabase configuration. The app expects values similar to:

```env
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_PUBLISHABLE_KEY="your-publishable-key"
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your-publishable-key"
```

You may also need project-specific environment values depending on your local setup.

### 4. Start the development server

```bash
npm run dev
```

Then open the local URL shown in the terminal.

## 📦 Production Build

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## 🧪 Available Scripts

```bash
npm run dev      # start the development app
npm run build    # create a production build
npm run preview  # preview the built app locally
npm run lint     # run ESLint
npm run format   # format source files with Prettier
```

## 🧠 Development Notes

This project is structured around a centralized editor store and route-based application shell. The core editor logic lives under `src/components/editor` and `src/store`, while route pages and supporting UI live in the app shell. The project uses Vite for local dev and build tooling, with Supabase as the backend data layer and Radix/Tailwind for UI primitives.

## 🤝 Contributing

Contributions are welcome.

If you want to contribute:

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Open a pull request with a clear description

## 📜 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## 📌 Project Status

DiapoLab is actively evolving as a presentation editor with template publishing, AI support, advanced image effects, a local media library, and a wide range of export workflows. It is suitable for experimentation, local development, and open-source extension as a personal project or collaborative codebase.

## 🔗 Links

- Repository: https://github.com/PNBPositron/DiapoLab
- License: MIT
- App concept: Presentation editor / slide design tool
