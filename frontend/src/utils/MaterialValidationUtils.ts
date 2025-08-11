/**
 * 岩土工程材料参数验证和计算工具
 * 提供专业的材料参数验证、计算和分析功能
 */

import {
  GeotechnicalMaterial,
  GeotechnicalMaterialType,
  ConstitutiveModel,
  SoilMaterialProperties,
  RockMaterialProperties,
  ArtificialMaterialProperties,
  MaterialValidationResult,
  ValidationItem
} from '../types/GeotechnicalMaterials';

/**
 * 材料参数验证工具类
 */
export class MaterialValidationUtils {
  
  /**
   * 验证材料参数合理性
   */
  static validateMaterialParameters(material: GeotechnicalMaterial): MaterialValidationResult {
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
    
    // 本构模型兼容性验证
    result.results.constitutiveModel = this.validateModelCompatibility(material);
    
    // 工程适用性验证
    result.results.applicabilityCheck = this.validateApplicability(material);

    // 计算总体评分和状态
    this.calculateOverallResult(result);

    return result;
  }

  /**
   * 验证基本物理属性
   */
  private static validateBasicProperties(material: GeotechnicalMaterial): ValidationItem {
    const details: any = {};
    let score = 100;
    let passed = true;

    const props = material.properties;

    // 密度验证
    const densityValidation = this.validateDensity(material.type, props.density);
    details.density = densityValidation;
    if (!densityValidation.passed) {
      score -= 20;
      passed = false;
    }

    // 弹性模量验证
    const modulusValidation = this.validateElasticModulus(material.type, props.elasticModulus);
    details.elasticModulus = modulusValidation;
    if (!modulusValidation.passed) {
      score -= 25;
      passed = false;
    }

    // 泊松比验证
    const poissonValidation = this.validatePoissonRatio(material.type, props.poissonRatio);
    details.poissonRatio = poissonValidation;
    if (!poissonValidation.passed) {
      score -= 30;
      passed = false;
    }

    // 密度与重度一致性检查
    if (props.unitWeight) {
      const expectedUnitWeight = props.density * 9.81 / 1000;
      const deviation = Math.abs(props.unitWeight - expectedUnitWeight) / expectedUnitWeight;
      
      details.densityUnitWeightConsistency = {
        passed: deviation <= 0.1,
        value: props.unitWeight,
        expectedValue: expectedUnitWeight,
        deviation: deviation * 100,
        message: deviation > 0.1 ? `重度与密度不一致，偏差 ${(deviation * 100).toFixed(1)}%` : '一致'
      };

      if (deviation > 0.1) {
        score -= 10;
      }
    }

    return { passed, score: Math.max(0, score), details };
  }

  /**
   * 验证密度参数
   */
  private static validateDensity(type: GeotechnicalMaterialType, density: number) {
    const densityRanges = {
      [GeotechnicalMaterialType.CLAY]: { min: 1400, max: 2200, typical: [1700, 2000] },
      [GeotechnicalMaterialType.SILT]: { min: 1500, max: 2100, typical: [1600, 1900] },
      [GeotechnicalMaterialType.SAND]: { min: 1500, max: 2200, typical: [1700, 2100] },
      [GeotechnicalMaterialType.GRAVEL]: { min: 1800, max: 2400, typical: [2000, 2300] },
      [GeotechnicalMaterialType.ROCK_HARD]: { min: 2200, max: 3200, typical: [2500, 2800] },
      [GeotechnicalMaterialType.ROCK_SOFT]: { min: 2000, max: 2800, typical: [2200, 2600] },
      [GeotechnicalMaterialType.CONCRETE]: { min: 2200, max: 2600, typical: [2300, 2500] },
      [GeotechnicalMaterialType.STEEL]: { min: 7600, max: 8000, typical: [7800, 7900] },
      [GeotechnicalMaterialType.FILL]: { min: 1300, max: 2000, typical: [1500, 1800] }
    };

    const range = densityRanges[type];
    if (!range) {
      return {
        passed: true,
        value: density,
        message: '未定义密度范围'
      };
    }

    const { min, max, typical } = range;
    const [typicalMin, typicalMax] = typical;

    if (density < min || density > max) {
      return {
        passed: false,
        value: density,
        expectedRange: [min, max],
        message: `密度超出合理范围 [${min}-${max}] kg/m³`
      };
    }

    if (density < typicalMin || density > typicalMax) {
      return {
        passed: true,
        value: density,
        expectedRange: [typicalMin, typicalMax],
        warning: true,
        message: `密度在合理范围内，但不在典型范围 [${typicalMin}-${typicalMax}] kg/m³`
      };
    }

    return {
      passed: true,
      value: density,
      message: '密度在典型范围内'
    };
  }

