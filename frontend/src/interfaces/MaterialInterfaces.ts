/**
 * DeepCAD 材料库接口定义
 * 2号几何专家 - 专业CAE材料属性管理
 */

// 材料类型枚举已移除 - 统一使用通用材料属性

// 材料行为模型
export enum ConstitutiveModel {
  LINEAR_ELASTIC = 'LINEAR_ELASTIC',               // 线弹性
  NONLINEAR_ELASTIC = 'NONLINEAR_ELASTIC',        // 非线性弹性
  ELASTOPLASTIC = 'ELASTOPLASTIC',                // 弹塑性
  MOHR_COULOMB = 'MOHR_COULOMB',                  // 摩尔-库伦
  DRUCKER_PRAGER = 'DRUCKER_PRAGER',              // 德鲁克-普拉格
  CAM_CLAY = 'CAM_CLAY',                          // 剑桥模型
  HARDENING_SOIL = 'HARDENING_SOIL',              // 硬化土模型
  SMALL_STRAIN_STIFFNESS = 'SMALL_STRAIN_STIFFNESS' // 小应变刚度模型
}

// 基础材料属性接口
export interface BaseMaterialProperties {
  // 基本属性
  density: number;                    // 密度 (kg/m³)
  elasticModulus: number;             // 弹性模量 (Pa)
  poissonRatio: number;               // 泊松比
  
  // 热属性
  thermalExpansion?: number;          // 热膨胀系数 (1/K)
  thermalConductivity?: number;       // 导热系数 (W/m·K)
  specificHeat?: number;              // 比热容 (J/kg·K)
  
  // 动力属性
  dampingRatio?: number;              // 阻尼比
  waveVelocities?: {
    primary?: number;                 // 纵波速度 (m/s)
    secondary?: number;               // 横波速度 (m/s)
  };
}

// 混凝土材料属性
export interface ConcreteMaterialProperties extends BaseMaterialProperties {
  // 强度属性
  compressiveStrength: number;        // 抗压强度 (Pa)
  tensileStrength: number;            // 抗拉强度 (Pa)
  flexuralStrength?: number;          // 抗弯强度 (Pa)
  
  // 徐变和收缩
  creepCoefficient?: number;          // 徐变系数
  shrinkageStrain?: number;           // 收缩应变
  
  // 疲劳属性
  fatigueStrength?: number;           // 疲劳强度 (Pa)
  
  // 龄期属性
  age?: number;                       // 龄期 (天)
  cementType?: string;                // 水泥类型
}

// 钢材材料属性
export interface SteelMaterialProperties extends BaseMaterialProperties {
  // 强度属性
  yieldStrength: number;              // 屈服强度 (Pa)
  ultimateStrength: number;           // 极限强度 (Pa)
  
  // 塑性属性
  hardeningModulus?: number;          // 硬化模量 (Pa)
  strainHardeningExponent?: number;   // 应变硬化指数
  
  // 疲劳属性
  fatigueLimit?: number;              // 疲劳极限 (Pa)
  enduranceLimit?: number;            // 持久极限 (Pa)
  
  // 钢材类型
  steelGrade?: string;                // 钢材牌号
  carbonContent?: number;             // 含碳量 (%)
}

// 土体材料属性
export interface SoilMaterialProperties extends BaseMaterialProperties {
  // 强度参数
  cohesion: number;                   // 粘聚力 (Pa)
  frictionAngle: number;              // 内摩擦角 (度)
  dilatancyAngle?: number;            // 剪胀角 (度)
  
  // 压缩特性
  compressionIndex?: number;          // 压缩指数
  swellingIndex?: number;             // 回弹指数
  preconsolidationPressure?: number;  // 前期固结压力 (Pa)
  
  // 渗透特性
  permeability: number;               // 渗透系数 (m/s)
  hydraulicConductivity?: number;     // 水力传导率 (m/s)
  
  // 状态参数
  voidRatio?: number;                 // 孔隙比
  saturationDegree?: number;          // 饱和度
  waterContent?: number;              // 含水率 (%)
  
  // 土体分类
  soilType?: string;                  // 土体类型
  plasticityIndex?: number;           // 塑性指数
  liquidLimit?: number;               // 液限 (%)
  
  // 挤密效应 - 2号专家特有
  compactionEffect?: {
    compactionRadius: number;         // 挤密半径 (m)
    densityIncrease: number;          // 密度增加 (kg/m³)
    stiffnessIncrease: number;        // 刚度增加倍数
    permeabilityDecrease: number;     // 渗透性降低倍数
  };
}

// 岩石材料属性
export interface RockMaterialProperties extends BaseMaterialProperties {
  // 强度属性
  uniaxialCompressiveStrength: number; // 单轴抗压强度 (Pa)
  tensileStrength: number;             // 抗拉强度 (Pa)
  
