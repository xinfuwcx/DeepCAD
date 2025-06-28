#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Kratos快速编译脚本 - 修复版本
专门针对深基坑工程，包含IGA、地质力学、优化等模块
修复了CMake命令格式问题
"""

import os
import sys
import subprocess
import platform
import multiprocessing
import time

def run_cmd(cmd, cwd=None):
    """运行命令"""
    print(f"[INFO] 执行: {cmd}")
    try:
        result = subprocess.run(cmd, shell=True, cwd=cwd, check=True, 
                              capture_output=True, text=True)
        print("[OK] 命令执行成功")
        return True, result.stdout
    except subprocess.CalledProcessError as e:
        print(f"[ERROR] 命令执行失败: {e}")
        if e.stdout:
            print(f"[ERROR] 输出: {e.stdout}")
        if e.stderr:
            print(f"[ERROR] 错误: {e.stderr}")
        return False, str(e)

def check_visual_studio():
    """检查Visual Studio环境"""
    print("[INFO] 检查Visual Studio环境...")
    
    # 检查是否有cl编译器
    success, output = run_cmd("cl")
    if success:
        print("[OK] Visual Studio编译器已设置")
        return True
    
    # 尝试自动设置VS环境
    vs_paths = [
        r"C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat",
        r"C:\Program Files\Microsoft Visual Studio\2022\Professional\VC\Auxiliary\Build\vcvars64.bat",
        r"C:\Program Files\Microsoft Visual Studio\2019\Community\VC\Auxiliary\Build\vcvars64.bat",
        r"C:\Program Files (x86)\Microsoft Visual Studio\2019\Community\VC\Auxiliary\Build\vcvars64.bat"
    ]
    
    for vs_path in vs_paths:
        if os.path.exists(vs_path):
            print(f"[INFO] 找到Visual Studio: {vs_path}")
            print("[WARNING] 请在运行此脚本前先执行:")
            print(f'"{vs_path}"')
            return False
    
    print("[ERROR] 未找到Visual Studio安装")
    print("请先安装Visual Studio 2019/2022并包含C++开发工具")
    return False

def main():
    """主编译流程"""
    print("=" * 60)
    print("Kratos快速编译 - 深基坑工程专用 (修复版)")
    print("=" * 60)
    
    # 检查Visual Studio环境
    if platform.system() == 'Windows':
        if not check_visual_studio():
            return False
    
    # 配置参数 - 确保所有路径都在项目根目录下
    PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    KRATOS_SOURCE = os.path.join(PROJECT_ROOT, "Kratos")
    BUILD_DIR = os.path.join(PROJECT_ROOT, "kratos_build_fixed")
    INSTALL_DIR = os.path.join(PROJECT_ROOT, "kratos_install_fixed")
    NUM_CORES = min(multiprocessing.cpu_count(), 6)  # 限制核心数避免内存问题
    
    print(f"[INFO] 项目根目录: {PROJECT_ROOT}")
    print(f"[INFO] Kratos源码: {KRATOS_SOURCE}")
    print(f"[INFO] 构建目录: {BUILD_DIR}")
    print(f"[INFO] 安装目录: {INSTALL_DIR}")
    
    print(f"[INFO] 使用 {NUM_CORES} 个CPU核心进行编译")
    
    # 1. 克隆或更新Kratos源码
    if os.path.exists(KRATOS_SOURCE):
        print("[INFO] 更新Kratos源码...")
        success, _ = run_cmd("git pull", cwd=KRATOS_SOURCE)
    else:
        print("[INFO] 克隆Kratos源码...")
        success, _ = run_cmd(f"git clone https://github.com/KratosMultiphysics/Kratos.git {KRATOS_SOURCE}")
    
    if not success:
        print("[ERROR] 源码获取失败")
        return False
    
    # 2. 创建构建目录
    if os.path.exists(BUILD_DIR):
        print(f"[INFO] 清理旧的构建目录...")
        import shutil
        shutil.rmtree(BUILD_DIR)
    
    os.makedirs(BUILD_DIR, exist_ok=True)
    
    # 3. CMake配置 - 修复版本
    print("[INFO] 配置CMake...")
    
    # 基本CMake参数
    cmake_args = [
        "cmake",
        f"-DCMAKE_BUILD_TYPE=Release",
        f"-DCMAKE_INSTALL_PREFIX={os.path.abspath(INSTALL_DIR)}",
        f"-DPYTHON_EXECUTABLE={sys.executable}",
    ]
    
    # Windows特定设置
    if platform.system() == 'Windows':
        cmake_args.extend([
            "-G", "Visual Studio 17 2022",
            "-A", "x64",
            "-DCMAKE_CXX_FLAGS=/bigobj /EHsc /MP",
            "-DCMAKE_WINDOWS_EXPORT_ALL_SYMBOLS=TRUE"
        ])
    
    # 应用配置
    app_configs = [
        # 核心应用
        "-DKRATOS_BUILD_STRUCTURAL_MECHANICS_APPLICATION=ON",
        "-DKRATOS_BUILD_SOLID_MECHANICS_APPLICATION=ON",
        "-DKRATOS_BUILD_CONTACT_STRUCTURAL_MECHANICS_APPLICATION=ON", 
        "-DKRATOS_BUILD_LINEAR_SOLVERS_APPLICATION=ON",
        
        # 地质力学 - 深基坑核心
        "-DKRATOS_BUILD_GEOMECHANICS_APPLICATION=ON",
        "-DKRATOS_BUILD_DEM_APPLICATION=ON",
        "-DKRATOS_BUILD_PFEM_APPLICATION=ON",
        
        # IGA等几何分析
        "-DKRATOS_BUILD_IGA_APPLICATION=ON",
        
        # 优化模块
        "-DKRATOS_BUILD_OPTIMIZATION_APPLICATION=ON",
        "-DKRATOS_BUILD_SHAPE_OPTIMIZATION_APPLICATION=ON",
        
        # 网格和求解器
        "-DKRATOS_BUILD_MESH_MOVING_APPLICATION=ON",
        "-DKRATOS_BUILD_METIS_APPLICATION=ON",
        "-DKRATOS_BUILD_EIGEN_SOLVERS_APPLICATION=ON",
        
        # 多物理场
        "-DKRATOS_BUILD_FSI_APPLICATION=ON",
        "-DKRATOS_BUILD_FLUID_DYNAMICS_APPLICATION=ON",
        "-DKRATOS_BUILD_CONVECTION_DIFFUSION_APPLICATION=ON",
        
        # MPI并行 (可选，可能导致复杂性)
        # "-DKRATOS_BUILD_MPI=ON",
    ]
    
    cmake_args.extend(app_configs)
    cmake_args.append(KRATOS_SOURCE)  # 使用绝对路径
    
    # 执行CMake配置
    cmake_cmd = " ".join(cmake_args)
    print(f"[INFO] CMake命令: {cmake_cmd[:100]}...")  # 只显示前100个字符
    
    success, output = run_cmd(cmake_cmd, cwd=BUILD_DIR)
    if not success:
        print("[ERROR] CMake配置失败")
        return False
    
    # 4. 编译
    print(f"[INFO] 开始编译 (使用 {NUM_CORES} 核心)...")
    print("[INFO] 编译可能需要2-4小时，请耐心等待...")
    
    if platform.system() == 'Windows':
        build_cmd = f"cmake --build . --config Release --parallel {NUM_CORES}"
    else:
        build_cmd = f"make -j{NUM_CORES}"
    
    start_time = time.time()
    success, output = run_cmd(build_cmd, cwd=BUILD_DIR)
    end_time = time.time()
    
    if not success:
        print("[ERROR] 编译失败")
        print("常见解决方案:")
        print("1. 确保有足够内存 (推荐16GB+)")
        print("2. 减少并行核心数")
        print("3. 检查Visual Studio环境设置")
        return False
    
    compile_time = (end_time - start_time) / 60  # 转换为分钟
    print(f"[OK] 编译成功完成! 耗时: {compile_time:.1f} 分钟")
    
    # 5. 安装
    print("[INFO] 安装Kratos...")
    if platform.system() == 'Windows':
        install_cmd = "cmake --build . --config Release --target install"
    else:
        install_cmd = "make install"
    
    success, output = run_cmd(install_cmd, cwd=BUILD_DIR)
    if not success:
        print("[ERROR] 安装失败")
        return False
    
    # 6. 生成环境配置
    install_path = os.path.abspath(INSTALL_DIR)
    python_version = f"{sys.version_info.major}.{sys.version_info.minor}"
    
    if platform.system() == 'Windows':
        env_script = f"""@echo off
