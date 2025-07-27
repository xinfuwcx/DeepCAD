/**
 * 标准几何测试用例 - 为3号计算专家提供Fragment验证数据
 * 4套测试用例：简单基坑、复杂基坑、多层支护、隧道干扰
 */

export interface StandardTestCase {
  id: string;
  name: string;
  description: string;
  category: 'simple' | 'complex' | 'support' | 'tunnel';
  // 3号的验证参数
  validation: {
    expectedMeshSize: number; // 1.5-2.0m
    expectedElements: number; // <2M
    expectedQuality: number; // >0.65
    complexityLevel: 'low' | 'medium' | 'high';
  };
  // 几何数据
  geometry: {
    vertices: number[][];
    boundaries: number[][];
    materialZones: {
      id: string;
      type: 'soil' | 'support' | 'tunnel' | 'water';
      properties: any;
    }[];
  };
  // 关键区域标识
  criticalRegions: {
    corners: number[][]; // 基坑角点坐标
    sharpAngles: number[][]; // 尖锐角度点
    contactSurfaces: number[][]; // 支护接触面
    materialBoundaries: number[][]; // 材料分界面
  };
  // 3号的质量检查点
  qualityCheckpoints: {
    meshSizeVariation: number; // 网格尺寸变化率
    aspectRatioDistribution: number[]; // 长宽比分布
    skewnessDistribution: number[]; // 偏斜度分布
    elementQualityHistogram: number[]; // 单元质量直方图
  };
}

class GeometryTestCasesService {
  private testCases: StandardTestCase[] = [];

  constructor() {
    this.initializeStandardTestCases();
  }

  /**
   * 初始化4套标准测试用例
   */
  private initializeStandardTestCases(): void {
    this.testCases = [
      this.createSimpleExcavationCase(),
      this.createComplexExcavationCase(),
      this.createMultiLayerSupportCase(),
      this.createTunnelInterferenceCase()
    ];

    console.log('📋 已初始化4套标准几何测试用例给3号');
  }

  /**
   * 测试用例1：简单矩形基坑 - 基础验证
   */
  private createSimpleExcavationCase(): StandardTestCase {
    return {
      id: 'simple_excavation_001',
      name: '标准矩形基坑',
      description: '60m×40m×15m深矩形基坑，地连墙支护，验证基础几何质量',
      category: 'simple',
      validation: {
        expectedMeshSize: 1.8, // 适中的网格尺寸
        expectedElements: 800000, // 预期80万单元
        expectedQuality: 0.75, // 简单几何应达到较高质量
        complexityLevel: 'low'
      },
      geometry: {
        vertices: [
          [-30, -20, 0], [30, -20, 0], [30, 20, 0], [-30, 20, 0], // 地面轮廓
          [-30, -20, -15], [30, -20, -15], [30, 20, -15], [-30, 20, -15] // 底部轮廓
        ],
        boundaries: [
          [0, 1, 2, 3], // 地面边界
          [4, 5, 6, 7], // 底面边界
          [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7] // 侧面边界
        ],
        materialZones: [
          {
            id: 'soil_zone_1',
            type: 'soil',
            properties: { density: 1800, cohesion: 25, friction: 30 }
          },
          {
            id: 'diaphragm_wall',
            type: 'support',
            properties: { thickness: 0.8, material: 'concrete_c30' }
          }
        ]
      },
      criticalRegions: {
        corners: [[-30, -20, 0], [30, -20, 0], [30, 20, 0], [-30, 20, 0]], // 4个角点
        sharpAngles: [], // 矩形无尖锐角
        contactSurfaces: [
          [-30, -20, 0], [-30, -20, -15], // 地连墙接触面
          [30, -20, 0], [30, -20, -15],
          [30, 20, 0], [30, 20, -15],
          [-30, 20, 0], [-30, 20, -15]
        ],
        materialBoundaries: [
          [-30, -20, 0], [30, -20, 0], [30, 20, 0], [-30, 20, 0] // 土-支护分界
        ]
      },
      qualityCheckpoints: {
        meshSizeVariation: 0.15, // 15%变化率
        aspectRatioDistribution: [0.1, 0.3, 0.4, 0.2], // 优秀-良好-一般-差
        skewnessDistribution: [0.6, 0.3, 0.1], // 低-中-高偏斜
        elementQualityHistogram: [0.05, 0.15, 0.30, 0.35, 0.15] // 质量分布
      }
    };
  }

