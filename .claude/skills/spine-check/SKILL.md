---
name: spine-check
description: Analyze spine sentences across all sections for logical coherence and argument flow
user_invocable: true
---

# Spine Check

Analyze the argument flow across all spine sentences in the active project.

## Instructions

1. Read `src/data/projects.js` to understand the project structure
2. Also check localStorage/IndexedDB state — but the source file gives you the default structure
3. For the Purpose of Schools project, traverse every section recursively and extract all `spine` fields
4. Organize spines by their position in the tree (Part > Section > Subsection)
5. Analyze the argument flow:
   - Does each spine logically follow from its parent's spine?
   - Are there gaps in the argument chain?
   - Do sibling sections' spines build on each other or repeat?
   - Are any spines missing (empty string)?
6. Report:
   - A numbered list of all spines in reading order with their section path
   - Sections with missing spines (flagged)
   - Logical gaps or repeated arguments
   - Suggestions for strengthening the argument chain

## Context

This is a scholarly thesis workspace. The "spine" is a single thesis sentence that captures what each section argues. Every section should have one. The spines should flow logically from introduction through to conclusion, building a coherent argument about why K-12 curriculum should shift from content-first to metacognition-first.
