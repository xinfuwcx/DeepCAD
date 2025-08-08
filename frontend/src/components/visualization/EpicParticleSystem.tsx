/**
 * Epic粒子效果系统
 * 为Epic控制中心提供震撼的视觉效果
 */

import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

interface EpicParticleSystemProps {
  width: number;
  height: number;
  intensity?: number;
  color?: string;
  weatherEffect?: 'clear' | 'rain' | 'snow' | 'storm';
}

export const EpicParticleSystem: React.FC<EpicParticleSystemProps> = ({
  width,
  height,
  intensity = 1,
  color = '#00d9ff',
  weatherEffect = 'clear'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const particleSystemRef = useRef<THREE.Points | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    
    console.log('🎆 Epic粒子系统启动中...', { width, height, intensity, weatherEffect });

    // 创建场景
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 2000);
    const renderer = new THREE.WebGLRenderer({ 
      alpha: true, 
      antialias: true,
      powerPreference: "high-performance"
    });
    
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    camera.position.z = 1000;

    // 创建粒子系统 - 增强可见性
    const particleCount = Math.floor(1500 * intensity); // 减少数量提高性能
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    // 初始化粒子
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      // 位置
      positions[i3] = (Math.random() - 0.5) * 2000;
      positions[i3 + 1] = (Math.random() - 0.5) * 2000;
      positions[i3 + 2] = (Math.random() - 0.5) * 2000;
      
      // 速度
      velocities[i3] = (Math.random() - 0.5) * 2;
      velocities[i3 + 1] = (Math.random() - 0.5) * 2;
      velocities[i3 + 2] = (Math.random() - 0.5) * 2;
      
      // 颜色
      const baseColor = new THREE.Color(color);
      const variation = 0.3;
      colors[i3] = Math.min(1, baseColor.r + (Math.random() - 0.5) * variation);
      colors[i3 + 1] = Math.min(1, baseColor.g + (Math.random() - 0.5) * variation);
      colors[i3 + 2] = Math.min(1, baseColor.b + (Math.random() - 0.5) * variation);
      
      // 大小 - 增大粒子以提高可见性
      sizes[i] = Math.random() * 8 + 4;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    // 创建着色器材质
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        intensity: { value: intensity },
        weatherEffect: { value: getWeatherEffectValue(weatherEffect) }
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float time;
        uniform float intensity;
        uniform float weatherEffect;
        
        void main() {
          vColor = color;
          
          vec3 pos = position;
          
          // 基础粒子运动
          pos.x += sin(time * 0.5 + position.y * 0.01) * 20.0;
          pos.y += cos(time * 0.3 + position.x * 0.01) * 15.0;
          pos.z += sin(time * 0.7 + position.z * 0.01) * 10.0;
          
          // 天气效果
          if (weatherEffect > 0.5) { // 雨雪效果
            pos.y -= time * 100.0 * weatherEffect;
            if (pos.y < -1000.0) pos.y = 1000.0;
          }
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          
          gl_PointSize = size * intensity * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
          
          // 基于距离的透明度 - 增强可见性
          vAlpha = 0.9 - (length(mvPosition.xyz) / 2000.0);
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        uniform float time;
        
        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          
          if (dist > 0.5) discard;
          
          float alpha = 1.0 - (dist * 1.5);
          alpha *= vAlpha;
          alpha *= (0.9 + 0.1 * sin(time * 2.0)); // 减少闪烁，保持稳定
          
          // 发光效果
          vec3 glow = vColor * (1.0 + 0.5 * sin(time * 3.0));
          
          gl_FragColor = vec4(glow, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      vertexColors: true
    });

    const particleSystem = new THREE.Points(geometry, material);
    scene.add(particleSystem);

    containerRef.current.appendChild(renderer.domElement);
    
    sceneRef.current = scene;
    rendererRef.current = renderer;
    particleSystemRef.current = particleSystem;
    
    console.log('✨ 粒子系统渲染完成', { particleCount, renderer: renderer.domElement });

    // 动画循环
    let time = 0;
    const animate = () => {
      time += 0.016;
      
      // 更新着色器uniforms
      if (material.uniforms) {
        material.uniforms.time.value = time;
        material.uniforms.intensity.value = intensity;
        material.uniforms.weatherEffect.value = getWeatherEffectValue(weatherEffect);
      }
      
      // 相机轨道运动
      camera.position.x = Math.sin(time * 0.1) * 200;
      camera.position.y = Math.cos(time * 0.15) * 100;
      camera.lookAt(0, 0, 0);
      
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };
    
    animate();

    return () => {
      // 安全卸载 renderer.domElement（仅当确为其父节点时）
      try {
        const mountNode = containerRef.current;
        const dom = renderer?.domElement;
        if (mountNode && dom && dom.parentNode === mountNode) {
          mountNode.removeChild(dom);
        }
        geometry?.dispose?.();
        material?.dispose?.();
        renderer?.dispose?.();
      } catch (e) {
        // 忽略卸载期间的偶发性错误，避免 NotFoundError 影响卸载流程
        console.warn('[EpicParticleSystem] cleanup warning:', e);
      }
    };
  }, [width, height, intensity, color, weatherEffect]);

  const getWeatherEffectValue = (effect: string): number => {
    switch (effect) {
      case 'rain': return 1.0;
      case 'snow': return 0.8;
      case 'storm': return 1.5;
      default: return 0.0;
    }
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 5,
        overflow: 'hidden'
      }}
    />
  );
};

export default EpicParticleSystem;