/**
 * Kratos计算引擎网格数据接口
 * 3号计算专家 - 为0号架构师提供的标准化Kratos数据格式
 * 包含网格转换、质量评估和数据验证的完整解决方案
 */

// ======================== Kratos核心数据结构 ========================

/**
 * Kratos网格几何数据结构
 */
export interface KratosGeometryData {
  // 节点数据
  nodes: {
    nodeIds: Uint32Array;           // 节点ID数组 [1, 2, 3, ...]
    coordinates: Float64Array;      // 节点坐标 [x1,y1,z1, x2,y2,z2, ...]
    nodeCount: number;              // 节点总数
  };
  
  // 单元数据
  elements: {
    elementIds: Uint32Array;        // 单元ID数组
    connectivity: Uint32Array;      // 单元连接性 [e1n1,e1n2,..., e2n1,e2n2,...]
    elementTypes: Uint8Array;       // 单元类型数组
    elementCount: number;           // 单元总数
  };
  
  // 条件数据（边界）
  conditions: {
    conditionIds: Uint32Array;      // 条件ID数组
    conditionTypes: string[];       // 条件类型 ['LineCondition2D2N', ...]
    conditionConnectivity: Uint32Array; // 条件连接性
    conditionCount: number;         // 条件总数
  };
}

/**
 * Kratos材料属性数据
 */
export interface KratosMaterialData {
  materialId: number;
  materialName: string;
  properties: {
    // 基础力学属性
    density: number;                // 密度 (kg/m³)
    young_modulus: number;          // 弹性模量 (Pa)
    poisson_ratio: number;          // 泊松比
    
    // 土体强度参数
    cohesion: number;               // 粘聚力 (Pa)
    friction_angle: number;         // 内摩擦角 (度)
    dilatancy_angle: number;        // 剪胀角 (度)
    
    // 渗透特性
    permeability_xx: number;        // X方向渗透系数 (m/s)
    permeability_yy: number;        // Y方向渗透系数 (m/s)
    permeability_zz: number;        // Z方向渗透系数 (m/s)
    
    // 非线性参数
    plastic_model: string;          // 塑性模型类型
    hardening_law: string;          // 硬化法则
    yield_stress: number;           // 屈服应力 (Pa)
    
    // 固结参数
    consolidation_coefficient: number; // 固结系数 (m²/s)
    compression_index: number;      // 压缩指数
    swelling_index: number;         // 回弹指数
    preconsolidation_pressure: number; // 前期固结压力 (Pa)
  };
}

/**
 * Kratos边界条件数据
 */
export interface KratosBoundaryCondition {
  conditionId: number;
  conditionName: string;
  conditionType: 'displacement' | 'force' | 'pressure' | 'flow' | 'temperature';
  appliedNodes: number[];          // 应用节点ID
  values: number[];                // 边界值
  direction: 'X' | 'Y' | 'Z' | 'NORMAL' | 'TANGENTIAL' | 'ALL';
  isFixed: boolean;                // 是否为固定约束
  timeFunction?: string;           // 时间函数（动态边界条件）
  
  // 深基坑专用边界条件
  excavationStage?: number;        // 施工阶段
  activationTime?: number;         // 激活时间
  deactivationTime?: number;       // 失效时间
}

/**
 * Kratos完整模型数据
 */
export interface KratosModelData {
  modelInfo: {
    modelName: string;
    dimension: 2 | 3;               // 2D或3D模型
    problemType: 'mechanical' | 'fluid' | 'coupled' | 'thermal';
    analysisType: 'static' | 'dynamic' | 'eigenvalue' | 'transient';
    kratosVersion: string;          // Kratos版本
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
    excavationStage?: number;      // 开挖阶段
  }[];
  
  // 求解器配置
  solverSettings: {
    solverType: string;            // 求解器类型
    convergenceCriteria: {
      residual_tolerance: number;
      displacement_tolerance: number;
      max_iterations: number;
      echo_level: number;
    };
    timeIntegration?: {
      scheme: string;              // 时间积分格式
      time_step: number;           // 时间步长
      start_time: number;          // 开始时间
      end_time: number;            // 结束时间
    };
    linearSolver: {
      solver_type: string;         // 线性求解器类型
      preconditioner: string;      // 预条件器
      tolerance: number;           // 求解容差
      max_iteration: number;       // 最大迭代次数
    };
  };
  
  // 输出配置
  outputSettings: {
    outputControlType: string;     // 输出控制类型
    outputFrequency: number;       // 输出频率
    outputVariables: string[];     // 输出变量
    outputFormat: 'vtk' | 'gid' | 'hdf5';
  };
}

// ======================== Kratos单元类型定义 ========================

/**
 * Kratos支持的单元类型枚举
 */
export enum KratosElementType {
  // 2D单元
  Triangle2D3N = 5,               // 3节点三角形
  Triangle2D6N = 22,              // 6节点三角形
  Quadrilateral2D4N = 9,          // 4节点四边形
  Quadrilateral2D8N = 23,         // 8节点四边形
  Quadrilateral2D9N = 28,         // 9节点四边形
  
