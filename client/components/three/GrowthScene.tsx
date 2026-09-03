"use client";

// GrowthScene — the homepage hero 3D layer ("growth lattice").
// A gently rippling particle grid, theme-aware: deep green on light surfaces,
// neon green in dark mode. PointsMaterial only — no shaders, models or
// postprocessing (see threejs-homepage-plan.md).

import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

function Lattice({
  cols,
  rows,
  color,
  opacity,
  speed,
}: {
  cols: number;
  rows: number;
  color: string;
  opacity: number;
  speed: number;
}) {
  const ref = useRef<THREE.Points>(null);
  const count = cols * rows;

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    let i = 0;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        arr[i * 3] = (x / (cols - 1) - 0.5) * 16;
        arr[i * 3 + 1] = (y / (rows - 1) - 0.5) * 8;
        arr[i * 3 + 2] = 0;
        i++;
      }
    }
    return arr;
  }, [count, cols, rows]);

  useFrame((state) => {
    const pts = ref.current;
    if (!pts) return;
    const t = state.clock.elapsedTime;
    pts.rotation.x = -0.42;
    pts.position.y = -0.4;
    if (speed === 0) return;
    const pos = pts.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      pos.setZ(
        i,
        Math.sin(x * 0.55 + t * 0.7 * speed) * 0.4 +
          Math.cos(y * 0.8 + t * 0.5 * speed) * 0.3,
      );
    }
    pos.needsUpdate = true;
    pts.position.x =
      (state.pointer.x * 0.3 - pts.position.x) * 0.04 + pts.position.x * 0.96;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={0.06}
        sizeAttenuation
        transparent
        opacity={opacity}
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
  return (
    <Canvas
      frameloop={paused ? "never" : "always"}
      dpr={[1, 1.75]}
      camera={{ position: [0, 0.5, 7.5], fov: 50 }}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      <Lattice
        cols={compact ? 30 : 44}
        rows={compact ? 16 : 24}
        color={theme === "dark" ? "#4CCB31" : "#013920"}
        opacity={theme === "dark" ? 0.5 : 0.22}
        speed={speed}
      />
    </Canvas>
  );
}
