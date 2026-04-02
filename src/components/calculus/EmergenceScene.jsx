import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Text, Billboard } from "@react-three/drei";
import * as THREE from "three";
import { damp } from "maath/easing";
import { EMERGENCE_LEVELS, subProgress, smoothstep, FONT_HEADING, FONT_MONO } from "./sceneUtils.js";
import { scrollState } from "./scrollState.js";

// 7 sections in Part VII
const sectionCount = 7;

/**
 * EmergenceScene — Part VII: Cognitive Emergence
 *
 * Vertical tower of glowing platforms: g -> i -> M -> theta -> Em -> kappa
 * Each level emerges as its section scrolls into view.
 * All progress-dependent properties set imperatively in useFrame.
 */
export default function EmergenceScene() {
  const groupRef = useRef();
  const time = useRef(0);
  const damped = useRef({ progress: 0 });

  // Refs for each level
  const platformRefs = useRef([]);
  const platformMatRefs = useRef([]);
  const glowRingRefs = useRef([]);
  const glowRingMatRefs = useRef([]);
  const beamRefs = useRef([]);
  const beamMatRefs = useRef([]);
  const burstRefs = useRef([]);
  const burstMatRefs = useRef([]);

  // Pre-create colors
  const levelColors = useMemo(() =>
    EMERGENCE_LEVELS.map(l => new THREE.Color(l.color)),
    []
  );

  // Pre-create burst particle positions for each level
  const burstPositions = useMemo(() => {
    return EMERGENCE_LEVELS.map(() => {
      const count = 50;
      const arr = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        arr[i * 3] = Math.cos(angle);
        arr[i * 3 + 1] = Math.random() * 0.5;
        arr[i * 3 + 2] = Math.sin(angle);
      }
      return arr;
    });
  }, []);

  useFrame((_, delta) => {
    const pi = scrollState.activePartIndex;
    const prevPi = scrollState.prevPartIndex;
    const shouldAnimate = pi === 6 || (prevPi === 6 && prevPi >= 0);
    if (!shouldAnimate) return;

    time.current += delta;
    const t = time.current;

    // Damp progress
    const rawProgress = pi === 6 ? scrollState.partProgress : (pi > 6 ? 1 : 0);
    damp(damped.current, "progress", rawProgress, 0.25, delta);
    const progress = damped.current.progress;

    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.1;
    }

    EMERGENCE_LEVELS.forEach((level, i) => {
      const threshold = (i + 1) / (sectionCount + 1);
      const isActive = progress >= threshold;
      const litProgress = smoothstep(0, 1, subProgress(progress, threshold, threshold + 0.12));
      const pulse = isActive ? 1 + Math.sin(t * 2 + i * 0.8) * 0.05 : 0;
      const scale = isActive ? 0.5 + litProgress * 0.15 + pulse * 0.05 : 0.2;

      // Platform disc
      const platform = platformRefs.current[i];
      const platMat = platformMatRefs.current[i];
      if (platform) {
        platform.scale.setScalar(scale);
      }
      if (platMat) {
        platMat.emissiveIntensity = isActive ? 0.5 + litProgress * 0.5 : 0.05;
        platMat.opacity = isActive ? 0.8 + litProgress * 0.2 : 0.15;
      }

      // Glow ring
      const glowRing = glowRingRefs.current[i];
      const glowMat = glowRingMatRefs.current[i];
      if (glowRing) {
        glowRing.visible = isActive;
        glowRing.scale.setScalar(0.6 + litProgress * 0.2);
      }
      if (glowMat) {
        glowMat.opacity = 0.2 * litProgress;
      }

      // Connecting beam
      const beam = beamRefs.current[i];
      const beamMat = beamMatRefs.current[i];
      if (beam) {
        beam.visible = isActive;
      }
      if (beamMat) {
        beamMat.opacity = 0.4 * litProgress;
      }

      // Burst particles
      const burst = burstRefs.current[i];
      const burstMat = burstMatRefs.current[i];
      if (burst) {
        const showBurst = isActive && litProgress < 0.8 && litProgress > 0;
        burst.visible = showBurst;
        if (showBurst) {
          burst.scale.setScalar(litProgress * 1.5 || 0.01);
        }
      }
      if (burstMat) {
        burstMat.opacity = Math.max(0, 0.7 - litProgress * 0.9);
      }
    });
  });

  return (
    <group ref={groupRef} position={[0, -2.5, 0]}>
      {EMERGENCE_LEVELS.map((level, i) => {
        const color = levelColors[i];
        const prevLevel = i > 0 && level.id !== "Em" ? EMERGENCE_LEVELS[i - 1] : null;
        const emTarget = level.id === "Em" ? EMERGENCE_LEVELS.find(l => l.id === "theta") : null;
        const connectTo = prevLevel || emTarget;

        return (
          <group key={level.id}>
            {/* Platform disc */}
            <group position={[level.x, level.y, 0]}>
              <mesh
                ref={el => platformRefs.current[i] = el}
                scale={0.2}
              >
                <cylinderGeometry args={[1, 0.85, 0.22, 32]} />
                <meshStandardMaterial
                  ref={el => platformMatRefs.current[i] = el}
                  color={color}
                  emissive={color}
                  emissiveIntensity={0.05}
                  roughness={0.4}
                  metalness={0.3}
                  transparent
                  opacity={0.15}
                />
              </mesh>

              {/* Glow ring */}
              <mesh
                ref={el => glowRingRefs.current[i] = el}
                rotation={[Math.PI / 2, 0, 0]}
                scale={0.6}
                visible={false}
              >
                <torusGeometry args={[1, 0.02, 8, 32]} />
                <meshBasicMaterial
                  ref={el => glowRingMatRefs.current[i] = el}
                  color={color}
                  transparent
                  opacity={0}
                />
              </mesh>

              {/* Symbol + Name labels */}
              <Billboard position={[0, 0, 0.5]}>
                <Text
                  position={[0, 0.25, 0]}
                  fontSize={0.25}
                  color={level.color}
                  anchorX="center"
                  anchorY="bottom"
                  font={FONT_HEADING}
                >
                  {level.symbol}
                </Text>
                <Text
                  position={[0, -0.05, 0]}
                  fontSize={0.1}
                  color="#A09580"
                  anchorX="center"
                  anchorY="top"
                  font={FONT_MONO}
                >
                  {level.label}
                </Text>
              </Billboard>
            </group>

            {/* Connecting beam to previous level */}
            {connectTo && (
              <group ref={el => beamRefs.current[i] = el} visible={false}>
                <line>
                  <bufferGeometry>
                    <bufferAttribute
                      attach="attributes-position"
                      count={2}
                      array={new Float32Array([
                        level.x, level.y - 0.1, 0,
                        connectTo.x, connectTo.y + 0.1, 0,
                      ])}
                      itemSize={3}
                    />
                  </bufferGeometry>
                  <lineBasicMaterial
                    ref={el => beamMatRefs.current[i] = el}
                    color={color}
                    transparent
                    opacity={0}
                  />
                </line>
              </group>
            )}

            {/* Burst particles */}
            <points
              ref={el => burstRefs.current[i] = el}
              position={[level.x, level.y, 0]}
              visible={false}
              scale={0.01}
            >
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  count={50}
                  array={burstPositions[i]}
                  itemSize={3}
                />
              </bufferGeometry>
              <pointsMaterial
                ref={el => burstMatRefs.current[i] = el}
                size={0.07}
                color={color}
                transparent
                opacity={0}
                sizeAttenuation
                depthWrite={false}
              />
            </points>
          </group>
        );
      })}
    </group>
  );
}
