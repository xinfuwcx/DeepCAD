import React from 'react';
import { useThreeScene } from './useThreeScene';
import { EpicGlobeLayer, EpicProject } from './layers/EpicGlobeLayer';

interface EpicGlobeSceneProps {
  id?: string;
  projects: EpicProject[];
  style?: React.CSSProperties;
  onProjectSelect?: (p: EpicProject) => void;
}

export const EpicGlobeScene: React.FC<EpicGlobeSceneProps> = ({ id = 'epic-globe', projects, style, onProjectSelect }) => {
  const layer = React.useMemo(() => new EpicGlobeLayer(projects, { onProjectClick: onProjectSelect }), [projects, onProjectSelect]);
  const { mountRef } = useThreeScene({ id, layers: [layer], cameraInit: cam => { cam.position.set(0, 1000, 2000); } });
  const handleClick = React.useCallback((e: React.MouseEvent) => {
    if (!mountRef.current) return;
    layer.handleClick(e.clientX, e.clientY, mountRef.current);
  }, [layer]);
  return <div ref={mountRef} onClick={handleClick} style={{ width: '100%', height: '100%', cursor: 'pointer', ...style }} />;
};

export default EpicGlobeScene;
