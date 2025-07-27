/**
 * 为3号计算专家准备的标准几何测试用例
 * 基于200万单元验证标准，支持Fragment可视化和质量分析
 */

export interface GeometryTestCase {
  id: string;
  name: string;
  description: string;
  complexity: 'simple' | 'medium' | 'complex';
  estimatedElements: number;
  vertices: Float32Array;
  faces: Uint32Array;
  materialZones: Array<{
    zoneId: string;
    materialType: string;
    vertices: Float32Array;
    expectedQuality: number;
    targetMeshSize: number;
  }>;
  criticalRegions: Array<{
    type: 'corner' | 'contact_surface' | 'material_boundary';
    points: Array<{x: number, y: number, z: number}>;
    expectedIssues: string[];
    optimizationTarget: number;
  }>;
  expectedResults: {
    overallQuality: number;
    processingTime: number; // ms
    memoryUsage: number; // MB
    fragmentCount: number;
  };
}

/**
 * 测试用例1: 简单矩形基坑 - 为3号Fragment基础验证
 */
export const SimpleRectangularPit: GeometryTestCase = {
  id: 'test_case_001',
  name: '简单矩形基坑',
  description: '30m×20m×15m矩形基坑，3种土层，无隧道',
  complexity: 'simple',
  estimatedElements: 500000,
  
  vertices: new Float32Array([
    // 基坑边界顶点 (简化示例)
    -15, -10, 0,   15, -10, 0,   15, 10, 0,   -15, 10, 0,  // 地面
    -15, -10, -15, 15, -10, -15, 15, 10, -15, -15, 10, -15 // 底部
  ]),
  
  faces: new Uint32Array([
    // 基坑面索引 (简化示例)
    0, 1, 4,  1, 5, 4,  // 南侧面
    1, 2, 5,  2, 6, 5,  // 东侧面
    2, 3, 6,  3, 7, 6,  // 北侧面
    3, 0, 7,  0, 4, 7,  // 西侧面
    4, 5, 7,  5, 6, 7   // 底面
  ]),
  
  materialZones: [
    {
      zoneId: 'clay_layer_1',
      materialType: '粘土',
      vertices: new Float32Array([/* 粘土层顶点 */]),
      expectedQuality: 0.75,
      targetMeshSize: 2.0
    },
    {
      zoneId: 'sand_layer_2', 
      materialType: '砂土',
      vertices: new Float32Array([/* 砂土层顶点 */]),
      expectedQuality: 0.68,
      targetMeshSize: 1.8
    },
    {
      zoneId: 'rock_layer_3',
      materialType: '岩石',
      vertices: new Float32Array([/* 岩石层顶点 */]),
      expectedQuality: 0.72,
      targetMeshSize: 2.0
    }
  ],
  
  criticalRegions: [
    {
      type: 'corner',
      points: [
        {x: -15, y: -10, z: 0}, {x: 15, y: -10, z: 0},
        {x: 15, y: 10, z: 0}, {x: -15, y: 10, z: 0}
      ],
      expectedIssues: ['尖锐角度', '应力集中'],
      optimizationTarget: 0.70
    }
  ],
  
  expectedResults: {
    overallQuality: 0.68, // 3号验证的基准
    processingTime: 800,   // <1秒目标
    memoryUsage: 2048,     // 2GB以内
    fragmentCount: 5       // 3号的Fragment分组数
  }
};

/**
 * 测试用例2: 复杂不规则基坑 - 挑战3号的200万单元上限
 */
export const ComplexIrregularPit: GeometryTestCase = {
  id: 'test_case_002',
  name: '复杂不规则基坑',
  description: '基于DXF导入的不规则基坑，5种土层，多层支护',
  complexity: 'complex',
  estimatedElements: 1800000, // 接近3号的200万上限
  
  vertices: new Float32Array([/* 复杂不规则边界顶点 */]),
  faces: new Uint32Array([/* 复杂面索引 */]),
  
  materialZones: [
    {
      zoneId: 'fill_soil',
      materialType: '回填土',
      vertices: new Float32Array([]),
      expectedQuality: 0.65,
      targetMeshSize: 1.5
    },
    {
      zoneId: 'clay_soft',
      materialType: '软粘土',
      vertices: new Float32Array([]),
      expectedQuality: 0.62,
      targetMeshSize: 1.5 // 需要细化
    },
    {
      zoneId: 'sand_medium',
      materialType: '中砂',
      vertices: new Float32Array([]),
      expectedQuality: 0.70,
      targetMeshSize: 1.8
    },
    {
      zoneId: 'silt_layer',
      materialType: '淤泥',
      vertices: new Float32Array([]),
      expectedQuality: 0.60,
      targetMeshSize: 1.4 // 最需要细化
    },
    {
      zoneId: 'bedrock',
      materialType: '基岩',
      vertices: new Float32Array([]),
      expectedQuality: 0.75,
      targetMeshSize: 2.0
    }
  ],
  
  criticalRegions: [
    {
      type: 'corner',
      points: [/* 多个不规则角点 */],
      expectedIssues: ['几何不连续', '网格扭曲', 'Fragment切割困难'],
      optimizationTarget: 0.65
    },
    {
      type: 'contact_surface',
      points: [/* 支护接触面 */],
      expectedIssues: ['接触面不平滑', '应力传递不当'],
      optimizationTarget: 0.68
    },
    {
      type: 'material_boundary',
      points: [/* 材料分界面 */],
      expectedIssues: ['材料属性跳跃', '连续性差'],
      optimizationTarget: 0.66
    }
  ],
  
  expectedResults: {
    overallQuality: 0.64, // 挑战目标，略低于标准但可接受
    processingTime: 1800,  // 允许更长处理时间
    memoryUsage: 7680,     // 接近8GB限制
    fragmentCount: 8       // 更多Fragment分组
  }
};

