/**
 * DeepCAD Three.js地球渲染系统
 * 1号架构师 - 震撼的地球到基坑视觉体验
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import * as THREE from 'three';
import { safeDetachRenderer, deepDispose } from '../../utils/safeThreeDetach';
import { designTokens } from '../../design/tokens';

// ==================== 类型定义 ====================

export interface EarthRendererProps {
  className?: string;
  style?: React.CSSProperties;
  width?: number;
  height?: number;
  showProjects?: boolean;
  autoRotate?: boolean;
  onProjectClick?: (project: ProjectMarker) => void;
  onEarthReady?: () => void;
}

export interface ProjectMarker {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  type: 'excavation' | 'construction' | 'monitoring';
  status: 'active' | 'completed' | 'planning';
  description?: string;
}

// ==================== 地球渲染器核心类 ====================

class Earth3DRenderer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private earth: THREE.Mesh;
  private atmosphere: THREE.Mesh;
  private clouds: THREE.Mesh;
  private stars: THREE.Points;
  private projectMarkers: THREE.Group;
  private animationId: number = 0;
  private isInitialized: boolean = false;
  
  // 地球参数
  private readonly EARTH_RADIUS = 100;
  private readonly ATMOSPHERE_RADIUS = 105;
  private readonly CLOUD_RADIUS = 102;
  
  // 相机控制
  private cameraPosition = new THREE.Vector3(300, 100, 300);
  private cameraTarget = new THREE.Vector3(0, 0, 0);
  private isAnimating = false;

  constructor(container: HTMLElement, width: number, height: number) {
    this.initializeScene(container, width, height);
    this.createEarth();
    this.createAtmosphere();
    this.createClouds();
    this.createStarField();
    this.createProjectMarkers();
    this.setupLighting();
    this.startAnimation();
    this.isInitialized = true;
  }

  private initializeScene(container: HTMLElement, width: number, height: number) {
    // 场景设置
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000011);

    // 相机设置
    this.camera = new THREE.PerspectiveCamera(60, width / height, 1, 10000);
    this.camera.position.copy(this.cameraPosition);
    this.camera.lookAt(this.cameraTarget);

    // 渲染器设置
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true,
      powerPreference: "high-performance"
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // Prefer modern color space API; shim keeps legacy code working elsewhere
  // @ts-ignore for older typings
  this.renderer.outputColorSpace = (THREE as any).SRGBColorSpace ?? (THREE as any).LinearSRGBColorSpace ?? 3000;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    container.appendChild(this.renderer.domElement);
  }

  private createEarth() {
    const geometry = new THREE.SphereGeometry(this.EARTH_RADIUS, 64, 64);
    
    // 地球材质
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        dayTexture: { value: this.createEarthDayTexture() },
        nightTexture: { value: this.createEarthNightTexture() },
        normalMap: { value: this.createEarthNormalMap() },
        sunDirection: { value: new THREE.Vector3(1, 0.5, 0.5).normalize() }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform sampler2D dayTexture;
        uniform sampler2D nightTexture;
        uniform sampler2D normalMap;
        uniform vec3 sunDirection;
        
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        
        void main() {
          // 法线扰动
          vec3 normalColor = texture2D(normalMap, vUv).rgb;
          vec3 perturbedNormal = normalize(vNormal + (normalColor - 0.5) * 0.2);
          
          // 计算光照
          float sunDot = dot(perturbedNormal, sunDirection);
          float dayFactor = smoothstep(-0.2, 0.2, sunDot);
          
          // 昼夜纹理混合
          vec3 dayColor = texture2D(dayTexture, vUv).rgb;
          vec3 nightColor = texture2D(nightTexture, vUv).rgb;
          vec3 earthColor = mix(nightColor * 0.3, dayColor, dayFactor);
          
          // 大气散射效果
          vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
          float fresnel = 1.0 - dot(viewDirection, perturbedNormal);
          vec3 atmosphereColor = vec3(0.2, 0.5, 1.0) * fresnel * 0.3;
          
          // 海洋高光
          float oceanMask = step(0.3, dayColor.b);
          float oceanSpecular = pow(max(0.0, dot(reflect(-sunDirection, perturbedNormal), viewDirection)), 32.0) * oceanMask;
          
          gl_FragColor = vec4(earthColor + atmosphereColor + vec3(oceanSpecular * 0.5), 1.0);
        }
      `
    });

    this.earth = new THREE.Mesh(geometry, material);
    this.earth.receiveShadow = true;
    this.scene.add(this.earth);
  }

  private createAtmosphere() {
    const geometry = new THREE.SphereGeometry(this.ATMOSPHERE_RADIUS, 32, 32);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        viewVector: { value: new THREE.Vector3() },
        sunDirection: { value: new THREE.Vector3(1, 0.5, 0.5).normalize() }
      },
      vertexShader: `
        uniform vec3 viewVector;
        varying float intensity;
        varying vec3 vNormal;
        
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec3 vNormel = normalize(normalMatrix * viewVector);
          intensity = pow(0.8 - dot(vNormal, vNormel), 2.0);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 sunDirection;
        varying float intensity;
        varying vec3 vNormal;
        
        void main() {
          float sunAlignment = dot(vNormal, sunDirection);
          vec3 atmosphereColor = vec3(0.2, 0.5, 1.0);
          
          // 日落色彩
          vec3 sunsetColor = vec3(1.0, 0.6, 0.3);
          float sunsetFactor = smoothstep(0.0, 0.3, sunAlignment) * smoothstep(0.8, 0.3, sunAlignment);
          atmosphereColor = mix(atmosphereColor, sunsetColor, sunsetFactor);
          
          gl_FragColor = vec4(atmosphereColor, intensity * 0.7);
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true
    });

    this.atmosphere = new THREE.Mesh(geometry, material);
    this.scene.add(this.atmosphere);
  }

  private createClouds() {
    const geometry = new THREE.SphereGeometry(this.CLOUD_RADIUS, 32, 32);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        cloudTexture: { value: this.createCloudTexture() },
        sunDirection: { value: new THREE.Vector3(1, 0.5, 0.5).normalize() }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform sampler2D cloudTexture;
        uniform vec3 sunDirection;
        
        varying vec2 vUv;
        varying vec3 vNormal;
        
        void main() {
          // 云层动画
          vec2 animatedUv = vUv + vec2(time * 0.00005, 0.0);
          float cloudDensity = texture2D(cloudTexture, animatedUv).r;
          
          // 光照计算
          float sunDot = dot(vNormal, sunDirection);
          float lightFactor = smoothstep(-0.1, 0.8, sunDot);
          
          vec3 cloudColor = vec3(1.0) * lightFactor;
          float alpha = cloudDensity * 0.6;
          
          gl_FragColor = vec4(cloudColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false
    });

    this.clouds = new THREE.Mesh(geometry, material);
    this.scene.add(this.clouds);
  }

  private createStarField() {
    const starsGeometry = new THREE.BufferGeometry();
    const starCount = 5000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      
      // 球面随机分布
      const radius = 2000 + Math.random() * 3000;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);
      
      // 星星颜色变化
      const starType = Math.random();
      if (starType < 0.7) {
        // 白色恒星
        colors[i3] = 1;
        colors[i3 + 1] = 1;
        colors[i3 + 2] = 1;
      } else if (starType < 0.9) {
        // 蓝色恒星
        colors[i3] = 0.7;
        colors[i3 + 1] = 0.8;
        colors[i3 + 2] = 1;
      } else {
        // 红色恒星
        colors[i3] = 1;
        colors[i3 + 1] = 0.7;
        colors[i3 + 2] = 0.5;
      }
    }

    starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const starsMaterial = new THREE.PointsMaterial({
      size: 2,
      vertexColors: true,
      transparent: true,
      opacity: 0.8
    });

    this.stars = new THREE.Points(starsGeometry, starsMaterial);
    this.scene.add(this.stars);
  }

  private createProjectMarkers() {
    this.projectMarkers = new THREE.Group();
    this.scene.add(this.projectMarkers);
  }

  private setupLighting() {
    // 太阳光
    const sunLight = new THREE.DirectionalLight(0xffffff, 2);
    sunLight.position.set(1000, 500, 500);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 100;
    sunLight.shadow.camera.far = 2000;
    sunLight.shadow.camera.left = -200;
    sunLight.shadow.camera.right = 200;
    sunLight.shadow.camera.top = 200;
    sunLight.shadow.camera.bottom = -200;
    this.scene.add(sunLight);

    // 环境光
    const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
    this.scene.add(ambientLight);

    // 反射光（模拟地球反照）
    const fillLight = new THREE.DirectionalLight(0x6699ff, 0.5);
    fillLight.position.set(-1000, -300, -500);
    this.scene.add(fillLight);
  }

  // 纹理生成方法
  private createEarthDayTexture(): THREE.DataTexture {
    const size = 1024;
    const data = new Uint8Array(size * size * 3);
    
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const index = (i * size + j) * 3;
        
        // 简化的地球纹理生成
        const lat = (i / size - 0.5) * Math.PI;
        const lon = (j / size) * Math.PI * 2;
        
        // 海洋和陆地
        const noise = Math.sin(lat * 10) * Math.cos(lon * 8) + 
                     Math.sin(lat * 6) * Math.cos(lon * 12) * 0.5;
        
        if (noise > 0.2) {
          // 陆地 - 绿棕色
          data[index] = 60 + Math.random() * 40;     // R
          data[index + 1] = 80 + Math.random() * 50; // G
          data[index + 2] = 30 + Math.random() * 20; // B
        } else {
          // 海洋 - 蓝色
          data[index] = 20 + Math.random() * 30;     // R
          data[index + 1] = 50 + Math.random() * 40; // G
          data[index + 2] = 120 + Math.random() * 80; // B
        }
      }
    }
    
    const texture = new THREE.DataTexture(data, size, size, THREE.RGBFormat);
    texture.needsUpdate = true;
    return texture;
  }

  private createEarthNightTexture(): THREE.DataTexture {
    const size = 512;
    const data = new Uint8Array(size * size * 3);
    
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const index = (i * size + j) * 3;
        
        // 夜晚城市灯光效果
        const cityLights = Math.random() < 0.02 ? 1 : 0;
        const intensity = cityLights * (0.5 + Math.random() * 0.5);
        
        data[index] = intensity * 255;     // R
        data[index + 1] = intensity * 200; // G
        data[index + 2] = intensity * 100; // B
      }
    }
    
    const texture = new THREE.DataTexture(data, size, size, THREE.RGBFormat);
    texture.needsUpdate = true;
    return texture;
  }

  private createEarthNormalMap(): THREE.DataTexture {
    const size = 256;
    const data = new Uint8Array(size * size * 3);
    
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const index = (i * size + j) * 3;
        
        // 简单的法线贴图
        data[index] = 128 + Math.random() * 50 - 25;     // X
        data[index + 1] = 128 + Math.random() * 50 - 25; // Y  
        data[index + 2] = 255;                           // Z
      }
    }
    
    const texture = new THREE.DataTexture(data, size, size, THREE.RGBFormat);
    texture.needsUpdate = true;
    return texture;
  }

  private createCloudTexture(): THREE.DataTexture {
    const size = 512;
    const data = new Uint8Array(size * size);
    
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const index = i * size + j;
        
        // 云层噪声生成
        const x = i / size;
        const y = j / size;
        
        let noise = 0;
        noise += Math.sin(x * 20) * Math.cos(y * 15) * 0.5;
        noise += Math.sin(x * 40) * Math.cos(y * 30) * 0.25;
        noise += Math.sin(x * 80) * Math.cos(y * 60) * 0.125;
        
        data[index] = Math.max(0, Math.min(255, (noise + 1) * 127.5));
      }
    }
    
    const texture = new THREE.DataTexture(data, size, size, THREE.RedFormat);
    texture.needsUpdate = true;
    return texture;
  }

  public addProjectMarker(project: ProjectMarker) {
    // 将经纬度转换为3D坐标
    const phi = (90 - project.latitude) * (Math.PI / 180);
    const theta = (project.longitude + 180) * (Math.PI / 180);
    const radius = this.EARTH_RADIUS + 2;

    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);

    // 创建项目标记
    const markerGeometry = new THREE.SphereGeometry(1, 8, 8);
    const markerMaterial = new THREE.MeshStandardMaterial({
      color: project.type === 'excavation' ? 0xff4444 : 
             project.type === 'construction' ? 0x44ff44 : 0x4444ff,
      emissive: 0x222222
    });

    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    marker.position.set(x, y, z);
    marker.userData = project;

    // 添加脉冲效果
    const pulseGeometry = new THREE.RingGeometry(2, 4, 16);
    const pulseMaterial = new THREE.MeshBasicMaterial({
      color: markerMaterial.color,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });

    const pulse = new THREE.Mesh(pulseGeometry, pulseMaterial);
    pulse.lookAt(marker.position.clone().normalize());
    pulse.position.copy(marker.position);
    
    const markerGroup = new THREE.Group();
    markerGroup.add(marker);
    markerGroup.add(pulse);
    
    this.projectMarkers.add(markerGroup);
  }

  public startAnimation() {
    const animate = (time: number) => {
      this.animationId = requestAnimationFrame(animate);
      
      // 更新Shader uniforms
      if (this.earth.material instanceof THREE.ShaderMaterial) {
        this.earth.material.uniforms.time.value = time;
      }
      if (this.atmosphere.material instanceof THREE.ShaderMaterial) {
        this.atmosphere.material.uniforms.time.value = time;
        this.atmosphere.material.uniforms.viewVector.value = this.camera.position.clone().normalize();
      }
      if (this.clouds.material instanceof THREE.ShaderMaterial) {
        this.clouds.material.uniforms.time.value = time;
      }

      // 地球自转
      this.earth.rotation.y += 0.001;
      this.clouds.rotation.y += 0.0015;

      // 星空缓慢旋转
      this.stars.rotation.y += 0.0001;

      // 项目标记脉冲动画
      this.projectMarkers.children.forEach((group) => {
        const pulse = group.children[1];
        if (pulse) {
          pulse.scale.setScalar(1 + Math.sin(time * 0.003) * 0.3);
          // @ts-ignore pulse is Mesh
          (pulse as any).material.opacity = 0.3 + Math.sin(time * 0.005) * 0.2;
        }
      });

      this.renderer.render(this.scene, this.camera);
    };

    animate(0);
  }

  public stopAnimation() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }

  public resize(width: number, height: number) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public dispose() {
    this.stopAnimation();
    // 深度释放场景资源
    deepDispose(this.scene);
    // 安全移除 renderer
    safeDetachRenderer(this.renderer as any);
  }

  public getRenderer() {
    return this.renderer;
  }

  public getCamera() {
    return this.camera;
  }

  public getScene() {
    return this.scene;
  }
}

// ==================== React组件 ====================

export const EarthRenderer: React.FC<EarthRendererProps> = ({
  className = '',
  style = {},
  width = 800,
  height = 600,
  showProjects = true,
  autoRotate = true,
  onProjectClick,
  onEarthReady
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<Earth3DRenderer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);

  // 示例项目数据
  const sampleProjects: ProjectMarker[] = [
    {
      id: '1',
      name: '上海中心深基坑工程',
      latitude: 31.2304,
      longitude: 121.4737,
      type: 'excavation',
      status: 'completed',
      description: '632米超高层建筑深基坑工程'
    },
    {
      id: '2', 
      name: '北京大兴机场深基坑',
      latitude: 39.5098,
      longitude: 116.4105,
      type: 'construction',
      status: 'active',
      description: '机场航站楼深基坑建设'
    },
    {
      id: '3',
      name: '深圳前海金融区',
      latitude: 22.5431,
      longitude: 113.9339,
      type: 'monitoring',
      status: 'planning',
      description: '大型金融区深基坑监测'
    }
  ];

  // 初始化地球渲染器
  useEffect(() => {
    if (!containerRef.current) return;

    const initRenderer = async () => {
      try {
        setLoadingProgress(20);
        
        // 创建渲染器实例
        const renderer = new Earth3DRenderer(containerRef.current!, width, height);
        rendererRef.current = renderer;
        
        setLoadingProgress(60);

        // 添加项目标记
        if (showProjects) {
          sampleProjects.forEach(project => {
            renderer.addProjectMarker(project);
          });
        }

        setLoadingProgress(100);
        
        setTimeout(() => {
          setIsLoading(false);
          onEarthReady?.();
        }, 500);

      } catch (error) {
        console.error('Earth renderer initialization failed:', error);
        setIsLoading(false);
      }
    };

    initRenderer();

    return () => {
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, [width, height, showProjects, onEarthReady]);

  // 处理窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      if (rendererRef.current) {
        rendererRef.current.resize(width, height);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [width, height]);

  return (
    <motion.div
      className={`earth-renderer ${className}`}
      style={{
        position: 'relative',
        width,
        height,
        background: 'radial-gradient(circle at center, #001122 0%, #000000 100%)',
        borderRadius: designTokens.borderRadius.lg,
        overflow: 'hidden',
        ...style
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      {/* 加载界面 */}
      {isLoading && (
        <motion.div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: designTokens.colors.background.primary,
            zIndex: 10
          }}
          initial={{ opacity: 1 }}
          animate={{ opacity: isLoading ? 1 : 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            style={{
              width: '60px',
              height: '60px',
              border: `3px solid ${designTokens.colors.primary[500]}`,
              borderTop: '3px solid transparent',
              borderRadius: '50%',
              marginBottom: designTokens.spacing[4]
            }}
            animate={{ rotate: 360 }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: "linear"
            }}
          />
          
          <p style={{
            color: designTokens.colors.neutral[300],
            fontSize: designTokens.typography.fontSize.lg,
            fontWeight: designTokens.typography.fontWeight.medium,
            marginBottom: designTokens.spacing[3]
          }}>
            正在初始化地球渲染系统...
          </p>
          
          <div style={{
            width: '200px',
            height: '4px',
            background: designTokens.colors.neutral[800],
            borderRadius: designTokens.borderRadius.full,
            overflow: 'hidden'
          }}>
            <motion.div
              style={{
                height: '100%',
                background: `linear-gradient(90deg, ${designTokens.colors.primary[500]}, ${designTokens.colors.accent[500]})`,
                borderRadius: designTokens.borderRadius.full
              }}
              initial={{ width: '0%' }}
              animate={{ width: `${loadingProgress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
          
          <p style={{
            color: designTokens.colors.neutral[500],
            fontSize: designTokens.typography.fontSize.sm,
            marginTop: designTokens.spacing[2]
          }}>
            {loadingProgress}%
          </p>
        </motion.div>
      )}

      {/* 地球容器 */}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%'
        }}
      />

      {/* 项目信息面板 */}
      {!isLoading && showProjects && (
        <motion.div
          style={{
            position: 'absolute',
            top: designTokens.spacing[4],
            left: designTokens.spacing[4],
            background: designTokens.colors.background.glass,
            backdropFilter: 'blur(12px)',
            borderRadius: designTokens.borderRadius.lg,
            padding: designTokens.spacing[4],
            border: `1px solid ${designTokens.colors.neutral[800]}`,
            maxWidth: '250px'
          }}
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
        >
          <h3 style={{
            color: designTokens.colors.neutral[100],
            fontSize: designTokens.typography.fontSize.base,
            fontWeight: designTokens.typography.fontWeight.semibold,
            marginBottom: designTokens.spacing[3]
          }}>
            全球项目分布
          </h3>
          
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: designTokens.spacing[2]
          }}>
            {sampleProjects.map((project) => (
              <div
                key={project.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: designTokens.spacing[2],
                  padding: designTokens.spacing[2],
                  borderRadius: designTokens.borderRadius.md,
                  background: designTokens.colors.background.tertiary,
                  cursor: 'pointer',
                  transition: 'background 0.2s ease'
                }}
                onClick={() => onProjectClick?.(project)}
              >
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: project.type === 'excavation' ? '#ff4444' : 
                                  project.type === 'construction' ? '#44ff44' : '#4444ff'
                }} />
                <div>
                  <p style={{
                    color: designTokens.colors.neutral[200],
                    fontSize: designTokens.typography.fontSize.sm,
                    fontWeight: designTokens.typography.fontWeight.medium,
                    margin: 0
                  }}>
                    {project.name}
                  </p>
                  <p style={{
                    color: designTokens.colors.neutral[500],
                    fontSize: designTokens.typography.fontSize.xs,
                    margin: 0
                  }}>
                    {project.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* 控制面板 */}
      {!isLoading && (
        <motion.div
          style={{
            position: 'absolute',
            bottom: designTokens.spacing[4],
            right: designTokens.spacing[4],
            display: 'flex',
            gap: designTokens.spacing[2]
          }}
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          <button
            style={{
              background: designTokens.colors.background.glass,
              border: `1px solid ${designTokens.colors.neutral[700]}`,
              borderRadius: designTokens.borderRadius.md,
              padding: designTokens.spacing[3],
              color: designTokens.colors.neutral[300],
              cursor: 'pointer',
              backdropFilter: 'blur(8px)',
              fontSize: designTokens.typography.fontSize.sm
            }}
            onClick={() => {
              // 重置视角
            }}
          >
            🌍 重置视角
          </button>
          
          <button
            style={{
              background: designTokens.colors.background.glass,
              border: `1px solid ${designTokens.colors.neutral[700]}`,
              borderRadius: designTokens.borderRadius.md,
              padding: designTokens.spacing[3],
              color: designTokens.colors.neutral[300],
              cursor: 'pointer',
              backdropFilter: 'blur(8px)',
              fontSize: designTokens.typography.fontSize.sm
            }}
            onClick={() => {
              // 进入基坑视角
            }}
          >
            🏗️ 基坑视角
          </button>
        </motion.div>
      )}
    </motion.div>
  );
};

export default EarthRenderer;