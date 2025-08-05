# Example2 - DeepCAD系统测试程序

基于DeepCAD平台的完整CAE工作流测试程序，集成前处理、分析、后处理三大模块。

## 项目概述

Example2是DeepCAD系统的完整测试程序，提供：
- **前处理模块**: PyVista可视化网格、约束、荷载
- **分析模块**: 支持多种分析步骤和计算类型
- **后处理模块**: 云图、动画、详细结果显示
- **集成测试**: 验证DeepCAD完整工作流

## 技术架构

### 核心技术栈
- **GUI框架**: PyQt6 (现代化桌面应用框架)
- **模型解析**: 自定义FPN/MGT/MCT解析器
- **数值计算**: Kratos Multiphysics (集成中)
- **可视化**: PyVista + VTK (专业3D可视化)
- **数据处理**: NumPy + Pandas + SciPy

### 系统架构
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   GUI界面层     │    │   业务逻辑层    │    │   计算引擎层    │
│                 │────│                 │────│                 │
│ - 主窗口        │    │ - MIDAS解析器   │    │ - Kratos集成    │
│ - 3D视图        │    │ - 数据转换器    │    │ - 求解器控制    │
│ - 控制面板      │    │ - 项目管理      │    │ - 结果处理      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 功能特性

### 1. MIDAS模型支持
- **MCT文件**: MIDAS Civil原生格式
- **MGT文件**: MIDAS Gen文本格式
- **FPN模型**: Feature Pyramid Network模型支持
- **数据验证**: 自动检查模型完整性

### 2. 用户界面
- **文件管理**: 导入、保存、项目管理
- **模型查看**: 3D几何显示、材料属性
- **参数设置**: 计算参数、边界条件配置
- **结果展示**: 云图、等值线、动画显示

### 3. 计算功能
- **静力分析**: 线性/非线性静力计算
- **动力分析**: 模态分析、时程分析
- **多物理场**: 固体-流体耦合分析
- **并行计算**: 多核CPU加速

## 文件结构

```
H:/DeepCAD/example2/
├── README.md                    # 项目说明文档
├── requirements.txt             # Python依赖包
├── main.py                      # 主程序入口
├── 
├── gui/                         # 图形界面模块
│   ├── __init__.py
│   ├── main_window.py          # 主窗口
│   ├── model_viewer.py         # 3D模型查看器
│   ├── control_panel.py        # 控制面板
│   └── dialogs/                # 对话框组件
│       ├── import_dialog.py
│       ├── settings_dialog.py
│       └── results_dialog.py
│
├── core/                        # 核心业务逻辑
│   ├── __init__.py
│   ├── midas_reader.py         # MIDAS文件解析器
│   ├── model_converter.py      # 模型格式转换
│   ├── kratos_interface.py     # Kratos接口封装
│   └── project_manager.py      # 项目数据管理
│
├── utils/                       # 工具模块
│   ├── __init__.py
│   ├── file_utils.py           # 文件操作工具
│   ├── mesh_utils.py           # 网格处理工具
│   └── validation.py           # 数据验证
│
├── tests/                       # 测试用例
│   ├── __init__.py
│   ├── test_midas_reader.py
│   ├── test_converter.py
│   └── sample_data/            # 测试数据
│       ├── sample.mct
│       └── sample.mgt
│
├── resources/                   # 资源文件
│   ├── icons/                  # 图标资源
│   ├── styles/                 # 样式文件
│   └── templates/              # 模板文件
│
├── docs/                        # 文档
│   ├── user_guide.md           # 用户指南
│   ├── developer_guide.md      # 开发指南
│   └── api_reference.md        # API参考
│
└── output/                      # 输出目录
    ├── projects/               # 项目文件
    ├── results/                # 计算结果
    └── exports/                # 导出文件
```

## 快速开始

### 环境要求
- Python 3.8+ (推荐 3.10+)
- PyQt6>=6.4.0 (现代化GUI框架)
- PyVista>=0.42.0 (3D可视化)
- NumPy>=1.24.0, Pandas>=2.0.0 (数值计算)
- Kratos Multiphysics (可选，用于真实计算)

### 安装步骤
```bash
cd H:/DeepCAD/example2
pip install -r requirements.txt
python main.py
```

### 使用流程
1. **导入模型**: 文件 → 导入 → 选择MCT/MGT文件
2. **查看模型**: 在3D视图中检查几何和材料
3. **设置参数**: 配置计算参数和边界条件
4. **运行计算**: 点击运行按钮启动Kratos计算
5. **查看结果**: 在结果面板中查看计算结果

## 核心模块说明

### MIDAS文件解析器
```python
from core.midas_reader import MIDASReader

reader = MIDASReader()
model = reader.read_mct_file("model.mct")  # 读取MCT文件
model = reader.read_mgt_file("model.mgt")  # 读取MGT文件
```

### Kratos计算接口
```python
from core.kratos_interface import KratosInterface

interface = KratosInterface()
interface.setup_analysis(model)
results = interface.run_calculation()
```

### 3D可视化
```python
from gui.model_viewer import ModelViewer

viewer = ModelViewer()
viewer.display_model(model)
viewer.show_results(results)
```

## 开发指南

### 添加新的文件格式支持
1. 在 `core/midas_reader.py` 中添加新的解析方法
2. 在 `core/model_converter.py` 中添加格式转换逻辑
3. 更新 `gui/dialogs/import_dialog.py` 中的文件过滤器

### 扩展计算功能
1. 在 `core/kratos_interface.py` 中添加新的分析类型
2. 更新 `gui/control_panel.py` 中的参数设置界面
3. 在 `gui/model_viewer.py` 中添加结果显示方式

### 自定义界面主题
1. 修改 `resources/styles/` 中的样式文件
2. 在 `gui/main_window.py` 中应用新主题
3. 更新图标资源文件

## 技术特点

### MIDAS格式支持
- **完整解析**: 支持节点、单元、材料、荷载、边界条件
- **数据验证**: 自动检查数据完整性和一致性
- **格式转换**: 无损转换为Kratos兼容格式
- **错误处理**: 详细的错误报告和修复建议

### Kratos集成
- **无缝集成**: 直接调用现有DeepCAD计算核心
- **参数映射**: 自动映射MIDAS参数到Kratos格式
- **实时监控**: 计算过程实时状态显示
- **结果处理**: 自动生成VTK格式结果文件

### 用户体验
- **现代界面**: 基于PyQt5的专业级界面设计
- **直观操作**: 拖拽式文件导入，一键式计算启动
- **实时预览**: 3D模型实时显示和交互操作
- **智能提示**: 上下文相关的帮助和提示信息

## 版本历史

- **v1.0.0** (计划): 基础功能实现
  - MIDAS MCT/MGT文件读取
  - PyQt5图形界面
  - Kratos计算集成
  - PyVista结果可视化

- **v1.1.0** (计划): 功能扩展
  - FPN模型支持
  - 批量处理功能
  - 报告生成功能

- **v2.0.0** (计划): 高级功能
  - 云计算支持
  - 协同工作功能
  - 插件系统

## 技术支持

- **用户手册**: 查看 `docs/user_guide.md`
- **开发文档**: 查看 `docs/developer_guide.md`
- **API文档**: 查看 `docs/api_reference.md`
- **示例项目**: 查看 `tests/sample_data/`

---
**Example2 v1.0** - MIDAS模型桌面版计算程序  
基于DeepCAD平台 | 支持MIDAS 2022 | 集成Kratos计算引擎