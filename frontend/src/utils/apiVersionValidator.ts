/**
 * API版本验证工具
 * DeepCAD Deep Excavation CAE Platform - API Version Validator
 * 
 * 作者：2号几何专家
 * 版本：v1.0.0
 * 创建日期：2025-01-25
 * 
 * 提供运行时API版本验证、数据完整性检查和自动修复功能
 */

import {
  ApiVersion,
  VersionedData,
  CompatibilityLevel,
  apiVersionManager,
  GeometryDataV1,
  GeometryDataV1_1,
  MeshQualityResultV1,
  STANDARD_DEFAULTS
} from '../interfaces/versionedApiSystem';

// ============================================================================
// 1. 验证结果接口
// ============================================================================

/**
 * API版本验证结果接口
 */
export interface ApiVersionValidationResult {
  /** 验证是否通过 */
  valid: boolean;
  /** 验证的版本 */
  version: ApiVersion;
  /** 严重错误列表 */
  errors: ValidationError[];
  /** 警告列表 */
  warnings: ValidationWarning[];
  /** 修复建议列表 */
  fixSuggestions: FixSuggestion[];
  /** 验证统计信息 */
  statistics: ValidationStatistics;
}

/**
 * 验证错误接口
 */
export interface ValidationError {
  /** 错误代码 */
  code: string;
  /** 错误消息 */
  message: string;
  /** 错误严重程度 */
  severity: 'critical' | 'major' | 'minor';
  /** 错误路径 */
  path: string;
  /** 错误上下文 */
  context: Record<string, any>;
  /** 是否可自动修复 */
  autoFixable: boolean;
}

/**
 * 验证警告接口
 */
export interface ValidationWarning {
  /** 警告代码 */
  code: string;
  /** 警告消息 */
  message: string;
  /** 警告类型 */
  type: 'compatibility' | 'performance' | 'deprecation' | 'best_practice';
  /** 警告路径 */
  path: string;
  /** 推荐行动 */
  recommendedAction: string;
}

/**
 * 修复建议接口
 */
export interface FixSuggestion {
  /** 建议类型 */
  type: 'migration' | 'format_update' | 'validation_fix' | 'optimization';
  /** 建议描述 */
  description: string;
  /** 修复复杂度 */
  complexity: 'trivial' | 'simple' | 'moderate' | 'complex';
  /** 预期效果 */
  expectedOutcome: string;
  /** 自动修复函数 */
  autoFix?: () => Promise<any>;
}

/**
 * 验证统计信息接口
 */
export interface ValidationStatistics {
  /** 验证开始时间 */
  startTime: number;
  /** 验证结束时间 */
  endTime: number;
  /** 验证耗时 (ms) */
  duration: number;
  /** 检查的字段数量 */
  fieldsChecked: number;
  /** 数据大小 (bytes) */
  dataSize: number;
  /** 性能评分 */
  performanceScore: number;
}

// ============================================================================
// 2. 核心验证器类
// ============================================================================

/**
 * API版本验证器主类
 * 提供完整的版本验证、数据完整性检查和自动修复功能
 */
export class ApiVersionValidator {
  private static instance: ApiVersionValidator;
  private validationRules: Map<string, ValidationRule[]> = new Map();
  private schemaCache: Map<string, any> = new Map();

  /**
   * 获取验证器单例实例
   */
  public static getInstance(): ApiVersionValidator {
    if (!ApiVersionValidator.instance) {
      ApiVersionValidator.instance = new ApiVersionValidator();
    }
    return ApiVersionValidator.instance;
  }

  /**
   * 私有构造函数
   */
  private constructor() {
    this.initializeDefaultRules();
  }

