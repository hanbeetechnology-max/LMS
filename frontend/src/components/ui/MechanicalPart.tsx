import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function MechanicalPart() {
  // Strict TypeScript typing for mesh references
  const outerMeshRef = useRef<THREE.Mesh>(null!);
  const innerMeshRef = useRef<THREE.Mesh>(null!);

  useFrame((_state, delta) => {
    // Delta ensures smooth rotation regardless of frame rate
    if (outerMeshRef.current) {
      outerMeshRef.current.rotation.x += delta * 0.5;
      outerMeshRef.current.rotation.y += delta * 0.8;
    }
    if (innerMeshRef.current) {
      innerMeshRef.current.rotation.x -= delta * 0.6;
      innerMeshRef.current.rotation.z += delta * 0.4;
    }
  });

  return (
    <group>
      {/* Primary mechanical ring */}
      <mesh ref={outerMeshRef}>
        <torusKnotGeometry args={[1, 0.3, 128, 32]} />
        <meshStandardMaterial
          color="#6366f1"
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {/* Internal core with wireframe effect */}
      <mesh ref={innerMeshRef} scale={0.6}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial
          color="#38bdf8"
          metalness={0.5}
          roughness={0.1}
          wireframe
        />
      </mesh>
    </group>
  );
}