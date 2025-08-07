/**
 * React Three Fiber 3D场景组件
 * 集成3d-tiles-renderer，专门用于深基坑项目的3D可视化
 */

import React, { useRef, useEffect, useState, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, Grid, Stats } from '@react-three/drei';
import { TilesRenderer } from '3d-tiles-renderer';
import * as THREE from 'three';
import SceneControlPanel from './SceneControlPanel';
import ThreeErrorBoundary from './ThreeErrorBoundary';

// 3D瓦片信息接口
export interface TilesetInfo {
  id: string;
  name: string;
  url: string;
  position: {
    x: number;
    y: number;
    z: number;
  };
  loaded: boolean;
}

// 真正的3D瓦片组件
const TilesModel: React.FC<{ tilesetInfo: TilesetInfo; onLoad?: () => void }> = ({
  tilesetInfo,
  onLoad
}) => {
  const { scene, camera, gl } = useThree();
  const tilesRef = useRef<TilesRenderer>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tilesetInfo.url) return;

    console.log(`🧊 开始加载真正的3D瓦片: ${tilesetInfo.name}`);
    console.log(`📍 瓦片URL: ${tilesetInfo.url}`);

    try {
      // 创建3D瓦片渲染器
      const tilesRenderer = new TilesRenderer(tilesetInfo.url);
      tilesRef.current = tilesRenderer;

      // 安全地设置相机和渲染器
      if (camera && gl) {
        console.log(`📹 设置相机和渲染器...`);
        tilesRenderer.setCamera(camera);

        // 检查渲染器是否有getSize方法
        if (gl && typeof gl.getSize === 'function') {
          tilesRenderer.setResolutionFromRenderer(gl);
        } else {
          console.warn('⚠️ 渲染器没有getSize方法，使用默认分辨率');
          tilesRenderer.setResolution(window.innerWidth, window.innerHeight);
        }
      }

      // 监听加载事件
      tilesRenderer.addEventListener('load-tile-set', () => {
        console.log(`✅ 3D瓦片加载完成: ${tilesetInfo.name}`);
        setIsLoading(false);
        setError(null);
        onLoad?.();
      });

      // 监听错误事件
      tilesRenderer.addEventListener('load-tile-set-failed', (event: any) => {
        console.error(`❌ 3D瓦片加载失败: ${tilesetInfo.name}`, event);
        setError(`加载失败: ${event.message || '未知错误'}`);
        setIsLoading(false);
      });

      // 添加到场景
      scene.add(tilesRenderer.group);

      // 设置位置
      tilesRenderer.group.position.set(
        tilesetInfo.position.x,
        tilesetInfo.position.y,
        tilesetInfo.position.z
      );

      console.log(`🎯 3D瓦片渲染器设置完成: ${tilesetInfo.name}`);

    } catch (error) {
      console.error(`❌ 3D瓦片渲染器创建失败:`, error);
      setError(`创建失败: ${error.message}`);
      setIsLoading(false);
    }

    return () => {
      // 清理资源
      if (tilesRef.current) {
        console.log(`🧹 清理3D瓦片资源: ${tilesetInfo.name}`);
        scene.remove(tilesRef.current.group);
        tilesRef.current.dispose();
      }
    };
  }, [tilesetInfo, scene, camera, gl, onLoad]);

  // 更新瓦片渲染器
  useFrame(() => {
    if (tilesRef.current && !isLoading && !error) {
      tilesRef.current.update();
    }
  });

  // 如果有错误，显示占位符模型
  if (error) {
    console.log(`🔄 3D瓦片加载失败，显示占位符模型: ${tilesetInfo.name}`);
    return (
      <group position={[tilesetInfo.position.x, tilesetInfo.position.y, tilesetInfo.position.z]}>
        {/* 错误占位符 - 红色建筑 */}
        <mesh position={[0, 25, 0]} castShadow receiveShadow>
          <boxGeometry args={[40, 50, 30]} />
          <meshStandardMaterial
            color="#ff4444"
            transparent
            opacity={0.7}
            roughness={0.3}
            metalness={0.1}
          />
        </mesh>

        {/* 错误标识 */}
        <mesh position={[0, 60, 0]}>
          <planeGeometry args={[30, 8]} />
          <meshBasicMaterial color="#ff0000" transparent opacity={0.8} />
        </mesh>
      </group>
    );
  }

  return null;
};