  // 3D单元
  Tetrahedra3D4N = 10,            // 4节点四面体
  Tetrahedra3D10N = 24,           // 10节点四面体
  Hexahedra3D8N = 12,             // 8节点六面体
  Hexahedra3D20N = 25,            // 20节点六面体
  Hexahedra3D27N = 29,            // 27节点六面体
  Prism3D6N = 13,                 // 6节点棱柱
  Prism3D15N = 26,                // 15节点棱柱
  Pyramid3D5N = 14,               // 5节点金字塔
  Pyramid3D13N = 27,              // 13节点金字塔
  
  // 边界单元
  Line2D2N = 3,                   // 2节点线单元
  Line2D3N = 21,                  // 3节点线单元
  Triangle3D3N = 5,               // 3节点三角形面单元
  Triangle3D6N = 22,              // 6节点三角形面单元
  Quadrilateral3D4N = 9,          // 4节点四边形面单元
  Quadrilateral3D8N = 23,         // 8节点四边形面单元
}

// ======================== 网格质量评估标准 ========================

/**
 * 网格质量指标定义
 */
export interface MeshQualityMetrics {
  // 几何质量指标
  aspectRatio: {
    values: Float32Array;          // 每个单元的长宽比
    mean: number;                  // 平均值
    min: number;                   // 最小值
    max: number;                   // 最大值
    std: number;                   // 标准差
    acceptable_range: [number, number]; // 可接受范围 [1, 10]
    excellent_range: [number, number];  // 优秀范围 [1, 3]
    poor_elements: number[];       // 质量差的单元ID
  };
  
  skewness: {
    values: Float32Array;          // 偏斜度
    mean: number;
    min: number;
    max: number;
    std: number;
    acceptable_range: [number, number]; // [0, 0.85]
    excellent_range: [number, number];  // [0, 0.25]
    poor_elements: number[];
  };
  
  jacobian: {
    values: Float32Array;          // 雅可比行列式
    mean: number;
    min: number;                   // 必须 > 0
    max: number;
    std: number;
    acceptable_threshold: number;   // > 0.1
    excellent_threshold: number;    // > 0.5
    negative_elements: number[];    // 负雅可比单元ID
  };
  
  orthogonality: {
    values: Float32Array;          // 正交性
    mean: number;
    min: number;
    max: number;
    std: number;
    acceptable_range: [number, number]; // [0.15, 1.0]
    excellent_range: [number, number];  // [0.8, 1.0]
    poor_elements: number[];
  };
  
  // 拓扑质量指标
  edgeRatio: {
    values: Float32Array;          // 边长比
    mean: number;
    min: number;
    max: number;
    std: number;
    acceptable_range: [number, number]; // [0.1, 10]
    excellent_range: [number, number];  // [0.5, 2]
    poor_elements: number[];
  };
  
  volume: {
    values: Float32Array;          // 单元体积
    mean: number;
    min: number;                   // 必须 > 0
    max: number;
    std: number;
    total: number;                 // 总体积
    zero_volume_elements: number[]; // 零体积单元ID
  };
  
  // 整体质量评估
  overallQuality: {
    score: number;                 // 0-100综合评分
    grade: 'excellent' | 'good' | 'acceptable' | 'poor' | 'unacceptable';
    isKratosCompatible: boolean;   // 是否符合Kratos要求
    criticalIssues: string[];      // 关键问题列表
    recommendations: string[];     // 优化建议
  };
}

/**
 * 质量评估标准
 */
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
  
  // Kratos求解器最低要求
  kratosRequirements: {
    minimumJacobian: number;       // 最小雅可比值
    maximumAspectRatio: number;    // 最大长宽比
    maximumSkewness: number;       // 最大偏斜度
    minimumOrthogonality: number;  // 最小正交性
    minimumVolume: number;         // 最小单元体积
    allowedNegativeJacobian: number; // 允许的负雅可比单元数量
  };
}

// ======================== 数据转换器类 ========================

/**
 * 单元类型转换器
 */
export class KratosElementConverter {
  
  /**
   * 从通用网格格式转换到Kratos格式
   */
  static convertFromGenericMesh(
    vertices: Float32Array,
    cells: Uint32Array,
    cellTypes: Uint8Array
  ): KratosGeometryData {
    
    const nodes = {
      nodeIds: new Uint32Array(vertices.length / 3),
      coordinates: new Float64Array(vertices),
      nodeCount: vertices.length / 3
    };
    
    // 生成节点ID (从1开始，Kratos约定)
    for (let i = 0; i < nodes.nodeCount; i++) {
      nodes.nodeIds[i] = i + 1;
    }
    
    // 转换单元数据
    const elements = this.convertCellsToKratosElements(cells, cellTypes);
    
    // 初始化空的条件数据
    const conditions = {
      conditionIds: new Uint32Array(0),
      conditionTypes: [],
      conditionConnectivity: new Uint32Array(0),
      conditionCount: 0
    };
    
    return { nodes, elements, conditions };
  }
  
  /**
   * 转换单元连接性到Kratos格式
   */
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
  
