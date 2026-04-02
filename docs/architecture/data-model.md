# Tessera Data Model

## Recursive Section Tree

```
Project
  └── Part (top-level grouping, e.g. "Part I: Philosophy & Rationale")
        └── Section (recursive — nests indefinitely)
              ├── children: Section[]   (sub-sections)
              └── paragraphs: Paragraph[]  (content at this level)
```

### Project
```js
{
  id: string,
  name: string,
  icon: string,       // emoji
  color: string,      // hex color
  parts: Part[],
}
```

### Part
```js
{
  id: string,
  title: string,
  subtitle: string,
  children: Section[],
}
```

### Section (recursive)
```js
{
  id: string,
  title: string,
  spine: string,      // thesis sentence for this section
  status: "done" | "revised" | "drafting" | "brainstorm",
  children: Section[],      // sub-sections (recursive)
  paragraphs: Paragraph[],  // content at this level
}
```

### Paragraph (leaf)
```js
{
  id: string,
  text: string,
  status: "done" | "revised" | "drafting" | "brainstorm",
  spineRole: "spine" | "setup" | "claim" | "evidence" | "bridge" | "synthesis" | "definition",
  linkedTerms: string[],  // references to keys in LINKED_TERMS
}
```

### Linked Terms
```js
{
  "termName": {
    symbol: string,       // e.g. "ν"
    definition: string,
    project: string,      // home project ID
    color: string,
    refs: [{ project, doc, snippet }],
  }
}
```

## Key Files

- `src/data/projects.js` — All project/part/section/paragraph data (auto-generated from docx, ~486KB)
- `src/data/linkedTerms.js` — Cross-project term definitions
- `src/data/constants.js` — Status styles, spine role styles, palette colors
- `src/data/notes.js` — Categorized brainstorm notes (ideas, questions, tasks, bibliography)
- `src/data/imported-paragraphs.json` — Raw import data from mammoth (intermediate, used by generate script)

## State Management

- `src/hooks/useWorkspaceState.js` — Central state hook with tree helpers
- All state persists to localStorage (`tessera-workspace` key)
- Notes persist separately (`tessera-notes` key)
- Decision log persists separately (`tessera-decisions` key)

## Tree Helpers (exported from useWorkspaceState)

- `findSection(parts, sectionId)` — Find section anywhere in tree, returns `{ section, path }`
- `flattenSections(parts)` — Flatten all sections into a list with depth
- `collectParagraphs(section)` — Get all paragraphs from section and descendants
