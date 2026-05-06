import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { ChevronRight, FileText, Link2, Plus, FolderOpen, Folder, BookOpen, Trash2, GripVertical } from "lucide-react";
import { PALETTE as P, STATUS } from "../data/constants.js";
import ConfirmModal from "./ConfirmModal.jsx";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core";
import {
  useSortable,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ── Sortable Section Node ─────────────────────────────────

function SortableSectionNode({
  section, depth, projectId, projectColor, activeSectionId, expandedNodes,
  noteCountBySection, onToggle, onSelect, onAddChild, onDeleteSection,
}) {
  const isActive = activeSectionId === section.id;
  const hasChildren = section.children?.length > 0;
  const hasParagraphs = section.paragraphs?.length > 0;
  const noteCount = noteCountBySection?.[section.id] || 0;
  const indent = 24 + depth * 16;
  const [hovered, setHovered] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({
    id: section.id,
    data: { type: "section", section, depth, projectId },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`sidebar-section-item${isActive ? " active" : ""}`}
        style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: `4px 12px 4px ${indent}px`,
          cursor: "pointer",
          background: isOver ? `${projectColor}15` : isActive ? `${projectColor}0C` : "transparent",
          borderLeft: isActive ? `2.5px solid ${projectColor}` : "2.5px solid transparent",
          borderTop: isOver ? `2px solid ${projectColor}60` : "2px solid transparent",
          minHeight: 30,
        }}
        onMouseOver={(e) => { if (!isActive && !isOver) e.currentTarget.style.background = P.sh; }}
        onMouseOut={(e) => { if (!isActive && !isOver) e.currentTarget.style.background = isOver ? `${projectColor}15` : isActive ? `${projectColor}0C` : "transparent"; }}
      >
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          style={{
            cursor: "grab", display: "flex", alignItems: "center", justifyContent: "center",
            opacity: hovered ? 0.5 : 0, transition: "opacity 0.18s ease",
            marginLeft: -8, flexShrink: 0, padding: "4px 2px", borderRadius: 3,
          }}
        >
          <GripVertical size={11} style={{ color: P.tf }} />
        </div>

        {hasChildren ? (
          <span onClick={(e) => { e.stopPropagation(); onToggle(section.id); }} style={{ display: "flex", alignItems: "center" }}>
            <ChevronRight size={11} className="chevron-toggle" style={{
              color: P.tf,
              transform: expandedNodes[section.id] ? "rotate(90deg)" : "rotate(0deg)",
            }} />
          </span>
        ) : (
          <span style={{ width: 11 }} />
        )}
        <span onClick={() => onSelect(projectId, section.id)} style={{ display: "flex", alignItems: "center", gap: 5, flex: 1, minWidth: 0, cursor: "pointer" }}>
          {hasChildren
            ? (expandedNodes[section.id] ? <FolderOpen size={11} style={{ color: P.tf }} /> : <Folder size={11} style={{ color: P.tf }} />)
            : <FileText size={11} style={{ color: P.tf }} />}
          <span style={{
            fontSize: depth < 2 ? 12 : 11,
            fontWeight: isActive ? 600 : (depth < 1 ? 500 : 400),
            color: isActive ? projectColor : P.tm,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {section.title}
          </span>
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          {hasParagraphs && (
            <span style={{ fontSize: 10, color: P.tf, fontFamily: "'IBM Plex Mono', monospace" }}>
              {section.paragraphs.length}¶
            </span>
          )}
          {noteCount > 0 && (
            <span style={{ fontSize: 10, color: "#8B4513", fontFamily: "'IBM Plex Mono', monospace", opacity: 0.7 }} title={`${noteCount} note${noteCount > 1 ? "s" : ""}`}>
              {noteCount}✎
            </span>
          )}
          {hovered && onDeleteSection && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteSection(projectId, section.id, section.title);
              }}
              title="Delete section"
              className="action-btn-danger"
              style={{
                background: "none", border: "none", cursor: "pointer", color: "#943D3D",
                padding: 5, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center",
                opacity: 0.6,
              }}
              onMouseOver={(e) => { e.currentTarget.style.opacity = 1; e.currentTarget.style.background = "#943D3D10"; }}
              onMouseOut={(e) => { e.currentTarget.style.opacity = 0.6; e.currentTarget.style.background = "none"; }}
            >
              <Trash2 size={11} />
            </button>
          )}
          <div style={{
            width: 6, height: 6, borderRadius: "50%",
            background: STATUS[section.status]?.text || P.tf, opacity: 0.5,
          }} />
        </div>
      </div>

      {expandedNodes[section.id] && hasChildren && (
        <>
          {section.children.map((child) => (
            <SortableSectionNode
              key={child.id}
              section={child}
              depth={depth + 1}
              projectId={projectId}
              projectColor={projectColor}
              activeSectionId={activeSectionId}
              expandedNodes={expandedNodes}
              noteCountBySection={noteCountBySection}
              onToggle={onToggle}
              onSelect={onSelect}
              onAddChild={onAddChild}
              onDeleteSection={onDeleteSection}
            />
          ))}
          <div
            onClick={() => onAddChild(projectId, section.id)}
            className="dashed-add-btn"
            style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: `3px 12px 3px ${indent + 16}px`,
              cursor: "pointer", opacity: 0.4,
            }}
            onMouseOver={(e) => { e.currentTarget.style.opacity = 0.8; e.currentTarget.style.background = P.sh; }}
            onMouseOut={(e) => { e.currentTarget.style.opacity = 0.4; e.currentTarget.style.background = "transparent"; }}
          >
            <Plus size={9} style={{ color: P.tf }} />
            <span style={{ fontSize: 10, color: P.tf, fontFamily: "'IBM Plex Mono', monospace" }}>Add subsection</span>
          </div>
        </>
      )}
    </div>
  );
}

