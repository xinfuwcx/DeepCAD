# 🌋 GEM隐式建模系统

**GEM Implicit Modeling System**

基于GemPy的专业级地质隐式建模CAE系统，采用Abaqus风格的现代化界面设计。

## ✨ 系统特性

### 🎯 核心功能
- **📊 智能数据管理** - 钻孔数据、地层点、方向数据的导入和管理
- **🗻 三维地质建模** - 基于GemPy的隐式地质建模算法
- **⚡ 断层系统建模** - 复杂断层网络的构建和管理
- **🌍 地球物理模拟** - 重力场、磁场正演计算
- **📈 不确定性分析** - 贝叶斯推理和蒙特卡洛模拟
- **🎨 专业可视化** - 高质量3D渲染和多视图显示

### 🖥️ 界面特色
- **🌲 模型树浏览器** - 分层管理所有地质要素
- **🔧 专业工具栏** - 快速访问建模工具
- **📐 3D工作视口** - 基于PyVista的高性能渲染
- **⚙️ 属性面板** - 详细参数控制和编辑
- **📝 消息中心** - 实时操作反馈和状态显示

## 🛠️ 系统要求

### 必需依赖
- **Python** 3.8+
- **PyQt6** 6.4+
- **NumPy** 1.20+
- **Pandas** 1.3+
- **GemPy** 3.0+
- **PyVista** 0.40+
- **Matplotlib** 3.5+

### 可选依赖
- **QtAwesome** - 图标支持
- **PyVistaQt** - Qt集成增强
- **VTK** - 高级3D渲染
- **Scikit-learn** - 机器学习功能
- **SciPy** - 科学计算支持

## 🚀 快速开始

### 1. 安装依赖

```bash
# 安装核心依赖
pip install PyQt6 numpy pandas gempy pyvista matplotlib

# 安装可选依赖（推荐）
pip install qtawesome pyvistaqt scipy scikit-learn
```

### 2. 启动系统

```bash
# 方法1：直接运行主程序
python gem_implicit_modeling_system.py

# 方法2：使用启动器
python start_gem_system.py
```

### 3. 系统界面

启动后您将看到：
- **左侧**：模型树浏览器，显示项目结构
- **中央**：3D视口，实时显示地质模型
- **右侧**：属性面板，编辑对象属性
- **底部**：消息中心，显示系统状态

## 📚 使用指南

### 🗂️ 数据导入

1. **菜单路径**：文件 → 导入数据 → 选择数据类型
2. **支持格式**：CSV、Excel文件
3. **数据类型**：
   - 钻孔数据 (hole_id, x, y, z, soil_layer, soil_type)
   - 地层点 (x, y, z, surface)
   - 方向数据 (x, y, z, surface, azimuth, dip)
   - 断层数据 (x, y, z, fault_name)

### 🏗️ 地质建模

1. **创建模型**：模型 → 创建地质模型
2. **设置参数**：定义模型范围和分辨率
3. **添加数据**：通过数据导入或手动添加地层点
4. **计算模型**：模型 → 计算模型
5. **查看结果**：在3D视口中查看生成的地质结构

### 🎨 3D可视化

- **视图控制**：使用工具栏按钮切换等轴、俯视、前视、侧视
- **渲染模式**：线框模式、表面模式切换
- **图层管理**：控制钻孔、地层面、体积等显示
- **交互操作**：鼠标旋转、缩放、平移视图

### 📊 数据管理

- **模型树**：双击节点查看/编辑属性
- **属性面板**：实时编辑对象参数
- **数据验证**：自动检查数据完整性和一致性
- **批量处理**：支持大规模数据集的高效处理

## 🎛️ 高级功能

### ⚡ 断层建模
```python
# 通过界面或API添加断层
fault_relations = {
    'fault_1': ['surface_1', 'surface_2'],
    'fault_2': ['surface_2', 'surface_3']
}
```

### 🌍 地球物理计算
- 重力场正演模拟
- 磁场异常计算
- 多物理场耦合分析

### 📈 不确定性分析
- 参数敏感性分析
- 蒙特卡洛模拟
- 贝叶斯参数估计

## 🗁 项目结构

```
example3/
├── gem_implicit_modeling_system.py    # 主启动程序
├── start_gem_system.py               # 简易启动器
├── gempy_main_window.py              # 主窗口类
├── professional_gempy_cae.py         # 界面组件
├── gempy_data_manager.py             # 数据管理器
├── enhanced_3d_viewer.py             # 3D可视化增强
├── simple_demo.py                    # 简化演示版本
├── modern_gui.py                     # 现代化界面
├── rbf_interpolation.py              # RBF插值算法
├── data/                             # 示例数据
│   └── borehole_data_100.csv
└── requirements.txt                  # 依赖列表
```

