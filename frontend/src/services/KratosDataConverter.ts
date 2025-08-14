/**
 * Kratos数据转换服务
 * 0号架构师 - 基于3号专家提供的Kratos计算引擎数据格式规范
 * 实现网格数据到Kratos标准格式的完整转换
 */

// Kratos数据接口定义 - 基于3号专家规范
export interface KratosGeometryData {
  nodes: {
    nodeIds: Uint32Array;           // 节点ID数组 [1, 2, 3, ...]
    coordinates: Float64Array;      // 节点坐标 [x1,y1,z1, x2,y2,z2, ...]
    nodeCount: number;              // 节点总数
  };

  elements: {
    elementIds: Uint32Array;        // 单元ID数组
    connectivity: Uint32Array;      // 单元连接性 [e1n1,e1n2,..., e2n1,e2n2,...]
    elementTypes: Uint8Array;       // 单元类型数组
    elementCount: number;           // 单元总数
  };

  conditions: {
    conditionIds: Uint32Array;      // 条件ID数组
    conditionTypes: string[];       // 条件类型 ['LineCondition2D2N', ...]
    conditionConnectivity: Uint32Array; // 条件连接性
    conditionCount: number;         // 条件总数
  };
}

export interface KratosMaterialData {
  materialId: number;
  materialName: string;
  properties: {
    // 土体材料属性
    density: number;                // 密度 (kg/m³)
    young_modulus: number;          // 弹性模量 (Pa)
    poisson_ratio: number;          // 泊松比
    cohesion: number;               // 粘聚力 (Pa)
    friction_angle: number;         // 内摩擦角 (度)

    // 渗透特性
    permeability_xx: number;        // X方向渗透系数 (m/s)
    permeability_yy: number;        // Y方向渗透系数 (m/s)
    permeability_zz: number;        // Z方向渗透系数 (m/s)

    // 非线性参数
    plastic_model: string;          // 塑性模型类型
    hardening_law: string;          // 硬化法则
    yield_stress: number;           // 屈服应力 (Pa)
  };
}

export interface KratosBoundaryCondition {
  conditionId: number;
  conditionType: 'displacement' | 'force' | 'pressure' | 'flow';
  appliedNodes: number[];          // 应用节点ID
  values: number[];                // 边界值
  direction: 'X' | 'Y' | 'Z' | 'NORMAL' | 'TANGENTIAL';
  isFixed: boolean;                // 是否为固定约束
  timeFunction?: string;           // 时间函数（动态边界条件）
}

export interface KratosModelData {
  modelInfo: {
    modelName: string;
    dimension: 2 | 3;               // 2D或3D模型
    problemType: 'mechanical' | 'fluid' | 'coupled';
    analysisType: 'static' | 'dynamic' | 'eigenvalue';
  };

  geometry: KratosGeometryData;
  materials: KratosMaterialData[];
  boundaryConditions: KratosBoundaryCondition[];

  // 物理组（子域）
  subdomains: {
    subdomainId: number;
    subdomainName: string;
    materialId: number;
    elementIds: number[];          // 属于该子域的单元ID
  }[];

  // 求解器配置
  solverSettings: {
    solverType: string;            // 求解器类型
    convergenceCriteria: {
      residual_tolerance: number;
      displacement_tolerance: number;
      max_iterations: number;
    };
    timeIntegration?: {
      scheme: string;              // 时间积分格式
      time_step: number;           // 时间步长
      end_time: number;            // 结束时间
    };
  };
}

// Kratos单元类型枚举
export enum KratosElementType {
  // 2D单元
  Triangle2D3N = 5,               // 3节点三角形
  Triangle2D6N = 22,              // 6节点三角形
  Quadrilateral2D4N = 9,          // 4节点四边形
  Quadrilateral2D8N = 23,         // 8节点四边形

  // 3D单元
  Tetrahedra3D4N = 10,            // 4节点四面体
  Tetrahedra3D10N = 24,           // 10节点四面体
  Hexahedra3D8N = 12,             // 8节点六面体
  Hexahedra3D20N = 25,            // 20节点六面体
  Prism3D6N = 13,                 // 6节点棱柱
  Prism3D15N = 26,                // 15节点棱柱

