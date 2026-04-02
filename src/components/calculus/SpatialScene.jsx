import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Text, Float, Billboard } from "@react-three/drei";
import * as THREE from "three";
import { damp } from "maath/easing";
import { SPATIAL_LAYERS, subProgress, smoothstep, FONT_MONO } from "./sceneUtils.js";
import { scrollState } from "./scrollState.js";

/**
 * SpatialScene — Part VI: Spatial Architecture
 *
 * Concentric transparent spheres drawing outward from center.
 * Each layer assembles as you scroll through the section.
 * All progress-dependent properties set imperatively in useFrame.
 */
export default function SpatialScene() {
  const groupRef = useRef();
  const time = useRef(0);
  const damped = useRef({ progress: 0 });

  // Refs for each layer's mesh, wireframe, and label
  const layerMeshRefs = useRef([]);
  const layerMatRefs = useRef([]);
  const wireMeshRefs = useRef([]);
  const wireMatRefs = useRef([]);
  const labelRefs = useRef([]);
  const particlesGroupRef = useRef();
  const particlesMatRef = useRef();

  // Pre-create colors
  const layerColors = useMemo(() =>
    SPATIAL_LAYERS.map(l => new THREE.Color(l.color)),
    []
  );

  useFrame((_, delta) => {
    const pi = scrollState.activePartIndex;
    const prevPi = scrollState.prevPartIndex;
    const shouldAnimate = pi === 5 || (prevPi === 5 && prevPi >= 0);
    if (!shouldAnimate) return;

    time.current += delta;

    // Damp progress
    const rawProgress = pi === 5 ? scrollState.partProgress : (pi > 5 ? 1 : 0);
    damp(damped.current, "progress", rawProgress, 0.25, delta);
    const progress = damped.current.progress;

    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.06;
    }

    // Update each layer imperatively
    SPATIAL_LAYERS.forEach((layer, i) => {
      const threshold = i / SPATIAL_LAYERS.length;
      const layerProgress = smoothstep(0, 1, subProgress(progress, threshold, threshold + 0.2));
      const scale = layerProgress * layer.radius;
      const isCore = i === 0;
      const scaleNorm = scale > 0.01 ? scale / layer.radius : 0;

      // Main sphere
      const mesh = layerMeshRefs.current[i];
      const mat = layerMatRefs.current[i];
      if (mesh) {
        mesh.visible = scale > 0.01;
        mesh.scale.setScalar(scaleNorm);
      }
      if (mat) {
        mat.opacity = layer.opacity * layerProgress;
      }

      // Wireframe
      const wireMesh = wireMeshRefs.current[i];
      const wireMat = wireMatRefs.current[i];
      if (wireMesh) {
        wireMesh.visible = !isCore && scale > 0.01;
        wireMesh.scale.setScalar(scaleNorm);
      }
      if (wireMat) {
        wireMat.opacity = Math.min(0.1, layer.opacity * 0.8) * layerProgress;
      }

      // Label
      const label = labelRefs.current[i];
      if (label) {
        label.visible = layerProgress > 0.3;
        if (label.visible) {
          const labelScale = scaleNorm;
          label.position.set(
            layer.radius * 0.7 * labelScale,
            layer.radius * 0.7 * labelScale,
            0
          );
        }
      }
    });

    // Perifield particles
    if (particlesGroupRef.current) {
      particlesGroupRef.current.visible = progress > 0.3;
    }
    if (particlesMatRef.current) {
      particlesMatRef.current.opacity = 0.3 * smoothstep(0.3, 0.6, progress);
    }
  });

  // Particle positions (static, computed once)
  const particlePositions = useMemo(() => {
    const count = 60;
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 0.6 + Math.random() * 0.8;
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, []);

  return (
    <Float speed={0.3} rotationIntensity={0.05} floatIntensity={0.2}>
      <group ref={groupRef}>
        {SPATIAL_LAYERS.map((layer, i) => {
          const color = layerColors[i];
          const isCore = i === 0;

          return (
            <group key={layer.id}>
              {/* Sphere shell */}
              <mesh
                ref={el => layerMeshRefs.current[i] = el}
                visible={false}
              >
                <sphereGeometry args={[layer.radius, 32, 32]} />
                <meshPhysicalMaterial
                  ref={el => layerMatRefs.current[i] = el}
                  color={color}
                  emissive={isCore ? color : undefined}
                  emissiveIntensity={isCore ? 0.6 : 0}
                  transmission={isCore ? 0 : 0.7}
                  roughness={isCore ? 0.4 : 0.1}
                  thickness={0.5}
                  transparent
                  opacity={0}
                  side={isCore ? THREE.FrontSide : THREE.DoubleSide}
                  depthWrite={false}
                />
              </mesh>

              {/* Wireframe for outer layers */}
              {!isCore && (
                <mesh
                  ref={el => wireMeshRefs.current[i] = el}
                  visible={false}
                >
                  <sphereGeometry args={[layer.radius, 16, 16]} />
                  <meshBasicMaterial
                    ref={el => wireMatRefs.current[i] = el}
                    color={color}
                    wireframe
                    transparent
                    opacity={0}
                  />
                </mesh>
              )}

              {/* Label */}
              <Billboard
                ref={el => labelRefs.current[i] = el}
                position={[0, 0, 0]}
                visible={false}
              >
                <Text
                  fontSize={0.12}
                  color={layer.color}
                  anchorX="left"
                  anchorY="middle"
                  fillOpacity={1}
                  font={FONT_MONO}
                >
                  {layer.id} {layer.label}
                </Text>
              </Billboard>
            </group>
          );
        })}

        {/* Particle traces inside perifield area */}
        <points ref={particlesGroupRef} visible={false}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={60}
              array={particlePositions}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial
            ref={particlesMatRef}
            size={0.03}
            color={new THREE.Color("#8B4513")}
            transparent
            opacity={0}
            sizeAttenuation
            depthWrite={false}
          />
        </points>
      </group>
    </Float>
  );
}
