#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Kratos快速编译脚本 - 专门针对深基坑工程
包含IGA、优化、地质力学等关键模块
"""

import os
import sys
import subprocess
import platform
import multiprocessing
from pathlib import Path

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
        print(f"[ERROR] 输出: {e.output}")
        return False, e.output

def main():
    """主编译流程"""
    print("=" * 60)
    print("Kratos快速编译 - 深基坑工程专用")
    print("=" * 60)
    
    # 配置参数
    KRATOS_SOURCE = "Kratos"
    BUILD_DIR = "kratos_build"
    INSTALL_DIR = "kratos_install"
    NUM_CORES = multiprocessing.cpu_count()
    
    print(f"[INFO] 使用 {NUM_CORES} 个CPU核心进行编译")
    
    # 1. 克隆或更新Kratos源码
    if os.path.exists(KRATOS_SOURCE):
        print("[INFO] 更新Kratos源码...")
        success, _ = run_cmd("git pull", cwd=KRATOS_SOURCE)
    else:
        print("[INFO] 克隆Kratos源码...")
        success, _ = run_cmd("git clone https://github.com/KratosMultiphysics/Kratos.git " + KRATOS_SOURCE)
    
    if not success:
        print("[ERROR] 源码获取失败")
        return False
    
    # 2. 创建构建目录
    os.makedirs(BUILD_DIR, exist_ok=True)
    
    # 3. CMake配置 - 针对深基坑工程优化
    cmake_config = [
        "cmake",
        "-DCMAKE_BUILD_TYPE=Release",
        f"-DCMAKE_INSTALL_PREFIX={os.path.abspath(INSTALL_DIR)}",
        f"-DPYTHON_EXECUTABLE={sys.executable}",
        
        # 核心应用
        "-DKRATOS_BUILD_STRUCTURAL_MECHANICS_APPLICATION=ON",
        "-DKRATOS_BUILD_SOLID_MECHANICS_APPLICATION=ON",
        "-DKRATOS_BUILD_CONTACT_STRUCTURAL_MECHANICS_APPLICATION=ON",
        "-DKRATOS_BUILD_LINEAR_SOLVERS_APPLICATION=ON",
        
        # 地质力学 - 深基坑核心
        "-DKRATOS_BUILD_GEOMECHANICS_APPLICATION=ON",
        "-DKRATOS_BUILD_DEM_APPLICATION=ON",
        "-DKRATOS_BUILD_PFEM_APPLICATION=ON",
        
        # IGA等几何分析 - 高精度分析
        "-DKRATOS_BUILD_IGA_APPLICATION=ON",
        
        # 优化模块 - 设计优化
        "-DKRATOS_BUILD_OPTIMIZATION_APPLICATION=ON",
        "-DKRATOS_BUILD_SHAPE_OPTIMIZATION_APPLICATION=ON",
        
        # 网格和求解器
        "-DKRATOS_BUILD_MESH_MOVING_APPLICATION=ON",
        "-DKRATOS_BUILD_METIS_APPLICATION=ON",
        "-DKRATOS_BUILD_EIGEN_SOLVERS_APPLICATION=ON",
        
        # 多物理场耦合
        "-DKRATOS_BUILD_FSI_APPLICATION=ON",
        "-DKRATOS_BUILD_CONVECTION_DIFFUSION_APPLICATION=ON",
        
        # MPI并行支持
        "-DKRATOS_BUILD_MPI=ON",
        
        f"../{KRATOS_SOURCE}"
    ]
    
    # Windows特定配置
    if platform.system() == 'Windows':
        cmake_config.insert(1, "-G")
        cmake_config.insert(2, "Visual Studio 17 2022")
        cmake_config.insert(3, "-A")
        cmake_config.insert(4, "x64")
    
    print(f"[INFO] 配置CMake...")
    success, _ = run_cmd(" ".join(cmake_config), cwd=BUILD_DIR)
    if not success:
        print("[ERROR] CMake配置失败")
        return False
    
    # 4. 编译
    print(f"[INFO] 开始编译 (使用 {NUM_CORES} 核心)...")
    if platform.system() == 'Windows':
        build_cmd = f"cmake --build . --config Release --parallel {NUM_CORES}"
    else:
        build_cmd = f"make -j{NUM_CORES}"
    
    success, _ = run_cmd(build_cmd, cwd=BUILD_DIR)
    if not success:
        print("[ERROR] 编译失败")
        return False
    
    # 5. 安装
    print(f"[INFO] 安装Kratos...")
    if platform.system() == 'Windows':
        install_cmd = "cmake --build . --config Release --target install"
    else:
        install_cmd = "make install"
    
    success, _ = run_cmd(install_cmd, cwd=BUILD_DIR)
    if not success:
        print("[ERROR] 安装失败")
        return False
    
    # 6. 生成环境配置
    install_path = os.path.abspath(INSTALL_DIR)
    python_version = f"{sys.version_info.major}.{sys.version_info.minor}"
    
    if platform.system() == 'Windows':
        env_script = f"""@echo off
