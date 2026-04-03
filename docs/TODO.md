# Tessera — Future Features

## Next Up
- [x] Diagram builder — React Flow-based, 14 thesis-driven templates in 5 categories, inline rendering, dagre + d3-force layout
- [ ] Diagram builder Phase 2 — live d3-force physics simulation for Knowledge Graph, 3D templates (Endosphere, Noemascape, 3D Compass) via Three.js
- [ ] Build remaining ~40 diagrams from thesis inventory (see docs/issues.md and memory/project_diagram_inventory.md)
- [ ] Fill in the Axiometric Calculus — import from `docs/writings/Purpose of School/Axiometric Calculus/` (.docx files), structure the formal notation, primitives, axioms, versors, and operators
- [ ] Fill in the Ontological Dictionary — import from `docs/writings/Purpose of School/Ontological Dictionary/` (.docx and .xlsx files), build relational definitions
- [ ] Figure out how Calculus and Dictionary integrate into the main project — they're the same idea in different registers; the tool should make cross-project connections visible and navigable

## Brainstorming Features
- [ ] Semantic cross-reference radar — detect when you're expanding on a concept discussed elsewhere
- [ ] "Explain in depth" detector — flag 3+ consecutive paragraphs on same concept
- [ ] Comment-to-task pipeline — parse editorial comments as actionable tasks
- [ ] Paragraph migration tracking — tag and track where paragraphs move across drafts

## Writing Features
- [ ] Spine validation view — read-through showing only spine + first/last sentences per section
- [ ] Export to .docx — preserve formatting, footnotes, citations
- [ ] Export to presentation — convert sections to slides
- [ ] Structural versioning — track "this paragraph used to serve Spine A but now serves Spine B"

## Integrations
- [ ] Zotero API — pull library, bidirectional citation links
- [ ] Decision log UI — timestamped structural decisions with reasoning

## Technical
- [ ] Code-split React Flow to reduce bundle size
- [ ] IndexedDB for larger storage capacity
- [ ] Pretext integration for text measurement performance


(Added by Wil)
- improve import functionality
- improve export functionality
- add a backup of all the text from the entire "project of schools" doc in markdown format in a few places that are updated everytime it's saved (maybe some cloud storage - google docs?)
- make it editable across devices
- ~~add diagrams/diagram builder~~ DONE (v0.4)