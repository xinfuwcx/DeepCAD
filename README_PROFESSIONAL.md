# DeepCAD Professional CAE System v2.0

专业级工程分析平台 - Abaqus风格界面设计

## 系统概述

DeepCAD Professional CAE System 是一个集成了多个工程分析模块的专业级CAE平台，采用Abaqus风格的界面设计，为工程师提供直观、高效的分析体验。

### 核心功能模块

#### 🏗️ 深基坑工程分析 (Example2)
- **前处理模块**: 几何建模、材料定义、网格生成
- **分析模块**: 静力分析、动力分析、稳定性分析、渗流分析
- **后处理模块**: 应力云图、位移分析、安全系数评估
- **材料管理**: 完整的土体和支护材料数据库
- **监控系统**: 实时分析进度监控和性能评估

#### 🌍 地质隐式建模 (Example3)
- **GemPy集成**: 基于贝叶斯方法的隐式地质建模
- **3D可视化**: PyVista驱动的专业级3D渲染
- **数据管理**: 钻孔数据、地层点、方向数据的统一管理
- **地球物理**: 重力和磁力建模计算
- **不确定性分析**: 蒙特卡洛方法的地质参数不确定性评估

#### 🎨 专业级界面设计
- **Abaqus风格**: 仿照Abaqus的专业界面布局和交互方式
- **模块化设计**: 模型树、属性面板、消息中心的经典三栏布局
- **标签页工作区**: 支持多项目同时工作的标签页系统
- **工具栏集成**: 完整的菜单系统和工具栏，支持快捷键操作

## 快速开始

### 系统要求

- **操作系统**: Windows 10/11, macOS 10.15+, Ubuntu 18.04+
- **Python版本**: Python 3.8 或更高版本
- **内存**: 建议 8GB 以上
- **显卡**: 支持 OpenGL 3.0+ (用于3D可视化)
- **磁盘空间**: 至少 2GB 可用空间

### 安装方法

#### 方法一：使用启动脚本 (推荐)

1. **Windows用户**:
   ```bash
   # 双击运行或在命令行执行
   start_deepcad.bat
   ```

2. **Linux/macOS用户**:
   ```bash
   # 添加执行权限
   chmod +x start_deepcad.sh
   # 运行启动脚本
   ./start_deepcad.sh
   ```

启动脚本会自动检查Python环境和依赖库，并给出安装建议。

#### 方法二：手动安装

1. **克隆项目**:
   ```bash
   git clone https://github.com/your-org/DeepCAD.git
   cd DeepCAD
   ```

2. **安装依赖**:
   ```bash
   # 安装核心依赖
   pip install -r requirements.txt
   
   # 或分步安装
   pip install PyQt6 numpy pandas matplotlib qtawesome pyvista pyvistaqt
   
   # 可选：地质建模支持
   pip install gempy
   ```

3. **启动程序**:
   ```bash
   python deepcad_professional_cae.py
   ```

### 首次使用

1. **启动程序**: 使用上述任一方法启动程序
2. **选择工作模式**: 在欢迎页面选择要创建的项目类型
3. **导入数据**: 使用菜单或工具栏导入几何模型、钻孔数据等
4. **开始分析**: 按照工作流程进行建模、分析、查看结果

## 功能详解

### 深基坑工程分析

#### 建模流程
1. **几何建模**: 
   - 支持DXF/DWG文件导入
   - 可视化几何编辑器
   - 支护结构参数化建模

2. **材料定义**:
   - 内置土体材料数据库
   - 支护材料库 (混凝土、钢材等)
   - 本构模型选择 (Mohr-Coulomb, Drucker-Prager等)

3. **网格生成**:
   - 自适应网格算法
   - 局部加密控制
   - 网格质量检查

4. **边界条件**:
   - 位移边界条件
   - 荷载边界条件
   - 渗流边界条件

#### 分析类型
- **静力分析**: 基坑开挖的静力响应
- **动力分析**: 地震荷载下的动力响应
- **稳定性分析**: 边坡稳定安全系数计算
- **渗流分析**: 渗流场和孔隙水压力分析

### 地质隐式建模

#### 数据准备
1. **钻孔数据**: 支持CSV/Excel格式的钻孔数据导入
2. **地层点**: 地质界面的空间点数据
3. **方向数据**: 地质构造的走向倾向数据

