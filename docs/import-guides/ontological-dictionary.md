# Importing the Ontological Dictionary

## Source Files

Located at: `docs/writings/Purpose of School/Ontological Dictionary/`

- `Ontological Dictionary.docx` — Main dictionary document
- `Integrated_Ontological_Dictionary.docx` — Integrated/expanded version
- `Ontological Definitions.xlsx` — Spreadsheet with structured definitions

## Current State in App

The Ontological Dictionary project currently has placeholder content in `src/data/projects.js` under:
```
projects[2] (id: "ontological-dictionary")
  └── parts[0] (id: "od-main", title: "Dictionary")
      ├── Core Terms — 3 paragraphs (noema, noemata, schema)
      ├── Structures & Spaces — 3 paragraphs (perifield, outer lens, contexture)
      └── Metacognitive Habits — 2 paragraphs (endospection, omniperegrination)
```

## What Needs to Happen

1. **Parse all three source files**:
   - Use mammoth for the .docx files
   - Use a library like `xlsx` (npm: xlsx) for the .xlsx spreadsheet
2. **Extract the relational definitions** — each term is defined as an equation of other terms:
   - Term name
   - Symbol (Greek/mathematical notation)
   - Natural-language definition
   - Equation/dependencies (which other terms it depends on)
   - Category (Core Terms, Structures & Spaces, Metacognitive Habits, etc.)
3. **Build the section tree** — organize terms into logical groups
4. **Update linked terms** — this is critical:
   - Every term in the Dictionary should be in `src/data/linkedTerms.js`
   - Each term's `refs` array should include cross-references to where it appears in Purpose of Schools and the Axiometric Calculus
   - Currently only 8 terms are tracked; the Dictionary likely defines 20-50+ terms

## Known Terms (from existing data and the book)

Already tracked:
- noema (ν), contexture (◊), cogniscience (κ*), endospection (endo(), tesseractic (=*), oppression (Ω), schema (σ), perifield (℘)

Likely to find in Dictionary:
- noemata, noemascape, endosphere, exofield, outer lens, inner lens
- omniperegrination, constellaration, refraction, exospection, synthesis (the 6 habits)
- versōr, koino(, exo(, nulo(
- And many more

## Special Considerations

- The Dictionary is **relational** — terms define each other. The app's linked terms system should reflect these circular dependencies.
- The .xlsx spreadsheet likely has the most structured data — consider it the source of truth for term metadata.
- Spine roles for Dictionary content should primarily use "definition".
- Consider whether the Dictionary needs a different Part structure than a simple list — maybe grouped by:
  - Foundational Terms (noema, schema, consciousness)
  - Spatial Metaphors (perifield, endosphere, exofield, lenses)
  - Metacognitive Habits (the six habits)
  - Operators & Relations (versōrs, tesseractic equality)

## Integration with Other Projects

The Dictionary is the **definition layer** for the entire system. After import:
1. Scan all paragraphs in Purpose of Schools for newly added term names
2. Update `linkedTerms` refs to include all cross-project appearances
3. Scan Axiometric Calculus paragraphs as well
4. The linked terms panel in the UI will automatically show cross-references once refs are updated