  /**
   * 测试用例2：复杂不规则基坑 - 挑战性验证
   */
  private createComplexExcavationCase(): StandardTestCase {
    return {
      id: 'complex_excavation_002',
      name: '不规则多边形基坑',
      description: '不规则8边形基坑，包含内部洞口，测试复杂几何处理能力',
      category: 'complex',
      validation: {
        expectedMeshSize: 1.6, // 复杂几何需要细化
        expectedElements: 1500000, // 预期150万单元
        expectedQuality: 0.68, // 复杂几何质量略低
        complexityLevel: 'high'
      },
      geometry: {
        vertices: [
          // 外边界（不规则8边形）
          [-25, -35, 0], [10, -35, 0], [40, -20, 0], [40, 5, 0], 
          [25, 30, 0], [-10, 30, 0], [-35, 15, 0], [-35, -20, 0],
          // 内部洞口（圆形近似）
          [-5, -5, 0], [5, -5, 0], [5, 5, 0], [-5, 5, 0],
          // 底部对应点
          [-25, -35, -18], [10, -35, -18], [40, -20, -18], [40, 5, -18],
          [25, 30, -18], [-10, 30, -18], [-35, 15, -18], [-35, -20, -18],
          [-5, -5, -18], [5, -5, -18], [5, 5, -18], [-5, 5, -18]
        ],
        boundaries: [
          [0, 1, 2, 3, 4, 5, 6, 7], // 外边界
          [8, 9, 10, 11], // 内洞边界
          [12, 13, 14, 15, 16, 17, 18, 19], // 底面外边界
          [20, 21, 22, 23] // 底面内洞边界
        ],
        materialZones: [
          {
            id: 'soil_zone_complex',
            type: 'soil',
            properties: { 
              layers: [
                { depth: 6, type: 'clay', density: 1750 },
                { depth: 12, type: 'sand', density: 1900 }
              ]
            }
          }
        ]
      },
      criticalRegions: {
        corners: [
          [-25, -35, 0], [40, -20, 0], [40, 5, 0], [25, 30, 0], 
          [-10, 30, 0], [-35, 15, 0] // 外角点
        ],
        sharpAngles: [
          [40, -20, 0], [-35, 15, 0] // 可能的尖锐角
        ],
        contactSurfaces: [
          // 复杂支护接触面
        ],
        materialBoundaries: [
          [0, 0, -6], [0, 0, -12] // 土层分界面
        ]
      },
      qualityCheckpoints: {
        meshSizeVariation: 0.35, // 复杂几何变化率更大
        aspectRatioDistribution: [0.05, 0.25, 0.45, 0.25], // 质量分布偏低
        skewnessDistribution: [0.4, 0.4, 0.2], // 更多中高偏斜
        elementQualityHistogram: [0.02, 0.08, 0.25, 0.45, 0.20] // 质量分布
      }
    };
  }

