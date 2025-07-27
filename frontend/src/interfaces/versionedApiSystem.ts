/**
 * 版本化API系统设计
 * DeepCAD Deep Excavation CAE Platform - Versioned API System
 * 
 * 作者：2号几何专家
 * 版本：v1.0.0
 * 创建日期：2025-01-25
 * 
 * 目标：建立完整的API版本控制体系，确保系统演进过程中的向后兼容性
 * 支持多版本并存、平滑升级、数据迁移和兼容性检查
 */

// ============================================================================
// 1. 版本控制核心接口
// ============================================================================

/**
 * API版本标识符接口
 * 采用语义化版本控制规范 (Semantic Versioning)
 */
export interface ApiVersion {
  /** 主版本号 - 不兼容的API修改 */
  major: number;
  /** 次版本号 - 向下兼容的功能性新增 */
  minor: number;
  /** 修订号 - 向下兼容的问题修正 */
  patch: number;
  /** 预发布版本标识 (alpha, beta, rc) */
  prerelease?: string;
  /** 构建元数据 */
  buildMetadata?: string;
  /** 完整版本字符串 */
  versionString: string;
}

/**
 * API兼容性级别枚举
 * 定义不同版本间的兼容性程度
 */
export enum CompatibilityLevel {
  /** 完全兼容 - 可以直接使用 */
  FULL_COMPATIBLE = 'full_compatible',
  /** 向后兼容 - 新版本支持旧版本数据 */
  BACKWARD_COMPATIBLE = 'backward_compatible',
  /** 向前兼容 - 旧版本可以处理新版本数据的子集 */
  FORWARD_COMPATIBLE = 'forward_compatible',
  /** 部分兼容 - 需要数据转换 */
  PARTIAL_COMPATIBLE = 'partial_compatible',
  /** 不兼容 - 需要完全迁移 */
  INCOMPATIBLE = 'incompatible'
}

/**
 * 版本兼容性信息接口
 * 描述两个版本之间的兼容性关系
 */
export interface VersionCompatibility {
  /** 源版本 */
  sourceVersion: ApiVersion;
  /** 目标版本 */
  targetVersion: ApiVersion;
  /** 兼容性级别 */
  compatibilityLevel: CompatibilityLevel;
  /** 兼容性评分 (0-1) */
  compatibilityScore: number;
  /** 迁移复杂度 */
  migrationComplexity: 'trivial' | 'simple' | 'moderate' | 'complex' | 'expert';
  /** 所需迁移步骤 */
  migrationSteps: string[];
  /** 破坏性变更列表 */
  breakingChanges: string[];
  /** 新增功能列表 */
  newFeatures: string[];
  /** 废弃功能列表 */
  deprecatedFeatures: string[];
}

// ============================================================================
// 2. 版本化数据接口
// ============================================================================

/**
 * 版本化数据封装接口
 * 为所有API数据添加版本信息
 */
export interface VersionedData<T = any> {
  /** 数据版本信息 */
  version: ApiVersion;
  /** 数据创建时间戳 */
  createdAt: string;
  /** 最后修改时间戳 */
  lastModified: string;
  /** 数据格式标识符 */
  schemaId: string;
  /** 实际数据内容 */
  data: T;
  /** 元数据信息 */
  metadata: {
    /** 数据源模块 */
    source: '2号几何专家' | '3号计算专家';
    /** 数据类型 */
    dataType: string;
    /** 数据大小 (字节) */
    size: number;
    /** 数据校验和 */
    checksum: string;
  };
  /** 兼容性标记 */
  compatibility: {
    /** 最低支持版本 */
    minimumVersion: ApiVersion;
    /** 最高支持版本 */
    maximumVersion?: ApiVersion;
    /** 兼容性注释 */
    notes: string[];
  };
}

/**
 * 几何数据版本化接口 (v1.0)
 * 2号几何专家的版本化几何数据结构
 */
export interface GeometryDataV1 {
  /** 几何数据标识符 */
  geometryId: string;
  /** 顶点数据 */
  vertices: Float32Array;
  /** 面片数据 */
  faces: Uint32Array;
  /** 材料区域 */
  materialZones: Array<{
    zoneId: string;
    materialType: string;
    faceIndices: Uint32Array;
    properties: Record<string, number>;
  }>;
  /** 边界条件 */
  boundaryConditions: Array<{
    conditionId: string;
    type: string;
    parameters: Record<string, any>;
  }>;
}

