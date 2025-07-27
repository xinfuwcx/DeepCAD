# Kratos Core 编译指南

本指南说明如何在 Windows 上使用 Visual Studio 2022 编译 Kratos Multiphysics Core。

## 前提条件

确保您的系统已安装以下软件，并且路径正确：

- **Visual Studio 2022 Professional**: `D:\Program Files\Microsoft Visual Studio\2022\Professional`
- **Python (Miniconda3)**: `D:\ProgramData\miniconda3`
- **Boost 1.88.0**: `D:\Program Files\boost_1_88_0`
- **CMake**: 确保已安装并添加到系统 PATH

## 编译步骤

### 1. 准备工作

确保您已经拉取了最新的 Kratos 源代码（已完成）。

### 2. 运行编译脚本

有两种方式运行编译脚本：

#### 方法一：使用 PowerShell（推荐）

打开 PowerShell，导航到 scripts 目录，运行：

```powershell
cd H:\DeepCAD\scripts
.\build_kratos_core.ps1
```

#### 方法二：直接运行批处理文件

如果您已经在 Visual Studio 2022 的开发者命令提示符中，可以直接运行：

```cmd
cd H:\DeepCAD\scripts
configure_kratos_core.bat
```

### 3. 编译过程

脚本会自动执行以下操作：
- 清理之前的编译文件
- 配置 CMake
- 使用 Visual Studio 2022 编译 Kratos Core
- 安装到 `core/kratos_source/kratos/bin/Release` 目录

编译过程可能需要 10-30 分钟，取决于您的硬件配置。

### 4. 配置环境变量

编译成功后，需要设置环境变量。您可以：

#### 临时设置（仅当前会话）：

```cmd
set PYTHONPATH=%PYTHONPATH%;H:\DeepCAD\core\kratos_source\kratos\bin\Release
set PATH=%PATH%;H:\DeepCAD\core\kratos_source\kratos\bin\Release\libs
```

#### 永久设置（推荐）：

1. 打开"系统属性" → "高级" → "环境变量"
2. 在用户变量中：
   - 编辑 `PYTHONPATH`，添加 `H:\DeepCAD\core\kratos_source\kratos\bin\Release`
   - 编辑 `PATH`，添加 `H:\DeepCAD\core\kratos_source\kratos\bin\Release\libs`

### 5. 验证安装

运行测试脚本验证安装：

```cmd
cd H:\DeepCAD\scripts
python test_kratos_installation.py
```

### 6. 安装额外的应用模块

Kratos Core 编译完成后，您可以通过 pip 安装需要的应用模块：

```cmd
pip install KratosStructuralMechanicsApplication
pip install KratosFluidDynamicsApplication
pip install KratosLinearSolversApplication
pip install KratosMeshingApplication
```

> **注意**: 如果遇到网络问题，可以尝试使用国内镜像源，例如：
> `pip install -i https://pypi.tuna.tsinghua.edu.cn/simple KratosStructuralMechanicsApplication`

## 常见问题

### Q: 编译失败，提示找不到 cl.exe
A: 确保使用 Visual Studio 2022 的开发者命令提示符，或使用提供的 PowerShell 脚本。

### Q: CMake 配置失败
A: 检查 Boost 路径是否正确，确保 boost 头文件在 `D:\Program Files\boost_1_88_0\boost` 目录下。

### Q: Python 导入 KratosMultiphysics 失败
A: 检查 PYTHONPATH 环境变量是否正确设置。

### Q: 编译速度很慢
A: 脚本已启用并行编译（/MP8），您可以在批处理文件中调整这个数值。

## 技术支持

如遇到问题，请检查：
1. 所有路径是否正确
2. Visual Studio 2022 是否安装了 C++ 开发工具
3. Python 版本是否为 3.8 或更高版本 