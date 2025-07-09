# Googletest 构建问题修复指南

## 问题描述

在构建 Kratos Core 时，遇到以下错误：

```
CMake Error at C:/Program Files/CMake/share/cmake-4.0/Modules/FetchContent.cmake:1918 (message):
  Build step for googletest failed: 1
```

这个错误表明 CMake 在尝试下载和构建 googletest 时失败。

## 解决方案

我们提供了几个批处理文件来解决这个问题，避免PowerShell脚本中的编码和语法问题。

### 方案一：使用一键修复和构建批处理文件（推荐）

这个方案会一步完成所有操作：下载googletest、修改配置文件并构建Kratos：

1. 双击运行 `fix_and_build.bat`
2. 等待脚本完成所有操作

### 方案二：禁用测试功能进行构建

如果方案一不起作用，您可以尝试禁用测试功能：

1. 双击运行 `build_no_tests.bat`

## 常见问题

### 问题：Visual Studio 路径不正确

解决方法：
编辑批处理文件中的Visual Studio路径，设置为您系统上 Visual Studio 2022 的实际安装路径。
默认路径为：`D:\Program Files\Microsoft Visual Studio\2022\Professional`

### 问题：下载 googletest 失败

解决方法：
1. 检查您的网络连接
2. 如果您在公司网络环境中，可能需要配置代理
3. 手动下载 googletest 压缩包：
   - 浏览器访问：https://github.com/google/googletest/archive/03597a01ee50ed33e9dfd640b249b4be3799d395.zip
   - 下载后保存到 `%TEMP%\googletest_fix\googletest.zip`
   - 然后运行 `fix_and_build.bat`

### 问题：构建过程中出现其他错误

解决方法：
1. 确保已安装 Visual Studio 2022 并包含 C++ 桌面开发工具
2. 确保已安装 CMake 3.14 或更高版本
3. 确保已安装 Boost 库（默认路径：`D:\Program Files\boost_1_88_0`）
4. 确保已安装 Python 3.8 或更高版本（默认路径：`D:\ProgramData\miniconda3\python.exe`）

## 技术支持

如果您仍然遇到问题，请提供以下信息：

1. 完整的错误信息
2. CMake 版本
3. Visual Studio 版本
4. 系统环境变量设置 