  /**
   * 验证弹性模量
   */
  private static validateElasticModulus(type: GeotechnicalMaterialType, modulus: number) {
    const modulusRanges = {
      [GeotechnicalMaterialType.CLAY]: { min: 1000, max: 50000, typical: [2000, 20000] },
      [GeotechnicalMaterialType.SILT]: { min: 2000, max: 80000, typical: [5000, 30000] },
      [GeotechnicalMaterialType.SAND]: { min: 5000, max: 200000, typical: [15000, 80000] },
      [GeotechnicalMaterialType.GRAVEL]: { min: 50000, max: 500000, typical: [100000, 300000] },
      [GeotechnicalMaterialType.ROCK_HARD]: { min: 10000000, max: 100000000, typical: [20000000, 70000000] },
      [GeotechnicalMaterialType.ROCK_SOFT]: { min: 1000000, max: 20000000, typical: [5000000, 15000000] },
      [GeotechnicalMaterialType.CONCRETE]: { min: 20000000, max: 50000000, typical: [25000000, 35000000] },
      [GeotechnicalMaterialType.STEEL]: { min: 180000000, max: 220000000, typical: [200000000, 210000000] }
    };

    const range = modulusRanges[type];
    if (!range) {
      return {
        passed: true,
        value: modulus,
        message: '未定义弹性模量范围'
      };
    }

    const { min, max, typical } = range;
    const [typicalMin, typicalMax] = typical;

    if (modulus < min || modulus > max) {
      return {
        passed: false,
        value: modulus,
        expectedRange: [min, max],
        message: `弹性模量超出合理范围 [${this.formatNumber(min)}-${this.formatNumber(max)}] kPa`
      };
    }

    if (modulus < typicalMin || modulus > typicalMax) {
      return {
        passed: true,
        value: modulus,
        expectedRange: [typicalMin, typicalMax],
        warning: true,
        message: `弹性模量在合理范围内，但不在典型范围 [${this.formatNumber(typicalMin)}-${this.formatNumber(typicalMax)}] kPa`
      };
    }

    return {
      passed: true,
      value: modulus,
      message: '弹性模量在典型范围内'
    };
  }

  /**
   * 验证泊松比
   */
  private static validatePoissonRatio(type: GeotechnicalMaterialType, poisson: number) {
    // 理论限制: 0 <= ν < 0.5
    if (poisson < 0 || poisson >= 0.5) {
      return {
        passed: false,
        value: poisson,
        expectedRange: [0, 0.499],
        message: '泊松比必须在 0 ≤ ν < 0.5 范围内'
      };
    }

    const poissonRanges = {
      [GeotechnicalMaterialType.CLAY]: { min: 0.25, max: 0.45, typical: [0.30, 0.40] },
      [GeotechnicalMaterialType.SILT]: { min: 0.20, max: 0.40, typical: [0.25, 0.35] },
      [GeotechnicalMaterialType.SAND]: { min: 0.15, max: 0.40, typical: [0.25, 0.35] },
      [GeotechnicalMaterialType.GRAVEL]: { min: 0.15, max: 0.35, typical: [0.20, 0.30] },
      [GeotechnicalMaterialType.ROCK_HARD]: { min: 0.10, max: 0.35, typical: [0.15, 0.25] },
      [GeotechnicalMaterialType.ROCK_SOFT]: { min: 0.15, max: 0.40, typical: [0.20, 0.30] },
      [GeotechnicalMaterialType.CONCRETE]: { min: 0.15, max: 0.25, typical: [0.18, 0.22] },
      [GeotechnicalMaterialType.STEEL]: { min: 0.27, max: 0.33, typical: [0.29, 0.31] }
    };

    const range = poissonRanges[type];
    if (!range) {
      return {
        passed: true,
        value: poisson,
        message: '未定义泊松比范围'
      };
    }

    const { min, max, typical } = range;
    const [typicalMin, typicalMax] = typical;

    if (poisson < min || poisson > max) {
      return {
        passed: true,
        value: poisson,
        expectedRange: [min, max],
        warning: true,
        message: `泊松比不在典型范围 [${min}-${max}] 内，请核实`
      };
    }

    if (poisson < typicalMin || poisson > typicalMax) {
      return {
        passed: true,
        value: poisson,
        expectedRange: [typicalMin, typicalMax],
        message: `泊松比在合理范围内，典型范围为 [${typicalMin}-${typicalMax}]`
      };
    }

    return {
      passed: true,
      value: poisson,
      message: '泊松比在典型范围内'
    };
  }