## 🎯 主要模块说明

### 1. 核心模块
- **GemPyMainWindow**: 主窗口和应用程序逻辑
- **ModelTreeWidget**: 模型树浏览器
- **PropertyPanel**: 属性编辑面板
- **MessageCenter**: 消息和日志管理

### 2. 可视化模块
- **GemPyViewport3D**: 3D视口和PyVista集成
- **Enhanced3DGeologyViewer**: 增强地质可视化
- **AbaqusStyleSheet**: 专业界面样式

### 3. 数据处理模块
- **GemPyDataManager**: 数据导入导出管理
- **DataImportDialog**: 数据导入向导
- **GeologicalWorkflowHelper**: 建模工作流助手

## 🔧 定制开发

### 添加新的数据类型
```python
# 在gempy_data_manager.py中扩展
new_data_types = {
    'geochemistry': ['x', 'y', 'z', 'element', 'concentration'],
    'geophysics': ['x', 'y', 'gravity', 'magnetic']
}
```

### 自定义可视化
```python
# 在enhanced_3d_viewer.py中添加新的渲染方法
def render_custom_data(self, data):
    # 自定义渲染逻辑
    pass
```

### 扩展分析功能
```python
# 创建新的分析模块
class CustomAnalysis:
    def __init__(self, model):
        self.model = model
    
    def run_analysis(self):
        # 自定义分析算法
        pass
```

## 🐛 故障排除

### 常见问题

1. **启动失败**
   - 检查Python版本 (需要3.8+)
   - 验证所有依赖包已安装
   - 确认GemPy安装正确

2. **3D渲染问题**
   - 更新显卡驱动
   - 安装VTK和PyVista最新版本
   - 检查OpenGL支持

3. **数据导入错误**
   - 验证文件格式和编码
   - 检查列名和数据类型
   - 确认数据完整性

### 性能优化

- **大数据集**: 使用分块加载和LOD渲染
- **复杂模型**: 调整网格分辨率
- **实时交互**: 启用GPU加速

## 📧 技术支持

- **问题反馈**: GitHub Issues
- **技术讨论**: 开发者社区
- **文档更新**: 持续改进中

## 📜 许可证

本项目基于MIT许可证开源，详见LICENSE文件。

## 🙏 致谢

- **GemPy团队** - 提供优秀的地质建模算法
- **PyVista社区** - 强大的3D可视化支持
- **PyQt6** - 现代化的GUI框架
- **科学Python生态** - NumPy、Pandas、SciPy等

---

**🌋 让地质建模变得更加智能和高效！**

*GEM隐式建模系统 - 专业、强大、易用的地质建模解决方案*

## 📤 导出与降级策略（VTKJS → HTML → PNG）

为了确保不同环境下都能导出3D场景，系统实现了分级导出策略：

- 首选：VTKJS（交互式、体积小，适合网页/分享）
- 降级1：HTML（内嵌交互，可直接浏览器打开）
- 降级2：PNG（静态截图，最低保真，但几乎100%成功）

### 在界面中导出

- 菜单：文件 → 导出数据 → VTK格式...
- 行为：尝试 VTKJS，失败则自动降级到 HTML，再失败降级到 PNG 截图
- 状态：结果会显示在状态栏与“消息中心”

### 在代码中导出

- 简单视图（Enhanced3DGeologyViewer / AdvancedGeology3DViewer）
    - 调用：viewer.export_scene('输出文件前缀', format_type='vtk')
    - 自动按 VTKJS → HTML → PNG 的顺序降级

- 主窗口（GemPyMainWindow）
    - 菜单操作同上，内部调用与视口 plotter 对齐

### 快速自检（Smoke Test）

提供了一个无需GUI的导出冒烟测试脚本，便于验证环境支持：

1) 运行脚本（默认输出到 example3/exports/）
     - Windows PowerShell:
         - python example3/export_smoke_test.py
     - 可选自定义输出前缀：
         - python example3/export_smoke_test.py --out example3/exports/my_export

2) 期望输出控制台日志之一：
     - SMOKE_OK: VTKJS → 成功导出 .vtkjs
     - SMOKE_OK: HTML → VTKJS 失败，转为 .html 成功
     - SMOKE_OK: PNG → 前两者失败，输出 .png 截图

3) 常见问题
     - 若 VTKJS/HTML 失败，请检查 PyVista/VTK 版本或显卡/OpenGL 支持
     - PNG 通常在大多数环境可用，是最后兜底