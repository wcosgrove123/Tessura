import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Text, Billboard } from "@react-three/drei";
import * as THREE from "three";
import { lerp, FONT_HEADING } from "./sceneUtils.js";

const AC_COLOR = new THREE.Color("#2D6B5A");
const WARM_COLOR = new THREE.Color("#8B4513");
const PARTICLE_COUNT = 120;

/**
 * MomentSliceScene — Part III: Temporal Architecture
 *
 * A translucent 3D volume filled with noema particles.
 * A glowing plane (ω) slices through it as you scroll.
 * Particles near the slice plane glow brighter.
 */
export default function MomentSliceScene({ progress, active }) {
  const groupRef = useRef();
  const particlesRef = useRef();
  const time = useRef(0);

  // Particle positions — distributed inside the volume
  const { positions: particlePositions, baseY } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const baseY = new Float32Array(PARTICLE_COUNT);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 1.6;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 3.4;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 1.6;
      baseY[i] = positions[i * 3 + 1];
    }
    return { positions, baseY };
  }, []);

  // Particle colors — brighter near slice, dimmer far away
  const particleColors = useMemo(() => new Float32Array(PARTICLE_COUNT * 3), []);

  // Slice plane Y position
  const sliceY = lerp(-1.6, 1.6, progress);

  useFrame((_, delta) => {
    if (!active) return;
    time.current += delta;
    const t = time.current;

    // Gentle sway
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(t * 0.15) * 0.12;
    }

    // Update particle colors based on distance to slice
    if (particlesRef.current) {
      const pos = particlesRef.current.geometry.attributes.position.array;

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const i3 = i * 3;
        // Gentle drift
        pos[i3 + 1] = baseY[i] + Math.sin(t * 0.3 + i * 0.2) * 0.05;

        // Color: green/bright near slice, warm/dim far away
        const dist = Math.abs(pos[i3 + 1] - sliceY);
        const nearness = Math.max(0, 1 - dist / 0.8);

        particleColors[i3] = lerp(0.55, 0.18, nearness);
        particleColors[i3 + 1] = lerp(0.27, 0.42, nearness);
        particleColors[i3 + 2] = lerp(0.07, 0.35, nearness);
      }

      particlesRef.current.geometry.attributes.position.needsUpdate = true;
      particlesRef.current.geometry.attributes.color.needsUpdate = true;
    }
  });

  return (
    <group ref={groupRef}>
      {/* The volume — simplified glass (no transmission) */}
      <mesh>
        <boxGeometry args={[1.8, 3.6, 1.8]} />
        <meshStandardMaterial
          color="#E2D9CB"
          transparent
          opacity={0.12}
          roughness={0.2}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Warm core glow */}
      <mesh>
        <sphereGeometry args={[0.6, 12, 12]} />
        <meshBasicMaterial color={WARM_COLOR} transparent opacity={0.06} />
      </mesh>

      {/* The slice plane (ω) */}
      <group position={[0, sliceY, 0]}>
        <mesh>
          <planeGeometry args={[2.2, 2.2]} />
          <meshBasicMaterial
            color={AC_COLOR}
            transparent
            opacity={0.15}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Center glow */}
        <mesh>
          <circleGeometry args={[0.5, 24]} />
          <meshBasicMaterial
            color={AC_COLOR}
            transparent
            opacity={0.35}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Edge ring */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.05, 0.01, 6, 32]} />
          <meshBasicMaterial color={AC_COLOR} transparent opacity={0.5} />
        </mesh>

        {/* ω label */}
        <Billboard position={[1.3, 0, 0]}>
          <Text fontSize={0.2} color="#2D6B5A" anchorX="left" font={FONT_HEADING}>
            omega
          </Text>
        </Billboard>
      </group>

      {/* Noema particles */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={PARTICLE_COUNT}
            array={particlePositions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={PARTICLE_COUNT}
            array={particleColors}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.06}
          vertexColors
          transparent
          opacity={0.7}
          sizeAttenuation
          depthWrite={false}
        />
      </points>
    </group>
  );
}
