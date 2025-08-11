/**
 * 岩土工程材料库服务
 * 提供专业的岩土工程材料管理、验证、计算和分析功能
 */

import {
  GeotechnicalMaterial,
  GeotechnicalMaterialLibrary,
  GeotechnicalMaterialType,
  ConstitutiveModel,
  MaterialSearchCriteria,
  MaterialValidationResult,
  ValidationItem,
  MaterialImportExportOptions,
  MaterialAssignment,
  SoilMaterialProperties,
  RockMaterialProperties,
  ArtificialMaterialProperties,
  STANDARD_MATERIALS
} from '../types/GeotechnicalMaterials';

/**
 * 岩土工程材料库管理服务
 */
export class GeotechnicalMaterialService {
  private materials: Map<string, GeotechnicalMaterial> = new Map();
  private libraries: Map<string, GeotechnicalMaterialLibrary> = new Map();
  private assignments: Map<string, MaterialAssignment[]> = new Map();
  
  // 事件回调
  private eventCallbacks: Map<string, Function[]> = new Map();
  
  constructor() {
    this.initializeStandardMaterials();
  }

  /**
   * 初始化标准材料库
   */
  private initializeStandardMaterials(): void {
    const standardLibrary: GeotechnicalMaterialLibrary = {
      id: 'standard_geotechnical',
      name: '岩土工程标准材料库',
      description: '包含常用岩土工程材料的标准参数',
      materials: [],
      type: 'standard',
      isReadOnly: true,
      isPublic: true,
      owner: 'system',
      version: '2024.1.0',
      created: new Date(),
      modified: new Date()
    };

    // 添加标准土体材料
    const standardSoils = this.createStandardSoilMaterials();
    const standardRocks = this.createStandardRockMaterials();
    const standardArtificial = this.createStandardArtificialMaterials();
    
    standardLibrary.materials = [...standardSoils, ...standardRocks, ...standardArtificial];
    
    this.libraries.set(standardLibrary.id, standardLibrary);
    
    // 添加材料到全局映射
    standardLibrary.materials.forEach(material => {
      this.materials.set(material.id, material);
    });
  }

