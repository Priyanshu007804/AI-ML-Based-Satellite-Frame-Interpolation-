'use client'

import React, { forwardRef, useEffect, useState } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

interface EarthModelProps {
  scale?: number
  position?: [number, number, number]
}

export const EarthModel = forwardRef<THREE.Group, EarthModelProps>((props, ref) => {
  console.log("[EarthModel] Component rendering started...")
  
  const { scene } = useGLTF('/earth-remix.glb')
  console.log("[EarthModel] useGLTF loaded successfully!", scene)

  const [processedScene, setProcessedScene] = useState<THREE.Group | null>(null)

  useEffect(() => {
    if (!scene) return
    console.log("[EarthModel] Processing scene...")
    
    const clone = scene.clone(true)
    
    // Override all materials with MeshNormalMaterial to eliminate texture crashes
    let meshCount = 0
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow=true;
        mesh.receiveShadow=true
      }
    })
    console.log(`[EarthModel] Overrode materials for ${meshCount} meshes.`)

    // Calculate Bounding Box
    const box = new THREE.Box3().setFromObject(clone)
    const size = new THREE.Vector3()
    box.getSize(size)
    const center = new THREE.Vector3()
    box.getCenter(center)
    
    console.log(`[EarthModel] Bounding Box Size:`, size)
    console.log(`[EarthModel] Bounding Box Center:`, center)
    
    // Normalize scale to standard diameter (3.4) and center it
    const maxDim = Math.max(size.x, size.y, size.z)
    if (maxDim > 0) {
      const scale = 3.8 / maxDim
      clone.scale.setScalar(scale)
      // Offset position to center the model geometry at the origin
      clone.position.set(-center.x * scale, -center.y * scale, -center.z * scale)
    }
    
    setProcessedScene(clone)
  }, [scene])

  if (!processedScene) {
    console.log("[EarthModel] Waiting for scene processing...")
    return null
  }

  console.log("[EarthModel] Rendering processed scene!")
  return (
    <group ref={ref} {...props}>
      <primitive object={processedScene} />
    </group>
  )
})

EarthModel.displayName = 'EarthModel'

useGLTF.preload('/earth-remix.glb')
