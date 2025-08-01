/**
 * 基坑几何建模算法
 * 支持DXF边界、矩形和圆形基坑的3D几何生成
 */

/**
 * 2D点坐标
 */
export interface Point2D {
  x: number; // X坐标
  y: number; // Y坐标
}

/**
 * 3D点坐标
 */
export interface Point3D {
  x: number; // X坐标
  y: number; // Y坐标
  z: number; // Z坐标(高程)
}

/**
 * 基坑开挖阶段参数
 */
export interface ExcavationStage {
  stageId: number; // 阶段编号
  depth: number; // 此阶段挖深(m)
  slopeRatio: number; // 边坡比(H:V)
  stageName?: string; // 阶段名称
  excavationMethod?: 'mechanical' | 'blasting' | 'manual'; // 开挖方式
}

/**
 * 基坑几何参数
 */
export interface ExcavationParameters {
  dxfBoundary: Point2D[]; // DXF导入的边界点
  totalDepth: number; // 总开挖深度(m)
  surfaceElevation: number; // 地面标高(m)
  type?: 'dxf_boundary' | 'rectangular' | 'circular'; // 基坑类型
  width?: number; // 矩形宽度(m)
  length?: number; // 矩形长度(m)
  radius?: number; // 圆形半径(m)
  center?: Point2D; // 几何中心
  stages?: ExcavationStage[]; // 分层开挖参数
  globalSlopeRatio?: number; // 全局边坡比
  benchWidth?: number; // 马道宽度(m)
  benchHeight?: number; // 马道高度(m)
  drainageSlope?: number; // 排水坡度(%)
  safetyBerm?: number; // 安全平台宽度(m)
  boundarySimplification?: number; // 边界简化容差(m)
  cornerSmoothing?: number; // 转角平滑半径(m)
}

/**
 * 基坑几何数据
 */
export interface ExcavationGeometry {
  vertices: Point3D[]; // 顶点坐标
  faces: number[][]; // 面索引(三角形)
  normals: Point3D[]; // 法向量
  regions: { // 分区信息
    regionId: string; // 区域ID
    regionType: 'excavation' | 'slope' | 'bench' | 'drainage'; // 区域类型
    faceIndices: number[]; // 面索引数组
    volume: number; // 体积(m³)
    area: number; // 面积(m²)
  }[];
  statistics: { // 工程量统计
    totalVolume: number; // 总开挖方量(m³)
    stageVolumes: number[]; // 分阶段方量(m³)
    surfaceArea: number; // 开挖面积(m²)
    slopeArea: number; // 边坡面积(m²)
    maximumDepth: number; // 最大深度(m)
    averageDepth: number; // 平均深度(m)
  };
  quality: { // 质量信息
    geometryValid: boolean; // 几何体是否有效
    selfIntersection: boolean; // 是否存在自相交
    manifoldSurface: boolean; // 是否为流形表面
    warnings: string[]; // 警告信息
  };
}

/**
 * 基坑几何构建器
 */
class ExcavationGeometryBuilder {
  private vertices: Point3D[] = []; // 顶点数组
  private faces: number[][] = []; // 面数组
  private normals: Point3D[] = []; // 法向量数组

  /**
   * 构建基坑几何体
   * @param params 基坑参数
   * @returns 基坑几何数据
   */
  async buildExcavation(params: ExcavationParameters): Promise<ExcavationGeometry> {
    // 重置数据
    this.vertices = [];
    this.faces = [];
    this.normals = [];

    let geometry: ExcavationGeometry;

    // 根据类型构建不同几何体
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
    return geometry;
  }