  /**
   * 验证强度参数
   */
  private static validateStrengthParameters(material: GeotechnicalMaterial): ValidationItem {
    const details: any = {};
    let score = 100;
    let passed = true;

    const props = material.properties;

    if ('cohesion' in props && 'frictionAngle' in props) {
      const soilProps = props as SoilMaterialProperties;
      
      // 粘聚力验证
      if (soilProps.cohesion !== undefined) {
        const cohesionValidation = this.validateCohesion(material.type, soilProps.cohesion);
        details.cohesion = cohesionValidation;
        if (!cohesionValidation.passed) {
          score -= 25;
          passed = false;
        }
      }

      // 内摩擦角验证
      if (soilProps.frictionAngle !== undefined) {
        const frictionValidation = this.validateFrictionAngle(material.type, soilProps.frictionAngle);
        details.frictionAngle = frictionValidation;
        if (!frictionValidation.passed) {
          score -= 25;
          passed = false;
        }
      }

      // 强度参数组合合理性检查
      if (soilProps.cohesion !== undefined && soilProps.frictionAngle !== undefined) {
        const combinationValidation = this.validateStrengthCombination(
          material.type, 
          soilProps.cohesion, 
          soilProps.frictionAngle
        );
        details.strengthCombination = combinationValidation;
        if (!combinationValidation.passed) {
          score -= 15;
        }
      }
    }

    // 岩石强度参数验证
    if ('uniaxialCompressiveStrength' in props) {
      const rockProps = props as RockMaterialProperties;
      const ucsValidation = this.validateUCS(material.type, rockProps.uniaxialCompressiveStrength);
      details.uniaxialCompressiveStrength = ucsValidation;
      if (!ucsValidation.passed) {
        score -= 30;
        passed = false;
      }
    }

    // 混凝土/钢材强度验证
    if ('concreteProperties' in props || 'steelProperties' in props) {
      const artificialProps = props as ArtificialMaterialProperties;
      
      if (artificialProps.concreteProperties) {
        const concreteValidation = this.validateConcreteStrength(artificialProps.concreteProperties);
        details.concreteStrength = concreteValidation;
        if (!concreteValidation.passed) {
          score -= 25;
          passed = false;
        }
      }

      if (artificialProps.steelProperties) {
        const steelValidation = this.validateSteelStrength(artificialProps.steelProperties);
        details.steelStrength = steelValidation;
        if (!steelValidation.passed) {
          score -= 25;
          passed = false;
        }
      }
    }

    return { passed, score: Math.max(0, score), details };
  }

  /**
   * 验证粘聚力
   */
  private static validateCohesion(type: GeotechnicalMaterialType, cohesion: number) {
    if (cohesion < 0) {
      return {
        passed: false,
        value: cohesion,
        message: '粘聚力不能为负值'
      };
    }

    const cohesionRanges = {
      [GeotechnicalMaterialType.CLAY]: { max: 200, typical: [10, 80] },
      [GeotechnicalMaterialType.SILT]: { max: 50, typical: [5, 30] },
      [GeotechnicalMaterialType.SAND]: { max: 10, typical: [0, 5] },
      [GeotechnicalMaterialType.FILL]: { max: 100, typical: [0, 40] }
    };

    const range = cohesionRanges[type];
    if (!range) {
      return {
        passed: true,
        value: cohesion,
        message: '未定义粘聚力范围'
      };
    }

    const { max, typical } = range;
    const [typicalMin, typicalMax] = typical;

    if (cohesion > max) {
      return {
        passed: false,
        value: cohesion,
        expectedRange: [0, max],
        message: `${this.getMaterialTypeName(type)}的粘聚力通常不超过 ${max} kPa`
      };
    }

    if (cohesion < typicalMin || cohesion > typicalMax) {
      return {
        passed: true,
        value: cohesion,
        expectedRange: [typicalMin, typicalMax],
        warning: true,
        message: `粘聚力不在典型范围 [${typicalMin}-${typicalMax}] kPa 内`
      };
    }

    return {
      passed: true,
      value: cohesion,
      message: '粘聚力在典型范围内'
    };
  }

