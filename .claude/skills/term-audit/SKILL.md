---
name: term-audit
description: Check that all linked terms from the Ontological Dictionary are used consistently across projects
user_invocable: true
---

# Term Audit

Audit linked term usage across all three projects for consistency and completeness.

## Instructions

1. Read `src/data/linkedTerms.js` to get all tracked terms with their definitions, symbols, and cross-references
2. Read `src/data/projects.js` to get all paragraph text across all three projects
3. For each linked term:
   - Search all paragraph text for occurrences of the term name
   - Compare found occurrences against the stored `refs` array in linkedTerms
   - Flag terms that appear in paragraphs but aren't in the refs (missing cross-references)
   - Flag terms in refs that no longer appear in the paragraph text (stale references)
4. Also check:
   - Terms with 0 cross-references (orphaned terms)
   - Terms used frequently but not in linkedTerms (candidates for tracking)
   - Inconsistent usage (e.g., "noema" vs "noemata" — singular/plural)
5. Report:
   - Summary: X terms tracked, Y cross-references, Z issues found
   - Missing references (term appears in text but not tracked)
   - Stale references (tracked but text has changed)
   - Orphaned terms (defined but never referenced)
   - Candidates for new linked terms

## Context

This workspace tracks terms across three interconnected projects: Purpose of Schools (thesis), Axiometric Calculus (formal notation), and Ontological Dictionary (relational definitions). Cross-project traceability is the #1 priority.
