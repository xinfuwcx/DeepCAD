# FEniCS 安装指南

## 问题诊断

当前环境：
- Python 3.13.4 
- 操作系统：Windows 10/11

## 问题说明

FEniCS (特别是DOLFIN核心组件) 对Python版本有严格要求：
- **FEniCS Legacy**: 最高支持到Python 3.9
- **FEniCSx (新版本)**: 支持Python 3.8-3.11

Python 3.13 目前没有预编译的FEniCS包。

## 解决方案

### 方案1：使用Conda环境（推荐）

```bash
# 安装 Miniconda 或 Anaconda
# 创建Python 3.9环境
conda create -n fenics-env python=3.9
conda activate fenics-env

# 安装FEniCS
conda install -c conda-forge fenics

# 安装其他依赖
pip install pyvista pyvistaqt matplotlib numpy scipy
```

### 方案2：使用Docker（最稳定）

```bash
# 拉取FEniCS Docker镜像
docker pull dolfinx/dolfinx:stable

# 运行容器
docker run -ti -v $(pwd):/home/fenics/shared dolfinx/dolfinx:stable
```

### 方案3：修改代码使用简化模拟（快速方案）

当前example6已经做了兼容处理，FEniCS不可用时会：
- 使用简化的数值模型
- 仅运行经验公式计算
- 3D可视化依然可用

## 当前状态

✅ PyVista: 可用 (0.45.3)
✅ PyVistaQt: 可用
✅ 经验公式求解器: 可用
❌ FEniCS: 不兼容Python 3.13

## 建议

1. **立即可用**: 运行example6，使用经验公式+3D可视化
2. **完整功能**: 创建Python 3.9的conda环境安装FEniCS
3. **生产环境**: 使用Docker部署

## 启动example6

```bash
cd E:\DeepCAD\example6
python main.py
```

界面会显示FEniCS不可用警告，但核心功能（经验公式+3D视口）完全正常。