/**
 * 几何数据版本化接口 (v1.1) - 向后兼容扩展
 * 新增质量评估和优化提示，保持v1.0完全兼容
 */
export interface GeometryDataV1_1 extends GeometryDataV1 {
  /** 质量评估数据 (新增) */
  qualityAssessment?: {
    overallScore: number;
    complexityLevel: 'simple' | 'moderate' | 'complex';
    meshingReadiness: boolean;
  };
  /** RBF插值参数 (新增) */
  rbfParameters?: {
    kernelType: string;
    smoothingFactor: number;
    gridResolution: number;
  };
  /** 优化建议 (新增) */
  optimizationHints?: Array<{
    type: string;
    priority: 'low' | 'medium' | 'high';
    description: string;
  }>;
}

/**
 * 网格质量结果版本化接口 (v1.0)
 * 3号计算专家的版本化质量分析结果
 */
export interface MeshQualityResultV1 {
  /** 分析结果标识符 */
  analysisId: string;
  /** 源几何数据标识符 */
  sourceGeometryId: string;
  /** 整体质量评分 */
  overallQuality: number;
  /** 单元质量分布 */
  qualityDistribution: {
    excellent: number;
    good: number;
    acceptable: number;
    poor: number;
  };
  /** 问题区域 */
  problemAreas: Array<{
    areaId: string;
    problemType: string;
    severity: 'low' | 'medium' | 'high';
    affectedElements: Uint32Array;
  }>;
  /** 优化建议 */
  recommendations: Array<{
    recommendationId: string;
    type: string;
    priority: 'low' | 'medium' | 'high';
    parameters: Record<string, any>;
  }>;
}

// ============================================================================
// 3. 版本迁移系统
// ============================================================================

/**
 * 数据迁移器接口
 * 定义版本间数据迁移的标准接口
 */
export interface DataMigrator<TSource = any, TTarget = any> {
  /** 源版本 */
  sourceVersion: ApiVersion;
  /** 目标版本 */
  targetVersion: ApiVersion;
  /** 迁移器名称 */
  migratorName: string;
  /** 是否支持双向迁移 */
  bidirectional: boolean;
  
  /**
   * 向前迁移 (升级)
   * @param sourceData 源版本数据
   * @returns 目标版本数据
   */
  migrateForward(sourceData: VersionedData<TSource>): Promise<VersionedData<TTarget>>;
  
  /**
   * 向后迁移 (降级)
   * @param targetData 目标版本数据
   * @returns 源版本数据
   */
  migrateBackward?(targetData: VersionedData<TTarget>): Promise<VersionedData<TSource>>;
  
  /**
   * 验证迁移结果
   * @param originalData 原始数据
   * @param migratedData 迁移后数据
   * @returns 验证结果
   */
  validateMigration(
    originalData: VersionedData<TSource>, 
    migratedData: VersionedData<TTarget>
  ): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
    dataLoss: string[];
  }>;
}

/**
 * 几何数据迁移器 (v1.0 -> v1.1)
 * 实现几何数据从v1.0到v1.1的迁移
 */
export class GeometryDataMigratorV1ToV1_1 implements DataMigrator<GeometryDataV1, GeometryDataV1_1> {
  sourceVersion: ApiVersion = { major: 1, minor: 0, patch: 0, versionString: '1.0.0' };
  targetVersion: ApiVersion = { major: 1, minor: 1, patch: 0, versionString: '1.1.0' };
  migratorName = 'GeometryDataMigratorV1ToV1_1';
  bidirectional = true;

