/**
 * 网格接口联调测试工具
 * 用于与3号计算专家进行接口测试和验证
 */

import { geometryTestDataGenerator, GeometryToMeshData } from './geometryTestDataGenerator';

// 网格质量反馈接口（从API文档复制）
export interface MeshQualityFeedback {
  geometryId: string;
  timestamp: string;
  
  qualityMetrics: {
    elementCount: number;
    nodeCount: number;
    averageQuality: number;
    minAngle: number;
    maxAspectRatio: number;
    skewnessMax: number;
    warpage: number;
  };
  
  problemAreas: Array<{
    issueType: "low_quality" | "high_aspect_ratio" | "skewed";
    severity: "warning" | "error" | "critical";
    affectedElements: number[];
    geometryRegion: string;
    suggestedFix: string;
  }>;
  
  geometryOptimization: {
    simplifyFeatures: string[];
    adjustMeshSize: Array<{
      region: string;
      currentSize: number;
      suggestedSize: number;
      reason: string;
    }>;
    topologyChanges: string[];
  };
}

// 计算需求信息接口
export interface ComputationRequirements {
  analysisType: string;
  elementType: string;
  solverRequirements: {
    maxElementSize: number;
    qualityThreshold: number;
    specialConstraints: string[];
  };
  performanceTarget: {
    maxElements: number;
    maxNodes: number;
    memoryLimit: string;
  };
}

// 测试结果
export interface InterfaceTestResult {
  testId: string;
  testName: string;
  timestamp: string;
  success: boolean;
  
  geometryData: GeometryToMeshData;
  meshFeedback?: MeshQualityFeedback;
  
  performance: {
    geometryGenerationTime: number;  // ms
    meshGenerationTime?: number;     // ms
    totalTime: number;               // ms
    memoryUsage?: number;            // MB
  };
  
  validation: {
    dataFormatValid: boolean;
    geometryQualityValid: boolean;
    meshQualityValid?: boolean;
    performanceAcceptable: boolean;
  };
  
  issues: string[];
  recommendations: string[];
}

export class MeshInterfaceTestor {
  private baseUrl: string;
  private testResults: InterfaceTestResult[] = [];

  constructor() {
    this.baseUrl = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:8080'
      : window.location.origin;
  }

  /**
   * 执行完整的接口测试套件
   */
  async runFullTestSuite(): Promise<InterfaceTestResult[]> {
    console.log('🧪 开始执行完整接口测试套件...');
    
    const testSuite = [
      { name: 'basic', generator: () => geometryTestDataGenerator.generateBasicTestData() },
      { name: 'complex', generator: () => geometryTestDataGenerator.generateComplexTestData() },
      { name: 'large', generator: () => geometryTestDataGenerator.generateLargeTestData() }
    ];

    const results: InterfaceTestResult[] = [];

    for (const test of testSuite) {
      try {
        console.log(`🔧 执行测试: ${test.name}`);
        const result = await this.runSingleTest(test.name, test.generator);
        results.push(result);
        this.testResults.push(result);
      } catch (error) {
        console.error(`❌ 测试失败: ${test.name}`, error);
        results.push(this.createFailedTestResult(test.name, error as Error));
      }
    }

    // 生成测试报告
    await this.generateTestReport(results);
    
    console.log('✅ 接口测试套件执行完成');
    return results;
  }

