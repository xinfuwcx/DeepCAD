/**
 * 紧急性能修复方案
 * 解决FPS低于2和内存使用率97%的问题
 */

import * as THREE from 'three';

export class EmergencyPerformanceFix {
  private static instance: EmergencyPerformanceFix;
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private isOptimized: boolean = false;

  static getInstance(): EmergencyPerformanceFix {
    if (!this.instance) {
      this.instance = new EmergencyPerformanceFix();
    }
    return this.instance;
  }

  /**
   * 紧急优化渲染器
   */
  optimizeRenderer(renderer: THREE.WebGLRenderer): void {
    this.renderer = renderer;
    
    // 降低像素比
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    
    // 禁用阴影以提高性能
    renderer.shadowMap.enabled = false;
    
    // 降低色调映射质量
    renderer.toneMapping = THREE.LinearToneMapping;
    
    // 禁用自动清理以减少CPU负载
    renderer.autoClear = false;
    
    console.log('🚀 紧急渲染器优化完成');
  }

  /**
   * 优化场景对象
   */
  optimizeScene(scene: THREE.Scene): void {
    this.scene = scene;
    
    let optimizedCount = 0;
    
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        // 简化材质
        if (object.material instanceof THREE.MeshStandardMaterial) {
          const basicMaterial = new THREE.MeshBasicMaterial({
            color: object.material.color,
            map: object.material.map,
            transparent: object.material.transparent,
            opacity: object.material.opacity
          });
          object.material = basicMaterial;
          optimizedCount++;
        }
        
        // 降低几何体精度
        if (object.geometry instanceof THREE.BufferGeometry) {
          const positionAttribute = object.geometry.getAttribute('position');
          if (positionAttribute && positionAttribute.count > 1000) {
            // 简化几何体
            this.simplifyGeometry(object.geometry);
          }
        }
      }
    });
    
    console.log(`🔧 场景优化完成: ${optimizedCount} 个材质已简化`);
  }

  /**
   * 简化几何体
   */
  private simplifyGeometry(geometry: THREE.BufferGeometry): void {
    const positionAttribute = geometry.getAttribute('position');
    if (!positionAttribute) return;
    
    const originalCount = positionAttribute.count;
    const targetCount = Math.min(originalCount, 500); // 限制最大顶点数
    
    if (originalCount > targetCount) {
      const step = Math.floor(originalCount / targetCount);
      const newPositions: number[] = [];
      
      for (let i = 0; i < originalCount; i += step) {
        const index = i * 3;
        newPositions.push(
          positionAttribute.array[index],
          positionAttribute.array[index + 1],
          positionAttribute.array[index + 2]
        );
      }
      
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
    }
  }

  /**
   * 内存清理
   */
  cleanupMemory(): void {
    if (!this.scene) return;
    
    let cleanedObjects = 0;
    const objectsToRemove: THREE.Object3D[] = [];
    
    this.scene.traverse((object) => {
      // 移除不必要的对象
      if (object.userData.isTemporary || object.userData.isDebug) {
        objectsToRemove.push(object);
      }
      
      // 清理几何体
      if (object instanceof THREE.Mesh && object.geometry) {
        // 只保留position属性，移除其他属性
        const position = object.geometry.getAttribute('position');
        if (position) {
          const newGeometry = new THREE.BufferGeometry();
          newGeometry.setAttribute('position', position);
          newGeometry.computeBoundingBox();
          
          // 清理旧几何体
          object.geometry.dispose();
          object.geometry = newGeometry;
          cleanedObjects++;
        }
      }
    });
    
    // 移除临时对象
    objectsToRemove.forEach(obj => {
      if (obj.parent) {
        obj.parent.remove(obj);
      }
    });
    
    // 强制垃圾回收
    if (window.gc) {
      window.gc();
    }
    
    console.log(`🧹 内存清理完成: ${cleanedObjects} 个几何体优化, ${objectsToRemove.length} 个对象移除`);
  }

  /**
   * 降低渲染质量
   */
  reducerRenderQuality(): void {
    if (!this.renderer) return;
    
    // 降低分辨率
    const canvas = this.renderer.domElement;
    const width = Math.floor(canvas.clientWidth * 0.75);
    const height = Math.floor(canvas.clientHeight * 0.75);
    
    this.renderer.setSize(width, height, false);
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    
    console.log(`📐 渲染质量降低: ${width}x${height}`);
  }

  /**
   * 禁用不必要的渲染特性
   */
  disableExpensiveFeatures(): void {
    if (!this.renderer || !this.scene) return;
    
    // 禁用雾效
    this.scene.fog = null;
    
    // 移除后处理效果
    this.scene.traverse((object) => {
      if (object instanceof THREE.Light && object.type !== 'AmbientLight') {
        object.intensity *= 0.5; // 降低光照强度
      }
    });
    
    console.log('💡 昂贵特性已禁用');
  }

  /**
   * 应用所有紧急优化
   */
  applyEmergencyOptimizations(renderer: THREE.WebGLRenderer, scene: THREE.Scene): void {
    if (this.isOptimized) return;
    
    console.log('🚨 应用紧急性能优化...');
    
    this.optimizeRenderer(renderer);
    this.optimizeScene(scene);
    this.cleanupMemory();
    this.reducerRenderQuality();
    this.disableExpensiveFeatures();
    
    this.isOptimized = true;
    
    console.log('✅ 紧急性能优化完成！');
  }

  /**
   * 重置优化状态
   */
  reset(): void {
    this.isOptimized = false;
  }
}

// 全局实例
export const emergencyPerformanceFix = EmergencyPerformanceFix.getInstance(); 