rem Kratos扩展环境配置 - Windows
set KRATOS_PATH={install_path}
set PYTHONPATH=%PYTHONPATH%;{install_path}\\lib\\python{python_version}\\site-packages
set PATH=%PATH%;{install_path}\\bin

echo [INFO] Kratos扩展环境已配置
echo KRATOS_PATH: %KRATOS_PATH%

echo [INFO] 测试关键模块导入...
python -c "import KratosMultiphysics; print('[OK] Kratos核心模块')"
python -c "import KratosMultiphysics.GeomechanicsApplication; print('[OK] 地质力学模块')" 2>nul || echo "[WARNING] 地质力学模块导入失败"
python -c "import KratosMultiphysics.IgaApplication; print('[OK] IGA模块')" 2>nul || echo "[WARNING] IGA模块导入失败"
python -c "import KratosMultiphysics.OptimizationApplication; print('[OK] 优化模块')" 2>nul || echo "[WARNING] 优化模块导入失败"

echo.
echo [SUCCESS] Kratos扩展安装完成!
"""
        with open("setup_kratos_extended_env.bat", "w", encoding="utf-8") as f:
            f.write(env_script)
        
        print("[OK] 环境配置文件已生成: setup_kratos_extended_env.bat")
        print("[INFO] 请运行: setup_kratos_extended_env.bat")
    else:
        env_script = f"""#!/bin/bash