  // 边界单元
  Line2D2N = 3,                   // 2节点线单元
  Line2D3N = 21,                  // 3节点线单元
  Triangle3D3N = 30,              // 3节点三角形面单元
  Triangle3D6N = 31,              // 6节点三角形面单元
  Quadrilateral3D4N = 32,         // 4节点四边形面单元
}

// 网格质量指标接口
export interface MeshQualityMetrics {
  // 几何质量指标
  aspectRatio: {
    values: Float32Array;          // 每个单元的长宽比
    mean: number;                  // 平均值
    min: number;                   // 最小值
    max: number;                   // 最大值
    acceptable_range: [number, number]; // 可接受范围 [1, 10]
    excellent_range: [number, number];  // 优秀范围 [1, 3]
  };

  skewness: {
    values: Float32Array;          // 偏斜度
    mean: number;
    min: number;
    max: number;
    acceptable_range: [number, number]; // [0, 0.85]
    excellent_range: [number, number];  // [0, 0.25]
  };

  jacobian: {
    values: Float32Array;          // 雅可比行列式
    mean: number;
    min: number;                   // 必须 > 0
    max: number;
    acceptable_threshold: number;   // > 0.1
    excellent_threshold: number;    // > 0.5
  };

  orthogonality: {
    values: Float32Array;          // 正交性
    mean: number;
    min: number;
    max: number;
    acceptable_range: [number, number]; // [0.15, 1.0]
    excellent_range: [number, number];  // [0.8, 1.0]
  };

  edgeRatio: {
    values: Float32Array;          // 边长比
    mean: number;
    min: number;
    max: number;
    acceptable_range: [number, number]; // [0.1, 10]
    excellent_range: [number, number];  // [0.5, 2]
  };

  volume: {
    values: Float32Array;          // 单元体积
    mean: number;
    min: number;                   // 必须 > 0
    max: number;
    total: number;                 // 总体积
  };
}

// 质量评估标准
export interface QualityStandards {
  // 深基坑工程专用标准
  deepExcavation: {
    aspectRatio: {
      excellent: [number, number];
      good: [number, number];
      acceptable: [number, number];
      poor: [number, number];
      unacceptable: [number, number];
    };
    skewness: {
      excellent: [number, number];
      good: [number, number];
      acceptable: [number, number];
      poor: [number, number];
      unacceptable: [number, number];
    };
    jacobian: {
      excellent: [number, number];
      good: [number, number];
      acceptable: [number, number];
      poor: [number, number];
      unacceptable: [number, number];
    };
    orthogonality: {
      excellent: [number, number];
      good: [number, number];
      acceptable: [number, number];
      poor: [number, number];
      unacceptable: [number, number];
    };
  };

  // Kratos求解器要求
  kratosRequirements: {
    minimumJacobian: number;         // 最小雅可比值
    maximumAspectRatio: number;      // 最大长宽比
    maximumSkewness: number;         // 最大偏斜度
    minimumOrthogonality: number;    // 最小正交性
    minimumVolume: number;           // 最小单元体积
  };
}

// Kratos单元转换器
export class KratosElementConverter {
  // 从通用网格格式转换到Kratos格式
  static convertFromGenericMesh(
    vertices: Float32Array | Float64Array,
    cells: Uint32Array,
    cellTypes: Uint8Array
  ): KratosGeometryData {
    console.log('🔄 开始转换网格数据到Kratos格式');

    const nodeCount = vertices.length / 3;
    const nodes = {
      nodeIds: new Uint32Array(nodeCount),
      coordinates: new Float64Array(vertices),
      nodeCount
    };

    // 生成节点ID (从1开始，Kratos约定)
    for (let i = 0; i < nodeCount; i++) {
      nodes.nodeIds[i] = i + 1;
    }

    // 转换单元数据
    const elements = this.convertCellsToKratosElements(cells, cellTypes);

    console.log('✅ Kratos格式转换完成:', {
      节点数: nodeCount,
      单元数: elements.elementCount
    });

    return {
      nodes,
      elements,
      conditions: {
        conditionIds: new Uint32Array(0),
        conditionTypes: [],
        conditionConnectivity: new Uint32Array(0),
        conditionCount: 0
      }
    };
  }

