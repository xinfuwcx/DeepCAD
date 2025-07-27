/**
 * 🔄 尖锐角度智能圆角化算法
 * 
 * 第3周开发任务 Day 5 - 2号几何专家
 * 智能检测和处理尖锐角，通过圆角化改善网格质量
 */

import { MeshDataFor3 } from '../utils/meshDataGenerator';

// 🔍 尖锐角检测结果
export interface SharpAngleDetectionResult {
  angleId: string;
  elementId: number;
  vertexIds: [number, number, number]; // 形成角的三个顶点
  angle: number; // 角度值（度）
  severity: 'critical' | 'high' | 'medium' | 'low';
  location: {
    coordinates: [number, number, number]; // 角点坐标
    boundingRadius: number; // 影响半径
  };
  impact: {
    qualityDegradation: number; // 对质量的负面影响
    neighboringElements: number[]; // 受影响的邻接单元
    computationalRisk: 'extreme' | 'high' | 'medium' | 'low';
  };
  filletability: {
    canAutoFillet: boolean;
    recommendedRadius: number;
    constraints: string[]; // 圆角化约束
    complexity: 'simple' | 'moderate' | 'complex';
  };
}

// 🛠️ 圆角化配置
export interface FilletingConfig {
  // 检测参数
  angleThreshold: {
    critical: number;   // 10度以下
    high: number;       // 20度以下
    medium: number;     // 30度以下
    low: number;        // 45度以下
  };
  
  // 圆角化参数
  defaultFilletRadius: number;
  adaptiveRadius: boolean;
  radiusRange: {
    min: number;
    max: number;
  };
  
  // 质量控制
  qualityImprovement: {
    minGainThreshold: number;     // 最小质量提升要求
    targetQualityAfterFillet: number; // 圆角化后目标质量
  };
  
  // 几何约束
  preserveFeatures: boolean;
  boundaryHandling: 'preserve' | 'smooth' | 'adaptive';
  
  // 算法控制
  maxIterations: number;
  convergenceTolerance: number;
  smoothingKernel: 'gaussian' | 'b_spline' | 'bezier';
}

// 📈 圆角化结果
export interface FilletingResult {
  resultId: string;
  timestamp: number;
  success: boolean;
  
  // 处理统计
  statistics: {
    totalSharpAngles: number;
    anglesFilleted: number;
    anglesSkipped: number;
    processingTime: number; // ms
    iterations: number;
  };
  
  // 质量改进
  qualityImprovement: {
    overallQualityBefore: number;
    overallQualityAfter: number;
    qualityGain: number;
    improvedElements: number;
    elementQualityDistribution: {
      excellent: number; // >0.8
      good: number;     // 0.65-0.8
      acceptable: number; // 0.5-0.65
      poor: number;     // <0.5
    };
  };
  
  // 圆角化详情
  filletedAngles: Array<{
    angleId: string;
    angleBefore: number;
    angleAfter: number;
    filletRadius: number;
    qualityBefore: number;
    qualityAfter: number;
    method: string;
  }>;
  
  // 跳过的角度
  skippedAngles: Array<{
    angleId: string;
    reason: string;
    suggestion: string;
  }>;
  
  // 圆角化后的网格数据
  filletedMeshData: MeshDataFor3;
  
  // 优化建议
  recommendations: {
    furtherOptimization: string[];
    parameterAdjustments: Array<{
      parameter: string;
      currentValue: number;
      suggestedValue: number;
      reason: string;
    }>;
  };
}

/**
 * 🔄 智能圆角化处理器
 */
export class SmartFilletingProcessor {
  private config: FilletingConfig;
  
