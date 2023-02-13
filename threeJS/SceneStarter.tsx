import { Suspense } from "react"
import * as THREE from 'three'
import { Canvas } from "@react-three/fiber"

import AdaptivePixelRatio from "library/ThreeJSHelpers"

export default function Scene() {
  return (
    <Canvas camera={{position: [0, 0, 10]}}>
      <AdaptivePixelRatio />
      <Suspense fallback={null}>
        <Lights/>
        <Models/>
      </Suspense>
    </Canvas>
  )
}

function Lights() {
  return (
    <spotLight intensity={1} position={[0, 10, 10]} color="white" />
  )
}

function Models() {

  const geometry = new THREE.BoxGeometry(1, 1)

  return (
    <mesh
      position={[0, 0, 0]}
      geometry={geometry}
    />
  )
}