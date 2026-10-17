"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial, Sparkles, OrbitControls } from "@react-three/drei";
import { Suspense, useRef } from "react";
import type { Mesh, Group } from "three";

/**
 * 3D hero scene: a slowly rotating, distorted, glassy "bubble" core
 * surrounded by orbiting smaller bubbles + sparkles. Reads as
 * "freshly washed shine" without being a literal car render.
 */

function MainBubble() {
  const ref = useRef<Mesh>(null!);
  useFrame((_, dt) => {
    if (ref.current) {
      ref.current.rotation.y += dt * 0.15;
      ref.current.rotation.x += dt * 0.05;
    }
  });
  return (
    <Float speed={1.4} rotationIntensity={0.4} floatIntensity={1.5}>
      <mesh ref={ref} scale={1.6}>
        <icosahedronGeometry args={[1, 4]} />
        <MeshDistortMaterial
          color="#22d3ee"
          emissive="#0ea5e9"
          emissiveIntensity={0.3}
          distort={0.45}
          speed={2.2}
          roughness={0.05}
          metalness={0.85}
        />
      </mesh>
    </Float>
  );
}

function Orbiters() {
  const group = useRef<Group>(null!);
  useFrame((_, dt) => {
    if (group.current) group.current.rotation.y += dt * 0.4;
  });
  const positions: [number, number, number][] = [
    [2.6, 0.4, 0],
    [-2.4, -0.3, 0.6],
    [1.5, -1.6, -0.8],
    [-1.7, 1.7, -0.4],
    [0.2, 2.4, 1.2],
  ];
  const colors = ["#a78bfa", "#22d3ee", "#ec4899", "#22d3ee", "#a78bfa"];
  return (
    <group ref={group}>
      {positions.map((p, i) => (
        <Float key={i} speed={1 + i * 0.3} rotationIntensity={0.3} floatIntensity={1.2}>
          <mesh position={p} scale={0.28 + (i % 3) * 0.07}>
            <sphereGeometry args={[1, 32, 32]} />
            <meshStandardMaterial
              color={colors[i]}
              emissive={colors[i]}
              emissiveIntensity={0.6}
              roughness={0.1}
              metalness={0.7}
            />
          </mesh>
        </Float>
      ))}
    </group>
  );
}

export default function HeroScene() {
  return (
    <Canvas
      fallback={<div className="h-full w-full rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.25),transparent_65%)]" />}
      dpr={[1, 2]}
      camera={{ position: [0, 0, 6], fov: 45 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
    >
      <Suspense fallback={null}>
        <ambientLight intensity={0.4} />
        <pointLight position={[5, 5, 5]} intensity={1.2} color="#22d3ee" />
        <pointLight position={[-5, -3, 4]} intensity={1.0} color="#a78bfa" />
        <pointLight position={[0, -5, 2]} intensity={0.6} color="#ec4899" />

        <MainBubble />
        <Orbiters />

        <Sparkles count={80} scale={[8, 8, 4]} size={2} speed={0.4} color="#22d3ee" />
        <Sparkles count={50} scale={[10, 6, 4]} size={1.5} speed={0.3} color="#a78bfa" />

        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.6}
          rotateSpeed={0.5}
        />
      </Suspense>
    </Canvas>
  );
}
