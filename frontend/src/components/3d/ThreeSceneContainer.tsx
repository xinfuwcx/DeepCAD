/**
 * React Three Fiber场景容器组件
 * 负责将3D场景集成到控制中心中
 */

import React, { useEffect, useState, useRef } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { SimpleThreeScene, TilesetInfo } from './SimpleThreeScene';
import { useControlCenterStore } from '../../stores/controlCenterStore';

export interface ThreeSceneContainerProps {
  containerId: string;
  tilesetInfo?: TilesetInfo;
  showStats?: boolean;
  showDemo?: boolean;
}

export const ThreeSceneContainer: React.FC<ThreeSceneContainerProps> = ({
  containerId,
  tilesetInfo,
  showStats = false,
  showDemo = true
}) => {
  const [isReady, setIsReady] = useState(false);
  const rootRef = useRef<Root | null>(null);
  const setMapStatus = useControlCenterStore(state => state.setMapStatus);

  useEffect(() => {
    // 查找目标容器
    const targetContainer = document.getElementById(containerId);
    if (!targetContainer) {
      console.warn(`❌ 找不到容器: ${containerId}`);
      return;
    }

    console.log(`🎨 在容器 ${containerId} 中渲染React Three Fiber场景`);

    // 创建React根节点
    if (!rootRef.current) {
      rootRef.current = createRoot(targetContainer);
    }

    // 渲染3D场景
    rootRef.current.render(
      <SimpleThreeScene
        tilesetInfo={tilesetInfo}
        onTilesetLoad={() => {
          console.log('✅ 3D瓦片加载完成');
          setMapStatus('tileset-loaded', '3D模型加载完成');
        }}
        showDemo={showDemo}
      />
    );

    setIsReady(true);

    return () => {
      // 清理React根节点
      if (rootRef.current) {
        rootRef.current.unmount();
        rootRef.current = null;
      }
    };
  }, [containerId, tilesetInfo, showStats, showDemo, setMapStatus]);

  // 这个组件不渲染任何内容，它只是将3D场景渲染到指定容器中
  return null;
};

// 存储已创建的根节点，避免重复创建
const rootCache = new Map<string, Root>();

// 工具函数：在指定容器中渲染3D场景
export const renderThreeSceneInContainer = (
  containerId: string,
  tilesetInfo?: TilesetInfo,
  options?: {
    showStats?: boolean;
    showDemo?: boolean;
    enableCameraAnimation?: boolean;
  }
): Root | null => {
  const targetContainer = document.getElementById(containerId);
  if (!targetContainer) {
    console.warn(`❌ 找不到容器: ${containerId}`);
    return null;
  }

  console.log(`🎨 在容器 ${containerId} 中渲染React Three Fiber场景`);

  // 检查是否已经有根节点
  let root = rootCache.get(containerId);

  if (!root) {
    // 创建新的React根节点
    root = createRoot(targetContainer);
    rootCache.set(containerId, root);
    console.log(`🆕 为容器 ${containerId} 创建新的React根节点`);
  } else {
    console.log(`♻️ 重用容器 ${containerId} 的现有React根节点`);
  }

  // 渲染3D场景
  root.render(
    <SimpleThreeScene
      tilesetInfo={tilesetInfo}
      onTilesetLoad={() => {
        console.log('✅ 3D瓦片加载完成');
      }}
      showDemo={options?.showDemo !== false} // 默认显示演示
    />
  );

  return root;
};

export default ThreeSceneContainer;
