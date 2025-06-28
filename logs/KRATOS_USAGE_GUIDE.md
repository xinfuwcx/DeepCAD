# Kratos深基坑工程使用指南

## 当前安装状态

根据检测，你的Kratos安装包含以下模块：

### 可用模块 ✅
- **StructuralMechanicsApplication** - 结构力学分析
- **FluidDynamicsApplication** - 流体力学 
- **ContactStructuralMechanicsApplication** - 接触结构力学

### 建议添加的模块 ⚠️
为了完整的深基坑工程分析，建议添加：
- **GeomechanicsApplication** - 地质力学核心
- **IgaApplication** - 等几何分析
- **OptimizationApplication** - 结构优化
- **SolidMechanicsApplication** - 固体力学基础

## 快速开始

### 1. 运行基本示例
```bash
python examples/structural_analysis_basic.py
```

### 2. 如果有地质力学模块
```bash  
python examples/geomechanics_excavation.py
```

### 3. 检查配置
查看生成的 `kratos_config.json` 了解详细配置。

## 扩展安装

要添加缺失的关键模块，运行：
```bash
scripts\build_kratos_extended.bat
```

这将编译包含所有深基坑工程所需模块的扩展版本。

## 深基坑工程典型分析流程

1. **几何建模** - 使用CAD或参数化建模
2. **网格划分** - Gmsh集成，自适应网格
3. **材料定义** - 土体本构模型，结构材料
4. **边界条件** - 位移约束，载荷施加  
5. **求解计算** - 非线性迭代求解
6. **结果后处理** - 变形云图，应力分析
7. **设计优化** - 参数优化，形状优化

## 联系支持

如需添加更多模块或遇到问题，请参考：
- Kratos官方文档: https://kratosultiphysics.github.io/Kratos/
- 深基坑工程案例: examples/目录
