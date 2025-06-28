# 深基坑CAE系统安装指南

本文档提供详细的安装和配置指南，帮助您正确设置深基坑CAE系统的开发和运行环境。

## 系统要求

### 硬件要求
- **CPU**: 推荐 Intel Core i7/i9 或 AMD Ryzen 7/9 系列
- **内存**: 最低16GB，推荐32GB+
- **存储**: 最低20GB可用空间，推荐SSD
- **GPU**: 支持CUDA的NVIDIA显卡 (用于物理AI模型训练和加速)

### 软件要求
- **操作系统**: 
  - Windows 10/11 (64位)
  - Ubuntu 20.04/22.04 LTS
  - macOS 12+ (部分功能可能受限)
- **编译工具**:
  - Windows: Visual Studio 2019/2022 (含C++开发工具)
  - Linux: GCC 9+ 和 build-essential
  - macOS: Xcode命令行工具和Homebrew
- **其他工具**:
  - CMake 3.16+
  - Git 2.0+
  - Python 3.9+
  - Node.js 18+

## 1. 基础环境配置

### 1.1 Python环境

推荐使用Miniconda/Anaconda管理Python环境：

**Windows:**
```batch
:: 下载并安装Miniconda
curl -O https://repo.anaconda.com/miniconda/Miniconda3-latest-Windows-x86_64.exe
start /wait "" Miniconda3-latest-Windows-x86_64.exe /InstallationType=JustMe /RegisterPython=0 /S /D=%UserProfile%\Miniconda3

:: 创建项目环境
conda create -n deep_excavation python=3.9 -y
conda activate deep_excavation
```

**Linux/macOS:**
```bash
# 下载并安装Miniconda
wget https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh -O miniconda.sh
bash miniconda.sh -b -p $HOME/miniconda
source $HOME/miniconda/bin/activate

# 创建项目环境
conda create -n deep_excavation python=3.9 -y
conda activate deep_excavation
```

### 1.2 安装基础依赖

```bash
# 克隆项目仓库
git clone <repository-url>
cd "Deep Excavation"

# 安装Python依赖
pip install -r requirements.txt

# 安装PyTorch (GPU版本)
pip install torch==2.0.0+cu118 torchvision==0.15.0+cu118 torchaudio==2.0.0+cu118 --index-url https://download.pytorch.org/whl/cu118

# 安装VTK和PyVista
pip install vtk pyvista trame
```

### 1.3 安装前端依赖

```bash
# 进入前端目录
cd frontend

# 安装Node.js依赖
npm install

# 返回项目根目录
cd ..
```

## 2. OpenCascade Core (OCC) 安装

### 2.1 使用预编译版本 (推荐)

**Windows:**
```batch
pip install -U pythonocc-core
```

**Linux:**
```bash
sudo apt-get install libocct-visualization-dev
pip install -U pythonocc-core
```

**macOS:**
```bash
brew install opencascade
pip install -U pythonocc-core
```

### 2.2 从源代码编译 (可选)

如果需要特定版本或自定义功能，可以从源码编译：

```bash
# 克隆仓库
git clone https://github.com/tpaviot/pythonocc-core.git
cd pythonocc-core

# 编译安装
mkdir build && cd build
cmake ..
make -j4
make install
```

## 3. Kratos多物理场平台安装

### 3.1 克隆Kratos仓库

```bash
git clone https://github.com/KratosMultiphysics/Kratos.git
cd Kratos
```

### 3.2 配置编译选项

创建`configure.sh`(Linux/macOS)或`configure.bat`(Windows)文件:

**Windows (configure.bat):**
```batch
@echo off
set KRATOS_SOURCE=%CD%
set KRATOS_BUILD=%CD%\build
set KRATOS_APP_DIR="%KRATOS_SOURCE%\applications"

if not exist "%KRATOS_BUILD%" mkdir "%KRATOS_BUILD%"
cd "%KRATOS_BUILD%"

cmake -G "Visual Studio 17 2022" -A x64 ^
    -DCMAKE_BUILD_TYPE="Release" ^
    -DCMAKE_CXX_FLAGS="/EHsc /MP" ^
    -DCMAKE_C_FLAGS="/EHsc /MP" ^
    -DUSE_MPI=ON ^
    -DUSE_EIGEN_MKL=OFF ^
    -DLAPACK_LIBRARIES="" ^
    -DUSE_COTIRE=ON ^
    -DINCLUDE_MMG=OFF ^
    -DINCLUDE_FEAST=OFF ^
    ..

cmake --build "%KRATOS_BUILD%" --target install --config Release -j12
```

