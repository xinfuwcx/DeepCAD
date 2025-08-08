/**
 * Three.js 组件清理工具
 * 提供安全的DOM操作和资源清理方法
 */

import * as THREE from 'three';

/**
 * 安全地从父节点移除Three.js渲染器的canvas元素
 */
export function safeRemoveRenderer(
  renderer: THREE.WebGLRenderer | null,
  container: HTMLElement | null
): void {
  if (!renderer || !container) return;

  try {
    const canvas = renderer.domElement;
    if (canvas && canvas.parentNode === container) {
      if (container.contains(canvas)) {
        container.removeChild(canvas);
      }
    }
    renderer.dispose();
  } catch (error) {
    console.warn('Three.js渲染器清理警告:', error);
  }
}

/**
 * 安全地清空容器内容
 */
export function safeEmptyContainer(container: HTMLElement | null): void {
  if (!container) return;

  while (container.firstChild) {
    try {
      if (container.firstChild && container.contains(container.firstChild)) {
        container.removeChild(container.firstChild);
      }
    } catch (error) {
      console.warn('DOM节点清理警告:', error);
      break;
    }
  }
}

/**
 * 清理Three.js材质和纹理
 */
export function disposeMaterial(material: THREE.Material | THREE.Material[]): void {
  const materials = Array.isArray(material) ? material : [material];
  
  materials.forEach(mat => {
    try {
      // 清理纹理
  const mAny = mat as any;
  try { if (mAny.map) mAny.map.dispose(); } catch { }
  try { if (mAny.normalMap) mAny.normalMap.dispose(); } catch { }
  try { if (mAny.roughnessMap) mAny.roughnessMap.dispose(); } catch { }
  try { if (mAny.metalnessMap) mAny.metalnessMap.dispose(); } catch { }
  try { if (mAny.envMap) mAny.envMap.dispose(); } catch { }
  try { if (mAny.aoMap) mAny.aoMap.dispose(); } catch { }
  try { if (mAny.emissiveMap) mAny.emissiveMap.dispose(); } catch { }
  try { if (mAny.bumpMap) mAny.bumpMap.dispose(); } catch { }
  try { if (mAny.displacementMap) mAny.displacementMap.dispose(); } catch { }
  try { if (mAny.alphaMap) mAny.alphaMap.dispose(); } catch { }
      
      // 清理材质
      mat.dispose();
    } catch (error) {
      console.warn('材质清理警告:', error);
    }
  });
}

/**
 * 清理Three.js几何体
 */
export function disposeGeometry(geometry: THREE.BufferGeometry): void {
  try {
    geometry.dispose();
  } catch (error) {
    console.warn('几何体清理警告:', error);
  }
}

/**
 * 递归清理Three.js对象及其子对象
 */
export function disposeObject3D(object: THREE.Object3D): void {
  try {
    object.traverse((child) => {
      const cAny = child as any;
      if (cAny.geometry) {
        try { disposeGeometry(cAny.geometry); } catch { }
      }
      if (cAny.material) {
        try { disposeMaterial(cAny.material); } catch { }
      }
    });
    
    // 清理子对象
    while (object.children.length > 0) {
      object.remove(object.children[0]);
    }
  } catch (error) {
    console.warn('Object3D清理警告:', error);
  }
}

/**
 * 完整的Three.js场景清理
 */
export function cleanupThreeScene(
  scene: THREE.Scene | null,
  renderer: THREE.WebGLRenderer | null,
  container: HTMLElement | null,
  animationFrameId?: number | null
): void {
  try {
    // 停止动画循环
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }

    // 清理场景
    if (scene) {
      disposeObject3D(scene);
      scene.clear();
    }

    // 清理渲染器和DOM
    if (renderer && container) {
      safeRemoveRenderer(renderer, container);
    }

    // 强制垃圾回收（如果可用）
    if (window.gc) {
      window.gc();
    }
  } catch (error) {
    console.warn('Three.js场景完整清理警告:', error);
  }
}

/**
 * WebGL上下文丢失处理
 */
export function handleWebGLContextLoss(renderer: THREE.WebGLRenderer): void {
  try {
    const gl = renderer.getContext();
    const loseContextExt = gl.getExtension('WEBGL_lose_context');
    if (loseContextExt) {
      loseContextExt.loseContext();
    }
  } catch (error) {
    console.warn('WebGL上下文清理警告:', error);
  }
}

/**
 * React useEffect清理函数的标准模板
 */
export function createThreeCleanupFunction(
  renderer: React.MutableRefObject<THREE.WebGLRenderer | null>,
  scene: React.MutableRefObject<THREE.Scene | null>,
  container: React.MutableRefObject<HTMLElement | null>,
  animationFrame: React.MutableRefObject<number | null>
) {
  return () => {
    console.log('🧹 执行Three.js组件清理...');
    
    if (animationFrame.current) {
      cancelAnimationFrame(animationFrame.current);
      animationFrame.current = null;
    }

    if (renderer.current && container.current) {
      safeRemoveRenderer(renderer.current, container.current);
      renderer.current = null;
    }

    if (scene.current) {
      disposeObject3D(scene.current);
      scene.current = null;
    }

    console.log('✅ Three.js组件清理完成');
  };
}