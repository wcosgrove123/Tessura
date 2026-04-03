import React, { useCallback, useRef, useEffect, useState } from "react";
import { PALETTE as P } from "./data/constants.js";
import useWorkspaceState from "./hooks/useWorkspaceState.js";
import TopBar from "./components/TopBar.jsx";
import Sidebar from "./components/Sidebar.jsx";
import Editor from "./components/Editor.jsx";
import ArgumentMap from "./components/ArgumentMap.jsx";
import CrossRefPanel from "./components/CrossRefPanel.jsx";
import Brainstorm from "./components/Brainstorm.jsx";
import CalculusView from "./components/CalculusView.jsx";
import DictionaryView from "./components/DictionaryView.jsx";
import DiagramBuilder from "./components/DiagramBuilder.jsx";
import { importDocxAsDocument } from "./components/DocImporter.jsx";
import PrintPreview from "./components/PrintPreview.jsx";

// ── Resize Handle ─────────────────────────────────────────

function ResizeHandle({ onDrag }) {
  const [dragging, setDragging] = useState(false);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setDragging(true);
    const startX = e.clientX;

    const handleMouseMove = (e2) => {
      onDrag(e2.clientX - startX, e2.clientX);
    };
    const handleMouseUp = () => {
      setDragging(false);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [onDrag]);

  return (
    <div
      onMouseDown={handleMouseDown}
      style={{
        width: 6, cursor: "col-resize", flexShrink: 0,
        position: "relative", zIndex: 5,
      }}
    >
      <div style={{
        position: "absolute", top: 0, bottom: 0, left: 2, width: 2, borderRadius: 1,
        background: dragging ? P.ac : P.bd,
        transition: dragging ? "none" : "background 0.2s",
      }} />
    </div>
  );
}

// ── Resizable Three-Panel Layout ──────────────────────────