  private static convertCellsToKratosElements(
    cells: Uint32Array,
    cellTypes: Uint8Array
  ): KratosGeometryData['elements'] {
    const elementIds: number[] = [];
    const connectivity: number[] = [];
    const kratosTypes: number[] = [];

    let cellOffset = 0;
    let elementId = 1;

    for (let i = 0; i < cellTypes.length; i++) {
      const cellType = cellTypes[i];
      const numNodes = cells[cellOffset];

      // 转换为Kratos单元类型
      const kratosType = this.vtkToKratosElementType(cellType);
      kratosTypes.push(kratosType);

      elementIds.push(elementId++);

      // 添加连接性（节点ID从1开始）
      for (let j = 1; j <= numNodes; j++) {
        connectivity.push(cells[cellOffset + j] + 1);
      }

      cellOffset += numNodes + 1;
    }

    return {
      elementIds: new Uint32Array(elementIds),
      connectivity: new Uint32Array(connectivity),
      elementTypes: new Uint8Array(kratosTypes),
      elementCount: elementIds.length
    };
  }

  private static vtkToKratosElementType(vtkType: number): KratosElementType {
    const mapping: Record<number, KratosElementType> = {
      5: KratosElementType.Triangle2D3N,      // VTK_TRIANGLE
      9: KratosElementType.Quadrilateral2D4N, // VTK_QUAD
      10: KratosElementType.Tetrahedra3D4N,   // VTK_TETRA
      12: KratosElementType.Hexahedra3D8N,    // VTK_HEXAHEDRON
      13: KratosElementType.Prism3D6N,        // VTK_WEDGE
    };

    return mapping[vtkType] || KratosElementType.Tetrahedra3D4N;
  }

  static getElementNodeCount(elementType: KratosElementType): number {
    const nodeCounts: Record<KratosElementType, number> = {
      [KratosElementType.Triangle2D3N]: 3,
      [KratosElementType.Triangle2D6N]: 6,
      [KratosElementType.Quadrilateral2D4N]: 4,
      [KratosElementType.Quadrilateral2D8N]: 8,
      [KratosElementType.Tetrahedra3D4N]: 4,
      [KratosElementType.Tetrahedra3D10N]: 10,
      [KratosElementType.Hexahedra3D8N]: 8,
      [KratosElementType.Hexahedra3D20N]: 20,
      [KratosElementType.Prism3D6N]: 6,
      [KratosElementType.Prism3D15N]: 15,
      [KratosElementType.Line2D2N]: 2,
      [KratosElementType.Line2D3N]: 3,
      [KratosElementType.Triangle3D3N]: 3,
      [KratosElementType.Triangle3D6N]: 6,
      [KratosElementType.Quadrilateral3D4N]: 4,
    };

    return nodeCounts[elementType] || 4;
  }
}

// 网格质量计算器
export class MeshQualityCalculator {
  private static qualityStandards: QualityStandards = {
    deepExcavation: {
      aspectRatio: {
        excellent: [1, 2],
        good: [1, 5],
        acceptable: [1, 10],
        poor: [10, 20],
        unacceptable: [20, Infinity]
      },
      skewness: {
        excellent: [0, 0.15],
        good: [0, 0.25],
        acceptable: [0, 0.6],
        poor: [0.6, 0.85],
        unacceptable: [0.85, 1]
      },
      jacobian: {
        excellent: [0.7, Infinity],
        good: [0.5, Infinity],
        acceptable: [0.2, Infinity],
        poor: [0.05, 0.2],
        unacceptable: [0, 0.05]
      },
      orthogonality: {
        excellent: [0.95, 1],
        good: [0.8, 1],
        acceptable: [0.5, 1],
        poor: [0.2, 0.5],
        unacceptable: [0, 0.2]
      }
    },
    kratosRequirements: {
      minimumJacobian: 0.01,
      maximumAspectRatio: 100,
      maximumSkewness: 0.95,
      minimumOrthogonality: 0.01,
      minimumVolume: 1e-12,
    }
  };

