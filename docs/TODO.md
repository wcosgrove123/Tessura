# Tessera — Future Features

## Next Up
- [ ] Diagram builder — beautiful, easy visual diagram tool. Consider Mermaid, D2, or a React-based solution. Pretext (chenglou/pretext) is a text measurement lib, not a diagram tool, but could enhance custom rendering.
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