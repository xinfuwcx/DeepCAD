import { z } from 'zod';

// 土体计算模型枚举
export const SoilConstitutiveModelSchema = z.enum([
  'linear_elastic',      // 线弹性模型
  'mohr_coulomb',        // 莫尔-库伦模型
  'drucker_prager',      // 德鲁克-普拉格模型
  'cam_clay',            // 剑桥黏土模型
  'hardening_soil',      // 硬化土模型
  'small_strain',        // 小应变土模型
  'elastic_perfectly_plastic', // 理想弹塑性模型
  'nonlinear_elastic'    // 非线性弹性模型
], {
  errorMap: () => ({ message: '请选择有效的土体计算模型' })
});

// 材料参数基础结构
export const MaterialParametersSchema = z.object({
  // 基础物理参数
  density: z.number()
    .min(1000, '密度不能小于1000 kg/m³')
    .max(3000, '密度不能大于3000 kg/m³'),
  unit_weight: z.number()
    .min(10, '重度不能小于10 kN/m³')
    .max(30, '重度不能大于30 kN/m³')
    .optional(),
  
  // 强度参数
  cohesion: z.number()
    .min(0, '粘聚力不能小于0 kPa')
    .max(500, '粘聚力不能大于500 kPa'),
  friction: z.number()
    .min(0, '内摩擦角不能小于0度')
    .max(50, '内摩擦角不能大于50度'),
  
  // 变形参数
  elastic_modulus: z.number()
    .positive('弹性模量必须大于0')
    .optional(),
  poisson_ratio: z.number()
    .min(0, '泊松比不能小于0')
    .max(0.5, '泊松比不能大于0.5')
    .optional(),
  
  // 渗流参数
  permeability_x: z.number()
    .positive('X方向渗透系数必须大于0')
    .optional(),
  permeability_y: z.number()
    .positive('Y方向渗透系数必须大于0')
    .optional(),
  permeability_z: z.number()
    .positive('Z方向渗透系数必须大于0')
    .optional(),
  
  // 高级参数（根据计算模型不同而不同）
  advanced_parameters: z.record(z.any()).optional()
});

// 材料定义
export const MaterialDefinitionSchema = z.object({
  id: z.string(),
  name: z.string()
    .min(1, '材料名称不能为空')
    .max(100, '材料名称不能超过100个字符'),
  description: z.string().optional(),
  soil_type: z.enum(['clay', 'sand', 'silt', 'gravel', 'rock', 'fill'], {
    errorMap: () => ({ message: '请选择有效的土层类型' })
  }),
  constitutive_model: SoilConstitutiveModelSchema,
  parameters: MaterialParametersSchema,
  created_date: z.string().optional(),
  modified_date: z.string().optional(),
  is_default: z.boolean().default(false)
});

// 项目土体计算模型配置
export const ProjectSoilModelConfigSchema = z.object({
  constitutive_model: SoilConstitutiveModelSchema,
  description: z.string().optional(),
  selected_materials: z.array(z.string()).optional() // 选中的材料ID列表
});

// Stratum 土层段数据结构
export const StratumSchema = z.object({
  id: z.string(),
  top_elev: z.number()
    .min(-200, '顶部标高不能低于-200米')
    .max(100, '顶部标高不能高于100米'),
  bottom_elev: z.number()
    .min(-200, '底部标高不能低于-200米')
    .max(100, '底部标高不能高于100米'),
  soil_type: z.enum(['clay', 'sand', 'silt', 'gravel', 'rock', 'fill'], {
    errorMap: () => ({ message: '请选择有效的土层类型' })
  }),
  // 基础物理参数
  density: z.number()
    .min(1000, '密度不能小于1000 kg/m³')
    .max(3000, '密度不能大于3000 kg/m³'),
  // 力学参数
  cohesion: z.number()
    .min(0, '粘聚力不能小于0 kPa')
    .max(500, '粘聚力不能大于500 kPa'),
  friction: z.number()
    .min(0, '内摩擦角不能小于0度')
    .max(50, '内摩擦角不能大于50度'),
  // 可扩展参数
  elastic_modulus: z.number()
    .positive('弹性模量必须大于0')
    .optional(),
  poisson_ratio: z.number()
    .min(0, '泊松比不能小于0')
    .max(0.5, '泊松比不能大于0.5')
    .optional(),
  permeability: z.number()
    .positive('渗透系数必须大于0')
    .optional()
}).refine(
  (data) => data.top_elev > data.bottom_elev,
  {
    message: '顶部标高必须大于底部标高',
    path: ['bottom_elev']
  }
);

