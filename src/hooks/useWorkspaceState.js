import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { get as idbGet, set as idbSet } from "idb-keyval";
import DEFAULT_PROJECTS from "../data/projects.js";
import DEFAULT_LINKED_TERMS from "../data/linkedTerms.js";
import DEFAULT_NOTES, { migrateNotes } from "../data/notes.js";

const STORAGE_KEY = "tessera-workspace";
const NOTES_KEY = "tessera-notes";

// ── Sync localStorage (for initial render + beforeunload fallback) ──

function loadStateSync() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.projects?.[0]?.parts) {
        return {
          projects: parsed.projects,
          linkedTerms: parsed.linkedTerms || DEFAULT_LINKED_TERMS,
          savedAt: parsed.savedAt || 0,
        };
      }
    }
  } catch (e) {
    console.warn("Failed to load saved state from localStorage:", e);
  }
  return { projects: DEFAULT_PROJECTS, linkedTerms: DEFAULT_LINKED_TERMS, savedAt: 0 };
}

function saveStateSync(projects, linkedTerms) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ projects, linkedTerms, savedAt: Date.now() }));
  } catch (e) {
    // localStorage may be full — that's OK, IndexedDB is primary
  }
}

function loadNotesSync() {
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return migrateNotes(parsed);
    }
  } catch (e) {
    console.warn("Failed to load notes from localStorage:", e);
  }
  return DEFAULT_NOTES;
}

function saveNotesSync(notes) {
  try {
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  } catch (e) {
    // localStorage may be full — that's OK, IndexedDB is primary
  }
}

// ── Async IndexedDB (primary storage, no size limit) ──

async function saveStateAsync(projects, linkedTerms) {
  try {
    await idbSet(STORAGE_KEY, { projects, linkedTerms, savedAt: Date.now() });
    return true;
  } catch (e) {
    console.warn("Failed to save state to IndexedDB:", e);
    return false;
  }
}

async function saveNotesAsync(notes) {
  try {
    await idbSet(NOTES_KEY, notes);
    return true;
  } catch (e) {
    console.warn("Failed to save notes to IndexedDB:", e);
    return false;
  }
}

// ── Tree helpers ──────────────────────────────────────────────

/** Find a section by id anywhere in the tree. Returns { section, path } or null. */
export function findSection(parts, sectionId) {
  for (const part of parts) {
    const result = findInChildren(part.children, sectionId, [part.id]);
    if (result) return result;
  }
  return null;
}

function findInChildren(children, id, path) {
  for (const child of children) {
    if (child.id === id) return { section: child, path: [...path, child.id] };
    if (child.children?.length) {
      const result = findInChildren(child.children, id, [...path, child.id]);
      if (result) return result;
    }
  }
  return null;
}

/** Recursively update a section by id in a parts array. Returns new parts. */
function updateSectionInParts(parts, sectionId, updater) {
  return parts.map((part) => ({
    ...part,
    children: updateSectionInChildren(part.children, sectionId, updater),
  }));
}

function updateSectionInChildren(children, id, updater) {
  return children.map((child) => {
    if (child.id === id) return updater(child);
    if (child.children?.length) {
      return { ...child, children: updateSectionInChildren(child.children, id, updater) };
    }
    return child;
  });
}

/** Collect all paragraphs from a section and its descendants */
export function collectParagraphs(section) {
  const paras = [...(section.paragraphs || [])];
  for (const child of section.children || []) {
    paras.push(...collectParagraphs(child));
  }
  return paras;
}

/** Flatten all sections into a list (for search, etc.) */
export function flattenSections(parts) {
  const result = [];
  function walk(sections, depth) {
    for (const s of sections) {
      result.push({ ...s, depth });
      if (s.children?.length) walk(s.children, depth + 1);
    }
  }
  for (const part of parts) {
    walk(part.children, 0);
  }
  return result;
}

// ── Hook ─────────────────────────────────────────────────────