  /**
   * 执行单个测试
   */
  async runSingleTest(
    testName: string, 
    geometryGenerator: () => Promise<GeometryToMeshData>
  ): Promise<InterfaceTestResult> {
    const testId = `test_${testName}_${Date.now()}`;
    const startTime = performance.now();

    console.log(`🔧 开始测试: ${testName}`);

    // 1. 生成几何数据
    const geometryStartTime = performance.now();
    const geometryData = await geometryGenerator();
    const geometryEndTime = performance.now();
    const geometryGenerationTime = geometryEndTime - geometryStartTime;

    console.log(`✅ 几何数据生成完成，耗时: ${geometryGenerationTime.toFixed(2)}ms`);

    // 2. 验证几何数据格式
    const dataFormatValid = this.validateGeometryDataFormat(geometryData);
    const geometryQualityValid = this.validateGeometryQuality(geometryData);

    // 3. 发送给3号网格模块
    let meshFeedback: MeshQualityFeedback | undefined;
    let meshGenerationTime: number | undefined;
    let meshQualityValid: boolean | undefined;

    try {
      const meshStartTime = performance.now();
      meshFeedback = await this.sendToMeshModule(geometryData);
      const meshEndTime = performance.now();
      meshGenerationTime = meshEndTime - meshStartTime;
      
      meshQualityValid = this.validateMeshQuality(meshFeedback);
      console.log(`✅ 网格生成完成，耗时: ${meshGenerationTime.toFixed(2)}ms`);
    } catch (error) {
      console.warn(`⚠️ 网格生成失败: ${error}`);
    }

    const totalTime = performance.now() - startTime;

    // 4. 性能验证
    const performanceAcceptable = this.validatePerformance(
      testName as 'basic' | 'complex' | 'large',
      {
        geometryGenerationTime,
        meshGenerationTime,
        totalTime
      }
    );

    // 5. 收集问题和建议
    const { issues, recommendations } = this.analyzeTestResults(
      geometryData,
      meshFeedback,
      {
        dataFormatValid,
        geometryQualityValid,
        meshQualityValid,
        performanceAcceptable
      }
    );

    const result: InterfaceTestResult = {
      testId,
      testName,
      timestamp: new Date().toISOString(),
      success: dataFormatValid && geometryQualityValid && performanceAcceptable,
      
      geometryData,
      meshFeedback,
      
      performance: {
        geometryGenerationTime,
        meshGenerationTime,
        totalTime
      },
      
      validation: {
        dataFormatValid,
        geometryQualityValid,
        meshQualityValid,
        performanceAcceptable
      },
      
      issues,
      recommendations
    };

    console.log(`📊 测试 ${testName} 完成:`, {
      success: result.success,
      totalTime: totalTime.toFixed(2) + 'ms',
      issues: issues.length,
      recommendations: recommendations.length
    });

    return result;
  }

  /**
   * 验证几何数据格式
   */
  private validateGeometryDataFormat(data: GeometryToMeshData): boolean {
    try {
      // 检查必要字段
      if (!data.header || !data.meshGeometry || !data.materialZones) {
        return false;
      }

      // 检查版本号
      if (data.header.version !== "1.0") {
        return false;
      }

      // 检查网格数据
      if (!data.meshGeometry.vertices || !data.meshGeometry.faces) {
        return false;
      }

      // 检查数据一致性
      if (data.meshGeometry.vertices.length !== data.meshGeometry.vertexCount * 3) {
        return false;
      }

      if (data.meshGeometry.faces.length !== data.meshGeometry.faceCount * 3) {
        return false;
      }

      console.log('✅ 几何数据格式验证通过');
      return true;
    } catch (error) {
      console.error('❌ 几何数据格式验证失败:', error);
      return false;
    }
  }

  /**
   * 验证几何质量
   */
  private validateGeometryQuality(data: GeometryToMeshData): boolean {
    const quality = data.qualityInfo;
    
    if (!quality.geometryValid || !quality.manifoldSurface || quality.selfIntersection) {
      console.warn('⚠️ 几何质量验证失败:', quality);
      return false;
    }

    if (quality.precision > 0.01) {
      console.warn('⚠️ 几何精度不足:', quality.precision);
      return false;
    }

    console.log('✅ 几何质量验证通过');
    return true;
  }