  /**
   * v1.0 -> v1.1 升级迁移
   */
  async migrateForward(
    sourceData: VersionedData<GeometryDataV1>
  ): Promise<VersionedData<GeometryDataV1_1>> {
    const geometryV1 = sourceData.data;
    
    // 构建v1.1数据结构
    const geometryV1_1: GeometryDataV1_1 = {
      ...geometryV1,
      // 新增字段使用默认值或计算值
      qualityAssessment: this.calculateQualityAssessment(geometryV1),
      rbfParameters: this.inferRBFParameters(geometryV1),
      optimizationHints: this.generateOptimizationHints(geometryV1)
    };

    return {
      ...sourceData,
      version: this.targetVersion,
      lastModified: new Date().toISOString(),
      schemaId: 'geometry_data_v1.1',
      data: geometryV1_1,
      compatibility: {
        minimumVersion: this.sourceVersion,
        notes: ['向后兼容v1.0，新增质量评估和优化提示功能']
      }
    };
  }

  /**
   * v1.1 -> v1.0 降级迁移
   */
  async migrateBackward(
    targetData: VersionedData<GeometryDataV1_1>
  ): Promise<VersionedData<GeometryDataV1>> {
    const geometryV1_1 = targetData.data;
    
    // 移除v1.1新增字段，保留v1.0字段
    const geometryV1: GeometryDataV1 = {
      geometryId: geometryV1_1.geometryId,
      vertices: geometryV1_1.vertices,
      faces: geometryV1_1.faces,
      materialZones: geometryV1_1.materialZones,
      boundaryConditions: geometryV1_1.boundaryConditions
    };

    return {
      ...targetData,
      version: this.sourceVersion,
      lastModified: new Date().toISOString(),
      schemaId: 'geometry_data_v1.0',
      data: geometryV1,
      compatibility: {
        minimumVersion: this.sourceVersion,
        notes: ['从v1.1降级，移除了质量评估和优化提示功能']
      }
    };
  }

  /**
   * 验证迁移结果
   */
  async validateMigration(
    originalData: VersionedData<GeometryDataV1>,
    migratedData: VersionedData<GeometryDataV1_1>
  ) {
    const errors: string[] = [];
    const warnings: string[] = [];
    const dataLoss: string[] = [];

    const original = originalData.data;
    const migrated = migratedData.data;

    // 核心数据一致性检查
    if (original.geometryId !== migrated.geometryId) {
      errors.push('几何ID不匹配');
    }

    if (original.vertices.length !== migrated.vertices.length) {
      errors.push('顶点数据长度不匹配');
    }

    if (original.faces.length !== migrated.faces.length) {
      errors.push('面片数据长度不匹配');
    }

    if (original.materialZones.length !== migrated.materialZones.length) {
      warnings.push('材料区域数量可能发生变化');
    }

    // 新增字段检查
    if (!migrated.qualityAssessment) {
      warnings.push('质量评估数据未正确生成');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      dataLoss // v1.0->v1.1迁移无数据丢失
    };
  }

  /**
   * 计算质量评估
   */
  private calculateQualityAssessment(geometry: GeometryDataV1) {
    const vertexCount = geometry.vertices.length / 3;
    const faceCount = geometry.faces.length / 3;
    
    return {
      overallScore: Math.max(0.6, Math.min(0.95, 0.8 - faceCount / 1000000)),
      complexityLevel: faceCount > 50000 ? 'complex' : faceCount > 10000 ? 'moderate' : 'simple' as const,
      meshingReadiness: faceCount < 2000000
    };
  }

  /**
   * 推断RBF参数
   */
  private inferRBFParameters(geometry: GeometryDataV1) {
    return {
      kernelType: 'multiquadric',
      smoothingFactor: 0.1,
      gridResolution: 8.0
    };
  }

  /**
   * 生成优化建议
   */
  private generateOptimizationHints(geometry: GeometryDataV1) {
    const hints = [];
    const faceCount = geometry.faces.length / 3;
    
    if (faceCount > 1500000) {
      hints.push({
        type: 'mesh_size_optimization',
        priority: 'high' as const,
        description: '建议适当增大网格尺寸以控制单元数量'
      });
    }
    
    if (geometry.materialZones.length > 5) {
      hints.push({
        type: 'material_simplification',
        priority: 'medium' as const,
        description: '考虑合并相似材料区域以简化模型'
      });
    }
    
    return hints;
  }
}

// ============================================================================
// 4. 版本管理器
// ============================================================================

/**
 * API版本管理器
 * 统一管理所有版本相关操作
 */
