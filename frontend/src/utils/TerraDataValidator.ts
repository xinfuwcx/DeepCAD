/**
 * Terra数据传输验证工具
 * DeepCAD Deep Excavation CAE Platform - Terra Data Validator
 * 
 * 作者：2号几何专家
 * 功能：验证与3号计算专家的数据传输格式和完整性
 * 用途：确保数据包能够被Terra求解器正确解析
 */

import * as THREE from 'three';
import { 
  TerraDataPackage, 
  TerraOffsetInstruction, 
  TerraProcessingFeedback,
  OffsetElementData,
  BoundaryConditionMapping,
  TERRA_INTEGRATION_CONSTANTS
} from '../core/interfaces/TerraIntegrationInterface';
import { OffsetResult } from '../core/geometry/DiaphragmWallOffsetProcessor';
import { logger } from './advancedLogger';

// ==================== 验证结果接口 ====================

export interface ValidationResult {
  isValid: boolean;
  score: number; // 0-100分
  errors: ValidationError[];
  warnings: ValidationWarning[];
  recommendations: string[];
  performanceMetrics: ValidationPerformanceMetrics;
}

interface ValidationError {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  category: 'DATA_STRUCTURE' | 'GEOMETRY' | 'MATERIAL' | 'SOLVER_CONFIG';
  field: string;
  message: string;
  suggestedFix?: string;
}

interface ValidationWarning {
  category: 'PERFORMANCE' | 'QUALITY' | 'COMPATIBILITY';
  field: string;
  message: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface ValidationPerformanceMetrics {
  validationTime: number;
  dataPackageSize: number;
  nodeCount: number;
  elementCount: number;
  estimatedSolverTime: number;
  memoryRequirement: number;
}

// ==================== 主验证器类 ====================

export class TerraDataValidator {
  private validationStartTime: number = 0;
  private validationLog: string[] = [];

  /**
   * 验证完整的Terra数据包
   */
  public validateDataPackage(dataPackage: TerraDataPackage): ValidationResult {
    console.log('🔍 开始Terra数据包验证...');
    this.validationStartTime = performance.now();
    this.validationLog = [];
    
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const recommendations: string[] = [];

    try {
      // 1. 基础结构验证
      this.validateBasicStructure(dataPackage, errors);
      
      // 2. 几何数据验证
      this.validateGeometryData(dataPackage, errors, warnings);
      
      // 3. 偏移指令验证
      if (dataPackage.offsetInstructions) {
        this.validateOffsetInstructions(dataPackage.offsetInstructions, errors, warnings);
      }
      
      // 4. 求解器配置验证
      this.validateSolverConfiguration(dataPackage.solverConfiguration, errors, warnings);
      
      // 5. 验证要求验证
      this.validateValidationRequirements(dataPackage.validationRequirements, errors, warnings);
      
      // 6. 性能估算
      const performanceMetrics = this.calculatePerformanceMetrics(dataPackage);
      
      // 7. 生成建议
      this.generateRecommendations(dataPackage, errors, warnings, recommendations);
      
      const validationTime = performance.now() - this.validationStartTime;
      const score = this.calculateValidationScore(errors, warnings);
      
      console.log(`✅ 数据包验证完成，耗时: ${validationTime.toFixed(2)}ms，得分: ${score}`);
      
      return {
        isValid: errors.filter(e => e.severity === 'CRITICAL').length === 0,
        score,
        errors,
        warnings,
        recommendations,
        performanceMetrics: {
          ...performanceMetrics,
          validationTime
        }
      };
      
    } catch (error) {
      console.error('❌ 数据包验证失败:', error);
      
      return {
        isValid: false,
        score: 0,
        errors: [{
          severity: 'CRITICAL',
          category: 'DATA_STRUCTURE',
          field: 'validation_process',
          message: `验证过程异常: ${error}`,
          suggestedFix: '检查数据包格式是否正确'
        }],
        warnings: [],
        recommendations: ['重新生成数据包并检查所有必需字段'],
        performanceMetrics: {
          validationTime: performance.now() - this.validationStartTime,
          dataPackageSize: 0,
          nodeCount: 0,
          elementCount: 0,
          estimatedSolverTime: 0,
          memoryRequirement: 0
        }
      };
    }
  }