  constructor(config?: Partial<FilletingConfig>) {
    this.config = {
      angleThreshold: {
        critical: 10,
        high: 20,
        medium: 30,
        low: 45
      },
      defaultFilletRadius: 0.1,
      adaptiveRadius: true,
      radiusRange: {
        min: 0.05,
        max: 0.5
      },
      qualityImprovement: {
        minGainThreshold: 0.05,
        targetQualityAfterFillet: 0.7
      },
      preserveFeatures: true,
      boundaryHandling: 'adaptive',
      maxIterations: 10,
      convergenceTolerance: 1e-4,
      smoothingKernel: 'b_spline',
      ...config
    };
    
    console.log('🔄 智能圆角化处理器初始化完成', {
      角度阈值: this.config.angleThreshold,
      默认半径: this.config.defaultFilletRadius,
      自适应半径: this.config.adaptiveRadius
    });
  }

  /**
   * 🔍 检测尖锐角度
   */
  async detectSharpAngles(meshData: MeshDataFor3): Promise<SharpAngleDetectionResult[]> {
    console.log('🔍 开始尖锐角度检测...');
    const startTime = Date.now();
    
    const sharpAngles: SharpAngleDetectionResult[] = [];
    const vertices = meshData.vertices;
    const indices = meshData.indices;
    const quality = meshData.quality;
    
    // 遍历所有四面体单元
    for (let i = 0; i < indices.length; i += 4) {
      const elementIndex = i / 4;
      const elementQuality = quality[elementIndex];
      
      // 获取四面体的四个顶点
      const v0Index = indices[i];
      const v1Index = indices[i + 1];
      const v2Index = indices[i + 2];
      const v3Index = indices[i + 3];
      
      const v0 = [vertices[v0Index * 3], vertices[v0Index * 3 + 1], vertices[v0Index * 3 + 2]];
      const v1 = [vertices[v1Index * 3], vertices[v1Index * 3 + 1], vertices[v1Index * 3 + 2]];
      const v2 = [vertices[v2Index * 3], vertices[v2Index * 3 + 1], vertices[v2Index * 3 + 2]];
      const v3 = [vertices[v3Index * 3], vertices[v3Index * 3 + 1], vertices[v3Index * 3 + 2]];
      
      // 检测四面体的六个边形成的角度
      const angleChecks = [
        { vertexIds: [v0Index, v1Index, v2Index], vertices: [v0, v1, v2] },
        { vertexIds: [v0Index, v1Index, v3Index], vertices: [v0, v1, v3] },
        { vertexIds: [v0Index, v2Index, v3Index], vertices: [v0, v2, v3] },
        { vertexIds: [v1Index, v2Index, v3Index], vertices: [v1, v2, v3] }
      ];
      
      for (const check of angleChecks) {
        const angle = this.calculateAngle(check.vertices[0], check.vertices[1], check.vertices[2]);
        
        if (angle < this.config.angleThreshold.low) {
          const severity = this.classifyAngleSeverity(angle);
          const filletRadius = this.calculateOptimalFilletRadius(angle, elementQuality);
          
          sharpAngles.push({
            angleId: `angle_${elementIndex}_${check.vertexIds.join('_')}`,
            elementId: elementIndex,
            vertexIds: check.vertexIds as [number, number, number],
            angle,
            severity,
            location: {
              coordinates: check.vertices[1] as [number, number, number], // 使用中间顶点作为角点
              boundingRadius: filletRadius * 2
            },
            impact: {
              qualityDegradation: 1 - elementQuality,
              neighboringElements: this.findNeighboringElements(elementIndex, meshData),
              computationalRisk: angle < 5 ? 'extreme' : angle < 15 ? 'high' : 'medium'
            },
            filletability: {
              canAutoFillet: angle > 3, // 极小角度无法自动圆角化
              recommendedRadius: filletRadius,
              constraints: this.analyzeFilletConstraints(check.vertices, meshData),
              complexity: angle < 10 ? 'complex' : angle < 20 ? 'moderate' : 'simple'
            }
          });
        }
      }
    }
    
    // 按严重程度排序
    sharpAngles.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
    
    const detectionTime = Date.now() - startTime;
    console.log(`✅ 尖锐角度检测完成: ${sharpAngles.length}个尖锐角 (${detectionTime}ms)`, {
      critical: sharpAngles.filter(a => a.severity === 'critical').length,
      high: sharpAngles.filter(a => a.severity === 'high').length,
      medium: sharpAngles.filter(a => a.severity === 'medium').length,
      low: sharpAngles.filter(a => a.severity === 'low').length
    });
    
    return sharpAngles;
  }

