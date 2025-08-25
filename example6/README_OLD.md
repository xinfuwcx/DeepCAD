# DeepCAD-SCOUR Example6 桥墩冲刷分析系统

## 项目概述

DeepCAD-SCOUR Example6 是一个专业的桥墩冲刷分析系统，集成了多种经验公式计算方法和先进的3D可视化技术。系统采用PyQt6构建现代化界面，使用PyVista实现专业CFD风格的3D流场可视化，为桥梁工程师提供精确、直观的冲刷分析工具。

## 主要特性

### 🔬 多种计算方法
- **HEC-18**: 美国联邦公路管理局标准方法
- **Richardson-Davis**: 基于Shields理论的物理方法  
- **Melville-Coleman**: 因素分解法
- **集成算法**: 多方法结果对比和综合评估

### 🎨 专业可视化
- **3D主视图**: 桥墩几何和冲刷坑可视化
- **剖面分析**: XY平面和XZ剖面视图
- **PyVista流场**: 3D速度矢量、压力场、流线追踪
- **专业配色**: CFD软件风格的颜色映射

### 💻 现代化界面
- **Figma风格设计**: 现代渐变背景和圆角元素
- **响应式布局**: 自适应窗口大小调整
- **实时参数验证**: 输入时即时反馈
- **多标签视图**: 清晰的功能模块划分

### 📊 风险评估
- **智能风险等级**: 基于相对冲刷深度的自动评估
- **工程建议**: 针对不同风险等级的防护措施建议
- **监测方案**: 结构健康监测计划制定

## 快速开始

### 环境要求

- Python 3.8+
- PyQt6
- NumPy, Matplotlib, SciPy  
- PyVista (3D可视化)
- pandas (数据处理)

### 安装步骤

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd example6
   ```

2. **安装依赖**
   ```bash
   pip install -r requirements.txt
   ```

3. **启动程序**
   ```bash
   python main.py
   # 或启动增强版
   python enhanced_beautiful_main.py
   ```

### 基础使用

1. **输入参数**: 在左侧面板输入桥墩几何、水力条件和河床参数
2. **选择方法**: 系统自动选择最适合的计算方法
3. **执行计算**: 点击"开始计算"按钮
4. **查看结果**: 在3D视图和结果面板中查看分析结果
5. **流场分析**: 切换到"流场详析"标签页观察3D流场

## 系统架构

```
example6/
├── main.py                     # 主程序入口
├── beautiful_main.py          # 原版界面
├── enhanced_beautiful_main.py # 增强版专业界面 ⭐
├── core/
│   ├── empirical_solver.py    # 冲刷计算求解器
│   ├── fenics_solver.py       # FEniCS有限元求解
│   └── gmsh_meshing.py        # 网格生成
├── gui/
│   └── enhanced_3d_viewport.py # 3D视图组件
├── outputs/                   # 计算结果输出
└── docs/                      # 详细技术文档
    ├── TECHNICAL_DOCUMENTATION.md
    ├── PYVISTA_3D_VISUALIZATION_GUIDE.md
    ├── SCOUR_CALCULATION_METHODS.md
    ├── USER_OPERATION_GUIDE.md
    └── DEVELOPER_API_DOCUMENTATION.md
```

## 核心功能

### 1. 冲刷深度计算

支持多种国际标准计算方法：

```python
# 基本使用示例
from core.empirical_solver import EmpiricalScourSolver, ScourParameters

# 创建参数对象
params = ScourParameters(
    pier_width=2.5,         # 桥墩宽度 (m)
    pier_length=2.5,        # 桥墩长度 (m)
    flow_velocity=2.8,      # 流速 (m/s)
    water_depth=8.5,        # 水深 (m)
    d50_sediment=0.8,       # 中值粒径 (mm)
    # ... 其他参数
)

# 执行计算
solver = EmpiricalScourSolver()
result = solver.calculate_scour(params, method='hec18')

