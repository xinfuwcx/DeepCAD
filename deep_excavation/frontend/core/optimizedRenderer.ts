/**
 * 优化的Three.js渲染器
 * @author Deep Excavation Team
 * @date 2025-01-27
 */

import * as THREE from 'three';
import { globalResourceManager } from './resourceManager';

export interface VisualizationData {
  vertices: Float32Array;
  indices: Uint32Array;
  scalars?: Float32Array;
  vectors?: Float32Array;
  type: 'mesh' | 'points' | 'lines';
  name: string;
}

export interface RenderingOptions {
  enableLOD: boolean;
  enableInstancing: boolean;
  enableFrustumCulling: boolean;
  maxVerticesPerChunk: number;
  colorMap: 'rainbow' | 'viridis' | 'plasma';
}

export class OptimizedRenderer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private geometryPool: Map<string, THREE.BufferGeometry> = new Map();
  private materialPool: Map<string, THREE.Material> = new Map();
  private lodObjects: THREE.LOD[] = [];
  private instancedMeshes: THREE.InstancedMesh[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    // 配置渲染器
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    
    // 启用渲染器优化
    this.renderer.info.autoReset = false;
    
    // 注册到资源管理器
    globalResourceManager.addDisposable({
      dispose: () => {
        this.cleanup();
      }
    });
  }

  /**
   * 渲染大型数据集（支持分块和LOD）
   */
  async renderLargeDataset(data: VisualizationData, options: RenderingOptions): Promise<THREE.Object3D> {
    console.log(`🎨 开始渲染大型数据集: ${data.name}, 顶点数: ${data.vertices.length / 3}`);
    
    const startTime = performance.now();
    
    // 检查是否需要分块
    const vertexCount = data.vertices.length / 3;
    if (vertexCount > options.maxVerticesPerChunk) {
      return this.renderChunkedDataset(data, options);
    } else {
      return this.renderSingleDataset(data, options);
    }
  }

  /**
   * 渲染分块数据集
   */
  private async renderChunkedDataset(data: VisualizationData, options: RenderingOptions): Promise<THREE.Object3D> {
    const chunks = this.chunkData(data, options.maxVerticesPerChunk);
    const group = new THREE.Group();
    group.name = data.name;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const chunkMesh = await this.renderSingleDataset(chunk, options);
      chunkMesh.name = `${data.name}_chunk_${i}`;
      
      // 启用视锥体剔除
      if (options.enableFrustumCulling) {
        chunkMesh.frustumCulled = true;
      }
      
      group.add(chunkMesh);
    }

    // 如果启用LOD，创建LOD对象
    if (options.enableLOD) {
      return this.createLODObject(group, data.name);
    }

    globalResourceManager.addThreeObject(group);
    return group;
  }

  /**
   * 渲染单个数据集
   */
  private async renderSingleDataset(data: VisualizationData, options: RenderingOptions): Promise<THREE.Object3D> {
    // 获取或创建几何体
    const geometry = this.getOrCreateGeometry(data);
    
    // 获取或创建材质
    const material = this.getOrCreateMaterial(data, options);
    
    // 创建网格对象
    let mesh: THREE.Object3D;
    
    if (data.type === 'mesh') {
      mesh = new THREE.Mesh(geometry, material);
    } else if (data.type === 'points') {
      mesh = new THREE.Points(geometry, material);
    } else if (data.type === 'lines') {
      mesh = new THREE.LineSegments(geometry, material);
    } else {
      throw new Error(`不支持的数据类型: ${data.type}`);
    }

    mesh.name = data.name;
    
    // 启用阴影
    if (mesh instanceof THREE.Mesh) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }

    globalResourceManager.addThreeObject(mesh);
    return mesh;
  }

  /**
   * 数据分块
   */
  private chunkData(data: VisualizationData, maxVerticesPerChunk: number): VisualizationData[] {
    const chunks: VisualizationData[] = [];
    const vertexCount = data.vertices.length / 3;
    const chunkCount = Math.ceil(vertexCount / maxVerticesPerChunk);

    for (let i = 0; i < chunkCount; i++) {
      const startVertex = i * maxVerticesPerChunk;
      const endVertex = Math.min((i + 1) * maxVerticesPerChunk, vertexCount);
      const chunkVertexCount = endVertex - startVertex;

      // 提取顶点数据
      const chunkVertices = data.vertices.slice(startVertex * 3, endVertex * 3);
      
      // 提取索引数据（需要重新映射）
      const chunkIndices = this.extractChunkIndices(data.indices, startVertex, endVertex);
      
      // 提取标量数据
      const chunkScalars = data.scalars ? 
        data.scalars.slice(startVertex, endVertex) : undefined;
      
      // 提取向量数据
      const chunkVectors = data.vectors ? 
        data.vectors.slice(startVertex * 3, endVertex * 3) : undefined;

      chunks.push({
        vertices: chunkVertices,
        indices: chunkIndices,
        scalars: chunkScalars,
        vectors: chunkVectors,
        type: data.type,
        name: `${data.name}_chunk_${i}`
      });
    }

    return chunks;
  }

  /**
   * 提取分块索引
   */
  private extractChunkIndices(indices: Uint32Array, startVertex: number, endVertex: number): Uint32Array {
    const chunkIndices: number[] = [];
    
    for (let i = 0; i < indices.length; i += 3) {
      const i0 = indices[i];
      const i1 = indices[i + 1];
      const i2 = indices[i + 2];
      
      // 检查三角形是否完全在当前块内
      if (i0 >= startVertex && i0 < endVertex &&
          i1 >= startVertex && i1 < endVertex &&
          i2 >= startVertex && i2 < endVertex) {
        // 重新映射索引
        chunkIndices.push(i0 - startVertex, i1 - startVertex, i2 - startVertex);
      }
    }
    
    return new Uint32Array(chunkIndices);
  }

  /**
   * 获取或创建几何体
   */
  private getOrCreateGeometry(data: VisualizationData): THREE.BufferGeometry {
    const geometryKey = this.getGeometryKey(data);
    
    if (this.geometryPool.has(geometryKey)) {
      return this.geometryPool.get(geometryKey)!;
    }

    const geometry = new THREE.BufferGeometry();
    
    // 设置顶点位置
    geometry.setAttribute('position', new THREE.BufferAttribute(data.vertices, 3));
    
    // 设置索引
    if (data.indices && data.indices.length > 0) {
      geometry.setIndex(new THREE.BufferAttribute(data.indices, 1));
    }
    
    // 设置标量数据作为颜色
    if (data.scalars) {
      const colors = this.scalarsToColors(data.scalars);
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    }
    
    // 计算法向量
    if (data.type === 'mesh') {
      geometry.computeVertexNormals();
    }
    
    // 计算包围盒
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();

    this.geometryPool.set(geometryKey, geometry);
    return geometry;
  }

  /**
   * 获取或创建材质
   */
  private getOrCreateMaterial(data: VisualizationData, options: RenderingOptions): THREE.Material {
    const materialKey = this.getMaterialKey(data, options);
    
    if (this.materialPool.has(materialKey)) {
      return this.materialPool.get(materialKey)!;
    }

    let material: THREE.Material;

    if (data.type === 'mesh') {
      material = new THREE.MeshPhongMaterial({
        vertexColors: data.scalars ? true : false,
        color: data.scalars ? 0xffffff : 0x666666,
        shininess: 30,
        transparent: true,
        opacity: 0.9
      });
    } else if (data.type === 'points') {
      material = new THREE.PointsMaterial({
        vertexColors: data.scalars ? true : false,
        color: data.scalars ? 0xffffff : 0x666666,
        size: 2,
        sizeAttenuation: true
      });
    } else if (data.type === 'lines') {
      material = new THREE.LineBasicMaterial({
        vertexColors: data.scalars ? true : false,
        color: data.scalars ? 0xffffff : 0x666666,
        linewidth: 1
      });
    } else {
      throw new Error(`不支持的材质类型: ${data.type}`);
    }

    this.materialPool.set(materialKey, material);
    return material;
  }

  /**
   * 创建LOD对象
   */
  private createLODObject(originalMesh: THREE.Object3D, name: string): THREE.LOD {
    const lod = new THREE.LOD();
    lod.name = `${name}_LOD`;

    // 高细节级别（近距离）
    lod.addLevel(originalMesh, 0);

    // 中细节级别（中距离）
    const mediumMesh = originalMesh.clone();
    this.reduceMeshDetail(mediumMesh, 0.5);
    lod.addLevel(mediumMesh, 100);

    // 低细节级别（远距离）
    const lowMesh = originalMesh.clone();
    this.reduceMeshDetail(lowMesh, 0.25);
    lod.addLevel(lowMesh, 500);

    this.lodObjects.push(lod);
    globalResourceManager.addThreeObject(lod);
    return lod;
  }

  /**
   * 减少网格细节
   */
  private reduceMeshDetail(mesh: THREE.Object3D, factor: number): void {
    // 简化实现：通过采样减少顶点数量
    // 实际应用中可以使用更复杂的网格简化算法
    mesh.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        const geometry = child.geometry;
        const positions = geometry.attributes.position;
        
        if (positions) {
          const originalCount = positions.count;
          const newCount = Math.floor(originalCount * factor);
          const step = Math.floor(originalCount / newCount);
          
          const newPositions = new Float32Array(newCount * 3);
          for (let i = 0; i < newCount; i++) {
            const sourceIndex = i * step;
            newPositions[i * 3] = positions.getX(sourceIndex);
            newPositions[i * 3 + 1] = positions.getY(sourceIndex);
            newPositions[i * 3 + 2] = positions.getZ(sourceIndex);
          }
          
          geometry.setAttribute('position', new THREE.BufferAttribute(newPositions, 3));
          geometry.computeVertexNormals();
        }
      }
    });
  }

  /**
   * 标量数据转颜色
   */
  private scalarsToColors(scalars: Float32Array): Float32Array {
    const colors = new Float32Array(scalars.length * 3);
    const min = Math.min(...scalars);
    const max = Math.max(...scalars);
    const range = max - min;

    for (let i = 0; i < scalars.length; i++) {
      const normalized = range > 0 ? (scalars[i] - min) / range : 0;
      const color = this.getColorFromValue(normalized);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    return colors;
  }

  /**
   * 根据数值获取颜色（彩虹色映射）
   */
  private getColorFromValue(value: number): THREE.Color {
    const hue = (1 - value) * 0.7; // 从红色到蓝色
    return new THREE.Color().setHSL(hue, 1, 0.5);
  }

  /**
   * 获取几何体键
   */
  private getGeometryKey(data: VisualizationData): string {
    return `${data.name}_${data.type}_${data.vertices.length}`;
  }

  /**
   * 获取材质键
   */
  private getMaterialKey(data: VisualizationData, options: RenderingOptions): string {
    return `${data.type}_${options.colorMap}_${data.scalars ? 'colored' : 'plain'}`;
  }

  /**
   * 更新LOD对象
   */
  updateLOD(camera: THREE.Camera): void {
    this.lodObjects.forEach(lod => {
      lod.update(camera);
    });
  }

  /**
   * 获取渲染统计信息
   */
  getRenderStats(): {
    geometries: number;
    materials: number;
    lodObjects: number;
    instancedMeshes: number;
    drawCalls: number;
    triangles: number;
    points: number;
    lines: number;
  } {
    const info = this.renderer.info;
    
    return {
      geometries: this.geometryPool.size,
      materials: this.materialPool.size,
      lodObjects: this.lodObjects.length,
      instancedMeshes: this.instancedMeshes.length,
      drawCalls: info.render.calls,
      triangles: info.render.triangles,
      points: info.render.points,
      lines: info.render.lines
    };
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    console.log('🧹 清理优化渲染器...');

    // 清理几何体池
    this.geometryPool.forEach(geometry => geometry.dispose());
    this.geometryPool.clear();

    // 清理材质池
    this.materialPool.forEach(material => material.dispose());
    this.materialPool.clear();

    // 清理LOD对象
    this.lodObjects.forEach(lod => {
      lod.removeFromParent();
    });
    this.lodObjects.length = 0;

    // 清理实例化网格
    this.instancedMeshes.forEach(mesh => {
      mesh.removeFromParent();
    });
    this.instancedMeshes.length = 0;

    // 清理渲染器
    this.renderer.dispose();

    console.log('✅ 优化渲染器清理完成');
  }

  /**
   * 获取渲染器实例
   */
  getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  /**
   * 获取场景实例
   */
  getScene(): THREE.Scene {
    return this.scene;
  }

  /**
   * 获取相机实例
   */
  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }
} 