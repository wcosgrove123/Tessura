import React, { useState, useCallback, useMemo, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Plus, LayoutTemplate, Wand2, ArrowDownUp, ArrowRightLeft,
  ZoomIn, Trash2, ChevronDown, Maximize2, Shapes,
} from "lucide-react";
import { PALETTE as P } from "../data/constants.js";
import { DIAGRAM_TYPES, createDiagram } from "../data/diagrams.js";
import { getLayoutForType, layoutRadial, createForceSimulation } from "../lib/diagramLayout.js";
import DiagramNode from "./DiagramNode.jsx";
import DiagramPropertiesPanel from "./DiagramPropertiesPanel.jsx";
import DiagramTemplates from "./DiagramTemplates.jsx";

const nodeTypes = { diagram: DiagramNode };

function DiagramCanvas({
  diagram,
  onUpdateDiagram,
  onDeleteDiagram,
  onAddDiagram,
  diagrams,
  projects,
  activeProjectId,
  onSelectSection,
  onSetView,
  onSelectDiagram,
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState(diagram?.nodes || []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(diagram?.edges || []);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showDiagramPicker, setShowDiagramPicker] = useState(false);
  const { fitView } = useReactFlow();
  const undoRef = useRef([]);
  const saveTimer = useRef(null);

  // Push node/edge state to undo stack
  const pushUndo = useCallback(() => {
    undoRef.current.push({ nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) });
    if (undoRef.current.length > 20) undoRef.current.shift();
  }, [nodes, edges]);

  // Sync nodes/edges when diagram changes
  React.useEffect(() => {
    if (diagram) {
      // Inject onLabelChange into node data for inline editing
      const enriched = (diagram.nodes || []).map((n) => ({
        ...n,
        data: { ...n.data, onLabelChange: handleLabelChange },
      }));
      setNodes(enriched);
      setEdges(diagram.edges || []);
    }
  }, [diagram?.id]);

  // Auto-save nodes/edges back to diagram on change
  const persistChanges = useCallback((newNodes, newEdges) => {
    if (!diagram) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      // Strip onLabelChange from persisted data
      const cleanNodes = (newNodes || nodes).map((n) => ({
        ...n,
        data: { ...n.data, onLabelChange: undefined },
      }));
      onUpdateDiagram(diagram.id, { nodes: cleanNodes, edges: newEdges || edges, updatedAt: Date.now() });
    }, 300);
  }, [diagram, nodes, edges, onUpdateDiagram]);

  // Persist on node/edge changes
  React.useEffect(() => {
    if (diagram && nodes.length > 0) persistChanges(nodes, edges);
  }, [nodes, edges]);

  const handleLabelChange = useCallback((nodeId, newLabel) => {
    setNodes((nds) => nds.map((n) => n.id === nodeId ? { ...n, data: { ...n.data, label: newLabel } } : n));
  }, [setNodes]);

  const onConnect = useCallback((params) => {
    pushUndo();
    setEdges((eds) => addEdge({
      ...params,
      type: "smoothstep",
      style: { stroke: "#D4C9B8", strokeWidth: 1.5 },
    }, eds));
  }, [setEdges, pushUndo]);

  const onNodeClick = useCallback((_, node) => {
    setSelectedNodeId(node.id);
    setSelectedEdgeId(null);
  }, []);

  const onEdgeClick = useCallback((_, edge) => {
    setSelectedEdgeId(edge.id);
    setSelectedNodeId(null);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
  }, []);

  const handleAddNode = useCallback(() => {
    pushUndo();
    const newNode = {
      id: `n-${Date.now()}`,
      type: "diagram",
      position: { x: 200 + Math.random() * 100, y: 200 + Math.random() * 100 },
      data: { label: "New Node", subtitle: "", color: P.ac, shape: "rounded", fontSize: 13, onLabelChange: handleLabelChange },
    };
    setNodes((nds) => [...nds, newNode]);
  }, [setNodes, pushUndo, handleLabelChange]);

  const handleDeleteNode = useCallback((nodeId) => {
    pushUndo();
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setSelectedNodeId(null);
  }, [setNodes, setEdges, pushUndo]);

  const handleDeleteEdge = useCallback((edgeId) => {
    pushUndo();
    setEdges((eds) => eds.filter((e) => e.id !== edgeId));
    setSelectedEdgeId(null);
  }, [setEdges, pushUndo]);

  const handleUpdateNode = useCallback((nodeId, updates) => {
    setNodes((nds) => nds.map((n) =>
      n.id !== nodeId ? n : { ...n, data: { ...n.data, ...updates } }
    ));
  }, [setNodes]);

  const handleUpdateEdge = useCallback((edgeId, updates) => {
    setEdges((eds) => eds.map((e) =>
      e.id !== edgeId ? e : { ...e, ...updates }
    ));
  }, [setEdges]);

  const handleAutoLayout = useCallback(() => {
    pushUndo();
    const type = diagram?.type || "hierarchy";
    const dir = diagram?.layout || "TB";
    const layoutFn = getLayoutForType(type);
    const result = type === "orrery" || type === "radial"
      ? layoutRadial(nodes, edges)
      : layoutFn(nodes, edges, dir);
    const enriched = result.nodes.map((n) => ({ ...n, data: { ...n.data, onLabelChange: handleLabelChange } }));
    setNodes(enriched);
    setTimeout(() => fitView({ padding: 0.2 }), 50);
  }, [nodes, edges, diagram, setNodes, fitView, pushUndo, handleLabelChange]);

  const handleDirectionToggle = useCallback(() => {
    if (!diagram) return;
    const newDir = diagram.layout === "TB" ? "LR" : "TB";
    onUpdateDiagram(diagram.id, { layout: newDir });
  }, [diagram, onUpdateDiagram]);

  const handleTemplateSelect = useCallback((templateNodes, templateEdges, type) => {
    pushUndo();
    const enriched = templateNodes.map((n) => ({ ...n, data: { ...n.data, onLabelChange: handleLabelChange } }));
    setNodes(enriched);
    setEdges(templateEdges);
    if (diagram) {
      onUpdateDiagram(diagram.id, { nodes: templateNodes, edges: templateEdges, type, updatedAt: Date.now() });
    }
    setShowTemplates(false);
    setTimeout(() => fitView({ padding: 0.2 }), 100);
  }, [diagram, onUpdateDiagram, setNodes, setEdges, fitView, pushUndo, handleLabelChange]);

  const handleUndo = useCallback(() => {
    if (undoRef.current.length === 0) return;
    const prev = undoRef.current.pop();
    const enriched = prev.nodes.map((n) => ({ ...n, data: { ...n.data, onLabelChange: handleLabelChange } }));
    setNodes(enriched);
    setEdges(prev.edges);
  }, [setNodes, setEdges, handleLabelChange]);

  // Keyboard shortcuts
  React.useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.key === "n" || e.key === "N") { handleAddNode(); return; }
      if (e.key === "t" || e.key === "T") { setShowTemplates(true); return; }
      if (e.key === "l" || e.key === "L") { handleAutoLayout(); return; }
      if (e.key === "f" || e.key === "F") { if (!e.ctrlKey) fitView({ padding: 0.2 }); return; }
      if ((e.key === "Delete" || e.key === "Backspace") && !e.ctrlKey) {
        if (selectedNodeId) handleDeleteNode(selectedNodeId);
        else if (selectedEdgeId) handleDeleteEdge(selectedEdgeId);
        return;
      }
      if (e.ctrlKey && e.key === "z") { e.preventDefault(); handleUndo(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedNodeId, selectedEdgeId, handleAddNode, handleAutoLayout, handleDeleteNode, handleDeleteEdge, handleUndo, fitView]);

  const selectedNode = selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) : null;
  const selectedEdge = selectedEdgeId ? edges.find((e) => e.id === selectedEdgeId) : null;

  if (!diagram) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        {/* Empty state */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, color: P.t3 }}>
          <Shapes size={48} strokeWidth={1} />
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, color: P.tm }}>No diagrams yet</div>
          <div style={{ fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", color: P.t3, textAlign: "center", maxWidth: 300 }}>
            Create a diagram to visualize concepts, hierarchies, and relationships in your thesis.
          </div>
          <button
            onClick={() => {
              const d = createDiagram({ projectId: activeProjectId });
              onAddDiagram(d);
            }}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 20px",
              background: P.ac, color: "#fff", border: "none", borderRadius: 6,
              fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", cursor: "pointer",
            }}
          >
            <Plus size={14} /> New Diagram
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "100%" }}>
      {/* Canvas area */}
      <div style={{ flex: 1, position: "relative" }}>
        {/* Floating toolbar */}
        <div style={{
          position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", zIndex: 10,
          display: "flex", gap: 4, padding: "4px 8px",
          background: "rgba(250,247,242,0.92)", backdropFilter: "blur(12px)",
          border: `1px solid ${P.bd}`, borderRadius: 8,
          boxShadow: "0 4px 20px rgba(44,36,24,0.08)",
        }}>
          {/* Diagram selector */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowDiagramPicker(!showDiagramPicker)}
              style={{
                display: "flex", alignItems: "center", gap: 4, padding: "5px 10px",
                background: "transparent", border: `1px solid ${P.bd}`, borderRadius: 4,
                color: P.tx, cursor: "pointer", fontSize: 11, fontFamily: "'Cormorant Garamond', serif", fontWeight: 600,
                maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}
            >
              {diagram.title} <ChevronDown size={10} />
            </button>
            {showDiagramPicker && (
              <div style={{
                position: "absolute", top: 32, left: 0, minWidth: 220,
                background: P.bg, border: `1px solid ${P.bd}`, borderRadius: 6,
                boxShadow: "0 8px 24px rgba(44,36,24,0.12)", zIndex: 20, maxHeight: 300, overflowY: "auto",
              }}>
                {diagrams.map((d) => (
                  <div
                    key={d.id}
                    onClick={() => { if (onSelectDiagram) onSelectDiagram(d.id); setShowDiagramPicker(false); }}
                    style={{
                      padding: "8px 12px", cursor: "pointer", fontSize: 12,
                      background: d.id === diagram.id ? P.sh : "transparent",
                      borderBottom: `1px solid ${P.bl}`,
                      fontFamily: "'Cormorant Garamond', serif",
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.background = P.sh)}
                    onMouseOut={(e) => (e.currentTarget.style.background = d.id === diagram.id ? P.sh : "transparent")}
                  >
                    <div style={{ fontWeight: 600, color: P.tx }}>{d.title}</div>
                    <div style={{ fontSize: 10, color: P.tf, fontFamily: "'IBM Plex Mono', monospace" }}>
                      {DIAGRAM_TYPES[d.type]?.label || d.type} · {d.nodes?.length || 0} nodes
                    </div>
                  </div>
                ))}
                <div
                  onClick={() => {
                    const d = createDiagram({ projectId: activeProjectId });
                    const created = onAddDiagram(d);
                    if (onSelectDiagram) onSelectDiagram(created?.id || d.id);
                    setShowDiagramPicker(false);
                  }}
                  style={{
                    padding: "8px 12px", cursor: "pointer", fontSize: 11,
                    color: P.ac, fontFamily: "'IBM Plex Mono', monospace",
                    display: "flex", alignItems: "center", gap: 4,
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.background = P.sh)}
                  onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <Plus size={11} /> New diagram
                </div>
              </div>
            )}
          </div>

          <div style={{ width: 1, background: P.bd, margin: "2px 4px" }} />

          <ToolbarBtn icon={LayoutTemplate} label="Templates" onClick={() => setShowTemplates(true)} />
          <ToolbarBtn icon={Wand2} label="Auto-layout" onClick={handleAutoLayout} />
          <ToolbarBtn
            icon={diagram.layout === "TB" ? ArrowDownUp : ArrowRightLeft}
            label={diagram.layout === "TB" ? "Top→Bottom" : "Left→Right"}
            onClick={handleDirectionToggle}
          />
          <ToolbarBtn icon={Plus} label="Add node" onClick={handleAddNode} />
          <ToolbarBtn icon={Maximize2} label="Fit view" onClick={() => fitView({ padding: 0.2 })} />

          {diagram.sectionId && (
            <>
              <div style={{ width: 1, background: P.bd, margin: "2px 4px" }} />
              <button
                onClick={() => {
                  onSelectSection(diagram.projectId, diagram.sectionId);
                  onSetView("editor");
                }}
                style={{
                  padding: "4px 8px", background: "transparent", border: `1px solid ${P.ac}30`,
                  borderRadius: 4, color: P.ac, cursor: "pointer", fontSize: 10,
                  fontFamily: "'IBM Plex Mono', monospace",
                }}
              >
                View in Editor →
              </button>
            </>
          )}
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          proOptions={{ hideAttribution: true }}
          style={{ background: P.bg }}
          defaultEdgeOptions={{ type: "smoothstep", style: { stroke: "#D4C9B8", strokeWidth: 1.5 } }}
          snapToGrid
          snapGrid={[10, 10]}
        >
          <Background color={P.bd} gap={20} size={1} />
          <Controls
            style={{ background: P.sf, border: `1px solid ${P.bd}`, borderRadius: 6 }}
            showInteractive={false}
          />
          <MiniMap
            nodeColor={(n) => n.data?.color || P.ac}
            style={{ background: P.sf, border: `1px solid ${P.bd}`, borderRadius: 6 }}
            maskColor="rgba(250,247,242,0.7)"
          />
        </ReactFlow>
      </div>

      {/* Properties panel */}
      <div style={{
        width: 260, borderLeft: `1px solid ${P.bd}`, background: P.sf,
        overflowY: "auto", flexShrink: 0,
      }}>
        <DiagramPropertiesPanel
          diagram={diagram}
          selectedNode={selectedNode}
          selectedEdge={selectedEdge}
          onUpdateDiagram={onUpdateDiagram}
          onUpdateNode={handleUpdateNode}
          onUpdateEdge={handleUpdateEdge}
          onDeleteNode={handleDeleteNode}
          onDeleteEdge={handleDeleteEdge}
          projects={projects}
          activeProjectId={activeProjectId}
        />
      </div>

      {/* Template picker modal */}
      {showTemplates && (
        <DiagramTemplates
          onSelect={handleTemplateSelect}
          onClose={() => setShowTemplates(false)}
        />
      )}
    </div>
  );
}