  /**
   * 验证内摩擦角
   */
  private static validateFrictionAngle(type: GeotechnicalMaterialType, friction: number) {
    if (friction < 0 || friction > 50) {
      return {
        passed: false,
        value: friction,
        expectedRange: [0, 50],
        message: '内摩擦角通常在 0-50° 范围内'
      };
    }

    const frictionRanges = {
      [GeotechnicalMaterialType.CLAY]: { min: 5, max: 25, typical: [8, 20] },
      [GeotechnicalMaterialType.SILT]: { min: 15, max: 35, typical: [20, 30] },
      [GeotechnicalMaterialType.SAND]: { min: 25, max: 45, typical: [28, 38] },
      [GeotechnicalMaterialType.GRAVEL]: { min: 35, max: 50, typical: [38, 45] }
    };

    const range = frictionRanges[type];
    if (!range) {
      return {
        passed: true,
        value: friction,
        message: '未定义内摩擦角范围'
      };
    }

    const { min, max, typical } = range;
    const [typicalMin, typicalMax] = typical;

    if (friction < min || friction > max) {
      return {
        passed: false,
        value: friction,
        expectedRange: [min, max],
        message: `${this.getMaterialTypeName(type)}的内摩擦角通常在 [${min}-${max}]° 范围内`
      };
    }

    if (friction < typicalMin || friction > typicalMax) {
      return {
        passed: true,
        value: friction,
        expectedRange: [typicalMin, typicalMax],
        warning: true,
        message: `内摩擦角不在典型范围 [${typicalMin}-${typicalMax}]° 内`
      };
    }

    return {
      passed: true,
      value: friction,
      message: '内摩擦角在典型范围内'
    };
  }

  /**
   * 验证强度参数组合
   */
  private static validateStrengthCombination(
    type: GeotechnicalMaterialType, 
    cohesion: number, 
    friction: number
  ) {
    // 检查强度参数的合理组合
    const isHighCohesion = cohesion > 50;
    const isHighFriction = friction > 35;
    const isLowCohesion = cohesion < 5;
    const isLowFriction = friction < 15;

    if (isHighCohesion && isHighFriction) {
      return {
        passed: true,
        warning: true,
        message: '高粘聚力和高内摩擦角的组合不常见，请核实参数'
      };
    }

    if (isLowCohesion && isLowFriction) {
      return {
        passed: true,
        warning: true,
        message: '低粘聚力和低内摩擦角的组合强度较低，请确认'
      };
    }

    // 特定材料类型的组合检查
    if (type === GeotechnicalMaterialType.SAND && cohesion > 10) {
      return {
        passed: true,
        warning: true,
        message: '纯砂土通常粘聚力接近零，当前值可能偏高'
      };
    }

    if (type === GeotechnicalMaterialType.CLAY && friction > 25) {
      return {
        passed: true,
        warning: true,
        message: '粘土的内摩擦角通常较低，当前值可能偏高'
      };
    }

    return {
      passed: true,
      message: '强度参数组合合理'
    };
  }

  /**
   * 验证本构模型兼容性
   */
  private static validateModelCompatibility(material: GeotechnicalMaterial): ValidationItem {
    const details: any = {};
    let score = 100;
    let passed = true;

    // 材料类型与本构模型的兼容性
    const compatibility = this.checkModelTypeCompatibility(material.type, material.constitutiveModel);
    details.typeCompatibility = compatibility;
    
    if (!compatibility.passed) {
      score -= 30;
      passed = false;
    }

    // 参数与模型的兼容性
    const parameterCompatibility = this.checkParameterModelCompatibility(material);
    details.parameterCompatibility = parameterCompatibility;
    
    if (!parameterCompatibility.passed) {
      score -= 20;
    }

    return { passed, score: Math.max(0, score), details };
  }

  /**
   * 检查材料类型与本构模型兼容性
   */
  private static checkModelTypeCompatibility(type: GeotechnicalMaterialType, model: ConstitutiveModel) {
    const compatibilityMatrix = {
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
      ],
      [GeotechnicalMaterialType.CONCRETE]: [
        ConstitutiveModel.LINEAR_ELASTIC,
        ConstitutiveModel.NONLINEAR_ELASTIC,
        ConstitutiveModel.MOHR_COULOMB
      ],
      [GeotechnicalMaterialType.STEEL]: [
        ConstitutiveModel.LINEAR_ELASTIC,
        ConstitutiveModel.VON_MISES,
        ConstitutiveModel.TRESCA
      ]
    };

