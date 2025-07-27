# 3号网格计算模块 - 完整参数规格表
## 📋 所有功能的详细参数配置

---

## 🔧 **网格生成模块参数**

### **基础网格配置**
```typescript
interface MeshGenerationParameters {
  // 几何边界
  boundingBoxMin: [number, number, number];     // 最小边界坐标 [x, y, z]
  boundingBoxMax: [number, number, number];     // 最大边界坐标 [x, y, z]
  
  // 网格尺寸控制
  elementSize: number;                          // 2.0-8.0m (基础网格尺寸)
  meshSizeMin: number;                          // elementSize / 2 (最小网格尺寸)
  meshSizeMax: number;                          // elementSize (最大网格尺寸)
  
  // 网格算法选择
  algorithm2D: number;                          // 1=MeshAdapt, 6=Frontal-Delaunay
  algorithm3D: number;                          // 1=Delaunay, 4=Frontal
  
  // 质量控制
  qualityTarget: number;                        // 0.7 (固定工程标准)
  refinementLevels: number;                     // 3 (角落+接触面+过渡区)
  
  // 规模限制 (1号架构师要求)
  maxNodes: number;                             // 800,000 节点
  maxElements: number;                          // 2,000,000 单元
  memoryLimit: number;                          // 8192 MB (8GB)
}
```

### **Fragment切割参数**
```typescript
interface FragmentParameters {
  // Fragment开关
  enableFragment: boolean;                      // true/false
  
  // 几何容差 (优化重叠问题)
  geometryTolerance: number;                    // 1e-10
  booleanTolerance: number;                     // 1e-10
  
  // Fragment体积定义
  domainFragments: Array<{
    id: string;                                 // Fragment ID
    name: string;                               // 显示名称
    fragmentType: 'excavation' | 'structure';  // 类型
    geometry: {
      type: 'box' | 'cylinder';                // 几何类型
      parameters: {
        // Box参数
        x?: number, y?: number, z?: number;     // 位置
        width?: number, length?: number, depth?: number; // 尺寸
        // Cylinder参数  
        centerX?: number, centerY?: number, centerZ?: number; // 中心
        radius?: number, height?: number;      // 半径和高度
      }
    };
    meshProperties: {
      elementSize: number;                      // 0.3-2.0m
      priority: 'high' | 'medium' | 'low';    // 细化优先级
    }
  }>;
  
  // 物理群组生成
  autoCreatePhysicalGroups: boolean;           // true (自动创建)
  physicalGroupPrefix: string;                 // "soil_domain_", "structure_"
}
```

### **网格质量分析参数**
```typescript
interface QualityAnalysisParameters {
  // 质量指标 (简化为3项核心指标)
  enableQualityAnalysis: boolean;              // true
  qualityMetrics: {
    overallScore: {                            // 总体质量评分
      range: [0, 100];                        // 0-100分
      threshold: 70;                          // 及格线
    };
    elementCount: {                           // 单元数量
      max: 2000000;                          // 最大200万
      warning: 1500000;                      // 150万警告
    };
    problemElements: {                        // 问题单元
      maxRatio: 0.05;                        // 最多5%问题单元
      criticalRatio: 0.01;                   // 1%严重问题
    };
  };
  
  // 自动优化
  autoOptimization: {
    enabled: boolean;                          // true
    maxIterations: number;                     // 3次优化迭代
    qualityThreshold: number;                  // 0.7 优化阈值
  };
}
```

---

## ⚙️ **Terra计算引擎参数**