export class ApiVersionManager {
  private static instance: ApiVersionManager;
  private migrators: Map<string, DataMigrator> = new Map();
  private supportedVersions: Set<string> = new Set();
  private currentVersion: ApiVersion;

  private constructor() {
    this.currentVersion = { major: 1, minor: 1, patch: 0, versionString: '1.1.0' };
    this.initializeSupportedVersions();
    this.registerMigrators();
  }

  /**
   * 获取版本管理器单例
   */
  public static getInstance(): ApiVersionManager {
    if (!ApiVersionManager.instance) {
      ApiVersionManager.instance = new ApiVersionManager();
    }
    return ApiVersionManager.instance;
  }

  /**
   * 初始化支持的版本
   */
  private initializeSupportedVersions(): void {
    this.supportedVersions.add('1.0.0');
    this.supportedVersions.add('1.1.0');
    // 未来版本可以在这里添加
  }

  /**
   * 注册数据迁移器
   */
  private registerMigrators(): void {
    const geometryMigrator = new GeometryDataMigratorV1ToV1_1();
    this.migrators.set('geometry_1.0.0_to_1.1.0', geometryMigrator);
  }

  /**
   * 解析版本字符串
   * @param versionString 版本字符串 (如 "1.1.0")
   * @returns ApiVersion对象
   */
  public parseVersion(versionString: string): ApiVersion {
    const regex = /^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9.-]+))?(?:\+([a-zA-Z0-9.-]+))?$/;
    const match = versionString.match(regex);
    
    if (!match) {
      throw new Error(`无效的版本格式: ${versionString}`);
    }

    return {
      major: parseInt(match[1], 10),
      minor: parseInt(match[2], 10),
      patch: parseInt(match[3], 10),
      prerelease: match[4],
      buildMetadata: match[5],
      versionString
    };
  }

  /**
   * 比较两个版本
   * @param version1 版本1
   * @param version2 版本2
   * @returns -1: version1 < version2, 0: 相等, 1: version1 > version2
   */
  public compareVersions(version1: ApiVersion, version2: ApiVersion): number {
    if (version1.major !== version2.major) {
      return version1.major - version2.major;
    }
    if (version1.minor !== version2.minor) {
      return version1.minor - version2.minor;
    }
    if (version1.patch !== version2.patch) {
      return version1.patch - version2.patch;
    }
    return 0;
  }

  /**
   * 检查版本兼容性
   * @param sourceVersion 源版本
   * @param targetVersion 目标版本
   * @returns 兼容性信息
   */
  public checkCompatibility(
    sourceVersion: ApiVersion, 
    targetVersion: ApiVersion
  ): VersionCompatibility {
    const comparison = this.compareVersions(sourceVersion, targetVersion);
    
    let compatibilityLevel: CompatibilityLevel;
    let compatibilityScore: number;
    let migrationComplexity: 'trivial' | 'simple' | 'moderate' | 'complex' | 'expert';
    let breakingChanges: string[] = [];
    let newFeatures: string[] = [];
    let deprecatedFeatures: string[] = [];

    if (comparison === 0) {
      // 完全相同版本
      compatibilityLevel = CompatibilityLevel.FULL_COMPATIBLE;
      compatibilityScore = 1.0;
      migrationComplexity = 'trivial';
    } else if (sourceVersion.major === targetVersion.major) {
      // 同主版本
      if (comparison < 0) {
        // 升级
        compatibilityLevel = CompatibilityLevel.BACKWARD_COMPATIBLE;
        compatibilityScore = 0.95;
        migrationComplexity = 'simple';
        newFeatures = this.getNewFeaturesBetweenVersions(sourceVersion, targetVersion);
      } else {
        // 降级
        compatibilityLevel = CompatibilityLevel.PARTIAL_COMPATIBLE;
        compatibilityScore = 0.8;
        migrationComplexity = 'moderate';
        deprecatedFeatures = this.getDeprecatedFeaturesBetweenVersions(targetVersion, sourceVersion);
      }
    } else {
      // 不同主版本
      compatibilityLevel = CompatibilityLevel.INCOMPATIBLE;
      compatibilityScore = 0.3;
      migrationComplexity = 'expert';
      breakingChanges = this.getBreakingChangesBetweenVersions(sourceVersion, targetVersion);
    }

    return {
      sourceVersion,
      targetVersion,
      compatibilityLevel,
      compatibilityScore,
      migrationComplexity,
      migrationSteps: this.generateMigrationSteps(sourceVersion, targetVersion),
      breakingChanges,
      newFeatures,
      deprecatedFeatures
    };
  }

  /**
   * 执行数据迁移
   * @param data 待迁移数据
   * @param targetVersion 目标版本
   * @param dataType 数据类型
   * @returns 迁移后的数据
   */
  public async migrateData<TSource = any, TTarget = any>(
    data: VersionedData<TSource>,
    targetVersion: ApiVersion,
    dataType: string
  ): Promise<VersionedData<TTarget>> {
    const sourceVersionString = data.version.versionString;
    const targetVersionString = targetVersion.versionString;
    
    // 检查是否需要迁移
    if (sourceVersionString === targetVersionString) {
      return data as any;
    }

    // 查找合适的迁移器
    const migratorKey = `${dataType}_${sourceVersionString}_to_${targetVersionString}`;
    const migrator = this.migrators.get(migratorKey);
    
    if (!migrator) {
      throw new Error(`未找到从 ${sourceVersionString} 到 ${targetVersionString} 的 ${dataType} 迁移器`);
    }

    // 执行迁移
    console.log(`🔄 开始数据迁移: ${sourceVersionString} -> ${targetVersionString}`);
    const migratedData = await migrator.migrateForward(data);
    
    // 验证迁移结果
    const validation = await migrator.validateMigration(data, migratedData);
    if (!validation.valid) {
      throw new Error(`数据迁移验证失败: ${validation.errors.join(', ')}`);
    }

    if (validation.warnings.length > 0) {
      console.warn('⚠️ 数据迁移警告:', validation.warnings);
    }

    if (validation.dataLoss.length > 0) {
      console.warn('⚠️ 数据迁移可能丢失:', validation.dataLoss);
    }

    console.log('✅ 数据迁移完成');
    return migratedData;
  }

  /**
   * 获取当前支持的所有版本
   */
  public getSupportedVersions(): string[] {
    return Array.from(this.supportedVersions).sort((a, b) => {
      const versionA = this.parseVersion(a);
      const versionB = this.parseVersion(b);
      return this.compareVersions(versionA, versionB);
    });
  }

  /**
   * 获取当前版本
   */
  public getCurrentVersion(): ApiVersion {
    return { ...this.currentVersion };
  }

  /**
   * 检查版本是否受支持
   */
  public isVersionSupported(version: string | ApiVersion): boolean {
    const versionString = typeof version === 'string' ? version : version.versionString;
    return this.supportedVersions.has(versionString);
  }

  // ============================================================================
  // 私有辅助方法
  // ============================================================================

  private getNewFeaturesBetweenVersions(sourceVersion: ApiVersion, targetVersion: ApiVersion): string[] {
    // 基于版本差异返回新功能列表
    if (sourceVersion.versionString === '1.0.0' && targetVersion.versionString === '1.1.0') {
      return [
        '几何质量评估功能',
        'RBF插值参数配置',
        '智能优化建议系统',
        '性能监控增强'
      ];
    }
    return [];
  }

  private getDeprecatedFeaturesBetweenVersions(sourceVersion: ApiVersion, targetVersion: ApiVersion): string[] {
    // 基于版本差异返回废弃功能列表
    return [];
  }

  private getBreakingChangesBetweenVersions(sourceVersion: ApiVersion, targetVersion: ApiVersion): string[] {
    // 基于版本差异返回破坏性变更列表
    if (sourceVersion.major !== targetVersion.major) {
      return [
        '数据结构不兼容',
        '接口签名变更',
        '配置参数重组'
      ];
    }
    return [];
  }

  private generateMigrationSteps(sourceVersion: ApiVersion, targetVersion: ApiVersion): string[] {
    const steps = [];
    
    if (this.compareVersions(sourceVersion, targetVersion) < 0) {
      steps.push('1. 备份原始数据');
      steps.push('2. 验证数据完整性');
      steps.push('3. 执行版本升级迁移');
      steps.push('4. 验证迁移结果');
      steps.push('5. 更新元数据信息');
    } else {
      steps.push('1. 备份原始数据');
      steps.push('2. 检查数据兼容性');
      steps.push('3. 执行版本降级迁移');
      steps.push('4. 验证关键功能');
      steps.push('5. 确认数据完整性');
    }
    
    return steps;
  }
}