  /**
   * VTK单元类型到Kratos单元类型映射
   */
  private static vtkToKratosElementType(vtkType: number): KratosElementType {
    const mapping: Record<number, KratosElementType> = {
      5: KratosElementType.Triangle2D3N,      // VTK_TRIANGLE
      9: KratosElementType.Quadrilateral2D4N, // VTK_QUAD
      10: KratosElementType.Tetrahedra3D4N,   // VTK_TETRA
      12: KratosElementType.Hexahedra3D8N,    // VTK_HEXAHEDRON
      13: KratosElementType.Prism3D6N,        // VTK_WEDGE
      14: KratosElementType.Pyramid3D5N,      // VTK_PYRAMID
      22: KratosElementType.Triangle2D6N,     // VTK_QUADRATIC_TRIANGLE
      23: KratosElementType.Quadrilateral2D8N, // VTK_QUADRATIC_QUAD
      24: KratosElementType.Tetrahedra3D10N,  // VTK_QUADRATIC_TETRA
      25: KratosElementType.Hexahedra3D20N,   // VTK_QUADRATIC_HEXAHEDRON
    };
    
    return mapping[vtkType] || KratosElementType.Tetrahedra3D4N;
  }
  
  /**
   * 获取单元节点数量
   */
  static getElementNodeCount(elementType: KratosElementType): number {
    const nodeCounts: Record<KratosElementType, number> = {
      [KratosElementType.Triangle2D3N]: 3,
      [KratosElementType.Triangle2D6N]: 6,
      [KratosElementType.Quadrilateral2D4N]: 4,
      [KratosElementType.Quadrilateral2D8N]: 8,
      [KratosElementType.Quadrilateral2D9N]: 9,
      [KratosElementType.Tetrahedra3D4N]: 4,
      [KratosElementType.Tetrahedra3D10N]: 10,
      [KratosElementType.Hexahedra3D8N]: 8,
      [KratosElementType.Hexahedra3D20N]: 20,
      [KratosElementType.Hexahedra3D27N]: 27,
      [KratosElementType.Prism3D6N]: 6,
      [KratosElementType.Prism3D15N]: 15,
      [KratosElementType.Pyramid3D5N]: 5,
      [KratosElementType.Pyramid3D13N]: 13,
      [KratosElementType.Line2D2N]: 2,
      [KratosElementType.Line2D3N]: 3,
      [KratosElementType.Triangle3D3N]: 3,
      [KratosElementType.Triangle3D6N]: 6,
      [KratosElementType.Quadrilateral3D4N]: 4,
      [KratosElementType.Quadrilateral3D8N]: 8,
    };
    
    return nodeCounts[elementType] || 4;
  }
}

// ======================== 网格质量计算器 ========================

/**
 * 网格质量计算器
 */
export class MeshQualityCalculator {
  
  /**
   * 计算完整质量指标
   */
  static calculateQualityMetrics(
    kratosGeometry: KratosGeometryData
  ): MeshQualityMetrics {
    
    const elementCount = kratosGeometry.elements.elementCount;
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
    
    // 识别问题单元
    const aspectRatioPoor = this.findPoorElements(aspectRatio, [1, 10]);
    const skewnessPoor = this.findPoorElements(skewness, [0, 0.85]);
    const jacobianNegative = this.findNegativeElements(jacobian);
    const orthogonalityPoor = this.findPoorElements(orthogonality, [0.15, 1.0]);
    const edgeRatioPoor = this.findPoorElements(edgeRatio, [0.1, 10]);
    const zeroVolumeElements = this.findZeroElements(volume);
    
    // 计算整体质量评估
    const overallQuality = this.calculateOverallQuality({
      aspectRatio: aspectRatio,
      skewness: skewness,
      jacobian: jacobian,
      orthogonality: orthogonality,
      problemElementCount: aspectRatioPoor.length + skewnessPoor.length + jacobianNegative.length
    });
    
    return {
      aspectRatio: {
        values: aspectRatio,
        mean: this.calculateMean(aspectRatio),
        min: this.calculateMin(aspectRatio),
        max: this.calculateMax(aspectRatio),
        std: this.calculateStd(aspectRatio),
        acceptable_range: [1, 10],
        excellent_range: [1, 3],
        poor_elements: aspectRatioPoor
      },
      
      skewness: {
        values: skewness,
        mean: this.calculateMean(skewness),
        min: this.calculateMin(skewness),
        max: this.calculateMax(skewness),
        std: this.calculateStd(skewness),
        acceptable_range: [0, 0.85],
        excellent_range: [0, 0.25],
        poor_elements: skewnessPoor
      },
      
      jacobian: {
        values: jacobian,
        mean: this.calculateMean(jacobian),
        min: this.calculateMin(jacobian),
        max: this.calculateMax(jacobian),
        std: this.calculateStd(jacobian),
        acceptable_threshold: 0.1,
        excellent_threshold: 0.5,
        negative_elements: jacobianNegative
      },
      
      orthogonality: {
        values: orthogonality,
        mean: this.calculateMean(orthogonality),
        min: this.calculateMin(orthogonality),
        max: this.calculateMax(orthogonality),
        std: this.calculateStd(orthogonality),
        acceptable_range: [0.15, 1.0],
        excellent_range: [0.8, 1.0],
        poor_elements: orthogonalityPoor
      },
      
      edgeRatio: {
        values: edgeRatio,
        mean: this.calculateMean(edgeRatio),
        min: this.calculateMin(edgeRatio),
        max: this.calculateMax(edgeRatio),
        std: this.calculateStd(edgeRatio),
        acceptable_range: [0.1, 10],
        excellent_range: [0.5, 2],
        poor_elements: edgeRatioPoor
      },
      
      volume: {
        values: volume,
        mean: this.calculateMean(volume),
        min: this.calculateMin(volume),
        max: this.calculateMax(volume),
        std: this.calculateStd(volume),
        total: volume.reduce((sum, v) => sum + v, 0),
        zero_volume_elements: zeroVolumeElements
      },
      
      overallQuality: overallQuality
    };
  }
  
