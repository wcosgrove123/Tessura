import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Text, Billboard } from "@react-three/drei";
import * as THREE from "three";
import { damp } from "maath/easing";
import { AXIOM_NODES, subProgress, smoothstep, FONT_HEADING, FONT_MONO } from "./sceneUtils.js";
import { scrollState } from "./scrollState.js";

const AC_COLOR = new THREE.Color("#2D6B5A");
const CAUSAL_COLOR = new THREE.Color("#9E5A2A");
const DIM_COLOR = new THREE.Color("#A09580");
const EDGE_DIM_COLOR = new THREE.Color("#E2D9CB");

const sectionCount = 11;

// Map axiom index to section scroll position
const NODE_ACTIVATION = {};
const ORDER = ["A0", "A1", "A1.5", "A2", "A3", "A4", "C0", "C1", "C2"];
ORDER.forEach((id, i) => {
  NODE_ACTIVATION[id] = (i + 1) / sectionCount;
});

/**
 * AxiomWebScene — Part IV: The Axioms
 *
 * 9 axiom spheres connected by dependency edges.
 * Each node ignites as its section scrolls into view.
 * All progress-dependent properties set imperatively in useFrame.
 */
export default function AxiomWebScene() {
  const groupRef = useRef();
  const time = useRef(0);
  const damped = useRef({ progress: 0 });

  // Refs for each node's meshes and materials
  const nodeMeshRefs = useRef([]);
  const nodeMatRefs = useRef([]);
  const haloMeshRefs = useRef([]);
  const haloMatRefs = useRef([]);
  const labelRefs = useRef([]);

  // Refs for edges (buffer geometry approach)
  const edgeLinesRef = useRef();
  const edgeColorsRef = useRef();

  // Build edges from dependency data
  const edges = useMemo(() => {
    const result = [];
    for (const node of AXIOM_NODES) {
      for (const depId of node.deps) {
        const depNode = AXIOM_NODES.find(n => n.id === depId);
        if (depNode) {
          result.push({
            from: node.pos,
            to: depNode.pos,
            sourceId: node.id,
            targetId: depId,
            isCausal: node.id.startsWith("C") || depId.startsWith("C"),
          });
        }
      }
    }
    return result;
  }, []);

  // Pre-allocate edge buffer geometry
  const edgePositions = useMemo(() => new Float32Array(edges.length * 6), [edges.length]);
  const edgeColors = useMemo(() => new Float32Array(edges.length * 6), [edges.length]);

  // Initialize edge positions (static — endpoints don't move)
  useMemo(() => {
    edges.forEach((edge, i) => {
      const i6 = i * 6;
      edgePositions[i6] = edge.from[0];
      edgePositions[i6 + 1] = edge.from[1];
      edgePositions[i6 + 2] = edge.from[2];
      edgePositions[i6 + 3] = edge.to[0];
      edgePositions[i6 + 4] = edge.to[1];
      edgePositions[i6 + 5] = edge.to[2];
    });
  }, [edges, edgePositions]);

  useFrame((_, delta) => {
    // Check if this scene is relevant
    const pi = scrollState.activePartIndex;
    const prevPi = scrollState.prevPartIndex;
    const shouldAnimate = pi === 3 || (prevPi === 3 && prevPi >= 0);
    if (!shouldAnimate) return;

    time.current += delta;
    const t = time.current;

    // Damp the progress value
    const rawProgress = pi === 3 ? scrollState.partProgress : (pi > 3 ? 1 : 0);
    damp(damped.current, "progress", rawProgress, 0.25, delta);
    const progress = damped.current.progress;

    // Auto-rotate
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.08;
    }

    const allLit = progress > 0.9;

    // Update each node imperatively
    AXIOM_NODES.forEach((node, idx) => {
      const threshold = NODE_ACTIVATION[node.id] || 0;
      const isLit = progress >= threshold || allLit;
      const litProgress = smoothstep(0, 1, subProgress(progress, threshold, threshold + 0.08));
      const isCausal = node.id.startsWith("C");
      const pulseScale = allLit ? 1 + Math.sin(t * 2 + idx) * 0.08 : 1;
      const ignitionOvershoot = isLit && litProgress < 1 ? 1 + (1 - litProgress) * 0.4 : 1;
      const scale = isLit ? (0.18 + litProgress * 0.12) * pulseScale * ignitionOvershoot : 0.13;

      const mesh = nodeMeshRefs.current[idx];
      const mat = nodeMatRefs.current[idx];
      const haloMesh = haloMeshRefs.current[idx];
      const haloMat = haloMatRefs.current[idx];

      if (mesh) {
        mesh.scale.setScalar(scale);
      }
      if (mat) {
        if (isLit) {
          const baseColor = isCausal ? CAUSAL_COLOR : AC_COLOR;
          mat.color.copy(baseColor);
          mat.emissive.copy(baseColor);
          mat.emissiveIntensity = allLit ? 0.8 + Math.sin(t * 3) * 0.3 : 0.6 * litProgress;
          mat.wireframe = false;
          mat.opacity = 0.9;
        } else {
          mat.color.copy(DIM_COLOR);
          mat.emissive.copy(DIM_COLOR);
          mat.emissiveIntensity = 0.1;
          mat.wireframe = true;
          mat.opacity = 0.5;
        }
      }

      if (haloMesh) {
        haloMesh.visible = isLit;
        haloMesh.scale.setScalar(scale * 2.5);
      }
      if (haloMat) {
        haloMat.opacity = 0.08 * litProgress;
        const baseColor = isCausal ? CAUSAL_COLOR : AC_COLOR;
        haloMat.color.copy(baseColor);
      }
    });

    // Update edge colors/opacity imperatively
    if (edgeLinesRef.current) {
      edges.forEach((edge, i) => {
        const sourceThreshold = NODE_ACTIVATION[edge.sourceId] || 0;
        const targetThreshold = NODE_ACTIVATION[edge.targetId] || 0;
        const bothLit = (progress >= sourceThreshold && progress >= targetThreshold) || allLit;

        const color = bothLit
          ? (edge.isCausal ? CAUSAL_COLOR : AC_COLOR)
          : EDGE_DIM_COLOR;
        const opacity = bothLit ? (allLit ? 0.6 : 0.4) : 0.1;

        const i6 = i * 6;
        const r = color.r * opacity;
        const g = color.g * opacity;
        const b = color.b * opacity;
        edgeColors[i6] = r;
        edgeColors[i6 + 1] = g;
        edgeColors[i6 + 2] = b;
        edgeColors[i6 + 3] = r;
        edgeColors[i6 + 4] = g;
        edgeColors[i6 + 5] = b;
      });

      if (edgeLinesRef.current.geometry.attributes.color) {
        edgeLinesRef.current.geometry.attributes.color.needsUpdate = true;
      }
    }
  });

  return (
    <group ref={groupRef}>
      {/* Axiom nodes */}
      {AXIOM_NODES.map((node, idx) => {
        const isCausal = node.id.startsWith("C");

        return (
          <group key={node.id} position={node.pos}>
            {/* Node sphere — starts as wireframe, becomes solid when lit */}
            <mesh
              ref={el => nodeMeshRefs.current[idx] = el}
              scale={0.13}
            >
              <icosahedronGeometry args={[1, 2]} />
              <meshStandardMaterial
                ref={el => nodeMatRefs.current[idx] = el}
                color={DIM_COLOR}
                emissive={DIM_COLOR}
                emissiveIntensity={0.1}
                wireframe
                transparent
                opacity={0.5}
                roughness={0.3}
                metalness={0.2}
              />
            </mesh>

            {/* Glow halo */}
            <mesh
              ref={el => haloMeshRefs.current[idx] = el}
              visible={false}
              scale={0.13 * 2.5}
            >
              <sphereGeometry args={[1, 16, 16]} />
              <meshBasicMaterial
                ref={el => haloMatRefs.current[idx] = el}
                color={isCausal ? CAUSAL_COLOR : AC_COLOR}
                transparent
                opacity={0}
                side={THREE.BackSide}
              />
            </mesh>

            {/* Label */}
            <Billboard position={[0, 0.3, 0]}>
              <Text
                ref={el => labelRefs.current[idx] = el}
                fontSize={0.12}
                color={isCausal ? "#9E5A2A" : "#A09580"}
                anchorX="center"
                anchorY="bottom"
                font={FONT_HEADING}
              >
                {node.label}
              </Text>
            </Billboard>
          </group>
        );
      })}

      {/* Dependency edges — buffer geometry for imperative color updates */}
      <lineSegments ref={edgeLinesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={edges.length * 2}
            array={edgePositions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={edges.length * 2}
            array={edgeColors}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial
          vertexColors
          transparent
          opacity={1}
          depthWrite={false}
        />
      </lineSegments>
    </group>
  );
}
