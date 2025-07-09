import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';

const Viewport: React.FC = () => {
  return (
    <div style={{ height: '100%', width: '100%', background: '#333' }}>
      <Canvas
        camera={{ position: [25, 25, 25], fov: 25 }}
      >
        <color attach="background" args={['#202020']} />
        <ambientLight intensity={0.7} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
        <pointLight position={[-10, -10, -10]} />
        
        {/* Helpers */}
        <Grid 
          infiniteGrid 
          sectionColor={'#505050'}
          cellColor={'#303030'}
          fadeDistance={50}
        />
        <axesHelper args={[5]} />

        {/* Placeholder for future models */}
        {/* You can load your models here, e.g., using useLoader */}

        <OrbitControls makeDefault />
      </Canvas>
    </div>
  );
};

export default Viewport; 