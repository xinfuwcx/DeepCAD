/**
 * Zod验证模式定义
 * 为DeepCAD所有表单提供统一的验证规则
 */

import { z } from 'zod';

// 基础验证规则
export const BaseValidationRules = {
  // 名称验证
  name: z.string()
    .min(1, '名称不能为空')
    .max(100, '名称长度不能超过100个字符')
    .regex(/^[\u4e00-\u9fa5a-zA-Z0-9_\-\s]+$/, '名称只能包含中文、英文、数字、下划线和横线'),

  // 描述验证
  description: z.string()
    .max(500, '描述长度不能超过500个字符')
    .optional(),

  // 正数验证
  positiveNumber: z.number()
    .positive('值必须大于0'),

  // 非负数验证
  nonNegativeNumber: z.number()
    .min(0, '值不能小于0'),

  // 百分比验证（0-100）
  percentage: z.number()
    .min(0, '百分比不能小于0')
    .max(100, '百分比不能大于100'),

  // 坐标验证
  coordinate: z.number()
    .finite('坐标值必须是有限数'),

  // 文件路径验证
  filePath: z.string()
    .min(1, '文件路径不能为空')
    .refine(
      (path) => !path.includes('..'),
      '文件路径不能包含相对路径'
    ),

  // 邮箱验证
  email: z.string()
    .email('请输入有效的邮箱地址'),

  // URL验证
  url: z.string()
    .url('请输入有效的URL地址')
    .optional(),
};

// 材料属性验证
export const MaterialValidationSchema = z.object({
  name: BaseValidationRules.name,
  type: z.enum(['concrete', 'steel', 'soil'], {
    errorMap: () => ({ message: '请选择有效的材料类型' })
  }),
  description: BaseValidationRules.description,
  parameters: z.object({
    elasticModulus: z.number()
      .positive('弹性模量必须大于0')
      .max(1000000, '弹性模量不能超过1,000,000 MPa'),
    poissonRatio: z.number()
      .min(0, '泊松比不能小于0')
      .max(0.5, '泊松比不能大于0.5'),
    density: z.number()
      .positive('密度必须大于0')
      .max(50000, '密度不能超过50,000 kg/m³'),
    // 可选参数
    compressiveStrength: z.number()
      .positive('抗压强度必须大于0')
      .optional(),
    tensileStrength: z.number()
      .positive('抗拉强度必须大于0')
      .optional(),
    yieldStrength: z.number()
      .positive('屈服强度必须大于0')
      .optional(),
    ultimateStrength: z.number()
      .positive('极限强度必须大于0')
      .optional(),
    cohesion: z.number()
      .min(0, '粘聚力不能小于0')
      .optional(),
    frictionAngle: z.number()
      .min(0, '内摩擦角不能小于0')
      .max(90, '内摩擦角不能大于90度')
      .optional(),
    permeability: z.number()
      .positive('渗透系数必须大于0')
      .optional()
  }).refine(
    (data) => {
      // 钢材必须有屈服强度
      if (data.tensileStrength && data.yieldStrength) {
        return data.yieldStrength <= data.tensileStrength;
      }
      return true;
    },
    {
      message: '屈服强度不能大于抗拉强度',
      path: ['yieldStrength']
    }
  )
});

// 几何组件验证
export const GeometryComponentSchema = z.object({
  name: BaseValidationRules.name,
  type: z.enum(['excavation', 'support', 'structure'], {
    errorMap: () => ({ message: '请选择有效的组件类型' })
  }),
  geometry: z.object({
    vertices: z.array(z.number()).min(3, '至少需要3个顶点'),
    faces: z.array(z.number()).optional(),
    bounds: z.object({
      min: z.object({
        x: BaseValidationRules.coordinate,
        y: BaseValidationRules.coordinate,
        z: BaseValidationRules.coordinate
      }),
      max: z.object({
        x: BaseValidationRules.coordinate,
        y: BaseValidationRules.coordinate,
        z: BaseValidationRules.coordinate
      })
    }).refine(
      (bounds) => {
        return bounds.min.x < bounds.max.x &&
               bounds.min.y < bounds.max.y &&
               bounds.min.z < bounds.max.z;
      },
      {
        message: '边界框最小值必须小于最大值'
      }
    )
  }),
  material_id: z.string().min(1, '请选择材料'),
  properties: z.record(z.any()).optional()
});

