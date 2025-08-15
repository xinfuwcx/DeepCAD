# Kratos 输出接口一览

本项目中 Kratos 的“输出接口”包含三层：底层求解器原始输出（GiD/VTK）、后处理可视化导出（glTF/预览图），以及服务对外暴露方式（静态 URL + WebSocket 通知）。以下为简要规范。

## 1) 底层求解器原始输出

- 结构求解（core/kratos_solver.py）
  - 输出进程：GiDOutputProcess（单文件、二进制）
  - 配置位置：`core/kratos_solver.py` 的 `_create_default_parameters()`
  - 关键配置：
    - GiDPostMode: GiD_PostBinary
    - MultiFileFlag: SingleFile
    - file_label: step，output_interval: 1
    - nodal_results: ["DISPLACEMENT", "REACTION"]
    - gauss_point_results: ["VON_MISES_STRESS"]
  - 输出目录：`results/`（默认与 mdpa 同级，或由 `setup(mesh_file, output_dir)` 显式指定）
  - 访问方式：完成后通过 WebSocket 返回 `results_url`（静态目录映射），便于前端/运维直接下载或浏览。

- Terra（深基坑）阶段性分析（gateway/modules/computation/terra_solver.py）
  - 输出方式：Kratos `VtkOutput`（二进制）
  - 每阶段产物：返回 `.vtk` 文件路径列表（`TerraAnalysisResult.vtk_files`）
  - 节点场输出（示例）：DISPLACEMENT、WATER_PRESSURE、REACTION
  - 用途：后续由 PyVista 加载，生成 Web 可视化数据

- 其他示例/测试
  - 在 `test_geomechanics.py`、`scripts/export_kratos_from_fpn.py` 可见 `VtkOutputProcess` 用法与 `folder_name` 配置（VTK 目录输出）。

## 2) 后处理可视化导出

- 模块：`gateway/modules/visualization/postprocessing_routes.py`（配合 `pyvista_web_bridge`）
- 流程：读取 Kratos 结果（常见为 `.vtk`），生成 PyVista 网格 → 导出 Web 友好格式 → 生成预览图
- 导出结果：
  - glTF 模型：`/static/web_exports/*.gltf`
  - 预览图片（可选）：`/static/previews/*.png`
- 可视化字段（示例）：
  - 结构：von_mises_stress、displacement、principal_stress、strain_energy
  - 岩土：settlement、pore_pressure、safety_factor、displacement

## 3) 服务对外暴露方式

- WebSocket（计算进度/完成）
  - 源：`gateway/modules/computation/kratos_handler.py`
  - 事件：`type: "computation_progress"`，状态有 running/failed/completed
  - 完成示例（含原始结果静态目录）：

```json
{
  "type": "computation_progress",
  "status": "completed",
  "progress": 100,
  "message": "Kratos analysis completed",
  "results_url": "/static/results/<run-id>"
}
```

- WebSocket（后处理完成）
  - 源：`gateway/modules/visualization/postprocessing_routes.py`
  - 事件：`type: "postprocessing_completed"`
  - 负载示例（含 glTF 与字段信息）：

```json
{
  "type": "postprocessing_completed",
  "session_id": "...",
  "mesh_url": "/static/web_exports/model_xxxx.gltf",
  "preview_url": "/static/previews/preview_xxxx.png",
  "field_info": {
    "current_field": "von_mises_stress",
    "available_fields": ["von_mises_stress", "displacement"],
    "field_details": {"von_mises_stress": {"unit": "MPa", "data_range": [min, max], "colormap": "viridis"}}
  },
  "mesh_info": {"n_points": ..., "n_cells": ..., "bounds": [...]},
  "analysis_type": "structural"
}
```

- 静态资源
  - 原始结果目录：`/static/results/<run-id>/`（GiD/VTK 等原始输出）
  - 可视化模型：`/static/web_exports/*.gltf`
  - 预览图片：`/static/previews/*.png`

## 字段与单位（常见）

- DISPLACEMENT: m
- REACTION: N
- VON_MISES_STRESS: Pa 或 MPa（显示层通常用 MPa）
- WATER_PRESSURE / pore_pressure: Pa 或 kPa
- settlement: mm（显示层单位转换后）

## 典型对接方式（前端）

- 监听计算完成 WebSocket，取 `results_url` 浏览/下载原始结果（GiD/VTK）
- 监听后处理完成 WebSocket，加载 `mesh_url` glTF 在 3D 视口中展示，结合 `field_info` 切换标量场/色标

## 备注

- 若运行环境未安装 PyVista/VTK，仅提供原始结果目录（`results_url`）。
- 若需要 VTK 连续时步或多子模型输出，可在 Kratos 配置中改用 `VtkOutputProcess` 并设置 `folder_name`、`output_interval` 等参数。
