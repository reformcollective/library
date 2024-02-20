import { Canvas } from "@react-three/fiber"
import gsap from "gsap"
import AdaptivePixelRatio from "library/threeJS/ThreeJSHelpers"
import { Suspense, useEffect, useRef } from "react"
import * as THREE from "three"

export default function Scene() {
	return (
		<Canvas camera={{ position: [2, 2, 2] }}>
			<AdaptivePixelRatio />
			<Suspense fallback={null}>
				<Lights />
				<Models />
			</Suspense>
		</Canvas>
	)
}

function Lights() {
	return (
		<>
			<spotLight intensity={0.5} position={[0, 10, 10]} color="white" />
			<ambientLight intensity={0.5} color="white" />
		</>
	)
}

function Models() {
	const meshRef = useRef<THREE.Mesh>(null)

	const geometry = new THREE.BoxGeometry(1, 1)
	const material = new THREE.MeshStandardMaterial({ color: "red" })

	useEffect(() => {
		if (meshRef.current) {
			gsap.to(meshRef.current.rotation, {
				x: "+=1",
				y: "+=1",
				repeat: -1,
				repeatRefresh: true,
				ease: "none",
			})
		}
	}, [])

	return (
		<mesh
			ref={meshRef}
			position={[0, 0, 0]}
			geometry={geometry}
			material={material}
		/>
	)
}
