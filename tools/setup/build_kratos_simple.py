#!/usr/bin/env python3
"""
简化的 Kratos 编译脚本
直接在当前项目目录下编译和安装 Kratos
"""

import os
import sys
import subprocess
from pathlib import Path

def main():
    # 设置路径
    project_root = Path(r"e:\Deep Excavation")
    kratos_source = project_root / "Kratos"
    build_dir = project_root / "kratos_build_simple"
    install_dir = project_root / "kratos_install"
    
    print(f"项目根目录: {project_root}")
    print(f"Kratos 源码: {kratos_source}")
    print(f"构建目录: {build_dir}")
    print(f"安装目录: {install_dir}")
    
    # 检查源码目录
    if not kratos_source.exists():
        print(f"错误: Kratos 源码目录不存在: {kratos_source}")
        return False
    
    # 创建构建和安装目录
    build_dir.mkdir(exist_ok=True)
    install_dir.mkdir(exist_ok=True)
    
    # 切换到构建目录
    os.chdir(str(build_dir))
    
    print("=== 开始 CMake 配置 ===")
    
    # CMake 配置命令
    cmake_cmd = [
        "cmake",
        str(kratos_source),
        f"-DCMAKE_INSTALL_PREFIX={install_dir}",
        "-DCMAKE_BUILD_TYPE=Release",
        "-DUSE_MPI=OFF",
        "-DKRATOS_BUILD_TESTING=OFF",
        # 启用关键应用程序
        "-DSTRUCTURAL_MECHANICS_APPLICATION=ON",
        "-DFLUID_DYNAMICS_APPLICATION=ON",
        "-DDEM_APPLICATION=ON",
        "-DMESHING_APPLICATION=ON",
        "-DCONVECTION_DIFFUSION_APPLICATION=ON",
        "-DLINEAR_SOLVERS_APPLICATION=ON",
        # 尝试启用地质力学（如果存在）
        "-DGEOMECHANICS_APPLICATION=ON",
        # 尝试启用 IGA（如果存在）
        "-DIGA_APPLICATION=ON",
        # 尝试启用优化（如果存在）
        "-DOPTIMIZATION_APPLICATION=ON",
    ]
    
    print(f"执行命令: {' '.join(cmake_cmd)}")
    
    try:
        result = subprocess.run(cmake_cmd, check=True, capture_output=True, text=True)
        print("CMake 配置成功！")
        print(result.stdout)
    except subprocess.CalledProcessError as e:
        print(f"CMake 配置失败: {e}")
        print(f"错误输出: {e.stderr}")
        print("尝试只配置基本模块...")
        
        # 简化配置，只启用基本模块
        cmake_cmd_basic = [
            "cmake",
            str(kratos_source),
            f"-DCMAKE_INSTALL_PREFIX={install_dir}",
            "-DCMAKE_BUILD_TYPE=Release",
            "-DUSE_MPI=OFF",
            "-DKRATOS_BUILD_TESTING=OFF",
            "-DSTRUCTURAL_MECHANICS_APPLICATION=ON",
            "-DFLUID_DYNAMICS_APPLICATION=ON",
            "-DLINEAR_SOLVERS_APPLICATION=ON",
        ]
        
        try:
            result = subprocess.run(cmake_cmd_basic, check=True, capture_output=True, text=True)
            print("基本模块 CMake 配置成功！")
            print(result.stdout)
        except subprocess.CalledProcessError as e2:
            print(f"基本模块配置也失败: {e2}")
            print(f"错误输出: {e2.stderr}")
            return False
    
    print("=== 开始编译 ===")
    
    # 编译命令
    build_cmd = ["cmake", "--build", ".", "--config", "Release", "-j", "4"]
    
    print(f"执行命令: {' '.join(build_cmd)}")
    
    try:
        result = subprocess.run(build_cmd, check=True)
        print("编译成功！")
    except subprocess.CalledProcessError as e:
        print(f"编译失败: {e}")
        return False
    
    print("=== 开始安装 ===")
    
    # 安装命令
    install_cmd = ["cmake", "--build", ".", "--target", "install"]
    
    print(f"执行命令: {' '.join(install_cmd)}")
    
    try:
        result = subprocess.run(install_cmd, check=True)
        print("安装成功！")
    except subprocess.CalledProcessError as e:
        print(f"安装失败: {e}")
        return False
    
    print("=== Kratos 编译安装完成 ===")
    print(f"安装位置: {install_dir}")
    
    # 检查安装结果
    python_site_packages = install_dir / "lib" / "python3.11" / "site-packages"
    if python_site_packages.exists():
        print(f"Python 模块安装在: {python_site_packages}")
    
    kratos_python = install_dir / "bin" / "KratosMultiphysics"
    if kratos_python.exists():
        print(f"Kratos Python 模块: {kratos_python}")
    
    return True

if __name__ == "__main__":
    success = main()
    if success:
        print("✅ Kratos 编译安装成功！")
        sys.exit(0)
    else:
        print("❌ Kratos 编译安装失败！")
        sys.exit(1)
