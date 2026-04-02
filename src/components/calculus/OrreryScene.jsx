import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { damp } from "maath/easing";
import { subProgress, smoothstep } from "./sceneUtils.js";
import { scrollState } from "./scrollState.js";

// Simple noise function for breathing
function simpleNoise(t) {
  return Math.sin(t * 1.3) * 0.5 + Math.sin(t * 2.7) * 0.3 + Math.sin(t * 4.1) * 0.2;
}

// Vertex shader for nucleus
const nucleusVertexShader = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Fragment shader for nucleus with fresnel + glow
const nucleusFragmentShader = `
  uniform float time;
  uniform float breathIntensity;
  uniform vec3 glowColor;
  varying vec3 vNormal;
  varying vec3 vPosition;

  float hash(float n) { return fract(sin(n) * 43758.5453123); }
  float noise(float x) {
    float i = floor(x);
    float f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(hash(i), hash(i + 1.0), f);
  }

  void main() {
    vec3 viewDir = normalize(-vPosition);
    float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 3.0);

    float n = noise(time * 2.0 + vNormal.x * 3.0 + vNormal.y * 2.0);
    float glow = fresnel * breathIntensity + n * 0.15 * breathIntensity;

    vec3 baseColor = glowColor * 0.6;
    vec3 finalColor = mix(baseColor, glowColor, glow);
    float alpha = 0.7 + fresnel * 0.3 * breathIntensity;

    gl_FragColor = vec4(finalColor, alpha);
  }
`;

/**
 * OrreryScene — Parts I-II: Metacognitive Physics Visualization
 *
 * Progressive reveal of nucleus, gyroscope rings, exploration particles,
 * research beams, lightning bolts, and synthesis snake based on scroll progress.
 *
 * All progress-dependent properties are now set imperatively in useFrame
 * via refs — no React re-renders during scroll.
 */