  /**
   * 验证基础数据结构
   */
  private validateBasicStructure(
    dataPackage: TerraDataPackage, 
    errors: ValidationError[]
  ): void {
    this.log('验证基础数据结构...');
    
    // 检查必需字段
    const requiredFields: (keyof TerraDataPackage)[] = [
      'packageId', 'timestamp', 'version', 
      'nodes', 'materials', 'solverConfiguration', 'validationRequirements'
    ];
    
    for (const field of requiredFields) {
      if (!dataPackage[field]) {
        errors.push({
          severity: 'CRITICAL',
          category: 'DATA_STRUCTURE',
          field,
          message: `缺少必需字段: ${field}`,
          suggestedFix: `添加 ${field} 字段到数据包中`
        });
      }
    }
    
    // 检查ID格式
    if (dataPackage.packageId && !this.isValidId(dataPackage.packageId)) {
      errors.push({
        severity: 'HIGH',
        category: 'DATA_STRUCTURE',
        field: 'packageId',
        message: 'packageId格式不正确',
        suggestedFix: '使用标准ID格式，如: deepcad_offset_123456789'
      });
    }
    
    // 检查时间戳格式
    if (dataPackage.timestamp && !this.isValidTimestamp(dataPackage.timestamp)) {
      errors.push({
        severity: 'MEDIUM',
        category: 'DATA_STRUCTURE',
        field: 'timestamp',
        message: '时间戳格式不正确',
        suggestedFix: '使用ISO 8601格式: YYYY-MM-DDTHH:mm:ss.sssZ'
      });
    }
    
    // 检查版本兼容性
    if (dataPackage.version && !this.isCompatibleVersion(dataPackage.version)) {
      errors.push({
        severity: 'HIGH',
        category: 'DATA_STRUCTURE',
        field: 'version',
        message: `不支持的版本: ${dataPackage.version}`,
        suggestedFix: '使用支持的版本号，如: 1.0.0'
      });
    }
  }

  /**
   * 验证几何数据
   */
  private validateGeometryData(
    dataPackage: TerraDataPackage,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    this.log('验证几何数据...');
    
    // 验证节点数据
    if (dataPackage.nodes.length === 0) {
      errors.push({
        severity: 'CRITICAL',
        category: 'GEOMETRY',
        field: 'nodes',
        message: '节点数据为空',
        suggestedFix: '添加至少3个节点用于构建有效几何体'
      });
    } else {
      // 检查节点格式
      for (let i = 0; i < Math.min(dataPackage.nodes.length, 10); i++) {
        const node = dataPackage.nodes[i];
        if (!this.isValidNode(node)) {
          errors.push({
            severity: 'HIGH',
            category: 'GEOMETRY',
            field: `nodes[${i}]`,
            message: `节点 ${node.id} 格式不正确`,
            suggestedFix: '确保节点包含id和coordinates字段，坐标为3个数值'
          });
        }
      }
      
      // 检查节点数量
      if (dataPackage.nodes.length > 100000) {
        warnings.push({
          category: 'PERFORMANCE',
          field: 'nodes',
          message: `节点数量过多: ${dataPackage.nodes.length}`,
          impact: 'HIGH'
        });
      }
    }
    
    // 验证材料数据
    if (dataPackage.materials.length === 0) {
      warnings.push({
        category: 'QUALITY',
        field: 'materials',
        message: '未定义材料属性',
        impact: 'MEDIUM'
      });
    } else {
      for (const material of dataPackage.materials) {
        if (!this.isValidMaterial(material)) {
          errors.push({
            severity: 'HIGH',
            category: 'MATERIAL',
            field: `materials[${material.id}]`,
            message: `材料 ${material.id} 属性不完整`,
            suggestedFix: '确保材料包含elasticModulus, poissonRatio, density等基本属性'
          });
        }
      }
    }
  }

