#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
依赖检查和安装脚本
用于检查和安装深基坑CAE系统所需的所有依赖
"""

import os
import sys
import subprocess
import platform
import importlib
import shutil
import logging
from pathlib import Path

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('dependency_check.log', mode='w', encoding='utf-8')
    ]
)
logger = logging.getLogger("DependencyChecker")

# 定义颜色和符号 (使用ASCII字符而非Unicode)
if platform.system() == 'Windows':
    # Windows命令行颜色
    GREEN = ''
    YELLOW = ''
    RED = ''
    BLUE = ''
    RESET = ''
    # ASCII符号
    CHECK_MARK = '[v]'  # 替代 ✓
    CROSS_MARK = '[x]'  # 替代 ✗
    INFO_MARK = '[i]'   # 替代 ℹ
    WARN_MARK = '[!]'   # 替代 ⚠
else:
    # ANSI颜色
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    RESET = '\033[0m'
    # ASCII符号
    CHECK_MARK = '[v]'  # 替代 ✓
    CROSS_MARK = '[x]'  # 替代 ✗
    INFO_MARK = '[i]'   # 替代 ℹ
    WARN_MARK = '[!]'   # 替代 ⚠

def print_status(message, status, details=None):
    """打印状态信息"""
    if status == "OK":
        status_color = f"{GREEN}{CHECK_MARK}{RESET}"
    elif status == "WARNING":
        status_color = f"{YELLOW}{WARN_MARK}{RESET}"
    elif status == "ERROR":
        status_color = f"{RED}{CROSS_MARK}{RESET}"
    elif status == "INFO":
        status_color = f"{BLUE}{INFO_MARK}{RESET}"
    else:
        status_color = f"[{status}]"
    
    print(f"{status_color} {message}")
    if details:
        print(f"    {details}")
    
    # 同时记录到日志
    if status == "OK":
        logger.info(f"{message}")
    elif status == "WARNING":
        logger.warning(f"{message}")
    elif status == "ERROR":
        logger.error(f"{message}")
    else:
        logger.info(f"{message}")
    if details:
        logger.info(f"Details: {details}")

def run_command(command, cwd=None, env=None):
    """运行命令并返回结果"""
    try:
        result = subprocess.run(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            cwd=cwd,
            env=env,
            shell=True,
            check=True
        )
        return True, result.stdout
    except subprocess.CalledProcessError as e:
        return False, e.stderr

def check_python_version():
    """检查Python版本"""
    required_version = (3, 8)
    current_version = sys.version_info
    
    if current_version >= required_version:
        # 检查是否是Python 3.13版本
        if current_version.major == 3 and current_version.minor == 13:
            print_status(
                f"Python版本: {sys.version.split()[0]}",
                "OK",
                f"使用Python 3.13，部分库可能需要适配"
            )
        else:
            print_status(
                f"Python版本: {sys.version.split()[0]}",
                "OK",
                f"满足最低要求 {required_version[0]}.{required_version[1]}"
            )
        return True
    else:
        print_status(
            f"Python版本: {sys.version.split()[0]}",
            "ERROR",
            f"不满足最低要求 {required_version[0]}.{required_version[1]}"
        )
        return False

def check_pip():
    """检查pip是否可用"""
    success, output = run_command([sys.executable, "-m", "pip", "--version"])
    if success:
        print_status("pip可用", "OK", output.strip())
        return True
    else:
        print_status("pip不可用", "ERROR", "请安装pip")
        return False

def check_package(package_name, min_version=None, install=False, pip_package=None):
    """检查Python包是否已安装，如果未安装则安装"""
    if pip_package is None:
        pip_package = package_name
    
    try:
        module = importlib.import_module(package_name)
        version = getattr(module, "__version__", "未知版本")
        print_status(f"{package_name}已安装", "OK", f"版本: {version}")
        
        # 检查最低版本要求
        if min_version and version != "未知版本":
            try:
                from packaging import version as version_parser
                if version_parser.parse(version) < version_parser.parse(min_version):
                    print_status(
                        f"{package_name}版本过低",
                        "WARNING",
                        f"当前版本: {version}, 需要版本: {min_version}"
                    )
                    if install:
                        print_status(f"正在更新{package_name}...", "INFO")
                        success, output = run_command(
                            [sys.executable, "-m", "pip", "install", "--upgrade", pip_package]
                        )
                        if success:
                            print_status(f"{package_name}更新成功", "OK")
                        else:
                            print_status(f"{package_name}更新失败", "ERROR", output)
            except ImportError:
                print_status("无法检查版本要求", "WARNING", "缺少packaging模块")
        
        return True
    except ImportError:
        print_status(f"{package_name}未安装", "WARNING")
        if install:
            print_status(f"正在安装{package_name}...", "INFO")
            success, output = run_command(
                [sys.executable, "-m", "pip", "install", pip_package]
            )
            if success:
                print_status(f"{package_name}安装成功", "OK")
                return True
            else:
                print_status(f"{package_name}安装失败", "ERROR", output)
                return False
        return False

def check_node():
    """检查Node.js是否已安装"""
    success, output = run_command(["node", "--version"])
    if success:
        print_status("Node.js已安装", "OK", f"版本: {output.strip()}")
        return True
    else:
        print_status("Node.js未安装", "ERROR", "请安装Node.js")
        return False

def check_npm():
    """检查npm是否已安装"""
    success, output = run_command(["npm", "--version"])
    if success:
        print_status("npm已安装", "OK", f"版本: {output.strip()}")
        return True
    else:
        print_status("npm未安装", "ERROR", "请安装npm")
        return False

def check_frontend_dependencies():
    """检查前端依赖"""
    # 检查package.json是否存在
    if not os.path.exists("frontend/src/package.json"):
        print_status("前端package.json不存在", "ERROR", "请确保前端目录结构正确")
        return False
    
    # 检查node_modules是否存在
    if not os.path.exists("frontend/node_modules"):
        print_status("前端依赖未安装", "WARNING", "正在安装前端依赖...")
        success, output = run_command(["npm", "install"], cwd="frontend")
        if success:
            print_status("前端依赖安装成功", "OK")
        else:
            print_status("前端依赖安装失败", "ERROR", output)
            return False
    else:
        print_status("前端依赖已安装", "OK")
    
    return True

def check_gmsh():
    """检查Gmsh是否已安装"""
    try:
        import gmsh
        gmsh.initialize()
        version = gmsh.option.getString("General.Version")
        gmsh.finalize()
        print_status("Gmsh已安装", "OK", f"版本: {version}")
        return True
    except ImportError:
        print_status("Gmsh未安装", "WARNING", "正在安装Gmsh...")
        success, output = run_command([sys.executable, "-m", "pip", "install", "gmsh"])
        if success:
            print_status("Gmsh安装成功", "OK")
            return True
        else:
            print_status("Gmsh安装失败", "ERROR", output)
            return False
    except Exception as e:
        print_status("Gmsh检查失败", "ERROR", str(e))
        return False

def check_trame():
    """检查Trame是否已安装"""
    try:
        from trame.app import get_server
        print_status("Trame已安装", "OK")
        return True
    except ImportError:
        print_status("Trame未安装", "WARNING", "正在安装Trame...")
        success, output = run_command([sys.executable, "-m", "pip", "install", "trame"])
        if success:
            print_status("Trame安装成功", "OK")
            return True
        else:
            print_status("Trame安装失败", "ERROR", output)
            return False

def check_vtk():
    """检查VTK是否已安装"""
    try:
        import vtk
        version = vtk.vtkVersion.GetVTKVersion()
        print_status("VTK已安装", "OK", f"版本: {version}")
        return True
    except ImportError:
        print_status("VTK未安装", "WARNING", "正在安装VTK...")
        success, output = run_command([sys.executable, "-m", "pip", "install", "vtk"])
        if success:
            print_status("VTK安装成功", "OK")
            return True
        else:
            print_status("VTK安装失败", "ERROR", output)
            return False

def check_pytorch():
    """检查PyTorch是否已安装"""
    try:
        import torch
        version = torch.__version__
        cuda_available = torch.cuda.is_available()
        print_status("PyTorch已安装", "OK", f"版本: {version}, CUDA可用: {cuda_available}")
        return True
    except ImportError:
        print_status("PyTorch未安装", "WARNING", "正在安装PyTorch...")
        
        # 根据系统和Python版本选择安装命令
        python_version = f"{sys.version_info.major}.{sys.version_info.minor}"
        
        # 对于Python 3.13，可能需要特殊处理
        if sys.version_info.major == 3 and sys.version_info.minor == 13:
            print_status("检测到Python 3.13", "WARNING", "PyTorch可能尚未完全支持此版本，尝试安装最新版本")
            cmd = [sys.executable, "-m", "pip", "install", "--pre", "torch", "torchvision", "torchaudio"]
        else:
            if platform.system() == 'Windows':
                cmd = [sys.executable, "-m", "pip", "install", "torch", "torchvision", "torchaudio"]
            else:
                cmd = [sys.executable, "-m", "pip", "install", "torch", "torchvision", "torchaudio"]
        
        success, output = run_command(cmd)
        if success:
            print_status("PyTorch安装成功", "OK")
            return True
        else:
            print_status("PyTorch安装失败", "ERROR", output)
            print_status("请访问 https://pytorch.org/get-started/locally/ 获取安装指南", "INFO")
            return False

def check_kratos():
    """检查Kratos是否已安装"""
    try:
        import KratosMultiphysics
        # 尝试不同方式获取版本号
        try:
            version = KratosMultiphysics.__version__
        except AttributeError:
            try:
                version = KratosMultiphysics.KratosMultiphysics_version
            except AttributeError:
                version = "未知版本"
        
        print_status("Kratos已安装", "OK", f"版本: {version}")
        return True
    except ImportError:
        print_status("Kratos未安装", "WARNING")
        print_status("Kratos需要手动安装", "INFO", "请访问 https://github.com/KratosMultiphysics/Kratos 获取安装指南")
        return False

def check_fastapi():
    """检查FastAPI是否已安装"""
    return check_package("fastapi", min_version="0.95.0", install=True)

def check_sqlalchemy():
    """检查SQLAlchemy是否已安装"""
    return check_package("sqlalchemy", min_version="2.0.0", install=True)

def check_numpy():
    """检查NumPy是否已安装"""
    return check_package("numpy", min_version="1.20.0", install=True)

def check_scipy():
    """检查SciPy是否已安装"""
    return check_package("scipy", min_version="1.7.0", install=True)

def check_matplotlib():
    """检查Matplotlib是否已安装"""
    return check_package("matplotlib", min_version="3.5.0", install=True)

def check_pyvista():
    """检查PyVista是否已安装"""
    return check_package("pyvista", min_version="0.37.0", install=True)

def create_data_directories():
    """创建数据目录"""
    directories = [
        "data",
        "data/visualization",
        "data/results",
        "data/models",
        "data/mesh"
    ]
    
    for directory in directories:
        os.makedirs(directory, exist_ok=True)
    
    print_status("数据目录已创建", "OK")
    return True

def main():
    """主函数"""
    print("\n" + "=" * 60)
    print("深基坑CAE系统依赖检查和安装工具")
    print("=" * 60 + "\n")
    
    # 检查Python版本
    if not check_python_version():
        print_status("Python版本不满足要求，请安装Python 3.8或更高版本", "ERROR")
        return False
    
    # 检查pip
    if not check_pip():
        print_status("pip不可用，请安装pip", "ERROR")
        return False
    
    # 安装packaging（用于版本比较）
    check_package("packaging", install=True)
    
    print("\n" + "-" * 60)
    print("检查核心Python依赖")
    print("-" * 60)
    
    # 检查核心Python依赖
    check_numpy()
    check_scipy()
    check_matplotlib()
    check_fastapi()
    check_sqlalchemy()
    
    print("\n" + "-" * 60)
    print("检查可视化相关依赖")
    print("-" * 60)
    
    # 检查可视化相关依赖
    check_vtk()
    check_pyvista()
    check_trame()
    
    print("\n" + "-" * 60)
    print("检查网格和计算相关依赖")
    print("-" * 60)
    
    # 检查网格和计算相关依赖
    check_gmsh()
    check_kratos()
    
    print("\n" + "-" * 60)
    print("检查AI相关依赖")
    print("-" * 60)
    
    # 检查AI相关依赖
    check_pytorch()
    
    print("\n" + "-" * 60)
    print("检查前端依赖")
    print("-" * 60)
    
    # 检查Node.js和npm
    node_available = check_node()
    npm_available = check_npm()
    
    # 如果Node.js和npm可用，检查前端依赖
    if node_available and npm_available:
        check_frontend_dependencies()
    
    print("\n" + "-" * 60)
    print("创建数据目录")
    print("-" * 60)
    
    # 创建数据目录
    create_data_directories()
    
    print("\n" + "=" * 60)
    print("依赖检查和安装完成")
    print("=" * 60 + "\n")
    
    print("日志已保存到 dependency_check.log")
    
    return True

if __name__ == "__main__":
    main()