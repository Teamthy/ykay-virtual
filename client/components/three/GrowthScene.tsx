"use client";

// GrowthScene — BOLD homepage hero 3D layer ("growth lattice").
// A large rippling particle wave that visibly sweeps across the hero, plus
// rising sparks. Theme-aware: deep green + neon accents on light surfaces,
// neon green on dark. PointsMaterial only — no shaders, models or
// postprocessing (see threejs-homepage-plan.md). speed=0 freezes to a full
// static composition for reduced-motion users.

import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

function Lattice({
  cols,
  rows,
  colors,
  opacity,
  speed,
}: {
  cols: number;
  rows: number;
  colors: string[];
  opacity: number;
  speed: number;
}) {
  const ref = useRef<THREE.Points>(null);
  const count = cols * rows;

  const { positions, vertexColors } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const vertexColors = new Float32Array(count * 3);
    const hex = colors.map((h) => new THREE.Color(h));
    let i = 0;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        positions[i * 3] = (x / (cols - 1) - 0.5) * 17;
        positions[i * 3 + 1] = (y / (rows - 1) - 0.5) * 9;
        positions[i * 3 + 2] = 0;
        const c = hex[i % hex.length];
        vertexColors[i * 3] = c.r;
        vertexColors[i * 3 + 1] = c.g;
        vertexColors[i * 3 + 2] = c.b;
        i++;
      }
    }
    return { positions, vertexColors };
  }, [count, cols, rows, colors]);

  useFrame((state) => {
    const pts = ref.current;
    if (!pts) return;
    const t = state.clock.elapsedTime;
    pts.rotation.x = -0.5;
    pts.position.y = -0.6;
    pts.position.x += (state.pointer.x * 0.8 - pts.position.x) * 0.05;
    if (speed === 0) return;
    const pos = pts.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const wave =
        Math.sin(x * 0.5 + t * 1.1 * speed) * 0.55 + Math.cos(y * 0.7 + t * 0.85 * speed) * 0.45;
      pos.setZ(i, wave);
    }
    pos.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[vertexColors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.095}
        vertexColors
        sizeAttenuation
        transparent
        opacity={opacity}
        depthWrite={false}
      />
    </points>
  );
}

function Sparks({ count, colors, speed }: { count: number; colors: string[]; speed: number }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 15;
      arr[i * 3 + 1] = Math.random() * 9 - 4.5;
      arr[i * 3 + 2] = Math.random() * 2.5;
    }
    return arr;
  }, [count]);
  const vertexColors = useMemo(() => {
    const arr = new Float32Array(count * 3);
    const hex = colors.map((h) => new THREE.Color(h));
    for (let i = 0; i < count; i++) {
      const c = hex[i % hex.length];
      arr[i * 3] = c.r;
      arr[i * 3 + 1] = c.g;
      arr[i * 3 + 2] = c.b;
    }
    return arr;
  }, [count, colors]);

  useFrame((_, delta) => {
    const pts = ref.current;
    if (!pts || speed === 0) return;
    const d = Math.min(delta, 0.05);
    const pos = pts.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      let y = pos.getY(i) + d * 1.6 * speed;
      if (y > 4.8) {
        y = -4.8;
        pos.setX(i, (Math.random() - 0.5) * 15);
      }
      pos.setY(i, y);
    }
    pos.needsUpdate = true;
  });

  return (
    <points ref={ref} position={[0, 0, 1]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[vertexColors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.14}
        vertexColors
        sizeAttenuation
        transparent
        opacity={0.95}
        depthWrite={false}
      />
    </points>
  );
}

export default function GrowthScene({
  paused,
  speed,
  theme,
  compact,
}: {
  paused: boolean;
  speed: number;
  theme: "light" | "dark";
  compact: boolean;
}) {
  const light = theme === "light";
  return (
    <Canvas
      frameloop={paused ? "never" : "always"}
      dpr={[1, 1.75]}
      camera={{ position: [0, 0.5, 7.5], fov: 50 }}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      <Lattice
        cols={compact ? 38 : 52}
        rows={compact ? 20 : 28}
        colors={light ? ["#013920", "#013920", "#0A4D32", "#4CCB31"] : ["#4CCB31", "#4CCB31", "#70F250", "#DFFFF2"]}
        opacity={light ? 0.55 : 0.8}
        speed={speed}
      />
      <Sparks
        count={compact ? 70 : 150}
        colors={light ? ["#4CCB31", "#0A4D32", "#70F250"] : ["#70F250", "#DFFFF2", "#4CCB31"]}
        speed={speed}
      />
    </Canvas>
  );
}
