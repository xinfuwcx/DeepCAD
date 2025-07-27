import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Button, Typography, Space, Slider } from 'antd';
import { useRealisticRendering } from '../hooks/useRealisticRendering';
import RealisticRenderingEngine, { QUALITY_PRESETS } from '../services/RealisticRenderingEngine';
// import { useModernAxis } from '../hooks/useModernAxis'; // 临时禁用

const { Text } = Typography;

interface ProfessionalViewport3DProps {
  title?: string;
  description?: string;
  mode?: 'advanced' | 'geometry' | 'mesh' | 'results' | 'data' | 'settings' | 'analysis';
  className?: string;
  onAction?: (action: string) => void;
}

const ProfessionalViewport3D: React.FC<ProfessionalViewport3DProps> = ({ 
  title = "3D 视口",
  description = "三维可视化",
  mode = 'geometry',
  className,
  onAction
}) => {
  const [qualityLevel, setQualityLevel] = useState<keyof typeof QUALITY_PRESETS>('high');
  const [showControls, setShowControls] = useState(false);
  
  // 使用真实级渲染引擎
  const {
    mountRef,
    engine,
    scene,
    camera,
    isInitialized,
    render,
    setQuality,
    updatePostProcessing,
    getStats,
    addToScene,
    setCameraPosition,
    lookAt
  } = useRealisticRendering({
    qualityLevel,
    autoResize: true,
    enableStats: true
  });

  const controlsRef = useRef<OrbitControls | null>(null);
  const frameRef = useRef<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 初始化3D场景内容
  useEffect(() => {
    if (!isInitialized || !engine) return;

    console.log('🎨 SimpleViewport3D: 使用真实级渲染引擎初始化场景');

    try {
      // 设置相机位置
      setCameraPosition(8, 6, 8);
      lookAt(0, 0, 0);

      // 添加现代化照明系统
      const setupLighting = () => {
        // 环境光
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        addToScene(ambientLight);

        // 主光源
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
        directionalLight.position.set(10, 10, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.setScalar(2048);
        directionalLight.shadow.bias = -0.001;
        addToScene(directionalLight);

        // 补光
        const fillLight = new THREE.DirectionalLight(0x9bb7ff, 0.3);
        fillLight.position.set(-5, 3, -5);
        addToScene(fillLight);
      };

      setupLighting();

      // 创建轨道控制器（使用渲染引擎的渲染器）
      if (engine && mountRef.current) {
        const controls = new OrbitControls(camera, engine.getRenderer().domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.enableZoom = true;
        controls.enablePan = true;
        controls.enableRotate = true;
        controls.minDistance = 2;
        controls.maxDistance = 50;
        controlsRef.current = controls;
      }

      // 创建现代化网格系统
      const createModernGrid = () => {
        const gridGroup = new THREE.Group();
        
        // 主网格 - 使用PBR材质
        const mainGrid = new THREE.GridHelper(20, 20, 0x1a2332, 0x1a2332);
        (mainGrid.material as THREE.Material).transparent = true;
        (mainGrid.material as THREE.Material).opacity = 0.6;
        gridGroup.add(mainGrid);
        
        // 细网格
        const subGrid = new THREE.GridHelper(20, 40, 0x0f1419, 0x0f1419);
        (subGrid.material as THREE.Material).transparent = true;
        (subGrid.material as THREE.Material).opacity = 0.2;
        subGrid.position.y = -0.01;
        gridGroup.add(subGrid);
        
        return gridGroup;
      };

      const modernGrid = createModernGrid();
      addToScene(modernGrid);

      // 注意：现代化坐标轴将通过 useModernAxis hook 添加

      // 添加示例几何体（根据模式）
      if (mode === 'geometry') {
        // 添加一个使用PBR材质的立方体作为示例
        const cubeGeometry = new THREE.BoxGeometry(2, 2, 2);
        const cubeMaterial = engine.getRenderer ? 
          RealisticRenderingEngine.createPBRMaterial({
            color: 0x00d9ff,
            metalness: 0.3,
            roughness: 0.4,
            envMapIntensity: 1.0
          }) : 
          new THREE.MeshStandardMaterial({ color: 0x00d9ff });
        
        const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
        cube.position.set(0, 1, 0);
        cube.castShadow = true;
        cube.receiveShadow = true;
        addToScene(cube);
      }

      // 创建动画循环
      const animate = () => {
        if (frameRef.current) {
          cancelAnimationFrame(frameRef.current);
        }
        frameRef.current = requestAnimationFrame(animate);
        
        // 更新控制器
        if (controlsRef.current) {
          controlsRef.current.update();
        }
        
        // 渲染
        render();
      };

      animate();
      
      console.log('🎉 SimpleViewport3D: 真实级渲染场景初始化成功');

      // 清理函数
      return () => {
        console.log('SimpleViewport3D: 清理资源');
        
        if (frameRef.current) {
          cancelAnimationFrame(frameRef.current);
        }
        
        if (controlsRef.current) {
          controlsRef.current.dispose();
          controlsRef.current = null;
        }
      };
    } catch (err) {
      console.error('SimpleViewport3D: 3D场景初始化失败:', err);
    }
  }, [isInitialized, engine, mode, addToScene, setCameraPosition, lookAt, render]);

  // 临时禁用现代化坐标轴，使用基础THREE.js坐标轴
  useEffect(() => {
    if (isInitialized && scene) {
      const axesHelper = new THREE.AxesHelper(5);
      axesHelper.setColors(
        new THREE.Color(0xff3333), // X轴 - 红色
        new THREE.Color(0x33ff33), // Y轴 - 绿色
        new THREE.Color(0x3333ff)  // Z轴 - 蓝色
      );
      axesHelper.name = 'simple-axes';
      scene.add(axesHelper);
      
      return () => {
        const axes = scene.getObjectByName('simple-axes');
        if (axes) scene.remove(axes);
      };
    }
  }, [isInitialized, scene]);

  const resetCamera = () => {
    setCameraPosition(8, 6, 8);
    lookAt(0, 0, 0);
    if (controlsRef.current) {
      controlsRef.current.update();
    }
    onAction?.('reset');
  };

  if (error) {
    return (
      <div 
        className={`simple-viewport-3d ${className || ''}`}
        style={{
          width: '100%',
          height: '100%',
          background: '#ff4444',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '16px'
        }}
      >
        错误: {error}
      </div>
    );
  }

  const stats = getStats();

  return (
    <div
      className={`simple-viewport-3d ${className || ''}`}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: '#1a1a2e',
        borderRadius: '8px',
        overflow: 'hidden'
      }}
    >
      {/* 标题栏和控制 */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '40px',
          background: 'rgba(26, 26, 46, 0.9)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          zIndex: 100,
          borderBottom: '1px solid rgba(0, 217, 255, 0.3)'
        }}
      >
        <div>
          <Text style={{ color: '#00d9ff', fontSize: '14px', fontWeight: 'bold', marginRight: '12px' }}>
            {title}
          </Text>
          <Text style={{ color: '#cccccc', fontSize: '12px' }}>
            {description}
          </Text>
          {stats && (
            <Text style={{ color: '#666', fontSize: '11px', marginLeft: '16px' }}>
              {stats.fps} FPS | {stats.memory} MB
            </Text>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Button
            size="small"
            onClick={() => setShowControls(!showControls)}
            style={{
              background: 'rgba(0, 217, 255, 0.1)',
              border: '1px solid rgba(0, 217, 255, 0.3)',
              color: '#00d9ff',
              fontSize: '11px'
            }}
          >
            质量
          </Button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div 
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: isInitialized ? '#52c41a' : '#fa8c16'
              }}
            />
            <Text style={{ color: '#cccccc', fontSize: '12px' }}>
              {isInitialized ? '真实级渲染' : '初始化中...'}
            </Text>
          </div>
        </div>
      </div>

      {/* 3D视图容器 */}
      <div
        ref={mountRef}
        style={{
          position: 'absolute',
          top: '40px',
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: 'calc(100% - 40px)'
        }}
      />

      {/* 控制按钮 */}
      <div
        style={{
          position: 'absolute',
          bottom: '10px',
          left: '10px',
          display: 'flex',
          gap: '8px',
          zIndex: 100
        }}
      >
        <Button 
          size="small"
          style={{ 
            background: 'rgba(26, 26, 46, 0.8)', 
            border: '1px solid rgba(0, 217, 255, 0.3)',
            color: '#ffffff'
          }}
          onClick={resetCamera}
        >
          重置视图
        </Button>
        <Button 
          size="small"
          style={{ 
            background: 'rgba(26, 26, 46, 0.8)', 
            border: '1px solid rgba(0, 217, 255, 0.3)',
            color: '#ffffff'
          }}
          onClick={() => onAction?.('screenshot')}
        >
          截图
        </Button>
      </div>

      {/* 质量控制面板 */}
      {showControls && (
        <div
          style={{
            position: 'absolute',
            top: '50px',
            right: '10px',
            width: '200px',
            background: 'rgba(26, 26, 46, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(0, 217, 255, 0.3)',
            borderRadius: '8px',
            padding: '12px',
            zIndex: 100
          }}
        >
          <Text style={{ color: '#00d9ff', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>
            渲染质量
          </Text>
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <Text style={{ color: '#fff', fontSize: '11px' }}>质量等级</Text>
              <select
                value={qualityLevel}
                onChange={(e) => {
                  const level = e.target.value as keyof typeof QUALITY_PRESETS;
                  setQualityLevel(level);
                  setQuality(level);
                }}
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(0, 217, 255, 0.3)',
                  color: '#fff',
                  padding: '4px',
                  borderRadius: '4px',
                  fontSize: '11px'
                }}
              >
                <option value="low">低质量</option>
                <option value="medium">中等</option>
                <option value="high">高质量</option>
                <option value="ultra">极致</option>
              </select>
            </div>
            
            {stats && (
              <div style={{ fontSize: '10px', color: '#666' }}>
                <div>FPS: {stats.fps}</div>
                <div>内存: {stats.memory} MB</div>
                <div>绘制调用: {stats.drawCalls}</div>
              </div>
            )}
          </Space>
        </div>
      )}

      {/* 坐标系说明 */}
      <div
        style={{
          position: 'absolute',
          top: '50px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(26, 26, 46, 0.9)',
          border: '1px solid rgba(0, 217, 255, 0.3)',
          padding: '8px 12px',
          borderRadius: '8px',
          color: 'white',
          fontSize: '11px',
          zIndex: 100,
          backdropFilter: 'blur(10px)',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
          display: 'flex',
          gap: '12px'
        }}
      >
        <div style={{ color: '#ff0000' }}>X轴</div>
        <div style={{ color: '#00ff00' }}>Y轴</div>
        <div style={{ color: '#0000ff' }}>Z轴</div>
      </div>
    </div>
  );
};

export default ProfessionalViewport3D;