  /**
   * 测试用例3：多层锚杆支护系统 - 支护结构验证
   */
  private createMultiLayerSupportCase(): StandardTestCase {
    return {
      id: 'multilayer_support_003',
      name: '6层锚杆支护系统',
      description: '50m×30m基坑，6层锚杆+腰梁系统，验证支护结构网格质量',
      category: 'support',
      validation: {
        expectedMeshSize: 1.5, // 支护区域需要细化
        expectedElements: 1200000, // 预期120万单元
        expectedQuality: 0.70, // 支护结构影响质量
        complexityLevel: 'medium'
      },
      geometry: {
        vertices: [
          // 基坑主体
          [-25, -15, 0], [25, -15, 0], [25, 15, 0], [-25, 15, 0],
          [-25, -15, -20], [25, -15, -20], [25, 15, -20], [-25, 15, -20],
          // 锚杆点位（6层 × 4面 × 间距2m）
          // 第1层（-2m深度）
          ...this.generateAnchorPoints(25, 15, -2, 2.0),
          // 第2层（-5m深度）
          ...this.generateAnchorPoints(25, 15, -5, 2.0),
          // ... 其他4层
          ...this.generateAnchorPoints(25, 15, -8, 2.0),
          ...this.generateAnchorPoints(25, 15, -11, 2.0),
          ...this.generateAnchorPoints(25, 15, -14, 2.0),
          ...this.generateAnchorPoints(25, 15, -17, 2.0)
        ],
        boundaries: [
          [0, 1, 2, 3], // 地面
          [4, 5, 6, 7]  // 底面
        ],
        materialZones: [
          {
            id: 'anchor_steel',
            type: 'support',
            properties: { material: 'steel_bar', diameter: 32, length: 15 }
          },
          {
            id: 'grout',
            type: 'support',
            properties: { material: 'cement_grout', strength: 25 }
          },
          {
            id: 'wale_beam',
            type: 'support',
            properties: { material: 'steel_h400', spacing: 2.0 }
          }
        ]
      },
      criticalRegions: {
        corners: [[-25, -15, 0], [25, -15, 0], [25, 15, 0], [-25, 15, 0]],
        sharpAngles: [], // 矩形基坑无尖角
        contactSurfaces: this.generateSupportContactSurfaces(),
        materialBoundaries: this.generateMaterialBoundaries()
      },
      qualityCheckpoints: {
        meshSizeVariation: 0.25, // 支护区域变化率
        aspectRatioDistribution: [0.08, 0.27, 0.40, 0.25], // 支护影响分布
        skewnessDistribution: [0.5, 0.35, 0.15], // 相对较好
        elementQualityHistogram: [0.03, 0.12, 0.28, 0.40, 0.17] // 质量分布
      }
    };
  }

  /**
   * 测试用例4：隧道干扰基坑 - 隧道集成验证
   */
  private createTunnelInterferenceCase(): StandardTestCase {
    return {
      id: 'tunnel_interference_004',
      name: '隧道穿越基坑',
      description: '基坑+倾斜隧道干扰，验证复杂交叉几何网格生成',
      category: 'tunnel',
      validation: {
        expectedMeshSize: 1.7, // 平衡精度和规模
        expectedElements: 1800000, // 预期180万单元
        expectedQuality: 0.66, // 交叉几何挑战质量
        complexityLevel: 'high'
      },
      geometry: {
        vertices: [
          // 基坑几何
          [-30, -20, 0], [30, -20, 0], [30, 20, 0], [-30, 20, 0],
          [-30, -20, -12], [30, -20, -12], [30, 20, -12], [-30, 20, -12],
          // 隧道几何（倾斜3°穿越）
          ...this.generateTunnelGeometry(-40, 40, -8, -5, 6.0, 3), // 隧道直径6m，倾斜3°
        ],
        boundaries: [
          [0, 1, 2, 3], // 基坑地面
          [4, 5, 6, 7], // 基坑底面
          // 隧道边界由generateTunnelGeometry生成
        ],
        materialZones: [
          {
            id: 'excavation_soil',
            type: 'soil',
            properties: { density: 1850, cohesion: 30 }
          },
          {
            id: 'tunnel_lining',
            type: 'tunnel',
            properties: { material: 'concrete_c40', thickness: 0.3 }
          }
        ]
      },
      criticalRegions: {
        corners: [[-30, -20, 0], [30, -20, 0], [30, 20, 0], [-30, 20, 0]],
        sharpAngles: [], // 主要挑战在交叉区域
        contactSurfaces: [
          // 隧道-土体接触面
          ...this.generateTunnelContactSurfaces()
        ],
        materialBoundaries: [
          // 基坑-隧道交叉边界
          [0, -10, -8], [0, 10, -5] // 交叉区域边界
        ]
      },
      qualityCheckpoints: {
        meshSizeVariation: 0.40, // 交叉区域变化大
        aspectRatioDistribution: [0.04, 0.20, 0.46, 0.30], // 质量分布偏低
        skewnessDistribution: [0.35, 0.40, 0.25], // 更多高偏斜
        elementQualityHistogram: [0.01, 0.07, 0.23, 0.48, 0.21] // 质量分布
      }
    };
  }