// Borehole 钻孔数据结构
export const BoreholeSchema = z.object({
  id: z.string(),
  name: z.string()
    .min(1, '钻孔名称不能为空')
    .max(50, '钻孔名称不能超过50个字符'),
  x: z.number()
    .finite('X坐标必须是有限数'),
  y: z.number()
    .finite('Y坐标必须是有限数'),
  ground_elevation: z.number()
    .min(-50, '地面标高不能低于-50米')
    .max(100, '地面标高不能高于100米'),
  total_depth: z.number()
    .positive('钻孔总深度必须大于0')
    .max(200, '钻孔总深度不能超过200米'),
  strata: z.array(StratumSchema)
    .min(1, '钻孔至少需要一个土层')
    .max(20, '钻孔土层数量不能超过20个')
}).refine(
  (data) => {
    // 验证土层深度连续性和合理性
    const sortedStrata = [...data.strata].sort((a, b) => b.top_elev - a.top_elev);
    for (let i = 0; i < sortedStrata.length - 1; i++) {
      if (Math.abs(sortedStrata[i].bottom_elev - sortedStrata[i + 1].top_elev) > 0.1) {
        return false;
      }
    }
    // 检查第一层顶部是否接近地面标高
    if (sortedStrata.length > 0 && Math.abs(sortedStrata[0].top_elev - data.ground_elevation) > 1) {
      return false;
    }
    return true;
  },
  {
    message: '土层深度必须连续且第一层应接近地面标高',
    path: ['strata']
  }
);

// 三区混合算法参数
export const ThreeZoneParamsSchema = z.object({
  // 核心区参数
  core_radius: z.number()
    .min(10, '核心区半径不能小于10米')
    .max(500, '核心区半径不能大于500米'),
  // 过渡区参数  
  transition_distance: z.number()
    .min(20, '过渡距离不能小于20米')
    .max(1000, '过渡距离不能大于1000米'),
  // 变差函数模型
  variogram_model: z.enum(['spherical', 'exponential', 'gaussian', 'matern'], {
    errorMap: () => ({ message: '请选择有效的变差函数模型' })
  }),
  // 趋势面参数
  trend_order: z.enum(['linear', 'quadratic'], {
    errorMap: () => ({ message: '请选择趋势面阶次' })
  }),
  // 不确定性量化
  uncertainty_analysis: z.boolean(),
  confidence_level: z.number()
    .min(0.8, '置信水平不能小于0.8')
    .max(0.99, '置信水平不能大于0.99')
    .optional()
}).refine(
  (data) => data.transition_distance > data.core_radius,
  {
    message: '过渡距离必须大于核心区半径',
    path: ['transition_distance']
  }
);

// 计算域参数
export const ComputationDomainSchema = z.object({
  // 扩展方式
  extension_method: z.enum(['convex_hull', 'foundation_multiple', 'manual'], {
    errorMap: () => ({ message: '请选择计算域扩展方式' })
  }),
  // 平面扩展参数
  x_extend: z.number()
    .min(20, 'X方向扩展不能小于20米')
    .max(2000, 'X方向扩展不能大于2000米'),
  y_extend: z.number()
    .min(20, 'Y方向扩展不能小于20米')  
    .max(2000, 'Y方向扩展不能大于2000米'),
  // 基坑扩展倍数（当选择foundation_multiple时）
  foundation_multiplier: z.number()
    .min(1.5, '基坑扩展倍数不能小于1.5倍')
    .max(10, '基坑扩展倍数不能大于10倍')
    .optional(),
  // 深度参数
  bottom_elevation: z.number()
    .min(-200, '底部标高不能低于-200米')
    .max(0, '底部标高不能高于0米'),
  // 网格分辨率
  mesh_resolution: z.number()
    .min(0.5, '网格分辨率不能小于0.5米')
    .max(20, '网格分辨率不能大于20米')
});

