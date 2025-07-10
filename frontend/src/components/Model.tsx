import React from 'react';
import { useGLTF } from '@react-three/drei';

interface ModelProps {
  url: string;
}

const Model: React.FC<ModelProps> = ({ url }) => {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
};

// Preload the model to improve performance
useGLTF.preload('/models/suzanne.glb');

export default Model; 