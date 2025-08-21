# 控制中心 3D 地图层炫酷专项方案（AMap/MapLibre）

本方案聚焦“地图引擎层”的视觉升级，不依赖业务数据层，即使数据为空也能呈现强烈三维科技质感。分 AMap 路线和 MapLibre 路线两套备选/可并行路径，按环境自动切换或由配置切换。

---

## 一、目标

- 强三维：大倾角 + 建筑体块层次 + 天空穹/地平线/雾效
- 高级感：路网微发光、城市辉光、暗色统一色板
- 可控开销：4K 屏 30FPS、1080p 50FPS 以上（空场景）

---

## 二、AMap 路线（在现有实现上增强）

### 1) 建筑层与风格统一

- 使用 AMap.Buildings（已集成），建议参数：
  - heightFactor: 2.0 ~ 3.5（放大体块）
  - topColor/sideColor：统一冷青系（与 Deck 色板一致）
- 地图样式统一：
  - 建议在高德控制台创建自定义暗色样式（道路、绿地、POI、文字降饱和），获得样式 ID（amap://styles/xxx），替换现有 dark 主题，避免不同来源瓦片色差。

### 2) GLCustomLayer 屏幕空间特效（不依赖经纬数据）

- 内容：
  - 天空穹/地平线渐变（顶部深蓝 → 地平线青色，模拟大气散射）；
  - 城市辉光圆环（中心区域环形渐变，随缩放而轻微变化）；
  - HUD 科技网格（极低透明 1px 网格 + 稀疏同心圆）。
- 技术点：
  - 用 AMap.GLCustomLayer 注入自绘 WebGL（或 Three.js Renderer 绑定 gl 上下文）；
  - 采用屏幕空间全屏三角形/四边形着色，禁用深度、启用 Additive/Screen 混合，确保与地图叠加；
  - 跟随地图相机参数：仅需获取视口尺寸与缩放级别，屏幕空间即可；不做经纬坐标换算 → 成本低、兼容强。

### 3) 3D 雾化与对比增强

- 屏幕空间雾：底部更浓，上部更淡；
- 边缘暗角（轻微 Vignette）：弱化边缘，突出中心视域；
- 亮度/对比度 LUT（可选）：轻微提升亮度与蓝青色系饱和度。

### 4) 交互联动

- 倾角/缩放联动：
  - 高缩放 → 雾半径减小、辉光半径减小、网格细密度提升；
  - 低缩放 → 反之，强调宏观“城市光晕”。

### 5) 实施步骤（AMap）

- Step A：注入 GLCustomLayer（空实现 + 混合模式 + 帧驱动）
- Step B：全屏天空穹/地平线渐变 → 动态辉光 → 网格/同心圆
- Step C：联动缩放/倾角参数映射；性能压测、开关接入

---

## 三、MapLibre 路线（矢量底图与 3D 挤出）

### 1) 为什么考虑 MapLibre

- 纯前端矢量样式控制，3D Building 挤出（fill-extrusion）、自定义暗色样式；
- 与 deck.gl MapboxLayer 深度融合，可在一个渲染树里统一动效、后续易加体积雾/环境光遮蔽等；
- 离线/内网可自建瓦片服务（国内环境友好）。

### 2) 目标效果

- 矢量道路“发光线”样式（line-color + line-blur + line-opacity 随缩放映射）；
- 建筑挤出 + 顶面提亮 + 侧面冷青（可在 style json 中定义 color/height/ambient）；
- 天空穹/雾：maplibre-gl 内置 sky/fog（v2 API），或以 custom layer 全屏 shader 叠加。

### 3) 实施步骤（MapLibre）

- Step A：引入 MapLibre 作为可选底图（保持 AMap 路线并存），提供 .env 切换
- Step B：应用暗色自定义样式（业务无关），开启建筑挤出；
- Step C：道路发光/雾/天空（样式 JSON）；
- Step D：与 deck.gl 同步相机，替换现有 AMap 同步逻辑（一组适配器）。

---

## 四、开关与降级

- visualSettingsStore 新增：
  - mapFX: { techGrid, cityGlow, horizonSky, screenFog, vignette, roadGlow }；
  - engine: { useAMap: boolean, useMapLibre: boolean }，互斥切换；
- 降级策略：
  - 帧率 < 30：自动关闭 roadGlow/screenFog，保留 horizonSky；
  - AMap 失败 → 切 MapLibre；MapLibre 失败 → Deck 独立底图（已实现）。

---

## 五、验收标准

- 空场景（无数据）：1080p ≥ 55FPS、4K ≥ 32FPS；
- 中等数据量（~1000 点 + 路径）：1080p ≥ 45FPS、4K ≥ 28FPS；
- 地图空白时仍具备“科技感”：天空穹/城市辉光/网格清晰可见；
- 两路线风格一致性 ≥ 90%。

---

## 六、实施计划（建议）

- Phase 1（1~2 天）：
  - AMap GLCustomLayer 全屏 HUD：天空穹/城市辉光/网格 + 参数联动
  - 开关接入 visualSettingsStore，默认温和值，不影响交互
- Phase 2（2~3 天）：
  - MapLibre 可选底图接入 + 暗色样式 + 建筑挤出 + 道路发光
- Phase 3（按需）：
  - 屏幕空间雾 LUT、轻体积光、与 Deck 动效联动（飞行时城市辉光呼吸加深）
