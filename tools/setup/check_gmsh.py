#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Gmsh检查脚本
用于检查Gmsh网格划分库是否正确安装
"""

import os
import sys
import subprocess
import platform
import importlib
import logging
from pathlib import Path

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('gmsh_check.log', mode='w', encoding='utf-8')
    ]
)
logger = logging.getLogger("GmshChecker")

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
    required_version = (3, 7)  # Gmsh Python API需要Python 3.7+
    current_version = sys.version_info
    
    if current_version >= required_version:
        # 检查是否是Python 3.13版本
        if current_version.major == 3 and current_version.minor == 13:
            print_status(
                f"Python版本: {sys.version.split()[0]}",
                "OK",
                f"使用Python 3.13，Gmsh可能需要适配"
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

def check_gmsh_python():
    """检查Gmsh Python API是否已安装"""
    try:
        import gmsh
        gmsh.initialize()
        version = gmsh.option.getString("General.Version")
        gmsh.finalize()
        print_status("Gmsh Python API已安装", "OK", f"版本: {version}")
        return True, version
    except ImportError:
        print_status("Gmsh Python API未安装", "ERROR")
        return False, None
    except Exception as e:
        print_status("Gmsh Python API检查失败", "ERROR", str(e))
        return False, None

def check_gmsh_binary():
    """检查Gmsh二进制程序是否可用"""
    # 尝试直接运行gmsh命令
    success, output = run_command(["gmsh", "--version"])
    if success:
        print_status("Gmsh二进制程序可用", "OK", f"版本: {output.strip()}")
        return True, output.strip()
    else:
        # 在Windows上，尝试在Python库路径中查找gmsh.exe
        if platform.system() == 'Windows':
            try:
                import gmsh
                gmsh_module_path = os.path.dirname(gmsh.__file__)
                gmsh_exe_path = os.path.join(gmsh_module_path, "gmsh.exe")
                if os.path.exists(gmsh_exe_path):
                    success, output = run_command([gmsh_exe_path, "--version"])
                    if success:
                        print_status("Gmsh二进制程序可用", "OK", f"版本: {output.strip()}")
                        print_status("Gmsh二进制程序路径", "INFO", gmsh_exe_path)
                        return True, output.strip()
            except ImportError:
                pass
        
        print_status("Gmsh二进制程序不可用", "WARNING", "可能需要手动安装Gmsh")
        return False, None

def install_gmsh():
    """安装Gmsh Python API"""
    print_status("正在安装Gmsh Python API...", "INFO")
    
    success, output = run_command([sys.executable, "-m", "pip", "install", "gmsh"])
    if success:
        print_status("Gmsh Python API安装成功", "OK")
        return True
    else:
        print_status("Gmsh Python API安装失败", "ERROR", output)
        return False

def test_gmsh_basic():
    """测试Gmsh基本功能"""
    print_status("正在测试Gmsh基本功能...", "INFO")
    
    test_script = """
import sys
try:
    import gmsh
    
    gmsh.initialize()
    
    # 创建一个简单的几何体
    gmsh.model.add("test_model")
    
    # 添加一个点
    gmsh.model.geo.addPoint(0, 0, 0, 1.0, 1)
    
    # 同步模型
    gmsh.model.geo.synchronize()
    
    # 获取版本信息
    version = gmsh.option.getString("General.Version")
    
    # 清理
    gmsh.finalize()
    
    print(f"Gmsh基本功能测试成功，版本: {version}")
    sys.exit(0)
except Exception as e:
    print(f"Gmsh基本功能测试失败: {str(e)}")
    sys.exit(1)
"""
    
    with open("gmsh_test_basic.py", "w", encoding="utf-8") as f:
        f.write(test_script)
    
    success, output = run_command([sys.executable, "gmsh_test_basic.py"])
    
    try:
        os.remove("gmsh_test_basic.py")
    except:
        pass
    
    if success:
        print_status("Gmsh基本功能测试成功", "OK", output.strip())
        return True
    else:
        print_status("Gmsh基本功能测试失败", "ERROR", output)
        return False

def test_gmsh_meshing():
    """测试Gmsh网格划分功能"""
    print_status("正在测试Gmsh网格划分功能...", "INFO")
    
    test_script = """