  /**
   * 创建标准土体材料
   */
  private createStandardSoilMaterials(): GeotechnicalMaterial[] {
    return [
      // 软粘土
      {
        id: STANDARD_MATERIALS.SOILS.SOFT_CLAY,
        name: '软粘土',
        type: GeotechnicalMaterialType.CLAY,
        constitutiveModel: ConstitutiveModel.SOFT_SOIL,
        properties: {
          density: 1700,
          unitWeight: 17.0,
          elasticModulus: 3000,
          poissonRatio: 0.40,
          cohesion: 15,
          frictionAngle: 8,
          permeability: 1e-9,
          liquidLimit: 45,
          plasticLimit: 22,
          plasticityIndex: 23,
          compressionIndex: 0.35,
          swellingIndex: 0.08,
          constitutiveParameters: {
            lambda: 0.15,
            kappa: 0.03,
            M: 0.8,
            e0: 1.2
          }
        } as SoilMaterialProperties,
        description: '天然软粘土，高压缩性，低渗透性，适用于软土地基分析',
        source: '工程地质手册',
        standard: 'GB 50007-2011',
        reliability: 'standard',
        status: 'approved',
        validated: true,
        version: '1.0.0',
        created: new Date(),
        modified: new Date(),
        tags: ['软土', '粘土', '地基'],
        category: '天然土体',
        parameterRanges: {
          density: { min: 1500, max: 1900, recommended: [1650, 1750], unit: 'kg/m³' },
          cohesion: { min: 5, max: 30, recommended: [10, 20], unit: 'kPa' },
          frictionAngle: { min: 5, max: 15, recommended: [8, 12], unit: '°' }
        }
      },

      // 硬粘土
      {
        id: STANDARD_MATERIALS.SOILS.STIFF_CLAY,
        name: '硬粘土',
        type: GeotechnicalMaterialType.CLAY,
        constitutiveModel: ConstitutiveModel.MOHR_COULOMB,
        properties: {
          density: 2000,
          unitWeight: 20.0,
          elasticModulus: 25000,
          poissonRatio: 0.30,
          cohesion: 60,
          frictionAngle: 22,
          permeability: 1e-8,
          liquidLimit: 35,
          plasticLimit: 18,
          plasticityIndex: 17,
          compressionIndex: 0.15,
          swellingIndex: 0.03,
          overconsolidationRatio: 4.0
        } as SoilMaterialProperties,
        description: '超固结硬粘土，承载力高，变形小',
        source: '土力学原理',
        standard: 'GB 50007-2011',
        reliability: 'standard',
        status: 'approved',
        validated: true,
        version: '1.0.0',
        created: new Date(),
        modified: new Date(),
        tags: ['硬土', '粘土', '超固结'],
        category: '天然土体'
      },

      // 松散砂土
      {
        id: STANDARD_MATERIALS.SOILS.LOOSE_SAND,
        name: '松散砂土',
        type: GeotechnicalMaterialType.SAND,
        constitutiveModel: ConstitutiveModel.HARDENING_SOIL,
        properties: {
          density: 1700,
          unitWeight: 17.0,
          elasticModulus: 15000,
          poissonRatio: 0.30,
          cohesion: 0,
          frictionAngle: 30,
          dilatancyAngle: 0,
          permeability: 1e-4,
          constitutiveParameters: {
            E50ref: 15000,
            EoedRef: 15000,
            EurRef: 45000,
            m: 0.5,
            Rf: 0.9
          }
        } as SoilMaterialProperties,
        description: '中细砂，松散状态，渗透性好',
        source: '地基基础设计规范',
        standard: 'GB 50007-2011',
        reliability: 'standard',
        status: 'approved',
        validated: true,
        version: '1.0.0',
        created: new Date(),
        modified: new Date(),
        tags: ['砂土', '松散', '渗透'],
        category: '天然土体'
      },

      // 密实砂土
      {
        id: STANDARD_MATERIALS.SOILS.DENSE_SAND,
        name: '密实砂土',
        type: GeotechnicalMaterialType.SAND,
        constitutiveModel: ConstitutiveModel.HARDENING_SOIL,
        properties: {
          density: 2100,
          unitWeight: 21.0,
          elasticModulus: 50000,
          poissonRatio: 0.25,
          cohesion: 0,
          frictionAngle: 38,
          dilatancyAngle: 8,
          permeability: 1e-4,
          constitutiveParameters: {
            E50ref: 50000,
            EoedRef: 50000,
            EurRef: 150000,
            m: 0.5,
            Rf: 0.9,
            G0ref: 120000,
            gamma07: 2e-4
          }
        } as SoilMaterialProperties,
        description: '中粗砂，密实状态，承载力高',
        source: '地基基础设计规范',
        standard: 'GB 50007-2011',
        reliability: 'standard',
        status: 'approved',
        validated: true,
        version: '1.0.0',
        created: new Date(),
        modified: new Date(),
        tags: ['砂土', '密实', '高承载力'],
        category: '天然土体'
      }
    ];
  }

  /**
   * 创建标准岩石材料
   */
  private createStandardRockMaterials(): GeotechnicalMaterial[] {
    return [
      // 花岗岩
      {
        id: STANDARD_MATERIALS.ROCKS.GRANITE,
        name: '花岗岩',
        type: GeotechnicalMaterialType.ROCK_HARD,
        constitutiveModel: ConstitutiveModel.HOEK_BROWN,
        properties: {
          density: 2650,
          unitWeight: 26.5,
          elasticModulus: 50000000,
          poissonRatio: 0.20,
          uniaxialCompressiveStrength: 150,
          brazilianTensileStrength: 12,
          rqd: 85,
          gsi: 75,
          hoekBrownParameters: {
            mi: 32,
            GSI: 75,
            D: 0.0,
            mb: 7.0,
            s: 0.0039,
            a: 0.502
          }
        } as RockMaterialProperties,
        description: '完整-较完整花岗岩，高强度，低变形',
        source: '工程岩体分类标准',
        standard: 'GB/T 50218-2014',
        reliability: 'standard',
        status: 'approved',
        validated: true,
        version: '1.0.0',
        created: new Date(),
        modified: new Date(),
        tags: ['硬岩', '花岗岩', '高强度'],
        category: '岩石材料'
      },

      // 石灰岩
      {
        id: STANDARD_MATERIALS.ROCKS.LIMESTONE,
        name: '石灰岩',
        type: GeotechnicalMaterialType.ROCK_HARD,
        constitutiveModel: ConstitutiveModel.HOEK_BROWN,
        properties: {
          density: 2500,
          unitWeight: 25.0,
          elasticModulus: 35000000,
          poissonRatio: 0.25,
          uniaxialCompressiveStrength: 100,
          brazilianTensileStrength: 8,
          rqd: 70,
          gsi: 65,
          hoekBrownParameters: {
            mi: 12,
            GSI: 65,
            D: 0.0,
            mb: 2.4,
            s: 0.0013,
            a: 0.507
          }
        } as RockMaterialProperties,
        description: '中等强度石灰岩，可能存在溶蚀',
        source: '工程岩体分类标准',
        standard: 'GB/T 50218-2014',
        reliability: 'standard',
        status: 'approved',
        validated: true,
        version: '1.0.0',
        created: new Date(),
        modified: new Date(),
        tags: ['石灰岩', '中等强度', '溶蚀'],
        category: '岩石材料'
      }
    ];
  }