print(f"冲刷深度: {result.scour_depth:.2f} m")
print(f"风险等级: {result.risk_level}")
```

### 2. 3D流场可视化

基于PyVista的专业CFD风格可视化：

- **速度矢量场**: 彩色箭头显示流速分布
- **压力等值面**: 显示桥墩周围压力分布
- **流线追踪**: 可视化流体质点运动轨迹
- **涡量场**: 显示湍流涡流强度分布

### 3. 风险评估系统

```
风险等级标准:
🟢 低风险    (ds/D < 1.5): 结构稳定性良好
🟡 中等风险  (1.5 ≤ ds/D < 2.5): 需要关注
🟠 高风险    (2.5 ≤ ds/D < 3.5): 存在安全隐患  
🔴 极高风险  (ds/D ≥ 3.5): 严重威胁结构安全
```

## 技术特色

### 1. 多算法集成
- 自动选择最适合的计算方法
- 多方法结果对比验证
- 不确定性分析和置信度评估

### 2. 专业CFD可视化
- 基于势流理论的圆柱绕流计算
- 专业CFD颜色映射 (蓝→青→绿→黄→红)
- 交互式3D场景操作

### 3. 工程实用性  
- 符合工程设计规范
- 提供防护措施建议
- 支持批量参数分析

## 文档资源

### 📖 用户文档
- [用户操作指南](USER_OPERATION_GUIDE.md) - 详细的使用说明
- [快速入门教程](USER_OPERATION_GUIDE.md#快速入门) - 5分钟上手指南

### 🔧 技术文档
- [系统技术文档](TECHNICAL_DOCUMENTATION.md) - 系统架构和实现细节
- [PyVista 3D可视化指南](PYVISTA_3D_VISUALIZATION_GUIDE.md) - 3D可视化技术详解
- [冲刷计算方法文档](SCOUR_CALCULATION_METHODS.md) - 各种算法的理论基础

### 👨‍💻 开发文档
- [开发者API文档](DEVELOPER_API_DOCUMENTATION.md) - API接口和扩展开发
- [代码结构说明](TECHNICAL_DOCUMENTATION.md#系统架构) - 模块组织和类设计

## 使用示例

### 典型工程案例

```python
# 某大桥桥墩冲刷分析
bridge_params = ScourParameters(
    pier_width=3.0,              # 桥墩宽度
    pier_length=12.0,            # 桥墩长度  
    pier_shape=PierShape.RECTANGULAR,  # 矩形桥墩
    flow_velocity=3.2,           # 100年一遇洪水流速
    water_depth=15.5,            # 设计洪水位水深
    flow_angle=15,               # 斜交15度
    bed_material='sand',         # 中砂河床
    d50_sediment=1.2,            # 中值粒径1.2mm
    sediment_density=2650        # 石英砂密度
)

# 执行多方法计算
methods = ['hec18', 'richardson_davis', 'melville_coleman']
results = {}

for method in methods:
    results[method] = solver.calculate_scour(bridge_params, method)

# 结果对比
for method, result in results.items():
    print(f"{method}: {result.scour_depth:.2f}m (置信度: {result.confidence:.2f})")
```

## 系统要求

### 硬件要求
- **CPU**: 多核处理器 (推荐4核以上)
- **内存**: 8GB RAM (推荐16GB用于大型3D可视化)
- **显卡**: 支持OpenGL 3.3+ (用于PyVista 3D渲染)
- **存储**: 2GB可用磁盘空间

### 软件要求
- **操作系统**: Windows 10+, macOS 10.14+, Linux (Ubuntu 18.04+)
- **Python**: 3.8-3.11
- **图形界面**: 支持Qt6的桌面环境

## 常见问题

### Q: PyVista 3D可视化无法显示？
A: 确认系统支持OpenGL并安装最新显卡驱动：
```bash
pip install pyvista[all]
# 检查OpenGL支持
python -c "import pyvista as pv; print(pv.system_supports_plotting())"
```

### Q: 计算结果异常偏大或偏小？
A: 检查以下事项：
1. 参数单位是否正确 (m, m/s, mm)
2. Froude数是否在合理范围 (0.1-0.8)
3. 查看系统警告信息
4. 对比多种方法结果

## 版本历史

### v3.1 (当前版本)
- ✅ 集成PyVista 3D流场可视化
- ✅ 增强专业CFD风格界面
- ✅ 添加风险评估系统
- ✅ 完善技术文档

### v3.0
- ✅ 重构为增强专业界面
- ✅ 集成多种计算方法
- ✅ 添加3D可视化功能

## 贡献指南

欢迎参与项目贡献：

1. **Bug报告**: 在GitHub Issues中报告问题
2. **功能建议**: 提出改进建议和新功能需求
3. **代码贡献**: Fork项目并提交Pull Request
4. **文档改进**: 帮助完善用户和开发文档

## 开源协议

本项目采用 MIT 开源协议，详见 LICENSE 文件。

## 技术支持

- **文档**: 查阅项目完整技术文档
- **社区**: 加入用户讨论群
- **商业支持**: 联系 support@deepcad.com

---

**专业桥墩冲刷分析，让工程设计更精确、更安全！**

*DeepCAD-SCOUR Example6 v3.1*  
*© 2024 DeepCAD Solutions. All rights reserved.*