export default function useWorkspaceState() {
  const initial = useRef(loadStateSync());
  const [projects, setProjects] = useState(initial.current.projects);
  const [linkedTerms, setLinkedTerms] = useState(initial.current.linkedTerms);
  const [activeProjectId, setActiveProjectId] = useState("purpose-of-schools");
  const [activeSectionId, setActiveSectionId] = useState("introduction");
  const [expandedNodes, setExpandedNodes] = useState({ "purpose-of-schools": true, "part-1": true, "why": true });
  const [selectedTerm, setSelectedTerm] = useState(null);
  const [rightPanel, setRightPanel] = useState("crossref");
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPara, setSelectedPara] = useState(null);
  const [view, setView] = useState("editor");
  const [zenMode, setZenMode] = useState(false);
  const [notes, setNotes] = useState(loadNotesSync);
  const [decisionLog, setDecisionLog] = useState(() => {
    try {
      const raw = localStorage.getItem("tessera-decisions");
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });

  // Save status indicator: 'saved' | 'saving' | 'error'
  const [saveStatus, setSaveStatus] = useState("saved");

  // ── Undo / Redo stack ──────────────────────────────────────
  const undoStackRef = useRef([]);
  const redoStackRef = useRef([]);
  const MAX_UNDO = 30;

  const pushUndo = useCallback(() => {
    // Snapshot current projects state before a mutation
    undoStackRef.current.push(JSON.parse(JSON.stringify(projectsRef.current)));
    if (undoStackRef.current.length > MAX_UNDO) undoStackRef.current.shift();
    redoStackRef.current = []; // clear redo on new action
  }, []);

  const undo = useCallback(() => {
    if (undoStackRef.current.length === 0) return false;
    // Push current state to redo before restoring
    redoStackRef.current.push(JSON.parse(JSON.stringify(projectsRef.current)));
    const prev = undoStackRef.current.pop();
    setProjects(prev);
    return true;
  }, []);

  const redo = useCallback(() => {
    if (redoStackRef.current.length === 0) return false;
    // Push current state to undo before restoring
    undoStackRef.current.push(JSON.parse(JSON.stringify(projectsRef.current)));
    const next = redoStackRef.current.pop();
    setProjects(next);
    return true;
  }, []);

  // Refs for latest state (used by beforeunload flush)
  const projectsRef = useRef(projects);
  const linkedTermsRef = useRef(linkedTerms);
  const notesRef = useRef(notes);
  projectsRef.current = projects;
  linkedTermsRef.current = linkedTerms;
  notesRef.current = notes;

  // Track whether initial load is done (skip "saving" flash on mount)
  const hasMounted = useRef(false);

  // On mount: load from IndexedDB if it has newer data than localStorage
  useEffect(() => {
    (async () => {
      try {
        const idbState = await idbGet(STORAGE_KEY);
        if (idbState?.projects?.[0]?.parts) {
          const localSavedAt = loadStateSync().savedAt || 0;
          const idbSavedAt = idbState.savedAt || 0;
          if (idbSavedAt >= localSavedAt) {
            setProjects(idbState.projects);
            setLinkedTerms(idbState.linkedTerms || DEFAULT_LINKED_TERMS);
          }
        }
        const idbNotes = await idbGet(NOTES_KEY);
        if (Array.isArray(idbNotes) && idbNotes.length > 0) {
          setNotes(migrateNotes(idbNotes));
        }
      } catch (e) {
        console.warn("IndexedDB load failed, using localStorage data:", e);
      }
    })();
  }, []);

  // Auto-save projects (short debounce for typing perf)
  useEffect(() => {
    if (!hasMounted.current) { hasMounted.current = true; return; }
    setSaveStatus("saving");
    const timer = setTimeout(async () => {
      // Save to both IndexedDB (primary) and localStorage (sync fallback)
      saveStateSync(projects, linkedTerms);
      const ok = await saveStateAsync(projects, linkedTerms);
      setSaveStatus(ok ? "saved" : "error");
    }, 150);
    return () => clearTimeout(timer);
  }, [projects, linkedTerms]);

  // Auto-save notes
  useEffect(() => {
    if (!hasMounted.current) return;
    setSaveStatus("saving");
    const timer = setTimeout(async () => {
      saveNotesSync(notes);
      const ok = await saveNotesAsync(notes);
      setSaveStatus(ok ? "saved" : "error");
    }, 150);
    return () => clearTimeout(timer);
  }, [notes]);

  useEffect(() => {
    try { localStorage.setItem("tessera-decisions", JSON.stringify(decisionLog)); } catch {}
  }, [decisionLog]);

  // Flush save immediately on tab close / refresh / navigate away
  useEffect(() => {
    const flush = () => {
      // Sync flush to localStorage (guaranteed before tab close)
      saveStateSync(projectsRef.current, linkedTermsRef.current);
      saveNotesSync(notesRef.current);
      // Also try async IndexedDB save (may or may not complete)
      saveStateAsync(projectsRef.current, linkedTermsRef.current);
      saveNotesAsync(notesRef.current);
    };
    window.addEventListener("beforeunload", flush);
    // Also save on visibility change (switching tabs, minimizing)
    const onVisChange = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onVisChange);
    return () => {
      window.removeEventListener("beforeunload", flush);
      document.removeEventListener("visibilitychange", onVisChange);
    };
  }, []);

  // ── Derived state ──────────────────────────────────────────

  const activeProject = projects.find((p) => p.id === activeProjectId);

  const activeSection = activeProject
    ? findSection(activeProject.parts, activeSectionId)?.section
    : null;

  const activePath = activeProject
    ? findSection(activeProject.parts, activeSectionId)?.path || []
    : [];

  // Notes for the current section (all attachment levels)
  const sectionNotes = useMemo(() => {
    if (!activeSectionId) return [];
    return notes.filter((n) => n.linkedSectionId === activeSectionId);
  }, [notes, activeSectionId]);

  // Unlinked notes (loose ideas pool)
  const looseNotes = useMemo(() => {
    return notes.filter((n) => !n.linkedSectionId);
  }, [notes]);

  // Note counts per section (for sidebar badges)
  const noteCountBySection = useMemo(() => {
    const counts = {};
    for (const n of notes) {
      if (n.linkedSectionId) {
        counts[n.linkedSectionId] = (counts[n.linkedSectionId] || 0) + 1;
      }
    }
    return counts;
  }, [notes]);

  // Navigation
  const toggleNode = useCallback((id) => {
    setExpandedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const selectSection = useCallback((projectId, sectionId) => {
    setActiveProjectId(projectId);
    setActiveSectionId(sectionId);
    setSelectedTerm(null);
    setSelectedPara(null);
    // Auto-expand path to section
    const proj = projects.find((p) => p.id === projectId);
    if (proj) {
      const found = findSection(proj.parts, sectionId);
      if (found) {
        setExpandedNodes((prev) => {
          const next = { ...prev, [projectId]: true };
          for (const id of found.path) next[id] = true;
          return next;
        });
      }
    }
  }, [projects]);

  const selectTerm = useCallback((term) => {
    setSelectedTerm(term);
    setRightPanel("crossref");
    setShowRightPanel(true);
  }, []);

  // ── Section mutations ──────────────────────────────────────

  const updateSection = useCallback((projectId, sectionId, updates) => {
    pushUndo();
    setProjects((prev) =>
      prev.map((p) =>
        p.id !== projectId ? p : {
          ...p,
          parts: updateSectionInParts(p.parts, sectionId, (s) => ({ ...s, ...updates })),
        }
      )
    );
  }, [pushUndo]);

  const updateParagraphText = useCallback((projectId, sectionId, paraId, newText) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id !== projectId ? p : {
          ...p,
          parts: updateSectionInParts(p.parts, sectionId, (s) => ({
            ...s,
            paragraphs: s.paragraphs.map((pa) =>
              pa.id !== paraId ? pa : { ...pa, text: newText }
            ),
          })),
        }
      )
    );
  }, []);

  const updateParagraphMeta = useCallback((projectId, sectionId, paraId, updates) => {
    pushUndo();
    setProjects((prev) =>
      prev.map((p) =>
        p.id !== projectId ? p : {
          ...p,
          parts: updateSectionInParts(p.parts, sectionId, (s) => ({
            ...s,
            paragraphs: s.paragraphs.map((pa) =>
              pa.id !== paraId ? pa : { ...pa, ...updates }
            ),
          })),
        }
      )
    );
  }, [pushUndo]);

  const addParagraph = useCallback((projectId, sectionId, afterParaId) => {
    pushUndo();
    const newPara = { id: `p-${Date.now()}`, text: "", status: "brainstorm", spineRole: "claim", linkedTerms: [] };
    setProjects((prev) =>
      prev.map((p) =>
        p.id !== projectId ? p : {
          ...p,
          parts: updateSectionInParts(p.parts, sectionId, (s) => {
            if (!afterParaId) return { ...s, paragraphs: [...s.paragraphs, newPara] };
            const idx = s.paragraphs.findIndex((pa) => pa.id === afterParaId);
            const paras = [...s.paragraphs];
            paras.splice(idx + 1, 0, newPara);
            return { ...s, paragraphs: paras };
          }),
        }
      )
    );
  }, [pushUndo]);

  const deleteParagraph = useCallback((projectId, sectionId, paraId) => {
    pushUndo();
    setProjects((prev) =>
      prev.map((p) =>
        p.id !== projectId ? p : {
          ...p,
          parts: updateSectionInParts(p.parts, sectionId, (s) => ({
            ...s,
            paragraphs: s.paragraphs.filter((pa) => pa.id !== paraId),
          })),
        }
      )
    );
  }, [pushUndo]);

  const addChildSection = useCallback((projectId, parentSectionId) => {
    pushUndo();
    const newSection = {
      id: `sec-${Date.now()}`,
      title: "Untitled Section",
      spine: "",
      status: "brainstorm",
      children: [],
      paragraphs: [{ id: `p-${Date.now()}`, text: "", status: "brainstorm", spineRole: "claim", linkedTerms: [] }],
    };
    setProjects((prev) =>
      prev.map((p) =>
        p.id !== projectId ? p : {
          ...p,
          parts: updateSectionInParts(p.parts, parentSectionId, (s) => ({
            ...s,
            children: [...s.children, newSection],
          })),
        }
      )
    );
    setExpandedNodes((prev) => ({ ...prev, [parentSectionId]: true }));
    return newSection.id;
  }, [pushUndo]);

  const addChildSectionWithData = useCallback((projectId, parentSectionId, sectionData) => {
    pushUndo();
    setProjects((prev) =>
      prev.map((p) =>
        p.id !== projectId ? p : {
          ...p,
          parts: updateSectionInParts(p.parts, parentSectionId, (s) => ({
            ...s,
            children: [...s.children, sectionData],
          })),
        }
      )
    );
    setExpandedNodes((prev) => ({ ...prev, [parentSectionId]: true }));
    return sectionData.id;
  }, [pushUndo]);

  const deleteSection = useCallback((projectId, sectionId) => {
    pushUndo();
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p;
        return {
          ...p,
          parts: p.parts.map((part) => ({
            ...part,
            children: removeSectionFromChildren(part.children, sectionId),
          })),
        };
      })
    );
  }, [pushUndo]);

  /** Move a section from its current location to become a child of newParentId */
  const moveSection = useCallback((projectId, sectionId, newParentSectionId) => {
    pushUndo();
    if (sectionId === newParentSectionId) return; // can't move into itself
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p;
        // 1. Find and extract the section
        let extracted = null;
        const findAndExtract = (children) =>
          children.reduce((acc, child) => {
            if (child.id === sectionId) {
              extracted = child;
              return acc; // skip it (removes from current position)
            }
            const newChild = child.children?.length
              ? { ...child, children: findAndExtract(child.children) }
              : child;
            acc.push(newChild);
            return acc;
          }, []);

        const partsAfterRemoval = p.parts.map((part) => ({
          ...part,
          children: findAndExtract(part.children),
        }));

        if (!extracted) return p; // section not found

        // 2. Check we're not dropping into a descendant of the dragged section
        const isDescendant = (section, targetId) => {
          if (section.id === targetId) return true;
          return section.children?.some((c) => isDescendant(c, targetId)) || false;
        };
        if (isDescendant(extracted, newParentSectionId)) return p; // can't move into own descendant

        // 3. Insert into new parent
        const partsAfterInsert = partsAfterRemoval.map((part) => ({
          ...part,
          children: updateSectionInChildren(part.children, newParentSectionId, (s) => ({
            ...s,
            children: [...s.children, extracted],
          })),
        }));

        return { ...p, parts: partsAfterInsert };
      })
    );
    setExpandedNodes((prev) => ({ ...prev, [newParentSectionId]: true }));
  }, [pushUndo]);

  // ── Note mutations ─────────────────────────────────────────

  const addNote = useCallback((noteData) => {
    const now = Date.now();
    const newNote = {
      id: `n-${now}`,
      category: "idea",
      text: "",
      tags: [],
      linkedProjectId: null,
      linkedSectionId: null,
      linkedParagraphId: null,
      inlineRange: null,
      resolved: false,
      createdAt: now,
      updatedAt: now,
      ...noteData,
    };
    setNotes((prev) => [newNote, ...prev]);
    return newNote;
  }, []);

  const updateNote = useCallback((noteId, updates) => {
    setNotes((prev) =>
      prev.map((n) =>
        n.id !== noteId ? n : { ...n, ...updates, updatedAt: Date.now() }
      )
    );
  }, []);

  const deleteNote = useCallback((noteId) => {
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
  }, []);

  const resolveNote = useCallback((noteId) => {
    setNotes((prev) =>
      prev.map((n) =>
        n.id !== noteId ? n : { ...n, resolved: !n.resolved, updatedAt: Date.now() }
      )
    );
  }, []);

  // ── Other ──────────────────────────────────────────────────

  const addDecision = useCallback((text) => {
    setDecisionLog((prev) => [
      { id: Date.now(), date: new Date().toISOString(), text },
      ...prev,
    ]);
  }, []);

  const resetToDefaults = useCallback(() => {
    setProjects(DEFAULT_PROJECTS);
    setLinkedTerms(DEFAULT_LINKED_TERMS);
    setNotes(DEFAULT_NOTES);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(NOTES_KEY);
  }, []);

  return {
    projects, linkedTerms, activeProjectId, activeSectionId, expandedNodes,
    selectedTerm, rightPanel, showRightPanel, searchQuery, selectedPara,
    view, activeProject, activeSection, activePath, decisionLog,
    // Notes
    notes, sectionNotes, looseNotes, noteCountBySection,
    addNote, updateNote, deleteNote, resolveNote,
    // Setters
    setActiveProjectId, setActiveSectionId, setExpandedNodes, setSelectedTerm,
    setRightPanel, setShowRightPanel, setSearchQuery, setSelectedPara, setView,
    toggleNode, selectSection, selectTerm,
    updateSection, updateParagraphText, updateParagraphMeta,
    addParagraph, deleteParagraph, addChildSection, addChildSectionWithData, deleteSection, moveSection,
    addDecision, resetToDefaults,
    setProjects, setLinkedTerms, setNotes,
    saveStatus, zenMode, setZenMode, undo, redo,
  };
}

function removeSectionFromChildren(children, id) {
  return children
    .filter((c) => c.id !== id)
    .map((c) => ({
      ...c,
      children: c.children?.length ? removeSectionFromChildren(c.children, id) : c.children,
    }));
}