  /**
   * 创建标准人工材料
   */
  private createStandardArtificialMaterials(): GeotechnicalMaterial[] {
    return [
      // C30混凝土
      {
        id: STANDARD_MATERIALS.ARTIFICIAL.C30_CONCRETE,
        name: 'C30混凝土',
        type: GeotechnicalMaterialType.CONCRETE,
        constitutiveModel: ConstitutiveModel.LINEAR_ELASTIC,
        properties: {
          density: 2400,
          unitWeight: 24.0,
          elasticModulus: 30000000,
          poissonRatio: 0.20,
          concreteProperties: {
            compressiveStrength: 30,
            tensileStrength: 2.65,
            flexuralStrength: 4.2,
            age: 28,
            cementType: 'P.O 42.5'
          }
        } as ArtificialMaterialProperties,
        description: 'C30普通混凝土，28天强度',
        source: '混凝土结构设计规范',
        standard: 'GB 50010-2010',
        reliability: 'code',
        status: 'approved',
        validated: true,
        version: '1.0.0',
        created: new Date(),
        modified: new Date(),
        tags: ['混凝土', '结构材料', 'C30'],
        category: '人工材料'
      },

      // Q235钢材
      {
        id: STANDARD_MATERIALS.ARTIFICIAL.Q235_STEEL,
        name: 'Q235钢材',
        type: GeotechnicalMaterialType.STEEL,
        constitutiveModel: ConstitutiveModel.VON_MISES,
        properties: {
          density: 7850,
          unitWeight: 78.5,
          elasticModulus: 200000000,
          poissonRatio: 0.30,
          steelProperties: {
            yieldStrength: 235,
            ultimateStrength: 375,
            hardeningModulus: 2000000,
            steelGrade: 'Q235',
            carbonContent: 0.22
          }
        } as ArtificialMaterialProperties,
        description: 'Q235碳素结构钢',
        source: '钢结构设计规范',
        standard: 'GB 50017-2017',
        reliability: 'code',
        status: 'approved',
        validated: true,
        version: '1.0.0',
        created: new Date(),
        modified: new Date(),
        tags: ['钢材', '结构钢', 'Q235'],
        category: '人工材料'
      }
    ];
  }

  /**
   * 添加材料
   */
  public async addMaterial(material: GeotechnicalMaterial, libraryId?: string): Promise<boolean> {
    try {
      // 验证材料
      const validation = await this.validateMaterial(material);
      if (!validation.isValid && validation.errors.length > 0) {
        throw new Error(`材料验证失败: ${validation.errors.join(', ')}`);
      }

      // 检查ID唯一性
      if (this.materials.has(material.id)) {
        throw new Error(`材料ID已存在: ${material.id}`);
      }

      // 添加到材料映射
      this.materials.set(material.id, {
        ...material,
        created: new Date(),
        modified: new Date(),
        status: material.status || 'draft'
      });

      // 添加到指定库
      if (libraryId) {
        const library = this.libraries.get(libraryId);
        if (library && !library.isReadOnly) {
          library.materials.push(material);
          library.modified = new Date();
        }
      }

      this.emitEvent('materialAdded', { material, libraryId });
      return true;
    } catch (error) {
      console.error('添加材料失败:', error);
      return false;
    }
  }

  /**
   * 更新材料
   */
  public async updateMaterial(materialId: string, updates: Partial<GeotechnicalMaterial>): Promise<boolean> {
    try {
      const existing = this.materials.get(materialId);
      if (!existing) {
        throw new Error(`材料不存在: ${materialId}`);
      }

      const updated = {
        ...existing,
        ...updates,
        modified: new Date(),
        modifiedBy: updates.modifiedBy || 'current_user'
      };

      // 验证更新后的材料
      const validation = await this.validateMaterial(updated);
      if (!validation.isValid && validation.errors.length > 0) {
        throw new Error(`材料验证失败: ${validation.errors.join(', ')}`);
      }

      this.materials.set(materialId, updated);

      // 更新库中的材料
      this.libraries.forEach(library => {
        const index = library.materials.findIndex(m => m.id === materialId);
        if (index !== -1) {
          library.materials[index] = updated;
          library.modified = new Date();
        }
      });

      this.emitEvent('materialUpdated', { material: updated });
      return true;
    } catch (error) {
      console.error('更新材料失败:', error);
      return false;
    }
  }

