# Kratos编译指南 - 深基坑工程专用

本指南提供了针对深基坑工程的Kratos多物理场仿真平台完整编译方案，包含IGA（等几何分析）、优化模块、地质力学等关键组件。

## 🎯 编译目标

本编译配置专门针对深基坑工程优化，包含以下核心模块：

### 核心应用
- **StructuralMechanicsApplication** - 结构力学分析
- **SolidMechanicsApplication** - 固体力学基础
- **ContactStructuralMechanicsApplication** - 接触力学
- **LinearSolversApplication** - 线性求解器

### 地质力学模块 🗻
- **GeomechanicsApplication** - 地质力学核心
- **DEMApplication** - 离散元方法
- **PfemApplication** - 粒子有限元

### IGA等几何分析模块 📐
- **IgaApplication** - 等几何分析
- **NurbsApplication** - NURBS几何

### 优化模块 ⚡
- **OptimizationApplication** - 结构优化
- **ShapeOptimizationApplication** - 形状优化
- **TopologyOptimizationApplication** - 拓扑优化

### 多物理场耦合
- **FSIApplication** - 流固耦合
- **ConvectionDiffusionApplication** - 对流扩散
- **FluidDynamicsApplication** - 流体力学

## 🔧 系统要求

### Windows系统
- **操作系统**: Windows 10/11 (64位)
- **编译器**: Visual Studio 2019/2022 (含C++开发工具)
- **CMake**: 3.16或更高版本
- **Python**: 3.7-3.11 (推荐3.9)
- **Git**: 最新版本
- **内存**: 至少16GB RAM
- **存储**: 至少20GB可用空间

### Linux系统
- **操作系统**: Ubuntu 20.04+ / CentOS 8+ / Fedora 35+
- **编译器**: GCC 9+ 或 Clang 10+
- **CMake**: 3.16或更高版本
- **Python**: 3.7-3.11 (推荐3.9)
- **依赖库**: 
  ```bash
  # Ubuntu/Debian
  sudo apt-get update
  sudo apt-get install build-essential cmake git python3-dev python3-pip
  sudo apt-get install libboost-all-dev libeigen3-dev libopenmpi-dev
  
  # CentOS/RHEL
  sudo yum groupinstall "Development Tools"
  sudo yum install cmake git python3-devel boost-devel eigen3-devel openmpi-devel
  ```

## 🚀 快速开始

### 方法一：一键编译脚本

**Windows用户:**
```batch
# 在项目根目录打开PowerShell或命令提示符
scripts\build_kratos.bat
```

**Linux/macOS用户:**
```bash
# 在项目根目录
chmod +x scripts/build_kratos.sh
./scripts/build_kratos.sh
```

### 方法二：Python脚本编译

```bash
# 直接运行Python编译脚本
python tools/setup/build_kratos_quick.py

# 或使用完整版本
python tools/setup/build_kratos.py
```

## 📋 详细编译步骤

### 1. 环境准备

#### Windows环境设置
1. 安装Visual Studio 2019/2022，确保包含C++开发工具
2. 打开"Developer Command Prompt for VS 2022"或运行vcvars64.bat
3. 验证环境：
   ```batch
   cl
   cmake --version  
   python --version
   git --version
   ```

#### Linux环境设置
```bash
# 安装必要工具
sudo apt-get install build-essential cmake git python3-dev

# 验证环境
gcc --version
cmake --version
python3 --version
git --version
```

### 2. 获取源码

```bash
# 克隆Kratos源码（会自动执行）
git clone https://github.com/KratosMultiphysics/Kratos.git
cd Kratos
```

### 3. 配置编译

创建构建目录并配置CMake：

