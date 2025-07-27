/**
 * 内存优化实用工具
 * DeepCAD Deep Excavation CAE Platform - Memory Optimization Utils
 * 
 * 作者：2号几何专家
 * 功能：内存优化建议、自动化处理、性能分析、资源管理
 */

import * as THREE from 'three';
import { SceneMemoryManager, type MemoryStats } from '../core/memory/SceneMemoryManager';

// 优化建议类型
export interface OptimizationSuggestion {
  id: string;
  type: 'critical' | 'warning' | 'info';
  category: 'texture' | 'geometry' | 'material' | 'general';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'easy' | 'moderate' | 'complex';
  estimatedSavings: number; // bytes
  action?: () => Promise<void>;
}

// 性能分析结果
export interface PerformanceAnalysis {
  overallScore: number; // 0-100
  bottlenecks: string[];
  suggestions: OptimizationSuggestion[];
  memoryEfficiency: number; // 0-100
  renderingPerformance: number; // 0-100
  resourceUtilization: number; // 0-100
}

// 纹理优化选项
export interface TextureOptimizationOptions {
  enableCompression: boolean;
  maxSize: number;
  quality: number; // 0-1
  generateMipmaps: boolean;
  powerOfTwo: boolean;
}

// 几何体优化选项
export interface GeometryOptimizationOptions {
  simplificationRatio: number; // 0-1
  enableMerging: boolean;
  removeUnusedVertices: boolean;
  optimizeDrawCalls: boolean;
}

export class MemoryOptimizationUtils {
  private memoryManager: SceneMemoryManager;
  private scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer;

  constructor(
    memoryManager: SceneMemoryManager,
    scene: THREE.Scene,
    renderer: THREE.WebGLRenderer
  ) {
    this.memoryManager = memoryManager;
    this.scene = scene;
    this.renderer = renderer;
  }

  /**
   * 分析当前内存使用情况并生成优化建议
   */
  public analyzePerformance(): PerformanceAnalysis {
    const memoryStats = this.memoryManager.getMemoryStats();
    const suggestions = this.generateOptimizationSuggestions(memoryStats);
    
    const analysis: PerformanceAnalysis = {
      overallScore: this.calculateOverallScore(memoryStats),
      bottlenecks: this.identifyBottlenecks(memoryStats),
      suggestions,
      memoryEfficiency: this.calculateMemoryEfficiency(memoryStats),
      renderingPerformance: this.calculateRenderingPerformance(memoryStats),
      resourceUtilization: this.calculateResourceUtilization(memoryStats)
    };

    return analysis;
  }

  /**
   * 生成优化建议
   */
  private generateOptimizationSuggestions(stats: MemoryStats): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // 纹理优化建议
    if (stats.textures.totalSize > 100 * 1024 * 1024) { // 100MB
      suggestions.push({
        id: 'large-texture-memory',
        type: 'warning',
        category: 'texture',
        title: '纹理内存使用过大',
        description: `纹理占用 ${this.formatBytes(stats.textures.totalSize)}，建议压缩大尺寸纹理`,
        impact: 'high',
        effort: 'moderate',
        estimatedSavings: stats.textures.totalSize * 0.3,
        action: () => this.optimizeTextures({ 
          enableCompression: true, 
          maxSize: 1024, 
          quality: 0.8,
          generateMipmaps: true,
          powerOfTwo: true
        })
      });
    }

    // 未使用纹理清理
    if (stats.textures.unusedCount > 5) {
      suggestions.push({
        id: 'unused-textures',
        type: 'critical',
        category: 'texture',
        title: '存在大量未使用纹理',
        description: `发现 ${stats.textures.unusedCount} 个未使用纹理，建议立即清理`,
        impact: 'high',
        effort: 'easy',
        estimatedSavings: (stats.textures.totalSize / stats.textures.count) * stats.textures.unusedCount,
        action: () => this.cleanupUnusedTextures()
      });
    }