  /**
   * 删除材料
   */
  public async deleteMaterial(materialId: string): Promise<boolean> {
    try {
      const material = this.materials.get(materialId);
      if (!material) {
        throw new Error(`材料不存在: ${materialId}`);
      }

      // 检查是否有关联使用
      const hasAssignments = Array.from(this.assignments.values())
        .some(assignments => assignments.some(a => a.materialId === materialId));
      
      if (hasAssignments) {
        throw new Error('材料正在使用中，无法删除');
      }

      // 从材料映射删除
      this.materials.delete(materialId);

      // 从库中删除
      this.libraries.forEach(library => {
        if (!library.isReadOnly) {
          const index = library.materials.findIndex(m => m.id === materialId);
          if (index !== -1) {
            library.materials.splice(index, 1);
            library.modified = new Date();
          }
        }
      });

      this.emitEvent('materialDeleted', { materialId });
      return true;
    } catch (error) {
      console.error('删除材料失败:', error);
      return false;
    }
  }

  /**
   * 获取材料
   */
  public getMaterial(materialId: string): GeotechnicalMaterial | null {
    return this.materials.get(materialId) || null;
  }

  /**
   * 搜索材料
   */
  public searchMaterials(criteria: MaterialSearchCriteria): GeotechnicalMaterial[] {
    let results = Array.from(this.materials.values());

    // 关键词搜索
    if (criteria.keyword) {
      const keyword = criteria.keyword.toLowerCase();
      results = results.filter(m => 
        m.name.toLowerCase().includes(keyword) ||
        m.description?.toLowerCase().includes(keyword) ||
        m.tags?.some(tag => tag.toLowerCase().includes(keyword))
      );
    }

    // 类型筛选
    if (criteria.type && criteria.type.length > 0) {
      results = results.filter(m => criteria.type!.includes(m.type));
    }

    // 本构模型筛选
    if (criteria.constitutiveModel && criteria.constitutiveModel.length > 0) {
      results = results.filter(m => criteria.constitutiveModel!.includes(m.constitutiveModel));
    }

    // 密度范围筛选
    if (criteria.densityRange) {
      const [min, max] = criteria.densityRange;
      results = results.filter(m => {
        const density = m.properties.density;
        return density >= min && density <= max;
      });
    }

    // 弹性模量范围筛选
    if (criteria.modulusRange) {
      const [min, max] = criteria.modulusRange;
      results = results.filter(m => {
        const modulus = m.properties.elasticModulus;
        return modulus >= min && modulus <= max;
      });
    }

    // 标签筛选
    if (criteria.tags && criteria.tags.length > 0) {
      results = results.filter(m => {
        if (!m.tags) return false;
        return criteria.tags!.some(tag => m.tags!.includes(tag));
      });
    }

    // 状态筛选
    if (criteria.status && criteria.status.length > 0) {
      results = results.filter(m => criteria.status!.includes(m.status));
    }

    // 验证状态筛选
    if (criteria.validated !== undefined) {
      results = results.filter(m => m.validated === criteria.validated);
    }

    // 排序
    if (criteria.sortBy) {
      results.sort((a, b) => {
        let aValue: any, bValue: any;
        
        switch (criteria.sortBy) {
          case 'name':
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
            break;
          case 'type':
            aValue = a.type;
            bValue = b.type;
            break;
          case 'modified':
            aValue = a.modified.getTime();
            bValue = b.modified.getTime();
            break;
          case 'usage':
            aValue = a.usageCount || 0;
            bValue = b.usageCount || 0;
            break;
          case 'reliability':
            const reliabilityOrder = { 'code': 4, 'standard': 3, 'literature': 2, 'empirical': 1, 'experimental': 0 };
            aValue = reliabilityOrder[a.reliability];
            bValue = reliabilityOrder[b.reliability];
            break;
          default:
            return 0;
        }

        if (aValue < bValue) return criteria.sortOrder === 'desc' ? 1 : -1;
        if (aValue > bValue) return criteria.sortOrder === 'desc' ? -1 : 1;
        return 0;
      });
    }

    return results;
  }