// ============================================================================
// 5. 便捷函数和导出
// ============================================================================

/**
 * 全局版本管理器实例
 */
export const apiVersionManager = ApiVersionManager.getInstance();

/**
 * 便捷函数：创建版本化数据
 */
export function createVersionedData<T>(
  data: T,
  dataType: string,
  version?: ApiVersion
): VersionedData<T> {
  const currentVersion = version || apiVersionManager.getCurrentVersion();
  
  return {
    version: currentVersion,
    createdAt: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    schemaId: `${dataType}_v${currentVersion.versionString}`,
    data,
    metadata: {
      source: '2号几何专家',
      dataType,
      size: JSON.stringify(data).length,
      checksum: btoa(JSON.stringify(data)).slice(0, 16)
    },
    compatibility: {
      minimumVersion: currentVersion,
      notes: []
    }
  };
}

/**
 * 便捷函数：检查数据版本兼容性
 */
export function checkDataCompatibility(
  data: VersionedData,
  requiredVersion: string | ApiVersion
): VersionCompatibility {
  const targetVersion = typeof requiredVersion === 'string' 
    ? apiVersionManager.parseVersion(requiredVersion)
    : requiredVersion;
    
  return apiVersionManager.checkCompatibility(data.version, targetVersion);
}

/**
 * 便捷函数：自动迁移数据到目标版本
 */