  /**
   * 初始化默认验证规则
   */
  private initializeDefaultRules(): void {
    // 几何数据验证规则
    this.addValidationRules('geometry', [
      {
        name: 'version_format_check',
        description: '检查版本格式是否符合语义化版本规范',
        severity: 'critical',
        validate: this.validateVersionFormat.bind(this)
      },
      {
        name: 'geometry_data_integrity',
        description: '检查几何数据完整性',
        severity: 'critical',
        validate: this.validateGeometryDataIntegrity.bind(this)
      },
      {
        name: 'performance_optimization',
        description: '检查性能优化机会',
        severity: 'minor',
        validate: this.validatePerformanceOptimization.bind(this)
      },
      {
        name: 'compatibility_check',
        description: '检查版本兼容性',
        severity: 'major',
        validate: this.validateVersionCompatibility.bind(this)
      }
    ]);

    // 网格质量结果验证规则
    this.addValidationRules('mesh_quality', [
      {
        name: 'quality_result_completeness',
        description: '检查质量结果数据完整性',
        severity: 'critical',
        validate: this.validateQualityResultCompleteness.bind(this)
      },
      {
        name: 'quality_score_range',
        description: '检查质量评分范围',
        severity: 'major',
        validate: this.validateQualityScoreRange.bind(this)
      }
    ]);
  }

  // ============================================================================
  // 3. 公共验证接口
  // ============================================================================

  /**
   * 验证版本化数据
   * @param data 待验证的版本化数据
   * @param dataType 数据类型
   * @returns 验证结果
   */
  public async validateVersionedData<T>(
    data: VersionedData<T>,
    dataType: string
  ): Promise<ApiVersionValidationResult> {
    const startTime = Date.now();
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const fixSuggestions: FixSuggestion[] = [];

    console.log(`🔍 开始验证 ${dataType} 数据版本: ${data.version.versionString}`);

    try {
      // Step 1: 基础版本格式验证
      await this.validateBasicVersionFormat(data, errors, warnings);

      // Step 2: 数据类型特定验证
      const rules = this.validationRules.get(dataType) || [];
      for (const rule of rules) {
        try {
          await rule.validate(data, errors, warnings, fixSuggestions);
        } catch (error) {
          errors.push({
            code: `RULE_${rule.name.toUpperCase()}_FAILED`,
            message: `验证规则 ${rule.name} 执行失败: ${(error as Error).message}`,
            severity: rule.severity,
            path: `validation.rules.${rule.name}`,
            context: { ruleName: rule.name, error: (error as Error).message },
            autoFixable: false
          });
        }
      }

      // Step 3: 生成修复建议
      this.generateAdditionalFixSuggestions(data, errors, warnings, fixSuggestions);

      const endTime = Date.now();
      const statistics: ValidationStatistics = {
        startTime,
        endTime,
        duration: endTime - startTime,
        fieldsChecked: this.countDataFields(data),
        dataSize: JSON.stringify(data).length,
        performanceScore: this.calculatePerformanceScore(data, endTime - startTime)
      };

      const result: ApiVersionValidationResult = {
        valid: errors.filter(e => e.severity === 'critical').length === 0,
        version: data.version,
        errors,
        warnings,
        fixSuggestions,
        statistics
      };

      console.log(`✅ ${dataType} 数据验证完成`, {
        有效性: result.valid ? '✅ 通过' : '❌ 失败',
        错误数量: errors.length,
        警告数量: warnings.length,
        修复建议: fixSuggestions.length,
        耗时: statistics.duration + 'ms'
      });

      return result;

    } catch (error) {
      console.error(`❌ ${dataType} 数据验证失败:`, error);
      
      const endTime = Date.now();
      return {
        valid: false,
        version: data.version,
        errors: [{
          code: 'VALIDATION_SYSTEM_FAILURE',
          message: `验证系统失败: ${(error as Error).message}`,
          severity: 'critical',
          path: 'validation.system',
          context: { error: (error as Error).message },
          autoFixable: false
        }],
        warnings,
        fixSuggestions,
        statistics: {
          startTime,
          endTime,
          duration: endTime - startTime,
          fieldsChecked: 0,
          dataSize: 0,
          performanceScore: 0
        }
      };
    }
  }