  /**
   * 验证材料
   */
  public async validateMaterial(material: GeotechnicalMaterial): Promise<MaterialValidationResult> {
    const result: MaterialValidationResult = {
      isValid: true,
      materialId: material.id,
      results: {
        basicProperties: { passed: true, score: 100, details: {} },
        strengthParameters: { passed: true, score: 100, details: {} },
        constitutiveModel: { passed: true, score: 100, details: {} },
        applicabilityCheck: { passed: true, score: 100, details: {} }
      },
      overallScore: 0,
      recommendations: [],
      warnings: [],
      errors: []
    };

    // 基本属性验证
    result.results.basicProperties = this.validateBasicProperties(material);
    
    // 强度参数验证
    result.results.strengthParameters = this.validateStrengthParameters(material);
    
    // 本构模型验证
    result.results.constitutiveModel = this.validateConstitutiveModel(material);
    
    // 适用性检查
    result.results.applicabilityCheck = this.validateApplicability(material);

    // 计算总体评分
    const scores = Object.values(result.results).map(r => r.score);
    result.overallScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

    // 判断是否有效
    result.isValid = Object.values(result.results).every(r => r.passed) && result.errors.length === 0;

    return result;
  }

  /**
   * 验证基本属性
   */
  private validateBasicProperties(material: GeotechnicalMaterial): ValidationItem {
    const details: any = {};
    let score = 100;
    let passed = true;

    const props = material.properties;

    // 密度验证
    if (props.density < 1000 || props.density > 5000) {
      details.density = {
        value: props.density,
        expectedRange: [1000, 5000],
        status: 'warning',
        message: '密度值似乎不合理'
      };
      score -= 10;
    } else {
      details.density = {
        value: props.density,
        status: 'pass'
      };
    }

    // 弹性模量验证
    const modulusRanges = {
      [GeotechnicalMaterialType.CLAY]: [1000, 100000],
      [GeotechnicalMaterialType.SAND]: [5000, 200000],
      [GeotechnicalMaterialType.ROCK_HARD]: [10000000, 100000000],
      [GeotechnicalMaterialType.CONCRETE]: [20000000, 40000000]
    };

    const expectedRange = modulusRanges[material.type];
    if (expectedRange) {
      const [min, max] = expectedRange;
      if (props.elasticModulus < min || props.elasticModulus > max) {
        details.elasticModulus = {
          value: props.elasticModulus,
          expectedRange: [min, max],
          status: 'warning',
          message: `${material.type}的弹性模量建议范围: ${min}-${max} kPa`
        };
        score -= 15;
      }
    }

    // 泊松比验证
    if (props.poissonRatio < 0 || props.poissonRatio >= 0.5) {
      details.poissonRatio = {
        value: props.poissonRatio,
        expectedRange: [0, 0.499],
        status: 'error',
        message: '泊松比必须在0-0.5之间'
      };
      passed = false;
      score -= 30;
    }

    return { passed, score: Math.max(0, score), details };
  }

  /**
   * 验证强度参数
   */
  private validateStrengthParameters(material: GeotechnicalMaterial): ValidationItem {
    const details: any = {};
    let score = 100;
    let passed = true;

    const props = material.properties;

    // 土体强度参数验证
    if ('cohesion' in props && 'frictionAngle' in props) {
      const soilProps = props as SoilMaterialProperties;
      
      if (soilProps.cohesion !== undefined && soilProps.cohesion < 0) {
        details.cohesion = {
          value: soilProps.cohesion,
          status: 'error',
          message: '粘聚力不能为负值'
        };
        passed = false;
        score -= 25;
      }

      if (soilProps.frictionAngle !== undefined && 
          (soilProps.frictionAngle < 0 || soilProps.frictionAngle > 50)) {
        details.frictionAngle = {
          value: soilProps.frictionAngle,
          expectedRange: [0, 50],
          status: 'warning',
          message: '内摩擦角建议范围: 0-50°'
        };
        score -= 15;
      }
    }

    return { passed, score: Math.max(0, score), details };
  }