  // 计算完整质量指标
  static calculateQualityMetrics(
    kratosGeometry: KratosGeometryData
  ): MeshQualityMetrics {
    console.log('🔍 开始计算网格质量指标');

    const elementCount = kratosGeometry.elements.elementCount;
    
    // 初始化质量指标数组
    const aspectRatio = new Float32Array(elementCount);
    const skewness = new Float32Array(elementCount);
    const jacobian = new Float32Array(elementCount);
    const orthogonality = new Float32Array(elementCount);
    const edgeRatio = new Float32Array(elementCount);
    const volume = new Float32Array(elementCount);

    // 遍历所有单元计算质量指标
    let connectivityOffset = 0;
    for (let i = 0; i < elementCount; i++) {
      const elementType = kratosGeometry.elements.elementTypes[i];
      const numNodes = KratosElementConverter.getElementNodeCount(elementType);

      // 获取单元节点坐标
      const nodeCoords = this.getElementNodeCoordinates(
        kratosGeometry,
        connectivityOffset,
        numNodes
      );

      // 计算各项质量指标
      aspectRatio[i] = this.calculateAspectRatio(nodeCoords, elementType);
      skewness[i] = this.calculateSkewness(nodeCoords, elementType);
      jacobian[i] = this.calculateJacobian(nodeCoords, elementType);
      orthogonality[i] = this.calculateOrthogonality(nodeCoords, elementType);
      edgeRatio[i] = this.calculateEdgeRatio(nodeCoords, elementType);
      volume[i] = this.calculateVolume(nodeCoords, elementType);

      connectivityOffset += numNodes;
    }

    const metrics: MeshQualityMetrics = {
      aspectRatio: {
        values: aspectRatio,
        mean: this.calculateMean(aspectRatio),
        min: this.calculateMin(aspectRatio),
        max: this.calculateMax(aspectRatio),
        acceptable_range: [1, 10],
        excellent_range: [1, 3]
      },

      skewness: {
        values: skewness,
        mean: this.calculateMean(skewness),
        min: this.calculateMin(skewness),
        max: this.calculateMax(skewness),
        acceptable_range: [0, 0.85],
        excellent_range: [0, 0.25]
      },

      jacobian: {
        values: jacobian,
        mean: this.calculateMean(jacobian),
        min: this.calculateMin(jacobian),
        max: this.calculateMax(jacobian),
        acceptable_threshold: 0.1,
        excellent_threshold: 0.5
      },

      orthogonality: {
        values: orthogonality,
        mean: this.calculateMean(orthogonality),
        min: this.calculateMin(orthogonality),
        max: this.calculateMax(orthogonality),
        acceptable_range: [0.15, 1.0],
        excellent_range: [0.8, 1.0]
      },

      edgeRatio: {
        values: edgeRatio,
        mean: this.calculateMean(edgeRatio),
        min: this.calculateMin(edgeRatio),
        max: this.calculateMax(edgeRatio),
        acceptable_range: [0.1, 10],
        excellent_range: [0.5, 2]
      },

      volume: {
        values: volume,
        mean: this.calculateMean(volume),
        min: this.calculateMin(volume),
        max: this.calculateMax(volume),
        total: volume.reduce((sum, v) => sum + v, 0)
      }
    };

    console.log('✅ 网格质量指标计算完成:', {
      平均长宽比: metrics.aspectRatio.mean.toFixed(2),
      最大偏斜度: metrics.skewness.max.toFixed(3),
      最小雅可比: metrics.jacobian.min.toFixed(3),
      平均正交性: metrics.orthogonality.mean.toFixed(3)
    });

    return metrics;
  }

  private static getElementNodeCoordinates(
    kratosGeometry: KratosGeometryData,
    connectivityOffset: number,
    numNodes: number
  ): Float64Array {
    const coords = new Float64Array(numNodes * 3);
    
    for (let i = 0; i < numNodes; i++) {
      const nodeId = kratosGeometry.elements.connectivity[connectivityOffset + i];
      const nodeIndex = nodeId - 1; // 转换为0基索引

      coords[i * 3] = kratosGeometry.nodes.coordinates[nodeIndex * 3];
      coords[i * 3 + 1] = kratosGeometry.nodes.coordinates[nodeIndex * 3 + 1];
      coords[i * 3 + 2] = kratosGeometry.nodes.coordinates[nodeIndex * 3 + 2];
    }

    return coords;
  }

