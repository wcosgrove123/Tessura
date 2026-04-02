# Tessera Component Architecture

## Component Tree

```
TesseraWorkspace (src/TesseraWorkspace.jsx)
├── TopBar — Search, view tabs (Editor/Notes/Arg Map), Import button
├── Sidebar — Collapsible tree navigator (Projects → Parts → Sections)
├── Editor — Section viewer/editor with TipTap rich text
│   └── ParagraphEditor — TipTap instance per paragraph with toolbar
├── Brainstorm — Categorized notes with tags, search, CRUD
├── ArgumentMap — React Flow interactive graph of all projects/sections
└── CrossRefPanel — Right panel with Links tab and Spines tab
    └── TermHighlight — Inline term highlighting in paragraph text
```

## Views (controlled by `state.view`)

| View | Component | Description |
|------|-----------|-------------|
| `editor` | Editor | Section writing surface with breadcrumbs, spine, subsections, paragraphs |
| `brainstorm` | Brainstorm | Card-based notes with category tabs and tag filtering |
| `argmap` | ArgumentMap | React Flow graph visualization of all projects |

## Key Libraries

| Library | Purpose | Location |
|---------|---------|----------|
| TipTap | Rich text editing | ParagraphEditor.jsx |
| React Flow (@xyflow/react) | Argument map graph | ArgumentMap.jsx |
| mammoth | .docx parsing | DocImporter.jsx |
| Lucide React | Icons | All components |

## Design Language

- Fonts: Cormorant Garamond (headings), Spectral (body), IBM Plex Mono (UI/code)
- Palette: Warm parchment (#FAF7F2 bg, #2C2418 text, #8B4513 accent)
- Project colors: Purpose of Schools=#2A5F7C, Calculus=#2D6B5A, Dictionary=#9E5A2A
- Status: Botanical tones (green=done, amber=revised, blue=drafting, purple=brainstorm)
