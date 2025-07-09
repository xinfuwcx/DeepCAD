/**
 * 资源管理器 - 防止内存泄漏和优化资源使用
 * @author Deep Excavation Team
 * @date 2025-01-27
 */

import * as THREE from 'three';

export interface DisposableResource {
  dispose(): void;
}

export class ResourceManager {
  private disposables: Set<DisposableResource> = new Set();
  private geometries: Map<string, THREE.BufferGeometry> = new Map();
  private materials: Map<string, THREE.Material> = new Map();
  private textures: Map<string, THREE.Texture> = new Map();
  private eventListeners: Map<string, Function[]> = new Map();
  private animationFrameIds: number[] = [];
  private intervals: NodeJS.Timeout[] = [];
  private timeouts: NodeJS.Timeout[] = [];

  /**
   * 添加可释放资源
   */
  addDisposable(resource: DisposableResource): void {
    this.disposables.add(resource);
  }

  /**
   * 添加Three.js对象到管理
   */
  addThreeObject(object: THREE.Object3D): void {
    this.traverseAndRegister(object);
  }

  /**
   * 遍历并注册Three.js对象的所有资源
   */
  private traverseAndRegister(object: THREE.Object3D): void {
    // 注册几何体
    if (object instanceof THREE.Mesh && object.geometry) {
      const geometry = object.geometry;
      const geometryId = this.getGeometryId(geometry);
      if (!this.geometries.has(geometryId)) {
        this.geometries.set(geometryId, geometry);
      }
    }

    // 注册材质
    if (object instanceof THREE.Mesh && object.material) {
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach(material => {
        const materialId = this.getMaterialId(material);
        if (!this.materials.has(materialId)) {
          this.materials.set(materialId, material);
          
          // 注册材质中的纹理
          this.registerMaterialTextures(material);
        }
      });
    }

    // 递归处理子对象
    object.children.forEach(child => this.traverseAndRegister(child));
  }

  /**
   * 注册材质中的纹理
   */
  private registerMaterialTextures(material: THREE.Material): void {
    const textureProperties = [
      'map', 'normalMap', 'bumpMap', 'displacementMap', 
      'roughnessMap', 'metalnessMap', 'alphaMap', 'envMap'
    ];

    textureProperties.forEach(prop => {
      const texture = (material as any)[prop];
      if (texture && texture instanceof THREE.Texture) {
        const textureId = this.getTextureId(texture);
        if (!this.textures.has(textureId)) {
          this.textures.set(textureId, texture);
        }
      }
    });
  }

  /**
   * 获取几何体ID
   */
  private getGeometryId(geometry: THREE.BufferGeometry): string {
    return `geometry_${geometry.uuid}`;
  }

  /**
   * 获取材质ID
   */
  private getMaterialId(material: THREE.Material): string {
    return `material_${material.uuid}`;
  }

  /**
   * 获取纹理ID
   */
  private getTextureId(texture: THREE.Texture): string {
    return `texture_${texture.uuid}`;
  }

  /**
   * 注册事件监听器
   */
  addEventListener(element: EventTarget, event: string, listener: Function): void {
    element.addEventListener(event, listener as EventListener);
    
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
  }

  /**
   * 注册动画帧
   */
  requestAnimationFrame(callback: FrameRequestCallback): number {
    const id = requestAnimationFrame(callback);
    this.animationFrameIds.push(id);
    return id;
  }

  /**
   * 注册定时器
   */
  setInterval(callback: Function, delay: number): NodeJS.Timeout {
    const id = setInterval(callback, delay);
    this.intervals.push(id);
    return id;
  }

  /**
   * 注册超时器
   */
  setTimeout(callback: Function, delay: number): NodeJS.Timeout {
    const id = setTimeout(callback, delay);
    this.timeouts.push(id);
    return id;
  }

  /**
   * 获取内存使用统计
   */
  getMemoryStats(): {
    geometries: number;
    materials: number;
    textures: number;
    disposables: number;
    eventListeners: number;
    animationFrames: number;
    intervals: number;
    timeouts: number;
  } {
    return {
      geometries: this.geometries.size,
      materials: this.materials.size,
      textures: this.textures.size,
      disposables: this.disposables.size,
      eventListeners: Array.from(this.eventListeners.values()).reduce((sum, arr) => sum + arr.length, 0),
      animationFrames: this.animationFrameIds.length,
      intervals: this.intervals.length,
      timeouts: this.timeouts.length
    };
  }

  /**
   * 清理所有资源
   */
  cleanup(): void {
    console.log('🧹 开始清理资源...', this.getMemoryStats());

    // 1. 清理可释放资源
    this.disposables.forEach(resource => {
      try {
        resource.dispose();
      } catch (error) {
        console.warn('释放资源时出错:', error);
      }
    });
    this.disposables.clear();

    // 2. 清理几何体
    this.geometries.forEach(geometry => {
      try {
        geometry.dispose();
      } catch (error) {
        console.warn('释放几何体时出错:', error);
      }
    });
    this.geometries.clear();

    // 3. 清理材质
    this.materials.forEach(material => {
      try {
        material.dispose();
      } catch (error) {
        console.warn('释放材质时出错:', error);
      }
    });
    this.materials.clear();

    // 4. 清理纹理
    this.textures.forEach(texture => {
      try {
        texture.dispose();
      } catch (error) {
        console.warn('释放纹理时出错:', error);
      }
    });
    this.textures.clear();

    // 5. 清理事件监听器
    this.eventListeners.forEach((listeners, event) => {
      listeners.forEach(listener => {
        try {
          window.removeEventListener(event, listener as EventListener);
        } catch (error) {
          console.warn('移除事件监听器时出错:', error);
        }
      });
    });
    this.eventListeners.clear();

    // 6. 清理动画帧
    this.animationFrameIds.forEach(id => {
      try {
        cancelAnimationFrame(id);
      } catch (error) {
        console.warn('取消动画帧时出错:', error);
      }
    });
    this.animationFrameIds.length = 0;

    // 7. 清理定时器
    this.intervals.forEach(id => {
      try {
        clearInterval(id);
      } catch (error) {
        console.warn('清理定时器时出错:', error);
      }
    });
    this.intervals.length = 0;

    // 8. 清理超时器
    this.timeouts.forEach(id => {
      try {
        clearTimeout(id);
      } catch (error) {
        console.warn('清理超时器时出错:', error);
      }
    });
    this.timeouts.length = 0;

    console.log('✅ 资源清理完成');
  }

  /**
   * 强制垃圾回收（仅在支持的浏览器中）
   */
  forceGarbageCollection(): void {
    if ('gc' in window && typeof (window as any).gc === 'function') {
      (window as any).gc();
    }
  }
}

// 全局资源管理器实例
export const globalResourceManager = new ResourceManager();

// 页面卸载时自动清理
window.addEventListener('beforeunload', () => {
  globalResourceManager.cleanup();
});

// 开发环境下的内存监控
if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    const stats = globalResourceManager.getMemoryStats();
    console.log('📊 内存使用统计:', stats);
  }, 30000); // 每30秒输出一次
} 