  // 计算长宽比
  private static calculateAspectRatio(
    nodeCoords: Float64Array,
    elementType: KratosElementType
  ): number {
    switch (elementType) {
      case KratosElementType.Triangle2D3N:
      case KratosElementType.Triangle3D3N:
        return this.triangleAspectRatio(nodeCoords);

      case KratosElementType.Quadrilateral2D4N:
      case KratosElementType.Quadrilateral3D4N:
        return this.quadAspectRatio(nodeCoords);

      case KratosElementType.Tetrahedra3D4N:
        return this.tetraAspectRatio(nodeCoords);

      case KratosElementType.Hexahedra3D8N:
        return this.hexAspectRatio(nodeCoords);

      default:
        return 1.0;
    }
  }

  // 三角形长宽比计算
  private static triangleAspectRatio(coords: Float64Array): number {
    const a = this.distance3D(coords, 0, 1);
    const b = this.distance3D(coords, 1, 2);
    const c = this.distance3D(coords, 2, 0);

    const maxEdge = Math.max(a, b, c);
    const minEdge = Math.min(a, b, c);

    return maxEdge / Math.max(minEdge, 1e-12);
  }

  // 四边形长宽比计算
  private static quadAspectRatio(coords: Float64Array): number {
    // 计算对角线长度
    const diag1 = this.distance3D(coords, 0, 2);
    const diag2 = this.distance3D(coords, 1, 3);

    return Math.max(diag1, diag2) / Math.max(Math.min(diag1, diag2), 1e-12);
  }

  // 四面体长宽比计算
  private static tetraAspectRatio(coords: Float64Array): number {
    const edges = [
      this.distance3D(coords, 0, 1),
      this.distance3D(coords, 0, 2),
      this.distance3D(coords, 0, 3),
      this.distance3D(coords, 1, 2),
      this.distance3D(coords, 1, 3),
      this.distance3D(coords, 2, 3)
    ];

    const maxEdge = Math.max(...edges);
    const minEdge = Math.min(...edges);

    return maxEdge / Math.max(minEdge, 1e-12);
  }

  // 六面体长宽比计算
  private static hexAspectRatio(coords: Float64Array): number {
    // 简化计算：使用最大和最小边长
    const edges: number[] = [];
    for (let i = 0; i < 8; i++) {
      for (let j = i + 1; j < 8; j++) {
        const dist = this.distance3D(coords, i, j);
        if (dist > 1e-12) edges.push(dist);
      }
    }

    const maxEdge = Math.max(...edges);
    const minEdge = Math.min(...edges);

    return maxEdge / Math.max(minEdge, 1e-12);
  }

  // 计算偏斜度
  private static calculateSkewness(
    nodeCoords: Float64Array,
    elementType: KratosElementType
  ): number {
    switch (elementType) {
      case KratosElementType.Triangle2D3N:
      case KratosElementType.Triangle3D3N:
        return this.triangleSkewness(nodeCoords);

      case KratosElementType.Quadrilateral2D4N:
      case KratosElementType.Quadrilateral3D4N:
        return this.quadSkewness(nodeCoords);

      case KratosElementType.Tetrahedra3D4N:
        return this.tetraSkewness(nodeCoords);

      default:
        return 0.0;
    }
  }

  // 三角形偏斜度
  private static triangleSkewness(coords: Float64Array): number {
    const angles = this.triangleAngles(coords);
    const maxAngle = Math.max(...angles);
    const idealAngle = Math.PI / 3; // 60度

    return Math.abs(maxAngle - idealAngle) / idealAngle;
  }

  // 四边形偏斜度
  private static quadSkewness(coords: Float64Array): number {
    const angles = this.quadAngles(coords);
    const idealAngle = Math.PI / 2; // 90度
    
    let maxDeviation = 0;
    for (const angle of angles) {
      const deviation = Math.abs(angle - idealAngle) / idealAngle;
      maxDeviation = Math.max(maxDeviation, deviation);
    }

    return maxDeviation;
  }