    const compatibleModels = compatibilityMatrix[type] || [];
    const isCompatible = compatibleModels.includes(model);

    return {
      passed: isCompatible,
      compatible: isCompatible,
      recommendedModels: compatibleModels,
      message: isCompatible 
        ? '本构模型与材料类型兼容'
        : `${this.getMaterialTypeName(type)}通常不使用${this.getModelName(model)}模型`
    };
  }

  /**
   * 检查参数与本构模型兼容性
   */
  private static checkParameterModelCompatibility(material: GeotechnicalMaterial) {
    const { constitutiveModel, properties } = material;
    const missingParams: string[] = [];
    const warnings: string[] = [];

    // 检查高级模型所需的特殊参数
    if (constitutiveModel === ConstitutiveModel.HARDENING_SOIL) {
      const soilProps = properties as SoilMaterialProperties;
      if (!soilProps.constitutiveParameters?.E50ref) {
        missingParams.push('E50ref (三轴压缩割线模量)');
      }
      if (!soilProps.constitutiveParameters?.EoedRef) {
        missingParams.push('EoedRef (侧限压缩模量)');
      }
      if (!soilProps.constitutiveParameters?.EurRef) {
        missingParams.push('EurRef (卸载再加载模量)');
      }
    }

    if (constitutiveModel === ConstitutiveModel.CAM_CLAY || constitutiveModel === ConstitutiveModel.MODIFIED_CAM_CLAY) {
      const soilProps = properties as SoilMaterialProperties;
      if (!soilProps.constitutiveParameters?.lambda) {
        missingParams.push('λ (压缩参数)');
      }
      if (!soilProps.constitutiveParameters?.kappa) {
        missingParams.push('κ (回弹参数)');
      }
      if (!soilProps.constitutiveParameters?.M) {
        missingParams.push('M (临界状态应力比)');
      }
    }

    if (constitutiveModel === ConstitutiveModel.HOEK_BROWN) {
      const rockProps = properties as RockMaterialProperties;
      if (!rockProps.hoekBrownParameters?.mi) {
        missingParams.push('mi (完整岩石参数)');
      }
      if (!rockProps.hoekBrownParameters?.GSI) {
        missingParams.push('GSI (地质强度指标)');
      }
    }

    const hasMissingParams = missingParams.length > 0;
    
    return {
      passed: !hasMissingParams,
      missingParameters: missingParams,
      warnings: warnings,
      message: hasMissingParams 
        ? `${this.getModelName(constitutiveModel)}模型缺少必要参数: ${missingParams.join(', ')}`
        : '参数与本构模型匹配'
    };
  }

  /**
   * 验证工程适用性
   */
  private static validateApplicability(material: GeotechnicalMaterial): ValidationItem {
    const details: any = {};
    let score = 100;
    let passed = true;

    // 参数一致性检查
    const consistencyCheck = this.checkParameterConsistency(material);
    details.parameterConsistency = consistencyCheck;
    if (!consistencyCheck.passed) {
      score -= 15;
    }

    // 工程经验检查
    const experienceCheck = this.checkEngineeringExperience(material);
    details.engineeringExperience = experienceCheck;
    if (!experienceCheck.passed) {
      score -= 10;
    }

    return { passed, score: Math.max(0, score), details };
  }

  /**
   * 检查参数一致性
   */
  private static checkParameterConsistency(material: GeotechnicalMaterial) {
    const issues: string[] = [];
    const warnings: string[] = [];

    const props = material.properties;

    // 检查密度和重度一致性
    if (props.unitWeight) {
      const expectedUnitWeight = props.density * 9.81 / 1000;
      const deviation = Math.abs(props.unitWeight - expectedUnitWeight) / expectedUnitWeight;
      
      if (deviation > 0.15) {
        issues.push(`重度与密度严重不一致，偏差${(deviation * 100).toFixed(1)}%`);
      } else if (deviation > 0.05) {
        warnings.push(`重度与密度存在偏差，偏差${(deviation * 100).toFixed(1)}%`);
      }
    }

    // 检查弹性模量与其他参数的关系
    if ('shearModulus' in props && props.shearModulus) {
      const expectedG = props.elasticModulus / (2 * (1 + props.poissonRatio));
      const deviation = Math.abs(props.shearModulus - expectedG) / expectedG;
      
      if (deviation > 0.1) {
        warnings.push('剪切模量与弹性模量、泊松比不一致');
      }
    }

    return {
      passed: issues.length === 0,
      issues: issues,
      warnings: warnings,
      message: issues.length === 0 
        ? (warnings.length === 0 ? '参数一致性良好' : '参数基本一致，有少量警告')
        : '参数存在不一致问题'
    };
  }

  /**
   * 检查工程经验
   */
  private static checkEngineeringExperience(material: GeotechnicalMaterial) {
    const suggestions: string[] = [];
    const props = material.properties;

    // 基于材料类型的经验建议
    if (material.type === GeotechnicalMaterialType.CLAY) {
      if (props.elasticModulus > 50000) {
        suggestions.push('粘土的弹性模量较高，建议核实是否为硬粘土');
      }
    }

    if (material.type === GeotechnicalMaterialType.SAND) {
      if (props.poissonRatio > 0.35) {
        suggestions.push('砂土的泊松比通常在0.25-0.35之间');
      }
    }

    // 本构模型选择建议
    if (material.constitutiveModel === ConstitutiveModel.LINEAR_ELASTIC && 'cohesion' in props) {
      suggestions.push('对于有粘聚力的土体，建议考虑使用塑性本构模型');
    }

    return {
      passed: true,
      suggestions: suggestions,
      message: suggestions.length === 0 
        ? '符合工程经验'
        : `有${suggestions.length}条经验建议`
    };
  }

  /**
   * 计算总体验证结果
   */
  private static calculateOverallResult(result: MaterialValidationResult): void {
    const scores = Object.values(result.results).map(r => r.score);
    result.overallScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

    // 收集所有错误、警告和建议
    Object.values(result.results).forEach(validationResult => {
      Object.values(validationResult.details).forEach((detail: any) => {
        if (!detail.passed && detail.message) {
          result.errors.push(detail.message);
        } else if (detail.warning && detail.message) {
          result.warnings.push(detail.message);
        }
      });
    });

    // 判断总体是否有效
    result.isValid = Object.values(result.results).every(r => r.passed) && result.errors.length === 0;

    // 生成建议
    if (result.overallScore < 60) {
      result.recommendations.push('材料参数需要大幅调整，建议重新检查所有参数');
    } else if (result.overallScore < 80) {
      result.recommendations.push('材料参数基本合理，但建议优化部分参数');
    } else {
      result.recommendations.push('材料参数合理，符合工程要求');
    }
  }

  /**
   * 工具方法
   */
  private static formatNumber(num: number): string {
    if (num >= 1000000000) {
      return `${(num / 1000000000).toFixed(1)}B`;
    } else if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  }

  private static getMaterialTypeName(type: GeotechnicalMaterialType): string {
    const nameMap = {
      [GeotechnicalMaterialType.CLAY]: '粘土',
      [GeotechnicalMaterialType.SILT]: '粉土',
      [GeotechnicalMaterialType.SAND]: '砂土',
      [GeotechnicalMaterialType.GRAVEL]: '砾石土',
      [GeotechnicalMaterialType.ROCK_HARD]: '硬质岩',
      [GeotechnicalMaterialType.ROCK_SOFT]: '软质岩',
      [GeotechnicalMaterialType.CONCRETE]: '混凝土',
      [GeotechnicalMaterialType.STEEL]: '钢材',
      [GeotechnicalMaterialType.FILL]: '填土'
    };
    return nameMap[type] || type;
  }

  private static getModelName(model: ConstitutiveModel): string {
    const nameMap = {
      [ConstitutiveModel.LINEAR_ELASTIC]: '线弹性',
      [ConstitutiveModel.MOHR_COULOMB]: '摩尔-库伦',
      [ConstitutiveModel.DRUCKER_PRAGER]: '德鲁克-普拉格',
      [ConstitutiveModel.CAM_CLAY]: '剑桥模型',
      [ConstitutiveModel.HARDENING_SOIL]: '硬化土模型',
      [ConstitutiveModel.HOEK_BROWN]: '霍克-布朗'
    };
    return nameMap[model] || model;
  }

  private static validateUCS(type: GeotechnicalMaterialType, ucs: number) {
    // 岩石单轴抗压强度验证逻辑
    return {
      passed: ucs > 0,
      value: ucs,
      message: ucs > 0 ? '单轴抗压强度有效' : '单轴抗压强度必须大于零'
    };
  }

  private static validateConcreteStrength(concreteProps: any) {
    // 混凝土强度验证逻辑
    return {
      passed: concreteProps.compressiveStrength > 0,
      message: '混凝土强度参数有效'
    };
  }

  private static validateSteelStrength(steelProps: any) {
    // 钢材强度验证逻辑
    return {
      passed: steelProps.yieldStrength > 0 && steelProps.ultimateStrength > steelProps.yieldStrength,
      message: '钢材强度参数有效'
    };
  }
}