// 地质建模参数（高级版本）
export const GeologyParamsAdvancedSchema = z.object({
  // 钻孔数据
  boreholes: z.array(BoreholeSchema)
    .min(3, '至少需要3个钻孔进行建模')
    .max(50, '钻孔数量不能超过50个'),
  // 计算域参数
  domain: ComputationDomainSchema,
  // 三区混合算法参数
  algorithm: ThreeZoneParamsSchema,
  // 土体计算模型配置
  soil_model: ProjectSoilModelConfigSchema,
  // GMSH OCC 参数
  gmsh_params: z.object({
    characteristic_length: z.number()
      .min(0.1, '特征长度不能小于0.1米')
      .max(50, '特征长度不能大于50米'),
    physical_groups: z.boolean(),
    mesh_quality: z.number()
      .min(0.1, '网格质量不能小于0.1')
      .max(1.0, '网格质量不能大于1.0')
  })
});

// 地质建模参数（简化版本，向后兼容）
export const GeologyParamsSchema = z.object({
  interpolationMethod: z.enum(['kriging', 'idw', 'spline', 'linear'], {
    errorMap: () => ({ message: '请选择有效的插值方法' })
  }),
  gridResolution: z.number()
    .min(0.1, '网格分辨率不能小于0.1米')
    .max(10, '网格分辨率不能大于10米')
    .step(0.1, '网格分辨率精度为0.1米'),
  xExtend: z.number()
    .min(10, 'X方向延拓距离不能小于10米')
    .max(2000, 'X方向延拓距离不能大于2000米'),
  yExtend: z.number()
    .min(10, 'Y方向延拓距离不能小于10米')
    .max(2000, 'Y方向延拓距离不能大于2000米'),
  bottomElevation: z.number()
    .min(-100, '底部标高不能低于-100米')
    .max(0, '底部标高不能高于0米')
});

// 基坑开挖参数Schema
export const ExcavationParamsSchema = z.object({
  depth: z.number()
    .min(1, '开挖深度不能小于1米')
    .max(50, '开挖深度不能大于50米')
    .step(0.1, '开挖深度精度为0.1米'),
  layerHeight: z.number()
    .min(0.5, '分层高度不能小于0.5米')
    .max(10, '分层高度不能大于10米')
    .step(0.1, '分层高度精度为0.1米'),
  slopeRatio: z.number()
    .min(0, '边坡比不能小于0')
    .max(2, '边坡比不能大于2')
    .step(0.1, '边坡比精度为0.1')
});

// 地连墙参数Schema
export const DiaphragmWallSchema = z.object({
  thickness: z.number()
    .min(0.6, '地连墙厚度不能小于0.6米')
    .max(2.0, '地连墙厚度不能大于2.0米')
    .step(0.1, '地连墙厚度精度为0.1米'),
  depth: z.number()
    .min(5, '地连墙深度不能小于5米')
    .max(80, '地连墙深度不能大于80米')
    .step(0.1, '地连墙深度精度为0.1米'),
  enabled: z.boolean()
});

// 排桩参数Schema
export const PilePileSchema = z.object({
  diameter: z.number()
    .min(0.5, '桩径不能小于0.5米')
    .max(2.5, '桩径不能大于2.5米')
    .step(0.1, '桩径精度为0.1米'),
  spacing: z.number()
    .min(0.8, '桩间距不能小于0.8米')
    .max(5.0, '桩间距不能大于5.0米')
    .step(0.1, '桩间距精度为0.1米'),
  length: z.number()
    .min(5, '桩长不能小于5米')
    .max(60, '桩长不能大于60米')
    .step(0.1, '桩长精度为0.1米'),
  embedDepth: z.number()
    .min(2, '嵌固深度不能小于2米')
    .max(20, '嵌固深度不能大于20米')
    .step(0.1, '嵌固深度精度为0.1米'),
  enabled: z.boolean()
}).refine(
  data => data.spacing > data.diameter,
  {
    message: '桩间距必须大于桩径',
    path: ['spacing']
  }
);