  // 四面体偏斜度
  private static tetraSkewness(coords: Float64Array): number {
    // 简化计算：基于面角偏差
    const idealAngle = Math.acos(-1/3); // 四面体理想二面角
    
    // 计算四个面的法向量夹角
    const faces = [
      [0, 1, 2], [0, 1, 3], [0, 2, 3], [1, 2, 3]
    ];

    let maxSkew = 0;
    for (let i = 0; i < faces.length; i++) {
      for (let j = i + 1; j < faces.length; j++) {
        const normal1 = this.faceNormal(coords, faces[i]);
        const normal2 = this.faceNormal(coords, faces[j]);
        const angle = this.vectorAngle(normal1, normal2);
        
        const skew = Math.abs(angle - idealAngle) / idealAngle;
        maxSkew = Math.max(maxSkew, skew);
      }
    }

    return maxSkew;
  }

  // 计算雅可比行列式
  private static calculateJacobian(
    nodeCoords: Float64Array,
    elementType: KratosElementType
  ): number {
    switch (elementType) {
      case KratosElementType.Triangle2D3N:
      case KratosElementType.Triangle3D3N:
        return this.triangleJacobian(nodeCoords);

      case KratosElementType.Quadrilateral2D4N:
      case KratosElementType.Quadrilateral3D4N:
        return this.quadJacobian(nodeCoords);

      case KratosElementType.Tetrahedra3D4N:
        return this.tetraJacobian(nodeCoords);

      default:
        return 1.0;
    }
  }

  // 三角形雅可比
  private static triangleJacobian(coords: Float64Array): number {
    const x1 = coords[0], y1 = coords[1];
    const x2 = coords[3], y2 = coords[4];
    const x3 = coords[6], y3 = coords[7];

    const jacobian = (x2 - x1) * (y3 - y1) - (x3 - x1) * (y2 - y1);
    const area = Math.abs(jacobian) / 2;
    
    // 计算理想面积
    const a = this.distance3D(coords, 0, 1);
    const b = this.distance3D(coords, 1, 2);
    const c = this.distance3D(coords, 2, 0);
    const s = (a + b + c) / 2;
    const idealArea = Math.sqrt(s * (s - a) * (s - b) * (s - c));

    return area / Math.max(idealArea, 1e-12);
  }

  // 四边形雅可比（简化）
  private static quadJacobian(coords: Float64Array): number {
    // 计算中心点雅可比
    const centerX = (coords[0] + coords[3] + coords[6] + coords[9]) / 4;
    const centerY = (coords[1] + coords[4] + coords[7] + coords[10]) / 4;

    // 简化雅可比计算
    const area = this.quadArea(coords);
    const idealArea = this.quadIdealArea(coords);

    return area / Math.max(idealArea, 1e-12);
  }

  // 四面体雅可比
  private static tetraJacobian(coords: Float64Array): number {
    const vol = this.tetraVolume(coords);
    const idealVol = this.tetraIdealVolume(coords);

    return vol / Math.max(idealVol, 1e-12);
  }

  // 计算正交性
  private static calculateOrthogonality(
    nodeCoords: Float64Array,
    elementType: KratosElementType
  ): number {
    // 简化实现：基于边向量的夹角
    switch (elementType) {
      case KratosElementType.Triangle2D3N:
      case KratosElementType.Triangle3D3N:
        return this.triangleOrthogonality(nodeCoords);

      case KratosElementType.Quadrilateral2D4N:
      case KratosElementType.Quadrilateral3D4N:
        return this.quadOrthogonality(nodeCoords);

      default:
        return 1.0;
    }
  }

  private static triangleOrthogonality(coords: Float64Array): number {
    const angles = this.triangleAngles(coords);
    const idealAngle = Math.PI / 3;
    
    let minOrthogonality = 1.0;
    for (const angle of angles) {
      const orthogonality = Math.min(angle, Math.PI - angle) / idealAngle;
      minOrthogonality = Math.min(minOrthogonality, orthogonality);
    }

    return minOrthogonality;
  }

  private static quadOrthogonality(coords: Float64Array): number {
    const angles = this.quadAngles(coords);
    const idealAngle = Math.PI / 2;
    
    let minOrthogonality = 1.0;
    for (const angle of angles) {
      const orthogonality = Math.min(angle, Math.PI - angle) / idealAngle;
      minOrthogonality = Math.min(minOrthogonality, orthogonality);
    }

    return minOrthogonality;
  }

