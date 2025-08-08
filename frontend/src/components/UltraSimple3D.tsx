import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { ModernAxisHelper } from './3d/core/ModernAxisHelper';

const UltraSimple3D: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const container = mountRef.current;

    // 场景
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x222222);

    // 相机  
    const camera = new THREE.PerspectiveCamera(75, 800 / 600, 0.1, 1000);
    camera.position.set(5, 5, 5);
    camera.lookAt(0, 0, 0);

    // 渲染器
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(800, 600);
    container.appendChild(renderer.domElement);

    // 光照
    const light = new THREE.AmbientLight(0xffffff, 1);
    scene.add(light);

    // 现代化坐标轴
    const modernAxis = new ModernAxisHelper({
      size: 8,
      lineWidth: 0.1,
      enableGlow: false,
      enableAnimation: false,
      enableInteraction: false,
      labelSize: 0.8,
      colors: {
        x: '#ff3333', // 红色 X轴
        y: '#33ff33', // 绿色 Y轴  
        z: '#3333ff'  // 蓝色 Z轴
      }
    });
    scene.add(modernAxis);

    // 大立方体
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const material = new THREE.MeshBasicMaterial({ 
      color: 0xff0000,
      wireframe: false
    });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    // 渲染
    renderer.render(scene, camera);

    console.log('超简单3D测试渲染完成');
    console.log('场景子对象:', scene.children.length);
    console.log('Canvas DOM:', renderer.domElement);

    return () => {
      // 安全卸载 renderer.domElement（仅当确为其父节点时）
      try {
        const dom = renderer?.domElement;
        if (container && dom && dom.parentNode === container) {
          container.removeChild(dom);
        }
        renderer?.dispose?.();
      } catch (e) {
        // 忽略卸载期间的偶发性错误，避免 NotFoundError 影响卸载流程
        console.warn('[UltraSimple3D] cleanup warning:', e);
      }
    };
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <h1>超简单3D测试</h1>
      <p>应该看到红色立方体和RGB坐标轴</p>
      <div 
        ref={mountRef}
        style={{ 
          width: '800px', 
          height: '600px', 
          border: '3px solid red',
          background: '#222222'
        }}
      />
    </div>
  );
};

export default UltraSimple3D;