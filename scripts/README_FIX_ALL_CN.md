# Kratos构建问题全面修复指南

## 问题描述

在构建Kratos Core时，可能会遇到以下问题：

1. **googletest构建失败**
   ```
   CMake Error: Build step for googletest failed: 1
   ```

2. **ZLIB版本问题**
   ```
   CMake Error at external_libraries/zlib/CMakeLists.txt:1 (cmake_minimum_required):
     Compatibility with CMake < 3.5 has been removed from CMake.
   ```

3. **PowerShell中的乱码问题**
   在PowerShell中运行脚本时，中文字符显示为乱码。

## 解决方案

我们提供了几个批处理文件来解决这些问题：

### 方案一：一键修复所有问题（推荐）

这个方案会一步完成所有操作：修复ZLIB问题、修复googletest问题并构建Kratos：

1. 双击运行 `fix_all_and_build.bat`
2. 等待脚本完成所有操作

### 方案二：分步解决

如果您想分步解决问题：

1. **只修复ZLIB问题并构建**：
   - 双击运行 `fix_zlib_and_build.bat`

2. **只修复googletest问题并构建**：
   - 双击运行 `fix_and_build.bat`

3. **禁用测试功能进行构建**：
   - 双击运行 `build_no_tests.bat`

### 方案三：修复PowerShell中的乱码问题

如果您需要在PowerShell中运行脚本而不出现乱码：

1. 双击运行 `fix_encoding.bat`
2. 这将打开一个新的PowerShell窗口，已设置正确的编码
3. 在这个窗口中运行您的PowerShell脚本

## 常见问题

### 问题：Visual Studio路径不正确

解决方法：
编辑批处理文件中的Visual Studio路径，设置为您系统上Visual Studio 2022的实际安装路径。
默认路径为：`D:\Program Files\Microsoft Visual Studio\2022\Professional`

### 问题：下载googletest失败

解决方法：
1. 检查您的网络连接
2. 如果您在公司网络环境中，可能需要配置代理
3. 手动下载googletest压缩包：
   - 浏览器访问：https://github.com/google/googletest/archive/03597a01ee50ed33e9dfd640b249b4be3799d395.zip
   - 下载后保存到`%TEMP%\googletest_fix\googletest.zip`
   - 然后运行`fix_all_and_build.bat`

### 问题：构建过程中出现其他错误

解决方法：
1. 确保已安装Visual Studio 2022并包含C++桌面开发工具
2. 确保已安装CMake 3.14或更高版本
3. 确保已安装Boost库（默认路径：`D:\Program Files\boost_1_88_0`）
4. 确保已安装Python 3.8或更高版本（默认路径：`D:\ProgramData\miniconda3\python.exe`）

## 技术支持

如果您仍然遇到问题，请提供以下信息：

1. 完整的错误信息
2. CMake版本
3. Visual Studio版本
4. 系统环境变量设置 