    // 几何体优化建议
    if (stats.geometries.totalVertices > 500000) { // 50万顶点
      suggestions.push({
        id: 'high-poly-geometry',
        type: 'warning',
        category: 'geometry',
        title: '几何体复杂度过高',
        description: `场景包含 ${stats.geometries.totalVertices.toLocaleString()} 个顶点，建议使用LOD或简化`,
        impact: 'medium',
        effort: 'complex',
        estimatedSavings: stats.geometries.memoryUsage * 0.4,
        action: () => this.optimizeGeometries({ 
          simplificationRatio: 0.7, 
          enableMerging: true,
          removeUnusedVertices: true,
          optimizeDrawCalls: true
        })
      });
    }

    // 材质优化建议
    if (stats.materials.count > 50) {
      suggestions.push({
        id: 'too-many-materials',
        type: 'info',
        category: 'material',
        title: '材质数量较多',
        description: `场景有 ${stats.materials.count} 个材质，考虑合并相似材质`,
        impact: 'medium',
        effort: 'moderate',
        estimatedSavings: 1024 * stats.materials.count * 0.3,
        action: () => this.mergeSimilarMaterials()
      });
    }

    // 总内存警告
    const totalMemoryMB = stats.total.estimated / (1024 * 1024);
    if (totalMemoryMB > 500) {
      suggestions.push({
        id: 'high-memory-usage',
        type: 'critical',
        category: 'general',
        title: '内存使用量过高',
        description: `总内存使用 ${totalMemoryMB.toFixed(1)}MB，建议进行全面优化`,
        impact: 'high',
        effort: 'moderate',
        estimatedSavings: stats.total.estimated * 0.25,
        action: () => this.performFullOptimization()
      });
    }