```bash
mkdir kratos_build
cd kratos_build

# Windows (使用Visual Studio生成器)
cmake -G "Visual Studio 17 2022" -A x64 ^
      -DCMAKE_BUILD_TYPE=Release ^
      -DCMAKE_INSTALL_PREFIX="../kratos_install" ^
      -DKRATOS_BUILD_STRUCTURAL_MECHANICS_APPLICATION=ON ^
      -DKRATOS_BUILD_GEOMECHANICS_APPLICATION=ON ^
      -DKRATOS_BUILD_IGA_APPLICATION=ON ^
      -DKRATOS_BUILD_OPTIMIZATION_APPLICATION=ON ^
      -DKRATOS_BUILD_MPI=ON ^
      ../Kratos

# Linux (使用Unix Makefiles)  
cmake -DCMAKE_BUILD_TYPE=Release \
      -DCMAKE_INSTALL_PREFIX="../kratos_install" \
      -DKRATOS_BUILD_STRUCTURAL_MECHANICS_APPLICATION=ON \
      -DKRATOS_BUILD_GEOMECHANICS_APPLICATION=ON \
      -DKRATOS_BUILD_IGA_APPLICATION=ON \
      -DKRATOS_BUILD_OPTIMIZATION_APPLICATION=ON \
      -DKRATOS_BUILD_MPI=ON \
      ../Kratos
```

### 4. 编译安装

```bash
# Windows
cmake --build . --config Release --parallel 8
cmake --build . --config Release --target install

# Linux  
make -j8
make install
```

## 🔬 完整配置选项

### 核心模块配置
```cmake
# 结构力学基础
-DKRATOS_BUILD_STRUCTURAL_MECHANICS_APPLICATION=ON
-DKRATOS_BUILD_SOLID_MECHANICS_APPLICATION=ON
-DKRATOS_BUILD_CONTACT_STRUCTURAL_MECHANICS_APPLICATION=ON

# 地质力学
-DKRATOS_BUILD_GEOMECHANICS_APPLICATION=ON
-DKRATOS_BUILD_DEM_APPLICATION=ON
-DKRATOS_BUILD_PFEM_APPLICATION=ON

# IGA等几何分析
-DKRATOS_BUILD_IGA_APPLICATION=ON
-DKRATOS_BUILD_NURBS_APPLICATION=ON

# 优化模块
-DKRATOS_BUILD_OPTIMIZATION_APPLICATION=ON
-DKRATOS_BUILD_SHAPE_OPTIMIZATION_APPLICATION=ON
-DKRATOS_BUILD_TOPOLOGY_OPTIMIZATION_APPLICATION=ON

# 多物理场
-DKRATOS_BUILD_FSI_APPLICATION=ON
-DKRATOS_BUILD_FLUID_DYNAMICS_APPLICATION=ON
-DKRATOS_BUILD_CONVECTION_DIFFUSION_APPLICATION=ON

# 求解器
-DKRATOS_BUILD_LINEAR_SOLVERS_APPLICATION=ON
-DKRATOS_BUILD_EIGEN_SOLVERS_APPLICATION=ON
-DKRATOS_BUILD_EXTERNAL_SOLVERS_APPLICATION=ON

# 并行支持
-DKRATOS_BUILD_MPI=ON
-DKRATOS_BUILD_METIS_APPLICATION=ON
-DKRATOS_BUILD_TRILINOS_APPLICATION=ON
```

## 🌍 环境变量设置

编译完成后，运行生成的环境脚本：

**Windows:**
```batch
setup_kratos_env.bat
```

**Linux/macOS:**
```bash
source setup_kratos_env.sh
```

或手动设置：
```bash
# Linux/macOS
export KRATOS_PATH="/path/to/kratos_install"
export PYTHONPATH="$PYTHONPATH:$KRATOS_PATH/lib/python3.9/site-packages"  
export LD_LIBRARY_PATH="$LD_LIBRARY_PATH:$KRATOS_PATH/lib"

# Windows
set KRATOS_PATH=C:\path\to\kratos_install
set PYTHONPATH=%PYTHONPATH%;%KRATOS_PATH%\lib\python39\site-packages
set PATH=%PATH%;%KRATOS_PATH%\bin
```