  // ======================== 私有计算方法 ========================
  
  /**
   * 获取单元节点坐标
   */
  private static getElementNodeCoordinates(
    geometry: KratosGeometryData,
    connectivityOffset: number,
    numNodes: number
  ): Float64Array {
    
    const coords = new Float64Array(numNodes * 3);
    
    for (let i = 0; i < numNodes; i++) {
      const nodeId = geometry.elements.connectivity[connectivityOffset + i] - 1; // 转为0-based
      const coordOffset = nodeId * 3;
      
      coords[i * 3] = geometry.nodes.coordinates[coordOffset];
      coords[i * 3 + 1] = geometry.nodes.coordinates[coordOffset + 1];
      coords[i * 3 + 2] = geometry.nodes.coordinates[coordOffset + 2];
    }
    
    return coords;
  }
  
  /**
   * 计算长宽比
   */
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
  
  /**
   * 三角形长宽比计算
   */
  private static triangleAspectRatio(coords: Float64Array): number {
    // 计算三边长度
    const a = this.distance3D(coords, 0, 1);
    const b = this.distance3D(coords, 1, 2);
    const c = this.distance3D(coords, 2, 0);
    
    // 最长边/最短边
    const maxEdge = Math.max(a, b, c);
    const minEdge = Math.min(a, b, c);
    
    return maxEdge / minEdge;
  }
  
  /**
   * 四边形长宽比计算
   */
  private static quadAspectRatio(coords: Float64Array): number {
    // 计算四边长度
    const edges = [
      this.distance3D(coords, 0, 1),
      this.distance3D(coords, 1, 2),
      this.distance3D(coords, 2, 3),
      this.distance3D(coords, 3, 0)
    ];
    
    const maxEdge = Math.max(...edges);
    const minEdge = Math.min(...edges);
    
    return maxEdge / minEdge;
  }
  
  /**
   * 四面体长宽比计算
   */
  private static tetraAspectRatio(coords: Float64Array): number {
    // 计算所有6条边的长度
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
    
    return maxEdge / minEdge;
  }
  
  /**
   * 六面体长宽比计算
   */
  private static hexAspectRatio(coords: Float64Array): number {
    // 简化计算：计算主要边长
    const edgeX = this.distance3D(coords, 0, 1);
    const edgeY = this.distance3D(coords, 0, 3);
    const edgeZ = this.distance3D(coords, 0, 4);
    
    const maxEdge = Math.max(edgeX, edgeY, edgeZ);
    const minEdge = Math.min(edgeX, edgeY, edgeZ);
    
    return maxEdge / minEdge;
  }
  
  /**
   * 计算偏斜度
   */
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
  
  /**
   * 三角形偏斜度
   */
  private static triangleSkewness(coords: Float64Array): number {
    // 计算内角
    const angles = this.triangleAngles(coords);
    
    // 偏斜度 = max(|angle - 60°|) / 60°
    const idealAngle = Math.PI / 3; // 60度
    const maxDeviation = Math.max(
      ...angles.map(angle => Math.abs(angle - idealAngle))
    );
    
    return maxDeviation / idealAngle;
  }
  
  /**
   * 四边形偏斜度
   */
  private static quadSkewness(coords: Float64Array): number {
    // 计算内角
    const angles = this.quadAngles(coords);
    
    // 偏斜度 = max(|angle - 90°|) / 90°
    const idealAngle = Math.PI / 2; // 90度
    const maxDeviation = Math.max(
      ...angles.map(angle => Math.abs(angle - idealAngle))
    );
    
    return maxDeviation / idealAngle;
  }
  
  /**
   * 四面体偏斜度
   */
  private static tetraSkewness(coords: Float64Array): number {
    // 简化计算：使用体积与理想四面体的比值
    const volume = this.tetraVolume(coords);
    const edges = [
      this.distance3D(coords, 0, 1),
      this.distance3D(coords, 0, 2),
      this.distance3D(coords, 0, 3),
      this.distance3D(coords, 1, 2),
      this.distance3D(coords, 1, 3),
      this.distance3D(coords, 2, 3)
    ];
    
    const avgEdge = edges.reduce((sum, e) => sum + e, 0) / edges.length;
    const idealVolume = (Math.sqrt(2) / 12) * Math.pow(avgEdge, 3);
    
    return Math.abs(1 - volume / idealVolume);
  }
  
