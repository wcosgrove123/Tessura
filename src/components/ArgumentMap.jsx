import React, { useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { PALETTE as P, STATUS } from "../data/constants.js";

function ProjectNode({ data }) {
  return (
    <div style={{
      background: P.sf, border: `2px solid ${data.color}`, borderRadius: 10,
      padding: "12px 16px", minWidth: 160,
      boxShadow: "0 4px 16px rgba(44,36,24,0.08)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 16 }}>{data.icon}</span>
        <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 14, color: data.color, fontWeight: 600 }}>
          {data.label}
        </span>
      </div>
    </div>
  );
}

function PartNode({ data }) {
  return (
    <div style={{
      background: `${data.color}08`, border: `1.5px solid ${data.color}30`,
      borderRadius: 6, padding: "6px 12px",
    }}>
      <span style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", color: data.color, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>
        {data.label}
      </span>
    </div>
  );
}

function SectionNode({ data }) {
  return (
    <div onClick={data.onClick}
      style={{
        background: P.bg, border: `1px solid ${data.projectColor}30`,
        borderRadius: 6, padding: "8px 12px", minWidth: 120, maxWidth: 180,
        cursor: "pointer", transition: "all 0.2s",
        boxShadow: "0 1px 4px rgba(44,36,24,0.04)",
      }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, marginBottom: 2 }}>
        <span style={{ fontSize: 11, fontWeight: 500, color: P.tx, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {data.label}
        </span>
        <span style={{
          fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", flexShrink: 0,
          color: STATUS[data.status]?.text, padding: "1px 4px", borderRadius: 2,
          background: STATUS[data.status]?.bg,
        }}>
          {STATUS[data.status]?.l}
        </span>
      </div>
      {data.paraCount > 0 && (
        <span style={{ fontSize: 10, color: P.tf, fontFamily: "'IBM Plex Mono', monospace" }}>
          {data.paraCount}¶{data.childCount > 0 ? ` · ${data.childCount} sub` : ""}
        </span>
      )}
    </div>
  );
}

function TermNode({ data }) {
  return (
    <div onClick={data.onClick}
      style={{
        background: `${data.color}08`, border: `1px solid ${data.color}30`,
        borderRadius: 16, padding: "5px 12px", cursor: "pointer",
        display: "flex", alignItems: "center", gap: 6,
      }}>
      <span style={{ fontFamily: "serif", fontSize: 14, color: data.color, fontStyle: "italic" }}>{data.symbol}</span>
      <span style={{ fontSize: 10, fontWeight: 600, color: data.color }}>{data.label}</span>
    </div>
  );
}

const nodeTypes = { project: ProjectNode, part: PartNode, section: SectionNode, term: TermNode };

function countParas(section) {
  let count = section.paragraphs?.length || 0;
  for (const child of section.children || []) count += countParas(child);
  return count;
}

function buildGraph(projects, linkedTerms, onSelectSection, onSelectTerm, onSetView) {
  const nodes = [];
  const edges = [];

  // Layout: projects as columns, parts as rows within each column
  // Use a horizontal-first layout with tight spacing
  let globalX = 0;

  projects.forEach((project) => {
    const projectNodeId = project.id;
    const colStart = globalX;

    nodes.push({
      id: projectNodeId, type: "project",
      position: { x: colStart, y: 0 },
      data: { label: project.name, color: project.color, icon: project.icon },
      draggable: true,
    });

    let partY = 60;

    project.parts.forEach((part) => {
      const partNodeId = `${project.id}--${part.id}`;
      nodes.push({
        id: partNodeId, type: "part",
        position: { x: colStart, y: partY },
        data: { label: part.title, color: project.color },
        draggable: true,
      });
      edges.push({
        id: `e-${projectNodeId}-${partNodeId}`,
        source: projectNodeId, target: partNodeId,
        style: { stroke: `${project.color}50`, strokeWidth: 1.5 },
        type: "smoothstep",
      });

      // Layout top-level sections in a grid (3 columns within each part)
      const cols = 3;
      const colWidth = 200;
      const rowHeight = 70;
      let sectionY = partY + 40;

      part.children.forEach((section, si) => {
        const col = si % cols;
        const row = Math.floor(si / cols);
        const secNodeId = `${project.id}--${section.id}`;

        nodes.push({
          id: secNodeId, type: "section",
          position: { x: colStart + col * colWidth, y: sectionY + row * rowHeight },
          data: {
            label: section.title, status: section.status,
            projectColor: project.color,
            paraCount: countParas(section),
            childCount: section.children?.length || 0,
            onClick: () => { onSelectSection(project.id, section.id); onSetView("editor"); },
          },
          draggable: true,
        });
        edges.push({
          id: `e-${partNodeId}-${secNodeId}`,
          source: partNodeId, target: secNodeId,
          style: { stroke: `${project.color}30`, strokeWidth: 1 },
          type: "smoothstep",
        });

        // Add child sections as smaller nodes
        section.children?.forEach((child, ci) => {
          const childNodeId = `${project.id}--${child.id}`;
          const childCol = ci % 2;
          const childRow = Math.floor(ci / 2);
          nodes.push({
            id: childNodeId, type: "section",
            position: {
              x: colStart + col * colWidth + childCol * 100 + 10,
              y: sectionY + row * rowHeight + 60 + childRow * 50,
            },
            data: {
              label: child.title, status: child.status,
              projectColor: project.color,
              paraCount: countParas(child),
              childCount: child.children?.length || 0,
              onClick: () => { onSelectSection(project.id, child.id); onSetView("editor"); },
            },
            draggable: true,
          });
          edges.push({
            id: `e-${secNodeId}-${childNodeId}`,
            source: secNodeId, target: childNodeId,
            style: { stroke: `${project.color}20`, strokeWidth: 0.8 },
            type: "smoothstep",
          });
        });

        // Update sectionY for child rows
        const childRows = Math.ceil((section.children?.length || 0) / 2);
        if (childRows > 0) {
          sectionY += childRows * 50 + 20;
        }
      });

      const totalRows = Math.ceil(part.children.length / cols);
      const maxChildRows = part.children.reduce((max, s) => Math.max(max, Math.ceil((s.children?.length || 0) / 2)), 0);
      partY = sectionY + totalRows * rowHeight + maxChildRows * 50 + 40;
    });

    globalX += 3 * 200 + 80; // Move to next project column (3 cols * 200px + gap)
  });

  // Terms row at bottom - horizontal
  const termY = Math.max(...nodes.map((n) => n.position.y)) + 80;
  const termsPerRow = Math.min(Object.keys(linkedTerms).length, 8);
  Object.entries(linkedTerms).forEach(([term, data], ti) => {
    const termId = `term--${term}`;
    nodes.push({
      id: termId, type: "term",
      position: { x: (ti % termsPerRow) * 160, y: termY + Math.floor(ti / termsPerRow) * 50 },
      data: {
        label: term, symbol: data.symbol, color: data.color,
        onClick: () => { onSelectTerm(term); onSetView("editor"); },
      },
      draggable: true,
    });
  });

  return { nodes, edges };
}

export default function ArgumentMap({ projects, linkedTerms, onSelectSection, onSelectTerm, onSetView }) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => buildGraph(projects, linkedTerms, onSelectSection, onSelectTerm, onSetView),
    [projects, linkedTerms, onSelectSection, onSelectTerm, onSetView]
  );

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <ReactFlow
        nodes={nodes} edges={edges}
        onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes} fitView fitViewOptions={{ padding: 0.2 }}
        minZoom={0.15} maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background color={P.bd} gap={20} size={1} />
        <Controls style={{ background: P.sf, border: `1px solid ${P.bd}`, borderRadius: 6 }} showInteractive={false} />
        <MiniMap
          style={{ background: P.sf, border: `1px solid ${P.bd}`, borderRadius: 6 }}
          nodeColor={(n) => n.data?.color || n.data?.projectColor || P.bd}
          maskColor={`${P.bg}90`}
          pannable zoomable
        />
      </ReactFlow>
    </div>
  );
}