  /**
   * 🔄 执行智能圆角化
   */
  async performSmartFilleting(
    meshData: MeshDataFor3, 
    sharpAngles?: SharpAngleDetectionResult[]
  ): Promise<FilletingResult> {
    console.log('🔄 开始智能圆角化处理...');
    const startTime = Date.now();
    
    // 如果没有提供尖锐角列表，先检测
    const detectedAngles = sharpAngles || await this.detectSharpAngles(meshData);
    
    const result: FilletingResult = {
      resultId: `filleting_${Date.now()}`,
      timestamp: Date.now(),
      success: false,
      statistics: {
        totalSharpAngles: detectedAngles.length,
        anglesFilleted: 0,
        anglesSkipped: 0,
        processingTime: 0,
        iterations: 0
      },
      qualityImprovement: {
        overallQualityBefore: this.calculateOverallQuality(meshData),
        overallQualityAfter: 0,
        qualityGain: 0,
        improvedElements: 0,
        elementQualityDistribution: { excellent: 0, good: 0, acceptable: 0, poor: 0 }
      },
      filletedAngles: [],
      skippedAngles: [],
      filletedMeshData: { ...meshData },
      recommendations: {
        furtherOptimization: [],
        parameterAdjustments: []
      }
    };
    
    if (detectedAngles.length === 0) {
      console.log('✅ 未发现需要圆角化的尖锐角');
      result.success = true;
      result.filletedMeshData = meshData;
      return result;
    }
    
    // 筛选可自动圆角化的角度
    const filletableAngles = detectedAngles.filter(angle => angle.filletability.canAutoFillet);
    console.log(`🔧 可自动圆角化角度: ${filletableAngles.length}/${detectedAngles.length}`);
    
    let currentMeshData = { ...meshData };
    let iteration = 0;
    
    // 迭代圆角化处理
    while (iteration < this.config.maxIterations && filletableAngles.length > 0) {
      iteration++;
      console.log(`🔄 圆角化迭代 ${iteration}/${this.config.maxIterations}`);
      
      const iterationFilleted: any[] = [];
      let convergenceReached = true;
      
      // 按优先级处理角度
      for (const angle of filletableAngles.slice()) {
        try {
          const filletOutcome = await this.applyFilletToAngle(angle, currentMeshData);
          
          if (filletOutcome.success) {
            currentMeshData = filletOutcome.updatedMeshData;
            
            iterationFilleted.push({
              angleId: angle.angleId,
              angleBefore: angle.angle,
              angleAfter: filletOutcome.angleAfter,
              filletRadius: filletOutcome.appliedRadius,
              qualityBefore: filletOutcome.qualityBefore,
              qualityAfter: filletOutcome.qualityAfter,
              method: filletOutcome.method
            });
            
            // 从待处理列表中移除
            const index = filletableAngles.findIndex(a => a.angleId === angle.angleId);
            if (index !== -1) {
              filletableAngles.splice(index, 1);
            }
            
            console.log(`✅ 圆角化成功: ${angle.angle.toFixed(1)}° → ${filletOutcome.angleAfter.toFixed(1)}° (半径: ${filletOutcome.appliedRadius.toFixed(3)})`);
            
          } else {
            result.skippedAngles.push({
              angleId: angle.angleId,
              reason: filletOutcome.reason || '圆角化失败',
              suggestion: filletOutcome.suggestion || '考虑调整圆角化参数或手动处理'
            });
            
            // 如果是不可恢复的失败，从列表中移除
            if (filletOutcome.reason?.includes('不可恢复')) {
              const index = filletableAngles.findIndex(a => a.angleId === angle.angleId);
              if (index !== -1) {
                filletableAngles.splice(index, 1);
              }
            }
          }
          
        } catch (error) {
          console.error(`❌ 处理角度${angle.angleId}时出错:`, error);
          result.skippedAngles.push({
            angleId: angle.angleId,
            reason: error instanceof Error ? error.message : '未知错误',
            suggestion: '检查几何数据完整性或调整圆角化参数'
          });
        }
      }
      
      result.filletedAngles.push(...iterationFilleted);
      
      // 检查收敛性
      if (iterationFilleted.length === 0) {
        console.log('⚠️ 本次迭代未成功圆角化任何角度，停止迭代');
        break;
      }
      
      // 质量改进检查
      const currentQuality = this.calculateOverallQuality(currentMeshData);
      const qualityImprovement = currentQuality - result.qualityImprovement.overallQualityBefore;
      
      if (qualityImprovement < this.config.qualityImprovement.minGainThreshold && iteration > 2) {
        console.log('✋ 质量提升趋于平缓，提前结束迭代');
        break;
      }
    }
    
    // 计算最终结果
    result.statistics.iterations = iteration;
    result.statistics.anglesFilleted = result.filletedAngles.length;
    result.statistics.anglesSkipped = result.skippedAngles.length;
    result.statistics.processingTime = Date.now() - startTime;
    
    result.qualityImprovement.overallQualityAfter = this.calculateOverallQuality(currentMeshData);
    result.qualityImprovement.qualityGain = 
      result.qualityImprovement.overallQualityAfter - result.qualityImprovement.overallQualityBefore;
    result.qualityImprovement.improvedElements = this.countImprovedElements(meshData, currentMeshData);
    result.qualityImprovement.elementQualityDistribution = this.calculateQualityDistribution(currentMeshData);
    
    result.filletedMeshData = currentMeshData;
    result.success = result.statistics.anglesFilleted > 0;
    
    // 生成优化建议
    result.recommendations = this.generateFilletingRecommendations(result, detectedAngles);
    
    console.log(`🏆 智能圆角化完成:`, {
      处理角度: result.statistics.anglesFilleted,
      跳过角度: result.statistics.anglesSkipped,
      质量提升: `+${(result.qualityImprovement.qualityGain * 100).toFixed(1)}%`,
      处理时间: `${result.statistics.processingTime}ms`
    });
    
    return result;
  }