### **分析类型配置 (1号架构师要求8种)**
```typescript
enum TerraAnalysisTypes {
  EXCAVATION = "excavation",                   // 分阶段开挖分析
  SEEPAGE = "seepage",                        // 渗流分析
  COUPLED = "coupled",                        // 渗流-变形耦合
  SUPPORT_DESIGN = "support_design",          // 支护结构设计
  SLOPE_STABILITY = "slope_stability",        // 边坡稳定性分析
  THERMAL = "thermal",                        // 温度场分析
  DYNAMIC = "dynamic",                        // 动力响应分析
  MULTIPHYSICS = "multiphysics"              // 多物理场耦合
}

interface AnalysisTypeParameters {
  [TerraAnalysisTypes.EXCAVATION]: {
    maxStages: 5;                             // 最多5个开挖阶段
    stageTimeStep: 1.0;                       // 天
    supportActivation: boolean;               // 支护激活
  };
  
  [TerraAnalysisTypes.SEEPAGE]: {
    hydraulicConductivity: [1e-10, 1e-3];    // m/s 渗透系数范围
    boundaryConditions: 'pressure' | 'flow'; // 边界条件类型
    steadyState: boolean;                     // 稳态/瞬态
  };
  
  [TerraAnalysisTypes.COUPLED]: {
    couplingStrength: [0.1, 1.0];           // 耦合强度
    fluidSolidRatio: number;                 // 流固比
    iterationTolerance: 1e-6;                // 耦合收敛容差
  };
  
  [TerraAnalysisTypes.SUPPORT_DESIGN]: {
    supportTypes: ['diaphragm_wall', 'anchor', 'strut']; // 支护类型
    designSafetyFactor: 2.0;                 // 设计安全系数
    loadCombinations: string[];              // 荷载组合
  };
  
  [TerraAnalysisTypes.SLOPE_STABILITY]: {
    analysisMethod: 'limit_equilibrium' | 'strength_reduction'; // 分析方法
    safetyFactorTarget: 1.3;                 // 目标安全系数
    criticalSurface: 'circular' | 'general'; // 滑动面类型
  };
  
  [TerraAnalysisTypes.THERMAL]: {
    temperatureRange: [-20, 60];             // °C 温度范围
    thermalConductivity: [0.5, 3.0];        // W/m·K 导热系数
    heatSource: boolean;                     // 是否有热源
  };
  
  [TerraAnalysisTypes.DYNAMIC]: {
    frequencyRange: [0.1, 50];              // Hz 频率范围
    dampingRatio: [0.02, 0.1];              // 阻尼比
    seismicAcceleration: [0.1, 0.4];        // g 地震加速度
  };
  
  [TerraAnalysisTypes.MULTIPHYSICS]: {
    coupledFields: string[];                 // 耦合物理场
    solverSequence: 'sequential' | 'simultaneous'; // 求解顺序
    convergenceCriteria: number;             // 收敛标准
  };
}
```

### **求解器配置参数**
```typescript
interface TerraSolverParameters {
  // 基础求解参数
  maxIterations: number;                      // 200 (1号要求提升)
  convergenceTolerance: number;               // 1e-6
  timeStep: number;                          // 1.0 (天)
  endTime: number;                           // 分析总时长
  
  // 线性求解器
  linearSolver: {
    type: 'sparse_lu' | 'iterative_cg' | 'mumps'; // 求解器类型
    preconditioner: 'ilu' | 'amg' | 'jacobi';    // 预条件子
    tolerance: 1e-9;                              // 线性求解容差
    maxLinearIterations: 1000;                    // 最大线性迭代
  };
  
  // 非线性求解器
  nonlinearSolver: {
    method: 'newton_raphson' | 'modified_newton'; // 非线性方法
    lineSearchEnabled: boolean;                   // 线搜索
    energyRatio: 1e-6;                           // 能量比收敛
    displacementRatio: 1e-8;                     // 位移比收敛
  };
  
  // 内存和性能 (1号架构师要求8GB)
  memoryLimit: 8192;                            // MB
  maxNodes: 800000;                             // 最大节点数
  maxElements: 2000000;                        // 最大单元数
  
  // 并行计算 (专业工作站配置)
  parallelization: {
    enabled: boolean;                           // true
    numThreads: 8;                             // 8线程
    enableGPU: boolean;                        // GPU加速
    memoryPerThread: 1024;                     // MB per thread
  };
  
  // 输出控制
  outputSettings: {
    outputFrequency: number;                    // 1 (每阶段)
    outputFields: string[];                     // ['displacement', 'stress', 'water_pressure']
    generateVisualization: boolean;             // true
    exportFormat: 'vtk' | 'hdf5' | 'both';    // 导出格式
  };
}
```

---

## 🏗️ **材料参数定义**

### **土体材料参数**
```typescript
interface SoilMaterialParameters {
  // 基本参数
  materialId: string;                         // 材料ID
  materialName: string;                       // 材料名称
  materialType: 'clay' | 'sand' | 'rock';   // 土体类型
  
  // 物理参数
  density: number;                           // 1600-2400 kg/m³
  porosity: number;                          // 0.2-0.6
  saturationDegree: number;                  // 0.0-1.0
  
  // 力学参数
  elasticModulus: number;                    // 5-500 MPa
  poissonRatio: number;                      // 0.15-0.45
  cohesion: number;                          // 0-100 kPa
  frictionAngle: number;                     // 15-45 度
  
  // 水力参数
  permeability: number;                      // 1e-10 to 1e-4 m/s
  hydraulicConductivity: number;             // 等于渗透系数
  
  // 高级参数 (可选)
  compressionIndex?: number;                 // 压缩指数
  swellingIndex?: number;                    // 回弹指数
  preconsolidationPressure?: number;         // 预固结压力 kPa
  
  // 本构模型参数
  constitutiveModel: {
    type: 'elastic' | 'mohr_coulomb' | 'cam_clay'; // 本构模型
    parameters: Record<string, number>;            // 模型参数
  };
}
```