// ── Drag overlay (what you see while dragging) ────────────

function DragOverlayContent({ section, projectColor }) {
  if (!section) return null;
  return (
    <div style={{
      padding: "8px 14px", background: P.bg,
      border: `1.5px solid ${projectColor}60`,
      borderRadius: 8, boxShadow: "0 12px 36px rgba(44,36,24,0.2)",
      fontSize: 12, color: P.tx, fontWeight: 500,
      display: "flex", alignItems: "center", gap: 6,
      maxWidth: 240, opacity: 0.95,
      transform: "rotate(1.5deg) scale(1.02)",
      cursor: "grabbing",
    }}>
      <GripVertical size={11} style={{ color: P.tf }} />
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {section.title}
      </span>
    </div>
  );
}

// ── Collect all visible section IDs for SortableContext ────

function collectVisibleIds(sections, expandedNodes) {
  const ids = [];
  for (const sec of sections) {
    ids.push(sec.id);
    if (expandedNodes[sec.id] && sec.children?.length) {
      ids.push(...collectVisibleIds(sec.children, expandedNodes));
    }
  }
  return ids;
}

function findSectionById(sections, id) {
  for (const sec of sections) {
    if (sec.id === id) return sec;
    if (sec.children?.length) {
      const found = findSectionById(sec.children, id);
      if (found) return found;
    }
  }
  return null;
}

// ── Main Sidebar ──────────────────────────────────────────