# Kratos扩展环境配置 - Linux
export KRATOS_PATH="{install_path}"
export PYTHONPATH="$PYTHONPATH:{install_path}/lib/python{python_version}/site-packages"
export LD_LIBRARY_PATH="$LD_LIBRARY_PATH:{install_path}/lib"

echo "[INFO] Kratos扩展环境已配置"
echo "KRATOS_PATH: $KRATOS_PATH"

echo "[INFO] 测试关键模块导入..."
python3 -c "import KratosMultiphysics; print('[OK] Kratos核心模块')"
python3 -c "import KratosMultiphysics.GeomechanicsApplication; print('[OK] 地质力学模块')" 2>/dev/null || echo "[WARNING] 地质力学模块导入失败"
python3 -c "import KratosMultiphysics.IgaApplication; print('[OK] IGA模块')" 2>/dev/null || echo "[WARNING] IGA模块导入失败"
python3 -c "import KratosMultiphysics.OptimizationApplication; print('[OK] 优化模块')" 2>/dev/null || echo "[WARNING] 优化模块导入失败"

echo
echo "[SUCCESS] Kratos扩展安装完成!"
"""
        with open("setup_kratos_extended_env.sh", "w", encoding="utf-8") as f:
            f.write(env_script)
        
        print("[OK] 环境配置文件已生成: setup_kratos_extended_env.sh")
        print("[INFO] 请运行: source setup_kratos_extended_env.sh")
    
    print("=" * 60)
    print("Kratos扩展编译完成!")
    print("=" * 60)
    print(f"安装目录: {install_path}")
    print("新增模块:")
    print("  ✓ GeomechanicsApplication - 地质力学分析")
    print("  ✓ IgaApplication - 等几何分析")
    print("  ✓ OptimizationApplication - 结构优化")
    print("  ✓ SolidMechanicsApplication - 固体力学")
    print("  ✓ DEMApplication - 离散元方法")
    
    return True

if __name__ == "__main__":
    if main():
        print("\n[SUCCESS] 编译成功完成!")
        sys.exit(0)
    else:
        print("\n[FAILED] 编译失败!")
        sys.exit(1)