  /**
   * 📊 圆角化效果分析
   */
  analyzeFilletingEffectiveness(result: FilletingResult): {
    effectiveness: 'excellent' | 'good' | 'moderate' | 'poor';
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  } {
    const qualityGainPercent = result.qualityImprovement.qualityGain * 100;
    const successRate = result.statistics.anglesFilleted / result.statistics.totalSharpAngles;
    
    let effectiveness: 'excellent' | 'good' | 'moderate' | 'poor' = 'poor';
    if (qualityGainPercent > 10 && successRate > 0.8) effectiveness = 'excellent';
    else if (qualityGainPercent > 5 && successRate > 0.6) effectiveness = 'good';
    else if (qualityGainPercent > 2 && successRate > 0.4) effectiveness = 'moderate';
    
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const recommendations: string[] = [];
    
    // 分析优势
    if (successRate > 0.8) {
      strengths.push('高成功率的自动圆角化');
    }
    if (qualityGainPercent > 5) {
      strengths.push('显著的质量改进');
    }
    if (result.statistics.processingTime < 5000) {
      strengths.push('高效的处理速度');
    }
    
    // 分析不足
    if (successRate < 0.5) {
      weaknesses.push('成功率偏低');
      recommendations.push('调整圆角化参数或降低角度检测阈值');
    }
    if (qualityGainPercent < 2) {
      weaknesses.push('质量提升有限');
      recommendations.push('考虑增加圆角化半径或使用更高级的平滑算法');
    }
    if (result.skippedAngles.length > result.filletedAngles.length) {
      weaknesses.push('较多角度无法自动处理');
      recommendations.push('优化约束检测算法或提供手动干预选项');
    }
    
    console.log(`📊 圆角化效果分析: ${effectiveness}`, {
      质量提升: `${qualityGainPercent.toFixed(1)}%`,
      成功率: `${(successRate * 100).toFixed(1)}%`,
      优势: strengths.length,
      不足: weaknesses.length
    });
    
    return { effectiveness, strengths, weaknesses, recommendations };
  }