**Linux/macOS (configure.sh):**
```bash
#!/bin/bash
KRATOS_SOURCE=$PWD
KRATOS_BUILD=$PWD/build
KRATOS_APP_DIR=$PWD/applications

mkdir -p $KRATOS_BUILD
cd $KRATOS_BUILD

cmake \
    -DCMAKE_BUILD_TYPE="Release" \
    -DCMAKE_CXX_FLAGS="-O3 -std=c++11 -fopenmp" \
    -DCMAKE_C_FLAGS="-O3 -fopenmp" \
    -DUSE_MPI=ON \
    -DUSE_EIGEN_MKL=OFF \
    -DLAPACK_LIBRARIES="" \
    -DUSE_COTIRE=ON \
    -DINCLUDE_MMG=OFF \
    -DINCLUDE_FEAST=OFF \
    ..

cmake --build "$KRATOS_BUILD" --target install -j$(nproc)
```

### 3.3 配置Kratos-IGA应用

编辑configure文件，添加以下应用：

```
-DUSE_IGA_APPLICATION=ON \
-DUSE_GEOMECHANICS_APPLICATION=ON \
-DUSE_STRUCTURAL_MECHANICS_APPLICATION=ON \
-DUSE_OPTIMIZATION_APPLICATION=ON \
```

### 3.4 执行编译

**Windows:**
```batch
configure.bat
```

**Linux/macOS:**
```bash
chmod +x configure.sh
./configure.sh
```

### 3.5 设置环境变量

**Windows:**
```batch
set KRATOS_PATH=C:\path\to\Kratos
set PYTHONPATH=%PYTHONPATH%;%KRATOS_PATH%
```

**Linux/macOS:**
```bash
export KRATOS_PATH=/path/to/Kratos
export PYTHONPATH=$PYTHONPATH:$KRATOS_PATH
```

将上述命令添加到系统环境变量或启动脚本中。

## 4. Trame可视化服务配置

### 4.1 安装Trame

```bash
pip install trame trame-client trame-server trame-vtk trame-vuetify
```

### 4.2 配置Trame服务

创建`trame_config.json`文件:

```json
{
    "server": {
        "host": "0.0.0.0",
        "port": 8080,
        "endpoint": "/trame"
    },
    "visualization": {
        "renderer_type": "vtk",
        "theme": "dark",
        "default_colormap": "rainbow"
    }
}
```

## 5. 项目配置

### 5.1 初始化项目配置

```bash
# 从项目根目录执行
python tools/setup/init_project.py
```

### 5.2 配置Kratos路径

编辑`kratos_config.json`:

```json
{
    "kratos_path": "/path/to/your/Kratos",
    "applications": {
        "IgaApplication": true,
        "GeomechanicsApplication": true,
        "StructuralMechanicsApplication": true,
        "OptimizationApplication": true
    }
}
```

## 6. 验证安装

运行系统检查脚本确认所有组件正常工作:

```bash
python tools/setup/check_system.py
```

成功安装后，应该会看到类似以下的输出:

```
==== 深基坑CAE系统安装验证 ====
√ Python环境: OK
√ OpenCascade Core: OK
√ Kratos Multiphysics: OK
√ Kratos IgaApplication: OK
√ Kratos GeomechanicsApplication: OK
√ PyTorch: OK
√ Trame: OK
√ 项目配置: OK
系统安装验证成功!
```

## 7. 启动系统

### 7.1 开发模式

同时启动前端和后端服务:

**Windows:**
```batch
scripts\start_dev.bat
```

**Linux/macOS:**
```bash
./scripts/start_dev.sh
```

### 7.2 分别启动服务

**后端服务:**
```bash
python src/server/app.py
```

**前端开发服务器:**
```bash
cd frontend
npm run dev
```

**Trame可视化服务:**
```bash
python src/core/visualization/trame_server.py
```

### 7.3 访问系统

成功启动后，可以通过以下URL访问系统:

- 前端界面: http://localhost:3000
- API文档: http://localhost:8000/docs
- Trame可视化: http://localhost:8080

## 8. 常见问题解决

### 8.1 Kratos编译问题

如果Kratos编译失败，可尝试:

1. 确保安装了所有必需的开发库
2. 对于Windows，确保Visual Studio包含C++开发工具
3. 尝试禁用部分可选组件，简化编译过程

### 8.2 OpenCascade问题

如果PyOCCT安装失败:

1. 检查是否安装了所有系统依赖
2. 尝试使用conda安装: `conda install -c conda-forge pythonocc-core`

### 8.3 物理AI模块问题

如果PyTorch相关功能异常:

1. 确认CUDA版本与PyTorch版本兼容
2. 运行`torch.cuda.is_available()`检查GPU支持

## 9. 其他资源

- [Kratos官方文档](https://kratosmultiphysics.github.io/Documentation/)
- [OpenCascade开发者文档](https://dev.opencascade.org/)
- [PyTorch官方教程](https://pytorch.org/tutorials/)
- [Trame文档](https://kitware.github.io/trame/) 