#### 建模过程
1. **数据预处理**: 自动检查和清理地质数据
2. **隐式建模**: 使用GemPy的贝叶斯框架进行建模
3. **模型验证**: 交叉验证和不确定性评估
4. **结果输出**: 生成3D地质模型和剖面图

#### 可视化功能
- **3D渲染**: 高质量的地质体渲染
- **剖面生成**: 任意方向的地质剖面
- **属性展示**: 地层属性的颜色映射
- **交互操作**: 旋转、缩放、测量等交互功能

## 界面说明

### 主界面布局

```
┌─────────────────────────────────────────────────────────────────┐
│ 菜单栏: 文件 编辑 模型 分析 结果 工具 视图 帮助                      │
├─────────────────────────────────────────────────────────────────┤
│ 工具栏: [新建] [打开] [保存] | [建模] [材料] [网格] | [分析] [结果] │
├──────────┬──────────────────────────────────────┬───────────────┤
│ 模型树   │ 工作区 (标签页)                      │ 属性面板      │
│          │ ┌─────────────────────────────────────┐│               │
│ 📁项目   │ │ 3D视口                             ││ 🔧属性编辑   │
│ 📁数据   │ │                                    ││               │
│ 📁材料   │ │        [3D模型显示]                ││ 📊参数面板   │
│ 📁网格   │ │                                    ││               │
│ 📁结果   │ │                                    ││               │
│          │ └─────────────────────────────────────┘│               │
│          │ [欢迎] [深基坑] [地质建模] [工作流]     │               │
├──────────┴──────────────────────────────────────┴───────────────┤
│ 消息中心: [消息] [警告] [错误]                                    │
├─────────────────────────────────────────────────────────────────┤
│ 状态栏: 就绪 | 内存:128MB | 坐标:(0,0,0) | CAE✓ 地质✓ 3D✓       │
└─────────────────────────────────────────────────────────────────┘
```

### 工作流程

#### 深基坑工程分析流程
1. **新建项目** → 选择"深基坑工程分析"
2. **导入几何** → 菜单:文件→导入数据→CAD几何模型
3. **定义材料** → 工具栏:材料 或 菜单:模型→材料定义
4. **生成网格** → 工具栏:网格 或 菜单:模型→网格生成
5. **设置边界条件** → 在3D视口中交互设置
6. **运行分析** → 工具栏:分析 或 菜单:分析→静力分析
7. **查看结果** → 工具栏:结果 或 菜单:结果→应力分布

#### 地质建模流程
1. **新建项目** → 选择"地质隐式建模"
2. **导入数据** → 菜单:文件→导入数据→钻孔数据
3. **数据检查** → 在模型树中查看数据质量
4. **建立模型** → 菜单:分析→地质分析→隐式建模
5. **模型验证** → 查看不确定性分析结果
6. **生成剖面** → 菜单:结果→地质剖面
7. **导出结果** → 菜单:文件→导出结果→3D模型

## 高级功能

### 材料管理系统

材料管理器提供完整的材料数据库管理：

```python
# 材料定义示例
{
    "name": "粘土",
    "type": "soil",
    "properties": {
        "density": 1800,      # kg/m³
        "cohesion": 25000,    # Pa
        "friction_angle": 20, # 度
        "elastic_modulus": 15e6, # Pa
        "poisson_ratio": 0.35
    }
}
```

### 分析监控

实时监控分析进程的执行状态：
- **进度跟踪**: 实时显示计算进度
- **资源监控**: CPU和内存使用情况
- **错误检测**: 自动检测和报告计算错误
- **性能优化**: 动态调整计算参数

### 数据查询工具

强大的数据查询和筛选功能：
- **SQL式查询**: 支持复杂的数据筛选条件
- **可视化筛选**: 通过3D视口交互选择数据
- **统计分析**: 数据的统计特征分析
- **导出功能**: 查询结果的多格式导出

## 开发者指南

### 项目结构

```
DeepCAD/
├── deepcad_professional_cae.py    # 主程序入口
├── start_deepcad.py               # 启动器
├── requirements.txt               # 依赖列表
├── example2/                      # 深基坑分析模块
│   ├── modules/                   # 核心分析模块
│   ├── gui/                       # 界面组件
│   └── data/                      # 数据文件
├── example3/                      # 地质建模模块
│   ├── professional_gempy_cae.py  # 样式和组件
│   ├── gempy_main_window.py       # 地质建模主窗口
│   └── *.py                       # 其他地质分析模块
└── scripts/                       # 工具脚本
```

