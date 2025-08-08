/**
 * Three.js粒子系统测试组件
 * 用于验证WebGL渲染是否正常工作
 */

import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

export const ParticleTest: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState('初始化中...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    console.log('🧪 开始Three.js粒子测试...');
    setStatus('检测WebGL支持...');

    try {
      // 检测WebGL支持
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      
      if (!gl) {
        throw new Error('WebGL不支持');
      }

      setStatus('创建Three.js场景...');

      // 创建场景
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(75, 800 / 600, 0.1, 1000);
      
      // 创建渲染器
      const renderer = new THREE.WebGLRenderer({ 
        alpha: true,
        antialias: true
      });
      
      renderer.setSize(800, 600);
      renderer.setClearColor(0x000011, 1);
      
      setStatus('创建粒子系统...');

      // 创建粒子
      const particleCount = 1000;
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);

      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        
        // 位置
        positions[i3] = (Math.random() - 0.5) * 10;
        positions[i3 + 1] = (Math.random() - 0.5) * 10;
        positions[i3 + 2] = (Math.random() - 0.5) * 10;
        
        // 颜色
        colors[i3] = Math.random();
        colors[i3 + 1] = Math.random();
        colors[i3 + 2] = 1;
      }

      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const material = new THREE.PointsMaterial({
        size: 0.1,
        vertexColors: true
      });

      const particles = new THREE.Points(geometry, material);
      scene.add(particles);

      camera.position.z = 5;

      // 添加到DOM
      containerRef.current.appendChild(renderer.domElement);
      
      setStatus('✅ 渲染中...');

      // 动画循环
      let animationId: number;
      const animate = () => {
        particles.rotation.x += 0.01;
        particles.rotation.y += 0.01;
        
        renderer.render(scene, camera);
        animationId = requestAnimationFrame(animate);
      };
      
      animate();

      return () => {
        cancelAnimationFrame(animationId);
        
        // 安全卸载 renderer.domElement（仅当确为其父节点时）
        try {
          const mountNode = containerRef.current;
          const dom = renderer?.domElement;
          if (mountNode && dom && dom.parentNode === mountNode) {
            mountNode.removeChild(dom);
          }
          renderer?.dispose?.();
        } catch (e) {
          // 忽略卸载期间的偶发性错误，避免 NotFoundError 影响卸载流程
          console.warn('[ParticleTest] cleanup warning:', e);
        }
      };

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '未知错误';
      console.error('❌ 粒子测试失败:', errorMsg);
      setError(errorMsg);
      setStatus('❌ 测试失败');
    }
  }, []);

  return (
    <div style={{ 
      position: 'fixed', 
      top: '50%', 
      left: '50%', 
      transform: 'translate(-50%, -50%)',
      zIndex: 9999,
      background: 'rgba(0,0,0,0.9)',
      padding: '20px',
      borderRadius: '10px',
      border: '2px solid #00ffff'
    }}>
      <h3 style={{ color: '#ffffff', textAlign: 'center' }}>
        🧪 Three.js粒子系统测试
      </h3>
      
      <div style={{ color: '#00ffff', marginBottom: '10px', textAlign: 'center' }}>
        状态: {status}
      </div>
      
      {error && (
        <div style={{ color: '#ff6666', marginBottom: '10px', fontSize: '12px' }}>
          错误: {error}
        </div>
      )}
      
      <div 
        ref={containerRef} 
        style={{ 
          border: '1px solid #333',
          borderRadius: '5px',
          overflow: 'hidden'
        }} 
      />
      
      <div style={{ color: '#888', fontSize: '10px', marginTop: '10px', textAlign: 'center' }}>
        如果看到旋转的彩色粒子，说明Three.js工作正常
      </div>
    </div>
  );
};

export default ParticleTest;