function ToolbarBtn({ icon: Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      title={label}
      style={{
        display: "flex", alignItems: "center", gap: 4, padding: "5px 8px",
        background: "transparent", border: "none", borderRadius: 4,
        color: P.tm, cursor: "pointer", fontSize: 10,
        fontFamily: "'IBM Plex Mono', monospace", transition: "all 0.15s",
      }}
      onMouseOver={(e) => { e.currentTarget.style.background = P.sh; e.currentTarget.style.color = P.tx; }}
      onMouseOut={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = P.tm; }}
    >
      <Icon size={12} />{label}
    </button>
  );
}

// Main export wraps in ReactFlowProvider
export default function DiagramBuilder(props) {
  const { diagrams = [], activeDiagramId } = props;
  const [currentDiagramId, setCurrentDiagramId] = useState(activeDiagramId || diagrams[0]?.id || null);

  // If activeDiagramId prop changes, follow it
  React.useEffect(() => {
    if (activeDiagramId) setCurrentDiagramId(activeDiagramId);
  }, [activeDiagramId]);

  // If no current diagram but diagrams exist, select first
  React.useEffect(() => {
    if (!currentDiagramId && diagrams.length > 0) {
      setCurrentDiagramId(diagrams[0].id);
    }
  }, [diagrams, currentDiagramId]);

  const diagram = diagrams.find((d) => d.id === currentDiagramId) || diagrams[0] || null;

  return (
    <ReactFlowProvider>
      <DiagramCanvas
        {...props}
        diagram={diagram}
        onSelectDiagram={setCurrentDiagramId}
        key={diagram?.id || "empty"}
      />
    </ReactFlowProvider>
  );
}