### 扩展开发

#### 添加新的分析模块

1. **创建模块目录**:
   ```
   example_new/
   ├── __init__.py
   ├── main_window.py      # 主界面
   ├── core/               # 核心算法
   └── gui/                # 界面组件
   ```

2. **集成到主程序**:
   ```python
   # 在 deepcad_professional_cae.py 中添加
   try:
       from example_new.main_window import NewAnalysisWindow
       NEW_MODULE_AVAILABLE = True
   except ImportError:
       NEW_MODULE_AVAILABLE = False
   
   # 在菜单中添加入口
   def new_custom_project(self):
       if NEW_MODULE_AVAILABLE:
           self.new_window = NewAnalysisWindow()
           self.central_tabs.addTab(self.new_window, "新分析")
   ```

#### 自定义界面主题

继承和扩展 `AbaqusStyleSheet` 类来定制界面风格：

```python
class CustomStyleSheet(AbaqusStyleSheet):
    @staticmethod
    def get_custom_style():
        return AbaqusStyleSheet.get_main_style() + """
        /* 自定义样式 */
        QMainWindow {
            background-color: #your_color;
        }
        """
```

## 故障排除

### 常见问题

#### Q1: 启动时提示"找不到Python解释器"
**解决方案**:
- 确保已安装Python 3.8+
- 将Python添加到系统PATH环境变量
- Windows用户可以重新安装Python并勾选"Add to PATH"

#### Q2: 3D视口显示异常或无法显示
**解决方案**:
```bash
# 检查PyVista安装
python -c "import pyvista; print('PyVista version:', pyvista.__version__)"

# 检查显卡驱动
python -c "import pyvista as pv; pv.start_xvfb(); plotter = pv.Plotter(); print('OpenGL OK')"

# 更新显卡驱动或使用软件渲染
export PYVISTA_OFF_SCREEN=true
```

#### Q3: 地质建模功能不可用
**解决方案**:
```bash
# 安装GemPy
pip install gempy

# 如果安装失败，尝试使用conda
conda install -c conda-forge gempy
```

#### Q4: 材料管理器打开失败
**解决方案**:
- 检查材料数据文件是否存在
- 确保有读写权限
- 重新创建材料数据库：`python -c "from example2.gui.material_manager import MaterialManager; MaterialManager().reset_database()"`

### 性能优化

#### 大型模型处理
1. **内存优化**: 启用内存映射和分块加载
2. **GPU加速**: 使用CUDA加速计算 (如果可用)
3. **并行计算**: 启用多核并行处理
4. **级联渲染**: 分层渲染大型3D场景

#### 网格质量改进
```python
# 网格质量检查
mesh_quality = analyzer.check_mesh_quality()
if mesh_quality.min_angle < 10:  # 度
    print("警告：存在锐角三角形，建议重新生成网格")
    
# 自适应网格细化
refined_mesh = mesh_generator.adaptive_refinement(
    target_error=0.01,
    max_iterations=5
)
```

## 技术支持

### 联系方式
- **技术支持邮箱**: support@deepcad.com
- **用户论坛**: https://forum.deepcad.com
- **问题报告**: https://github.com/your-org/DeepCAD/issues
- **文档中心**: https://docs.deepcad.com

### 社区资源
- **示例项目库**: 包含各种类型的示例项目
- **视频教程**: 完整的功能演示和操作指南
- **技术博客**: 最新技术动态和应用案例
- **用户群组**: QQ群/微信群技术交流

## 许可证

本软件使用 [MIT License](LICENSE) 许可证。

## 更新日志

### v2.0.0 (2024-08-15)
- ✨ 全新的Abaqus风格专业界面
- 🚀 集成深基坑CAE分析和地质建模系统
- 🎨 完整的材料管理和分析监控功能
- 📊 专业级3D可视化和后处理
- 🔧 统一的启动器和依赖检查
- 📝 完整的用户文档和开发指南

### v1.x (历史版本)
- 基础功能模块
- 简单界面设计
- 独立的分析工具

---

**DeepCAD Professional CAE System** - 让工程分析更专业、更高效！

*Copyright © 2024 DeepCAD Team. All rights reserved.*