## ✅ 验证安装

### 基本测试
```python
import KratosMultiphysics
print("Kratos核心模块导入成功!")

# 测试关键应用
import KratosMultiphysics.StructuralMechanicsApplication
import KratosMultiphysics.GeomechanicsApplication  
import KratosMultiphysics.IgaApplication
import KratosMultiphysics.OptimizationApplication

print("所有关键模块导入成功!")
```

### 运行示例
```bash
# 基本功能示例
python examples/kratos_basic_example.py

# 地质力学示例  
python examples/kratos_geomech_example.py
```

## 🐛 常见问题

### 编译问题

**问题1**: CMake找不到Python
```bash
# 解决方案：明确指定Python路径
-DPYTHON_EXECUTABLE=/usr/bin/python3
-DPYTHON_INCLUDE_DIR=/usr/include/python3.9
-DPYTHON_LIBRARY=/usr/lib/python3.9/config-3.9-x86_64-linux-gnu/libpython3.9.so
```

**问题2**: Visual Studio编译器错误
```batch
REM 确保运行了Visual Studio环境脚本
"C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat"
```

**问题3**: 内存不足
```bash
# 减少并行编译进程数
make -j4  # 而不是 -j8
```

**问题4**: IGA应用编译失败
- 确保安装了Eigen3库
- 检查CMake版本是否为3.16+
- 在Windows上可能需要安装Intel MKL

### 运行时问题

**问题1**: 导入KratosMultiphysics失败
```bash
# 检查Python路径
python -c "import sys; print(sys.path)"

# 检查环境变量
echo $PYTHONPATH  # Linux
echo %PYTHONPATH%  # Windows
```

**问题2**: 共享库加载失败 (Linux)
```bash
# 添加库路径
export LD_LIBRARY_PATH="$LD_LIBRARY_PATH:/path/to/kratos/lib"

# 或者运行ldconfig (需要root权限)
sudo ldconfig
```

## 📚 进阶配置

### MPI并行编译
```bash
# 安装MPI
sudo apt-get install libopenmpi-dev  # Ubuntu
sudo yum install openmpi-devel       # CentOS

# 启用MPI编译
-DKRATOS_BUILD_MPI=ON
-DKRATOS_BUILD_TRILINOS_APPLICATION=ON
```

### Intel MKL优化
```bash
# 启用Intel MKL
-DUSE_EIGEN_MKL=ON
-DMKL_ROOT=/opt/intel/mkl
```

### CUDA加速 (实验性)
```bash  
# 启用CUDA支持
-DKRATOS_BUILD_CUDA_SOLVERS=ON
-DCUDA_TOOLKIT_ROOT_DIR=/usr/local/cuda
```

## 📁 文件结构

编译完成后的目录结构：
```
kratos_install/
├── bin/                    # 可执行文件
├── lib/                    # 共享库
│   └── python3.9/
│       └── site-packages/  # Python模块
├── include/                # 头文件
└── share/                  # 配置文件
```

## 🔗 相关资源

- [Kratos官方文档](https://kratosultiphysics.github.io/Kratos/)
- [Kratos GitHub仓库](https://github.com/KratosMultiphysics/Kratos)
- [深基坑工程案例](examples/)
- [IGA分析教程](docs/iga_tutorial.md)
- [优化设计指南](docs/optimization_guide.md)

## 📞 技术支持

如果在编译过程中遇到问题：

1. 检查本README的常见问题部分
2. 查看编译日志：`kratos_build.log`
3. 参考Kratos官方文档
4. 提交Issue到项目仓库

---

**编译时间预估:**
- 首次编译：2-4小时 (取决于硬件配置)
- 增量编译：10-30分钟
- 仅核心模块：1-2小时

**硬件建议:**
- CPU：至少8核心
- RAM：16GB+ (编译时)
- 存储：SSD推荐 (加速编译)

祝编译顺利！🎉