  /**
   * 生成锚杆点位 - 6层系统专用
   */
  private generateAnchorPoints(length: number, width: number, depth: number, spacing: number): number[][] {
    const points: number[][] = [];
    
    // 长边锚杆点
    for (let x = -length + spacing; x < length; x += spacing) {
      points.push([x, -width, depth]); // 北侧
      points.push([x, width, depth]);  // 南侧
    }
    
    // 短边锚杆点
    for (let y = -width + spacing; y < width; y += spacing) {
      points.push([-length, y, depth]); // 西侧
      points.push([length, y, depth]);  // 东侧
    }
    
    return points;
  }

  /**
   * 生成隧道几何 - 倾斜直筒隧道
   */
  private generateTunnelGeometry(
    startX: number, endX: number, 
    startZ: number, endZ: number, 
    diameter: number, tiltAngle: number
  ): number[][] {
    const points: number[][] = [];
    const segments = 20; // 分段数
    const radius = diameter / 2;
    const circumferencePoints = 12; // 圆周点数
    
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = startX + t * (endX - startX);
      const z = startZ + t * (endZ - startZ);
      
      // 生成圆形截面点
      for (let j = 0; j < circumferencePoints; j++) {
        const angle = (j / circumferencePoints) * 2 * Math.PI;
        const y = Math.cos(angle) * radius;
        const zOffset = Math.sin(angle) * radius;
        
        points.push([x, y, z + zOffset]);
      }
    }
    
