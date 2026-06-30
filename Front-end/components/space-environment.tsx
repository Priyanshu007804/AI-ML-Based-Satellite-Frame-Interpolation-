'use client'

import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * SpaceEnvironment — procedural 3D starfield + subtle nebula glow
 * rendered inside the R3F Canvas. Replaces the 2D canvas StarField on desktop.
 */

// ─── Starfield using BufferGeometry Points ──────────────────────────────

const STAR_COUNT = 2500

function Starfield() {
  const pointsRef = useRef<THREE.Points>(null)

  const { positions, sizes, opacities } = useMemo(() => {
    const positions = new Float32Array(STAR_COUNT * 3)
    const sizes = new Float32Array(STAR_COUNT)
    const opacities = new Float32Array(STAR_COUNT)

    for (let i = 0; i < STAR_COUNT; i++) {
      // Distribute on a sphere shell between radius 15 and 50
      const radius = 15 + Math.random() * 35
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = radius * Math.cos(phi)

      sizes[i] = Math.random() * 1.8 + 0.3
      opacities[i] = Math.random() * 0.6 + 0.4
    }

    return { positions, sizes, opacities }
  }, [])

  // Very slow rotation for subtle depth movement
  useFrame((_, delta) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.003
      pointsRef.current.rotation.x += delta * 0.001
    }
  })

  const vertexShader = `
    attribute float aSize;
    attribute float aOpacity;
    varying float vOpacity;
    void main() {
      vOpacity = aOpacity;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = aSize * (200.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
    }
  `

  const fragmentShader = `
    varying float vOpacity;
    void main() {
      // Circular point with soft edge
      float dist = length(gl_PointCoord - vec2(0.5));
      if (dist > 0.5) discard;
      float alpha = smoothstep(0.5, 0.15, dist) * vOpacity;
      gl_FragColor = vec4(0.88, 0.91, 0.94, alpha);
    }
  `

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={STAR_COUNT}
          array={positions}
          itemSize={3}
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-aSize"
          count={STAR_COUNT}
          array={sizes}
          itemSize={1}
          args={[sizes, 1]}
        />
        <bufferAttribute
          attach="attributes-aOpacity"
          count={STAR_COUNT}
          array={opacities}
          itemSize={1}
          args={[opacities, 1]}
        />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

// ─── Nebula Glow — a soft, barely-visible atmospheric sprite ────────────

function NebulaGlow() {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.z += delta * 0.005
    }
  })

  return (
    <mesh ref={meshRef} position={[-3, 1, -10]}>
      <planeGeometry args={[20, 20]} />
      <meshBasicMaterial
        color="#1a3a5c"
        transparent
        opacity={0.06}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}

// ─── Secondary subtle glow ─────────────────────────────────────────────

function SecondaryGlow() {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.z -= delta * 0.003
    }
  })

  return (
    <mesh ref={meshRef} position={[4, -2, -15]}>
      <planeGeometry args={[16, 16]} />
      <meshBasicMaterial
        color="#2d1a4e"
        transparent
        opacity={0.04}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}

// ─── Exported composite ────────────────────────────────────────────────

export function SpaceEnvironment() {
  return (
    <group>
      <Starfield />
      <NebulaGlow />
      <SecondaryGlow />
    </group>
  )
}