  /**
   * 计算雅可比行列式
   */
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
  
  /**
   * 三角形雅可比
   */
  private static triangleJacobian(coords: Float64Array): number {
    const x1 = coords[0], y1 = coords[1];
    const x2 = coords[3], y2 = coords[4];
    const x3 = coords[6], y3 = coords[7];
    
    // 雅可比行列式
    const jacobian = (x2 - x1) * (y3 - y1) - (x3 - x1) * (y2 - y1);
    
    // 归一化
    const area = Math.abs(jacobian) / 2;
    const avgEdge = (
      this.distance3D(coords, 0, 1) +
      this.distance3D(coords, 1, 2) +
      this.distance3D(coords, 2, 0)
    ) / 3;
    
    const idealArea = (Math.sqrt(3) / 4) * avgEdge * avgEdge;
    
    return area / idealArea;
  }
  
  /**
   * 四边形雅可比
   */
  private static quadJacobian(coords: Float64Array): number {
    // 简化计算：使用面积与理想正方形的比值
    const area = this.quadArea(coords);
    const avgEdge = (
      this.distance3D(coords, 0, 1) +
      this.distance3D(coords, 1, 2) +
      this.distance3D(coords, 2, 3) +
      this.distance3D(coords, 3, 0)
    ) / 4;
    
    const idealArea = avgEdge * avgEdge;
    
    return area / idealArea;
  }
  
  /**
   * 四面体雅可比
   */
  private static tetraJacobian(coords: Float64Array): number {
    const x1 = coords[0], y1 = coords[1], z1 = coords[2];
    const x2 = coords[3], y2 = coords[4], z2 = coords[5];
    const x3 = coords[6], y3 = coords[7], z3 = coords[8];
    const x4 = coords[9], y4 = coords[10], z4 = coords[11];
    
    // 计算雅可比矩阵的行列式
    const j11 = x2 - x1, j12 = y2 - y1, j13 = z2 - z1;
    const j21 = x3 - x1, j22 = y3 - y1, j23 = z3 - z1;
    const j31 = x4 - x1, j32 = y4 - y1, j33 = z4 - z1;
    
    const jacobian = j11 * (j22 * j33 - j23 * j32) -
                     j12 * (j21 * j33 - j23 * j31) +
                     j13 * (j21 * j32 - j22 * j31);
    
    // 归一化
    const volume = Math.abs(jacobian) / 6;
    const avgEdge = (
      this.distance3D(coords, 0, 1) +
      this.distance3D(coords, 0, 2) +
      this.distance3D(coords, 0, 3) +
      this.distance3D(coords, 1, 2) +
      this.distance3D(coords, 1, 3) +
      this.distance3D(coords, 2, 3)
    ) / 6;
    
    const idealVolume = (Math.sqrt(2) / 12) * Math.pow(avgEdge, 3);
    
    return volume / idealVolume;
  }
  
  /**
   * 计算正交性
   */
  private static calculateOrthogonality(
    nodeCoords: Float64Array,
    elementType: KratosElementType
  ): number {
    // 简化实现：返回默认值
    // 实际实现需要根据单元类型计算边的正交性
    return 0.8;
  }
  
  /**
   * 计算边长比
   */
  private static calculateEdgeRatio(
    nodeCoords: Float64Array,
    elementType: KratosElementType
  ): number {
    // 复用长宽比计算
    return this.calculateAspectRatio(nodeCoords, elementType);
  }
  
  /**
   * 计算单元体积
   */
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
  
  // ======================== 几何计算工具函数 ========================
  