/**
 * 材料参数计算工具类
 */
export class MaterialCalculationUtils {
  
  /**
   * 计算剪切模量
   */
  static calculateShearModulus(elasticModulus: number, poissonRatio: number): number {
    return elasticModulus / (2 * (1 + poissonRatio));
  }

  /**
   * 计算体积模量
   */
  static calculateBulkModulus(elasticModulus: number, poissonRatio: number): number {
    return elasticModulus / (3 * (1 - 2 * poissonRatio));
  }

  /**
   * 计算重度
   */
  static calculateUnitWeight(density: number): number {
    return density * 9.81 / 1000; // kN/m³
  }

  /**
   * 计算孔隙比
   */
  static calculateVoidRatio(porosity: number): number {
    return porosity / (1 - porosity);
  }

  /**
   * 计算孔隙率
   */
  static calculatePorosity(voidRatio: number): number {
    return voidRatio / (1 + voidRatio);
  }

  /**
   * 计算饱和重度
   */
  static calculateSaturatedUnitWeight(density: number, porosity: number): number {
    const solidDensity = density / (1 - porosity);
    const saturatedDensity = solidDensity * (1 - porosity) + 1000 * porosity;
    return this.calculateUnitWeight(saturatedDensity);
  }

  /**
   * 计算有效应力参数
   */
  static calculateEffectiveStressParameters(
    totalCohesion: number,
    totalFriction: number,
    effectiveStressRatio: number = 1.0
  ): { effectiveCohesion: number; effectiveFriction: number } {
    return {
      effectiveCohesion: totalCohesion * effectiveStressRatio,
      effectiveFriction: Math.atan(Math.tan(totalFriction * Math.PI / 180) * effectiveStressRatio) * 180 / Math.PI
    };
  }