  // 岩石质量指标
  rqd?: number;                        // 岩石质量指标 (%)
  gsi?: number;                        // 地质强度指标
  
  // 节理属性
  jointProperties?: {
    friction: number;                  // 节理摩擦角 (度)
    cohesion: number;                  // 节理粘聚力 (Pa)
    spacing: number;                   // 节理间距 (m)
  };
}

// 材料定义主接口
export interface MaterialDefinition {
  id: string;                          // 材料ID
  name: string;                        // 材料名称
  constitutiveModel: ConstitutiveModel; // 本构模型
  
  // 材料属性（统一使用通用属性接口）
  properties: BaseMaterialProperties | ConcreteMaterialProperties | 
              SteelMaterialProperties | SoilMaterialProperties | 
              RockMaterialProperties;
  
  // 元数据
  description?: string;                // 描述
  source?: string;                     // 来源
  standard?: string;                   // 标准规范
  created: Date;                       // 创建时间
  modified: Date;                      // 修改时间
  version: string;                     // 版本号
  
  // 验证和校核
  validated?: boolean;                 // 是否已验证
  validationNotes?: string;            // 验证备注
  
  // 使用统计
  usageCount?: number;                 // 使用次数
  lastUsed?: Date;                     // 最后使用时间
  
  // 标签和分类
  tags?: string[];                     // 标签
  category?: string;                   // 分类
  
  // 数据来源和可信度
  reliability?: 'experimental' | 'literature' | 'empirical' | 'standard'; // 可信度
  testData?: any;                      // 试验数据
}

// 材料库管理接口
export interface MaterialLibrary {
  id: string;                          // 库ID
  name: string;                        // 库名称
  description?: string;                // 描述
  materials: MaterialDefinition[];     // 材料列表
  
  // 库属性
  isDefault?: boolean;                 // 是否默认库
  isReadOnly?: boolean;                // 是否只读
  owner?: string;                      // 拥有者
  
  // 版本控制
  version: string;                     // 库版本
  created: Date;                       // 创建时间
  modified: Date;                      // 修改时间
}

// 材料搜索和筛选接口
export interface MaterialSearchCriteria {
  // 基本搜索
  name?: string;                       // 名称关键词
  model?: ConstitutiveModel[];         // 本构模型筛选
  
  // 属性范围筛选
  densityRange?: [number, number];     // 密度范围
  modulusRange?: [number, number];     // 弹性模量范围
  strengthRange?: [number, number];    // 强度范围
  
  // 元数据筛选
  tags?: string[];                     // 标签
  category?: string;                   // 分类
  standard?: string;                   // 标准
  reliability?: string[];              // 可信度
  
  // 使用情况筛选
  validated?: boolean;                 // 是否已验证
  recentlyUsed?: boolean;              // 最近使用
  
  // 排序
  sortBy?: 'name' | 'modified' | 'usage' | 'reliability';
  sortOrder?: 'asc' | 'desc';
}

// 材料验证结果接口
export interface MaterialValidationResult {
  isValid: boolean;                    // 是否有效
  errors: string[];                    // 错误信息
  warnings: string[];                  // 警告信息
  suggestions: string[];               // 建议
  
  // 具体验证项
  propertyValidation: {
    [key: string]: {
      isValid: boolean;
      message?: string;
      expectedRange?: [number, number];
      actualValue?: number;
    };
  };
}

// 材料导入导出接口
export interface MaterialImportExportOptions {
  format: 'json' | 'csv' | 'excel' | 'xml' | 'ansys' | 'abaqus'; // 格式
  includeMetadata?: boolean;           // 是否包含元数据
  includeTesting?: boolean;            // 是否包含试验数据
  compression?: boolean;               // 是否压缩
  
  // 导入特定选项
  mergeStrategy?: 'replace' | 'merge' | 'skip'; // 冲突处理策略
  validateOnImport?: boolean;          // 导入时验证
  
  // 导出特定选项
  filterCriteria?: MaterialSearchCriteria; // 导出筛选条件
  customFields?: string[];             // 自定义字段
}

// 材料关联接口 - 与几何模型的关联
export interface MaterialAssignment {
  geometryId: string;                  // 几何体ID
  materialId: string;                  // 材料ID
  regionId?: string;                   // 区域ID（对于复杂几何体）
  
  // 局部修正
  localModifications?: {
    [propertyName: string]: number;    // 局部属性修正值
  };
  
  // 分配信息
  assignedBy?: string;                 // 分配者
  assignedAt: Date;                    // 分配时间
  notes?: string;                      // 备注
}

// moduleHub集成接口
export interface MaterialModuleHubData {
  id: string;
  action: 'material_created' | 'material_updated' | 'material_deleted' | 'material_assigned';
  materialData?: MaterialDefinition;
  assignmentData?: MaterialAssignment;
  timestamp: number;
}