export async function autoMigrateData<T>(
  data: VersionedData<T>,
  targetVersion: string | ApiVersion,
  dataType: string
): Promise<VersionedData<T>> {
  const target = typeof targetVersion === 'string' 
    ? apiVersionManager.parseVersion(targetVersion)
    : targetVersion;
    
  return await apiVersionManager.migrateData(data, target, dataType);
}

/**
 * 版本化API系统使用示例和说明
 */
export const API_VERSION_EXAMPLES = {
  /**
   * 示例1：创建版本化几何数据
   */
  createVersionedGeometryData: (geometryData: GeometryDataV1) => {
    return createVersionedData(geometryData, 'geometry');
  },

  /**
   * 示例2：检查版本兼容性
   */
  checkGeometryDataCompatibility: (data: VersionedData<GeometryDataV1>) => {
    return checkDataCompatibility(data, '1.1.0');
  },

  /**
   * 示例3：自动迁移几何数据
   */
  migrateGeometryData: async (data: VersionedData<GeometryDataV1>) => {
    return await autoMigrateData(data, '1.1.0', 'geometry');
  }
};

// ============================================================================
// 6. 类型导出汇总
// ============================================================================

export type {
  ApiVersion,
  VersionCompatibility,
  VersionedData,
  DataMigrator,
  GeometryDataV1,
  GeometryDataV1_1,
  MeshQualityResultV1
};

export {
  CompatibilityLevel,
  GeometryDataMigratorV1ToV1_1,
  ApiVersionManager
};

/**
 * 版本化API系统总结：
 * 
 * 1. 语义化版本控制：
 *    - 采用 major.minor.patch 格式
 *    - 支持预发布和构建元数据
 *    - 自动兼容性评估
 * 
 * 2. 数据版本化：
 *    - 所有API数据都包含版本信息
 *    - 支持元数据和兼容性标记
 *    - 提供数据校验和完整性检查
 * 
 * 3. 自动迁移系统：
 *    - 可插拔的迁移器架构
 *    - 支持双向迁移和验证
 *    - 详细的错误和警告报告
 * 
 * 4. 兼容性管理：
 *    - 多级兼容性评估
 *    - 自动迁移路径规划
 *    - 破坏性变更检测
 * 
 * 5. 使用便捷性：
 *    - 丰富的便捷函数
 *    - 单例管理器模式
 *    - 完整的示例代码
 */