    return points;
  }

  /**
   * 生成支护接触面
   */
  private generateSupportContactSurfaces(): number[][] {
    // 简化实现，实际应该更复杂
    return [
      [-25, -15, 0], [-25, -15, -20],
      [25, -15, 0], [25, -15, -20],
      [25, 15, 0], [25, 15, -20],
      [-25, 15, 0], [-25, 15, -20]
    ];
  }

  /**
   * 生成材料分界面
   */
  private generateMaterialBoundaries(): number[][] {
    return [
      // 锚杆-土体分界
      [0, 0, -2], [0, 0, -5], [0, 0, -8], 
      [0, 0, -11], [0, 0, -14], [0, 0, -17]
    ];
  }

  /**
   * 生成隧道接触面
   */
  private generateTunnelContactSurfaces(): number[][] {
    // 简化的隧道接触面生成
    const contacts: number[][] = [];
    
    for (let x = -20; x <= 20; x += 5) {
      const z = -8 + (x / 40) * 3; // 3°倾斜
      contacts.push([x, 3, z]);
      contacts.push([x, -3, z]);
    }
    
    return contacts;
  }

  /**
   * 获取所有测试用例
   */
  getAllTestCases(): StandardTestCase[] {
    return this.testCases;
  }

  /**
   * 根据类别获取测试用例
   */
  getTestCasesByCategory(category: 'simple' | 'complex' | 'support' | 'tunnel'): StandardTestCase[] {
    return this.testCases.filter(testCase => testCase.category === category);
  }

  /**
   * 获取单个测试用例
   */
  getTestCaseById(id: string): StandardTestCase | null {
    return this.testCases.find(testCase => testCase.id === id) || null;
  }

  /**
   * 导出测试用例给3号 - JSON格式
   */
  async exportTestCasesFor3(exportPath?: string): Promise<{
    exportPath: string;
    summary: {
      totalCases: number;
      totalExpectedElements: number;
      averageQuality: number;
      complexityDistribution: { [key: string]: number };
    };
  }> {
    const exportData = {
      metadata: {
        exportTime: new Date().toISOString(),
        version: '1.0.0',
        description: '2号几何专家为3号计算专家提供的标准测试用例',
        validation: {
          meshSizeRange: [1.5, 2.0],
          qualityThreshold: 0.65,
          elementLimit: 2000000
        }
      },
      testCases: this.testCases,
      summary: {
        totalCases: this.testCases.length,
        totalExpectedElements: this.testCases.reduce((sum, tc) => sum + tc.validation.expectedElements, 0),
        averageQuality: this.testCases.reduce((sum, tc) => sum + tc.validation.expectedQuality, 0) / this.testCases.length,
        complexityDistribution: {
          low: this.testCases.filter(tc => tc.validation.complexityLevel === 'low').length,
          medium: this.testCases.filter(tc => tc.validation.complexityLevel === 'medium').length,
          high: this.testCases.filter(tc => tc.validation.complexityLevel === 'high').length
        }
      }
    };

    try {
      const response = await fetch('/api/geometry/test-cases/export-for-3', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exportData),
      });

      if (!response.ok) {
        throw new Error(`测试用例导出失败: ${response.status}`);
      }

      const result = await response.json();
      
      console.log('📋 已导出4套标准测试用例给3号:', {
        导出路径: result.exportPath,
        用例总数: exportData.summary.totalCases,
        预期总单元: exportData.summary.totalExpectedElements,
        平均质量: exportData.summary.averageQuality.toFixed(3)
      });

      return {
        exportPath: result.exportPath,
        summary: exportData.summary
      };

    } catch (error) {
      console.error('❌ 测试用例导出失败:', error);
      throw error;
    }
  }

  /**
   * 验证测试用例质量 - 3号的预检查
   */
  validateTestCaseQuality(testCase: StandardTestCase): {
    isValid: boolean;
    issues: string[];
    recommendations: string[];
    qualityScore: number;
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let qualityScore = 1.0;

    // 检查网格尺寸范围
    if (testCase.validation.expectedMeshSize < 1.5 || testCase.validation.expectedMeshSize > 2.0) {
      issues.push('网格尺寸超出3号建议的1.5-2.0m范围');
      qualityScore -= 0.2;
    }

    // 检查单元数量限制
    if (testCase.validation.expectedElements > 2000000) {
      issues.push('预期单元数超过3号验证的200万上限');
      qualityScore -= 0.3;
    }

    // 检查质量目标
    if (testCase.validation.expectedQuality < 0.65) {
      issues.push('预期质量低于3号建议的0.65阈值');
      qualityScore -= 0.2;
    }

    // 检查关键区域定义
    if (testCase.criticalRegions.corners.length === 0) {
      recommendations.push('建议定义关键角点以便3号重点监控');
      qualityScore -= 0.1;
    }

    // 检查几何完整性
    if (testCase.geometry.vertices.length < 8) {
      issues.push('几何顶点数过少，可能影响网格生成');
      qualityScore -= 0.2;
    }

    const finalScore = Math.max(0, qualityScore);
    const isValid = finalScore >= 0.7 && issues.length === 0;

    return {
      isValid,
      issues,
      recommendations,
      qualityScore: finalScore
    };
  }
}

// 创建单例实例
export const geometryTestCasesService = new GeometryTestCasesService();

// 便捷函数
export const getAllStandardTestCases = () => geometryTestCasesService.getAllTestCases();
export const getTestCasesByCategory = (category: 'simple' | 'complex' | 'support' | 'tunnel') => 
  geometryTestCasesService.getTestCasesByCategory(category);
export const exportTestCasesFor3 = (exportPath?: string) => 
  geometryTestCasesService.exportTestCasesFor3(exportPath);

export default geometryTestCasesService;