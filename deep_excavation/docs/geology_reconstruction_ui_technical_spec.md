## 深基坑地质三维重建面板与流程技术规范（v1.0 提案）

### 1. 范围与目标
- 定位：深基坑“近场地层重建”，为围护/支撑/监测与后续网格提供稳定可复现的三维地层面。
- 不做：大区域地学平台；短期不在 UI 暴露断层/方向数据（后续版本再开）。

### 2. 面板结构（保留 4 个 Tab）
1) 土体计算域（核心）
2) 钻孔数据（数据导入/编辑 + 3D 显示开关 + 图表）
3) 参数配置（高级：容错、缓存、正则、导出偏好）
4) 水头参数（原“渗流参数”重命名，仅静水压力，不做渗流）

顶部固定操作区（不随 Tab 滚动）：
- 按钮：预览、确定、取消
- 实时信息：单元数 N=nx×ny×nz、内存风险（8 GB 预算）、耗时预估

### 3. 土体计算域（含“自动域/手动域”切换）
- 域模式单选：自动域（默认）/ 手动域
- 自动域：
  - 不输入 X/Y/Z；后端依据数据 MBB 自动外扩（默认 30%，可通过 slider 配置 10–50%）。
  - 分辨率：预设档（预览/标准/精细）+ 可选“自定义 nx,ny,nz”。
  - ROI 细化：可勾选（以基坑边界+20 m 缓冲作为 finer 区域，其余 coarse）。
  - API：可不传 `domain_config`（后端自动域），或传 `{ mode: 'auto', expansion: percent }`。
- 手动域：
  - 启用 X/Y/Z min/max 输入，分辨率设置与自动域一致。
  - API：传 `domain_config = { xmin,xmax,ymin,ymax,zmin,zmax,nx,ny,nz }`。
- 校验与约束：
  - 合法性：xMin<xMax, yMin<yMax, zMin<zMax；nx,ny,nz ≥ 8 且为整数。
  - 资源阈值：软上限 N≤300k（黄）；硬上限 N>500k（红，禁止提交）。
  - 超限建议：降档/启用 ROI/缩小域。

### 4. 容错与回退策略
- 预览超时阈值：T_preview = 15 s。
- 回退条件：超时或插值收敛异常 → 自动回退为 RBF/IDW 生成“预览级”结果（仅可视化，不用于力学）。
- 质量门槛（工程可用 vs 预览级）：
  - 以 H = zmax − zmin 进行归一化，`RMSEz/H`：
    - ≤ 0.05 → 工程可用（可“确定/落库”）。
    - 0.05–0.10 → 仅预览级（“确定”需二次确认）。
    - > 0.10 → 拒绝确定（需调整参数）。

### 5. 钻孔数据（Data）
- 导入/编辑：CSV/Excel 导入，表格批量编辑；字段校验（x,y,z、层顶/底、层名、颜色）。
- 可视化：
  - 3D 显示开关（默认开启）：立柱+分段色带，支持选中高亮。
  - 图表：单孔层厚条形图、层位堆叠分布；列表/图表/3D 三方联动。
- 性能：限定最大孔数（建议 ≤ 500），超限提示筛选/分批载入；3D 采用合批/实例化以降低 draw calls。

### 6. 参数配置（高级）
- 容错策略：
  - 允许/禁止自动回退；允许/禁止自动降采样（超过软上限自动降一档或启用 ROI）。
- 缓存策略：允许命中历史缓存；UI 显示“缓存命中（xxms）”。
- 平滑/正则化：1–2 个 slider（范围工程经验值）。
- 导出偏好：GLB（glTF2.0）/ JSON+二进制 Buffer（二选一）。

### 7. 水头参数（静水压力，替代“渗流参数”）
- 仅静水压力，不进行渗流数值模拟。
- 参数：
  - `z_water`（水位标高，m，项目坐标）
  - `gamma_w`（水的单位重，默认 9.81 kN/m³，允许 9.8–10.2）
  - `delta_h`（内外水位差，默认 0）
  - `gradient = { gx, gy }`（线性水位梯度，默认 0）
  - `alpha_u`（有效系数，默认 1.0）
- 计算约定（供几何/网格团队）：
  - 静水孔压 `u(z) = gamma_w * max(0, h(x,y) − z)`，其中 `h(x,y) = z_water + gx·(x−x0) + gy·(y−y0)`。
  - 如存在降排水，基坑内/外壁采用不同 `h_in / h_out`。
- 输出（交换件）：
  - `head_config.json`（上述参数 + 参考点），可选 `water_table.glb`（半透明水位面 Mesh）。

### 8. 三维视口联动
- 预览：直接渲染；右上角角标“预览级/工程可用”。
- 回退：条幅提示“已回退为 RBF/IDW 预览（不可用于力学）”。
- 确认：
  - 工程可用 → 直接落库。
  - 仅预览级 → 二次确认后方可落库（标注低置信度）。
- 工具：剖切/测量/爆炸/截图；相机 `fit to content`；钻孔 3D 显示开关独立控制。

### 9. 交换与落地（供几何/网格团队）
- 预览：仅缓存，不落库（支持截图导出）。
- 确定：生成资产与版本号，返回 `asset_ids` 与 `version_id`。
- 交换格式：
  - 方案 A（推荐）：单一 GLB（glTF2.0）
    - 每个地层 1 个 Mesh（名称=formation_id；颜色=RGB）
    - `extras` 写入 metadata（formation_name、thickness、stats）
  - 方案 B：JSON + 二进制 Buffer
    - `formations[]`：`{ id, name, color, mesh:{ positions, indices, normals } }`
    - `provenance`：参数快照与结果指纹

### 10. 后端接口（建议）
- 建模：
  - `POST /geology/gempy-modeling?mode=preview` → `threejs_data` + `stats` + `quality` + `fallback_used`
  - `POST /geology/gempy-modeling?mode=commit` → 落库，返回 `asset_ids`、`version_id`
- 水头配置：
  - `POST /geology/water-head/config` → 保存配置（绑定工程/版本）
  - `GET /geology/water-head/config` → 查询配置
- 缓存：以（boreholes、domain_config 或 auto+expansion、method、advanced_opts）哈希作为 Key。

### 11. 默认值与阈值
- 自动域外扩：默认 30%，可调 10–50%。
- 内存预算：8 GB；软上限 N≤300k；硬上限 N>500k 禁止提交。
- 预览超时：15 s。
- 工程可用门槛：`RMSEz/H ≤ 0.05`。

### 12. 验收标准（UI/流程）
- “自动域/手动域”切换后，参数块显隐/可编辑状态正确；实时显示 N/内存/耗时与风险等级。
- 预览/回退/确定的交互闭环清晰；3D 水印/条幅准确提示状态。
- commit 产出 GLB/JSON 与版本号；水头参数 `head_config.json` 可保存/查询。
- 钻孔 3D 开关有效；数据列表/图表/3D 联动正常；字段校验生效。

---
文档版本：v1.0 提案（用于实现前评审）
更新时间：YYYY-MM-DD