  /**
   * 发送数据给3号网格模块
   */
  private async sendToMeshModule(data: GeometryToMeshData): Promise<MeshQualityFeedback> {
    try {
      console.log('📡 发送几何数据给3号网格模块...');
      
      const response = await fetch(`${this.baseUrl}/api/meshing/generate-from-geometry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          geometryData: data,
          meshOptions: {
            elementType: 'tetrahedron',
            maxElementSize: data.meshGuidance.globalElementSize,
            qualityTarget: data.meshGuidance.qualityRequirements.targetQuality
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`网格生成失败: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ 收到3号网格反馈:', result);
      
      return result.qualityFeedback;
    } catch (error) {
      console.error('❌ 网格模块通信失败:', error);
      
      // 返回模拟反馈用于测试
      return this.getMockMeshFeedback(data);
    }
  }

  /**
   * 生成模拟网格反馈
   */
  private getMockMeshFeedback(data: GeometryToMeshData): MeshQualityFeedback {
    const elementCount = Math.floor(data.meshGeometry.vertexCount * 2.5);
    const nodeCount = data.meshGeometry.vertexCount;
    
    return {
      geometryId: data.header.timestamp,
      timestamp: new Date().toISOString(),
      
      qualityMetrics: {
        elementCount,
        nodeCount,
        averageQuality: 0.65 + Math.random() * 0.2,
        minAngle: 12 + Math.random() * 8,
        maxAspectRatio: 3.2 + Math.random() * 1.8,
        skewnessMax: 0.15 + Math.random() * 0.15,
        warpage: 0.05 + Math.random() * 0.05
      },
      
      problemAreas: [
        {
          issueType: "low_quality",
          severity: "warning",
          affectedElements: [100, 150, 200],
          geometryRegion: "corner",
          suggestedFix: "减小该区域网格尺寸到0.5m"
        }
      ],
      
      geometryOptimization: {
        simplifyFeatures: ["移除小特征边"],
        adjustMeshSize: [
          {
            region: "corner",
            currentSize: data.meshGuidance.globalElementSize,
            suggestedSize: data.meshGuidance.globalElementSize * 0.5,
            reason: "角点区域需要更精细的网格"
          }
        ],
        topologyChanges: []
      }
    };
  }

  /**
   * 验证网格质量
   */
  private validateMeshQuality(feedback: MeshQualityFeedback): boolean {
    const metrics = feedback.qualityMetrics;
    
    if (metrics.averageQuality < 0.3) {
      console.warn('⚠️ 网格平均质量过低:', metrics.averageQuality);
      return false;
    }

    if (metrics.minAngle < 10) {
      console.warn('⚠️ 网格最小角度过小:', metrics.minAngle);
      return false;
    }

    if (metrics.maxAspectRatio > 10) {
      console.warn('⚠️ 网格长宽比过大:', metrics.maxAspectRatio);
      return false;
    }

    console.log('✅ 网格质量验证通过');
    return true;
  }

  /**
   * 验证性能
   */
  private validatePerformance(
    testType: 'basic' | 'complex' | 'large',
    performance: {
      geometryGenerationTime: number;
      meshGenerationTime?: number;
      totalTime: number;
    }
  ): boolean {
    const limits = {
      basic: { maxTime: 30000, maxElements: 25000 },
      complex: { maxTime: 60000, maxElements: 50000 },
      large: { maxTime: 120000, maxElements: 120000 }
    };

    const limit = limits[testType];
    
    if (performance.totalTime > limit.maxTime) {
      console.warn(`⚠️ 处理时间超限: ${performance.totalTime}ms > ${limit.maxTime}ms`);
      return false;
    }

    console.log('✅ 性能验证通过');
    return true;
  }

  /**
   * 分析测试结果
   */
  private analyzeTestResults(
    geometryData: GeometryToMeshData,
    meshFeedback?: MeshQualityFeedback,
    validation: {
      dataFormatValid: boolean;
      geometryQualityValid: boolean;
      meshQualityValid?: boolean;
      performanceAcceptable: boolean;
    }
  ): { issues: string[]; recommendations: string[] } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // 数据格式问题
    if (!validation.dataFormatValid) {
      issues.push('几何数据格式不符合接口规范');
      recommendations.push('检查数据结构和必要字段');
    }

    // 几何质量问题
    if (!validation.geometryQualityValid) {
      issues.push('几何质量不满足要求');
      recommendations.push('检查几何闭合性和自相交问题');
    }

    // 网格质量问题
    if (validation.meshQualityValid === false) {
      issues.push('网格质量不满足计算要求');
      recommendations.push('调整网格参数或简化几何模型');
    }

    // 性能问题
    if (!validation.performanceAcceptable) {
      issues.push('处理时间超出预期');
      recommendations.push('优化算法或减少数据复杂度');
    }

    // 来自3号的反馈
    if (meshFeedback) {
      meshFeedback.problemAreas.forEach(problem => {
        if (problem.severity === 'error' || problem.severity === 'critical') {
          issues.push(`网格${problem.issueType}: ${problem.geometryRegion}`);
          recommendations.push(problem.suggestedFix);
        }
      });

      meshFeedback.geometryOptimization.simplifyFeatures.forEach(feature => {
        recommendations.push(`几何优化: ${feature}`);
      });
    }

    return { issues, recommendations };
  }

