#!/bin/bash
# Kratos Build Script for DeepCAD - Linux版本

set -e  # 遇到错误时立即停止

echo "=========================================="
echo "DeepCAD Kratos编译脚本 - Linux版本"
echo "=========================================="

# 1. 设置路径变量
DEEPCAD_ROOT="/mnt/e/DeepCAD"
KRATOS_SOURCE_PATH="${DEEPCAD_ROOT}/core/kratos_source/kratos"
BUILD_DIR="${DEEPCAD_ROOT}/core/kratos_build"
INSTALL_DIR="${DEEPCAD_ROOT}/core/kratos_install"

# 检测Python环境
if command -v python3 &> /dev/null; then
    PYTHON_EXECUTABLE=$(which python3)
    echo "✓ 找到Python3: $PYTHON_EXECUTABLE"
else
    echo "✗ 未找到Python3，请安装Python3"
    exit 1
fi

# 检查Python版本
PYTHON_VERSION=$($PYTHON_EXECUTABLE --version 2>&1)
echo "Python版本: $PYTHON_VERSION"

# 2. 检查依赖
echo ""
echo "检查编译依赖..."

# 检查CMake
if command -v cmake &> /dev/null; then
    CMAKE_VERSION=$(cmake --version | head -n1)
    echo "✓ $CMAKE_VERSION"
else
    echo "✗ 未找到CMake，请安装CMake"
    exit 1
fi

# 检查编译器
if command -v g++ &> /dev/null; then
    GCC_VERSION=$(g++ --version | head -n1)
    echo "✓ $GCC_VERSION"
elif command -v clang++ &> /dev/null; then
    CLANG_VERSION=$(clang++ --version | head -n1)
    echo "✓ $CLANG_VERSION"
else
    echo "✗ 未找到C++编译器，请安装g++或clang++"
    exit 1
fi

# 检查make
if command -v make &> /dev/null; then
    echo "✓ make工具可用"
else
    echo "✗ 未找到make工具"
    exit 1
fi

# 3. 设置编译参数
echo ""
echo "配置编译参数..."

# 定义要启用的Kratos应用模块
KRATOS_APPLICATIONS="GeoMechanicsApplication;StructuralMechanicsApplication;FluidDynamicsApplication;FSIApplication;OptimizationApplication;LinearSolversApplication"

echo "启用的Kratos应用模块:"
IFS=';' read -ra APPS <<< "$KRATOS_APPLICATIONS"
for app in "${APPS[@]}"; do
    echo "  - $app"
done

# 4. 创建并进入构建目录
echo ""
echo "准备构建目录..."
if [ -d "$BUILD_DIR" ]; then
    echo "清理现有构建目录: $BUILD_DIR"
    rm -rf "$BUILD_DIR"
fi

mkdir -p "$BUILD_DIR"
mkdir -p "$INSTALL_DIR"
cd "$BUILD_DIR"

echo "构建目录: $BUILD_DIR"
echo "安装目录: $INSTALL_DIR"

# 5. 配置CMake
echo ""
echo "=========================================="
echo "开始CMake配置..."
echo "=========================================="

# 检测系统架构和核心数
NPROC=$(nproc)
echo "检测到 $NPROC 个CPU核心，将使用并行编译"

# CMake配置命令
cmake \
    "$KRATOS_SOURCE_PATH" \
    -DCMAKE_INSTALL_PREFIX="$INSTALL_DIR" \
    -DPYTHON_EXECUTABLE="$PYTHON_EXECUTABLE" \
    -DKRATOS_BUILD_PYTHON_USING_conda=OFF \
    -DKRATOS_ENABLE_C_API=ON \
    -DKRATOS_APPLICATIONS="$KRATOS_APPLICATIONS" \
    -DCMAKE_BUILD_TYPE=Release \
    -DBUILD_TESTING=OFF \
    -DUSE_COTIRE=OFF \
    -DKRATOS_BUILD_TESTING=OFF \
    -DKRATOS_EXCLUDE_DIRICHLET_CONDITIONS=OFF \
    -DKRATOS_EXCLUDE_NEUMANN_CONDITIONS=OFF

if [ $? -ne 0 ]; then
    echo "✗ CMake配置失败"
    exit 1
fi

echo "✓ CMake配置成功"

