# Kratos Build Script for DeepCAD

# 1. 设置路径
# Kratos源码根目录
$KRATOS_SOURCE_PATH = "E:\DeepCAD\kratos_source\Kratos"
# Python环境的可执行文件路径 (kratos_deepcad)
$PYTHON_EXECUTABLE = "D:\ProgramData\miniconda3\envs\kratos_deepcad\python.exe"
# 编译输出目录
$BUILD_DIR = "E:\DeepCAD\kratos_build"
# 安装目录
$INSTALL_DIR = "E:\DeepCAD\kratos_install"

# 2. 检查并创建编译目录
if (-not (Test-Path $BUILD_DIR)) {
    New-Item -ItemType Directory -Force -Path $BUILD_DIR
}
cd $BUILD_DIR

# 3. 配置CMake
# 定义要启用的Kratos应用模块
$KRATOS_APPLICATIONS = "GeoMechanicsApplication;StructuralMechanicsApplication;FluidDynamicsApplication;FSIApplication;OptimizationApplication"

# CMake配置命令
$cmake_command = @(
    "cmake",
    $KRATOS_SOURCE_PATH,
    "-DCMAKE_INSTALL_PREFIX=`"$INSTALL_DIR`"",
    "-DPYTHON_EXECUTABLE=`"$PYTHON_EXECUTABLE`"",
    "-D KRATOS_BUILD_PYTHON_USING_conda=ON",
    "-D KRATOS_ENABLE_C_API=ON",
    "-D KRATOS_APPLICATIONS=`"$KRATOS_APPLICATIONS`"",
    "-DCMAKE_BUILD_TYPE=Release",
    "-DBUILD_TESTING=OFF"
)

# 执行CMake配置
Write-Host "Configuring Kratos with CMake..."
& $cmake_command

if ($LASTEXITCODE -ne 0) {
    Write-Host "CMake configuration failed. Aborting build."
    exit 1
}

# 4. 启动编译
Write-Host "Starting Kratos compilation... This will take a significant amount of time."
# 使用所有可用的CPU核心进行编译
cmake --build . --parallel

if ($LASTEXITCODE -ne 0) {
    Write-Host "Kratos compilation failed."
    exit 1
}

# 5. 安装
Write-Host "Installing Kratos..."
cmake --build . --target install --parallel

if ($LASTEXITCODE -ne 0) {
    Write-Host "Kratos installation failed."
    exit 1
}

Write-Host "Kratos build and installation completed successfully!"
Write-Host "Kratos is installed in: $INSTALL_DIR" 