export default function Sidebar({
  projects, linkedTerms, activeProjectId, activeSectionId,
  expandedNodes, selectedTerm, noteCountBySection,
  onToggle, onSelect, onSelectTerm, onAddChild, onDeleteSection, onMoveSection, onSetActiveProject,
}) {
  const [confirmAction, setConfirmAction] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const scrollRef = useRef(null);
  const scrollPosRef = useRef(0);

  const handleDeleteRequest = useCallback((projectId, sectionId, sectionTitle) => {
    setConfirmAction({
      title: `Delete "${sectionTitle}"?`,
      message: "This section and all its content will be removed.",
      onConfirm: () => { onDeleteSection(projectId, sectionId); setConfirmAction(null); },
    });
  }, [onDeleteSection]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollPosRef.current;
    }
  }, [activeSectionId]);

  // Collect all visible section IDs across all projects for the sortable context
  const allVisibleIds = useMemo(() => {
    const ids = [];
    for (const project of projects) {
      if (expandedNodes[project.id]) {
        for (const part of project.parts || []) {
          if (expandedNodes[part.id]) {
            ids.push(...collectVisibleIds(part.children || [], expandedNodes));
          }
        }
      }
    }
    return ids;
  }, [projects, expandedNodes]);

  // Find the dragged section for the overlay
  const activeDragSection = useMemo(() => {
    if (!activeId) return null;
    for (const project of projects) {
      for (const part of project.parts || []) {
        const found = findSectionById(part.children || [], activeId);
        if (found) return { section: found, color: project.color };
      }
    }
    return null;
  }, [activeId, projects]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 }, // 5px movement before drag starts
    })
  );

  const handleDragStart = useCallback((event) => {
    setActiveId(event.active.id);
  }, []);

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;
    // Move the active section to become a child of the over section
    if (onMoveSection) {
      onMoveSection(activeProjectId, active.id, over.id);
    }
  }, [activeProjectId, onMoveSection]);

  return (
    <div ref={scrollRef} className="smooth-scroll" onScroll={(e) => { scrollPosRef.current = e.target.scrollTop; }} style={{ height: "100%", overflowY: "auto", background: P.sb, padding: "10px 0" }}>
      <div style={{ padding: "6px 16px 10px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: 2.5, textTransform: "uppercase", color: P.tf }}>
        Projects
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={allVisibleIds} strategy={verticalListSortingStrategy}>
          {projects.filter(p => p.id === "purpose-of-schools").map((project) => (
            <div key={project.id}>
              {/* Project header */}
              <div
                onClick={() => { onToggle(project.id); onSetActiveProject(project.id); }}
                style={{
                  display: "flex", alignItems: "center", gap: 7, padding: "8px 16px",
                  cursor: "pointer", transition: "background 0.15s",
                  background: activeProjectId === project.id ? `${project.color}0C` : "transparent",
                  borderLeft: activeProjectId === project.id ? `2.5px solid ${project.color}` : "2.5px solid transparent",
                }}
                onMouseOver={(e) => { if (activeProjectId !== project.id) e.currentTarget.style.background = P.sh; }}
                onMouseOut={(e) => { if (activeProjectId !== project.id) e.currentTarget.style.background = "transparent"; }}
              >
                <ChevronRight size={12} className="chevron-toggle" style={{
                  color: P.tf,
                  transform: expandedNodes[project.id] ? "rotate(90deg)" : "rotate(0deg)",
                }} />
                <span style={{ fontSize: 15 }}>{project.icon}</span>
                <span style={{
                  fontSize: 13, fontWeight: activeProjectId === project.id ? 600 : 400,
                  color: activeProjectId === project.id ? project.color : P.tm,
                }}>
                  {project.name}
                </span>
              </div>

              {/* Parts */}
              {expandedNodes[project.id] && project.parts?.map((part) => (
                <div key={part.id}>
                  <div
                    onClick={() => onToggle(part.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "6px 16px 6px 28px", cursor: "pointer",
                      transition: "background 0.15s",
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.background = P.sh)}
                    onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <ChevronRight size={10} className="chevron-toggle" style={{
                      color: P.tf,
                      transform: expandedNodes[part.id] ? "rotate(90deg)" : "rotate(0deg)",
                    }} />
                    <BookOpen size={10} style={{ color: project.color, opacity: 0.7 }} />
                    <span style={{
                      fontSize: 11, fontWeight: 600, color: project.color,
                      fontFamily: "'IBM Plex Mono', monospace", letterSpacing: 0.5,
                      textTransform: "uppercase",
                    }}>
                      {part.title}
                    </span>
                  </div>
                  {part.subtitle && expandedNodes[part.id] && (
                    <div style={{ padding: "0 16px 4px 54px", fontSize: 10, color: P.tf, fontStyle: "italic" }}>
                      {part.subtitle}
                    </div>
                  )}

                  {expandedNodes[part.id] && part.children?.map((section) => (
                    <SortableSectionNode
                      key={section.id}
                      section={section}
                      depth={0}
                      projectId={project.id}
                      projectColor={project.color}
                      activeSectionId={activeSectionId}
                      expandedNodes={expandedNodes}
                      noteCountBySection={noteCountBySection}
                      onToggle={onToggle}
                      onSelect={onSelect}
                      onAddChild={onAddChild}
                      onDeleteSection={handleDeleteRequest}
                    />
                  ))}
                </div>
              ))}
            </div>
          ))}
        </SortableContext>

        <DragOverlay dropAnimation={null}>
          {activeDragSection && (
            <DragOverlayContent
              section={activeDragSection.section}
              projectColor={activeDragSection.color}
            />
          )}
        </DragOverlay>
      </DndContext>

      {/* Linked Terms */}
      <div style={{ marginTop: 16, borderTop: `1px solid ${P.bd}`, paddingTop: 10 }}>
        <div style={{ padding: "6px 16px 8px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: 2.5, textTransform: "uppercase", color: P.tf, display: "flex", alignItems: "center", gap: 6 }}>
          <Link2 size={10} /> Linked Terms
        </div>
        {Object.entries(linkedTerms).map(([t, d]) => (
          <div
            key={t}
            onClick={() => onSelectTerm(t)}
            style={{
              display: "flex", alignItems: "center", gap: 7, padding: "4px 16px",
              cursor: "pointer", transition: "background 0.15s",
              background: selectedTerm === t ? `${d.color}10` : "transparent",
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = `${d.color}0C`)}
            onMouseOut={(e) => { if (selectedTerm !== t) e.currentTarget.style.background = "transparent"; }}
          >
            <span style={{ fontFamily: "serif", fontSize: 14, color: d.color, width: 18, textAlign: "center", fontStyle: "italic" }}>{d.symbol}</span>
            <span style={{ fontSize: 12, color: selectedTerm === t ? d.color : P.tm, fontWeight: selectedTerm === t ? 600 : 400 }}>{t}</span>
            <span style={{ marginLeft: "auto", fontSize: 10, color: P.tf, fontFamily: "'IBM Plex Mono', monospace" }}>{d.refs.length}</span>
          </div>
        ))}
      </div>
      <ConfirmModal
        open={!!confirmAction}
        title={confirmAction?.title || ""}
        message={confirmAction?.message || ""}
        danger={true}
        confirmLabel="Delete"
        onConfirm={confirmAction?.onConfirm || (() => setConfirmAction(null))}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