  /**
   * 批量验证多个版本化数据
   * @param dataList 数据列表
   * @returns 批量验证结果
   */
  public async batchValidateVersionedData(
    dataList: Array<{ data: VersionedData<any>; dataType: string }>
  ): Promise<{
    results: Array<ApiVersionValidationResult & { dataType: string }>;
    summary: {
      totalCount: number;
      validCount: number;
      invalidCount: number;
      totalErrors: number;
      totalWarnings: number;
      averageDuration: number;
    };
  }> {
    console.log(`🔍 开始批量验证 ${dataList.length} 个数据项...`);
    
    const results = [];
    let totalDuration = 0;
    let totalErrors = 0;
    let totalWarnings = 0;
    let validCount = 0;

    for (const { data, dataType } of dataList) {
      const result = await this.validateVersionedData(data, dataType);
      results.push({ ...result, dataType });
      
      totalDuration += result.statistics.duration;
      totalErrors += result.errors.length;
      totalWarnings += result.warnings.length;
      if (result.valid) validCount++;
    }

    const summary = {
      totalCount: dataList.length,
      validCount,
      invalidCount: dataList.length - validCount,
      totalErrors,
      totalWarnings,
      averageDuration: totalDuration / dataList.length
    };

    console.log('✅ 批量验证完成', summary);
    return { results, summary };
  }

  // ============================================================================
  // 4. 具体验证规则实现
  // ============================================================================

