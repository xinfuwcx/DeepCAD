import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

interface ViewportProps {
  meshes: THREE.Mesh[];
  analysisMesh?: THREE.Mesh | null;
}

const Viewport: React.FC<ViewportProps> = ({ meshes, analysisMesh }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef(new THREE.Scene());

  useEffect(() => {
    const mountNode = mountRef.current;
    if (!mountNode) return;

    // --- 场景、相机、渲染器设置 ---
    const scene = sceneRef.current;
    scene.background = new THREE.Color(0xf0f0f0);
    const camera = new THREE.PerspectiveCamera(75, mountNode.clientWidth / mountNode.clientHeight, 0.1, 1000);
    camera.position.set(20, 30, 50);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountNode.clientWidth, mountNode.clientHeight);
    mountNode.appendChild(renderer.domElement);
    
    // --- 控制器 ---
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    
    // --- 光照 ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 50, 50);
    scene.add(directionalLight);

    // --- 动画循环 ---
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // --- 响应式调整 ---
    const handleResize = () => {
      camera.aspect = mountNode.clientWidth / mountNode.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mountNode.clientWidth, mountNode.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // --- 清理函数 ---
    return () => {
      window.removeEventListener('resize', handleResize);
      mountNode.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    
    // 清理旧网格
    const objectsToRemove = scene.children.filter(child => child.userData.isSceneObject || child.userData.isAnalysisMesh);
    scene.remove(...objectsToRemove);

    // 添加BIM场景网格
    meshes.forEach(mesh => {
      mesh.userData.isSceneObject = true;
      scene.add(mesh);
    });

    // 添加分析结果网格 (如果存在)
    if (analysisMesh) {
      analysisMesh.userData.isAnalysisMesh = true;
      scene.add(analysisMesh);
    }

  }, [meshes, analysisMesh]);

  return <div ref={mountRef} style={{ width: '100%', height: '100%' }} />;
};

export default Viewport; 