  /**
   * 验证偏移指令
   */
  private validateOffsetInstructions(
    offsetInstructions: TerraOffsetInstruction,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    this.log('验证偏移指令...');
    
    // 检查偏移元素
    if (offsetInstructions.offsetElements.length === 0) {
      warnings.push({
        category: 'QUALITY',
        field: 'offsetElements',
        message: '没有需要偏移的元素',
        impact: 'LOW'
      });
    }
    
    for (const element of offsetInstructions.offsetElements) {
      if (element.hasOffset && !element.offsetInfo) {
        errors.push({
          severity: 'HIGH',
          category: 'GEOMETRY',
          field: `offsetElements[${element.elementId}]`,
          message: `元素 ${element.elementId} 标记为偏移但缺少偏移信息`,
          suggestedFix: '为hasOffset=true的元素提供完整的offsetInfo数据'
        });
      }
      
      if (element.offsetInfo) {
        // 验证偏移精度
        const distance = Math.abs(element.offsetInfo.offsetDistance);
        if (distance > 1.0) { // 大于1米
          warnings.push({
            category: 'QUALITY',
            field: `offsetElements[${element.elementId}].offsetDistance`,
            message: `偏移距离过大: ${distance}m`,
            impact: 'MEDIUM'
          });
        }
        
        // 验证质量指标
        if (element.offsetInfo.qualityMetrics.qualityScore < 70) {
          warnings.push({
            category: 'QUALITY',
            field: `offsetElements[${element.elementId}].qualityScore`,
            message: `偏移质量评分较低: ${element.offsetInfo.qualityMetrics.qualityScore}`,
            impact: 'HIGH'
          });
        }
      }
    }
    
    // 检查求解器建议
    const recommendations = offsetInstructions.solverRecommendations;
    if (!recommendations.enableShellOffsetSupport && offsetInstructions.offsetElements.some(e => e.elementType === 'SHELL')) {
      warnings.push({
        category: 'COMPATIBILITY',
        field: 'solverRecommendations.enableShellOffsetSupport',
        message: '有壳元偏移但未启用壳元偏移支持',
        impact: 'HIGH'
      });
    }
  }

  /**
   * 验证求解器配置
   */
  private validateSolverConfiguration(
    solverConfig: any,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    this.log('验证求解器配置...');
    
    // 检查求解器类型
    const validSolverTypes = ['TERRA_STRUCTURAL', 'TERRA_CONTACT', 'TERRA_MULTIPHYSICS'];
    if (!validSolverTypes.includes(solverConfig.solverType)) {
      errors.push({
        severity: 'HIGH',
        category: 'SOLVER_CONFIG',
        field: 'solverType',
        message: `不支持的求解器类型: ${solverConfig.solverType}`,
        suggestedFix: '使用支持的求解器类型: TERRA_STRUCTURAL, TERRA_CONTACT, 或 TERRA_MULTIPHYSICS'
      });
    }
    
    // 检查收敛准则
    const convergence = solverConfig.convergenceCriteria;
    if (convergence) {
      if (convergence.maxIterations > 1000) {
        warnings.push({
          category: 'PERFORMANCE',
          field: 'convergenceCriteria.maxIterations',
          message: `最大迭代次数过高: ${convergence.maxIterations}`,
          impact: 'MEDIUM'
        });
      }
      
      if (convergence.solutionRelativeTolerance < 1e-10) {
        warnings.push({
          category: 'PERFORMANCE',
          field: 'convergenceCriteria.solutionRelativeTolerance',
          message: `收敛容差过严格，可能导致收敛困难`,
          impact: 'HIGH'
        });
      }
    }
    
    // 检查并行化配置
    if (solverConfig.parallelization) {
      const threads = solverConfig.parallelization.numThreads;
      if (threads > navigator.hardwareConcurrency) {
        warnings.push({
          category: 'PERFORMANCE',
          field: 'parallelization.numThreads',
          message: `线程数超过CPU核心数: ${threads} > ${navigator.hardwareConcurrency}`,
          impact: 'MEDIUM'
        });
      }
    }
  }