  /**
   * 验证版本格式
   */
  private async validateVersionFormat(
    data: VersionedData<any>,
    errors: ValidationError[],
    warnings: ValidationWarning[],
    fixSuggestions: FixSuggestion[]
  ): Promise<void> {
    const version = data.version;
    
    // 检查版本字符串格式
    const versionRegex = /^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9.-]+))?(?:\+([a-zA-Z0-9.-]+))?$/;
    if (!versionRegex.test(version.versionString)) {
      errors.push({
        code: 'INVALID_VERSION_FORMAT',
        message: `版本字符串格式无效: ${version.versionString}`,
        severity: 'critical',
        path: 'version.versionString',
        context: { versionString: version.versionString },
        autoFixable: true
      });

      fixSuggestions.push({
        type: 'format_update',
        description: '修正版本字符串格式',
        complexity: 'trivial',
        expectedOutcome: '版本字符串将符合语义化版本规范',
        autoFix: async () => {
          return `${version.major || 1}.${version.minor || 0}.${version.patch || 0}`;
        }
      });
    }

    // 检查版本组件一致性
    const parsedVersion = apiVersionManager.parseVersion(version.versionString);
    if (version.major !== parsedVersion.major ||
        version.minor !== parsedVersion.minor ||
        version.patch !== parsedVersion.patch) {
      errors.push({
        code: 'VERSION_COMPONENT_MISMATCH',
        message: '版本组件与版本字符串不一致',
        severity: 'major',
        path: 'version.components',
        context: { 
          declared: { major: version.major, minor: version.minor, patch: version.patch },
          parsed: { major: parsedVersion.major, minor: parsedVersion.minor, patch: parsedVersion.patch }
        },
        autoFixable: true
      });
    }

    // 检查版本是否受支持
    if (!apiVersionManager.isVersionSupported(version.versionString)) {
      warnings.push({
        code: 'UNSUPPORTED_VERSION',
        message: `版本 ${version.versionString} 不在支持列表中`,
        type: 'compatibility',
        path: 'version.versionString',
        recommendedAction: '考虑升级到支持的版本'
      });
    }
  }

  /**
   * 验证几何数据完整性
   */
  private async validateGeometryDataIntegrity(
    data: VersionedData<GeometryDataV1 | GeometryDataV1_1>,
    errors: ValidationError[],
    warnings: ValidationWarning[],
    fixSuggestions: FixSuggestion[]
  ): Promise<void> {
    const geometryData = data.data;

    // 检查必需字段
    const requiredFields = ['geometryId', 'vertices', 'faces'];
    for (const field of requiredFields) {
      if (!(field in geometryData) || geometryData[field as keyof typeof geometryData] == null) {
        errors.push({
          code: 'MISSING_REQUIRED_FIELD',
          message: `缺少必需字段: ${field}`,
          severity: 'critical',
          path: `data.${field}`,
          context: { field, dataKeys: Object.keys(geometryData) },
          autoFixable: field === 'geometryId'
        });
      }
    }

    // 检查顶点数据
    if (geometryData.vertices) {
      const vertexCount = geometryData.vertices.length;
      if (vertexCount === 0) {
        errors.push({
          code: 'EMPTY_VERTEX_DATA',
          message: '顶点数据为空',
          severity: 'critical',
          path: 'data.vertices',
          context: { vertexCount },
          autoFixable: false
        });
      } else if (vertexCount % 3 !== 0) {
        errors.push({
          code: 'INVALID_VERTEX_FORMAT',
          message: '顶点数据长度不是3的倍数',
          severity: 'critical',
          path: 'data.vertices',
          context: { vertexCount, remainder: vertexCount % 3 },
          autoFixable: false
        });
      }

      // 性能警告
      if (vertexCount > 3000000) { // 100万顶点
        warnings.push({
          code: 'LARGE_VERTEX_COUNT',
          message: '顶点数量较多，可能影响性能',
          type: 'performance',
          path: 'data.vertices',
          recommendedAction: '考虑简化几何或增加细节层次'
        });
      }
    }

    // 检查面片数据
    if (geometryData.faces) {
      const faceCount = geometryData.faces.length;
      if (faceCount === 0) {
        errors.push({
          code: 'EMPTY_FACE_DATA',
          message: '面片数据为空',
          severity: 'critical',
          path: 'data.faces',
          context: { faceCount },
          autoFixable: false
        });
      } else if (faceCount % 3 !== 0) {
        errors.push({
          code: 'INVALID_FACE_FORMAT',
          message: '面片数据长度不是3的倍数',
          severity: 'critical',
          path: 'data.faces',
          context: { faceCount, remainder: faceCount % 3 },
          autoFixable: false
        });
      }

      // 检查面片索引范围
      const maxVertexIndex = geometryData.vertices ? (geometryData.vertices.length / 3) - 1 : 0;
      for (let i = 0; i < geometryData.faces.length; i++) {
        if (geometryData.faces[i] > maxVertexIndex) {
          errors.push({
            code: 'FACE_INDEX_OUT_OF_RANGE',
            message: `面片索引超出顶点范围: ${geometryData.faces[i]} > ${maxVertexIndex}`,
            severity: 'critical',
            path: `data.faces[${i}]`,
            context: { faceIndex: geometryData.faces[i], maxIndex: maxVertexIndex, position: i },
            autoFixable: false
          });
          break; // 只报告第一个错误
        }
      }

      // 单元数量限制检查
      const elementCount = faceCount / 3;
      if (elementCount > STANDARD_DEFAULTS.MAX_ELEMENT_COUNT) {
        errors.push({
          code: 'ELEMENT_COUNT_EXCEEDED',
          message: `单元数量超过限制: ${elementCount} > ${STANDARD_DEFAULTS.MAX_ELEMENT_COUNT}`,
          severity: 'major',
          path: 'data.faces',
          context: { elementCount, limit: STANDARD_DEFAULTS.MAX_ELEMENT_COUNT },
          autoFixable: false
        });

        fixSuggestions.push({
          type: 'optimization',
          description: '简化几何以减少单元数量',
          complexity: 'moderate',
          expectedOutcome: '几何复杂度降低，满足计算要求'
        });
      }
    }

    // V1.1特定验证
    if (data.version.minor >= 1) {
      const geometryV1_1 = geometryData as GeometryDataV1_1;
      
      if (geometryV1_1.qualityAssessment) {
        const qa = geometryV1_1.qualityAssessment;
        if (qa.overallScore < 0 || qa.overallScore > 1) {
          errors.push({
            code: 'INVALID_QUALITY_SCORE_RANGE',
            message: `质量评分超出范围 [0, 1]: ${qa.overallScore}`,
            severity: 'major',
            path: 'data.qualityAssessment.overallScore',
            context: { score: qa.overallScore },
            autoFixable: true
          });
        }

        if (qa.overallScore < STANDARD_DEFAULTS.QUALITY_THRESHOLD) {
          warnings.push({
            code: 'LOW_QUALITY_SCORE',
            message: `质量评分低于阈值: ${qa.overallScore} < ${STANDARD_DEFAULTS.QUALITY_THRESHOLD}`,
            type: 'best_practice',
            path: 'data.qualityAssessment.overallScore',
            recommendedAction: '考虑优化几何质量'
          });
        }
      }
    }
  }

  /**
   * 验证性能优化机会
   */
  private async validatePerformanceOptimization(
    data: VersionedData<any>,
    errors: ValidationError[],
    warnings: ValidationWarning[],
    fixSuggestions: FixSuggestion[]
  ): Promise<void> {
    const dataSize = JSON.stringify(data).length;
    
    // 大数据警告
    if (dataSize > 10 * 1024 * 1024) { // 10MB
      warnings.push({
        code: 'LARGE_DATA_SIZE',
        message: `数据大小较大: ${(dataSize / 1024 / 1024).toFixed(1)}MB`,
        type: 'performance',
        path: 'data',
        recommendedAction: '考虑数据压缩或分块传输'
      });

      fixSuggestions.push({
        type: 'optimization',
        description: '启用数据压缩',
        complexity: 'simple',
        expectedOutcome: '减少传输时间和内存使用'
      });
    }

    // 检查数据冗余
    if (data.metadata && data.metadata.size > dataSize * 1.5) {
      warnings.push({
        code: 'METADATA_SIZE_MISMATCH',
        message: '元数据中记录的大小与实际大小不符',
        type: 'best_practice',
        path: 'metadata.size',
        recommendedAction: '更新元数据大小信息'
      });
    }
  }

  /**
   * 验证版本兼容性
   */
  private async validateVersionCompatibility(
    data: VersionedData<any>,
    errors: ValidationError[],
    warnings: ValidationWarning[],
    fixSuggestions: FixSuggestion[]
  ): Promise<void> {
    const currentVersion = apiVersionManager.getCurrentVersion();
    const compatibility = apiVersionManager.checkCompatibility(data.version, currentVersion);

    if (compatibility.compatibilityLevel === CompatibilityLevel.INCOMPATIBLE) {
      errors.push({
        code: 'INCOMPATIBLE_VERSION',
        message: `数据版本 ${data.version.versionString} 与当前版本 ${currentVersion.versionString} 不兼容`,
        severity: 'major',
        path: 'version',
        context: { dataVersion: data.version.versionString, currentVersion: currentVersion.versionString },
        autoFixable: false
      });

      fixSuggestions.push({
        type: 'migration',
        description: '升级数据到兼容版本',
        complexity: 'complex',
        expectedOutcome: '数据将与当前系统兼容'
      });
    } else if (compatibility.compatibilityLevel === CompatibilityLevel.PARTIAL_COMPATIBLE) {
      warnings.push({
        code: 'PARTIAL_COMPATIBILITY',
        message: `数据版本 ${data.version.versionString} 与当前版本部分兼容`,
        type: 'compatibility',
        path: 'version',
        recommendedAction: '考虑升级到完全兼容版本'
      });
    }

    // 检查废弃功能
    if (compatibility.deprecatedFeatures.length > 0) {
      warnings.push({
        code: 'DEPRECATED_FEATURES_USED',
        message: `数据使用了废弃功能: ${compatibility.deprecatedFeatures.join(', ')}`,
        type: 'deprecation',
        path: 'data',
        recommendedAction: '更新数据以移除废弃功能的使用'
      });
    }
  }

  /**
   * 验证质量结果完整性
   */
  private async validateQualityResultCompleteness(
    data: VersionedData<MeshQualityResultV1>,
    errors: ValidationError[],
    warnings: ValidationWarning[],
    fixSuggestions: FixSuggestion[]
  ): Promise<void> {
    const qualityResult = data.data;

    // 检查必需字段
    const requiredFields = ['analysisId', 'sourceGeometryId', 'overallQuality'];
    for (const field of requiredFields) {
      if (!(field in qualityResult) || qualityResult[field as keyof typeof qualityResult] == null) {
        errors.push({
          code: 'MISSING_QUALITY_FIELD',
          message: `质量结果缺少必需字段: ${field}`,
          severity: 'critical',
          path: `data.${field}`,
          context: { field },
          autoFixable: field === 'analysisId'
        });
      }
    }
  }

  /**
   * 验证质量评分范围
   */
  private async validateQualityScoreRange(
    data: VersionedData<MeshQualityResultV1>,
    errors: ValidationError[],
    warnings: ValidationWarning[],
    fixSuggestions: FixSuggestion[]
  ): Promise<void> {
    const qualityResult = data.data;

    if (qualityResult.overallQuality != null) {
      if (qualityResult.overallQuality < 0 || qualityResult.overallQuality > 1) {
        errors.push({
          code: 'QUALITY_SCORE_OUT_OF_RANGE',
          message: `质量评分超出范围 [0, 1]: ${qualityResult.overallQuality}`,
          severity: 'major',
          path: 'data.overallQuality',
          context: { score: qualityResult.overallQuality },
          autoFixable: true
        });
      }
    }
  }

  // ============================================================================
  // 5. 辅助方法
  // ============================================================================

  /**
   * 基础版本格式验证
   */
  private async validateBasicVersionFormat(
    data: VersionedData<any>,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): Promise<void> {
    // 检查版本对象存在性
    if (!data.version) {
      errors.push({
        code: 'MISSING_VERSION_INFO',
        message: '缺少版本信息',
        severity: 'critical',
        path: 'version',
        context: {},
        autoFixable: false
      });
      return;
    }

    // 检查时间戳格式
    if (data.createdAt && !this.isValidISODate(data.createdAt)) {
      warnings.push({
        code: 'INVALID_CREATED_AT_FORMAT',
        message: '创建时间格式无效',
        type: 'best_practice',
        path: 'createdAt',
        recommendedAction: '使用ISO 8601格式的时间戳'
      });
    }

    if (data.lastModified && !this.isValidISODate(data.lastModified)) {
      warnings.push({
        code: 'INVALID_LAST_MODIFIED_FORMAT',
        message: '最后修改时间格式无效',
        type: 'best_practice',
        path: 'lastModified',
        recommendedAction: '使用ISO 8601格式的时间戳'
      });
    }
  }

  /**
   * 生成额外修复建议
   */
  private generateAdditionalFixSuggestions(
    data: VersionedData<any>,
    errors: ValidationError[],
    warnings: ValidationWarning[],
    fixSuggestions: FixSuggestion[]
  ): void {
    // 基于错误数量提供批量修复建议
    const criticalErrors = errors.filter(e => e.severity === 'critical');
    if (criticalErrors.length > 3) {
      fixSuggestions.push({
        type: 'validation_fix',
        description: '批量修复所有关键错误',
        complexity: 'moderate',
        expectedOutcome: '数据将通过基本验证检查'
      });
    }

    // 基于警告提供优化建议
    const performanceWarnings = warnings.filter(w => w.type === 'performance');
    if (performanceWarnings.length > 0) {
      fixSuggestions.push({
        type: 'optimization',
        description: '优化数据结构以提升性能',
        complexity: 'simple',
        expectedOutcome: '减少内存使用和处理时间'
      });
    }
  }

  /**
   * 计算数据字段数量
   */
  private countDataFields(data: VersionedData<any>): number {
    const countFields = (obj: any): number => {
      if (obj === null || obj === undefined) return 0;
      if (typeof obj !== 'object') return 1;
      if (Array.isArray(obj)) return obj.length;
      
      let count = 0;
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          count += 1 + countFields(obj[key]);
        }
      }
      return count;
    };

    return countFields(data);
  }

  /**
   * 计算性能评分
   */
  private calculatePerformanceScore(data: VersionedData<any>, duration: number): number {
    const dataSize = JSON.stringify(data).length;
    const fieldsCount = this.countDataFields(data);
    
    // 基于处理速度计算评分
    const processingSpeed = fieldsCount / duration; // 字段/毫秒
    const sizeEfficiency = 1000000 / dataSize; // 1MB基准
    
    return Math.max(0, Math.min(1, (processingSpeed * sizeEfficiency) / 10));
  }

  /**
   * 检查ISO日期格式
   */
  private isValidISODate(dateString: string): boolean {
    const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
    return iso8601Regex.test(dateString) && !isNaN(Date.parse(dateString));
  }

  /**
   * 添加验证规则
   */
  private addValidationRules(dataType: string, rules: ValidationRule[]): void {
    if (!this.validationRules.has(dataType)) {
      this.validationRules.set(dataType, []);
    }
    this.validationRules.get(dataType)!.push(...rules);
  }

  // ============================================================================
  // 6. 公共配置接口
  // ============================================================================

  /**
   * 添加自定义验证规则
   * @param dataType 数据类型
   * @param rule 验证规则
   */
  public addCustomValidationRule(dataType: string, rule: ValidationRule): void {
    this.addValidationRules(dataType, [rule]);
    console.log(`✅ 已添加自定义验证规则: ${rule.name} for ${dataType}`);
  }

  /**
   * 移除验证规则
   * @param dataType 数据类型
   * @param ruleName 规则名称
   */
  public removeValidationRule(dataType: string, ruleName: string): void {
    const rules = this.validationRules.get(dataType);
    if (rules) {
      const index = rules.findIndex(r => r.name === ruleName);
      if (index >= 0) {
        rules.splice(index, 1);
        console.log(`✅ 已移除验证规则: ${ruleName} from ${dataType}`);
      }
    }
  }

  /**
   * 获取支持的数据类型
   */
  public getSupportedDataTypes(): string[] {
    return Array.from(this.validationRules.keys());
  }

  /**
   * 获取数据类型的验证规则
   */
  public getValidationRules(dataType: string): ValidationRule[] {
    return this.validationRules.get(dataType) || [];
  }
}