// 锚杆参数Schema
export const AnchorSchema = z.object({
  length: z.number()
    .min(5, '锚杆长度不能小于5米')
    .max(40, '锚杆长度不能大于40米')
    .step(0.1, '锚杆长度精度为0.1米'),
  angle: z.number()
    .min(0, '锚杆倾角不能小于0度')
    .max(45, '锚杆倾角不能大于45度')
    .step(1, '锚杆倾角精度为1度'),
  hSpacing: z.number()
    .min(1, '水平间距不能小于1米')
    .max(10, '水平间距不能大于10米')
    .step(0.1, '水平间距精度为0.1米'),
  vSpacing: z.number()
    .min(1, '竖向间距不能小于1米')
    .max(8, '竖向间距不能大于8米')
    .step(0.1, '竖向间距精度为0.1米'),
  enabled: z.boolean()
});

// 钢支撑参数Schema
export const SteelSupportSchema = z.object({
  layers: z.number()
    .int('支撑层数必须为整数')
    .min(1, '支撑层数不能小于1层')
    .max(8, '支撑层数不能大于8层'),
  spacing: z.number()
    .min(2, '支撑间距不能小于2米')
    .max(15, '支撑间距不能大于15米')
    .step(0.1, '支撑间距精度为0.1米'),
  sectionType: z.enum(['H400x200', 'H500x200', 'H600x200', 'H700x300', 'H800x300'], {
    errorMap: () => ({ message: '请选择有效的钢支撑截面型号' })
  }),
  preload: z.number()
    .min(0, '预加力不能小于0kN')
    .max(2000, '预加力不能大于2000kN')
    .step(10, '预加力精度为10kN'),
  enabled: z.boolean()
});

// 支护结构参数Schema
export const SupportParamsSchema = z.object({
  diaphragmWall: DiaphragmWallSchema,
  pilePile: PilePileSchema,
  anchor: AnchorSchema,
  steelSupport: SteelSupportSchema
}).refine(
  data => {
    // 至少启用一种支护结构
    return data.diaphragmWall.enabled || 
           data.pilePile.enabled || 
           data.anchor.enabled || 
           data.steelSupport.enabled;
  },
  {
    message: '至少需要启用一种支护结构',
    path: ['diaphragmWall', 'enabled']
  }
).refine(
  data => {
    // 地连墙和排桩不能同时启用
    return !(data.diaphragmWall.enabled && data.pilePile.enabled);
  },
  {
    message: '地连墙和排桩不能同时启用，请选择其中一种',
    path: ['pilePile', 'enabled']
  }
);

// 完整几何模型Schema
export const GeometryModelSchema = z.object({
  geology: GeologyParamsSchema,
  excavation: ExcavationParamsSchema,
  support: SupportParamsSchema
});

// 导出类型定义
export type SoilConstitutiveModel = z.infer<typeof SoilConstitutiveModelSchema>;
export type MaterialParameters = z.infer<typeof MaterialParametersSchema>;
export type MaterialDefinition = z.infer<typeof MaterialDefinitionSchema>;
export type ProjectSoilModelConfig = z.infer<typeof ProjectSoilModelConfigSchema>;
export type Stratum = z.infer<typeof StratumSchema>;
export type Borehole = z.infer<typeof BoreholeSchema>;
export type ThreeZoneParams = z.infer<typeof ThreeZoneParamsSchema>;
export type ComputationDomain = z.infer<typeof ComputationDomainSchema>;
export type GeologyParams = z.infer<typeof GeologyParamsSchema>; // 简化版本
export type GeologyParamsAdvanced = z.infer<typeof GeologyParamsAdvancedSchema>; // 高级版本
export type ExcavationParams = z.infer<typeof ExcavationParamsSchema>;
export type DiaphragmWallParams = z.infer<typeof DiaphragmWallSchema>;
export type PilePileParams = z.infer<typeof PilePileSchema>;
export type AnchorParams = z.infer<typeof AnchorSchema>;
export type SteelSupportParams = z.infer<typeof SteelSupportSchema>;
export type SupportParams = z.infer<typeof SupportParamsSchema>;
export type GeometryModel = z.infer<typeof GeometryModelSchema>;