---
name: section-summary
description: Generate a structural summary of any section with word counts, status breakdown, and argument map
user_invocable: true
---

# Section Summary

Generate a detailed structural summary of the currently active section (or a specified section).

## Instructions

1. Read `src/data/projects.js` to get the project structure
2. Ask the user which section to summarize, or default to the active section if context is clear
3. For the target section and all its descendants, compute:
   - **Word count**: total words across all paragraphs (recursive)
   - **Paragraph count**: total paragraphs (recursive)
   - **Section count**: total subsections (recursive)
   - **Status breakdown**: count of sections by status (done, revised, drafting, brainstorm)
   - **Spine coverage**: sections with spines vs without
   - **Spine role breakdown**: count of paragraphs by role (spine, setup, claim, evidence, bridge, synthesis, definition)
4. Generate a structural outline:
   - Each section with: title, status, word count, spine (or "missing")
   - Indented by depth
5. Provide a brief assessment:
   - Completion percentage (based on status distribution)
   - Sections that need attention (brainstorm status with many words = needs restructuring; done status with few words = might be too thin)
   - Balance analysis (are some sections much longer/shorter than siblings?)

## Context

This is a scholarly thesis with deeply nested sections. Each section has a status (done/revised/drafting/brainstorm) and paragraphs have roles (spine/setup/claim/evidence/bridge/synthesis). The summary helps the author see where to focus effort.