// ============================================================================
// 7. 验证规则接口
// ============================================================================

/**
 * 验证规则接口
 */
interface ValidationRule {
  /** 规则名称 */
  name: string;
  /** 规则描述 */
  description: string;
  /** 错误严重程度 */
  severity: 'critical' | 'major' | 'minor';
  /** 验证函数 */
  validate: (
    data: VersionedData<any>,
    errors: ValidationError[],
    warnings: ValidationWarning[],
    fixSuggestions: FixSuggestion[]
  ) => Promise<void>;
}

// ============================================================================
// 8. 导出和便捷函数
// ============================================================================

/**
 * 全局验证器实例
 */
export const apiVersionValidator = ApiVersionValidator.getInstance();

/**
 * 便捷函数：快速验证版本化数据
 */
export async function validateVersionedData<T>(
  data: VersionedData<T>,
  dataType: string
): Promise<ApiVersionValidationResult> {
  return await apiVersionValidator.validateVersionedData(data, dataType);
}

/**
 * 便捷函数：验证几何数据
 */
export async function validateGeometryData(
  data: VersionedData<GeometryDataV1 | GeometryDataV1_1>
): Promise<ApiVersionValidationResult> {
  return await apiVersionValidator.validateVersionedData(data, 'geometry');
}

/**
 * 便捷函数：验证网格质量结果
 */