  // 计算边长比
  private static calculateEdgeRatio(
    nodeCoords: Float64Array,
    elementType: KratosElementType
  ): number {
    // 简化实现：返回长宽比（已经计算过）
    return this.calculateAspectRatio(nodeCoords, elementType);
  }

  // 计算体积
  private static calculateVolume(
    nodeCoords: Float64Array,
    elementType: KratosElementType
  ): number {
    switch (elementType) {
      case KratosElementType.Triangle2D3N:
      case KratosElementType.Triangle3D3N:
        return this.triangleArea(nodeCoords);

      case KratosElementType.Quadrilateral2D4N:
      case KratosElementType.Quadrilateral3D4N:
        return this.quadArea(nodeCoords);

      case KratosElementType.Tetrahedra3D4N:
        return this.tetraVolume(nodeCoords);

      case KratosElementType.Hexahedra3D8N:
        return this.hexVolume(nodeCoords);

      default:
        return 1.0;
    }
  }

  // 工具函数
  private static distance3D(coords: Float64Array, i: number, j: number): number {
    const dx = coords[j * 3] - coords[i * 3];
    const dy = coords[j * 3 + 1] - coords[i * 3 + 1];
    const dz = coords[j * 3 + 2] - coords[i * 3 + 2];

    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  private static triangleArea(coords: Float64Array): number {
    const a = this.distance3D(coords, 0, 1);
    const b = this.distance3D(coords, 1, 2);
    const c = this.distance3D(coords, 2, 0);
    
    const s = (a + b + c) / 2;
    return Math.sqrt(Math.max(0, s * (s - a) * (s - b) * (s - c)));
  }

  private static quadArea(coords: Float64Array): number {
    // 分解为两个三角形
    const tri1 = new Float64Array([
      coords[0], coords[1], coords[2],
      coords[3], coords[4], coords[5],
      coords[6], coords[7], coords[8]
    ]);
    
    const tri2 = new Float64Array([
      coords[0], coords[1], coords[2],
      coords[6], coords[7], coords[8],
      coords[9], coords[10], coords[11]
    ]);

    return this.triangleArea(tri1) + this.triangleArea(tri2);
  }

  private static tetraVolume(coords: Float64Array): number {
    // 使用行列式计算四面体体积
    const x1 = coords[0], y1 = coords[1], z1 = coords[2];
    const x2 = coords[3], y2 = coords[4], z2 = coords[5];
    const x3 = coords[6], y3 = coords[7], z3 = coords[8];
    const x4 = coords[9], y4 = coords[10], z4 = coords[11];

    const det = (x2 - x1) * ((y3 - y1) * (z4 - z1) - (z3 - z1) * (y4 - y1)) -
                (y2 - y1) * ((x3 - x1) * (z4 - z1) - (z3 - z1) * (x4 - x1)) +
                (z2 - z1) * ((x3 - x1) * (y4 - y1) - (y3 - y1) * (x4 - x1));

    return Math.abs(det) / 6.0;
  }

  private static hexVolume(coords: Float64Array): number {
    // 简化计算：分解为四面体求和
    // 这里使用近似方法
    let totalVolume = 0;
    
    // 分解为6个四面体（简化）
    const center = new Float64Array(3);
    for (let i = 0; i < 8; i++) {
      center[0] += coords[i * 3] / 8;
      center[1] += coords[i * 3 + 1] / 8;
      center[2] += coords[i * 3 + 2] / 8;
    }

    // 计算6个面的四面体体积之和
    const faces = [
      [0, 1, 2, 3], [4, 5, 6, 7], // 上下面
      [0, 1, 5, 4], [2, 3, 7, 6], // 前后面
      [0, 3, 7, 4], [1, 2, 6, 5]  // 左右面
    ];

    for (const face of faces) {
      const faceCoords = new Float64Array(12);
      for (let i = 0; i < 4; i++) {
        faceCoords[i * 3] = coords[face[i] * 3];
        faceCoords[i * 3 + 1] = coords[face[i] * 3 + 1];
        faceCoords[i * 3 + 2] = coords[face[i] * 3 + 2];
      }
      
      // 近似计算
      totalVolume += this.quadArea(faceCoords) * 0.1; // 简化
    }

    return totalVolume;
  }

  private static triangleAngles(coords: Float64Array): number[] {
    const a = this.distance3D(coords, 1, 2);
    const b = this.distance3D(coords, 0, 2);
    const c = this.distance3D(coords, 0, 1);

    const angle1 = Math.acos(Math.max(-1, Math.min(1, (b*b + c*c - a*a) / (2*b*c))));
    const angle2 = Math.acos(Math.max(-1, Math.min(1, (a*a + c*c - b*b) / (2*a*c))));
    const angle3 = Math.PI - angle1 - angle2;

    return [angle1, angle2, angle3];
  }

  private static quadAngles(coords: Float64Array): number[] {
    // 简化实现：计算4个顶点角
    const angles: number[] = [];
    
    for (let i = 0; i < 4; i++) {
      const prev = (i + 3) % 4;
      const next = (i + 1) % 4;
      
      const v1 = [
        coords[prev * 3] - coords[i * 3],
        coords[prev * 3 + 1] - coords[i * 3 + 1],
        coords[prev * 3 + 2] - coords[i * 3 + 2]
      ];
      
      const v2 = [
        coords[next * 3] - coords[i * 3],
        coords[next * 3 + 1] - coords[i * 3 + 1],
        coords[next * 3 + 2] - coords[i * 3 + 2]
      ];
      
      const angle = this.vectorAngle(v1, v2);
      angles.push(angle);
    }

    return angles;
  }

  private static faceNormal(coords: Float64Array, faceIndices: number[]): number[] {
    const [i, j, k] = faceIndices;
    
    const v1 = [
      coords[j * 3] - coords[i * 3],
      coords[j * 3 + 1] - coords[i * 3 + 1],
      coords[j * 3 + 2] - coords[i * 3 + 2]
    ];
    
    const v2 = [
      coords[k * 3] - coords[i * 3],
      coords[k * 3 + 1] - coords[i * 3 + 1],
      coords[k * 3 + 2] - coords[i * 3 + 2]
    ];
    
    // 叉积
    const normal = [
      v1[1] * v2[2] - v1[2] * v2[1],
      v1[2] * v2[0] - v1[0] * v2[2],
      v1[0] * v2[1] - v1[1] * v2[0]
    ];
    
    // 归一化
    const length = Math.sqrt(normal[0]*normal[0] + normal[1]*normal[1] + normal[2]*normal[2]);
    return [normal[0]/length, normal[1]/length, normal[2]/length];
  }

  private static vectorAngle(v1: number[], v2: number[]): number {
    const dot = v1[0]*v2[0] + v1[1]*v2[1] + v1[2]*v2[2];
    const len1 = Math.sqrt(v1[0]*v1[0] + v1[1]*v1[1] + v1[2]*v1[2]);
    const len2 = Math.sqrt(v2[0]*v2[0] + v2[1]*v2[1] + v2[2]*v2[2]);
    
    return Math.acos(Math.max(-1, Math.min(1, dot / (len1 * len2))));
  }

  private static quadIdealArea(coords: Float64Array): number {
    // 理想四边形面积（矩形）
    const side1 = this.distance3D(coords, 0, 1);
    const side2 = this.distance3D(coords, 1, 2);
    return side1 * side2;
  }

  private static tetraIdealVolume(coords: Float64Array): number {
    // 理想四面体体积（正四面体）
    const avgEdge = [
      this.distance3D(coords, 0, 1),
      this.distance3D(coords, 0, 2),
      this.distance3D(coords, 0, 3),
      this.distance3D(coords, 1, 2),
      this.distance3D(coords, 1, 3),
      this.distance3D(coords, 2, 3)
    ].reduce((sum, edge) => sum + edge, 0) / 6;

    return Math.pow(avgEdge, 3) / (6 * Math.sqrt(2));
  }

  private static calculateMean(values: Float32Array): number {
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  private static calculateMin(values: Float32Array): number {
    return Math.min(...values);
  }

  private static calculateMax(values: Float32Array): number {
    return Math.max(...values);
  }
}

// 导出单例实例
export const kratosConverter = {
  KratosElementConverter,
  MeshQualityCalculator
};

export default kratosConverter;