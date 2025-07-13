import { z } from 'zod';

// 地质建模参数Schema
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
    .max(200, 'X方向延拓距离不能大于200米'),
  yExtend: z.number()
    .min(10, 'Y方向延拓距离不能小于10米')
    .max(200, 'Y方向延拓距离不能大于200米'),
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
export type GeologyParams = z.infer<typeof GeologyParamsSchema>;
export type ExcavationParams = z.infer<typeof ExcavationParamsSchema>;
export type DiaphragmWallParams = z.infer<typeof DiaphragmWallSchema>;
export type PilePileParams = z.infer<typeof PilePileSchema>;
export type AnchorParams = z.infer<typeof AnchorSchema>;
export type SteelSupportParams = z.infer<typeof SteelSupportSchema>;
export type SupportParams = z.infer<typeof SupportParamsSchema>;
export type GeometryModel = z.infer<typeof GeometryModelSchema>;