  /**
   * 验证验证要求
   */
  private validateValidationRequirements(
    validationReqs: any,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    this.log('验证验证要求...');
    
    // 检查几何验证要求
    const geometryValidation = validationReqs.geometryValidation;
    if (geometryValidation) {
      if (geometryValidation.minJacobian <= 0) {
        errors.push({
          severity: 'HIGH',
          category: 'GEOMETRY',
          field: 'validationRequirements.geometryValidation.minJacobian',
          message: '最小Jacobian值必须大于0',
          suggestedFix: '设置合理的最小Jacobian值，如0.1'
        });
      }
      
      if (geometryValidation.maxAspectRatio < 1) {
        errors.push({
          severity: 'HIGH',
          category: 'GEOMETRY',
          field: 'validationRequirements.geometryValidation.maxAspectRatio',
          message: '最大长宽比必须大于等于1',
          suggestedFix: '设置合理的最大长宽比，如10.0'
        });
      }
    }
    
    // 检查性能要求
    const performanceReqs = validationReqs.performanceRequirements;
    if (performanceReqs) {
      if (performanceReqs.maxProcessingTime < 1) {
        warnings.push({
          category: 'PERFORMANCE',
          field: 'validationRequirements.performanceRequirements.maxProcessingTime',
          message: '最大处理时间设置过短，可能导致计算中断',
          impact: 'HIGH'
        });
      }
      
      if (performanceReqs.maxMemoryUsage < 256) {
        warnings.push({
          category: 'PERFORMANCE',
          field: 'validationRequirements.performanceRequirements.maxMemoryUsage',
          message: '内存限制过低，可能影响计算规模',
          impact: 'MEDIUM'
        });
      }
    }
  }

  /**
   * 计算性能指标
   */
  private calculatePerformanceMetrics(dataPackage: TerraDataPackage): ValidationPerformanceMetrics {
    const nodeCount = dataPackage.nodes.length;
    const materialCount = dataPackage.materials.length;
    const hasOffsetElements = dataPackage.offsetInstructions?.offsetElements.length || 0;
    
    // 估算数据包大小 (bytes)
    const dataPackageSize = JSON.stringify(dataPackage).length;
    
    // 估算求解器时间 (基于经验公式)
    const baseTime = nodeCount * 0.001; // 1ms per 1000 nodes
    const offsetPenalty = hasOffsetElements * 0.1; // 额外偏移处理时间
    const estimatedSolverTime = baseTime + offsetPenalty;
    
    // 估算内存需求 (MB)
    const nodeMemory = nodeCount * 0.024; // 24 bytes per node
    const elementMemory = hasOffsetElements * 0.048; // 48 bytes per element
    const memoryRequirement = nodeMemory + elementMemory;
    
    return {
      validationTime: 0, // 将在主函数中设置
      dataPackageSize,
      nodeCount,
      elementCount: hasOffsetElements,
      estimatedSolverTime,
      memoryRequirement
    };
  }