function ResizableLayout({ zen, state }) {
  const SIDEBAR_DEFAULT = 268;
  const RIGHT_DEFAULT = 296;
  const SIDEBAR_MIN = 180;
  const SIDEBAR_MAX = 450;
  const RIGHT_MIN = 220;
  const RIGHT_MAX = 500;

  const [sidebarWidth, setSidebarWidth] = useState(() => {
    try { return parseInt(localStorage.getItem("tessera-sidebar-w")) || SIDEBAR_DEFAULT; } catch { return SIDEBAR_DEFAULT; }
  });
  const [rightWidth, setRightWidth] = useState(() => {
    try { return parseInt(localStorage.getItem("tessera-right-w")) || RIGHT_DEFAULT; } catch { return RIGHT_DEFAULT; }
  });

  // Persist widths
  const sidebarRef = useRef(sidebarWidth);
  const rightRef = useRef(rightWidth);
  sidebarRef.current = sidebarWidth;
  rightRef.current = rightWidth;

  useEffect(() => {
    const save = () => {
      localStorage.setItem("tessera-sidebar-w", String(sidebarRef.current));
      localStorage.setItem("tessera-right-w", String(rightRef.current));
    };
    window.addEventListener("beforeunload", save);
    return () => window.removeEventListener("beforeunload", save);
  }, []);

  const handleSidebarDrag = useCallback((delta, clientX) => {
    setSidebarWidth((prev) => Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, prev + delta)));
  }, []);

  const handleRightDrag = useCallback((delta, clientX) => {
    setRightWidth((prev) => Math.min(RIGHT_MAX, Math.max(RIGHT_MIN, prev - delta)));
  }, []);

  // Use a stable ref for drag so the closure always has current width
  const sidebarStartRef = useRef(0);
  const rightStartRef = useRef(0);

  const handleSidebarMouseDown = useCallback((e) => {
    e.preventDefault();
    sidebarStartRef.current = sidebarRef.current;
    const startX = e.clientX;
    const move = (e2) => {
      const delta = e2.clientX - startX;
      const next = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, sidebarStartRef.current + delta));
      setSidebarWidth(next);
    };
    const up = () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      localStorage.setItem("tessera-sidebar-w", String(sidebarRef.current));
    };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  const handleRightMouseDown = useCallback((e) => {
    e.preventDefault();
    rightStartRef.current = rightRef.current;
    const startX = e.clientX;
    const move = (e2) => {
      const delta = e2.clientX - startX;
      const next = Math.min(RIGHT_MAX, Math.max(RIGHT_MIN, rightStartRef.current - delta));
      setRightWidth(next);
    };
    const up = () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      localStorage.setItem("tessera-right-w", String(rightRef.current));
    };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
      {/* Sidebar */}
      {!zen && (
        <>
          <div style={{ width: sidebarWidth, flexShrink: 0, overflow: "hidden" }}>
            <Sidebar
              projects={state.projects}
              linkedTerms={state.linkedTerms}
              activeProjectId={state.activeProjectId}
              activeSectionId={state.activeSectionId}
              expandedNodes={state.expandedNodes}
              selectedTerm={state.selectedTerm}
              noteCountBySection={state.noteCountBySection}
              onToggle={state.toggleNode}
              onSelect={state.selectSection}
              onSelectTerm={state.selectTerm}
              onAddChild={state.addChildSection}
              onDeleteSection={state.deleteSection}
              onMoveSection={state.moveSection}
              onSetActiveProject={state.setActiveProjectId}
            />
          </div>
          <div onMouseDown={handleSidebarMouseDown} className="resize-handle" style={{
            width: 6, cursor: "col-resize", flexShrink: 0, position: "relative", zIndex: 5,
          }}>
            <div style={{ position: "absolute", top: 0, bottom: 0, left: 2, width: 2, borderRadius: 1, background: P.bd }} />
          </div>
        </>
      )}

      {/* Main content */}
      <div className="smooth-scroll" style={{ flex: 1, overflowY: "auto", background: P.bg }}>
        {state.view === "editor" ? (
          <Editor
            project={state.activeProject}
            section={state.activeSection}
            path={state.activePath}
            linkedTerms={state.linkedTerms}
            selectedPara={state.selectedPara}
            onSelectPara={state.setSelectedPara}
            onTermClick={state.selectTerm}
            onUpdateText={state.updateParagraphText}
            onUpdateMeta={state.updateParagraphMeta}
            onUpdateSection={state.updateSection}
            onAddParagraph={state.addParagraph}
            onDeleteParagraph={state.deleteParagraph}
            onAddChildSection={state.addChildSection}
            onSelectSection={state.selectSection}
            sectionNotes={state.sectionNotes}
            looseNotes={state.looseNotes}
            allNotes={state.notes}
            onAddNote={state.addNote}
            onUpdateNote={state.updateNote}
            onDeleteNote={state.deleteNote}
            onResolveNote={state.resolveNote}
            sources={state.sources}
            citations={state.citations}
            sectionCitations={state.sectionCitations}
            noteIndexMap={state.noteIndexMap}
            onAddSource={state.addSource}
            onUpdateSource={state.updateSource}
            onAddCitation={state.addCitation}
            onDeleteCitation={state.deleteCitation}
            zenMode={zen}
            onSetRightPanel={state.setRightPanel}
            onSetShowRightPanel={state.setShowRightPanel}
            sectionDiagrams={state.projectDiagrams}
            onEditDiagram={(diagramId) => {
              state.setActiveDiagramId(diagramId);
              state.setView("diagrams");
            }}
            onRemoveDiagram={(diagramId) => {
              state.updateDiagram(diagramId, { afterParagraphId: null, sectionId: null });
            }}
          />
        ) : state.view === "argmap" ? (
          <ArgumentMap
            projects={state.projects}
            linkedTerms={state.linkedTerms}
            onSelectSection={state.selectSection}
            onSelectTerm={state.selectTerm}
            onSetView={state.setView}
          />
        ) : state.view === "brainstorm" ? (
          <Brainstorm
            notes={state.notes}
            addNote={state.addNote}
            updateNote={state.updateNote}
            deleteNote={state.deleteNote}
            onNavigateToSection={(projectId, sectionId) => {
              state.selectSection(projectId, sectionId);
              state.setView("editor");
            }}
          />
        ) : state.view === "diagrams" ? (
          <DiagramBuilder
            diagrams={state.diagrams}
            projectDiagrams={state.projectDiagrams}
            activeDiagramId={state.activeDiagramId}
            onAddDiagram={state.addDiagram}
            onUpdateDiagram={state.updateDiagram}
            onDeleteDiagram={state.deleteDiagram}
            projects={state.projects}
            activeProjectId={state.activeProjectId}
            onSelectSection={state.selectSection}
            onSetView={state.setView}
          />
        ) : state.view === "calculus" ? (
          <CalculusView
            projects={state.projects}
            linkedTerms={state.linkedTerms}
            onSelectSection={state.selectSection}
            onSelectTerm={state.selectTerm}
            onSetView={state.setView}
          />
        ) : state.view === "dictionary" ? (
          <DictionaryView
            projects={state.projects}
            linkedTerms={state.linkedTerms}
            onSelectSection={state.selectSection}
            onSelectTerm={state.selectTerm}
            onSetView={state.setView}
          />
        ) : null}
      </div>

      {/* Right panel */}
      {!zen && (
        <>
          <div onMouseDown={handleRightMouseDown} className="resize-handle" style={{
            width: 6, cursor: "col-resize", flexShrink: 0, position: "relative", zIndex: 5,
          }}>
            <div style={{ position: "absolute", top: 0, bottom: 0, left: 2, width: 2, borderRadius: 1, background: P.bd }} />
          </div>
          <div style={{ width: rightWidth, flexShrink: 0, overflow: "hidden" }}>
            <CrossRefPanel
              projects={state.projects}
              linkedTerms={state.linkedTerms}
              selectedTerm={state.selectedTerm}
              rightPanel={state.rightPanel}
              showRightPanel={state.showRightPanel}
              activeProject={state.activeProject}
              activeSectionId={state.activeSectionId}
              sectionNotes={state.sectionNotes}
              looseNotes={state.looseNotes}
              project={state.activeProject}
              section={state.activeSection}
              onAddNote={state.addNote}
              onUpdateNote={state.updateNote}
              onDeleteNote={state.deleteNote}
              onSetRightPanel={state.setRightPanel}
              onSetShowRightPanel={state.setShowRightPanel}
              onSelectSection={state.selectSection}
              onSelectTerm={state.selectTerm}
              sources={state.sources}
              citations={state.citations}
              noteIndexMap={state.noteIndexMap}
              onUpdateSource={state.updateSource}
              onDeleteSource={state.deleteSource}
              onDeleteCitation={state.deleteCitation}
              onSelectPara={state.setSelectedPara}
              selectedPara={state.selectedPara}
            />
          </div>
        </>
      )}
    </div>
  );
}

