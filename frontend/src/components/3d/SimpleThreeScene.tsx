/**
 * 简化的React Three Fiber 3D场景组件
 * 专注于3D瓦片渲染，避免复杂的配置错误
 */

import React, { useRef, useEffect, useState, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, Grid } from '@react-three/drei';
import { TilesRenderer } from '3d-tiles-renderer';
import * as THREE from 'three';

// 3D瓦片信息接口
export interface TilesetInfo {
  id: string;
  name: string;
  url: string;
  loaded: boolean;
  position: {
    x: number;
    y: number;
    z: number;
  };
}

// 真正的3D瓦片组件
const TilesModel: React.FC<{ tilesetInfo: TilesetInfo; onLoad?: () => void }> = ({ 
  tilesetInfo, 
  onLoad 
}) => {
  const { scene, camera, gl } = useThree();
  const tilesRef = useRef<TilesRenderer>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tilesetInfo.url) return;

    console.log(`🧊 开始加载3D瓦片: ${tilesetInfo.name}`);
    
    try {
      // 创建3D瓦片渲染器
      const tilesRenderer = new TilesRenderer(tilesetInfo.url);
      tilesRef.current = tilesRenderer;

      // 设置相机和渲染器
      if (camera && gl) {
        tilesRenderer.setCamera(camera);
        
        // 安全地设置分辨率
        try {
          if (gl && typeof gl.getSize === 'function') {
            tilesRenderer.setResolutionFromRenderer(gl);
          } else {
            tilesRenderer.setResolution(window.innerWidth, window.innerHeight);
          }
        } catch (resError) {
          console.warn('⚠️ 设置分辨率失败，使用默认值:', resError);
          tilesRenderer.setResolution(1920, 1080);
        }
      }

      // 监听加载事件
      tilesRenderer.addEventListener('load-tile-set', () => {
        console.log(`✅ 3D瓦片加载完成: ${tilesetInfo.name}`);
        onLoad?.();
      });

      // 监听错误事件
      tilesRenderer.addEventListener('load-tile-set-failed', (event: any) => {
        console.error(`❌ 3D瓦片加载失败: ${tilesetInfo.name}`, event);
        setError(`加载失败: ${event.message || '网络错误'}`);
      });

      // 添加到场景
      scene.add(tilesRenderer.group);

      // 设置位置
      tilesRenderer.group.position.set(
        tilesetInfo.position.x,
        tilesetInfo.position.y,
        tilesetInfo.position.z
      );

    } catch (error) {
      console.error(`❌ 3D瓦片渲染器创建失败:`, error);
      setError(`创建失败: ${error.message}`);
    }

    return () => {
      if (tilesRef.current) {
        scene.remove(tilesRef.current.group);
        tilesRef.current.dispose();
      }
    };
  }, [tilesetInfo, scene, camera, gl, onLoad]);

  // 更新瓦片渲染器
  useFrame(() => {
    if (tilesRef.current && !error) {
      tilesRef.current.update();
    }
  });

  // 如果有错误，显示占位符
  if (error) {
    return (
      <mesh position={[0, 25, 0]}>
        <boxGeometry args={[40, 50, 30]} />
        <meshStandardMaterial color="#ff4444" transparent opacity={0.7} />
      </mesh>
    );
  }

  return null;
};

// 演示建筑组件
const DemoBuilding: React.FC<{ 
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  name: string;
}> = ({ position, size, color, name }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <mesh 
      position={position} 
      castShadow 
      receiveShadow
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      onClick={() => console.log(`🏢 点击建筑: ${name}`)}
    >
      <boxGeometry args={size} />
      <meshStandardMaterial 
        color={hovered ? '#ff6b6b' : color}
        transparent 
        opacity={0.8}
      />
    </mesh>
  );
};

// 主要的3D场景组件
export interface SimpleThreeSceneProps {
  tilesetInfo?: TilesetInfo;
  onTilesetLoad?: () => void;
  showDemo?: boolean;
}

export const SimpleThreeScene: React.FC<SimpleThreeSceneProps> = ({
  tilesetInfo,
  onTilesetLoad,
  showDemo = true
}) => {
  return (
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
          <div style={{ fontSize: '12px', color: '#4CAF50' }}>
            ✅ 正在加载3D瓦片...
          </div>
        </div>
      )}
      
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
          powerPreference: "high-performance"
        }}
      >
        <Suspense fallback={null}>
          {/* 场景光照 */}
          <ambientLight intensity={0.4} />
          <directionalLight
            position={[50, 50, 25]}
            intensity={1}
            castShadow
          />
          
          {/* 环境贴图 */}
          <Environment preset="city" />
          
          {/* 地面和网格 */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[200, 200]} />
            <meshStandardMaterial color="#90EE90" />
          </mesh>
          
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
          
          {/* 演示建筑 */}
          {showDemo && (
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
        </Suspense>
      </Canvas>
    </div>
  );
};

export default SimpleThreeScene;