  /**
   * 生成建议
   */
  private generateRecommendations(
    dataPackage: TerraDataPackage,
    errors: ValidationError[],
    warnings: ValidationWarning[],
    recommendations: string[]
  ): void {
    this.log('生成优化建议...');
    
    // 基于错误生成建议
    if (errors.some(e => e.category === 'GEOMETRY')) {
      recommendations.push('检查几何数据完整性，确保所有节点和元素定义正确');
    }
    
    if (errors.some(e => e.category === 'MATERIAL')) {
      recommendations.push('完善材料属性定义，确保包含所有必需的力学参数');
    }
    
    // 基于警告生成建议
    const performanceWarnings = warnings.filter(w => w.category === 'PERFORMANCE');
    if (performanceWarnings.length > 0) {
      recommendations.push('优化计算参数以提高求解性能，考虑减少精度要求或增加硬件资源');
    }
    
    const qualityWarnings = warnings.filter(w => w.category === 'QUALITY');
    if (qualityWarnings.length > 0) {
      recommendations.push('提高网格质量，使用更好的网格生成参数');
    }
    
    // 基于数据规模生成建议
    if (dataPackage.nodes.length > 50000) {
      recommendations.push('节点数量较多，建议启用并行计算和GPU加速');
    }
    
    // 偏移相关建议
    if (dataPackage.offsetInstructions) {
      const hasLowQualityOffsets = dataPackage.offsetInstructions.offsetElements.some(
        e => e.offsetInfo && e.offsetInfo.qualityMetrics.qualityScore < 80
      );
      
      if (hasLowQualityOffsets) {
        recommendations.push('部分偏移质量较低，建议调整偏移参数或网格密度');
      }
    }
    
    // 兼容性建议
    if (dataPackage.version !== '1.0.0') {
      recommendations.push('建议使用最新版本的数据格式以获得最佳兼容性');
    }
  }

  /**
   * 计算验证得分
   */
  private calculateValidationScore(
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): number {
    let score = 100;
    
    // 根据错误严重性扣分
    for (const error of errors) {
      switch (error.severity) {
        case 'CRITICAL':
          score -= 25;
          break;
        case 'HIGH':
          score -= 15;
          break;
        case 'MEDIUM':
          score -= 5;
          break;
      }
    }
    
    // 根据警告影响扣分
    for (const warning of warnings) {
      switch (warning.impact) {
        case 'HIGH':
          score -= 3;
          break;
        case 'MEDIUM':
          score -= 2;
          break;
        case 'LOW':
          score -= 1;
          break;
      }
    }
    
    return Math.max(0, score);
  }

  // ==================== 辅助验证函数 ====================

  private isValidId(id: string): boolean {
    return /^[a-zA-Z0-9_-]+$/.test(id) && id.length > 0 && id.length <= 100;
  }

  private isValidTimestamp(timestamp: string): boolean {
    return !isNaN(Date.parse(timestamp));
  }

  private isCompatibleVersion(version: string): boolean {
    return /^\d+\.\d+\.\d+$/.test(version);
  }

  private isValidNode(node: any): boolean {
    return node && 
           typeof node.id === 'string' && 
           Array.isArray(node.coordinates) && 
           node.coordinates.length === 3 &&
           node.coordinates.every((coord: any) => typeof coord === 'number');
  }

  private isValidMaterial(material: any): boolean {
    return material &&
           typeof material.id === 'string' &&
           material.properties &&
           typeof material.properties.elasticModulus === 'number' &&
           typeof material.properties.poissonRatio === 'number' &&
           typeof material.properties.density === 'number';
  }

  private log(message: string): void {
    this.validationLog.push(`[${new Date().toISOString()}] ${message}`);
    console.log(`🔍 ${message}`);
  }

  // ==================== 3号专家数据对接测试 ====================