export default function TesseraWorkspace() {
  const state = useWorkspaceState();
  const fileInputRef = useRef(null);

  const handleImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const doc = await importDocxAsDocument(file, state.linkedTerms);
      const newSection = {
        id: doc.id,
        title: doc.title,
        spine: doc.spine || "",
        status: doc.status,
        children: doc.children || [],
        paragraphs: doc.paragraphs,
      };

      // If a section is selected, import as its child subsection
      if (state.activeSectionId && state.activeSection) {
        state.addChildSectionWithData(state.activeProjectId, state.activeSectionId, newSection);
      } else {
        // Fallback: add to first part top-level
        state.setProjects((prev) =>
          prev.map((p) => {
            if (p.id !== state.activeProjectId) return p;
            const parts = [...p.parts];
            if (parts.length > 0) {
              parts[0] = {
                ...parts[0],
                children: [...parts[0].children, newSection],
              };
            }
            return { ...p, parts };
          })
        );
      }
      // Import extracted notes, linking them to the correct subsection
      if (doc.notes?.length > 0) {
        for (const note of doc.notes) {
          state.addNote({
            ...note,
            linkedProjectId: state.activeProjectId,
            // Use the note's own section ID if it was set during parsing,
            // otherwise fall back to the top-level imported section
            linkedSectionId: note.linkedSectionId || doc.id,
          });
        }
      }

      state.setActiveSectionId(doc.id);
      state.setView("editor");
    } catch (err) {
      console.error("Import failed:", err);
      alert("Failed to import document. Make sure it's a valid .docx file.");
    }
    e.target.value = "";
  }, [state]);

  // Keyboard shortcuts: Zen mode + Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Zen mode: Ctrl+Shift+F
      if (e.ctrlKey && e.shiftKey && e.key === "F") {
        e.preventDefault();
        state.setZenMode((z) => !z);
      }
      if (e.key === "Escape" && state.zenMode) {
        state.setZenMode(false);
      }
      // App-level undo/redo: only when NOT inside a TipTap editor
      if (e.ctrlKey && !e.shiftKey && e.key === "z") {
        const active = document.activeElement;
        const inEditor = active?.closest?.(".ProseMirror") || active?.classList?.contains("ProseMirror");
        if (!inEditor) {
          e.preventDefault();
          state.undo();
        }
      }
      if (e.ctrlKey && (e.key === "y" || (e.shiftKey && e.key === "Z"))) {
        const active = document.activeElement;
        const inEditor = active?.closest?.(".ProseMirror") || active?.classList?.contains("ProseMirror");
        if (!inEditor) {
          e.preventDefault();
          state.redo();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [state.zenMode, state.setZenMode, state.undo, state.redo]);

  const zen = state.zenMode;
  const [showPreview, setShowPreview] = useState(false);

  return (
    <div style={{
      height: "100vh", width: "100%", display: "flex", flexDirection: "column",
      background: P.bg, color: P.tx,
      fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 14, overflow: "hidden",
    }}>
      <link
        href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,500&family=IBM+Plex+Mono:wght@300;400;500&family=Spectral:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap"
        rel="stylesheet"
      />
      <input ref={fileInputRef} type="file" accept=".docx" style={{ display: "none" }} onChange={handleFileChange} />

      {!zen && (
        <TopBar
          searchQuery={state.searchQuery}
          setSearchQuery={state.setSearchQuery}
          view={state.view}
          setView={state.setView}
          projects={state.projects}
          linkedTerms={state.linkedTerms}
          notes={state.notes}
          sources={state.sources}
          onTermClick={state.selectTerm}
          onSelectDoc={state.selectSection}
          onImport={handleImport}
          onPreview={() => setShowPreview(true)}
          saveStatus={state.saveStatus}
          onZenMode={() => state.setZenMode(true)}
        />
      )}

      <ResizableLayout zen={zen} state={state} />

      {/* Zen mode exit button */}
      {zen && (
        <div
          onClick={() => state.setZenMode(false)}
          style={{
            position: "fixed", bottom: 20, right: 20, zIndex: 100,
            display: "flex", alignItems: "center", gap: 6,
            padding: "6px 14px", borderRadius: 6,
            background: P.tb, color: "#8A7E6E",
            fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: 1.5, textTransform: "uppercase",
            cursor: "pointer", opacity: 0.6, transition: "opacity 0.3s",
            border: `1px solid #50473A`,
          }}
          onMouseOver={(e) => (e.currentTarget.style.opacity = 1)}
          onMouseOut={(e) => (e.currentTarget.style.opacity = 0.4)}
          title="Exit zen mode (Ctrl+Shift+F or Escape)"
        >
          Exit Zen
        </div>
      )}

      {/* Print Preview overlay */}
      {showPreview && (
        <PrintPreview
          project={state.activeProject}
          linkedTerms={state.linkedTerms}
          sources={state.sources}
          citations={state.citations}
          noteIndexMap={state.noteIndexMap}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}
