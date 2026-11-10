# DiapoLab

<div align="center">

<img src="./public/favicon.svg" alt="DiapoLab logo" width="72" />

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)

A browser-based slide editor for building, refining, and presenting decks.

</div>

## Screenshot

<p align="center">
  <img src="./public/screenshot.png" alt="DiapoLab editor screenshot" width="900" style="border-radius: 28px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.15);" />
</p>

## Overview

DiapoLab is a presentation workspace for designing slide decks in the browser. It is built around a canvas-based editor with support for text, shapes, media, templates, and export workflows.

The project aims to make it easy to create polished presentations without juggling multiple tools. You can edit slides, reuse layouts, adjust themes, and publish or export the final deck when ready.

## Features

### Editor

- Multi-slide deck editing
- Canvas-based positioning and manipulation
- Text styling and layout controls
- Shapes, illustrations, and reusable blocks
- Slide thumbnails and navigation
- Undo/redo, duplication, copy/paste, and keyboard nudging
- Zoom controls and fit-to-screen behavior
- Slide transition presets with per-slide settings

### Design and presentation

- Theme customization and presentation mode
- Background and layout adjustments
- Template-driven starter experiences
- Preset visual styles for decks and elements
- Image effects and filters
- Local media library for images, video, and audio
- Presenter view with notes, timer, and preview

### Cloud and sharing

- Sign-in flow with Supabase auth
- Save designs to a user account
- Load and manage projects
- Private share links with secure tokens
- Public share links for published decks
- Template publishing workflow

### Import and export

- Import design JSON and PowerPoint files
- Export decks as PNG, JPG, PDF, PPTX, HTML, JSON, GIF, and Markdown

## Tech Stack

- React 19
- TypeScript
- Vite
- TanStack Router
- Tailwind CSS
- Zustand
- Supabase
- Radix UI
- Lucide icons

## Project Structure

```text
.
├── public/
├── src/
│   ├── components/
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
├── bun.lock
└── .github/
```

## Requirements

Before starting the app, make sure you have:

- Node.js 18+
- npm 9+

## Quick Start

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

Create a `.env` file in the project root with your Supabase configuration:

```env
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_PUBLISHABLE_KEY="your-publishable-key"
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your-publishable-key"
```

You may also need additional project-specific environment values depending on your local setup.

### 4. Start the development server

```bash
npm run dev
```

Then open the local URL shown in the terminal.

## Production Build

```bash
npm run build
```

Preview the built app locally:

```bash
npm run preview
```

## Available Scripts

```bash
npm run dev      # start the development app
npm run build    # create a production build
npm run preview  # preview the built app locally
npm run lint     # run ESLint
npm run format   # format source files with Prettier
```

## Development Notes

The app is structured around a centralized editor store and a route-based application shell. The editor logic lives under `src/components/editor` and `src/store`, while route pages and the app shell sit in the route layer.

## Contributing

Contributions are welcome.

If you want to contribute:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Open a pull request with a clear description

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Links

- Repository: https://github.com/PNBPositron/DiapoLab
- License: MIT
- App concept: presentation editor / slide design tool
