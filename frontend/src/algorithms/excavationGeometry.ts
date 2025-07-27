/**
 * 基坑几何建模算法 - 基于DXF边界数据
 * 主要功能：从DXF导入的边界生成基坑3D几何
 * 修复版本 - 解决TypeScript类型问题
 */

export interface Point2D {
  x: number;
  y: number;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface ExcavationStage {
  stageId: number;
  depth: number; // 此阶段挖深(m)
  slopeRatio: number; // 边坡比 (H:V)
  stageName?: string;
  excavationMethod?: 'mechanical' | 'blasting' | 'manual';
}

export interface ExcavationParameters {
  // 核心参数 - 基于DXF数据
  dxfBoundary: Point2D[]; // DXF导入的边界点 (主要输入)
  totalDepth: number; // 总开挖深度
  surfaceElevation: number; // 地面标高
  
  // 备选参数 - 简单几何情况
  type?: 'dxf_boundary' | 'rectangular' | 'circular'; // 默认dxf_boundary
  width?: number; // 仅矩形时使用
  length?: number; // 仅矩形时使用
  radius?: number; // 仅圆形时使用
  center?: Point2D; // 几何中心
  
  // 分层开挖参数
  stages?: ExcavationStage[];
  
  // 边坡参数
  globalSlopeRatio?: number; // 全局边坡比
  benchWidth?: number; // 马道宽度
  benchHeight?: number; // 马道高度
  
  // 排水和安全参数
  drainageSlope?: number; // 排水坡度 (%)
  safetyBerm?: number; // 安全平台宽度
  
  // DXF处理参数
  boundarySimplification?: number; // 边界简化容差(m)
  cornerSmoothing?: number; // 转角平滑半径(m)
}

export interface ExcavationGeometry {
  // 几何数据
  vertices: Point3D[]; // 顶点坐标
  faces: number[][]; // 面索引 (三角形)
  normals: Point3D[]; // 法向量
  
  // 分区信息
  regions: {
    regionId: string;
    regionType: 'excavation' | 'slope' | 'bench' | 'drainage';
    faceIndices: number[];
    volume: number;
    area: number;
  }[];
  
  // 工程量统计
  statistics: {
    totalVolume: number; // 总开挖方量 (m³)
    stageVolumes: number[]; // 分阶段方量
    surfaceArea: number; // 开挖面积
    slopeArea: number; // 边坡面积
    maximumDepth: number;
    averageDepth: number;
  };
  
  // 质量信息
  quality: {
    geometryValid: boolean;
    selfIntersection: boolean;
    manifoldSurface: boolean;
    warnings: string[];
  };
}

class ExcavationGeometryBuilder {
  private vertices: Point3D[] = [];
  private faces: number[][] = [];
  private normals: Point3D[] = [];
  
  /**
   * 构建基坑几何
   */
  async buildExcavation(params: ExcavationParameters): Promise<ExcavationGeometry> {
    console.log(`🏗️ 开始构建${params.type || 'dxf_boundary'}基坑几何`);
    
    // 重置数据
    this.vertices = [];
    this.faces = [];
    this.normals = [];
    
    let geometry: ExcavationGeometry;
    
    switch (params.type) {
      case 'rectangular':
        geometry = await this.buildRectangularExcavation(params);
        break;
      case 'circular':
        geometry = await this.buildCircularExcavation(params);
        break;
      case 'dxf_boundary':
      default:
        geometry = await this.buildDXFBoundaryExcavation(params);
        break;
    }
    
    // 质量检查
    geometry.quality = this.validateGeometry(geometry);
    
    console.log(`✅ 基坑几何构建完成，顶点:${geometry.vertices.length}, 面:${geometry.faces.length}`);
    
    return geometry;
  }

