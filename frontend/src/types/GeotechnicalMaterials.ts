/**
 * 岩土工程有限元材料库类型定义
 * 专业的岩土工程材料数据结构和本构模型定义
 */

// 岩土工程材料类型
export enum GeotechnicalMaterialType {
  // 土体材料
  CLAY = 'CLAY',                           // 粘性土
  SILT = 'SILT',                           // 粉土
  SAND = 'SAND',                           // 砂土
  GRAVEL = 'GRAVEL',                       // 砾石土
  ORGANIC_SOIL = 'ORGANIC_SOIL',           // 有机质土
  FILL = 'FILL',                           // 填土
  
  // 岩石材料
  ROCK_HARD = 'ROCK_HARD',                 // 硬质岩
  ROCK_SOFT = 'ROCK_SOFT',                 // 软质岩
  ROCK_WEATHERED = 'ROCK_WEATHERED',       // 风化岩
  ROCK_FRACTURED = 'ROCK_FRACTURED',       // 破碎岩
  
  // 人工材料
  CONCRETE = 'CONCRETE',                   // 混凝土
  STEEL = 'STEEL',                         // 钢材
  REINFORCEMENT = 'REINFORCEMENT',         // 钢筋
  SHOTCRETE = 'SHOTCRETE',                 // 喷射混凝土
  GROUTING = 'GROUTING',                   // 注浆材料
  
  // 支护材料
  TIMBER = 'TIMBER',                       // 木材
  COMPOSITE = 'COMPOSITE',                 // 复合材料
  GEOSYNTHETIC = 'GEOSYNTHETIC',          // 土工合成材料
  
  // 特殊材料
  FROZEN_SOIL = 'FROZEN_SOIL',            // 冻土
  SWELLING_SOIL = 'SWELLING_SOIL',        // 膨胀土
  COLLAPSIBLE_SOIL = 'COLLAPSIBLE_SOIL',  // 湿陷性土
  SOFT_SOIL = 'SOFT_SOIL',                // 软土
}

// 本构模型类型
export enum ConstitutiveModel {
  // 弹性模型
  LINEAR_ELASTIC = 'LINEAR_ELASTIC',                   // 线弹性
  NONLINEAR_ELASTIC = 'NONLINEAR_ELASTIC',            // 非线性弹性
  ORTHOTROPIC = 'ORTHOTROPIC',                        // 正交各向异性
  
  // 塑性模型
  MOHR_COULOMB = 'MOHR_COULOMB',                      // 摩尔-库仑
  DRUCKER_PRAGER = 'DRUCKER_PRAGER',                  // 德鲁克-普拉格
  TRESCA = 'TRESCA',                                  // 特雷斯卡
  VON_MISES = 'VON_MISES',                           // 冯·米塞斯
  
  // 高级土体模型
  CAM_CLAY = 'CAM_CLAY',                             // 剑桥模型
  MODIFIED_CAM_CLAY = 'MODIFIED_CAM_CLAY',           // 修正剑桥模型
  HARDENING_SOIL = 'HARDENING_SOIL',                 // 硬化土模型
  HARDENING_SOIL_SMALL_STRAIN = 'HARDENING_SOIL_SMALL_STRAIN', // 小应变硬化土模型
  SOFT_SOIL = 'SOFT_SOIL',                           // 软土模型
  SOFT_SOIL_CREEP = 'SOFT_SOIL_CREEP',              // 软土蠕变模型
  
  // 岩石模型
  HOEK_BROWN = 'HOEK_BROWN',                         // 霍克-布朗
  JOINTED_ROCK = 'JOINTED_ROCK',                     // 节理岩体
  UBIQUITOUS_JOINT = 'UBIQUITOUS_JOINT',            // 遍布节理
  
  // 动力模型
  EQUIVALENT_LINEAR = 'EQUIVALENT_LINEAR',            // 等价线性
  RAMBERG_OSGOOD = 'RAMBERG_OSGOOD',                 // 拉姆贝格-奥斯古德
  
  // 流体耦合模型
  BIOT_CONSOLIDATION = 'BIOT_CONSOLIDATION',         // 比奥固结
  TERZAGHI_CONSOLIDATION = 'TERZAGHI_CONSOLIDATION', // 太沙基固结
}

// 基础材料属性接口
export interface BaseMaterialProperties {
  // 基本物理属性
  density: number;                     // 密度 (kg/m³)
  unitWeight: number;                  // 重度 (kN/m³)
  specificGravity?: number;            // 比重
  voidRatio?: number;                  // 孔隙比
  porosity?: number;                   // 孔隙率
  saturationDegree?: number;           // 饱和度
  waterContent?: number;               // 含水量 (%)
  
