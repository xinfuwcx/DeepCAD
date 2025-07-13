import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { EnhancedRenderer } from '../../core/rendering/enhancedRenderer';
import { StabilizedControls } from '../../core/rendering/stabilizedControls';
import { RenderQualityManager, QualityPreset } from '../../core/rendering/renderQualityManager';
import { MaterialOptimizer } from '../../core/rendering/materialOptimizer';

const AdvancedViewport: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [quality, setQuality] = useState<QualityPreset>('high');

  useEffect(() => {
    if (!mountRef.current) return;

    const currentMount = mountRef.current;

    // 1. Scene and Camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a202c); // Dark blue-gray background
    const camera = new THREE.PerspectiveCamera(75, currentMount.clientWidth / currentMount.clientHeight, 0.1, 1000);
    camera.position.set(5, 5, 5);

    // 2. Enhanced Renderer
    const renderer = new EnhancedRenderer({ antialias: true });
    renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    currentMount.appendChild(renderer.domElement);

    // 3. Stabilized Controls
    const controls = new StabilizedControls(camera, renderer.domElement);
    controls.enableDamping = true; // Required for StabilizedControls' smoothing

    // 4. Quality Manager
    const qualityManager = new RenderQualityManager(renderer, scene);
    qualityManager.setQualityPreset(quality);

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(10, 20, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    
    // Configure shadow properties
    directionalLight.shadow.camera.top = 10;
    directionalLight.shadow.camera.bottom = -10;
    directionalLight.shadow.camera.left = -10;
    directionalLight.shadow.camera.right = 10;

    // 6. Test Objects with Optimized Materials
    const groundGeometry = new THREE.BoxGeometry(20, 0.2, 20);
    const groundMaterial = MaterialOptimizer.createConcreteMaterial({ color: 0x555555 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.receiveShadow = true;
    scene.add(ground);

    const rockGeometry = new THREE.BoxGeometry(1, 1, 1);
    const rockMaterial = MaterialOptimizer.createRockMaterial();
    const rock = new THREE.Mesh(rockGeometry, rockMaterial);
    rock.position.y = 0.6;
    rock.castShadow = true;
    scene.add(rock);

    // Handle Resize
    const handleResize = () => {
      renderer.resize(currentMount.clientWidth, currentMount.clientHeight, camera);
    };
    window.addEventListener('resize', handleResize);

    // Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      currentMount.removeChild(renderer.domElement);
      renderer.dispose();
      MaterialOptimizer.clearCache();
    };
  }, [quality]);

  return (
    <div style={{ width: '100%', height: '400px', border: '1px solid #444' }}>
        <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 1, color: 'white' }}>
            <select value={quality} onChange={(e) => setQuality(e.target.value as QualityPreset)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="ultra">Ultra</option>
            </select>
        </div>
        <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};

export default AdvancedViewport; 