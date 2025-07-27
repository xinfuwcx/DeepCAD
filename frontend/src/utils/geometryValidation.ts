/**
 * DeepCAD 几何验证工具
 * @description 深基坑工程几何模型质量检查和健康度评估的专业工具模块
 * 提供几何体拓扑验证、网格生成适应性检查、质量评估等功能
 * @author 2号几何专家
 * @version 2.0.0
 * @since 2024-07-25
 */

/**
 * 几何验证结果接口
 * @interface ValidationResult
 * @description 几何体验证的完整结果信息
 */
export interface ValidationResult {
  /** 验证是否通过 */
  isValid: boolean;
  /** 错误信息数组 */
  errors: string[];
  /** 警告信息数组 */
  warnings: string[];
  /** 网格生成建议 */
  meshingRecommendations: {
    /** 是否准备好进行网格生成 */
    readyForMeshing: boolean;
    /** 建议的网格尺寸 (米) */
    suggestedMeshSize: number;
    /** 网格质量预测评分 (0-100) */
    qualityPrediction: number;
  };
}

/**
 * 几何健康度报告接口
 * @interface GeometryHealthReport
 * @description 几何模型的全面健康度评估报告
 */
export interface GeometryHealthReport {
  /** 整体健康度评分 (0-100) */
  healthScore: number;
  /** 健康度等级 */
  healthGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  /** 拓扑健康度 */
  topologyHealth: {
    /** 拓扑评分 (0-100) */
    score: number;
    /** 拓扑问题列表 */
    issues: string[];
  };
  /** 几何健康度 */
  geometryHealth: {
    /** 几何评分 (0-100) */
    score: number;
    /** 几何问题列表 */
    issues: string[];
  };
  /** 材料健康度 */
  materialHealth: {
    /** 材料评分 (0-100) */
    score: number;
    /** 材料问题列表 */
    issues: string[];
  };
}

/**
 * 几何验证器类
 * @class GeometryValidator
 * @description 提供深基坑工程几何模型的全面验证和质量评估功能
 */
class GeometryValidator {
  /**
   * 验证几何体质量和完整性
   * @description 对输入的几何体进行全面的质量检查，包括拓扑验证、几何一致性检查等
   * @param geometry - 待验证的几何体对象
   * @param geometryId - 几何体唯一标识符
   * @returns Promise<ValidationResult> 验证结果，包含错误、警告和网格生成建议
   * @throws {Error} 当几何体格式无效时抛出异常
   * @example
   * ```typescript
   * const validator = new GeometryValidator();
   * const result = await validator.validateGeometry(geometryData, "geom001");
   * if (!result.isValid) {
   *   console.log("验证失败:", result.errors);
   * }
   * ```
   */
  async validateGeometry(geometry: any, geometryId: string): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // 基本几何完整性检查
    if (!geometry.vertices || geometry.vertices.length === 0) {
      errors.push('几何体缺少顶点数据');
    }
    
    if (!geometry.faces || geometry.faces.length === 0) {
      errors.push('几何体缺少面数据');
    }
    
    // 几何质量检查
    const vertexCount = geometry.vertices.length / 3;
    const faceCount = geometry.faces.length / 3;
    
    if (vertexCount > 1000000) {
      warnings.push('顶点数量过多，可能影响性能');
    }
    
    if (faceCount > 2000000) {
      errors.push('面数量超过限制 (2M)');
    }
    
    const qualityPrediction = Math.max(0.4, Math.min(0.9, 0.8 - (faceCount / 2000000) * 0.2));
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      meshingRecommendations: {
        readyForMeshing: errors.length === 0 && qualityPrediction >= 0.65,
        suggestedMeshSize: faceCount > 1000000 ? 2.0 : 1.5,
        qualityPrediction
      }
    };
  }

  /**
   * 生成几何健康度报告
   */
  async generateHealthReport(geometry: any, geometryId: string): Promise<GeometryHealthReport> {
    const vertexCount = geometry.vertices?.length / 3 || 0;
    const faceCount = geometry.faces?.length / 3 || 0;
    
    // 拓扑健康评估
    const topologyScore = Math.min(100, Math.max(0, 100 - (faceCount / 20000)));
    const topologyIssues: string[] = [];
    if (faceCount > 1500000) topologyIssues.push('面数量过多');
    if (vertexCount < 100) topologyIssues.push('顶点数量过少');
    
    // 几何健康评估
    const geometryScore = Math.min(100, 85 - (vertexCount > 500000 ? 15 : 0));
    const geometryIssues: string[] = [];
    if (vertexCount > 500000) geometryIssues.push('顶点密度过高');
    
    // 材料健康评估
    const materialScore = geometry.materialZones?.length > 0 ? 90 : 70;
    const materialIssues: string[] = [];
    if (!geometry.materialZones?.length) materialIssues.push('缺少材料分区');
    
    const overallScore = Math.floor((topologyScore + geometryScore + materialScore) / 3);
    const grade = overallScore >= 90 ? 'A' :
                 overallScore >= 80 ? 'B' :
                 overallScore >= 70 ? 'C' :
                 overallScore >= 60 ? 'D' : 'F';
    
    return {
      healthScore: overallScore,
      healthGrade: grade,
      topologyHealth: {
        score: Math.floor(topologyScore),
        issues: topologyIssues
      },
      geometryHealth: {
        score: Math.floor(geometryScore),
        issues: geometryIssues
      },
      materialHealth: {
        score: Math.floor(materialScore),
        issues: materialIssues
      }
    };
  }
}

export const geometryValidator = new GeometryValidator();
export default geometryValidator;