import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { globalSceneRegistry, BaseLayer } from './sceneRegistry';

interface UseThreeSceneProps {
  id: string;
  layers?: BaseLayer[];
  cameraInit?: (camera: THREE.PerspectiveCamera) => void;
  onReady?: (ctx: { scene: THREE.Scene; camera: THREE.Camera; renderer: THREE.WebGLRenderer }) => void;
  rendererOptions?: THREE.WebGLRendererParameters;
}

export function useThreeScene(props: UseThreeSceneProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene>();
  const camRef = useRef<THREE.PerspectiveCamera>();
  const rendererRef = useRef<THREE.WebGLRenderer>();

  useEffect(() => {
    if (!mountRef.current) return;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 10000);
    camera.position.set(0, 200, 400);
    props.cameraInit?.(camera);
    sceneRef.current = scene;
    camRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, ...props.rendererOptions });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const ctx = globalSceneRegistry.add({
      id: props.id,
      scene,
      camera,
      renderer,
      mount: mountRef.current
    });
    props.layers?.forEach(l => globalSceneRegistry.attachLayer(ctx, l));

    props.onReady?.({ scene, camera, renderer });

    const handleResize = () => {
      if (!mountRef.current || !camRef.current || !rendererRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camRef.current.aspect = w / h;
      camRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      globalSceneRegistry.remove(props.id);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { mountRef, scene: sceneRef.current, camera: camRef.current, renderer: rendererRef.current };
}

export const ThreeSceneContainer: React.FC<React.PropsWithChildren<{ id: string; className?: string; style?: React.CSSProperties; }>> = ({ id, className, style }) => {
  const { mountRef } = useThreeScene({ id });
  return <div ref={mountRef} className={className} style={{ width: '100%', height: '100%', position: 'relative', ...style }} />;
};