  /**
   * 构建基于DXF边界的基坑
   */
  private async buildDXFBoundaryExcavation(params: ExcavationParameters): Promise<ExcavationGeometry> {
    if (!params.dxfBoundary || params.dxfBoundary.length < 3) {
      throw new Error('DXF边界需要至少3个点');
    }
    
    const { dxfBoundary, totalDepth, surfaceElevation, globalSlopeRatio = 0 } = params;
    const topZ = surfaceElevation;
    const bottomZ = topZ - totalDepth;
    const slopeOffset = globalSlopeRatio * totalDepth;
    
    // 检查边界点是否闭合
    const isClosed = this.isPolygonClosed(dxfBoundary);
    const points = isClosed ? dxfBoundary : [...dxfBoundary, dxfBoundary[0]];
    
    // 计算质心 (用于三角剖分)
    const centroid = this.calculateCentroid(points);
    
    // 底部边界顶点
    const bottomVertices = points.map(p => ({ x: p.x, y: p.y, z: bottomZ }));
    
    // 顶部边界顶点 (考虑边坡偏移)
    const topVertices = points.map(p => {
      const dx = p.x - centroid.x;
      const dy = p.y - centroid.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      const normalizedDx = length > 0 ? dx / length : 0;
      const normalizedDy = length > 0 ? dy / length : 0;
      
      return {
        x: p.x + normalizedDx * slopeOffset,
        y: p.y + normalizedDy * slopeOffset,
        z: topZ
      };
    });
    
    // 添加质心点 (用于三角剖分)
    this.vertices.push({ x: centroid.x, y: centroid.y, z: bottomZ }); // 底面质心
    const centroidIndex = 0;
    
    // 添加边界顶点
    this.vertices.push(...bottomVertices, ...topVertices);
    
    const n = points.length;
    
    // 构建底面 (扇形三角形)
    for (let i = 0; i < n - 1; i++) {
      this.faces.push([centroidIndex, i + 1, i + 2]);
    }
    
    // 构建侧面
    for (let i = 0; i < n - 1; i++) {
      const bottomCurrent = i + 1;
      const bottomNext = i + 2;
      const topCurrent = i + 1 + n;
      const topNext = i + 2 + n;
      
      // 侧面四边形用两个三角形
      this.faces.push([bottomCurrent, topCurrent, topNext]);
      this.faces.push([bottomCurrent, topNext, bottomNext]);
    }
    
    this.calculateNormals();
    
    // 计算面积和体积 (多边形)
    const area = this.calculatePolygonArea(points);
    const volume = area * totalDepth;
    const perimeter = this.calculatePolygonPerimeter(points);
    const slopeArea = perimeter * Math.sqrt(totalDepth * totalDepth + slopeOffset * slopeOffset);
    
    return {
      vertices: this.vertices,
      faces: this.faces,
      normals: this.normals,
      regions: [
        {
          regionId: 'dxf_excavation_bottom',
          regionType: 'excavation',
          faceIndices: Array.from({ length: n - 1 }, (_, i) => i),
          volume,
          area
        }
      ],
      statistics: {
        totalVolume: volume,
        stageVolumes: [volume],
        surfaceArea: area,
        slopeArea,
        maximumDepth: totalDepth,
        averageDepth: totalDepth
      },
      quality: { geometryValid: true, selfIntersection: false, manifoldSurface: true, warnings: [] }
    };
  }

  /**
   * 构建矩形基坑
   */
  private async buildRectangularExcavation(params: ExcavationParameters): Promise<ExcavationGeometry> {
    if (!params.width || !params.length || !params.center) {
      throw new Error('矩形基坑需要指定宽度、长度和中心点');
    }
    
    const { width, length, totalDepth, surfaceElevation, globalSlopeRatio = 0, center } = params;
    const centerX = center.x;
    const centerY = center.y;
    const topZ = surfaceElevation;
    const bottomZ = topZ - totalDepth;
    
    // 计算边坡偏移
    const slopeOffset = globalSlopeRatio * totalDepth;
    
    // 顶部矩形顶点 (地面)
    const topVertices = [
      { x: centerX - width/2 - slopeOffset, y: centerY - length/2 - slopeOffset, z: topZ },
      { x: centerX + width/2 + slopeOffset, y: centerY - length/2 - slopeOffset, z: topZ },
      { x: centerX + width/2 + slopeOffset, y: centerY + length/2 + slopeOffset, z: topZ },
      { x: centerX - width/2 - slopeOffset, y: centerY + length/2 + slopeOffset, z: topZ }
    ];
    
    // 底部矩形顶点 (基坑底)
    const bottomVertices = [
      { x: centerX - width/2, y: centerY - length/2, z: bottomZ },
      { x: centerX + width/2, y: centerY - length/2, z: bottomZ },
      { x: centerX + width/2, y: centerY + length/2, z: bottomZ },
      { x: centerX - width/2, y: centerY + length/2, z: bottomZ }
    ];
    
    // 合并顶点
    this.vertices = [...topVertices, ...bottomVertices];
    
    // 构建面 (逆时针)
    // 底面 (朝上)
    this.faces.push([4, 5, 6], [4, 6, 7]);
    
    // 侧面 (边坡)
    for (let i = 0; i < 4; i++) {
      const next = (i + 1) % 4;
      // 每个侧面用两个三角形
      this.faces.push([i, next, next + 4], [i, next + 4, i + 4]);
    }
    
    // 计算法向量
    this.calculateNormals();
    
    // 计算工程量
    const volume = width * length * totalDepth;
    const surfaceArea = width * length;
    const slopeArea = 2 * (width + length) * Math.sqrt(totalDepth * totalDepth + slopeOffset * slopeOffset);
    
    return {
      vertices: this.vertices,
      faces: this.faces,
      normals: this.normals,
      regions: [
        {
          regionId: 'excavation_bottom',
          regionType: 'excavation',
          faceIndices: [0, 1],
          volume,
          area: surfaceArea
        },
        {
          regionId: 'excavation_slopes',
          regionType: 'slope',
          faceIndices: [2, 3, 4, 5, 6, 7, 8, 9],
          volume: 0,
          area: slopeArea
        }
      ],
      statistics: {
        totalVolume: volume,
        stageVolumes: [volume],
        surfaceArea,
        slopeArea,
        maximumDepth: totalDepth,
        averageDepth: totalDepth
      },
      quality: { geometryValid: true, selfIntersection: false, manifoldSurface: true, warnings: [] }
    };
  }

