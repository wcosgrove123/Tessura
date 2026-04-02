import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { scrollState } from "./scrollState.js";

const NODE_COUNT = 100;
const CONNECTION_DISTANCE = 2.2;

// Part-specific colors
const PART_COLORS = {
  2: new THREE.Color("#2D6B5A"),   // Part III: Temporal - green
  4: new THREE.Color("#2D6B5A"),   // Part V: Operators - green
  7: new THREE.Color("#6B3A6E"),   // Part VIII: Composition - purple
  8: new THREE.Color("#9E5A2A"),   // Part IX: Reference - brown
  9: new THREE.Color("#2A7A9E"),   // Part X: Open Questions - cyan
};
const DEFAULT_COLOR = new THREE.Color("#2D6B5A");

/**
 * NoemagraphBackground — Visible generative network for Parts II, V, VIII, IX, X.
 * Nodes drift in space with connecting lines forming a living mesh.
 * Reads from scrollState directly — no props needed.
 */
export default function NoemagraphBackground() {
  const pointsRef = useRef();
  const linesRef = useRef();
  const time = useRef(0);
  const currentColor = useRef(new THREE.Color("#2D6B5A"));

  // Generate initial node positions
  const { positions, velocities } = useMemo(() => {
    const positions = new Float32Array(NODE_COUNT * 3);
    const velocities = new Float32Array(NODE_COUNT * 3);
    for (let i = 0; i < NODE_COUNT; i++) {
      const x = (Math.random() - 0.5) * 10;
      const y = (Math.random() - 0.5) * 8;
      const z = (Math.random() - 0.5) * 4;
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      velocities[i * 3] = (Math.random() - 0.5) * 0.008;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.006;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.004;
    }
    return { positions, velocities };
  }, []);

  // Pre-allocate line geometry (max connections)
  const maxLines = NODE_COUNT * 4;
  const linePositions = useMemo(() => new Float32Array(maxLines * 6), []);
  const lineColors = useMemo(() => new Float32Array(maxLines * 6), []);

  const frameCount = useRef(0);

  useFrame((_, delta) => {
    // Check if this scene is relevant
    const pi = scrollState.activePartIndex;
    const prevPi = scrollState.prevPartIndex;
    const isNoemagraphPart = (idx) => idx === 2 || idx === 4 || idx >= 7;
    const shouldAnimate = isNoemagraphPart(pi) || (prevPi >= 0 && isNoemagraphPart(prevPi));
    if (!shouldAnimate || !pointsRef.current) return;

    time.current += delta;
    frameCount.current++;
    const t = time.current;

    // Smoothly transition color based on part index
    const targetColor = PART_COLORS[pi] || DEFAULT_COLOR;
    currentColor.current.lerp(targetColor, delta * 3);

    // Update point material color
    if (pointsRef.current.material) {
      pointsRef.current.material.color.copy(currentColor.current);
    }

    const pos = pointsRef.current.geometry.attributes.position.array;

    // Move nodes with organic drift
    for (let i = 0; i < NODE_COUNT; i++) {
      const i3 = i * 3;
      const speed = 0.8 + (i % 7) * 0.1;
      pos[i3] += velocities[i3] + Math.sin(t * 0.15 * speed + i * 0.7) * 0.003;
      pos[i3 + 1] += velocities[i3 + 1] + Math.cos(t * 0.12 * speed + i * 0.5) * 0.002;
      pos[i3 + 2] += velocities[i3 + 2] + Math.sin(t * 0.1 + i * 1.3) * 0.001;

      // Soft boundary
      for (let j = 0; j < 3; j++) {
        const bound = j === 2 ? 2 : j === 1 ? 4 : 5;
        if (Math.abs(pos[i3 + j]) > bound) {
          velocities[i3 + j] *= -0.5;
          pos[i3 + j] *= 0.98;
        }
      }
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;

    // Build connections (throttled to every 4th frame)
    if (linesRef.current && frameCount.current % 4 === 0) {
      let lineIdx = 0;
      const r = currentColor.current.r;
      const g = currentColor.current.g;
      const b = currentColor.current.b;

      for (let i = 0; i < NODE_COUNT && lineIdx < maxLines; i++) {
        const ix = pos[i * 3], iy = pos[i * 3 + 1], iz = pos[i * 3 + 2];
        for (let j = i + 1; j < NODE_COUNT && lineIdx < maxLines; j++) {
          const jx = pos[j * 3], jy = pos[j * 3 + 1], jz = pos[j * 3 + 2];
          const dx = ix - jx, dy = iy - jy, dz = iz - jz;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (dist < CONNECTION_DISTANCE) {
            const alpha = 1 - dist / CONNECTION_DISTANCE;
            const li = lineIdx * 6;
            linePositions[li] = ix;
            linePositions[li + 1] = iy;
            linePositions[li + 2] = iz;
            linePositions[li + 3] = jx;
            linePositions[li + 4] = jy;
            linePositions[li + 5] = jz;
            const c = alpha * 0.5;
            lineColors[li] = r * c;
            lineColors[li + 1] = g * c;
            lineColors[li + 2] = b * c;
            lineColors[li + 3] = r * c;
            lineColors[li + 4] = g * c;
            lineColors[li + 5] = b * c;
            lineIdx++;
          }
        }
      }

      // Zero out unused lines
      for (let k = lineIdx * 6; k < linePositions.length; k++) {
        linePositions[k] = 0;
        lineColors[k] = 0;
      }

      linesRef.current.geometry.attributes.position.needsUpdate = true;
      linesRef.current.geometry.attributes.color.needsUpdate = true;
      linesRef.current.geometry.setDrawRange(0, lineIdx * 2);
    }
  });

  return (
    <group>
      {/* Nodes */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={NODE_COUNT}
            array={positions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.08}
          color={DEFAULT_COLOR}
          transparent
          opacity={0.6}
          sizeAttenuation
          depthWrite={false}
        />
      </points>

      {/* Connection lines */}
      <lineSegments ref={linesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={maxLines * 2}
            array={linePositions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={maxLines * 2}
            array={lineColors}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial
          vertexColors
          transparent
          opacity={0.4}
          depthWrite={false}
        />
      </lineSegments>
    </group>
  );
}