// 土层验证
export const SoilLayerSchema = z.object({
  name: BaseValidationRules.name,
  depth_from: z.number()
    .min(0, '起始深度不能小于0'),
  depth_to: z.number()
    .positive('结束深度必须大于0'),
  elastic_modulus: z.number()
    .positive('弹性模量必须大于0')
    .max(100000, '弹性模量不能超过100,000 MPa'),
  poisson_ratio: z.number()
    .min(0, '泊松比不能小于0')
    .max(0.5, '泊松比不能大于0.5'),
  density: z.number()
    .positive('密度必须大于0')
    .max(10000, '密度不能超过10,000 kg/m³'),
  cohesion: z.number()
    .min(0, '粘聚力不能小于0')
    .max(1000, '粘聚力不能超过1,000 kPa'),
  friction_angle: z.number()
    .min(0, '内摩擦角不能小于0')
    .max(90, '内摩擦角不能大于90度'),
  permeability: z.number()
    .positive('渗透系数必须大于0')
    .max(1, '渗透系数不能超过1 m/s'),
  material_type: z.enum(['clay', 'sand', 'rock'], {
    errorMap: () => ({ message: '请选择有效的土体类型' })
  })
}).refine(
  (data) => data.depth_from < data.depth_to,
  {
    message: '起始深度必须小于结束深度',
    path: ['depth_to']
  }
);

// 开挖阶段验证
export const ExcavationStageSchema = z.object({
  stage: z.number()
    .int('阶段编号必须是整数')
    .positive('阶段编号必须大于0'),
  depth: z.number()
    .positive('开挖深度必须大于0')
    .max(100, '开挖深度不能超过100米'),
  description: BaseValidationRules.name,
  duration: z.number()
    .positive('持续时间必须大于0')
    .max(365, '持续时间不能超过365天')
});

// Terra分析请求验证
export const TerraAnalysisSchema = z.object({
  project_name: BaseValidationRules.name,
  analysis_type: z.enum(['excavation', 'seepage', 'coupled', 'support_design'], {
    errorMap: () => ({ message: '请选择有效的分析类型' })
  }),
  soil_layers: z.array(SoilLayerSchema)
    .min(1, '至少需要一个土层')
    .max(20, '土层数量不能超过20个'),
  excavation_stages: z.array(ExcavationStageSchema)
    .min(1, '至少需要一个开挖阶段')
    .max(10, '开挖阶段不能超过10个'),
  support_elements: z.array(z.any()).optional(),
  mesh_file: BaseValidationRules.filePath.optional()
}).refine(
  (data) => {
    // 验证土层深度连续性
    const sortedLayers = [...data.soil_layers].sort((a, b) => a.depth_from - b.depth_from);
    for (let i = 0; i < sortedLayers.length - 1; i++) {
      if (Math.abs(sortedLayers[i].depth_to - sortedLayers[i + 1].depth_from) > 0.1) {
        return false;
      }
    }
    return true;
  },
  {
    message: '土层深度必须连续',
    path: ['soil_layers']
  }
).refine(
  (data) => {
    // 验证开挖阶段深度递增
    const sortedStages = [...data.excavation_stages].sort((a, b) => a.stage - b.stage);
    for (let i = 0; i < sortedStages.length - 1; i++) {
      if (sortedStages[i].depth >= sortedStages[i + 1].depth) {
        return false;
      }
    }
    return true;
  },
  {
    message: '开挖阶段深度必须递增',
    path: ['excavation_stages']
  }
);

// 网格生成参数验证
export const MeshGenerationSchema = z.object({
  element_size: z.number()
    .positive('单元尺寸必须大于0')
    .max(100, '单元尺寸不能超过100米'),
  mesh_quality: z.number()
    .min(0.1, '网格质量不能小于0.1')
    .max(1.0, '网格质量不能大于1.0'),
  refinement_regions: z.array(z.object({
    name: BaseValidationRules.name,
    element_size: z.number().positive('细化区域单元尺寸必须大于0'),
    geometry: z.any()
  })).optional(),
  mesh_algorithm: z.enum(['delaunay', 'frontal', 'automatic'], {
    errorMap: () => ({ message: '请选择有效的网格算法' })
  }).optional()
});