  /**
   * 构建圆形基坑
   */
  private async buildCircularExcavation(params: ExcavationParameters): Promise<ExcavationGeometry> {
    if (!params.radius || !params.center) {
      throw new Error('圆形基坑需要指定半径和中心点');
    }
    
    const { radius, totalDepth, surfaceElevation, globalSlopeRatio = 0, center } = params;
    const centerX = center.x;
    const centerY = center.y;
    const topZ = surfaceElevation;
    const bottomZ = topZ - totalDepth;
    const slopeOffset = globalSlopeRatio * totalDepth;
    
    // 圆周分段数 (根据半径自适应)
    const segments = Math.max(12, Math.min(64, Math.ceil(radius * 4)));
    const angleStep = (2 * Math.PI) / segments;
    
    // 中心点
    this.vertices.push({ x: centerX, y: centerY, z: bottomZ }); // 底面中心
    
    // 底部圆周顶点
    for (let i = 0; i < segments; i++) {
      const angle = i * angleStep;
      this.vertices.push({
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
        z: bottomZ
      });
    }
    
    // 顶部圆周顶点 (考虑边坡)
    for (let i = 0; i < segments; i++) {
      const angle = i * angleStep;
      const topRadius = radius + slopeOffset;
      this.vertices.push({
        x: centerX + topRadius * Math.cos(angle),
        y: centerY + topRadius * Math.sin(angle),
        z: topZ
      });
    }
    
    // 构建面
    // 底面 (扇形三角形)
    for (let i = 0; i < segments; i++) {
      const next = (i + 1) % segments;
      this.faces.push([0, i + 1, next + 1]);
    }
    
    // 侧面 (圆锥侧面)
    for (let i = 0; i < segments; i++) {
      const next = (i + 1) % segments;
      const bottomCurrent = i + 1;
      const bottomNext = next + 1;
      const topCurrent = i + 1 + segments;
      const topNext = next + 1 + segments;
      
      // 每个侧面用两个三角形
      this.faces.push([bottomCurrent, topCurrent, topNext]);
      this.faces.push([bottomCurrent, topNext, bottomNext]);
    }
    
    this.calculateNormals();
    
    // 计算工程量
    const volume = Math.PI * radius * radius * totalDepth;
    const surfaceArea = Math.PI * radius * radius;
    const slopeArea = Math.PI * (radius + slopeOffset + radius) * Math.sqrt(totalDepth * totalDepth + slopeOffset * slopeOffset);
    
    return {
      vertices: this.vertices,
      faces: this.faces,
      normals: this.normals,
      regions: [
        {
          regionId: 'circular_bottom',
          regionType: 'excavation',
          faceIndices: Array.from({ length: segments }, (_, i) => i),
          volume,
          area: surfaceArea
        }
      ],
      statistics: {
        totalVolume: volume,
        stageVolumes: [volume],
        surfaceArea,
        slopeArea,
        maximumDepth: totalDepth,
        averageDepth: totalDepth
      },
      quality: { geometryValid: true, selfIntersection: false, manifoldSurface: true, warnings: [] }
    };
  }