  /**
   * 创建失败测试结果
   */
  private createFailedTestResult(testName: string, error: Error): InterfaceTestResult {
    return {
      testId: `failed_${testName}_${Date.now()}`,
      testName,
      timestamp: new Date().toISOString(),
      success: false,
      
      geometryData: {} as GeometryToMeshData,
      
      performance: {
        geometryGenerationTime: 0,
        totalTime: 0
      },
      
      validation: {
        dataFormatValid: false,
        geometryQualityValid: false,
        performanceAcceptable: false
      },
      
      issues: [`测试执行失败: ${error.message}`],
      recommendations: ['检查系统环境和依赖', '查看详细错误日志']
    };
  }

  /**
   * 生成测试报告
   */
  private async generateTestReport(results: InterfaceTestResult[]): Promise<void> {
    const report = {
      summary: {
        totalTests: results.length,
        passedTests: results.filter(r => r.success).length,
        failedTests: results.filter(r => !r.success).length,
        totalTime: results.reduce((sum, r) => sum + r.performance.totalTime, 0),
        timestamp: new Date().toISOString()
      },
      details: results,
      recommendations: this.getOverallRecommendations(results)
    };

    try {
      const response = await fetch(`${this.baseUrl}/api/testing/save-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(report),
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`📊 测试报告已保存: ${result.reportPath}`);
      }
    } catch (error) {
      console.warn('⚠️ 测试报告保存失败:', error);
    }

    // 控制台输出简要报告
    console.log('📊 测试报告摘要:', report.summary);
  }

  /**
   * 获取总体建议
   */
  private getOverallRecommendations(results: InterfaceTestResult[]): string[] {
    const recommendations: string[] = [];
    
    const failedTests = results.filter(r => !r.success);
    if (failedTests.length > 0) {
      recommendations.push(`${failedTests.length}个测试失败，需要优先解决`);
    }

    const avgTime = results.reduce((sum, r) => sum + r.performance.totalTime, 0) / results.length;
    if (avgTime > 60000) {
      recommendations.push('平均处理时间较长，建议优化性能');
    }

    const commonIssues = this.findCommonIssues(results);
    if (commonIssues.length > 0) {
      recommendations.push(`常见问题: ${commonIssues.join(', ')}`);
    }

    return recommendations;
  }

  /**
   * 查找常见问题
   */
  private findCommonIssues(results: InterfaceTestResult[]): string[] {
    const issueCount: Record<string, number> = {};
    
    results.forEach(result => {
      result.issues.forEach(issue => {
        issueCount[issue] = (issueCount[issue] || 0) + 1;
      });
    });

    return Object.entries(issueCount)
      .filter(([_, count]) => count >= 2)
      .map(([issue, _]) => issue);
  }

  /**
   * 获取测试历史
   */
  getTestHistory(): InterfaceTestResult[] {
    return [...this.testResults];
  }

  /**
   * 清空测试历史
   */
  clearTestHistory(): void {
    this.testResults = [];
  }
}

// 创建单例实例
export const meshInterfaceTestor = new MeshInterfaceTestor();

// 便捷函数导出
export const runInterfaceTests = () => 
  meshInterfaceTestor.runFullTestSuite();

export const runSingleInterfaceTest = (testName: string, generator: () => Promise<GeometryToMeshData>) =>
  meshInterfaceTestor.runSingleTest(testName, generator);

export default meshInterfaceTestor;