// 分析设置验证
export const AnalysisSettingsSchema = z.object({
  solver_type: z.enum(['static', 'dynamic', 'eigenvalue'], {
    errorMap: () => ({ message: '请选择有效的求解器类型' })
  }),
  time_step: z.number()
    .positive('时间步长必须大于0')
    .max(10, '时间步长不能超过10秒')
    .optional(),
  end_time: z.number()
    .positive('结束时间必须大于0')
    .max(31536000, '结束时间不能超过1年')
    .optional(),
  convergence_tolerance: z.number()
    .positive('收敛容差必须大于0')
    .max(1, '收敛容差不能大于1')
    .optional(),
  max_iterations: z.number()
    .int('最大迭代次数必须是整数')
    .positive('最大迭代次数必须大于0')
    .max(1000, '最大迭代次数不能超过1000')
    .optional()
});

// 边界条件验证
export const BoundaryConditionSchema = z.object({
  name: BaseValidationRules.name,
  type: z.enum(['displacement', 'force', 'pressure', 'temperature'], {
    errorMap: () => ({ message: '请选择有效的边界条件类型' })
  }),
  geometry_selection: z.object({
    type: z.enum(['nodes', 'edges', 'faces', 'volumes']),
    ids: z.array(z.number().int().positive()).min(1, '至少选择一个几何实体')
  }),
  values: z.array(z.number()).min(1, '至少指定一个值'),
  components: z.array(z.enum(['x', 'y', 'z', 'magnitude'])).min(1, '至少选择一个分量')
});

// 用户设置验证
export const UserSettingsSchema = z.object({
  display: z.object({
    theme: z.enum(['light', 'dark', 'auto']),
    language: z.enum(['zh-CN', 'en-US']),
    grid_visible: z.boolean(),
    axis_visible: z.boolean(),
    wireframe_mode: z.boolean()
  }),
  units: z.object({
    length: z.enum(['m', 'mm', 'cm', 'ft', 'in']),
    force: z.enum(['N', 'kN', 'MN', 'lbf', 'kip']),
    pressure: z.enum(['Pa', 'kPa', 'MPa', 'psi', 'bar']),
    temperature: z.enum(['C', 'F', 'K'])
  }),
  performance: z.object({
    auto_save_interval: z.number()
      .int('自动保存间隔必须是整数')
      .min(1, '自动保存间隔不能少于1分钟')
      .max(60, '自动保存间隔不能超过60分钟'),
    max_history_entries: z.number()
      .int('历史记录条数必须是整数')
      .min(10, '历史记录不能少于10条')
      .max(1000, '历史记录不能超过1000条'),
    enable_gpu_acceleration: z.boolean()
  })
});

// 项目验证
export const ProjectSchema = z.object({
  name: BaseValidationRules.name,
  description: BaseValidationRules.description,
  project_type: z.enum(['excavation', 'structural', 'geotechnical'], {
    errorMap: () => ({ message: '请选择有效的项目类型' })
  }),
  location: z.object({
    address: z.string().max(200, '地址长度不能超过200个字符').optional(),
    coordinates: z.object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180)
    }).optional()
  }).optional(),
  metadata: z.object({
    created_by: z.string().min(1, '创建者不能为空'),
    client: z.string().max(100, '委托方名称不能超过100个字符').optional(),
    contractor: z.string().max(100, '承包方名称不能超过100个字符').optional(),
    design_code: z.string().max(50, '设计规范不能超过50个字符').optional()
  })
});

// 导出所有验证模式
export const ValidationSchemas = {
  Material: MaterialValidationSchema,
  GeometryComponent: GeometryComponentSchema,
  SoilLayer: SoilLayerSchema,
  ExcavationStage: ExcavationStageSchema,
  TerraAnalysis: TerraAnalysisSchema,
  MeshGeneration: MeshGenerationSchema,
  AnalysisSettings: AnalysisSettingsSchema,
  BoundaryCondition: BoundaryConditionSchema,
  UserSettings: UserSettingsSchema,
  Project: ProjectSchema
};

// 验证错误格式化工具
export const formatValidationErrors = (errors: z.ZodError) => {
  return errors.errors.map(error => ({
    field: error.path.join('.'),
    message: error.message,
    code: error.code
  }));
};

// 验证工具函数
export const validateWithSchema = <T>(schema: z.ZodSchema<T>, data: unknown) => {
  try {
    return {
      success: true,
      data: schema.parse(data),
      errors: null
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        data: null,
        errors: formatValidationErrors(error)
      };
    }
    throw error;
  }
};

// 异步验证工具
export const validateAsync = async <T>(schema: z.ZodSchema<T>, data: unknown) => {
  try {
    return {
      success: true,
      data: await schema.parseAsync(data),
      errors: null
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        data: null,
        errors: formatValidationErrors(error)
      };
    }
    throw error;
  }
};