  /**
   * 计算法向量
   */
  private calculateNormals(): void {
    this.normals = new Array(this.vertices.length).fill(null).map(() => ({ x: 0, y: 0, z: 0 }));
    
    // 为每个面计算法向量并累加到顶点
    for (const face of this.faces) {
      if (face.length >= 3) {
        const v1 = this.vertices[face[0]];
        const v2 = this.vertices[face[1]];
        const v3 = this.vertices[face[2]];
        
        // 计算面法向量
        const edge1 = { x: v2.x - v1.x, y: v2.y - v1.y, z: v2.z - v1.z };
        const edge2 = { x: v3.x - v1.x, y: v3.y - v1.y, z: v3.z - v1.z };
        
        const normal = {
          x: edge1.y * edge2.z - edge1.z * edge2.y,
          y: edge1.z * edge2.x - edge1.x * edge2.z,
          z: edge1.x * edge2.y - edge1.y * edge2.x
        };
        
        // 归一化
        const length = Math.sqrt(normal.x * normal.x + normal.y * normal.y + normal.z * normal.z);
        if (length > 0) {
          normal.x /= length;
          normal.y /= length;
          normal.z /= length;
        }
        
        // 累加到面的所有顶点
        for (const vertexIndex of face) {
          this.normals[vertexIndex].x += normal.x;
          this.normals[vertexIndex].y += normal.y;
          this.normals[vertexIndex].z += normal.z;
        }
      }
    }
    
    // 归一化顶点法向量
    for (const normal of this.normals) {
      const length = Math.sqrt(normal.x * normal.x + normal.y * normal.y + normal.z * normal.z);
      if (length > 0) {
        normal.x /= length;
        normal.y /= length;
        normal.z /= length;
      }
    }
  }

  /**
   * 验证几何质量
   */
  private validateGeometry(geometry: ExcavationGeometry) {
    const warnings: string[] = [];
    let geometryValid = true;
    let selfIntersection = false;
    let manifoldSurface = true;
    
    // 检查顶点数量
    if (geometry.vertices.length < 4) {
      warnings.push('顶点数量过少');
      geometryValid = false;
    }
    
    // 检查面数量
    if (geometry.faces.length < 4) {
      warnings.push('面数量过少');
      geometryValid = false;
    }
    
    // 检查退化三角形
    let degenerateCount = 0;
    for (const face of geometry.faces) {
      if (face.length >= 3) {
        const v1 = geometry.vertices[face[0]];
        const v2 = geometry.vertices[face[1]];
        const v3 = geometry.vertices[face[2]];
        
        const area = this.calculateTriangleArea(v1, v2, v3);
        if (area < 1e-6) {
          degenerateCount++;
        }
      }
    }
    
    if (degenerateCount > 0) {
      warnings.push(`发现${degenerateCount}个退化三角形`);
    }
    
    // 检查体积合理性
    if (geometry.statistics.totalVolume <= 0) {
      warnings.push('基坑体积无效');
      geometryValid = false;
    }
    
    return {
      geometryValid,
      selfIntersection,
      manifoldSurface,
      warnings
    };
  }

  // 辅助函数
  
  private isPolygonClosed(points: Point2D[]): boolean {
    if (points.length < 3) return false;
    const first = points[0];
    const last = points[points.length - 1];
    return Math.abs(first.x - last.x) < 1e-6 && Math.abs(first.y - last.y) < 1e-6;
  }
  
  private calculateCentroid(points: Point2D[]): Point2D {
    const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
    return { x: sum.x / points.length, y: sum.y / points.length };
  }
  
  private calculatePolygonArea(points: Point2D[]): number {
    let area = 0;
    for (let i = 0; i < points.length - 1; i++) {
      area += points[i].x * points[i + 1].y - points[i + 1].x * points[i].y;
    }
    return Math.abs(area) / 2;
  }
  
  private calculatePolygonPerimeter(points: Point2D[]): number {
    let perimeter = 0;
    for (let i = 0; i < points.length - 1; i++) {
      const dx = points[i + 1].x - points[i].x;
      const dy = points[i + 1].y - points[i].y;
      perimeter += Math.sqrt(dx * dx + dy * dy);
    }
    return perimeter;
  }
  
  private calculateTriangleArea(v1: Point3D, v2: Point3D, v3: Point3D): number {
    const edge1 = { x: v2.x - v1.x, y: v2.y - v1.y, z: v2.z - v1.z };
    const edge2 = { x: v3.x - v1.x, y: v3.y - v1.y, z: v3.z - v1.z };
    
    const cross = {
      x: edge1.y * edge2.z - edge1.z * edge2.y,
      y: edge1.z * edge2.x - edge1.x * edge2.z,
      z: edge1.x * edge2.y - edge1.y * edge2.x
    };
    
    const magnitude = Math.sqrt(cross.x * cross.x + cross.y * cross.y + cross.z * cross.z);
    return magnitude / 2;
  }
}

// 便捷函数
export const buildExcavationGeometry = async (params: ExcavationParameters): Promise<ExcavationGeometry> => {
  const builder = new ExcavationGeometryBuilder();
  return await builder.buildExcavation(params);
};

export default ExcavationGeometryBuilder;