export default function OrreryScene() {
  const groupRef = useRef();
  const nucleusMatRef = useRef();
  const ring0Ref = useRef();
  const ring1Ref = useRef();
  const ring2Ref = useRef();
  const ring0MatRef = useRef();
  const ring1MatRef = useRef();
  const ring2MatRef = useRef();
  const particlesRef = useRef();
  const particlesMatRef = useRef();
  const pointLightRef = useRef();
  const beamGroupRef = useRef();
  const lightningGroupRef = useRef();
  const snakeRef = useRef();

  // Mutable state refs
  const time = useRef(0);
  const beamTimer = useRef(0);
  const lightningTimer = useRef(0);
  const breathRef = useRef(1.0);

  // Damped progress (frame-rate independent via maath)
  const damped = useRef({ combined: 0 });

  // Particle velocities
  const particleVelocities = useRef(null);

  // Beam tracking: array of { mesh, direction, age, maxAge }
  const beamsRef = useRef([]);
  const BEAM_MAX = 6;

  // Lightning tracking: array of bolt objects
  const lightningsRef = useRef([]);
  // Impact glow tracking: array of { mesh, age, maxAge }
  const impactGlowsRef = useRef([]);
  const impactGlowGroupRef = useRef();

  const PARTICLE_COUNT = 150;

  // Particle texture via offscreen canvas
  const particleTexture = useMemo(() => {
    const size = 64;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    const gradient = ctx.createRadialGradient(
      size / 2, size / 2, 0,
      size / 2, size / 2, size / 2
    );
    gradient.addColorStop(0, "rgba(255, 255, 255, 1.0)");
    gradient.addColorStop(0.3, "rgba(255, 255, 255, 0.6)");
    gradient.addColorStop(0.7, "rgba(255, 255, 255, 0.15)");
    gradient.addColorStop(1, "rgba(255, 255, 255, 0.0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, []);

  // Initial particle positions on sphere shell
  const particlePositions = useMemo(() => {
    const arr = new Float32Array(PARTICLE_COUNT * 3);
    const vels = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 1.5 + Math.random() * 2.0;
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = r * Math.cos(phi);
      vels[i * 3] = (Math.random() - 0.5) * 0.02;
      vels[i * 3 + 1] = (Math.random() - 0.5) * 0.02;
      vels[i * 3 + 2] = (Math.random() - 0.5) * 0.02;
    }
    particleVelocities.current = vels;
    return arr;
  }, []);

  // Ring geometries
  const ringGeometry = useMemo(() => new THREE.TorusGeometry(4.0, 0.04, 16, 100), []);

  // Synthesis snake curve
  const snakeCurve = useMemo(() => {
    const points = [];
    const loops = 2;
    const totalPoints = 40;
    for (let i = 0; i < totalPoints; i++) {
      const t = i / totalPoints;
      const angle = t * Math.PI * 2 * loops;
      const radius = 2.5;
      const x = radius * Math.cos(angle);
      const y = Math.sin(t * Math.PI * 4) * 1.5;
      const z = radius * Math.sin(angle);
      points.push(new THREE.Vector3(x, y, z));
    }
    return new THREE.CatmullRomCurve3(points, true);
  }, []);

  const snakeTubeGeometry = useMemo(
    () => new THREE.TubeGeometry(snakeCurve, 150, 0.08, 8, true),
    [snakeCurve]
  );

  // Helper: generate lightning path with tapered jitter (more in middle, less at ends)
  function generateLightningPath(start, end, segments = 24) {
    const points = [];
    const dir = new THREE.Vector3().subVectors(end, start);
    const length = dir.length();
    dir.normalize();

    const up = Math.abs(dir.y) < 0.9
      ? new THREE.Vector3(0, 1, 0)
      : new THREE.Vector3(1, 0, 0);
    const perp1 = new THREE.Vector3().crossVectors(dir, up).normalize();
    const perp2 = new THREE.Vector3().crossVectors(dir, perp1).normalize();

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const basePoint = new THREE.Vector3().lerpVectors(start, end, t);
      if (i > 0 && i < segments) {
        // Tapered: max displacement in center, zero at endpoints
        const taper = Math.sin(t * Math.PI);
        const jitter = length * 0.12 * taper;
        basePoint.add(perp1.clone().multiplyScalar((Math.random() - 0.5) * jitter));
        basePoint.add(perp2.clone().multiplyScalar((Math.random() - 0.5) * jitter));
      }
      points.push(basePoint);
    }
    return points;
  }

  // Helper: generate a branch path forking from a main bolt point
  function generateBranch(forkPoint, mainDir, length) {
    const points = [forkPoint.clone()];
    const branchDir = new THREE.Vector3(
      mainDir.x + (Math.random() - 0.5) * 1.5,
      mainDir.y + (Math.random() - 0.5) * 1.5,
      mainDir.z + (Math.random() - 0.5) * 1.5,
    ).normalize();

    const up = Math.abs(branchDir.y) < 0.9
      ? new THREE.Vector3(0, 1, 0)
      : new THREE.Vector3(1, 0, 0);
    const perp1 = new THREE.Vector3().crossVectors(branchDir, up).normalize();
    const perp2 = new THREE.Vector3().crossVectors(branchDir, perp1).normalize();

    const segs = 6 + Math.floor(Math.random() * 4);
    for (let i = 1; i <= segs; i++) {
      const t = i / segs;
      const pt = forkPoint.clone().add(branchDir.clone().multiplyScalar(length * t));
      const taper = Math.sin(t * Math.PI) * 0.7;
      const jitter = length * 0.15 * taper;
      pt.add(perp1.clone().multiplyScalar((Math.random() - 0.5) * jitter));
      pt.add(perp2.clone().multiplyScalar((Math.random() - 0.5) * jitter));
      points.push(pt);
    }
    return points;
  }

  // Helper: create a tube mesh from a set of points
  function createBoltTube(points, color, radius) {
    const curve = new THREE.CatmullRomCurve3(points, false);
    const tubeGeom = new THREE.TubeGeometry(curve, points.length * 3, radius, 5, false);
    const tubeMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false, // Let Bloom pick it up
    });
    return new THREE.Mesh(tubeGeom, tubeMat);
  }

  // Helper: create impact glow sphere at a point
  function createImpactGlow(position, color) {
    const geom = new THREE.SphereGeometry(0.15, 12, 12);
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.copy(position);
    return mesh;
  }

  // Helper: get a random point on a ring
  function randomRingPoint() {
    const angle = Math.random() * Math.PI * 2;
    const ringIdx = Math.floor(Math.random() * 3);
    const r = 4.0;
    if (ringIdx === 0) return new THREE.Vector3(r * Math.cos(angle), r * Math.sin(angle), 0);
    if (ringIdx === 1) return new THREE.Vector3(r * Math.cos(angle), 0, r * Math.sin(angle));
    return new THREE.Vector3(0, r * Math.cos(angle), r * Math.sin(angle));
  }

  useFrame((state, delta) => {
    // Check if this scene is relevant
    const pi = scrollState.activePartIndex;
    const prevPi = scrollState.prevPartIndex;
    const shouldAnimate = pi <= 1 || (prevPi <= 1 && prevPi >= 0);
    if (!shouldAnimate) return;

    time.current += delta;
    const t = time.current;

    // Compute raw combined progress: Part I = 0-0.3, Part II = 0.3-1.0
    const rawCombined = pi === 0
      ? scrollState.partProgress * 0.3
      : pi === 1
        ? 0.3 + scrollState.partProgress * 0.7
        : (pi > 1 ? 1 : 0);

    // Frame-rate independent damping
    damp(damped.current, "combined", rawCombined, 0.25, delta);
    const cp = damped.current.combined;

    // Auto-rotate the whole group
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.15;
    }

    // Breathing intensity via noise
    const breath = 0.8 + simpleNoise(t * 1.2) * 0.4;
    breathRef.current = breath;

    // Update nucleus shader
    if (nucleusMatRef.current) {
      nucleusMatRef.current.uniforms.time.value = t;
      nucleusMatRef.current.uniforms.breathIntensity.value = breath;
    }

    // Update point light breathing
    if (pointLightRef.current) {
      pointLightRef.current.intensity = 2.5 + breath * 0.5;
    }

    // — Ring visibility, scale, opacity (imperatively) —
    const r0p = smoothstep(0, 1, subProgress(cp, 0.05, 0.18));
    const r1p = smoothstep(0, 1, subProgress(cp, 0.10, 0.23));
    const r2p = smoothstep(0, 1, subProgress(cp, 0.15, 0.28));

    if (ring0Ref.current) {
      ring0Ref.current.visible = r0p > 0.01;
      ring0Ref.current.scale.setScalar(r0p);
      ring0Ref.current.rotation.z += delta * 0.3;
    }
    if (ring0MatRef.current) {
      ring0MatRef.current.opacity = r0p * 0.7;
      ring0MatRef.current.emissiveIntensity = 0.4 + r0p * 0.4;
    }

    if (ring1Ref.current) {
      ring1Ref.current.visible = r1p > 0.01;
      ring1Ref.current.scale.setScalar(r1p);
      ring1Ref.current.rotation.y += delta * 0.25;
    }
    if (ring1MatRef.current) {
      ring1MatRef.current.opacity = r1p * 0.7;
      ring1MatRef.current.emissiveIntensity = 0.4 + r1p * 0.4;
    }

    if (ring2Ref.current) {
      ring2Ref.current.visible = r2p > 0.01;
      ring2Ref.current.scale.setScalar(r2p);
      ring2Ref.current.rotation.x += delta * 0.2;
    }
    if (ring2MatRef.current) {
      ring2MatRef.current.opacity = r2p * 0.7;
      ring2MatRef.current.emissiveIntensity = 0.4 + r2p * 0.4;
    }

    // — Particles visibility + opacity —
    const particleOpacity = smoothstep(0, 1, subProgress(cp, 0.2, 0.35)) * 0.7;
    if (particlesRef.current) {
      particlesRef.current.visible = cp > 0.2;
    }
    if (particlesMatRef.current) {
      particlesMatRef.current.opacity = particleOpacity;
    }

    // Exploration particles physics
    if (particlesRef.current && cp > 0.2 && particleVelocities.current) {
      const positions = particlesRef.current.geometry.attributes.position.array;
      const vels = particleVelocities.current;

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const i3 = i * 3;
        positions[i3] += vels[i3] * delta * 60;
        positions[i3 + 1] += vels[i3 + 1] * delta * 60;
        positions[i3 + 2] += vels[i3 + 2] * delta * 60;

        positions[i3] += Math.sin(t * 0.5 + i * 0.3) * 0.001;
        positions[i3 + 1] += Math.cos(t * 0.7 + i * 0.2) * 0.001;
        positions[i3 + 2] += Math.sin(t * 0.3 + i * 0.5) * 0.001;

        const dx = positions[i3];
        const dy = positions[i3 + 1];
        const dz = positions[i3 + 2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist < 1.3 && dist > 0.01) {
          const pushStr = 0.01 * (1.3 - dist);
          vels[i3] += (dx / dist) * pushStr;
          vels[i3 + 1] += (dy / dist) * pushStr;
          vels[i3 + 2] += (dz / dist) * pushStr;
        }

        if (dist > 3.9 && dist > 0.01) {
          const pullStr = 0.01 * (dist - 3.9);
          vels[i3] -= (dx / dist) * pullStr;
          vels[i3 + 1] -= (dy / dist) * pullStr;
          vels[i3 + 2] -= (dz / dist) * pullStr;
        }

        vels[i3] *= 0.999;
        vels[i3 + 1] *= 0.999;
        vels[i3 + 2] *= 0.999;
      }
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }

    // — Beams visibility + spawning —
    if (beamGroupRef.current) {
      beamGroupRef.current.visible = cp > 0.4;

      if (cp > 0.4) {
        beamTimer.current += delta;
        const beams = beamsRef.current;

        if (beamTimer.current > 1.5 && beams.length < BEAM_MAX) {
          beamTimer.current = 0;
          const dir = new THREE.Vector3(
            Math.random() - 0.5,
            Math.random() - 0.5,
            Math.random() - 0.5
          ).normalize();

          const geom = new THREE.CylinderGeometry(0.02, 0.02, 1, 8);
          geom.translate(0, 0.5, 0);
          const mat = new THREE.MeshStandardMaterial({
            color: new THREE.Color("#3B82F6"),
            emissive: new THREE.Color("#3B82F6"),
            emissiveIntensity: 1.0,
            metalness: 0.7,
            roughness: 0.3,
            transparent: true,
            opacity: 0.8,
          });
          const mesh = new THREE.Mesh(geom, mat);

          const quaternion = new THREE.Quaternion();
          quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
          mesh.quaternion.copy(quaternion);
          mesh.scale.set(1, 0.01, 1);

          beamGroupRef.current.add(mesh);
          beams.push({ mesh, direction: dir, age: 0, maxAge: 2.0 + Math.random() * 1.5 });
        }

        for (let i = beams.length - 1; i >= 0; i--) {
          const beam = beams[i];
          beam.age += delta;

          if (beam.age < beam.maxAge * 0.5) {
            const growProgress = beam.age / (beam.maxAge * 0.5);
            beam.mesh.scale.y = growProgress * 3.0;
          } else {
            const fadeProgress = (beam.age - beam.maxAge * 0.5) / (beam.maxAge * 0.5);
            beam.mesh.material.opacity = 0.8 * (1 - fadeProgress);
          }

          if (beam.age >= beam.maxAge) {
            beamGroupRef.current.remove(beam.mesh);
            beam.mesh.geometry.dispose();
            beam.mesh.material.dispose();
            beams.splice(i, 1);
          }
        }
      }
    }

    // — Lightning bolts (tube geometry with branching + impact glows) —
    if (lightningGroupRef.current) {
      lightningGroupRef.current.visible = cp > 0.6;

      if (cp > 0.6) {
        lightningTimer.current += delta;
        const bolts = lightningsRef.current;

        // Spawn new bolt every ~0.4s, max 8 active
        if (lightningTimer.current > 0.4 && bolts.length < 8) {
          lightningTimer.current = 0;

          // Critical (magenta) shoots UP from nucleus to ring
          // Reflection (gold) shoots DOWN from ring to nucleus
          const isCritical = Math.random() > 0.5;
          const color = isCritical ? "#E971FF" : "#FACC15";
          const ringPoint = randomRingPoint();
          const origin = new THREE.Vector3(0, 0, 0);
          // UP = nucleus → ring, DOWN = ring → nucleus
          const start = isCritical ? origin : ringPoint;
          const end = isCritical ? ringPoint : origin;

          // Main bolt tube
          const mainPoints = generateLightningPath(start, end, 24);
          const mainRadius = 0.018 + Math.random() * 0.014; // 0.018-0.032
          const mainTube = createBoltTube(mainPoints, color, mainRadius);
          lightningGroupRef.current.add(mainTube);

          const boltEntry = {
            meshes: [mainTube],
            age: 0,
            maxAge: 0.15 + Math.random() * 0.2, // 0.15-0.35s
            shimmerAge: 0,
            shimmerInterval: 0.06 + Math.random() * 0.04, // re-crackle every 60-100ms
            start, end, color, radius: mainRadius,
          };

          // Add 1-2 branches
          const branchCount = 1 + Math.floor(Math.random() * 2);
          const mainDir = new THREE.Vector3().subVectors(end, start).normalize();
          for (let b = 0; b < branchCount; b++) {
            // Fork from a random point 20-70% along the main path
            const forkIdx = Math.floor(mainPoints.length * (0.2 + Math.random() * 0.5));
            const forkPoint = mainPoints[forkIdx];
            const branchLen = 0.6 + Math.random() * 1.2;
            const branchPoints = generateBranch(forkPoint, mainDir, branchLen);
            const branchRadius = mainRadius * (0.4 + Math.random() * 0.3);
            const branchTube = createBoltTube(branchPoints, color, branchRadius);
            lightningGroupRef.current.add(branchTube);
            boltEntry.meshes.push(branchTube);
          }

          bolts.push(boltEntry);

          // Impact glow at the strike point
          if (impactGlowGroupRef.current) {
            const impactPos = isCritical ? ringPoint : origin;
            const glowMesh = createImpactGlow(impactPos, color);
            impactGlowGroupRef.current.add(glowMesh);
            impactGlowsRef.current.push({
              mesh: glowMesh, age: 0, maxAge: 0.25 + Math.random() * 0.15,
            });
          }
        }

        // Update existing bolts
        for (let i = bolts.length - 1; i >= 0; i--) {
          const bolt = bolts[i];
          bolt.age += delta;
          bolt.shimmerAge += delta;

          // Shimmer: regenerate path geometry periodically
          if (bolt.shimmerAge >= bolt.shimmerInterval && bolt.age < bolt.maxAge * 0.7) {
            bolt.shimmerAge = 0;
            // Regenerate main bolt path
            const newPoints = generateLightningPath(bolt.start, bolt.end, 24);
            const mainMesh = bolt.meshes[0];
            const oldGeom = mainMesh.geometry;
            const newCurve = new THREE.CatmullRomCurve3(newPoints, false);
            mainMesh.geometry = new THREE.TubeGeometry(newCurve, newPoints.length * 3, bolt.radius, 5, false);
            oldGeom.dispose();
          }

          // Fade out with exponential decay for snappy disappearance
          const life = bolt.age / bolt.maxAge;
          const fade = life < 0.3 ? 1.0 : Math.max(0, 1.0 - ((life - 0.3) / 0.7) ** 0.5);
          for (const mesh of bolt.meshes) {
            mesh.material.opacity = fade;
          }

          // Remove expired bolts
          if (bolt.age >= bolt.maxAge) {
            for (const mesh of bolt.meshes) {
              lightningGroupRef.current.remove(mesh);
              mesh.geometry.dispose();
              mesh.material.dispose();
            }
            bolts.splice(i, 1);
          }
        }
      }
    }

    // — Impact glows —
    if (impactGlowGroupRef.current) {
      impactGlowGroupRef.current.visible = cp > 0.6;
      const glows = impactGlowsRef.current;
      for (let i = glows.length - 1; i >= 0; i--) {
        const glow = glows[i];
        glow.age += delta;
        const life = glow.age / glow.maxAge;
        // Expand rapidly then fade
        const scale = 0.5 + life * 2.0;
        glow.mesh.scale.setScalar(scale);
        glow.mesh.material.opacity = Math.max(0, 0.9 * (1 - life * life));

        if (glow.age >= glow.maxAge) {
          impactGlowGroupRef.current.remove(glow.mesh);
          glow.mesh.geometry.dispose();
          glow.mesh.material.dispose();
          glows.splice(i, 1);
        }
      }
    }

    // — Snake opacity —
    if (snakeRef.current) {
      const snakeProgress = subProgress(cp, 0.85, 1.0);
      snakeRef.current.material.opacity = smoothstep(0, 1, snakeProgress);
      snakeRef.current.visible = snakeProgress > 0;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 8, 5]} intensity={1.2} />
      <pointLight
        ref={pointLightRef}
        position={[0, 0, 0]}
        color="#FFE6A0"
        intensity={2.5}
        distance={8}
      />

      {/* 1. Breathing Nucleus */}
      <mesh>
        <sphereGeometry args={[1.0, 64, 64]} />
        <shaderMaterial
          ref={nucleusMatRef}
          vertexShader={nucleusVertexShader}
          fragmentShader={nucleusFragmentShader}
          transparent
          uniforms={{
            time: { value: 0 },
            breathIntensity: { value: 1.0 },
            glowColor: { value: new THREE.Color("#FFE6A0") },
          }}
        />
      </mesh>

      {/* 2. Gyroscope Rings — always mounted, visibility set in useFrame */}
      <mesh ref={ring0Ref} geometry={ringGeometry} visible={false}>
        <meshStandardMaterial
          ref={ring0MatRef}
          color="#0EA5E9"
          emissive="#0EA5E9"
          emissiveIntensity={0.4}
          metalness={0.8}
          roughness={0.2}
          transparent
          opacity={0}
        />
      </mesh>

      <mesh ref={ring1Ref} geometry={ringGeometry} rotation={[Math.PI / 2, 0, 0]} visible={false}>
        <meshStandardMaterial
          ref={ring1MatRef}
          color="#EC4899"
          emissive="#EC4899"
          emissiveIntensity={0.4}
          metalness={0.8}
          roughness={0.2}
          transparent
          opacity={0}
        />
      </mesh>

      <mesh ref={ring2Ref} geometry={ringGeometry} rotation={[0, Math.PI / 2, 0]} visible={false}>
        <meshStandardMaterial
          ref={ring2MatRef}
          color="#A855F7"
          emissive="#A855F7"
          emissiveIntensity={0.4}
          metalness={0.8}
          roughness={0.2}
          transparent
          opacity={0}
        />
      </mesh>

      {/* 3. Exploration Particles — always mounted, visibility in useFrame */}
      <points ref={particlesRef} visible={false}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={PARTICLE_COUNT}
            array={particlePositions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          ref={particlesMatRef}
          size={0.15}
          color="#22C55E"
          map={particleTexture}
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          sizeAttenuation
        />
      </points>

      {/* 4. Research Beams container */}
      <group ref={beamGroupRef} visible={false} />

      {/* 5. Lightning Bolts container */}
      <group ref={lightningGroupRef} visible={false} />

      {/* 5b. Impact Glow container */}
      <group ref={impactGlowGroupRef} visible={false} />

      {/* 6. Synthesis Snake */}
      <mesh ref={snakeRef} geometry={snakeTubeGeometry} visible={false}>
        <meshStandardMaterial
          color="#FAB005"
          emissive="#FAB005"
          emissiveIntensity={1.0}
          metalness={0.5}
          roughness={0.3}
          transparent
          opacity={0}
        />
      </mesh>
    </group>
  );
}