  // 力学属性
  elasticModulus: number;              // 弹性模量 (kPa)
  poissonRatio: number;                // 泊松比
  shearModulus?: number;               // 剪切模量 (kPa)
  bulkModulus?: number;                // 体积模量 (kPa)
  
  // 强度参数
  cohesion?: number;                   // 粘聚力 (kPa)
  frictionAngle?: number;              // 内摩擦角 (度)
  dilatancyAngle?: number;             // 剪胀角 (度)
  tensileStrength?: number;            // 抗拉强度 (kPa)
  
  // 渗透性
  permeability?: number;               // 渗透系数 (m/s)
  hydraulicConductivity?: number;      // 水力传导率 (m/s)
  
  // 动力特性
  dampingRatio?: number;               // 阻尼比
  shearWaveVelocity?: number;          // 剪切波速 (m/s)
  compressionWaveVelocity?: number;    // 压缩波速 (m/s)
}

// 土体材料特有属性
export interface SoilMaterialProperties extends BaseMaterialProperties {
  // 分类指标
  liquidLimit?: number;                // 液限 (%)
  plasticLimit?: number;               // 塑限 (%)
  plasticityIndex?: number;            // 塑性指数
  liquidityIndex?: number;             // 液性指数
  
  // 压缩特性
  compressionIndex?: number;           // 压缩指数 Cc
  swellingIndex?: number;              // 回弹指数 Cs
  preconsolidationPressure?: number;   // 前期固结压力 (kPa)
  overconsolidationRatio?: number;     // 超固结比 OCR
  
  // 本构模型专用参数
  constitutiveParameters?: {
    // 硬化土模型参数
    E50ref?: number;                   // 三轴压缩割线模量 (kPa)
    EoedRef?: number;                  // 侧限压缩模量 (kPa)
    EurRef?: number;                   // 卸载再加载模量 (kPa)
    m?: number;                        // 应力相关指数
    Rf?: number;                       // 破坏比
    K0nc?: number;                     // 正常固结土K0值
    
    // 剑桥模型参数
    lambda?: number;                   // 压缩参数
    kappa?: number;                    // 回弹参数
    M?: number;                        // 临界状态应力比
    e0?: number;                       // 初始孔隙比
    
    // 小应变参数
    G0ref?: number;                    // 参考剪切模量 (kPa)
    gamma07?: number;                  // 剪切应变参数
  };
  
  // 特殊土体属性
  specialProperties?: {
    // 膨胀土
    swellingPressure?: number;         // 膨胀压力 (kPa)
    swellingIndex?: number;            // 膨胀指数
    
    // 湿陷性土
    collapsibilityCoeff?: number;      // 湿陷系数
    selfWeight?: number;               // 自重湿陷量
    
    // 冻土
    frozenStrength?: number;           // 冻结强度 (kPa)
    thawSettlement?: number;           // 融沉量
  };
}

// 岩石材料特有属性
export interface RockMaterialProperties extends BaseMaterialProperties {
  // 岩石强度
  uniaxialCompressiveStrength: number; // 单轴抗压强度 (MPa)
  triaxialCompressiveStrength?: number; // 三轴抗压强度 (MPa)
  brazilianTensileStrength?: number;   // 巴西劈裂抗拉强度 (MPa)
  
  // 岩石质量指标
  rqd?: number;                        // 岩石质量指标 (%)
  gsi?: number;                        // 地质强度指标
  weatheringDegree?: number;           // 风化程度 (1-5级)
  
  // Hoek-Brown参数
  hoekBrownParameters?: {
    mi?: number;                       // 完整岩石参数
    GSI?: number;                      // 地质强度指标
    D?: number;                        // 扰动系数
    mb?: number;                       // 岩体参数
    s?: number;                        // 岩体参数s
    a?: number;                        // 岩体参数a
  };
  
  // 节理属性
  jointProperties?: {
    friction: number;                  // 节理摩擦角 (度)
    cohesion: number;                  // 节理粘聚力 (kPa)
    spacing: number;                   // 节理间距 (m)
    persistence?: number;              // 连续性 (m)
    aperture?: number;                 // 张开度 (mm)
    roughness?: number;                // 粗糙度系数JRC
    wallStrength?: number;             // 节理壁强度JCS (MPa)
  };
}

// 人工材料属性
export interface ArtificialMaterialProperties extends BaseMaterialProperties {
  // 混凝土属性
  concreteProperties?: {
    compressiveStrength: number;       // 抗压强度 (MPa)
    tensileStrength: number;           // 抗拉强度 (MPa)
    flexuralStrength?: number;         // 抗弯强度 (MPa)
    age: number;                       // 龄期 (天)
    cementType?: string;               // 水泥类型
    creepCoefficient?: number;         // 徐变系数
    shrinkageStrain?: number;          // 收缩应变
  };
  
