// 全局功能开关定义 (可按需扩展)
export const FEATURE_FLAGS = {
  legacyCADToolbar: true,
};
export type FeatureFlagKey = keyof typeof FEATURE_FLAGS;
export const isFeatureEnabled = (k: FeatureFlagKey) => FEATURE_FLAGS[k];