# 6. 开始编译
echo ""
echo "=========================================="
echo "开始Kratos编译... (这将需要较长时间)"
echo "=========================================="

# 显示预估时间
echo "预估编译时间: 30-60分钟 (取决于硬件配置)"
echo "编译开始时间: $(date)"

# 使用所有可用CPU核心进行并行编译
make -j$NPROC

if [ $? -ne 0 ]; then
    echo "✗ Kratos编译失败"
    exit 1
fi

echo "✓ Kratos编译成功"
echo "编译完成时间: $(date)"

# 7. 安装
echo ""
echo "=========================================="
echo "开始Kratos安装..."
echo "=========================================="

make install -j$NPROC

if [ $? -ne 0 ]; then
    echo "✗ Kratos安装失败"
    exit 1
fi

echo "✓ Kratos安装成功"

# 8. 设置环境变量
echo ""
echo "=========================================="
echo "配置环境变量..."
echo "=========================================="

# 创建环境配置脚本
ENV_SCRIPT="${DEEPCAD_ROOT}/setup_kratos_env.sh"
cat > "$ENV_SCRIPT" << EOF
#!/bin/bash
# Kratos环境配置脚本

# 设置Kratos Python路径
export PYTHONPATH="${INSTALL_DIR}:\$PYTHONPATH"

# 设置库路径 (Linux)
export LD_LIBRARY_PATH="${INSTALL_DIR}/libs:\$LD_LIBRARY_PATH"

# 设置Kratos根目录
export KRATOS_ROOT="${INSTALL_DIR}"

echo "Kratos环境已配置"
echo "PYTHONPATH: \$PYTHONPATH"
echo "LD_LIBRARY_PATH: \$LD_LIBRARY_PATH"
echo "KRATOS_ROOT: \$KRATOS_ROOT"
EOF

chmod +x "$ENV_SCRIPT"

echo "✓ 环境配置脚本已创建: $ENV_SCRIPT"

# 9. 验证安装
echo ""
echo "=========================================="
echo "验证Kratos安装..."
echo "=========================================="

# 加载环境变量
source "$ENV_SCRIPT"

# 创建验证脚本
VERIFY_SCRIPT="${BUILD_DIR}/verify_kratos.py"
cat > "$VERIFY_SCRIPT" << 'EOF'
#!/usr/bin/env python3
import sys
import os

try:
    import KratosMultiphysics
    print("✓ KratosMultiphysics导入成功")
    
    # 检查版本
    if hasattr(KratosMultiphysics, '__version__'):
        print(f"✓ Kratos版本: {KratosMultiphysics.__version__}")
    
    # 检查核心功能
    print(f"✓ Kratos数据文件夹: {KratosMultiphysics.KRATOS_DATA_DIR}")
    
    # 检查应用模块
    required_apps = [
        "GeoMechanicsApplication",
        "StructuralMechanicsApplication", 
        "FluidDynamicsApplication",
        "FSIApplication",
        "OptimizationApplication"
    ]
    
    print("\n检查应用模块:")
    for app in required_apps:
        try:
            module_name = f"KratosMultiphysics.{app}"
            __import__(module_name)
            print(f"  ✓ {app}")
        except ImportError as e:
            print(f"  ✗ {app} - {e}")
    
    print("\n✓ Kratos验证完成")
    
except ImportError as e:
    print(f"✗ Kratos导入失败: {e}")
    sys.exit(1)
EOF

chmod +x "$VERIFY_SCRIPT"

# 运行验证
echo "运行Kratos验证..."
$PYTHON_EXECUTABLE "$VERIFY_SCRIPT"

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "🎉 Kratos编译和安装完成！"
    echo "=========================================="
    echo ""
    echo "安装信息:"
    echo "  安装目录: $INSTALL_DIR"
    echo "  环境脚本: $ENV_SCRIPT"
    echo ""
    echo "使用方法:"
    echo "  1. 加载环境: source $ENV_SCRIPT"
    echo "  2. 在Python中导入: import KratosMultiphysics"
    echo ""
    echo "验证命令:"
    echo "  $PYTHON_EXECUTABLE $VERIFY_SCRIPT"
    echo ""
else
    echo "✗ Kratos验证失败，请检查安装"
    exit 1
fi