  // 钢材属性
  steelProperties?: {
    yieldStrength: number;             // 屈服强度 (MPa)
    ultimateStrength: number;          // 极限强度 (MPa)
    hardeningModulus?: number;         // 硬化模量 (MPa)
    steelGrade: string;                // 钢材牌号
    carbonContent?: number;            // 含碳量 (%)
  };
}

// 完整的材料定义
export interface GeotechnicalMaterial {
  // 基本信息
  id: string;                          // 材料ID
  name: string;                        // 材料名称
  type: GeotechnicalMaterialType;      // 材料类型
  constitutiveModel: ConstitutiveModel; // 本构模型
  
  // 材料属性（联合类型）
  properties: SoilMaterialProperties | RockMaterialProperties | ArtificialMaterialProperties;
  
  // 元数据
  description?: string;                // 材料描述
  source?: string;                     // 数据来源
  standard?: string;                   // 参考标准
  reliability: 'experimental' | 'literature' | 'empirical' | 'standard' | 'code'; // 可靠性等级
  
  // 适用条件
  applicableConditions?: {
    temperatureRange?: [number, number]; // 温度范围 (°C)
    pressureRange?: [number, number];    // 压力范围 (kPa)
    strainRateRange?: [number, number];  // 应变率范围
    environmentConditions?: string[];    // 环境条件
  };
  
  // 试验数据
  testData?: {
    laboratory?: any[];                // 室内试验数据
    field?: any[];                     // 现场试验数据
    monitoring?: any[];                // 监测数据
  };
  
  // 版本控制
  version: string;                     // 版本号
  created: Date;                       // 创建时间
  modified: Date;                      // 修改时间
  createdBy?: string;                  // 创建者
  modifiedBy?: string;                 // 修改者
  
  // 状态管理
  status: 'draft' | 'review' | 'approved' | 'archived'; // 状态
  validated: boolean;                  // 是否验证
  validationNotes?: string;            // 验证备注
  
  // 使用统计
  usageCount?: number;                 // 使用次数
  lastUsed?: Date;                     // 最后使用时间
  projectIds?: string[];               // 使用项目ID列表
  
  // 标签和分类
  tags?: string[];                     // 标签
  category?: string;                   // 分类
  subCategory?: string;                // 子分类
  
  // 参数范围验证
  parameterRanges?: {
    [key: string]: {
      min: number;
      max: number;
      recommended?: [number, number];
      unit: string;
    };
  };
}

// 材料库定义
export interface GeotechnicalMaterialLibrary {
  id: string;                          // 库ID
  name: string;                        // 库名称
  description?: string;                // 描述
  materials: GeotechnicalMaterial[];   // 材料列表
  
  // 库属性
  type: 'standard' | 'project' | 'personal' | 'template'; // 库类型
  isReadOnly: boolean;                 // 是否只读
  isPublic?: boolean;                  // 是否公开
  owner: string;                       // 拥有者
  
  // 版本控制
  version: string;                     // 库版本
  created: Date;                       // 创建时间
  modified: Date;                      // 修改时间
  
  // 权限管理
  permissions?: {
    read: string[];                    // 读权限用户列表
    write: string[];                   // 写权限用户列表
    admin: string[];                   // 管理权限用户列表
  };
  
  // 库统计
  statistics?: {
    materialCount: number;             // 材料数量
    categoryCount: number;             // 分类数量
    lastActivity: Date;                // 最后活动时间
    popularMaterials?: string[];       // 热门材料ID
  };
}

// 搜索和筛选条件
export interface MaterialSearchCriteria {
  // 基本搜索
  keyword?: string;                    // 关键词
  name?: string;                       // 名称
  type?: GeotechnicalMaterialType[];   // 材料类型
  constitutiveModel?: ConstitutiveModel[]; // 本构模型
  
  // 属性范围筛选
  densityRange?: [number, number];     // 密度范围
  modulusRange?: [number, number];     // 弹性模量范围
  strengthRange?: [number, number];    // 强度范围
  permeabilityRange?: [number, number]; // 渗透性范围
  
  // 元数据筛选
  tags?: string[];                     // 标签
  category?: string[];                 // 分类
  reliability?: string[];              // 可靠性
  standard?: string[];                 // 标准
  status?: string[];                   // 状态
  
  // 时间筛选
  createdAfter?: Date;                 // 创建时间晚于
  modifiedAfter?: Date;                // 修改时间晚于
  