// 演示建筑模型组件
const DemoBuilding: React.FC<{
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  name: string;
}> = ({ position, size, color, name }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [clicked, setClicked] = useState(false);

  useFrame((state) => {
    if (meshRef.current) {
      // 减少动画频率，提高性能
      const time = state.clock.elapsedTime;

      // 轻微的呼吸动画（降低频率）
      if (time % 0.1 < 0.016) { // 约60fps中的每6帧更新一次
        meshRef.current.scale.y = 1 + Math.sin(time * 0.5) * 0.02;
      }

      // 悬停时的旋转效果（降低频率）
      if (hovered && time % 0.05 < 0.016) {
        meshRef.current.rotation.y += 0.005;
      }

      // 点击时的缩放效果（降低频率）
      if (clicked && time % 0.05 < 0.016) {
        meshRef.current.scale.setScalar(1.1 + Math.sin(time * 2) * 0.05);
      }
    }
  });

  const handleClick = () => {
    setClicked(!clicked);
    console.log(`🏢 点击建筑: ${name}`);
  };

  return (
    <group>
      <mesh
        ref={meshRef}
        position={position}
        castShadow
        receiveShadow
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={handleClick}
      >
        <boxGeometry args={size} />
        <meshStandardMaterial
          color={clicked ? '#00ff00' : (hovered ? '#ff6b6b' : color)}
          transparent
          opacity={clicked ? 0.9 : 0.8}
          roughness={0.7}
          metalness={0.1}
        />
      </mesh>

      {/* 建筑标签 */}
      {(hovered || clicked) && (
        <mesh position={[position[0], position[1] + size[1]/2 + 5, position[2]]}>
          <planeGeometry args={[name.length * 2, 3]} />
          <meshBasicMaterial color={clicked ? '#00aa00' : 'black'} transparent opacity={0.8} />
        </mesh>
      )}

      {/* 选中指示器 */}
      {clicked && (
        <mesh position={[position[0], position[1] - size[1]/2 - 2, position[2]]}>
          <ringGeometry args={[size[0]/2 + 2, size[0]/2 + 4, 8]} />
          <meshBasicMaterial color="#00ff00" transparent opacity={0.6} />
        </mesh>
      )}
    </group>
  );
};

// 深基坑组件
const DeepExcavation: React.FC = () => {
  return (
    <group>
      {/* 基坑主体 */}
      <mesh position={[0, -15, 0]} receiveShadow>
        <boxGeometry args={[80, 30, 60]} />
        <meshStandardMaterial
          color="#8B4513"
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 基坑边缘 */}
      <lineSegments position={[0, 0, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(80, 30, 60)]} />
        <lineBasicMaterial color="#ff0000" linewidth={2} />
      </lineSegments>

      {/* 支撑结构 */}
      {Array.from({ length: 4 }, (_, i) => (
        <mesh
          key={i}
          position={[
            (i % 2 === 0 ? -35 : 35),
            -5,
            (i < 2 ? -25 : 25)
          ]}
          castShadow
        >
          <cylinderGeometry args={[1, 1, 20]} />
          <meshStandardMaterial color="#666666" />
        </mesh>
      ))}
    </group>
  );
};

// 地面网格组件
const GroundGrid: React.FC = () => {
  return (
    <>
      {/* 地面 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#90EE90" />
      </mesh>

      {/* 网格 */}
      <Grid
        args={[200, 200]}
        cellSize={10}
        cellThickness={0.5}
        cellColor="#ffffff"
        sectionSize={50}
        sectionThickness={1}
        sectionColor="#0066cc"
        fadeDistance={100}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid={false}
      />
    </>
  );
};

