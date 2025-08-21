# DeepCAD 控制中心 · 炫酷地图视觉升级方案（草案）

本文档提出一套分阶段的“地图 + 可视化”升级路线，兼顾性能、兼容性与易切换。目标是在现有 AMap + Deck.gl + R3F 架构上，打造具备大屏气质的“科技感三维态势视图”。

---

## 1. 现状复盘

- 底图：AMap v2 暗色样式；离线回退：Deck.gl TileLayer（OSM/Carto/高德瓦片）
- 数据层：Deck.gl Scatterplot/Line/Column/Hex + 懒加载 Heatmap
- 背景：R3F 粒子场 + 可选 Bloom（已增加安全挂载与默认关闭）
- 问题：
  - ⭐ 视觉“层级感/空间感”不足（雾、体积光、泛光层级、景深）；
  - ⭐ 重点对象缺少“电影化”强调（外发光、扫描波、尾迹粒子）；
  - 网络或 Key 限制导致底图不可用时，炫酷度下降；
  - 大量项目时，交互与帧率波动。

---

## 2. 目标风格与设计关键词

- 暗色科技 + 体积雾 + 霓虹边缘 + 低饱和底图 + 高对比重点
- 三层空间层级：
  1) 空间背景层（R3F 粒子/雾/体积光）
  2) 地图底图层（AMap 或离线瓦片，统一色调）
  3) 数据可视层（Deck.gl 带发光/描边/动态效果）
- 动态：扫描/呼吸/流动，缓慢不打扰；强调动静对比。

---

## 3. 升级项清单（按性价比排序）

### 3.1 可视图层升级（Deck.gl）

- 发光描边与外发光模拟：
  - Scatterplot 双层：实体点 + 大半透明描边（halo）+ 脉冲半径（已具备）→ 增加“次级柔光”阴影层（更大、透明更低）。
- 动态扫圈/雷达波：
  - 为选中点叠加径向扫描圈（半径随时间缓慢增长，透明渐隐）。
- 尾迹粒子提升：
  - 以 GPU Particle（Scatterplot 喂入插值位置）+ 加速-减速 Easing，叠加微弱模糊感颜色。
- 柱体/Hex 统一色板：
  - 使用 HCL 渐变，拉开明度和饱和度梯度，营造“能量塔”效果；柱体顶面轻微偏亮。
- 轨迹线分段渐变：
  - LineLayer 改为 PathLayer，利用 widthMinPixels + getColor 分段映射 value → 颜色渐变。

### 3.2 底图统一与风格化

- 统一暗色瓦片来源与色调：
  - 优先 AMap 暗色；回退 CartoDark/高德瓦片（HTTP 模式仅作演示，不泄露 Key）。
- Deck 独立模式下叠加“网格/经纬网微纹理”：
  - 添加静态透明网格 PNG 作为 BitmapLayer 顶层，营造科技底纹。

### 3.3 R3F 背景层升级

- 体积雾：
  - 使用 drei 的 fog 或自定义 shader fog，颜色偏蓝青；
- 光锥与体积光效果：
  - 少量锥体几何 + additiveBlending + Bloom；
- 星尘粒子“速度视差”：
  - 粒子在慢速缓动，Z 深度分层，不同层速度不同，强化纵深。

### 3.4 交互动画（电影化）

- 自动镜头摆动：
  - 小幅度 pitch/bearing 呼吸式变化，保持三维感。
- 重点项目“戏剧化进入”：
  - 飞行后 1s 内在选中点上叠加扫描 + 外发光 + 微缩放 Deck 视图。

### 3.5 性能与稳健性

- LOD 策略：
  - >1000 项时抽样；>5000 项时聚合（Hex/Heatmap）；
- EffectComposer 安全挂载（已加），默认关闭；
- 统一 tick：使用 requestAnimationFrame 驱动粒子/扫描/尾迹相位，避免多计时器。

---

## 4. 分阶段落地计划

### Phase 1（1~2 天）

- Deck.gl 视觉增强包：
  - 双层柔光 Halo、扫描圈、路径渐变、统一色板
- 离线独立模式：添加“科技网格纹理”顶层 BitmapLayer
- 背景：开启雾（fog）基础版

### Phase 2（2~3 天）

- 体积光锥组件（R3F）与轻 Bloom 套餐
- GPU 粒子尾迹（更顺滑 e.g. 32~64 粒）
- 交互“戏剧化进入”链路

### Phase 3（按需）

- 全局色板主题切换（dark/minimal/business 已有，扩展 neon/cyber）
- 视差滚动/镜头轻摆动（可配置）
- 数据驱动动画（风险升高 → 光效加强）

---

## 5. 关键技术实现要点（片段级）

### 5.1 扫描圈层（Deck.gl ScatterplotLayer）

- 以选中项目为数据源，radiusUnits: pixels，半径 = `base + sin(t*k) * amp`；
- 分两层：内圈细线 + 外圈虚化大圈；updateTriggers 绑定相位。

### 5.2 路径渐变（PathLayer）

- getColor 返回函数根据 segment progress 设置颜色，形成从冷色到亮青的流动感；
- widthMinPixels 保持可见性。

### 5.3 科技网格纹理（独立模式）

- 置顶 BitmapLayer 叠加一张半透明 4k 网格 PNG（本地 public/tech_grid.png）；
- bounds 使用当前视图经纬度范围扩展 10% 避免边缘裁切。

### 5.4 体积雾

- R3F Canvas 添加 <fog attach="fog" args={[color, near, far]} />；
- 颜色建议 #071a2f，near=800, far=4000（根据相机调整）。

---

## 6. 配置与开关

- 视觉开关全部透出到 visualSettingsStore：
  - showScanWave, showTrailParticles, showPathGradient, showTechGrid
  - fogEnabled, glowPreset（none/light/strong）
- 默认保守：关闭较重特效，允许一键“炫酷模式”。

---

## 7. 风险与回退

- AMap 加载失败 → 自动 Deck 独立模式 + 暗色底图 + 科技网格纹理；
- 浏览器低性能 → 降级关闭 Bloom/体积光，切 Hex 聚合；
- 法规与合规 → 不在客户端暴露私有瓦片 Key，离线演示使用公共瓦片。

---

## 8. 验收标准

- 1080p 下 FPS ≥ 50，4K 下 FPS ≥ 30（500~1500 个项目，含 Halo/扫描/尾迹）；
- 重点对象突出明显，阅读路径清晰，背景不喧宾；
- AMap 与离线模式视觉风格一致性 ≥ 90%。

---

## 9. 后续可拓展

- 天气云图/风场（粒子流）叠加；
- 3D 建筑 Outline（AMap Buildings 自定义着色或 Deck extruded polygons）；
- 选中项目 3D 提示牌（R3F Portal + HTML Overlay）。
