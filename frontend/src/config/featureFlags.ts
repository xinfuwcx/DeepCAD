// 全局功能开关定义 (可按需扩展)
export const FEATURE_FLAGS = {
  // 关闭旧版 CAD 工具栏，采用新一代专业视口内嵌工具体系
  legacyCADToolbar: false,
};
export type FeatureFlagKey = keyof typeof FEATURE_FLAGS;
export const isFeatureEnabled = (k: FeatureFlagKey) => FEATURE_FLAGS[k];
