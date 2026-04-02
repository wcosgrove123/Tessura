# Importing the Axiometric Calculus

## Source Files

Located at: `docs/writings/Purpose of School/Axiometric Calculus/`

- `The_Axiometric_Calculus.docx` — Earlier version
- `Axiometric_Calculus_v4.docx` — Latest version (use this as primary)

## Current State in App

The Axiometric Calculus project currently has placeholder content in `src/data/projects.js` under:
```
projects[1] (id: "axiometric-calculus")
  └── parts[0] (id: "ac-main", title: "Core System")
      ├── Primitives (P₀–P₇) — 2 paragraphs
      ├── Axioms & Operators — 3 paragraphs
      └── The Versōr System — 2 paragraphs
```

## What Needs to Happen

1. **Parse both .docx files** using mammoth (see `scripts/generate-projects.cjs` for the pattern)
2. **Extract the formal structure** — the Calculus has:
   - **Primitives (P₀–P₇)**: Seven foundational claims
   - **Axioms (A₀–A₆)**: Formal logical axioms using custom notation
   - **Versōrs**: Prefix-functions (endo(, exo(, koino(, nulo()
   - **Operators**: Mathematical-like operators for relational meaning
   - **Theorems/Proofs**: Derived results
3. **Map headings to sections** — similar to how Purpose of Schools was imported
4. **Detect linked terms** — the Calculus uses terms like noema (ν), cogniscience (κ*), tesseractic (=*), endospection (endo(), schema (σ), perifield (℘)
5. **Update the project structure** in projects.js — may need more Parts or deeper section nesting
6. **Consider adding new linked terms** to `src/data/linkedTerms.js` for any terms defined in the Calculus but not yet tracked

## Special Considerations

- The notation uses Unicode mathematical symbols extensively (∋, ≝, =*, ν, κ, etc.)
- Paragraph spine roles should lean toward "definition" and "claim" for formal content
- The Calculus is the formal notation system — everything here should feel precise and structured
- Cross-references to Purpose of Schools are critical (the Calculus formalizes concepts used in the book)

## Import Pattern

Follow the same approach used in `scripts/generate-projects.cjs`:
1. Use mammoth to extract HTML
2. Parse headings to build section structure
3. Map paragraphs to sections
4. Detect linked terms
5. Generate updated projects.js

The import script already handles the Axiometric Calculus project — it just needs real content instead of placeholder paragraphs.
