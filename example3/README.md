# Example3 - RBF钻孔数据插值与GemPy三维重建

基于RBF插值算法处理非均匀钻孔数据，结合GemPy进行三维地质重建，并使用PyVista进行可视化渲染的综合示例项目。

## 功能特性

### 🎯 RBF插值系统
- **智能区域识别**: 自动识别基坑密集区域和外围稀疏区域
- **多核函数支持**: multiquadric、gaussian、thin_plate_spline等
- **自适应参数优化**: 自动优化epsilon等关键参数
- **交互式Web界面**: 基于Streamlit的现代化界面
- **实时可视化**: 支持多种插值方法和结果对比

### 🗺️ 三维地质建模
- 使用GemPy创建三维地质模型
- 基于PyVista的多种渲染模式（体积渲染、等值面、切片等）
- 交互式三维可视化
- 支持多种数据格式导入导出

## 安装依赖

```bash
pip install -r requirements.txt
```

## 使用方法

### 🚀 快速启动

**桌面版应用程序** (推荐):
```bash
python launch_desktop.py
```

### 📊 RBF插值系统界面功能

**参数配置面板**：
- **核函数类型**: 7种RBF核函数可选
- **Epsilon参数**: 自动优化或手动设置
- **平滑控制**: 控制插值平滑程度
- **基坑边界**: 自定义密集区域边界
- **多项式趋势**: 可选趋势面拟合

**数据输入选项**：
- **示例数据**: 生成基坑密集+外围稀疏的测试数据
- **CSV上传**: 支持标准格式钻孔数据文件
- **手动输入**: 表格编辑器直接输入数据

**可视化功能**：
- **插值结果**: 交互式等高线图和3D可视化
- **数据分布**: 区域分布和统计分析
- **性能评估**: 交叉验证和误差分析

### 🔬 命令行使用

1. **RBF插值测试**：
```bash
python rbf_interpolation.py
```

2. **创建地质模型**：
```bash
python gempy_reconstruction.py
```

3. **渲染可视化**：
```bash
python pyvista_render.py
```

## 文件说明

### 核心模块
- `rbf_interpolation.py`: RBF插值核心算法模块
- `rbf_gui.py`: Streamlit交互式界面
- `launch_gui.py`: GUI启动脚本

### 地质建模
- `gempy_reconstruction.py`: GemPy三维地质重建脚本
- `pyvista_render.py`: PyVista渲染和可视化脚本

### 配置文件
- `requirements.txt`: 完整依赖包列表
- `README.md`: 项目说明文档

## RBF插值算法特性

### 🎨 支持的核函数
- **multiquadric**: 多二次函数 (推荐用于地质数据)
- **inverse_multiquadric**: 反多二次函数
- **gaussian**: 高斯函数 (更平滑)
- **linear**: 线性函数
- **cubic**: 三次函数
- **quintic**: 五次函数
- **thin_plate_spline**: 薄板样条 (TPS)

### 🔧 插值策略
- **adaptive**: 自适应插值 (根据区域选择最佳插值器)
- **weighted**: 加权融合 (距离权重融合多个插值器)
- **global**: 全局插值 (单一插值器处理所有数据)

### 📈 性能评估
- **R²**: 决定系数 (拟合优度)
- **RMSE**: 均方根误差
- **MAE**: 平均绝对误差
- **交叉验证**: K折交叉验证评估

## 应用场景

- **基坑工程**: 密集勘探区域的地质参数插值
- **地质勘探**: 非均匀分布钻孔数据处理
- **环境监测**: 稀疏采样点的空间插值
- **岩土工程**: 地层标高和土质参数估算