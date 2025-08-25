# SimPEG 专业地球物理界面

这是一个基于 SimPEG 的专业地球物理正反演界面，集成了多种地球物理方法的建模、正演和反演功能。

## 功能特点

### 支持的地球物理方法
- **重力方法** - 完整的重力数据处理和反演
- **磁法** - 磁测数据建模和反演
- **直流电法** - 电阻率成像
- **电磁法** - 频率域和时间域电磁建模
- **大地电磁法** - MT数据处理

### 核心功能
- **网格构建** - 支持张量网格、树形网格、曲线网格
- **观测系统设计** - 智能测点布设和优化
- **正演建模** - 高效的正演计算引擎
- **反演计算** - 多种反演策略和正则化方法
- **3D可视化** - 基于 PyVista 的专业可视化
- **数据管理** - 完整的数据输入输出支持

### 高级特性
- **联合反演** - 多物理场联合约束
- **稳健反演** - 抗噪声能力强
- **自适应网格** - 智能网格加密
- **GemPy集成** - 地质建模无缝集成
- **并行计算** - 多核加速支持

## 安装说明

### 1. 环境要求
- Python 3.8+
- Windows/Linux/macOS

### 2. 安装依赖
```bash
# 进入项目目录
cd example8

# 安装依赖包
pip install -r requirements.txt

# 如果遇到安装问题，可以使用conda
conda install -c conda-forge simpeg discretize pyvista
```

### 3. 启动界面
```bash
# 启动图形界面
python run_simpeg_gui.py

# 或者直接运行主程序
python main.py
```

## 使用指南

### 快速开始

1. **创建新项目**
   - 点击"新建项目"
   - 选择地球物理方法
   - 设置项目参数

2. **设计网格**
   - 定义模型区域
   - 选择网格类型
   - 调整网格密度

3. **设计观测系统**
   - 布设测点/测线
   - 设置观测参数
   - 优化观测几何

4. **正演建模**
   - 创建物性模型
   - 运行正演计算
   - 分析理论响应

5. **反演计算**
   - 导入观测数据
   - 设置反演参数
   - 执行反演过程

6. **结果分析**
   - 查看反演结果
   - 分析数据拟合
   - 生成报告

### 工作流程示例

```python
# 运行完整工作流程示例
python complete_workflow_example.py
```

这个示例展示了从网格创建到反演结果的完整流程。

## 项目结构

```
example8/
├── main.py                          # 主程序入口
├── run_simpeg_gui.py               # 启动脚本
├── complete_workflow_example.py     # 完整示例
├── requirements.txt                 # 依赖包列表
├── README.md                       # 项目说明
├── gui/                            # 界面模块
│   ├── main_window.py              # 主窗口
│   ├── widgets/                    # 自定义控件
│   └── dialogs/                    # 对话框
├── modules/                        # 核心模块
│   ├── mesh_builder.py             # 网格构建器
│   ├── survey_designer.py          # 观测系统设计
│   ├── forward_solver.py           # 正演求解器
│   ├── inversion_engine.py         # 反演引擎
│   ├── data_manager.py             # 数据管理
│   └── visualization.py            # 可视化
└── methods/                        # 地球物理方法
    ├── gravity/                    # 重力方法
    │   └── gravity_module.py       # 重力模块
    ├── magnetics/                  # 磁法
    ├── electromagnetics/           # 电磁法
    ├── resistivity/                # 电阻率法
    └── natural_source/             # 天然源法
```

## 技术规范

详细的技术规范请参考 [SIMPEG_GUI_TECHNICAL_SPEC.md](SIMPEG_GUI_TECHNICAL_SPEC.md)

## 示例数据

项目包含多个示例数据集和教程：

1. **重力反演示例** - 展示完整的重力数据处理流程
2. **磁法建模示例** - 航磁数据建模和反演
3. **联合反演示例** - 重力-磁法联合反演
4. **大规模数据处理** - 处理大型数据集的技巧

## 扩展开发

### 添加新的地球物理方法

1. 在 `methods/` 目录下创建新方法文件夹
2. 实现方法类，继承基础接口
3. 在主界面中注册新方法
4. 添加相应的参数面板

### 自定义正则化

```python
class CustomRegularization(BaseRegularization):
    def __init__(self, mesh, **kwargs):
        super().__init__(mesh, **kwargs)
        
    def __call__(self, model):
        # 实现自定义正则化
        return regularization_value
```

### 插件开发

参考 `MethodPlugin` 基类开发自定义插件。

## 性能优化

### 计算性能
- 使用多线程/多进程并行计算
- GPU加速支持（CUDA）
- 内存映射处理大型数据集
- 稀疏矩阵优化

### 界面性能
- 异步计算任务
- 渐进式数据加载
- LOD（细节层次）显示
- 视锥剔除优化

## 故障排除

### 常见问题

1. **导入 SimPEG 失败**
   ```bash
   pip install --upgrade simpeg
   ```

2. **PyQt6 安装问题**
   ```bash
   conda install pyqt
   ```

3. **3D显示问题**
   - 更新显卡驱动
   - 设置环境变量 `QT_QUICK_BACKEND=software`

4. **内存不足**
   - 减少网格密度
   - 使用树形网格
   - 分块处理大型数据

### 性能调优

- **网格优化**: 使用适当的网格密度
- **求解器选择**: 根据问题选择合适的求解器
- **正则化参数**: 合理设置正则化权重
- **迭代控制**: 设置合适的收敛准则

## 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork 项目
2. 创建功能分支
3. 提交代码
4. 创建 Pull Request

## 开源协议

本项目采用 MIT 开源协议。

## 联系方式

- 项目主页: [DeepCAD SimPEG Interface]
- 技术支持: [技术支持邮箱]
- 用户社区: [用户论坛]

## 致谢

感谢以下开源项目的支持：
- [SimPEG](https://simpeg.xyz/) - 地球物理建模和反演框架
- [PyVista](https://pyvista.org/) - 3D可视化库
- [Discretize](https://discretize.simpeg.xyz/) - 网格生成库
- [GemPy](https://www.gempy.org/) - 3D地质建模库

---

**SimPEG 专业地球物理界面 - 让地球物理建模更简单！**