  /**
   * 验证本构模型
   */
  private validateConstitutiveModel(material: GeotechnicalMaterial): ValidationItem {
    const details: any = {};
    let score = 100;
    let passed = true;

    // 检查本构模型与材料类型的匹配性
    const modelCompatibility = {
      [GeotechnicalMaterialType.CLAY]: [
        ConstitutiveModel.LINEAR_ELASTIC,
        ConstitutiveModel.MOHR_COULOMB,
        ConstitutiveModel.CAM_CLAY,
        ConstitutiveModel.MODIFIED_CAM_CLAY,
        ConstitutiveModel.SOFT_SOIL,
        ConstitutiveModel.SOFT_SOIL_CREEP
      ],
      [GeotechnicalMaterialType.SAND]: [
        ConstitutiveModel.LINEAR_ELASTIC,
        ConstitutiveModel.MOHR_COULOMB,
        ConstitutiveModel.DRUCKER_PRAGER,
        ConstitutiveModel.HARDENING_SOIL,
        ConstitutiveModel.HARDENING_SOIL_SMALL_STRAIN
      ],
      [GeotechnicalMaterialType.ROCK_HARD]: [
        ConstitutiveModel.LINEAR_ELASTIC,
        ConstitutiveModel.MOHR_COULOMB,
        ConstitutiveModel.HOEK_BROWN,
        ConstitutiveModel.JOINTED_ROCK
      ]
    };

    const compatibleModels = modelCompatibility[material.type];
    if (compatibleModels && !compatibleModels.includes(material.constitutiveModel)) {
      details.compatibility = {
        value: material.constitutiveModel,
        status: 'warning',
        message: `${material.type}通常不使用${material.constitutiveModel}模型`
      };
      score -= 20;
    }

    return { passed, score: Math.max(0, score), details };
  }

  /**
   * 验证适用性
   */
  private validateApplicability(material: GeotechnicalMaterial): ValidationItem {
    const details: any = {};
    let score = 100;
    let passed = true;

    // 检查参数的一致性
    const props = material.properties;
    
    // 检查密度和重度的一致性
    const expectedUnitWeight = props.density * 9.81 / 1000; // kN/m³
    const actualUnitWeight = props.unitWeight;
    
    if (actualUnitWeight && Math.abs(actualUnitWeight - expectedUnitWeight) > 1.0) {
      details.densityUnitWeightConsistency = {
        value: actualUnitWeight,
        expectedRange: [expectedUnitWeight - 1, expectedUnitWeight + 1],
        status: 'warning',
        message: `重度与密度不一致，建议重度为 ${expectedUnitWeight.toFixed(1)} kN/m³`
      };
      score -= 10;
    }

    return { passed, score: Math.max(0, score), details };
  }

  /**
   * 获取材料统计信息
   */
  public getStatistics() {
    const materialsByType = new Map<GeotechnicalMaterialType, number>();
    const materialsByModel = new Map<ConstitutiveModel, number>();
    const materialsByReliability = new Map<string, number>();
    let validatedCount = 0;
    let totalUsage = 0;

    for (const material of this.materials.values()) {
      // 按类型统计
      materialsByType.set(
        material.type,
        (materialsByType.get(material.type) || 0) + 1
      );

      // 按本构模型统计
      materialsByModel.set(
        material.constitutiveModel,
        (materialsByModel.get(material.constitutiveModel) || 0) + 1
      );

      // 按可靠性统计
      materialsByReliability.set(
        material.reliability,
        (materialsByReliability.get(material.reliability) || 0) + 1
      );

      // 验证统计
      if (material.validated) validatedCount++;

      // 使用统计
      totalUsage += material.usageCount || 0;
    }

    return {
      totalMaterials: this.materials.size,
      totalLibraries: this.libraries.size,
      validatedMaterials: validatedCount,
      totalUsage,
      materialsByType: Object.fromEntries(materialsByType),
      materialsByModel: Object.fromEntries(materialsByModel),
      materialsByReliability: Object.fromEntries(materialsByReliability),
      averageUsage: totalUsage / this.materials.size || 0
    };
  }

  /**
   * 事件处理
   */
  private emitEvent(event: string, data: any): void {
    const callbacks = this.eventCallbacks.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`事件回调错误 ${event}:`, error);
        }
      });
    }
  }

  /**
   * 添加事件监听器
   */
  public addEventListener(event: string, callback: Function): void {
    if (!this.eventCallbacks.has(event)) {
      this.eventCallbacks.set(event, []);
    }
    this.eventCallbacks.get(event)!.push(callback);
  }

  /**
   * 移除事件监听器
   */
  public removeEventListener(event: string, callback: Function): void {
    const callbacks = this.eventCallbacks.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    }
  }
}

// 单例导出
export const geotechnicalMaterialService = new GeotechnicalMaterialService();