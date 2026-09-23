import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stage, PerspectiveCamera } from '@react-three/drei';
import { Suspense } from 'react';
import { MechanicalPart } from './MechanicalPart';

export function ProductCanvas() {
  return (
    <div className="h-[500px] w-full rounded-xl bg-slate-900 overflow-hidden">
      <Canvas shadows dpr={[1, 2]}>
        <Suspense fallback={null}>
          <PerspectiveCamera makeDefault position={[0, 0, 5]} fov={50} />
          
          {/* Stage provides automated lighting and environment */}
          <Stage environment="city" intensity={0.5}>
            <MechanicalPart />
          </Stage>

          {/* Interactive rotation controls */}
          <OrbitControls 
            enableZoom={true} 
            enablePan={false}
            minPolarAngle={Math.PI / 4}
            maxPolarAngle={Math.PI / 1.5}
            autoRotate
            autoRotateSpeed={0.5}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}