  /**
   * 模拟3号专家的响应处理
   */
  public simulateTerraResponse(dataPackage: TerraDataPackage): TerraProcessingFeedback {
    console.log('🤖 模拟3号专家处理数据包...');
    
    const processingTime = Math.random() * 2000 + 1000; // 1-3秒
    const elementCount = dataPackage.offsetInstructions?.offsetElements.length || 0;
    
    // 模拟处理结果
    const feedback: TerraProcessingFeedback = {
      instructionId: dataPackage.offsetInstructions?.instructionId || 'unknown',
      status: Math.random() > 0.1 ? 'COMPLETED' : 'ERROR', // 90%成功率
      timestamp: new Date().toISOString(),
      
      progress: {
        totalElements: elementCount,
        processedElements: elementCount,
        offsetElementsProcessed: elementCount,
        boundaryMappingsApplied: dataPackage.offsetInstructions?.boundaryMappings.length || 0
      },
      
      qualityValidation: {
        passed: Math.random() > 0.2, // 80%通过率
        elementQualityResults: [],
        overallQualityScore: 70 + Math.random() * 30 // 70-100分
      },
      
      performanceMetrics: {
        processingTimeMs: processingTime,
        memoryUsageMB: elementCount * 0.5 + Math.random() * 100,
        cpuUsagePercent: 60 + Math.random() * 30,
        convergenceAchieved: Math.random() > 0.15, // 85%收敛
        iterationsRequired: Math.floor(Math.random() * 50) + 10
      },
      
      issues: []
    };
    
    // 根据数据质量添加问题
    const validationResult = this.validateDataPackage(dataPackage);
    if (validationResult.score < 80) {
      feedback.issues.push({
        severity: 'WARNING',
        category: 'GEOMETRY',
        message: '数据质量较低，可能影响计算精度',
        suggestedFix: '提高网格质量或调整建模参数'
      });
    }
    
    console.log(`✅ 模拟处理完成，状态: ${feedback.status}`);
    return feedback;
  }

  /**
   * 测试完整的数据传输流程
   */
  public async testDataTransferWorkflow(
    offsetResult: OffsetResult,
    originalGeometry: THREE.BufferGeometry
  ): Promise<{
    validation: ValidationResult;
    kratosFeedback: TerraProcessingFeedback;
    testReport: DataTransferTestReport;
  }> {
    console.log('🧪 开始数据传输流程测试...');
    const testStartTime = performance.now();
    
    try {
      // 1. 创建测试数据包
      const testDataPackage = this.createTestDataPackage(offsetResult, originalGeometry);
      
      // 2. 验证数据包
      const validation = this.validateDataPackage(testDataPackage);
      
      // 3. 模拟3号专家处理
      const kratosFeedback = this.simulateTerraResponse(testDataPackage);
      
      // 4. 生成测试报告
      const testTime = performance.now() - testStartTime;
      const testReport: DataTransferTestReport = {
        testId: `test_${Date.now()}`,
        timestamp: new Date().toISOString(),
        testDuration: testTime,
        dataPackageSize: JSON.stringify(testDataPackage).length,
        validationPassed: validation.isValid,
        kratosProcessingSuccessful: kratosFeedback.status === 'COMPLETED',
        overallSuccess: validation.isValid && kratosFeedback.status === 'COMPLETED',
        performanceMetrics: {
          validationTime: validation.performanceMetrics.validationTime,
          simulatedProcessingTime: kratosFeedback.performanceMetrics.processingTimeMs,
          totalTime: testTime,
          memoryUsage: validation.performanceMetrics.memoryRequirement
        },
        issues: [
          ...validation.errors.map(e => `验证错误: ${e.message}`),
          ...validation.warnings.map(w => `验证警告: ${w.message}`),
          ...kratosFeedback.issues.map(i => `Terra问题: ${i.message}`)
        ]
      };
      
      console.log(`🎯 数据传输测试完成，总体成功: ${testReport.overallSuccess}`);
      
      return {
        validation,
        kratosFeedback,
        testReport
      };
      
    } catch (error) {
      console.error('❌ 数据传输测试失败:', error);
      throw error;
    }
  }