// 场景光照组件
const SceneLighting: React.FC = () => {
  return (
    <>
      {/* 环境光 */}
      <ambientLight intensity={0.4} />
      
      {/* 主光源 */}
      <directionalLight
        position={[50, 50, 25]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={200}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
      />
      
      {/* 补光 */}
      <directionalLight
        position={[-30, 30, -25]}
        intensity={0.3}
      />
    </>
  );
};

// 相机动画组件（优化性能版本）
const CameraAnimation: React.FC = () => {
  const { camera } = useThree();

  useFrame((state) => {
    // 降低更新频率的相机摆动
    const time = state.clock.elapsedTime;
    if (time % 0.1 < 0.016) { // 降低更新频率
      camera.position.x = 50 + Math.sin(time * 0.1) * 5;
      camera.position.y = 50 + Math.cos(time * 0.15) * 3;
      camera.lookAt(0, 0, 0);
    }
  });

  return null;
};

// 主要的3D场景组件
export interface ThreeScene3DTilesProps {
  tilesetInfo?: TilesetInfo;
  onTilesetLoad?: () => void;
  showStats?: boolean;
  showDemo?: boolean;
  enableCameraAnimation?: boolean;
}

export const ThreeScene3DTiles: React.FC<ThreeScene3DTilesProps> = ({
  tilesetInfo,
  onTilesetLoad,
  showStats = false,
  showDemo = true,
  enableCameraAnimation = false
}) => {
  const [sceneSettings, setSceneSettings] = useState({
    showStats,
    showDemo,
    enableCameraAnimation,
    wireframe: false
  });

  return (
    <ThreeErrorBoundary>
      <div style={{ width: '100%', height: '100%', position: 'relative' }}>
        {/* 3D瓦片状态显示 */}
        {tilesetInfo && (
          <div style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '14px',
            zIndex: 1000,
            fontFamily: 'Arial, sans-serif',
            minWidth: '200px'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
              🧊 3D瓦片状态
            </div>
            <div style={{ marginBottom: '4px' }}>
              📁 项目: {tilesetInfo.name}
            </div>
            <div style={{ marginBottom: '4px', fontSize: '12px', opacity: 0.8 }}>
              🌐 URL: {tilesetInfo.url.length > 40 ? tilesetInfo.url.substring(0, 40) + '...' : tilesetInfo.url}
            </div>
            <div style={{ fontSize: '12px', color: '#4CAF50' }}>
              ✅ 正在尝试加载3D瓦片...
            </div>
          </div>
        )}

        {/* 3D场景控制面板 */}
        <SceneControlPanel
          onToggleStats={(enabled) => setSceneSettings(prev => ({ ...prev, showStats: enabled }))}
          onToggleDemo={(enabled) => setSceneSettings(prev => ({ ...prev, showDemo: enabled }))}
          onToggleCameraAnimation={(enabled) => setSceneSettings(prev => ({ ...prev, enableCameraAnimation: enabled }))}
          onToggleWireframe={(enabled) => setSceneSettings(prev => ({ ...prev, wireframe: enabled }))}
          onResetCamera={() => {
            // TODO: 实现相机重置功能
            console.log('🎯 重置相机位置');
          }}
        />

        <Canvas
        camera={{
          position: [50, 50, 50],
          fov: 60,
          near: 0.1,
          far: 1000
        }}
        gl={{
          antialias: true,
          alpha: false,
          preserveDrawingBuffer: false,
          powerPreference: "high-performance"
        }}
      >
        <Suspense fallback={null}>
          {/* 场景光照 */}
          <SceneLighting />
          
          {/* 环境贴图 */}
          <Environment preset="city" />
          
          {/* 地面和网格 */}
          <GroundGrid />
          
          {/* 演示建筑 */}
          {sceneSettings.showDemo && (
            <>
              <DemoBuilding
                position={[0, 20, 0]}
                size={[20, 40, 15]}
                color="#8B4513"
                name="主楼"
              />
              <DemoBuilding
                position={[35, 15, 25]}
                size={[15, 30, 12]}
                color="#4682B4"
                name="办公楼A"
              />
              <DemoBuilding
                position={[-30, 25, -20]}
                size={[18, 50, 18]}
                color="#228B22"
                name="办公楼B"
              />
              <DemoBuilding
                position={[60, 10, -10]}
                size={[12, 20, 10]}
                color="#FF6347"
                name="配套设施"
              />
              <DemoBuilding
                position={[-50, 18, 30]}
                size={[16, 36, 14]}
                color="#9370DB"
                name="研发中心"
              />
            </>
          )}
          
          {/* 3D瓦片模型 */}
          {tilesetInfo && (
            <TilesModel
              tilesetInfo={tilesetInfo}
              onLoad={onTilesetLoad}
            />
          )}
          
          {/* 相机控制 */}
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={10}
            maxDistance={500}
            maxPolarAngle={Math.PI / 2}
            enableDamping={true}
            dampingFactor={0.05}
          />

          {/* 相机动画 */}
          {sceneSettings.enableCameraAnimation && <CameraAnimation />}

          {/* 性能统计 */}
          {sceneSettings.showStats && <Stats />}
        </Suspense>
      </Canvas>
    </div>
    </ThreeErrorBoundary>
  );
};

export default ThreeScene3DTiles;