rem Kratos环境配置 - Windows
set KRATOS_PATH={install_path}
set PYTHONPATH=%PYTHONPATH%;{install_path}\\lib\\python{python_version}\\site-packages
set PATH=%PATH%;{install_path}\\bin

echo Kratos环境已配置
echo KRATOS_PATH: %KRATOS_PATH%
"""
        with open("setup_kratos_env.bat", "w", encoding="utf-8") as f:
            f.write(env_script)
        
        print(f"[OK] 环境配置文件已生成: setup_kratos_env.bat")
        print(f"[INFO] 请运行: setup_kratos_env.bat")
    else:
        env_script = f"""#!/bin/bash
# Kratos环境配置 - Linux
export KRATOS_PATH="{install_path}"
export PYTHONPATH="$PYTHONPATH:{install_path}/lib/python{python_version}/site-packages"
export LD_LIBRARY_PATH="$LD_LIBRARY_PATH:{install_path}/lib"

echo "Kratos环境已配置"
echo "KRATOS_PATH: $KRATOS_PATH"
"""
        with open("setup_kratos_env.sh", "w", encoding="utf-8") as f:
            f.write(env_script)
        
        print(f"[OK] 环境配置文件已生成: setup_kratos_env.sh")
        print(f"[INFO] 请运行: source setup_kratos_env.sh")
    
    # 7. 快速测试
    print(f"[INFO] 测试Kratos安装...")
    test_code = f"""
import sys
sys.path.insert(0, r'{install_path}')

try:
    import KratosMultiphysics
    print('[OK] Kratos核心模块导入成功')
    
    # 测试关键应用
    apps = ['StructuralMechanicsApplication', 'GeomechanicsApplication', 'IgaApplication']
    for app in apps:
        try:
            exec(f'import KratosMultiphysics.{{app}}')
            print(f'[OK] {{app}} 可用')
        except:
            print(f'[WARNING] {{app}} 不可用')
    
    print('[SUCCESS] Kratos编译安装成功!')
except Exception as e:
    print(f'[ERROR] 测试失败: {{e}}')
"""
    
    with open("test_kratos.py", "w", encoding="utf-8") as f:
        f.write(test_code)
    
    success, output = run_cmd(f"{sys.executable} test_kratos.py")
    print(output)
    
    # 清理测试文件
    try:
        os.remove("test_kratos.py")
    except:
        pass
    
    print("=" * 60)
    print("Kratos编译完成!")
    print("=" * 60)
    print(f"安装目录: {install_path}")
    print(f"环境配置: setup_kratos_env.{'bat' if platform.system() == 'Windows' else 'sh'}")
    
    return True

if __name__ == "__main__":
    if main():
        print("\n[SUCCESS] 编译成功完成!")
        sys.exit(0)
    else:
        print("\n[FAILED] 编译失败!")
        sys.exit(1)