  /**
   * 创建测试用数据包
   */
  private createTestDataPackage(
    offsetResult: OffsetResult,
    originalGeometry: THREE.BufferGeometry
  ): TerraDataPackage {
    // 提取节点位置
    const positions = offsetResult.offsetGeometry.attributes.position.array as Float32Array;
    const nodes = [];
    
    for (let i = 0; i < positions.length; i += 3) {
      nodes.push({
        id: `N${Math.floor(i / 3) + 1}`,
        coordinates: [positions[i], positions[i + 1], positions[i + 2]] as [number, number, number]
      });
    }
    
    // 创建测试材料
    const materials = [{
      id: 'test_concrete',
      type: 'CONCRETE' as const,
      properties: {
        elasticModulus: 30e9,
        poissonRatio: 0.2,
        density: 2500
      }
    }];
    
    // 创建偏移指令
    const offsetInstruction: TerraOffsetInstruction = {
      instructionId: `test_offset_${Date.now()}`,
      timestamp: new Date().toISOString(),
      offsetElements: [{
        elementId: 'test_wall_001',
        elementType: 'SHELL',
        hasOffset: true,
        offsetInfo: {
          offsetDistance: 0.1,
          offsetDirection: 'inward',
          originalNodePositions: this.extractNodePositions(originalGeometry),
          offsetNodePositions: this.extractNodePositions(offsetResult.offsetGeometry),
          offsetVectors: offsetResult.offsetVector.map(v => [v.x, v.y, v.z]),
          qualityMetrics: {
            minJacobian: offsetResult.qualityMetrics.minJacobian,
            maxAspectRatio: offsetResult.qualityMetrics.maxAspectRatio,
            qualityScore: offsetResult.qualityMetrics.averageElementQuality * 100
          }
        }
      }],
      boundaryMappings: [],
      solverRecommendations: {
        enableShellOffsetSupport: true,
        recommendedIntegrationScheme: 'GAUSS'
      },
      qualityRequirements: TERRA_INTEGRATION_CONSTANTS.DEFAULT_QUALITY_REQUIREMENTS
    };
    
    return {
      packageId: `test_package_${Date.now()}`,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      nodes,
      materials,
      offsetInstructions: offsetInstruction,
      solverConfiguration: {
        solverType: 'TERRA_STRUCTURAL',
        analysisType: 'STATIC',
        convergenceCriteria: {
          solutionRelativeTolerance: 1e-6,
          solutionAbsoluteTolerance: 1e-9,
          residualRelativeTolerance: 1e-6,
          residualAbsoluteTolerance: 1e-9,
          maxIterations: 100
        },
        enableOffsetShellSupport: true,
        enableCompactionZoneProcessing: false,
        enableContactProcessing: false,
        parallelization: {
          enableOMP: true,
          numThreads: Math.min(4, navigator.hardwareConcurrency)
        }
      },
      validationRequirements: {
        geometryValidation: {
          checkElementQuality: true,
          minJacobian: 0.1,
          maxAspectRatio: 10.0
        },
        offsetValidation: {
          checkOffsetAccuracy: true,
          maxOffsetError: 1.0,
          validateBoundaryMapping: true
        },
        pileValidation: {
          validateCompactionZones: false,
          checkContactInterfaces: false,
          validateMaterialTransitions: false
        },
        performanceRequirements: {
          maxProcessingTime: 30,
          maxMemoryUsage: 2048,
          targetAccuracy: 0.99
        }
      }
    };
  }

  private extractNodePositions(geometry: THREE.BufferGeometry): number[][] {
    const positions = geometry.attributes.position.array as Float32Array;
    const nodePositions: number[][] = [];
    
    for (let i = 0; i < positions.length; i += 3) {
      nodePositions.push([positions[i], positions[i + 1], positions[i + 2]]);
    }
    
    return nodePositions;
  }
}

// ==================== 测试报告接口 ====================

interface DataTransferTestReport {
  testId: string;
  timestamp: string;
  testDuration: number;
  dataPackageSize: number;
  validationPassed: boolean;
  kratosProcessingSuccessful: boolean;
  overallSuccess: boolean;
  performanceMetrics: {
    validationTime: number;
    simulatedProcessingTime: number;
    totalTime: number;
    memoryUsage: number;
  };
  issues: string[];
}

export default TerraDataValidator;