  /**
   * 计算3D两点距离
   */
  private static distance3D(coords: Float64Array, i: number, j: number): number {
    const dx = coords[j * 3] - coords[i * 3];
    const dy = coords[j * 3 + 1] - coords[i * 3 + 1];
    const dz = coords[j * 3 + 2] - coords[i * 3 + 2];
    
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  
  /**
   * 计算三角形面积
   */
  private static triangleArea(coords: Float64Array): number {
    const x1 = coords[0], y1 = coords[1];
    const x2 = coords[3], y2 = coords[4];
    const x3 = coords[6], y3 = coords[7];
    
    return Math.abs((x2 - x1) * (y3 - y1) - (x3 - x1) * (y2 - y1)) / 2;
  }
  
  /**
   * 计算四边形面积
   */
  private static quadArea(coords: Float64Array): number {
    // 分解为两个三角形
    const tri1Area = this.triangleAreaFrom4Points(coords, [0, 1, 2]);
    const tri2Area = this.triangleAreaFrom4Points(coords, [0, 2, 3]);
    
    return tri1Area + tri2Area;
  }
  
  private static triangleAreaFrom4Points(coords: Float64Array, indices: number[]): number {
    const [i, j, k] = indices;
    const x1 = coords[i * 3], y1 = coords[i * 3 + 1];
    const x2 = coords[j * 3], y2 = coords[j * 3 + 1];
    const x3 = coords[k * 3], y3 = coords[k * 3 + 1];
    
    return Math.abs((x2 - x1) * (y3 - y1) - (x3 - x1) * (y2 - y1)) / 2;
  }
  
  /**
   * 计算四面体体积
   */
  private static tetraVolume(coords: Float64Array): number {
    const x1 = coords[0], y1 = coords[1], z1 = coords[2];
    const x2 = coords[3], y2 = coords[4], z2 = coords[5];
    const x3 = coords[6], y3 = coords[7], z3 = coords[8];
    const x4 = coords[9], y4 = coords[10], z4 = coords[11];
    
    const v1x = x2 - x1, v1y = y2 - y1, v1z = z2 - z1;
    const v2x = x3 - x1, v2y = y3 - y1, v2z = z3 - z1;
    const v3x = x4 - x1, v3y = y4 - y1, v3z = z4 - z1;
    
    const det = v1x * (v2y * v3z - v2z * v3y) -
                v1y * (v2x * v3z - v2z * v3x) +
                v1z * (v2x * v3y - v2y * v3x);
    
    return Math.abs(det) / 6;
  }
  
  /**
   * 计算六面体体积
   */
  private static hexVolume(coords: Float64Array): number {
    // 简化计算：分解为5个四面体
    // 实际实现需要更复杂的分解
    const avgEdgeX = this.distance3D(coords, 0, 1);
    const avgEdgeY = this.distance3D(coords, 0, 3);
    const avgEdgeZ = this.distance3D(coords, 0, 4);
    
    return avgEdgeX * avgEdgeY * avgEdgeZ;
  }
  
  /**
   * 计算三角形内角
   */
  private static triangleAngles(coords: Float64Array): number[] {
    const a = this.distance3D(coords, 1, 2);
    const b = this.distance3D(coords, 2, 0);
    const c = this.distance3D(coords, 0, 1);
    
    // 余弦定理计算角度
    const angleA = Math.acos((b * b + c * c - a * a) / (2 * b * c));
    const angleB = Math.acos((a * a + c * c - b * b) / (2 * a * c));
    const angleC = Math.PI - angleA - angleB;
    
    return [angleA, angleB, angleC];
  }
  
  /**
   * 计算四边形内角
   */
  private static quadAngles(coords: Float64Array): number[] {
    // 简化实现：返回近似角度
    return [Math.PI / 2, Math.PI / 2, Math.PI / 2, Math.PI / 2];
  }
  
  // ======================== 统计计算工具函数 ========================
  
  private static calculateMean(values: Float32Array): number {
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }
  
  private static calculateMin(values: Float32Array): number {
    return Math.min(...values);
  }
  
  private static calculateMax(values: Float32Array): number {
    return Math.max(...values);
  }
  
  private static calculateStd(values: Float32Array): number {
    const mean = this.calculateMean(values);
    const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
    return Math.sqrt(variance);
  }
  
  private static findPoorElements(
    values: Float32Array,
    acceptableRange: [number, number]
  ): number[] {
    const poorElements: number[] = [];
    
    for (let i = 0; i < values.length; i++) {
      if (values[i] < acceptableRange[0] || values[i] > acceptableRange[1]) {
        poorElements.push(i + 1); // 转为1-based ID
      }
    }
    
    return poorElements;
  }
  
  private static findNegativeElements(values: Float32Array): number[] {
    const negativeElements: number[] = [];
    
    for (let i = 0; i < values.length; i++) {
      if (values[i] <= 0) {
        negativeElements.push(i + 1); // 转为1-based ID
      }
    }
    
    return negativeElements;
  }
  
  private static findZeroElements(values: Float32Array): number[] {
    const zeroElements: number[] = [];
    
    for (let i = 0; i < values.length; i++) {
      if (Math.abs(values[i]) < 1e-12) {
        zeroElements.push(i + 1); // 转为1-based ID
      }
    }
    
    return zeroElements;
  }
  
  /**
   * 计算整体质量评估
   */
  private static calculateOverallQuality(metrics: {
    aspectRatio: Float32Array;
    skewness: Float32Array;
    jacobian: Float32Array;
    orthogonality: Float32Array;
    problemElementCount: number;
  }): MeshQualityMetrics['overallQuality'] {
    
    const totalElements = metrics.aspectRatio.length;
    const problemRatio = metrics.problemElementCount / totalElements;
    
    // 基础评分
    let score = 100;
    
    // 根据问题单元比例扣分
    if (problemRatio > 0.1) score -= 50;
    else if (problemRatio > 0.05) score -= 30;
    else if (problemRatio > 0.01) score -= 15;
    
    // 根据平均质量扣分
    const avgAspectRatio = this.calculateMean(metrics.aspectRatio);
    const avgSkewness = this.calculateMean(metrics.skewness);
    const minJacobian = this.calculateMin(metrics.jacobian);
    
    if (avgAspectRatio > 5) score -= 20;
    if (avgSkewness > 0.5) score -= 20;
    if (minJacobian < 0.2) score -= 20;
    
    // 确定等级
    let grade: 'excellent' | 'good' | 'acceptable' | 'poor' | 'unacceptable';
    if (score >= 90) grade = 'excellent';
    else if (score >= 75) grade = 'good';
    else if (score >= 60) grade = 'acceptable';
    else if (score >= 40) grade = 'poor';
    else grade = 'unacceptable';
    
    // Kratos兼容性检查
    const isKratosCompatible = minJacobian > 0.01 && 
                               this.calculateMax(metrics.aspectRatio) < 100 &&
                               this.calculateMax(metrics.skewness) < 0.95;
    
    // 生成关键问题列表
    const criticalIssues: string[] = [];
    if (minJacobian <= 0) criticalIssues.push('存在负雅可比单元');
    if (this.calculateMax(metrics.aspectRatio) > 100) criticalIssues.push('长宽比过大');
    if (this.calculateMax(metrics.skewness) > 0.95) criticalIssues.push('偏斜度过大');
    
    // 生成优化建议
    const recommendations: string[] = [];
    if (avgAspectRatio > 3) recommendations.push('建议细化高长宽比区域');
    if (avgSkewness > 0.3) recommendations.push('建议改善网格几何质量');
    if (minJacobian < 0.5) recommendations.push('建议检查单元拓扑结构');
    
    return {
      score: Math.max(0, score),
      grade,
      isKratosCompatible,
      criticalIssues,
      recommendations
    };
  }
}

// ======================== 主转换器类 ========================

/**
 * 网格到Kratos转换器
 */
export class MeshToKratosConverter {
  private qualityStandards: QualityStandards;
  