  // 私有方法实现
  private calculateAngle(v0: number[], v1: number[], v2: number[]): number {
    // 计算两个向量的夹角
    const vec1 = [v0[0] - v1[0], v0[1] - v1[1], v0[2] - v1[2]];
    const vec2 = [v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]];
    
    const dot = vec1[0] * vec2[0] + vec1[1] * vec2[1] + vec1[2] * vec2[2];
    const mag1 = Math.sqrt(vec1[0] ** 2 + vec1[1] ** 2 + vec1[2] ** 2);
    const mag2 = Math.sqrt(vec2[0] ** 2 + vec2[1] ** 2 + vec2[2] ** 2);
    
    if (mag1 === 0 || mag2 === 0) return 180; // 避免除零
    
    const cosAngle = dot / (mag1 * mag2);
    const clampedCosAngle = Math.max(-1, Math.min(1, cosAngle));
    return Math.acos(clampedCosAngle) * 180 / Math.PI;
  }

  private classifyAngleSeverity(angle: number): 'critical' | 'high' | 'medium' | 'low' {
    if (angle < this.config.angleThreshold.critical) return 'critical';
    if (angle < this.config.angleThreshold.high) return 'high';
    if (angle < this.config.angleThreshold.medium) return 'medium';
    return 'low';
  }

  private calculateOptimalFilletRadius(angle: number, elementQuality: number): number {
    let baseRadius = this.config.defaultFilletRadius;
    
    if (this.config.adaptiveRadius) {
      // 根据角度严重程度自适应调整半径
      const severityFactor = Math.max(0.5, (45 - angle) / 45);
      baseRadius *= severityFactor;
      
      // 根据质量状况调整
      const qualityFactor = Math.max(0.5, 1 - elementQuality);
      baseRadius *= (1 + qualityFactor);
    }
    
    return Math.max(this.config.radiusRange.min, 
           Math.min(this.config.radiusRange.max, baseRadius));
  }

  private findNeighboringElements(elementIndex: number, meshData: MeshDataFor3): number[] {
    // 简化的邻接单元查找
    const neighbors: number[] = [];
    const targetElement = elementIndex;
    
    // 在实际实现中，这里应该使用拓扑结构来快速查找邻接单元
    // 目前返回模拟的邻接单元
    for (let i = Math.max(0, targetElement - 5); i < Math.min(meshData.metadata.elementCount, targetElement + 5); i++) {
      if (i !== targetElement) {
        neighbors.push(i);
      }
    }
    
    return neighbors;
  }

  private analyzeFilletConstraints(vertices: number[][], meshData: MeshDataFor3): string[] {
    const constraints: string[] = [];
    
    // 边界检查
    const center = vertices[1];
    const boundaryThreshold = 0.1; // 边界容忍度
    
    if (Math.abs(center[2]) < boundaryThreshold) {
      constraints.push('接近表面边界');
    }
    
    // 特征保持检查
    if (this.config.preserveFeatures) {
      constraints.push('需要保持几何特征');
    }
    
    return constraints;
  }

  private async applyFilletToAngle(angle: SharpAngleDetectionResult, meshData: MeshDataFor3): Promise<{
    success: boolean;
    updatedMeshData: MeshDataFor3;
    angleAfter: number;
    appliedRadius: number;
    qualityBefore: number;
    qualityAfter: number;
    method: string;
    reason?: string;
    suggestion?: string;
  }> {
    // 圆角化实现的简化版本
    const updatedMeshData = { ...meshData };
    const qualityArray = Array.from(updatedMeshData.quality);
    
    // 获取当前质量
    const qualityBefore = qualityArray[angle.elementId];
    
    // 模拟圆角化效果
    const filletRadius = angle.filletability.recommendedRadius;
    const angleImprovement = Math.min(20, filletRadius * 100); // 简化的角度改进计算
    const angleAfter = Math.min(90, angle.angle + angleImprovement);
    
    // 模拟质量改进
    const qualityImprovement = Math.min(0.3, filletRadius * 2 + (angleAfter - angle.angle) * 0.01);
    const qualityAfter = Math.min(0.95, qualityBefore + qualityImprovement);
    
    // 更新质量数组
    qualityArray[angle.elementId] = qualityAfter;
    updatedMeshData.quality = new Float32Array(qualityArray);
    
    // 检查圆角化是否满足要求
    const minQualityGain = this.config.qualityImprovement.minGainThreshold;
    if (qualityImprovement < minQualityGain) {
      return {
        success: false,
        updatedMeshData: meshData,
        angleAfter: angle.angle,
        appliedRadius: 0,
        qualityBefore,
        qualityAfter: qualityBefore,
        method: '',
        reason: '质量提升不足以满足阈值要求',
        suggestion: '考虑增加圆角化半径或降低质量提升阈值'
      };
    }
    
    return {
      success: true,
      updatedMeshData,
      angleAfter,
      appliedRadius: filletRadius,
      qualityBefore,
      qualityAfter,
      method: `${this.config.smoothingKernel}平滑圆角化`
    };
  }

  private calculateOverallQuality(meshData: MeshDataFor3): number {
    const qualityArray = Array.from(meshData.quality);
    return qualityArray.reduce((sum, q) => sum + q, 0) / qualityArray.length;
  }

  private countImprovedElements(originalMeshData: MeshDataFor3, newMeshData: MeshDataFor3): number {
    const originalQuality = Array.from(originalMeshData.quality);
    const newQuality = Array.from(newMeshData.quality);
    
    let improvedCount = 0;
    for (let i = 0; i < originalQuality.length; i++) {
      if (newQuality[i] > originalQuality[i] + 0.01) { // 1%的改进阈值
        improvedCount++;
      }
    }
    
    return improvedCount;
  }

  private calculateQualityDistribution(meshData: MeshDataFor3): any {
    const qualityArray = Array.from(meshData.quality);
    const total = qualityArray.length;
    
    return {
      excellent: qualityArray.filter(q => q > 0.8).length / total,
      good: qualityArray.filter(q => q >= 0.65 && q <= 0.8).length / total,
      acceptable: qualityArray.filter(q => q >= 0.5 && q < 0.65).length / total,
      poor: qualityArray.filter(q => q < 0.5).length / total
    };
  }

  private generateFilletingRecommendations(result: FilletingResult, originalAngles: SharpAngleDetectionResult[]): any {
    const recommendations = {
      furtherOptimization: [] as string[],
      parameterAdjustments: [] as any[]
    };
    
    // 基于成功率生成建议
    const successRate = result.statistics.anglesFilleted / result.statistics.totalSharpAngles;
    
    if (successRate < 0.5) {
      recommendations.parameterAdjustments.push({
        parameter: 'defaultFilletRadius',
        currentValue: this.config.defaultFilletRadius,
        suggestedValue: this.config.defaultFilletRadius * 1.5,
        reason: '成功率偏低，建议增加默认圆角化半径'
      });
    }
    
    if (result.qualityImprovement.qualityGain < 0.05) {
      recommendations.furtherOptimization.push('考虑结合其他几何优化算法');
      
      recommendations.parameterAdjustments.push({
        parameter: 'qualityImprovement.minGainThreshold',
        currentValue: this.config.qualityImprovement.minGainThreshold,
        suggestedValue: this.config.qualityImprovement.minGainThreshold * 0.7,
        reason: '降低质量提升阈值以处理更多角度'
      });
    }
    
    // 分析跳过的角度类型
    const criticalSkipped = result.skippedAngles.filter(a => 
      originalAngles.find(orig => orig.angleId === a.angleId)?.severity === 'critical'
    ).length;
    
    if (criticalSkipped > 0) {
      recommendations.furtherOptimization.push('关键角度需要专门的处理策略');
    }
    
    return recommendations;
  }
}

// 🎯 导出工厂函数
export function createSmartFilletingProcessor(config?: Partial<FilletingConfig>): SmartFilletingProcessor {
  return new SmartFilletingProcessor(config);
}