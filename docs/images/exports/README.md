# 深基坑分析系统图表说明

本目录包含深基坑分析系统技术文档中使用的各种图表和示意图。这些图表用于直观展示系统的架构、工作原理和关键技术点。

## 图表列表

### 1. 系统架构图
- `main_interface.png` - 系统主界面示意图
- `simplified_architecture.png` - 系统简化架构图

### 2. 技术原理图
- `domain_decomposition.png` - 域分解策略示意图
- `mesh_strategy.png` - 网格处理策略图
- `iga_fem_evaluation.png` - IGA与FEM评估对比图

### 3. 特殊技术问题解决方案图
- `anchor_wall_connection.png` - 预应力锚索与地连墙连接处理图
- `infinite_iga_boundary.png` - 无限域与IGA边界处理图
- `constitutive_model_integration.png` - 复杂岩土本构模型调用图

### 4. UI设计图
- `main_layout.png` - 总体布局示意图
- `workspace_layout.png` - 工作区布局图
- `3d_canvas.png` - 三维画布设计图
- `parameters_panel.png` - 参数面板设计图

## 查看图表

这些图表可以通过以下方式查看：

1. **在技术文档中**：这些图表已嵌入到相关技术文档中，可以直接在文档中查看。

2. **单独查看**：可以使用图像查看器直接打开这些PNG文件。

3. **在线查看**：如果系统部署了在线文档，可以通过文档网站查看这些图表。

## 修改图表

如需修改这些图表：

1. 源文件（如Mermaid代码、Figma设计文件等）存储在相应的源文件目录中。

2. 修改后重新导出为PNG格式，并保持相同的文件名。

3. 更新后的图表将自动在文档中更新。

## 图表格式标准

- **文件格式**：PNG（推荐）或SVG
- **分辨率**：至少300 DPI
- **颜色模式**：RGB
- **命名规范**：使用下划线分隔的小写字母，描述图表内容

## 配色方案

图表使用系统标准配色方案：

- 主色调：深蓝色 #1A4F8B
- IGA相关：浅蓝色 #4A90E2
- FEM相关：绿色 #2CC16A
- 混合/接触相关：橙色 #F5A623
- 警告/错误：红色 #D0021B 