  constructor() {
    this.qualityStandards = this.getDefaultQualityStandards();
  }
  
  /**
   * 主转换接口 - 将网格数据转换为Kratos格式
   */
  async convertMeshForKratos(
    meshData: {
      vertices: Float32Array;
      cells: Uint32Array;
      cellTypes: Uint8Array;
    },
    materialData: KratosMaterialData[],
    boundaryConditions: KratosBoundaryCondition[]
  ): Promise<{
    kratosModel: KratosModelData;
    qualityReport: MeshQualityMetrics;
    isAcceptable: boolean;
    recommendations: string[];
  }> {
    
    console.log('🔄 开始网格到Kratos格式转换...');
    
    try {
      // 1. 转换几何数据
      const kratosGeometry = KratosElementConverter.convertFromGenericMesh(
        meshData.vertices,
        meshData.cells,
        meshData.cellTypes
      );
      
      console.log(`✅ 几何转换完成: ${kratosGeometry.nodes.nodeCount} 节点, ${kratosGeometry.elements.elementCount} 单元`);
      
      // 2. 计算质量指标
      const qualityMetrics = MeshQualityCalculator.calculateQualityMetrics(kratosGeometry);
      
      console.log(`📊 质量评估完成: 综合评分 ${qualityMetrics.overallQuality.score}`);
      
      // 3. 构建完整的Kratos模型
      const kratosModel: KratosModelData = {
        modelInfo: {
          modelName: 'DeepCAD_Excavation_Model',
          dimension: 3,
          problemType: 'coupled',
          analysisType: 'static',
          kratosVersion: '10.3'
        },
        
        geometry: kratosGeometry,
        materials: materialData,
        boundaryConditions: boundaryConditions,
        
        subdomains: this.createSubdomains(kratosGeometry, materialData),
        
        solverSettings: {
          solverType: 'mechanical_solver',
          convergenceCriteria: {
            residual_tolerance: 1e-6,
            displacement_tolerance: 1e-8,
            max_iterations: 100,
            echo_level: 1
          },
          linearSolver: {
            solver_type: 'skyline_lu_factorization',
            preconditioner: 'none',
            tolerance: 1e-9,
            max_iteration: 1000
          }
        },
        
        outputSettings: {
          outputControlType: 'step',
          outputFrequency: 1,
          outputVariables: [
            'DISPLACEMENT',
            'REACTION',
            'CAUCHY_STRESS_TENSOR',
            'GREEN_LAGRANGE_STRAIN_TENSOR',
            'WATER_PRESSURE'
          ],
          outputFormat: 'vtk'
        }
      };
      
      console.log('🎯 Kratos模型构建完成');
      
      return {
        kratosModel,
        qualityReport: qualityMetrics,
        isAcceptable: qualityMetrics.overallQuality.isKratosCompatible,
        recommendations: qualityMetrics.overallQuality.recommendations
      };
      
    } catch (error) {
      console.error('❌ 网格转换失败:', error);
      throw new Error(`网格转换失败: ${error.message}`);
    }
  }
  
  /**
   * 创建子域定义
   */
  private createSubdomains(
    geometry: KratosGeometryData,
    materials: KratosMaterialData[]
  ): KratosModelData['subdomains'] {
    
    const subdomains: KratosModelData['subdomains'] = [];
    
    // 为每种材料创建一个子域
    materials.forEach((material, index) => {
      // 简化实现：假设单元按材料顺序分组
      const elementsPerMaterial = Math.floor(geometry.elements.elementCount / materials.length);
      const startElement = index * elementsPerMaterial;
      const endElement = index === materials.length - 1 
        ? geometry.elements.elementCount 
        : (index + 1) * elementsPerMaterial;
      
      const elementIds: number[] = [];
      for (let i = startElement; i < endElement; i++) {
        elementIds.push(i + 1); // 1-based ID
      }
      
      subdomains.push({
        subdomainId: index + 1,
        subdomainName: material.materialName,
        materialId: material.materialId,
        elementIds: elementIds
      });
    });
    
    return subdomains;
  }
  