### **结构材料参数**
```typescript
interface StructureMaterialParameters {
  // 基本信息
  materialId: string;
  materialName: string;
  materialType: 'concrete' | 'steel' | 'composite'; // 结构类型
  
  // 力学参数
  elasticModulus: number;                    // 20-200 GPa
  poissonRatio: number;                      // 0.2-0.3
  density: number;                           // 2400-7800 kg/m³
  
  // 强度参数
  compressiveStrength: number;               // MPa
  tensileStrength: number;                   // MPa
  yieldStrength: number;                     // MPa (钢材)
  
  // 混凝土专用参数
  concreteGrade?: string;                    // C25, C30, C35等
  cementType?: string;                       // 水泥类型
  aggregateSize?: number;                    // mm 骨料粒径
  
  // 钢材专用参数
  steelGrade?: string;                       // Q235, Q345等
  yieldRatio?: number;                       // 屈强比
  elongation?: number;                       // 延伸率 %
}
```

---

## 🔗 **数据接口参数**

### **几何输入接口 (与2号对接)**
```typescript
interface GeometryInputParameters {
  // 几何数据
  geometryId: string;                        // 几何ID
  vertices: Float32Array;                    // 顶点坐标数组
  faces: Uint32Array;                       // 面连接数组
  normals: Float32Array;                    // 法向量数组
  
  // 材料分区
  materialZones: Array<{
    zoneId: string;                         // 分区ID
    materialType: string;                   // 材料类型
    elementIndices: number[];               // 单元索引
    properties: SoilMaterialParameters;    // 材料参数
  }>;
  
  // 边界条件
  boundaryConditions: Array<{
    bcId: string;                          // 边界条件ID
    type: 'displacement' | 'force' | 'pressure'; // BC类型
    faceIds: number[];                     // 应用面ID
    values: number[];                      // BC数值
    constrainedDOF: boolean[];             // 约束自由度
  }>;
  
  // 荷载定义
  loads: Array<{
    loadId: string;                        // 荷载ID
    type: 'point' | 'distributed' | 'body'; // 荷载类型
    geometry: any;                         // 荷载几何
    magnitude: number;                     // 荷载大小
    direction: [number, number, number];   // 荷载方向
    applicationTime: number;               // 施加时间
  }>;
  
  // 网格建议 (2号提供，3号验证)
  meshGuidance?: {
    suggestedElementSize: number;          // 建议网格尺寸
    refinementZones?: Array<{
      region: 'corner' | 'contact' | 'critical'; // 区域类型
      targetSize: number;                  // 目标尺寸
      priority: 'high' | 'medium' | 'low'; // 优先级
    }>;
  };
}
```

### **结果输出接口**
```typescript
interface ComputationOutputParameters {
  // 基本信息
  analysisId: string;                       // 分析ID
  timestamp: string;                        // 时间戳
  status: 'completed' | 'failed' | 'partial'; // 状态
  
  // 网格信息
  meshInfo: {
    nodeCount: number;                      // 节点数
    elementCount: number;                   // 单元数
    qualityScore: number;                   // 质量评分 0-100
    meshFiles: string[];                    // 网格文件路径
  };
  
  // 计算结果
  results: {
    displacements: {
      maxValue: number;                     // 最大位移 m
      location: [number, number, number];   // 位置坐标
      dataFile: string;                     // 数据文件
    };
    stresses: {
      maxValue: number;                     // 最大应力 Pa
      location: [number, number, number];   // 位置坐标
      dataFile: string;                     // 数据文件
    };
    strains: {
      maxValue: number;                     // 最大应变
      location: [number, number, number];   // 位置坐标
      dataFile: string;                     // 数据文件
    };
    waterPressure?: {                       // 水压力 (渗流分析)
      maxValue: number;                     // 最大水压 Pa
      location: [number, number, number];   // 位置坐标
      dataFile: string;                     // 数据文件
    };
  };
  
  // 可视化文件
  visualizationFiles: {
    vtkFiles: string[];                     // VTK格式
    gltfFiles: string[];                    // GLTF格式 (给2号)
    imageFiles: string[];                   // 截图文件
  };
  
  // 分析统计
  statistics: {
    totalComputeTime: number;               // 总计算时间 秒
    memoryUsage: number;                    // 内存使用 MB
    iterations: number;                     // 迭代次数
    convergenceAchieved: boolean;           // 是否收敛
  };
  
  // 质量反馈 (给2号的建议)
  qualityFeedback: {
    geometryQuality: 'good' | 'acceptable' | 'poor'; // 几何质量
    meshQuality: 'good' | 'acceptable' | 'poor';     // 网格质量
    suggestions: string[];                            // 改进建议
    optimizationRequired: boolean;                    // 是否需要优化
  };
}
```