import sys
try:
    import gmsh
    import os
    
    gmsh.initialize()
    
    # 创建一个简单的几何体（立方体）
    gmsh.model.add("cube")
    
    # 添加点
    gmsh.model.geo.addPoint(0, 0, 0, 1.0, 1)
    gmsh.model.geo.addPoint(1, 0, 0, 1.0, 2)
    gmsh.model.geo.addPoint(1, 1, 0, 1.0, 3)
    gmsh.model.geo.addPoint(0, 1, 0, 1.0, 4)
    gmsh.model.geo.addPoint(0, 0, 1, 1.0, 5)
    gmsh.model.geo.addPoint(1, 0, 1, 1.0, 6)
    gmsh.model.geo.addPoint(1, 1, 1, 1.0, 7)
    gmsh.model.geo.addPoint(0, 1, 1, 1.0, 8)
    
    # 添加线
    gmsh.model.geo.addLine(1, 2, 1)
    gmsh.model.geo.addLine(2, 3, 2)
    gmsh.model.geo.addLine(3, 4, 3)
    gmsh.model.geo.addLine(4, 1, 4)
    gmsh.model.geo.addLine(5, 6, 5)
    gmsh.model.geo.addLine(6, 7, 6)
    gmsh.model.geo.addLine(7, 8, 7)
    gmsh.model.geo.addLine(8, 5, 8)
    gmsh.model.geo.addLine(1, 5, 9)
    gmsh.model.geo.addLine(2, 6, 10)
    gmsh.model.geo.addLine(3, 7, 11)
    gmsh.model.geo.addLine(4, 8, 12)
    
    # 添加曲面
    gmsh.model.geo.addCurveLoop([1, 2, 3, 4], 1)
    gmsh.model.geo.addPlaneSurface([1], 1)
    gmsh.model.geo.addCurveLoop([5, 6, 7, 8], 2)
    gmsh.model.geo.addPlaneSurface([2], 2)
    gmsh.model.geo.addCurveLoop([1, 10, -5, -9], 3)
    gmsh.model.geo.addPlaneSurface([3], 3)
    gmsh.model.geo.addCurveLoop([2, 11, -6, -10], 4)
    gmsh.model.geo.addPlaneSurface([4], 4)
    gmsh.model.geo.addCurveLoop([3, 12, -7, -11], 5)
    gmsh.model.geo.addPlaneSurface([5], 5)
    gmsh.model.geo.addCurveLoop([4, 9, -8, -12], 6)
    gmsh.model.geo.addPlaneSurface([6], 6)
    
    # 添加体积
    gmsh.model.geo.addSurfaceLoop([1, 2, 3, 4, 5, 6], 1)
    gmsh.model.geo.addVolume([1], 1)
    
    # 同步模型
    gmsh.model.geo.synchronize()
    
    # 生成网格
    gmsh.model.mesh.generate(3)
    
    # 获取网格信息
    nodes = gmsh.model.mesh.getNodes()
    elements = gmsh.model.mesh.getElements()
    
    num_nodes = len(nodes[0])
    num_elements = sum(len(elem[0]) for elem in elements)
    
    # 保存网格到临时文件
    temp_mesh_file = "temp_mesh.msh"
    gmsh.write(temp_mesh_file)
    
    # 检查文件是否创建成功
    file_exists = os.path.exists(temp_mesh_file)
    file_size = os.path.getsize(temp_mesh_file) if file_exists else 0
    
    # 清理临时文件
    if file_exists:
        os.remove(temp_mesh_file)
    
    # 清理
    gmsh.finalize()
    
    print(f"Gmsh网格划分测试成功")
    print(f"节点数: {num_nodes}, 单元数: {num_elements}")
    print(f"网格文件创建: {'成功' if file_exists else '失败'}, 文件大小: {file_size} 字节")
    
    sys.exit(0)
except Exception as e:
    print(f"Gmsh网格划分测试失败: {str(e)}")
    sys.exit(1)
"""
    
    with open("gmsh_test_meshing.py", "w", encoding="utf-8") as f:
        f.write(test_script)
    
    success, output = run_command([sys.executable, "gmsh_test_meshing.py"])
    
    try:
        os.remove("gmsh_test_meshing.py")
    except:
        pass
    
    if success:
        print_status("Gmsh网格划分测试成功", "OK", output.strip())
        return True
    else:
        print_status("Gmsh网格划分测试失败", "ERROR", output)
        return False

def check_gmsh_wrapper():
    """检查项目中的Gmsh包装器"""
    gmsh_wrapper_path = "src/core/meshing/gmsh_wrapper.py"
    
    if os.path.exists(gmsh_wrapper_path):
        print_status(f"找到Gmsh包装器: {gmsh_wrapper_path}", "OK")
        
        # 检查包装器内容
        try:
            with open(gmsh_wrapper_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            if "import gmsh" in content:
                print_status("Gmsh包装器导入了Gmsh", "OK")
            else:
                print_status("Gmsh包装器可能未正确导入Gmsh", "WARNING")
            
            return True
        except Exception as e:
            print_status(f"读取Gmsh包装器失败", "ERROR", str(e))
            return False
    else:
        print_status("未找到Gmsh包装器", "WARNING", f"期望路径: {gmsh_wrapper_path}")
        return False

def main():
    """主函数"""
    print("\n" + "=" * 60)
    print("Gmsh检查工具")
    print("=" * 60 + "\n")
    
    # 检查Python版本
    if not check_python_version():
        print_status("Python版本不满足要求，请安装Python 3.7或更高版本", "ERROR")
        return False
    
    # 检查pip
    if not check_pip():
        print_status("pip不可用，请安装pip", "ERROR")
        return False
    
    # 检查Gmsh Python API
    gmsh_python_available, python_version = check_gmsh_python()
    
    # 检查Gmsh二进制程序
    gmsh_binary_available, binary_version = check_gmsh_binary()
    
    # 如果Gmsh Python API未安装，询问是否安装
    if not gmsh_python_available:
        try:
            response = input("是否安装Gmsh Python API? (y/n): ")
            if response.lower() == 'y':
                if install_gmsh():
                    gmsh_python_available, python_version = check_gmsh_python()
            else:
                print_status("用户选择不安装Gmsh Python API", "INFO")
        except KeyboardInterrupt:
            print("\n用户取消操作")
    
    # 如果Gmsh Python API可用，测试基本功能
    if gmsh_python_available:
        test_gmsh_basic()
        test_gmsh_meshing()
    
    # 检查项目中的Gmsh包装器
    check_gmsh_wrapper()
    
    print("\n" + "=" * 60)
    print("Gmsh检查完成")
    print("=" * 60 + "\n")
    
    print("日志已保存到 gmsh_check.log")
    
    return True

if __name__ == "__main__":
    main() 