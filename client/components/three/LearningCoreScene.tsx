"use client";

// LearningCoreScene — the YK-Virtual homepage hero 3D layer ("learning core").
//
// A large, slowly rotating wireframe icosahedron sits at the centre. Node
// spheres orbit around it and are joined to the core (and to near neighbours)
// by lines that are rebuilt every frame, so the structure reads as a living
// knowledge graph. A few slab "books" bob gently in the background.
//
// Theme-aware: deep brand navy + neon accents on light surfaces, neon green on
// dark. Mouse-look is a soft lerp of the camera toward the pointer.
// speed = 0 freezes everything into a composed static pose (reduced motion).
// Geometry and standard materials only — no shaders, models or postprocessing
// (see threejs-homepage-plan.md).

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

type Palette = {
  wire: string;
  nodes: string[];
  links: string;
  slab: string;
  linkOpacity: number;
  wireOpacity: number;
};

const LIGHT: Palette = {
  wire: "#013920",
  nodes: ["#4CCB31", "#70F250", "#013920"],
  links: "#0A4D32",
  slab: "#013920",
  linkOpacity: 0.3,
  wireOpacity: 0.4,
};

const DARK: Palette = {
  wire: "#4CCB31",
  nodes: ["#70F250", "#DFFFF2", "#4CCB31"],
  links: "#4CCB31",
  slab: "#70F250",
  linkOpacity: 0.4,
  wireOpacity: 0.55,
};

/** Camera drifts toward the pointer; disabled when speed is 0. */
function MouseLook({ speed }: { speed: number }) {
  const { camera, pointer } = useThree();
  useFrame(() => {
    if (speed === 0) return;
    camera.position.x += (pointer.x * 1.5 - camera.position.x) * 0.04;
    camera.position.y += (0.4 + pointer.y * 0.9 - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

function Core({
  palette,
  speed,
  radius,
}: {
  palette: Palette;
  speed: number;
  radius: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (!ref.current || speed === 0) return;
    ref.current.rotation.y += delta * 0.09 * speed;
    ref.current.rotation.x += delta * 0.035 * speed;
  });
  return (
    <mesh ref={ref} rotation={[0.3, 0.4, 0]}>
      <icosahedronGeometry args={[radius, 1]} />
      <meshBasicMaterial
        color={palette.wire}
        wireframe
        transparent
        opacity={palette.wireOpacity}
      />
    </mesh>
  );
}

type Orbit = {
  radius: number;
  speed: number;
  phase: number;
  tilt: number;
  size: number;
  color: string;
};

function Nodes({
  palette,
  speed,
  count,
  coreRadius,
}: {
  palette: Palette;
  speed: number;
  count: number;
  coreRadius: number;
}) {
  const group = useRef<THREE.Group>(null);
  const meshes = useRef<THREE.Mesh[]>([]);
  const lines = useRef<THREE.LineSegments>(null);

  const orbits = useMemo<Orbit[]>(() => {
    const out: Orbit[] = [];
    for (let i = 0; i < count; i++) {
      out.push({
        radius: coreRadius + 0.9 + (i % 3) * 0.62,
        speed: 0.16 + ((i * 37) % 11) / 46,
        phase: (i / count) * Math.PI * 2,
        tilt: -0.6 + ((i * 53) % 13) / 11,
        size: 0.1 + ((i * 29) % 7) / 62,
        color: palette.nodes[i % palette.nodes.length],
      });
    }
    return out;
  }, [count, coreRadius, palette]);

  // 2 endpoints per node for the spokes, plus 2 for each neighbour link.
  const linkCount = count * 2;
  const positions = useMemo(() => new Float32Array(linkCount * 3), [linkCount]);

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, [positions]);

  useFrame((state) => {
    const t = speed === 0 ? 0.85 : state.clock.elapsedTime * speed;
    const pts: THREE.Vector3[] = [];

    orbits.forEach((o, i) => {
      const a = o.phase + t * o.speed;
      const x = Math.cos(a) * o.radius;
      const z = Math.sin(a) * o.radius;
      const y = Math.sin(a * 1.3 + o.tilt) * o.radius * 0.32;
      const m = meshes.current[i];
      if (m) m.position.set(x, y, z);
      pts.push(new THREE.Vector3(x, y, z));
    });

    // spoke from core to each node, then node -> next node
    let p = 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      positions[p++] = a.x;
      positions[p++] = a.y;
      positions[p++] = a.z;
      positions[p++] = b.x;
      positions[p++] = b.y;
      positions[p++] = b.z;
    }
    geo.attributes.position.needsUpdate = true;

    if (group.current && speed !== 0) {
      group.current.rotation.y = t * 0.05;
    }
  });

  return (
    <group ref={group}>
      {orbits.map((o, i) => (
        <mesh
          key={i}
          ref={(el) => {
            if (el) meshes.current[i] = el;
          }}
        >
          <sphereGeometry args={[o.size, 16, 16]} />
          <meshBasicMaterial color={o.color} transparent opacity={0.85} />
        </mesh>
      ))}
      <lineSegments ref={lines} geometry={geo}>
        <lineBasicMaterial
          color={palette.links}
          transparent
          opacity={palette.linkOpacity}
        />
      </lineSegments>
    </group>
  );
}

function Books({ palette, speed }: { palette: Palette; speed: number }) {
  const slabs = useMemo(
    () => [
      { pos: [-3.5, 1.15, -1.6], rot: [0.35, 0.6, -0.2], scale: 1 },
      { pos: [3.6, -0.85, -1.2], rot: [-0.25, -0.5, 0.24], scale: 0.86 },
      { pos: [2.5, 1.75, -2.4], rot: [0.2, 0.9, 0.1], scale: 0.66 },
    ],
    [],
  );
  const refs = useRef<THREE.Mesh[]>([]);

  useFrame((state) => {
    if (speed === 0) return;
    const t = state.clock.elapsedTime * speed;
    refs.current.forEach((m, i) => {
      if (!m) return;
      m.position.y = slabs[i].pos[1] + Math.sin(t * 0.55 + i * 1.7) * 0.22;
      m.rotation.z = slabs[i].rot[2] + Math.sin(t * 0.4 + i) * 0.06;
    });
  });

  return (
    <>
      {slabs.map((s, i) => (
        <mesh
          key={i}
          ref={(el) => {
            if (el) refs.current[i] = el;
          }}
          position={s.pos as [number, number, number]}
          rotation={s.rot as [number, number, number]}
          scale={s.scale}
        >
          <boxGeometry args={[1.25, 0.16, 0.9]} />
          <meshBasicMaterial
            color={palette.slab}
            transparent
            opacity={0.28}
            wireframe
          />
        </mesh>
      ))}
    </>
  );
}

export default function LearningCoreScene({
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
  const palette = theme === "light" ? LIGHT : DARK;
  const coreRadius = compact ? 1.5 : 1.95;

  return (
    <Canvas
      frameloop={paused ? "never" : "always"}
      dpr={[1, 1.75]}
      camera={{ position: [0, 0.4, 9.5], fov: 50 }}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      <MouseLook speed={speed} />
      <Core palette={palette} speed={speed} radius={coreRadius} />
      <Nodes
        palette={palette}
        speed={speed}
        count={compact ? 8 : 12}
        coreRadius={coreRadius}
      />
      <Books palette={palette} speed={speed} />
    </Canvas>
  );
}