---

## 📊 **性能监控参数**

### **实时性能指标**
```typescript
interface PerformanceMetrics {
  // 系统资源
  systemResources: {
    cpuUsage: number;                       // CPU使用率 %
    memoryUsage: number;                    // 内存使用 MB
    diskUsage: number;                      // 磁盘使用 MB
    gpuUsage?: number;                      // GPU使用率 % (如果启用)
  };
  
  // 网格生成性能
  meshGeneration: {
    generationTime: number;                 // 生成时间 秒
    nodesPerSecond: number;                 // 节点生成速率
    elementsPerSecond: number;              // 单元生成速率
    qualityCheckTime: number;               // 质量检查时间
  };
  
  // 计算求解性能
  computation: {
    solverTime: number;                     // 求解时间 秒
    iterationTime: number;                  // 单次迭代时间 秒
    convergenceRate: number;                // 收敛速率
    linearSolverTime: number;               // 线性求解时间
  };
  
  // 数据传输性能
  dataTransfer: {
    inputDataSize: number;                  // 输入数据大小 MB
    outputDataSize: number;                 // 输出数据大小 MB
    transferTime: number;                   // 传输时间 秒
    compressionRatio: number;               // 压缩比
  };
  
  // 内存分析
  memoryProfile: {
    peakMemoryUsage: number;                // 峰值内存 MB
    memoryLeaks: boolean;                   // 是否有内存泄漏
    garbageCollectionTime: number;          // GC时间 秒
    memoryFragmentation: number;            // 内存碎片化 %
  };
}
```

---

## 🎯 **配置预设方案**

### **快速原型配置**
```typescript
const FAST_PROTOTYPE_CONFIG = {
  elementSize: 4.0,                         // 大网格
  maxElements: 100000,                      // 10万单元
  qualityTarget: 0.6,                       // 较低质量要求
  enableFragment: false,                    // 关闭Fragment
  analysisType: 'EXCAVATION',               // 基础开挖
  maxIterations: 50,                        // 少迭代
  memoryLimit: 2048,                        // 2GB内存
};
```

### **工程分析配置**
```typescript
const ENGINEERING_CONFIG = {
  elementSize: 2.0,                         // 中等网格
  maxElements: 800000,                      // 80万单元
  qualityTarget: 0.7,                       // 工程质量
  enableFragment: true,                     // 启用Fragment
  analysisType: 'COUPLED',                  // 耦合分析
  maxIterations: 100,                       // 标准迭代
  memoryLimit: 4096,                        // 4GB内存
};
```

### **高精度配置**
```typescript
const HIGH_PRECISION_CONFIG = {
  elementSize: 1.0,                         // 精细网格
  maxElements: 2000000,                     // 200万单元
  qualityTarget: 0.8,                       // 高质量要求
  enableFragment: true,                     // 启用Fragment
  analysisType: 'MULTIPHYSICS',            // 多物理场
  maxIterations: 200,                       // 多迭代
  memoryLimit: 8192,                        // 8GB内存
};
```

---

## 📋 **参数验证规则**

### **数值范围验证**
```typescript
const PARAMETER_VALIDATION = {
  elementSize: { min: 0.1, max: 10.0, unit: 'm' },
  maxElements: { min: 1000, max: 2000000, unit: 'count' },
  memoryLimit: { min: 1024, max: 16384, unit: 'MB' },
  qualityTarget: { min: 0.3, max: 1.0, unit: 'ratio' },
  convergenceTolerance: { min: 1e-10, max: 1e-3, unit: 'ratio' },
  timeStep: { min: 0.01, max: 10.0, unit: 'day' },
  density: { min: 1000, max: 3000, unit: 'kg/m³' },
  elasticModulus: { min: 1, max: 1000, unit: 'MPa' },
  poissonRatio: { min: 0.1, max: 0.49, unit: 'ratio' },
  permeability: { min: 1e-12, max: 1e-2, unit: 'm/s' },
};
```

---

这就是3号网格计算模块的完整参数规格表！包含所有功能的详细配置参数，符合1号架构师的专业要求和2号几何专家的对接需求。