export async function validateMeshQualityResult(
  data: VersionedData<MeshQualityResultV1>
): Promise<ApiVersionValidationResult> {
  return await apiVersionValidator.validateVersionedData(data, 'mesh_quality');
}

/**
 * 便捷函数：检查数据是否有效
 */
export async function isDataValid<T>(
  data: VersionedData<T>,
  dataType: string
): Promise<boolean> {
  const result = await apiVersionValidator.validateVersionedData(data, dataType);
  return result.valid;
}

// 导出类型
export type {
  ApiVersionValidationResult,
  ValidationError,
  ValidationWarning,
  FixSuggestion,
  ValidationStatistics
};

/**
 * API版本验证工具使用说明：
 * 
 * 1. 基本验证：
 *    - validateVersionedData(data, 'geometry') 验证几何数据
 *    - validateMeshQualityResult(data) 验证质量结果
 *    - isDataValid(data, type) 快速检查有效性
 * 
 * 2. 批量验证：
 *    - batchValidateVersionedData() 批量验证多个数据
 *    - 支持并行处理和统计汇总
 * 
 * 3. 自定义规则：
 *    - addCustomValidationRule() 添加项目特定验证
 *    - removeValidationRule() 移除不需要的规则
 * 
 * 4. 错误处理：
 *    - 自动分类错误严重程度
 *    - 提供修复建议和自动修复选项
 *    - 详细的错误上下文信息
 * 
 * 5. 性能监控：
 *    - 验证耗时统计
 *    - 数据大小分析
 *    - 性能评分计算
 */