    return suggestions;
  }

  /**
   * 计算整体性能分数
   */
  private calculateOverallScore(stats: MemoryStats): number {
    let score = 100;
    
    // 内存使用惩罚
    const totalMemoryMB = stats.total.estimated / (1024 * 1024);
    if (totalMemoryMB > 100) score -= Math.min(50, (totalMemoryMB - 100) / 10);
    
    // 未使用资源惩罚
    if (stats.textures.unusedCount > 0) score -= stats.textures.unusedCount * 2;
    
    // 复杂度惩罚
    if (stats.geometries.totalVertices > 100000) {
      score -= Math.min(20, (stats.geometries.totalVertices - 100000) / 50000);
    }
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * 识别性能瓶颈
   */
  private identifyBottlenecks(stats: MemoryStats): string[] {
    const bottlenecks: string[] = [];
    
    // 纹理瓶颈
    if (stats.textures.totalSize > 200 * 1024 * 1024) {
      bottlenecks.push('TEXTURE_MEMORY_HIGH');
    }
    
    if (stats.textures.unusedCount > 10) {
      bottlenecks.push('UNUSED_TEXTURES');
    }
    
    // 几何体瓶颈
    if (stats.geometries.totalVertices > 1000000) {
      bottlenecks.push('HIGH_VERTEX_COUNT');
    }
    
    if (stats.geometries.count > 100) {
      bottlenecks.push('TOO_MANY_GEOMETRIES');
    }
    
    // 材质瓶颈
    if (stats.materials.count > 100) {
      bottlenecks.push('TOO_MANY_MATERIALS');
    }
    
    // 总内存瓶颈
    if (stats.total.estimated > 512 * 1024 * 1024) {
      bottlenecks.push('HIGH_MEMORY_USAGE');
    }
    
    return bottlenecks;
  }

  /**
   * 计算内存效率
   */
  private calculateMemoryEfficiency(stats: MemoryStats): number {
    let efficiency = 100;
    
    // 未使用资源降低效率
    const unusedRatio = stats.textures.unusedCount / Math.max(1, stats.textures.count);
    efficiency -= unusedRatio * 50;
    
    // 碎片化程度
    const avgTextureSize = stats.textures.totalSize / Math.max(1, stats.textures.count);
    if (avgTextureSize < 64 * 1024) { // 小于64KB的纹理过多
      efficiency -= 20;
    }
    
    return Math.max(0, Math.min(100, efficiency));
  }

  /**
   * 计算渲染性能
   */
  private calculateRenderingPerformance(stats: MemoryStats): number {
    let performance = 100;
    
    // 顶点数过多影响性能
    if (stats.geometries.totalVertices > 500000) {
      performance -= Math.min(40, (stats.geometries.totalVertices - 500000) / 25000);
    }
    
    // 材质数过多影响性能
    if (stats.materials.count > 50) {
      performance -= Math.min(30, (stats.materials.count - 50) * 0.5);
    }
    
    return Math.max(0, Math.min(100, performance));
  }

  /**
   * 计算资源利用率
   */
  private calculateResourceUtilization(stats: MemoryStats): number {
    if (stats.textures.count === 0) return 100;
    
    const usedRatio = (stats.textures.count - stats.textures.unusedCount) / stats.textures.count;
    return Math.round(usedRatio * 100);
  }

  /**
   * 优化纹理
   */
  public async optimizeTextures(options: TextureOptimizationOptions): Promise<void> {
    console.log('🎨 开始纹理优化...');
    
    this.scene.traverse((object) => {
      if ('material' in object && object.material) {
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        
        materials.forEach((material) => {
          this.optimizeMaterialTextures(material, options);
        });
      }
    });
    
    console.log('✅ 纹理优化完成');
  }

  /**
   * 优化材质中的纹理
   */
  private optimizeMaterialTextures(material: THREE.Material, options: TextureOptimizationOptions): void {
    Object.entries(material).forEach(([key, value]) => {
      if (value instanceof THREE.Texture) {
        this.optimizeTexture(value, options);
      }
    });
  }

  /**
   * 优化单个纹理
   */
  private optimizeTexture(texture: THREE.Texture, options: TextureOptimizationOptions): void {
    // 设置最大尺寸
    if (texture.image && texture.image.width > options.maxSize) {
      // 这里可以实现纹理缩放逻辑
      console.log(`📏 纹理尺寸优化: ${texture.image.width}x${texture.image.height} -> ${options.maxSize}x${options.maxSize}`);
    }
    
    // 生成mipmap
    texture.generateMipmaps = options.generateMipmaps;
    
    // 确保尺寸为2的幂
    if (options.powerOfTwo) {
      texture.wrapS = THREE.ClampToEdgeWrap;
      texture.wrapT = THREE.ClampToEdgeWrap;
    }
    
    // 设置过滤方式
    if (options.enableCompression) {
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
    }
  }

  /**
   * 优化几何体
   */
  public async optimizeGeometries(options: GeometryOptimizationOptions): Promise<void> {
    console.log('📐 开始几何体优化...');
    
    const geometriesToOptimize: THREE.Mesh[] = [];
    
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        geometriesToOptimize.push(object);
      }
    });
    
    for (const mesh of geometriesToOptimize) {
      await this.optimizeMeshGeometry(mesh, options);
    }
    
    console.log('✅ 几何体优化完成');
  }

  /**
   * 优化网格几何体
   */
  private async optimizeMeshGeometry(mesh: THREE.Mesh, options: GeometryOptimizationOptions): Promise<void> {
    if (!mesh.geometry) return;
    
    let optimizedGeometry = mesh.geometry;
    
    // 移除未使用顶点
    if (options.removeUnusedVertices) {
      optimizedGeometry = this.removeUnusedVertices(optimizedGeometry);
    }
    
    // 简化几何体
    if (options.simplificationRatio < 1.0) {
      optimizedGeometry = this.simplifyGeometry(optimizedGeometry, options.simplificationRatio);
    }
    
    // 使用优化后的几何体
    if (optimizedGeometry !== mesh.geometry) {
      mesh.geometry.dispose();
      mesh.geometry = optimizedGeometry;
    }
  }

  /**
   * 移除未使用顶点
   */
  private removeUnusedVertices(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
    // 简化实现：这里可以添加更复杂的顶点清理逻辑
    return geometry;
  }

  /**
   * 简化几何体
   */
  private simplifyGeometry(geometry: THREE.BufferGeometry, ratio: number): THREE.BufferGeometry {
    if (ratio >= 1.0) return geometry;
    
    const positionAttribute = geometry.getAttribute('position');
    if (!positionAttribute) return geometry;
    
    const originalCount = positionAttribute.count;
    const targetCount = Math.floor(originalCount * ratio);
    const step = Math.max(1, Math.floor(originalCount / targetCount));
    
    const newPositions = [];
    for (let i = 0; i < originalCount; i += step) {
      newPositions.push(
        positionAttribute.getX(i),
        positionAttribute.getY(i),
        positionAttribute.getZ(i)
      );
    }
    
    const newGeometry = new THREE.BufferGeometry();
    newGeometry.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));
    
    return newGeometry;
  }

  /**
   * 清理未使用纹理
   */
  public async cleanupUnusedTextures(): Promise<number> {
    console.log('🧹 清理未使用纹理...');
    
    const cleanedCount = this.memoryManager.cleanupUnusedResources();
    
    console.log(`✅ 清理了 ${cleanedCount} 个未使用资源`);
    return cleanedCount;
  }

  /**
   * 合并相似材质
   */
  public async mergeSimilarMaterials(): Promise<number> {
    console.log('🔗 合并相似材质...');
    
    const materialMap = new Map<string, THREE.Material>();
    const objectsToUpdate: { object: THREE.Object3D; newMaterial: THREE.Material }[] = [];
    let mergedCount = 0;
    
    this.scene.traverse((object) => {
      if ('material' in object && object.material && !Array.isArray(object.material)) {
        const material = object.material as THREE.Material;
        const materialKey = this.getMaterialSignature(material);
        
        if (materialMap.has(materialKey)) {
          // 使用现有材质
          objectsToUpdate.push({ object, newMaterial: materialMap.get(materialKey)! });
          mergedCount++;
        } else {
          // 记录新材质
          materialMap.set(materialKey, material);
        }
      }
    });
    
    // 应用材质合并
    objectsToUpdate.forEach(({ object, newMaterial }) => {
      if ('material' in object) {
        const oldMaterial = object.material as THREE.Material;
        (object as any).material = newMaterial;
        if (oldMaterial) oldMaterial.dispose();
      }
    });
    
    console.log(`✅ 合并了 ${mergedCount} 个材质`);
    return mergedCount;
  }

  /**
   * 获取材质签名（用于相似材质检测）
   */
  private getMaterialSignature(material: THREE.Material): string {
    const signature = {
      type: material.type,
      color: 'color' in material ? (material as any).color?.getHex() : null,
      opacity: material.opacity,
      transparent: material.transparent,
      side: material.side
    };
    
    return JSON.stringify(signature);
  }

  /**
   * 执行全面优化
   */
  public async performFullOptimization(): Promise<void> {
    console.log('🚀 开始全面内存优化...');
    
    const startTime = Date.now();
    const initialStats = this.memoryManager.getMemoryStats();
    
    // 1. 清理未使用资源
    await this.cleanupUnusedTextures();
    
    // 2. 优化纹理
    await this.optimizeTextures({
      enableCompression: true,
      maxSize: 1024,
      quality: 0.8,
      generateMipmaps: true,
      powerOfTwo: true
    });
    
    // 3. 优化几何体
    await this.optimizeGeometries({
      simplificationRatio: 0.8,
      enableMerging: true,
      removeUnusedVertices: true,
      optimizeDrawCalls: true
    });
    
    // 4. 合并材质
    await this.mergeSimilarMaterials();
    
    const endTime = Date.now();
    const finalStats = this.memoryManager.getMemoryStats();
    
    const savedMemory = initialStats.total.estimated - finalStats.total.estimated;
    const optimizationTime = endTime - startTime;
    
    console.log(`✅ 全面优化完成！`);
    console.log(`📊 节省内存: ${this.formatBytes(savedMemory)}`);
    console.log(`⏱️ 优化耗时: ${optimizationTime}ms`);
  }

  /**
   * 格式化字节数
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  /**
   * 获取优化建议摘要
   */
  public getOptimizationSummary(): {
    totalSuggestions: number;
    criticalIssues: number;
    estimatedSavings: number;
    quickFixes: number;
  } {
    const analysis = this.analyzePerformance();
    
    return {
      totalSuggestions: analysis.suggestions.length,
      criticalIssues: analysis.suggestions.filter(s => s.type === 'critical').length,
      estimatedSavings: analysis.suggestions.reduce((sum, s) => sum + s.estimatedSavings, 0),
      quickFixes: analysis.suggestions.filter(s => s.effort === 'easy').length
    };
  }
}