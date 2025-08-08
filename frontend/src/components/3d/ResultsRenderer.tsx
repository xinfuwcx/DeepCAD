import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

// 计算结果数据接口
interface ComputationResults {
  excavationResults?: {
    results: {
      overallStability: {
        safetyFactor: number;
        stabilityStatus: 'safe' | 'warning' | 'critical';
      };
      deformation: {
        maxHorizontalDisplacement: number;
        maxVerticalDisplacement: number;
        groundSettlement: number[];
      };
      stress: {
        maxPrincipalStress: number;
        vonMisesStress: number[];
      };
    };
    mesh: {
      vertices: Float32Array;
      faces: Uint32Array;
      normals: Float32Array;
    };
    visualization: {
      stressField: Float32Array;
      displacementField: Float32Array;
    };
  };
}

interface ResultsRendererProps {
  results?: ComputationResults;
  visualizationType?: 'stress' | 'displacement' | 'safety';
  onVisualizationChange?: (type: string) => void;
  enableAnimation?: boolean;
  showColorBar?: boolean;
}

const ResultsRenderer: React.FC<ResultsRendererProps> = ({
  results,
  visualizationType = 'stress',
  onVisualizationChange,
  enableAnimation = true,
  showColorBar = true
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const meshRef = useRef<THREE.Mesh>();
  const [isLoading, setIsLoading] = useState(false);
  const [renderStats, setRenderStats] = useState({ fps: 0, triangles: 0 });

  // 初始化Three.js场景
  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    sceneRef.current = scene;

    // 相机设置
    const camera = new THREE.PerspectiveCamera(
      75,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(10, 10, 10);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // 渲染器设置
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    mountRef.current.appendChild(renderer.domElement);

    // 添加灯光
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // 添加网格
    const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
    scene.add(gridHelper);

    // 添加坐标轴
    const axesHelper = new THREE.AxesHelper(5);
    scene.add(axesHelper);

    // 渲染循环
    let frameCount = 0;
    let lastTime = performance.now();
    
    const animate = () => {
      requestAnimationFrame(animate);
      
      // 计算FPS
      frameCount++;
      const currentTime = performance.now();
      if (currentTime - lastTime >= 1000) {
        setRenderStats(prev => ({
          ...prev,
          fps: Math.round((frameCount * 1000) / (currentTime - lastTime))
        }));
        frameCount = 0;
        lastTime = currentTime;
      }
      
      renderer.render(scene, camera);
    };
    
    animate();

    // 窗口大小变化处理
    const handleResize = () => {
      if (!mountRef.current || !camera || !renderer) return;
      
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      
      // 安全卸载 renderer.domElement（仅当确为其父节点时）
      try {
        const mountNode = mountRef.current;
        const dom = renderer?.domElement;
        if (mountNode && dom && dom.parentNode === mountNode) {
          mountNode.removeChild(dom);
        }
        renderer?.dispose?.();
      } catch (e) {
        // 忽略卸载期间的偶发性错误，避免 NotFoundError 影响卸载流程
        console.warn('[ResultsRenderer] cleanup warning:', e);
      }
    };
  }, []);

  // 更新结果显示
  useEffect(() => {
    if (!results?.excavationResults || !sceneRef.current) return;

    setIsLoading(true);
    
    try {
      // 清除旧的网格
      if (meshRef.current) {
        sceneRef.current.remove(meshRef.current);
      }

      const { mesh, visualization } = results.excavationResults;
      
      // 创建几何体
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(mesh.vertices, 3));
      geometry.setAttribute('normal', new THREE.BufferAttribute(mesh.normals, 3));
      geometry.setIndex(new THREE.BufferAttribute(mesh.faces, 1));

      // 根据可视化类型设置颜色
      let colorData: Float32Array;
      let colorRange = { min: 0, max: 1 };
      
      switch (visualizationType) {
        case 'stress':
          colorData = visualization.stressField;
          colorRange = {
            min: Math.min(...Array.from(colorData)),
            max: Math.max(...Array.from(colorData))
          };
          break;
        case 'displacement':
          colorData = visualization.displacementField;
          colorRange = {
            min: Math.min(...Array.from(colorData)),
            max: Math.max(...Array.from(colorData))
          };
          break;
        default:
          colorData = new Float32Array(mesh.vertices.length / 3).fill(0.5);
      }

      // 创建颜色数组
      const colors = new Float32Array(colorData.length * 3);
      for (let i = 0; i < colorData.length; i++) {
        const normalizedValue = (colorData[i] - colorRange.min) / (colorRange.max - colorRange.min);
        const color = valueToColor(normalizedValue);
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
      }
      
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      // 创建材质
      const material = new THREE.MeshLambertMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.9
      });

      // 创建网格
      const resultMesh = new THREE.Mesh(geometry, material);
      resultMesh.castShadow = true;
      resultMesh.receiveShadow = true;
      
      meshRef.current = resultMesh;
      sceneRef.current.add(resultMesh);

      // 更新统计信息
      setRenderStats(prev => ({
        ...prev,
        triangles: mesh.faces.length / 3
      }));

    } catch (error) {
      console.error('结果渲染失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, [results, visualizationType]);

  // 值到颜色映射函数
  const valueToColor = (value: number): { r: number; g: number; b: number } => {
    // 彩虹色映射
    const hue = (1 - value) * 240; // 从红色(0)到蓝色(240)
    const saturation = 1;
    const lightness = 0.5;
    
    const c = (1 - Math.abs(2 * lightness - 1)) * saturation;
    const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
    const m = lightness - c / 2;
    
    let r = 0, g = 0, b = 0;
    
    if (hue >= 0 && hue < 60) {
      r = c; g = x; b = 0;
    } else if (hue >= 60 && hue < 120) {
      r = x; g = c; b = 0;
    } else if (hue >= 120 && hue < 180) {
      r = 0; g = c; b = x;
    } else if (hue >= 180 && hue < 240) {
      r = 0; g = x; b = c;
    } else if (hue >= 240 && hue < 300) {
      r = x; g = 0; b = c;
    } else {
      r = c; g = 0; b = x;
    }
    
    return {
      r: r + m,
      g: g + m,
      b: b + m
    };
  };

  return (
    <div className="results-renderer" style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* 控制面板 */}
      <div className="visualization-controls" style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        background: 'rgba(30, 30, 30, 0.9)',
        padding: '10px',
        borderRadius: '8px',
        zIndex: 10
      }}>
        <div style={{ color: '#00d9ff', fontSize: '14px', marginBottom: '8px' }}>可视化类型</div>
        <select 
          value={visualizationType}
          onChange={(e) => onVisualizationChange?.(e.target.value)}
          style={{
            background: '#2d2d2d',
            color: '#ffffff',
            border: '1px solid #555',
            borderRadius: '4px',
            padding: '4px'
          }}
        >
          <option value="stress">应力分布</option>
          <option value="displacement">位移分布</option>
          <option value="safety">安全系数</option>
        </select>
      </div>

      {/* 性能统计 */}
      <div className="render-stats" style={{
        position: 'absolute',
        bottom: '10px',
        right: '10px',
        background: 'rgba(30, 30, 30, 0.9)',
        padding: '8px',
        borderRadius: '6px',
        fontSize: '12px',
        color: '#a0a0a0',
        zIndex: 10
      }}>
        <div>FPS: {renderStats.fps}</div>
        <div>三角形: {renderStats.triangles.toLocaleString()}</div>
      </div>

      {/* 加载指示器 */}
      {isLoading && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#00d9ff',
          fontSize: '16px',
          zIndex: 20
        }}>
          正在渲染结果...
        </div>
      )}

      {/* 无数据提示 */}
      {!results && !isLoading && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#666',
          fontSize: '16px',
          textAlign: 'center'
        }}>
          <div>暂无结果数据</div>
          <div style={{ fontSize: '14px', marginTop: '8px' }}>请先运行计算分析</div>
        </div>
      )}

      {/* 3D渲染容器 */}
      <div 
        ref={mountRef} 
        style={{ 
          width: '100%', 
          height: '100%',
          background: '#1a1a2e'
        }} 
      />
    </div>
  );
};

export default ResultsRenderer;