  /**
   * 获取默认质量标准
   */
  private getDefaultQualityStandards(): QualityStandards {
    return {
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
        allowedNegativeJacobian: 0
      }
    };
  }
}

// ======================== 导出接口 ========================

/**
 * Kratos数据导出器
 */
export class KratosDataExporter {
  
  /**
   * 导出Kratos模型为JSON格式
   */
  static exportToJSON(model: KratosModelData): string {
    return JSON.stringify(model, null, 2);
  }
  
  /**
   * 导出为Kratos MDpa格式
   */
  static exportToMDpa(model: KratosModelData): string {
    let mdpa = '';
    
    // 模型信息
    mdpa += `//Kratos model data file\n`;
    mdpa += `//Generated by DeepCAD 3号计算专家\n`;
    mdpa += `//Model: ${model.modelInfo.modelName}\n\n`;
    
    // 节点数据
    mdpa += `Begin Nodes\n`;
    for (let i = 0; i < model.geometry.nodes.nodeCount; i++) {
      const nodeId = model.geometry.nodes.nodeIds[i];
      const x = model.geometry.nodes.coordinates[i * 3];
      const y = model.geometry.nodes.coordinates[i * 3 + 1];
      const z = model.geometry.nodes.coordinates[i * 3 + 2];
      mdpa += `${nodeId} ${x.toFixed(6)} ${y.toFixed(6)} ${z.toFixed(6)}\n`;
    }
    mdpa += `End Nodes\n\n`;
    
    // 单元数据
    mdpa += `Begin Elements ${this.getKratosElementName(model.geometry.elements.elementTypes[0])}\n`;
    let connectivityOffset = 0;
    for (let i = 0; i < model.geometry.elements.elementCount; i++) {
      const elementId = model.geometry.elements.elementIds[i];
      const elementType = model.geometry.elements.elementTypes[i];
      const numNodes = KratosElementConverter.getElementNodeCount(elementType);
      
      let line = `${elementId} 1`; // 默认属性ID为1
      for (let j = 0; j < numNodes; j++) {
        line += ` ${model.geometry.elements.connectivity[connectivityOffset + j]}`;
      }
      mdpa += line + '\n';
      
      connectivityOffset += numNodes;
    }
    mdpa += `End Elements\n\n`;
    
    // 材料属性
    model.materials.forEach(material => {
      mdpa += `Begin Properties ${material.materialId}\n`;
      Object.entries(material.properties).forEach(([key, value]) => {
        if (typeof value === 'number') {
          mdpa += `${key.toUpperCase()} ${value}\n`;
        } else if (typeof value === 'string') {
          mdpa += `${key.toUpperCase()} "${value}"\n`;
        }
      });
      mdpa += `End Properties\n\n`;
    });
    
    return mdpa;
  }
  
  private static getKratosElementName(elementType: KratosElementType): string {
    const elementNames: Record<KratosElementType, string> = {
      [KratosElementType.Triangle2D3N]: 'TotalLagrangianElement2D3N',
      [KratosElementType.Triangle2D6N]: 'TotalLagrangianElement2D6N',
      [KratosElementType.Quadrilateral2D4N]: 'TotalLagrangianElement2D4N',
      [KratosElementType.Quadrilateral2D8N]: 'TotalLagrangianElement2D8N',
      [KratosElementType.Quadrilateral2D9N]: 'TotalLagrangianElement2D9N',
      [KratosElementType.Tetrahedra3D4N]: 'TotalLagrangianElement3D4N',
      [KratosElementType.Tetrahedra3D10N]: 'TotalLagrangianElement3D10N',
      [KratosElementType.Hexahedra3D8N]: 'TotalLagrangianElement3D8N',
      [KratosElementType.Hexahedra3D20N]: 'TotalLagrangianElement3D20N',
      [KratosElementType.Hexahedra3D27N]: 'TotalLagrangianElement3D27N',
      [KratosElementType.Prism3D6N]: 'TotalLagrangianElement3D6N',
      [KratosElementType.Prism3D15N]: 'TotalLagrangianElement3D15N',
      [KratosElementType.Pyramid3D5N]: 'TotalLagrangianElement3D5N',
      [KratosElementType.Pyramid3D13N]: 'TotalLagrangianElement3D13N',
      [KratosElementType.Line2D2N]: 'LineCondition2D2N',
      [KratosElementType.Line2D3N]: 'LineCondition2D3N',
      [KratosElementType.Triangle3D3N]: 'SurfaceCondition3D3N',
      [KratosElementType.Triangle3D6N]: 'SurfaceCondition3D6N',
      [KratosElementType.Quadrilateral3D4N]: 'SurfaceCondition3D4N',
      [KratosElementType.Quadrilateral3D8N]: 'SurfaceCondition3D8N',
    };
    
    return elementNames[elementType] || 'TotalLagrangianElement3D4N';
  }
}

// ======================== 默认导出 ========================

export default {
  KratosElementConverter,
  MeshQualityCalculator,
  MeshToKratosConverter,
  KratosDataExporter
};