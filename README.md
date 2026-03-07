# Layup

A web-based C4 architecture diagram editor. Create and navigate software architecture diagrams across all four C4 model levels: **Context → Container → Component → Code**.

## Features

- **Visual drag-and-drop editor** — add systems, containers, components, persons, and boundaries to a canvas
- **Hierarchical drill-down** — navigate between C4 levels by clicking into elements
- **Breadcrumb navigation** — quickly jump back to any parent level
- **Properties panel** — edit element details inline
- **Project management** — organize diagrams into projects

## Tech Stack

Svelte 5 · TypeScript · Vite · xyflow/svelte

## Prerequisites

- [Node.js](https://nodejs.org/) v18+

## Install

```bash
git clone https://github.com/aerlaut/layup.git
cd layup
npm install
```

## Usage

Start the dev server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
npm run preview   # preview the production build locally
```

Run tests:

```bash
npm test
```

## License

MIT