  /**
   * 构建基于DXF边界的基坑
   * @param params 基坑参数
   * @returns 基坑几何数据
   */
  private async buildDXFBoundaryExcavation(params: ExcavationParameters): Promise<ExcavationGeometry> {
    if (!params.dxfBoundary || params.dxfBoundary.length < 3) {
      throw new Error('DXF边界需要至少3个点');
    }

    const { dxfBoundary, totalDepth, surfaceElevation, globalSlopeRatio = 0 } = params;
    const topZ = surfaceElevation;
    const bottomZ = topZ - totalDepth;
    const slopeOffset = globalSlopeRatio * totalDepth;

    // 确保边界闭合
    const isClosed = this.isPolygonClosed(dxfBoundary);
    const points = isClosed ? dxfBoundary : [...dxfBoundary, dxfBoundary[0]];

    // 计算质心用于三角剖分
    const centroid = this.calculateCentroid(points);

    // 生成底部边界顶点
    const bottomVertices = points.map(p => ({ x: p.x, y: p.y, z: bottomZ }));

    // 生成顶部边界顶点(考虑边坡偏移)
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

    // 添加质心点用于底面三角剖分
    this.vertices.push({ x: centroid.x, y: centroid.y, z: bottomZ });
    const centroidIndex = 0;

    // 添加边界顶点
    this.vertices.push(...bottomVertices, ...topVertices);
    const n = points.length;

    // 构建底面扇形三角形
    for (let i = 0; i < n - 1; i++) {
      this.faces.push([centroidIndex, i + 1, i + 2]);
    }

    // 构建侧面四边形(用两个三角形表示)
    for (let i = 0; i < n - 1; i++) {
      const bottomCurrent = i + 1;
      const bottomNext = i + 2;
      const topCurrent = i + 1 + n;
      const topNext = i + 2 + n;

      this.faces.push([bottomCurrent, topCurrent, topNext]);
      this.faces.push([bottomCurrent, topNext, bottomNext]);
    }

    // 计算法向量
    this.calculateNormals();

    // 计算工程量
    const area = this.calculatePolygonArea(points);
    const volume = area * totalDepth;
    const perimeter = this.calculatePolygonPerimeter(points);
    const slopeArea = perimeter * Math.sqrt(totalDepth * totalDepth + slopeOffset * slopeOffset);

    return {
      vertices: this.vertices,
      faces: this.faces,
      normals: this.normals,
      regions: [{
        regionId: 'dxf_excavation_bottom',
        regionType: 'excavation',
        faceIndices: Array.from({ length: n - 1 }, (_, i) => i),
        volume,
        area
      }],
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
   * @param params 基坑参数
   * @returns 基坑几何数据
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
    const slopeOffset = globalSlopeRatio * totalDepth;

    // 顶部矩形顶点(地面边界)
    const topVertices = [
      { x: centerX - width/2 - slopeOffset, y: centerY - length/2 - slopeOffset, z: topZ },
      { x: centerX + width/2 + slopeOffset, y: centerY - length/2 - slopeOffset, z: topZ },
      { x: centerX + width/2 + slopeOffset, y: centerY + length/2 + slopeOffset, z: topZ },
      { x: centerX - width/2 - slopeOffset, y: centerY + length/2 + slopeOffset, z: topZ }
    ];

    // 底部矩形顶点(基坑底)
    const bottomVertices = [
      { x: centerX - width/2, y: centerY - length/2, z: bottomZ },
      { x: centerX + width/2, y: centerY - length/2, z: bottomZ },
      { x: centerX + width/2, y: centerY + length/2, z: bottomZ },
      { x: centerX - width/2, y: centerY + length/2, z: bottomZ }
    ];

    // 合并顶点
    this.vertices = [...topVertices, ...bottomVertices];

    // 构建底面(两个三角形)
    this.faces.push([4, 5, 6], [4, 6, 7]);

    // 构建四个侧面
    for (let i = 0; i < 4; i++) {
      const next = (i + 1) % 4;
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
   * @param params 基坑参数
   * @returns 基坑几何数据
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

    // 根据半径自适应分段数
    const segments = Math.max(12, Math.min(64, Math.ceil(radius * 4)));
    const angleStep = (2 * Math.PI) / segments;

    // 添加底面中心点
    this.vertices.push({ x: centerX, y: centerY, z: bottomZ });

    // 生成底部圆周顶点
    for (let i = 0; i < segments; i++) {
      const angle = i * angleStep;
      this.vertices.push({
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
        z: bottomZ
      });
    }

    // 生成顶部圆周顶点(考虑边坡)
    for (let i = 0; i < segments; i++) {
      const angle = i * angleStep;
      const topRadius = radius + slopeOffset;
      this.vertices.push({
        x: centerX + topRadius * Math.cos(angle),
        y: centerY + topRadius * Math.sin(angle),
        z: topZ
      });
    }

    // 构建底面扇形三角形
    for (let i = 0; i < segments; i++) {
      const next = (i + 1) % segments;
      this.faces.push([0, i + 1, next + 1]);
    }

    // 构建圆锥侧面
    for (let i = 0; i < segments; i++) {
      const next = (i + 1) % segments;
      const bottomCurrent = i + 1;
      const bottomNext = next + 1;
      const topCurrent = i + 1 + segments;
      const topNext = next + 1 + segments;

      this.faces.push([bottomCurrent, topCurrent, topNext]);
      this.faces.push([bottomCurrent, topNext, bottomNext]);
    }

    // 计算法向量
    this.calculateNormals();

    // 计算工程量
    const volume = Math.PI * radius * radius * totalDepth;
    const surfaceArea = Math.PI * radius * radius;
    const slopeArea = Math.PI * (radius + slopeOffset + radius) * Math.sqrt(totalDepth * totalDepth + slopeOffset * slopeOffset);

    return {
      vertices: this.vertices,
      faces: this.faces,
      normals: this.normals,
      regions: [{
        regionId: 'circular_bottom',
        regionType: 'excavation',
        faceIndices: Array.from({ length: segments }, (_, i) => i),
        volume,
        area: surfaceArea
      }],
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
   * 计算每个顶点的法向量
   */
  private calculateNormals(): void {
    // 初始化法向量数组
    this.normals = new Array(this.vertices.length).fill(null).map(() => ({ x: 0, y: 0, z: 0 }));

    // 为每个面计算法向量并累加到顶点
    for (const face of this.faces) {
      if (face.length >= 3) {
        const v1 = this.vertices[face[0]];
        const v2 = this.vertices[face[1]];
        const v3 = this.vertices[face[2]];

        // 计算两个边向量
        const edge1 = { x: v2.x - v1.x, y: v2.y - v1.y, z: v2.z - v1.z };
        const edge2 = { x: v3.x - v1.x, y: v3.y - v1.y, z: v3.z - v1.z };

        // 计算叉积得到法向量
        const normal = {
          x: edge1.y * edge2.z - edge1.z * edge2.y,
          y: edge1.z * edge2.x - edge1.x * edge2.z,
          z: edge1.x * edge2.y - edge1.y * edge2.x
        };

        // 归一化法向量
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
   * 验证几何体质量
   * @param geometry 几何体数据
   * @returns 质量检查结果
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

  /**
   * 检查多边形是否闭合
   * @param points 点数组
   * @returns 是否闭合
   */
  private isPolygonClosed(points: Point2D[]): boolean {
    if (points.length < 3) return false;
    const first = points[0];
    const last = points[points.length - 1];
    return Math.abs(first.x - last.x) < 1e-6 && Math.abs(first.y - last.y) < 1e-6;
  }

  /**
   * 计算多边形质心
   * @param points 点数组
   * @returns 质心坐标
   */
  private calculateCentroid(points: Point2D[]): Point2D {
    const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
    return { x: sum.x / points.length, y: sum.y / points.length };
  }

  /**
   * 计算多边形面积(鞋带公式)
   * @param points 点数组
   * @returns 面积
   */
  private calculatePolygonArea(points: Point2D[]): number {
    let area = 0;
    for (let i = 0; i < points.length - 1; i++) {
      area += points[i].x * points[i + 1].y - points[i + 1].x * points[i].y;
    }
    return Math.abs(area) / 2;
  }

  /**
   * 计算多边形周长
   * @param points 点数组
   * @returns 周长
   */
  private calculatePolygonPerimeter(points: Point2D[]): number {
    let perimeter = 0;
    for (let i = 0; i < points.length - 1; i++) {
      const dx = points[i + 1].x - points[i].x;
      const dy = points[i + 1].y - points[i].y;
      perimeter += Math.sqrt(dx * dx + dy * dy);
    }
    return perimeter;
  }

  /**
   * 计算三角形面积
   * @param v1 第一个顶点
   * @param v2 第二个顶点
   * @param v3 第三个顶点
   * @returns 面积
   */
  private calculateTriangleArea(v1: Point3D, v2: Point3D, v3: Point3D): number {
    const edge1 = { x: v2.x - v1.x, y: v2.y - v1.y, z: v2.z - v1.z };
    const edge2 = { x: v3.x - v1.x, y: v3.y - v1.y, z: v3.z - v1.z };

    // 计算叉积
    const cross = {
      x: edge1.y * edge2.z - edge1.z * edge2.y,
      y: edge1.z * edge2.x - edge1.x * edge2.z,
      z: edge1.x * edge2.y - edge1.y * edge2.x
    };

    const magnitude = Math.sqrt(cross.x * cross.x + cross.y * cross.y + cross.z * cross.z);
    return magnitude / 2;
  }
}

/**
 * 构建基坑几何体的便捷函数
 * @param params 基坑参数
 * @returns 基坑几何数据
 */
export const buildExcavationGeometry = async (params: ExcavationParameters): Promise<ExcavationGeometry> => {
  const builder = new ExcavationGeometryBuilder();
  return await builder.buildExcavation(params);
};

export default ExcavationGeometryBuilder;