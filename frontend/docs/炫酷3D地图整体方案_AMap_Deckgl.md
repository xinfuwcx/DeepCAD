# 炫酷3D地图整体方案（AMap + Deck.gl）

> 目的：在保持稳定与性能的前提下，大幅提升地图“炫酷度”，兼顾在线（高德）与离线（MapLibre/OSM）两种运行模式。

## 关键信息（先答疑）

- 高德是否支持 3D 瓦片？
  - 高德 JS API v2 原生不支持 Cesium 3D Tiles 标准（tileset.json）。
  - 高德支持 WebGL 3D 场景（Buildings/矢量瓦片/AMap.Object3D/自定义图层与着色器）。
  - 若需要 3D Tiles，两条路线：
    1) 使用 deck.gl 的 Tile3DLayer + loaders.gl（支持 3D Tiles），底图可选 MapLibre/OSM；
    2) 引入 Cesium 专用 3D Tiles 渲染（成本更高）。

## 目标与成功标准

- 视觉：暗色霓虹科技风、层次清晰、动画流畅（≥ 50 FPS 桌面）。
- 功能：
  - 在线模式（AMap）：稳定、带 3D 楼块/自定义发光线网/路径动效。
  - 离线模式（MapLibre + deck.gl）：渲染基础数据与高级可视化（Trips/Hexagon/Heatmap）。
  - 天气：表情/图标覆盖 + 可选雨雪/风场粒子。
- 性能：点/线/面总量 ≤ 100k 实体流畅，粒子 ≤ 20k，GPU 占用可控。

## 推荐技术栈与架构

- 引擎双轨：
  - 在线 AMap（JS API v2/WebGL）：使用 AMap 地图容器 + 自定义图层/对象3D。
  - 离线 MapLibre GL（Vector/Raster）+ deck.gl 作为可视化主力。
- 画布分层：
  1) 底图（AMap 或 MapLibre）
  2) HUD 画布（天空穹/城市辉光/科技网格/暗角/屏幕雾）
  3) deck.gl 图层（数据可视化：点/线/面/热区/路径/3D Tiles）
  4) three.js 后期（Bloom/Vignette/色温，可开关）
- 模式切换：通过环境变量/设置面板在 AMap 与 MapLibre 之间切换，deck.gl 叠加保持一致的交互与相机同步。

## 视觉效果清单（可独立开关）

- HUD（2D 画布覆盖）：
  - 天空穹/地平线渐变、城市辉光（中心椭圆光晕）、科技网格、屏幕雾、轻微暗角。
- 发光线网与流动：
  - deck.gl PathLayer/LineLayer + 自定义着色（时间参数驱动线性流动、端点辉光）。
- 迁徙动效：
  - deck.gl TripsLayer（支持时间轴）或基于 LineLayer 的渐隐轨迹。
- 点云/设施：
  - ScatterplotLayer（脉冲/呼吸动画，按状态染色）。
- 热区与密度：
  - HexagonLayer / GPUGridLayer / HeatmapLayer（按数据量选择）。
- 3D 建筑：
  - AMap：Buildings + Object3DLayer，定制楼块色彩与外发光描边。
  - MapLibre：Fill-Extrusion（矢量楼块）+ deck.gl Outline 描边。
- 天气：
  - 简版：emoji/icon 覆盖。
  - 进阶：雨/雪粒子（ParticleLayer 或自定义 Layer），风场流线（GeoWind/自研矢量场）。
- 后期：
  - three.js Bloom/Vignette/色温/色调映射（默认关闭，性能充足时开启）。

## 数据与接口

- 底图：
  - 在线：AMap（夜景/暗色）。
  - 离线：自建 MapLibre Style + OSM/Carto 瓦片（可自托管）。
- 天气：
  - AMap 天气服务（城市/行政区粒度），或 Open-Meteo（全球，无 Key）。本地缓存 10~30 分钟。
- 3D Tiles（可选）：
  - deck.gl Tile3DLayer（loaders.gl 3d-tiles）直接渲染 tileset.json。

## 性能预算与优化

- 帧率目标：桌面 ≥ 50 FPS，4K 屏 ≥ 40 FPS。
- 图层与对象预算：
  - 点：≤ 50k（分组/分页/视锥裁剪/抽样）。
  - 线：≤ 10k（分段批处理、简化、Instancing）。
  - 粒子：≤ 20k（帧率自适应、降采样）。
- GPU/CPU 优化：
  - Worker 预处理、节流/防抖、按需更新、相机稳定阈值。
  - 瓦片缓存（TileLayer）、图层可见性裁剪、低配降级方案。

## 迭代计划（建议）

- Phase 1（1~2 天）：
  - 完成 HUD（天空穹/辉光/网格/雾/暗角）与天气覆盖；
  - Deck 基础图层（Scatterplot/Line/Hexagon/Heatmap）+ 暗色底图；
  - 开关面板与持久化；离线/在线切换打通。
- Phase 2（3~5 天）：
  - 发光路径/迁徙（Trips/Trail），城市辉光环、楼块外描边；
  - 主题化配色与动画曲线打磨；性能调优（帧率自适应）。
- Phase 3（5~7 天）：
  - 3D Tiles（Tile3DLayer）/雨雪粒子/风场；
  - 一键美化 Preset、截图/录屏模式、可视化导出。

## 风险与规避

- AMap 白名单/Referer 限制：本地与生产域名需配置；提供离线备用引擎。
- 国内网络波动：关键资源镜像/本地化；失败兜底（多源瓦片）。
- GPU 内存与功耗：分辨率/抗锯齿动态调节、粒子/特效自适应开关。
- 字体与 emoji 兼容：优先 SDF 文本或图标字体，提供回退。

## 落地清单（任务 + 验收）

- 引擎切换：AMap/MapLibre 一键切换；验收：在两种模式下基础图层一致显示。
- HUD：五大效果按开关即时更新；验收：开关生效，60FPS 视野下不掉帧。
- Deck 图层：点/线/热区/迁徙；验收：示例数据演示 + 性能达标。
- 天气：覆盖 + 粒子（可选）；验收：切城市更新，网络离线有兜底展示。
- 3D 建筑/3D Tiles：
  - 建筑：AMap/MapLibre 各一版；
  - 3D Tiles（如有）：加载官方 tileset 示例通过。
- 后期：Bloom/Vignette 开关；验收：开启后帧率仍达标或自动降级。

---

如需我同步改造代码：

1) 完成 AMap 与 MapLibre 的双引擎切换与相机同步；
2) 输出一套暗色霓虹主题（MapLibre style.json + HUD 预设）；
3) 接入 Trips/Trail/Glow 的通用 Layer 工具；
4) 可选引入 Tile3DLayer 验证 3D Tiles；
5) 最终出一键“炫酷模式”Preset 与录屏模式。