  // 使用情况筛选
  validated?: boolean;                 // 是否验证
  recentlyUsed?: boolean;              // 最近使用
  popularOnly?: boolean;               // 仅热门材料
  
  // 排序
  sortBy?: 'name' | 'type' | 'modified' | 'usage' | 'reliability' | 'created';
  sortOrder?: 'asc' | 'desc';
  
  // 分页
  page?: number;                       // 页码
  pageSize?: number;                   // 页面大小
}

// 材料验证结果
export interface MaterialValidationResult {
  isValid: boolean;                    // 是否有效
  materialId: string;                  // 材料ID
  
  // 验证结果详情
  results: {
    basicProperties: ValidationItem;    // 基本属性验证
    strengthParameters: ValidationItem; // 强度参数验证
    constitutiveModel: ValidationItem;  // 本构模型验证
    applicabilityCheck: ValidationItem; // 适用性检查
  };
  
  // 总体评估
  overallScore: number;                // 总体评分 (0-100)
  recommendations: string[];           // 建议
  warnings: string[];                  // 警告
  errors: string[];                    // 错误
}

// 验证项目
export interface ValidationItem {
  passed: boolean;                     // 是否通过
  score: number;                       // 得分
  details: {
    [property: string]: {
      value: any;                      // 实际值
      expectedRange?: [number, number]; // 期望范围
      status: 'pass' | 'warning' | 'error'; // 状态
      message?: string;                // 消息
    };
  };
}

// 导入导出选项
export interface MaterialImportExportOptions {
  format: 'json' | 'excel' | 'csv' | 'xml' | 'plaxis' | 'ansys' | 'abaqus' | 'midas'; // 格式
  includeMetadata?: boolean;           // 是否包含元数据
  includeTestData?: boolean;           // 是否包含试验数据
  includeValidation?: boolean;         // 是否包含验证结果
  
  // 导入选项
  mergeStrategy?: 'replace' | 'merge' | 'skip' | 'append'; // 冲突处理策略
  validateOnImport?: boolean;          // 导入时验证
  createBackup?: boolean;              // 创建备份
  
  // 导出选项
  filterCriteria?: MaterialSearchCriteria; // 导出筛选条件
  customFields?: string[];             // 自定义字段
  compression?: boolean;               // 是否压缩
  template?: string;                   // 导出模板
}

// 材料分配和使用
export interface MaterialAssignment {
  id: string;                          // 分配ID
  geometryId: string;                  // 几何体ID
  materialId: string;                  // 材料ID
  regionName?: string;                 // 区域名称
  
  // 局部修正
  localModifications?: {
    [propertyName: string]: {
      value: number;                   // 修正值
      factor?: number;                 // 修正系数
      reason?: string;                 // 修正原因
    };
  };
  
  // 分配信息
  assignedBy: string;                  // 分配者
  assignedAt: Date;                    // 分配时间
  notes?: string;                      // 备注
  
  // 计算状态
  computationStatus?: 'pending' | 'running' | 'completed' | 'failed'; // 计算状态
  lastComputedAt?: Date;               // 最后计算时间
}

// 预定义的标准材料类型
export const STANDARD_MATERIALS = {
  SOILS: {
    SOFT_CLAY: 'soft_clay',
    STIFF_CLAY: 'stiff_clay',
    LOOSE_SAND: 'loose_sand',
    DENSE_SAND: 'dense_sand',
    SILT: 'silt',
    ORGANIC_SOIL: 'organic_soil',
  },
  ROCKS: {
    GRANITE: 'granite',
    LIMESTONE: 'limestone',
    SANDSTONE: 'sandstone',
    SHALE: 'shale',
    WEATHERED_ROCK: 'weathered_rock',
  },
  ARTIFICIAL: {
    C20_CONCRETE: 'c20_concrete',
    C30_CONCRETE: 'c30_concrete',
    Q235_STEEL: 'q235_steel',
    HRB400_REBAR: 'hrb400_rebar',
  },
} as const;

// 工程单位系统
export interface EngineeringUnits {
  length: 'm' | 'mm' | 'cm' | 'ft' | 'in';
  force: 'N' | 'kN' | 'MN' | 'lbf' | 'kip';
  stress: 'Pa' | 'kPa' | 'MPa' | 'GPa' | 'psi' | 'ksf' | 'tsf';
  density: 'kg/m3' | 'g/cm3' | 'lb/ft3' | 'pcf';
  permeability: 'm/s' | 'cm/s' | 'mm/s' | 'ft/s';
  temperature: 'C' | 'F' | 'K';
}