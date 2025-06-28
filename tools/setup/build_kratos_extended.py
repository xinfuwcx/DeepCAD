#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Kratos扩展模块编译脚本
在现有Kratos基础上添加IGA、地质力学、优化等模块
"""

import os
import sys
import subprocess
import platform
import multiprocessing
import json
from pathlib import Path

def print_status(msg, status="INFO"):
    """打印状态信息"""
    colors = {
        "INFO": "\033[94m[INFO]\033[0m" if platform.system() != "Windows" else "[INFO]",
        "OK": "\033[92m[OK]\033[0m" if platform.system() != "Windows" else "[OK]",
        "ERROR": "\033[91m[ERROR]\033[0m" if platform.system() != "Windows" else "[ERROR]",
        "WARNING": "\033[93m[WARNING]\033[0m" if platform.system() != "Windows" else "[WARNING]"
    }
    print(f"{colors.get(status, '[INFO]')} {msg}")

def run_cmd(cmd, cwd=None):
    """运行命令"""
    print_status(f"执行: {cmd}")
    try:
        result = subprocess.run(cmd, shell=True, cwd=cwd, check=True, 
                              capture_output=True, text=True)
        return True, result.stdout
    except subprocess.CalledProcessError as e:
        print_status(f"命令失败: {e}", "ERROR")
        if e.stdout:
            print_status(f"输出: {e.stdout}", "ERROR")
        if e.stderr:
            print_status(f"错误: {e.stderr}", "ERROR")
        return False, str(e)

def check_existing_kratos():
    """检查现有Kratos安装"""
    print_status("检查现有Kratos安装...")
    
    try:
        import KratosMultiphysics
        print_status("发现现有Kratos安装", "OK")
        
        # 检查版本
        try:
            version = getattr(KratosMultiphysics, '__version__', '未知版本')
        except:
            version = "10.2.1"  # 从检查输出可知
        
        print_status(f"Kratos版本: {version}")
        
        # 检查已安装的应用
        available_apps = []
        required_apps = [
            'StructuralMechanicsApplication',
            'GeomechanicsApplication', 
            'IgaApplication',
            'OptimizationApplication',
            'SolidMechanicsApplication',
            'DEMApplication',
            'LinearSolversApplication'
        ]
        
        for app in required_apps:
            try:
                exec(f"import KratosMultiphysics.{app}")
                available_apps.append(app)
                print_status(f"✓ {app} 已安装", "OK")
            except ImportError:
                print_status(f"✗ {app} 缺失", "WARNING")
        
        missing_apps = [app for app in required_apps if app not in available_apps]
        
        return {
            'version': version,
            'available_apps': available_apps,
            'missing_apps': missing_apps,
            'kratos_installed': True
        }
        
    except ImportError:
        print_status("未发现Kratos安装", "ERROR")
        return {'kratos_installed': False}

def get_kratos_source_config():
    """获取Kratos源码编译配置"""
    config = {
        # 核心设置
        'CMAKE_BUILD_TYPE': 'Release',
        'CMAKE_CXX_STANDARD': '17',
        
        # 基础应用 (已有的保持不变)
        'KRATOS_BUILD_STRUCTURAL_MECHANICS_APPLICATION': 'ON',
        'KRATOS_BUILD_FLUID_DYNAMICS_APPLICATION': 'ON',
        'KRATOS_BUILD_CONTACT_STRUCTURAL_MECHANICS_APPLICATION': 'ON',
        'KRATOS_BUILD_LINEAR_SOLVERS_APPLICATION': 'ON',
        
        # 重点添加的应用
        'KRATOS_BUILD_GEOMECHANICS_APPLICATION': 'ON',           # 地质力学
        'KRATOS_BUILD_IGA_APPLICATION': 'ON',                   # IGA等几何分析
        'KRATOS_BUILD_OPTIMIZATION_APPLICATION': 'ON',          # 优化模块
        'KRATOS_BUILD_SHAPE_OPTIMIZATION_APPLICATION': 'ON',    # 形状优化
        'KRATOS_BUILD_TOPOLOGY_OPTIMIZATION_APPLICATION': 'ON', # 拓扑优化
        'KRATOS_BUILD_SOLID_MECHANICS_APPLICATION': 'ON',       # 固体力学
        'KRATOS_BUILD_DEM_APPLICATION': 'ON',                   # 离散元
        'KRATOS_BUILD_PFEM_APPLICATION': 'ON',                  # 粒子有限元
        
        # 求解器和数学库
        'KRATOS_BUILD_EIGEN_SOLVERS_APPLICATION': 'ON',
        'KRATOS_BUILD_EXTERNAL_SOLVERS_APPLICATION': 'ON',
        'USE_EIGEN_MKL': 'ON',
        
        # 网格和几何
        'KRATOS_BUILD_MESH_MOVING_APPLICATION': 'ON',
        'KRATOS_BUILD_MESHING_APPLICATION': 'ON',
        'KRATOS_BUILD_MAPPING_APPLICATION': 'ON',
        
        # 多物理场
        'KRATOS_BUILD_FSI_APPLICATION': 'ON',
        'KRATOS_BUILD_CONVECTION_DIFFUSION_APPLICATION': 'ON',
        'KRATOS_BUILD_CONJUGATE_HEAT_TRANSFER_APPLICATION': 'ON',
        
        # 并行计算
        'KRATOS_BUILD_MPI': 'ON',
        'KRATOS_BUILD_METIS_APPLICATION': 'ON',
        'KRATOS_BUILD_TRILINOS_APPLICATION': 'ON',
        
        # Python设置
        'PYTHON_EXECUTABLE': sys.executable,
    }
    
    # Windows特定设置
    if platform.system() == 'Windows':
        config.update({
            'CMAKE_GENERATOR': 'Visual Studio 17 2022',
            'CMAKE_GENERATOR_PLATFORM': 'x64',
            'CMAKE_CXX_FLAGS': '/bigobj /EHsc /MP',
            'CMAKE_WINDOWS_EXPORT_ALL_SYMBOLS': 'TRUE'
        })
    
    return config

def build_kratos_extended():
    """编译扩展的Kratos"""
    print_status("开始编译扩展Kratos...")
    
    # 设置目录
    source_dir = "Kratos"
    build_dir = "kratos_build_extended"
    install_dir = "kratos_install_extended"
    
    # 克隆或更新源码
    if not os.path.exists(source_dir):
        print_status("克隆Kratos源码...")
        success, _ = run_cmd(f"git clone https://github.com/KratosMultiphysics/Kratos.git {source_dir}")
        if not success:
            return False
    else:
        print_status("更新Kratos源码...")
        success, _ = run_cmd("git pull", cwd=source_dir)
    
    # 创建构建目录
    os.makedirs(build_dir, exist_ok=True)
    
    # 获取配置
    config = get_kratos_source_config()
    config['CMAKE_INSTALL_PREFIX'] = os.path.abspath(install_dir)
    
    # 构建CMake命令
    cmake_args = []
    for key, value in config.items():
        if key.startswith('CMAKE_GENERATOR'):
            if key == 'CMAKE_GENERATOR':
                cmake_args.extend(['-G', f'"{value}"'])
            elif key == 'CMAKE_GENERATOR_PLATFORM':
                cmake_args.extend(['-A', value])
        else:
            cmake_args.append(f'-D{key}={value}')
    
    cmake_args.append(f'../{source_dir}')
    cmake_cmd = ' '.join(['cmake'] + cmake_args)
    
    print_status("配置CMake...")
    success, output = run_cmd(cmake_cmd, cwd=build_dir)
    if not success:
        print_status("CMake配置失败", "ERROR")
        return False
    
    # 编译
    cores = min(multiprocessing.cpu_count(), 8)  # 限制核心数避免内存不足
    print_status(f"开始编译 (使用 {cores} 核心)...")
    
    if platform.system() == 'Windows':
        build_cmd = f"cmake --build . --config Release --parallel {cores}"
    else:
        build_cmd = f"make -j{cores}"
    
    success, output = run_cmd(build_cmd, cwd=build_dir)
    if not success:
        print_status("编译失败", "ERROR")
        return False
    
    # 安装
    print_status("安装Kratos...")
    if platform.system() == 'Windows':
        install_cmd = "cmake --build . --config Release --target install"
    else:
        install_cmd = "make install"
    
    success, output = run_cmd(install_cmd, cwd=build_dir)
    if not success:
        print_status("安装失败", "ERROR")
        return False
    
    print_status("Kratos扩展编译完成!", "OK")
    return True

def setup_environment(install_dir):
    """设置环境变量"""
    print_status("设置环境变量...")
    
    install_path = os.path.abspath(install_dir)
    python_version = f"{sys.version_info.major}.{sys.version_info.minor}"
    
    if platform.system() == 'Windows':
        env_script = f"""@echo off