  /**
   * 估算压缩模量
   */
  static estimateCompressionModulus(elasticModulus: number, poissonRatio: number): number {
    return elasticModulus * (1 - poissonRatio) / ((1 + poissonRatio) * (1 - 2 * poissonRatio));
  }

  /**
   * 根据SPT-N值估算参数
   */
  static estimateParametersFromSPT(N: number, soilType: 'clay' | 'sand'): Partial<SoilMaterialProperties> {
    if (soilType === 'clay') {
      // 粘土参数估算
      const cu = N * 6; // 不排水抗剪强度 (kPa)
      const Es = N * 300; // 弹性模量 (kPa)
      
      return {
        cohesion: cu * 0.7, // 有效粘聚力
        frictionAngle: 15 + N * 0.3,
        elasticModulus: Es,
        poissonRatio: 0.35
      };
    } else {
      // 砂土参数估算
      const phi = 28 + 15 * Math.log10(N); // 内摩擦角
      const Es = N * 500; // 弹性模量 (kPa)
      
      return {
        cohesion: 0,
        frictionAngle: Math.min(phi, 45),
        elasticModulus: Es,
        poissonRatio: 0.30
      };
    }
  }

  /**
   * 根据CPT锥尖阻力估算参数
   */
  static estimateParametersFromCPT(qc: number, soilType: 'clay' | 'sand'): Partial<SoilMaterialProperties> {
    if (soilType === 'clay') {
      const cu = qc / 15; // 不排水抗剪强度
      const Es = qc * 3; // 弹性模量
      
      return {
        cohesion: cu * 0.7,
        frictionAngle: 15,
        elasticModulus: Es,
        poissonRatio: 0.35
      };
    } else {
      const phi = 17.6 + 11 * Math.log10(qc / 100); // 内摩擦角
      const Es = qc * 2.5;
      
      return {
        cohesion: 0,
        frictionAngle: Math.min(phi, 45),
        elasticModulus: Es,
        poissonRatio: 0.30
      };
    }
  }
}

export default MaterialValidationUtils;