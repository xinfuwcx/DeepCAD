import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

interface ViewportProps {
  meshes: THREE.Mesh[];
  onSceneReady?: (scene: THREE.Scene, camera: THREE.Camera) => void;
}

const Viewport: React.FC<ViewportProps> = ({ meshes, onSceneReady }) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const threeContextRef = useRef<any>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const currentCanvas = canvasRef.current;
    
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);

    const camera = new THREE.PerspectiveCamera(
      75,
      currentCanvas.clientWidth / currentCanvas.clientHeight,
      0.1,
      1000
    );
    camera.position.set(40, 40, 40);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(currentCanvas.clientWidth, currentCanvas.clientHeight);
    renderer.shadowMap.enabled = true;
    currentCanvas.appendChild(renderer.domElement);

    const orbitControls = new OrbitControls(camera, renderer.domElement);
    orbitControls.target.set(0, 0, 0);
    orbitControls.update();

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    const gridHelper = new THREE.GridHelper(100, 10);
    scene.add(gridHelper);
    
    threeContextRef.current = { scene, camera, renderer, orbitControls };

    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      orbitControls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!currentCanvas) return;
      camera.aspect = currentCanvas.clientWidth / currentCanvas.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(currentCanvas.clientWidth, currentCanvas.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    if (onSceneReady) {
      onSceneReady(scene, camera);
    }

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (currentCanvas && currentCanvas.contains(renderer.domElement)) {
        currentCanvas.removeChild(renderer.domElement);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [onSceneReady]);

  useEffect(() => {
    if (!threeContextRef.current) return;
    const { scene } = threeContextRef.current;
    
    // 1. 清除所有旧的场景对象
    const objectsToRemove = scene.children.filter(child => child.userData.isSceneObject);
    objectsToRemove.forEach(child => scene.remove(child));
    
    // 2. 添加父组件传递过来的新模型
    meshes.forEach(mesh => scene.add(mesh));

  }, [meshes]);

  return <div ref={canvasRef} style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }} />;
};

export default Viewport; 