rem Kratos扩展环境配置
set KRATOS_PATH={install_path}
set PYTHONPATH=%PYTHONPATH%;{install_path}\\lib\\python{python_version}\\site-packages
set PATH=%PATH%;{install_path}\\bin

echo Kratos扩展环境已配置
echo KRATOS_PATH: %KRATOS_PATH%

rem 测试导入
python -c "import KratosMultiphysics.GeomechanicsApplication; print('GeomechanicsApplication可用')"
python -c "import KratosMultiphysics.IgaApplication; print('IgaApplication可用')" 
python -c "import KratosMultiphysics.OptimizationApplication; print('OptimizationApplication可用')"
"""
        filename = "setup_kratos_extended_env.bat"
    else:
        env_script = f"""#!/bin/bash
# Kratos扩展环境配置
export KRATOS_PATH="{install_path}"
export PYTHONPATH="$PYTHONPATH:{install_path}/lib/python{python_version}/site-packages"
export LD_LIBRARY_PATH="$LD_LIBRARY_PATH:{install_path}/lib"

echo "Kratos扩展环境已配置"
echo "KRATOS_PATH: $KRATOS_PATH"

# 测试导入
python3 -c "import KratosMultiphysics.GeomechanicsApplication; print('GeomechanicsApplication可用')"
python3 -c "import KratosMultiphysics.IgaApplication; print('IgaApplication可用')"
python3 -c "import KratosMultiphysics.OptimizationApplication; print('OptimizationApplication可用')"
"""
        filename = "setup_kratos_extended_env.sh"
    
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(env_script)
    
    if not platform.system() == 'Windows':
        os.chmod(filename, 0o755)
    
    print_status(f"环境脚本已生成: {filename}", "OK")
    return filename

def test_extended_kratos(install_dir):
    """测试扩展Kratos"""
    print_status("测试扩展Kratos安装...")
    
    # 临时添加路径
    install_path = os.path.abspath(install_dir)
    python_version = f"{sys.version_info.major}.{sys.version_info.minor}"
    site_packages = os.path.join(install_path, "lib", f"python{python_version}", "site-packages")
    
    if site_packages not in sys.path:
        sys.path.insert(0, site_packages)
    
    test_modules = [
        ('KratosMultiphysics', '核心模块'),
        ('KratosMultiphysics.StructuralMechanicsApplication', '结构力学'),
        ('KratosMultiphysics.GeomechanicsApplication', '地质力学'),
        ('KratosMultiphysics.IgaApplication', 'IGA等几何分析'),
        ('KratosMultiphysics.OptimizationApplication', '优化模块'),
        ('KratosMultiphysics.SolidMechanicsApplication', '固体力学'),
        ('KratosMultiphysics.DEMApplication', '离散元')
    ]
    
    success_count = 0
    for module, desc in test_modules:
        try:
            __import__(module)
            print_status(f"✓ {desc} ({module})", "OK")
            success_count += 1
        except ImportError as e:
            print_status(f"✗ {desc} ({module}) - {e}", "WARNING")
    
    print_status(f"成功导入 {success_count}/{len(test_modules)} 个模块")
    
    return success_count >= len(test_modules) // 2  # 至少一半成功

def main():
    """主函数"""
    print("=" * 60)
    print("Kratos扩展模块编译器")
    print("添加IGA、地质力学、优化等模块")
    print("=" * 60)
    
    # 检查现有安装
    kratos_info = check_existing_kratos()
    
    if not kratos_info.get('kratos_installed'):
        print_status("请先安装基础Kratos", "ERROR")
        return False
    
    missing_apps = kratos_info.get('missing_apps', [])
    if not missing_apps:
        print_status("所有需要的应用已安装!", "OK")
        return True
    
    print_status(f"需要添加的模块: {', '.join(missing_apps)}")
    
    # 询问是否继续
    response = input("是否继续编译扩展模块? (y/N): ").strip().lower()
    if response not in ['y', 'yes']:
        print_status("用户取消编译")
        return False
    
    # 开始编译
    if not build_kratos_extended():
        print_status("编译失败", "ERROR")
        return False
    
    # 设置环境
    env_script = setup_environment("kratos_install_extended")
    
    # 测试安装
    if test_extended_kratos("kratos_install_extended"):
        print_status("扩展模块安装成功!", "OK")
    else:
        print_status("部分模块安装失败", "WARNING")
    
    print("\n" + "=" * 60)
    print("扩展编译完成!")
    print("=" * 60)
    print(f"1. 运行环境脚本: {env_script}")
    print("2. 重启Python会话")
    print("3. 测试新模块导入")
    
    return True

if __name__ == "__main__":
    if main():
        print_status("编译成功完成!", "OK")
        sys.exit(0)
    else:
        print_status("编译失败!", "ERROR")
        sys.exit(1)
