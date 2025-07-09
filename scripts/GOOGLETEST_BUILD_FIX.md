# Googletest 构建失败修复指南

## 问题描述

在构建 Kratos Core 时，遇到以下错误：

```
CMake Error at C:/Program Files/CMake/share/cmake-4.0/Modules/FetchContent.cmake:1918 (message):
  Build step for googletest failed: 1
Call Stack (most recent call first):
  C:/Program Files/CMake/share/cmake-4.0/Modules/FetchContent.cmake:1609 (__FetchContent_populateSubbuild)
  C:/Program Files/CMake/share/cmake-4.0/Modules/FetchContent.cmake:2145:EVAL:2 (__FetchContent_doPopulation)
  C:/Program Files/CMake/share/cmake-4.0/Modules/FetchContent.cmake:2145 (cmake_language)
  C:/Program Files/CMake/share/cmake-4.0/Modules/FetchContent.cmake:2384 (__FetchContent_Populate)
  CMakeLists.txt:358 (FetchContent_MakeAvailable)
```

这个错误表明 CMake 的 FetchContent 模块在尝试下载和构建 googletest 时失败。

## 可能的原因

1. 网络连接问题导致无法下载 googletest
2. 防火墙或代理设置阻止了下载
3. googletest 源码下载后构建失败
4. CMake 版本与 FetchContent 模块的使用方式不兼容

## 解决方案

### 方案一：禁用测试功能（推荐）

最简单的解决方案是在构建 Kratos Core 时禁用测试功能。我们提供了一个新的构建脚本 `build_kratos_core_no_tests.ps1`，它会在 CMake 配置中添加 `-DKRATOS_BUILD_TESTING=OFF` 选项。

使用方法：

```powershell
cd H:\DeepCAD\scripts
.\build_kratos_core_no_tests.ps1
```

### 方案二：手动修复 googletest 构建

如果您需要启用测试功能，可以尝试使用我们提供的修复脚本 `fix_googletest_build.ps1`，该脚本会：

1. 手动下载 googletest 源码
2. 将其放置在正确的位置
3. 修改 CMakeLists.txt 以使用本地 googletest 源码而不是尝试下载

使用方法：

```powershell
cd H:\DeepCAD\scripts
.\fix_googletest_build.ps1
.\build_kratos_core.ps1  # 使用原始构建脚本
```

### 方案三：修改 CMake 配置

如果上述方法都不起作用，您可以尝试修改 `configure_kratos_core.bat` 文件，添加以下 CMake 选项：

```batch
-DBUILD_SHARED_LIBS=ON -Dgtest_force_shared_crt=ON
```

## 其他建议

1. 确保您的 CMake 版本为 3.14 或更高版本
2. 确保 Visual Studio 2022 已安装 C++ 桌面开发工具
3. 检查网络连接和代理设置
4. 如果使用公司网络，可能需要配置代理或请求 IT 部门解除对 GitHub 的限制

## 技术支持

如果您仍然遇到问题，请提供以下信息：

1. CMake 版本（`cmake --version`）
2. Visual Studio 2022 的确切版本
3. 完整的构建日志
4. 系统环境变量的设置 