/**
 * 测试用例3: 多材料基坑 - 验证3号的材料分区处理
 */
export const MultiMaterialPit: GeometryTestCase = {
  id: 'test_case_003',
  name: '多材料基坑',
  description: '包含7种不同土层的基坑，测试材料连续性',
  complexity: 'medium',
  estimatedElements: 1200000,
  
  vertices: new Float32Array([/* 多材料区域顶点 */]),
  faces: new Uint32Array([/* 多材料面索引 */]),
  
  materialZones: [
    {zoneId: 'zone_1', materialType: '回填土', vertices: new Float32Array([]), expectedQuality: 0.70, targetMeshSize: 1.8},
    {zoneId: 'zone_2', materialType: '粘土', vertices: new Float32Array([]), expectedQuality: 0.72, targetMeshSize: 1.9},
    {zoneId: 'zone_3', materialType: '砂土', vertices: new Float32Array([]), expectedQuality: 0.68, targetMeshSize: 1.7},
    {zoneId: 'zone_4', materialType: '淤泥', vertices: new Float32Array([]), expectedQuality: 0.63, targetMeshSize: 1.5},
    {zoneId: 'zone_5', materialType: '砾石', vertices: new Float32Array([]), expectedQuality: 0.74, targetMeshSize: 2.0},
    {zoneId: 'zone_6', materialType: '风化岩', vertices: new Float32Array([]), expectedQuality: 0.76, targetMeshSize: 2.0},
    {zoneId: 'zone_7', materialType: '基岩', vertices: new Float32Array([]), expectedQuality: 0.78, targetMeshSize: 2.0}
  ],
  
  criticalRegions: [
    {
      type: 'material_boundary',
      points: [/* 所有材料分界面 */],
      expectedIssues: ['材料属性不连续', '网格质量差异大'],
      optimizationTarget: 0.67
    }
  ],
  
  expectedResults: {
    overallQuality: 0.67,
    processingTime: 1200,
    memoryUsage: 4500,
    fragmentCount: 7 // 每种材料一个Fragment
  }
};

/**
 * 测试用例4: 含隧道基坑 - 最复杂的布尔运算测试
 */
export const PitWithTunnel: GeometryTestCase = {
  id: 'test_case_004',
  name: '含隧道基坑',
  description: 'L型基坑 + 倾斜隧道穿越，测试复杂布尔运算',
  complexity: 'complex',
  estimatedElements: 1600000,
  
  vertices: new Float32Array([/* 基坑+隧道组合顶点 */]),
  faces: new Uint32Array([/* 布尔运算后面索引 */]),
  
  materialZones: [
    {
      zoneId: 'pit_zone',
      materialType: '开挖区域',
      vertices: new Float32Array([]),
      expectedQuality: 0.66,
      targetMeshSize: 1.8
    },
    {
      zoneId: 'tunnel_zone',
      materialType: '隧道区域',
      vertices: new Float32Array([]),
      expectedQuality: 0.64,
      targetMeshSize: 1.6
    },
    {
      zoneId: 'intersection_zone',
      materialType: '交叉区域',
      vertices: new Float32Array([]),
      expectedQuality: 0.60, // 最困难的区域
      targetMeshSize: 1.4
    }
  ],
  
  criticalRegions: [
    {
      type: 'corner',
      points: [/* L型基坑角点 */],
      expectedIssues: ['L型角点应力集中'],
      optimizationTarget: 0.62
    },
    {
      type: 'contact_surface',
      points: [/* 隧道-基坑交叉面 */],
      expectedIssues: ['复杂交叉几何', '布尔运算困难', 'Fragment切割复杂'],
      optimizationTarget: 0.58
    }
  ],
  
  expectedResults: {
    overallQuality: 0.62, // 最具挑战性，但仍在可接受范围
    processingTime: 2000,  // 允许最长处理时间
    memoryUsage: 6800,     
    fragmentCount: 6
  }
};

/**
 * 所有测试用例集合
 */
export const GeometryTestCases: GeometryTestCase[] = [
  SimpleRectangularPit,
  ComplexIrregularPit,
  MultiMaterialPit,
  PitWithTunnel
];

/**
 * 为3号提供的快速测试函数
 */
export const getTestCaseById = (id: string): GeometryTestCase | undefined => {
  return GeometryTestCases.find(testCase => testCase.id === id);
};

export const getTestCasesByComplexity = (complexity: 'simple' | 'medium' | 'complex'): GeometryTestCase[] => {
  return GeometryTestCases.filter(testCase => testCase.complexity === complexity);
};

/**
 * 生成测试报告格式 - 供3号验证使用
 */
export const generateTestReport = (testCase: GeometryTestCase, actualResults: any) => {
  return {
    testCaseId: testCase.id,
    testCaseName: testCase.name,
    timestamp: new Date().toISOString(),
    expected: testCase.expectedResults,
    actual: actualResults,
    passed: {
      quality: actualResults.overallQuality >= (testCase.expectedResults.overallQuality - 0.05),
      performance: actualResults.processingTime <= testCase.expectedResults.processingTime * 1.2,
      memory: actualResults.memoryUsage <= testCase.expectedResults.memoryUsage * 1.1
    },
    recommendations: [
      '基于实际结果的几何优化建议',
      '网格参数调整建议',
      'Fragment切割策略建议'
    ]
  };
};

export default GeometryTestCases;