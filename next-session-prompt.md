# Next Session: Tessera UI/UX Polish & Design Pass

## What Happened This Session

A comprehensive UX audit was performed and **21 features/fixes** were implemented in a single session. Here's everything that was built:

### New Features
1. **Outline View** — `[Draft | Expanded | Outline]` toggle in the editor breadcrumb bar. Outline shows a compact tree of all descendant sections with spines, statuses, word counts.
2. **Expanded View** — Renders the selected section + all descendants as one continuous editable document with proper heading hierarchy, spine blocks, and click-to-edit paragraphs.
3. **Zen Mode** — `Ctrl+Shift+F` hides all chrome (sidebar, topbar, right panel), centers editor at 820px. Includes a slide-out nav rail (hover left edge or click arrow button), paragraph focus dimming, and "Exit Zen" button.
4. **App-Level Undo/Redo** — 30-level undo stack for structural changes (add/delete sections, paragraphs, spine/title/status changes). `Ctrl+Z` / `Ctrl+Y`. Doesn't conflict with TipTap's per-paragraph undo.
5. **IndexedDB Migration** — Primary storage is now IndexedDB (via `idb-keyval`), with localStorage as sync fallback for `beforeunload`. No more 5MB ceiling.
6. **Save Status Indicator** — "Saved" / "Saving..." / "Save failed" in the TopBar with colored icons.
7. **Word Count + Smart Typography** — `@tiptap/extension-character-count` and `@tiptap/extension-typography` installed. Word count in paragraph toolbar + section header. Auto em-dashes, smart quotes.
8. **Custom Confirm Modals** — `ConfirmModal.jsx` component replacing all `confirm()` calls. Parchment aesthetic, backdrop blur, keyboard support.
9. **Bulk Note Actions** — Multi-select mode in Brainstorm with checkboxes, select all, bulk delete.
10. **Note Sorting** — Dropdown: Newest, Oldest, Category, Most Tags.
11. **dnd-kit Sidebar Drag-Drop** — Replaced native HTML drag with `@dnd-kit/core` + `@dnd-kit/sortable`. Drag overlay, drop indicators, 5px activation distance.
12. **Claude Code Skills** — `/spine-check`, `/term-audit`, `/section-summary`

### Bug Fixes
13. Debounce flush on blur (prevent silent data loss when clicking away fast)
14. Note quick-add ID mismatch (notes now enter edit mode reliably)
15. Content-anchored inline comments (store `anchorText` so comments survive text edits)
16. Paragraph delete confirmation
17. Spine/title escape-to-discard warning
18. Note textarea auto-focus
19. Breadcrumb hover states (underline + accent color)
20. Sidebar scroll position persistence
21. Add subsection button always visible

---

## What To Do This Session: UI/UX Design Polish

Use the **UI/UX Pro Max** skill (available at `.claude/skills/ui-ux-pro-max/` and the global skill at `~/.claude/skills/ui-ux-pro-max-skill/`) to audit and improve Tessera's visual design quality.

### Focus Areas

#### 1. Color Contrast & Accessibility
- Audit the current palette (`src/data/constants.js` — PALETTE, STATUS, SPINE_ROLES) against WCAG AA standards
- The muted text colors (`P.tm: #6B6052`, `P.tf: #A09580`) may have insufficient contrast on the cream background (`P.bg: #FAF7F2`)
- Status badges, spine role indicators, and breadcrumb text are very small — verify legibility
- Check the TopBar dark background (`#2C2418`) text contrast

#### 2. Transitions & Animations
- Currently most transitions are basic `transition: all 0.15s` — could be more polished
- The Expanded View has no entrance animation when switching modes
- The Zen Mode nav rail slides in but could have smoother easing
- Paragraph selection/deselection is abrupt
- The save status indicator change could have a subtle animation
- Consider adding micro-animations to: outline row hover, note card interactions, breadcrumb navigation, modal open/close

#### 3. Smooth Scrolling
- The app uses `overflowY: auto` everywhere — no smooth scroll behavior
- In Expanded View, scrolling through a long chapter should feel premium
- The Zen Mode should have especially smooth, Lenis-like scrolling (the Calculus view already uses Lenis — could port the pattern)
- Consider scroll-to-section when clicking Outline rows

#### 4. Typography & Spacing
- Review the font size hierarchy across views (Draft, Expanded, Outline, Zen)
- The Expanded View heading sizes could be more refined (currently just `32 - depth * 5`)
- Paragraph spacing in Expanded View vs Draft view consistency
- Line heights and letter spacing fine-tuning

#### 5. Component-Level Polish
- **ConfirmModal** — could have enter/exit animations (scale + fade)
- **Drag overlay** in sidebar — could have rotation + shadow depth during drag
- **Note cards** in Brainstorm — hover states could be more refined
- **Status badges** — consider whether the current colors work well against all backgrounds
- **Spine blocks** — the accent-bordered block could have more visual weight
- **Paragraph role indicators** (Unicode symbols) — consider using proper icons or better typography

### Key Files

| File | What It Contains |
|---|---|
| `src/data/constants.js` | PALETTE, STATUS colors, SPINE_ROLES — all design tokens |
| `src/components/Editor.jsx` | Main editor, Expanded View, Outline View, Zen Nav Rail (~1800 lines) |
| `src/components/ParagraphEditor.jsx` | TipTap editor, toolbar, inline comments |
| `src/components/Sidebar.jsx` | Navigation tree with dnd-kit drag-drop |
| `src/components/TopBar.jsx` | Save indicator, search, view tabs, zen button |
| `src/components/Brainstorm.jsx` | Notes with sorting, bulk actions, categories |
| `src/components/ConfirmModal.jsx` | Custom modal component |
| `src/components/CrossRefPanel.jsx` | Right panel (links, spines, notes tabs) |
| `src/TesseraWorkspace.jsx` | Layout orchestrator, zen mode toggle |
| `index.html` | Global CSS (just reset + spin keyframe) |

### Design Language (preserve these)
- **Warm parchment/library aesthetic** — NOT dark mode, NOT generic tech
- **Fonts**: Cormorant Garamond (headings), Spectral (body), IBM Plex Mono (UI labels)
- **Background**: `#FAF7F2` (warm cream)
- **Text**: `#2C2418` (dark walnut)
- **Accent**: `#8B4513` (saddlebrown)
- **Project colors**: Purpose of Schools = `#2A5F7C`, Calculus = `#2D6B5A`, Dictionary = `#9E5A2A`
- **Status colors**: Botanical tones with visible borders

### Commands
```bash
npm run dev    # Dev server on port 8345 (or 8346)
npm run build  # Production build (verify no errors)
```

### Don't Break
- The Lenis + GSAP + Three.js scroll system in CalculusView (already highly optimized)
- The ref-based animation architecture (never use useState for scroll/animation values)
- Cross-project term linking
- localStorage + IndexedDB dual-write persistence
- TipTap editor functionality
