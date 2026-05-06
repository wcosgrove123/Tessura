# Tessera — Scholarly Writing Workspace

A writing workspace built for interconnected academic projects. Recursive section trees, cross-project term linking, argument mapping, brainstorming, and paragraph-level metadata with rich text editing.

## Quick Start

```bash
npm install
npm run dev
# Open http://localhost:8345
```

## Project Structure

```
tessera/
├── src/
│   ├── main.jsx                    # Entry point
│   ├── TesseraWorkspace.jsx        # Main app shell (wires all components)
│   ├── data/
│   │   ├── projects.js             # All content — recursive section tree (auto-generated)
│   │   ├── linkedTerms.js          # Cross-project term definitions
│   │   ├── constants.js            # Status/role/palette constants
│   │   ├── notes.js                # Categorized brainstorm notes
│   │   └── imported-paragraphs.json # Raw mammoth import (intermediate)
│   ├── components/
│   │   ├── TopBar.jsx              # Search, view tabs, import button
│   │   ├── Sidebar.jsx             # Collapsible tree navigator
│   │   ├── Editor.jsx              # Section editor with subsection cards
│   │   ├── ParagraphEditor.jsx     # TipTap rich text per paragraph
│   │   ├── ArgumentMap.jsx         # React Flow interactive graph
│   │   ├── Brainstorm.jsx          # Notes with categories and tags
│   │   ├── CrossRefPanel.jsx       # Linked terms + spines right panel
│   │   ├── TermHighlight.jsx       # Inline term highlighting
│   │   └── DocImporter.jsx         # mammoth-based .docx import
│   └── hooks/
│       └── useWorkspaceState.js    # Central state + tree helpers + persistence
├── scripts/
│   └── generate-projects.cjs       # Import script: docx → projects.js
├── docs/
│   ├── architecture/               # Data model and component docs
│   ├── import-guides/              # Guides for importing Calculus & Dictionary
│   ├── writings/                   # Source .docx/.xlsx/.pdf files
│   └── TODO.md                     # Future feature list
├── index.html
├── package.json
├── vite.config.js
└── CLAUDE.md                       # Full project context for Claude Code
```

## Current Features (v0.3)

- **Recursive section tree** — infinitely nestable sections (like a family tree)
- **784 paragraphs imported** from Purpose of Schools thesis with auto-detected linked terms
- **TipTap rich text editing** — click any paragraph to edit with formatting toolbar
- **Editable metadata** — titles, spines, status, and spine roles all editable inline
- **Interactive argument map** (React Flow) — draggable, zoomable graph of all projects/sections
- **Brainstorm/Notes view** — categorized notes (ideas, questions, tasks, bibliography) with tags and search
- **Cross-project term linking** — 8 terms tracked across 3 projects with clickable references
- **localStorage persistence** — all edits auto-save
- **.docx import** — drag and drop Word documents into the workspace

## Tech Stack

- **React 18** + **Vite 5** — fast dev server on port 8345
- **TipTap** — rich text editing (bold, italic, underline, highlight, lists)
- **React Flow** (@xyflow/react) — interactive node-based argument maps
- **mammoth** — .docx parsing and import
- **Lucide React** — icons
