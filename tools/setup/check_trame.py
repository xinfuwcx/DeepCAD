#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Trame检查脚本
用于检查Trame可视化框架是否正确安装
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
        logging.FileHandler('trame_check.log', mode='w', encoding='utf-8')
    ]
)
logger = logging.getLogger("TrameChecker")

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
    required_version = (3, 7)  # Trame需要Python 3.7+
    current_version = sys.version_info
    
    if current_version >= required_version:
        # 检查是否是Python 3.13版本
        if current_version.major == 3 and current_version.minor == 13:
            print_status(
                f"Python版本: {sys.version.split()[0]}",
                "WARNING",
                f"使用Python 3.13，Trame可能需要适配"
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

def check_trame_installed():
    """检查Trame是否已安装"""
    try:
        import trame
        print_status("Trame已安装", "OK")
        
        # 获取版本
        try:
            version = trame.__version__
            print_status("Trame版本", "OK", f"版本: {version}")
        except AttributeError:
            print_status("无法获取Trame版本", "WARNING")
        
        return True
    except ImportError:
        print_status("Trame未安装", "ERROR")
        return False

def check_trame_components():
    """检查Trame组件是否已安装"""
    components = [
        "trame.app",
        "trame.ui.vuetify",
        "trame.widgets.vtk",
        "trame.widgets.matplotlib"
    ]
    
    all_installed = True
    
    for component in components:
        try:
            module = importlib.import_module(component)
            print_status(f"{component}已安装", "OK")
        except ImportError:
            print_status(f"{component}未安装", "WARNING")
            all_installed = False
    
    return all_installed

def check_vtk_installed():
    """检查VTK是否已安装"""
    try:
        import vtk
        print_status("VTK已安装", "OK")
        
        # 获取版本
        try:
            version = vtk.vtkVersion.GetVTKVersion()
            print_status("VTK版本", "OK", f"版本: {version}")
        except AttributeError:
            print_status("无法获取VTK版本", "WARNING")
        
        return True
    except ImportError:
        print_status("VTK未安装", "WARNING", "Trame的VTK组件可能无法使用")
        return False

def check_matplotlib_installed():
    """检查Matplotlib是否已安装"""
    try:
        import matplotlib
        print_status("Matplotlib已安装", "OK")
        
        # 获取版本
        try:
            version = matplotlib.__version__
            print_status("Matplotlib版本", "OK", f"版本: {version}")
        except AttributeError:
            print_status("无法获取Matplotlib版本", "WARNING")
        
        return True
    except ImportError:
        print_status("Matplotlib未安装", "WARNING", "Trame的Matplotlib组件可能无法使用")
        return False

def check_trame_server():
    """检查项目中的Trame服务器"""
    trame_server_path = "src/core/trame_server.py"
    
    if os.path.exists(trame_server_path):
        print_status(f"找到Trame服务器: {trame_server_path}", "OK")
        
        # 检查服务器内容
        try:
            with open(trame_server_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            if "import trame" in content:
                print_status("Trame服务器导入了Trame", "OK")
            else:
                print_status("Trame服务器可能未正确导入Trame", "WARNING")
            
            return True
        except Exception as e:
            print_status(f"读取Trame服务器失败", "ERROR", str(e))
            return False
    else:
        print_status("未找到Trame服务器", "WARNING", f"期望路径: {trame_server_path}")
        return False

def install_trame():
    """安装Trame"""
    print_status("正在安装Trame...", "INFO")
    
    # 安装Trame核心
    success, output = run_command([sys.executable, "-m", "pip", "install", "trame"])
    if not success:
        print_status("Trame安装失败", "ERROR", output)
        return False
    
    # 安装Trame组件
    components = [
        "trame-client",
        "trame-server",
        "trame-vtk",
        "trame-vuetify",
        "trame-matplotlib"
    ]
    
    for component in components:
        print_status(f"正在安装{component}...", "INFO")
        success, output = run_command([sys.executable, "-m", "pip", "install", component])
        if not success:
            print_status(f"{component}安装失败", "WARNING", output)
    
    # 安装VTK和Matplotlib
    print_status("正在安装VTK...", "INFO")
    success, output = run_command([sys.executable, "-m", "pip", "install", "vtk"])
    if not success:
        print_status("VTK安装失败", "WARNING", output)
    
    print_status("正在安装Matplotlib...", "INFO")
    success, output = run_command([sys.executable, "-m", "pip", "install", "matplotlib"])
    if not success:
        print_status("Matplotlib安装失败", "WARNING", output)
    
    print_status("Trame及其组件安装完成", "OK")
    return True

def test_trame_basic():
    """测试Trame基本功能"""
    print_status("正在测试Trame基本功能...", "INFO")
    
    test_script = """
import sys
try:
    from trame.app import get_server
    from trame.ui.vuetify import SinglePageLayout
    
    # 创建服务器
    server = get_server()
    
    # 创建UI
    with SinglePageLayout(server) as layout:
        layout.title.set_text("Trame测试")
        with layout.content:
            layout.html.div("Trame测试成功", style="color: green; font-weight: bold;")
    
    print("Trame基本功能测试成功")
    sys.exit(0)
except Exception as e:
    print(f"Trame基本功能测试失败: {str(e)}")
    sys.exit(1)
"""
    
    with open("trame_test_basic.py", "w", encoding="utf-8") as f:
        f.write(test_script)
    
    success, output = run_command([sys.executable, "trame_test_basic.py"])
    
    try:
        os.remove("trame_test_basic.py")
    except:
        pass
    
    if success:
        print_status("Trame基本功能测试成功", "OK", output.strip())
        return True
    else:
        print_status("Trame基本功能测试失败", "ERROR", output)
        return False

def test_trame_vtk():
    """测试Trame VTK功能"""
    print_status("正在测试Trame VTK功能...", "INFO")
    
    test_script = """
import sys
try:
    from trame.app import get_server
    from trame.ui.vuetify import SinglePageLayout
    from trame.widgets.vtk import VtkLocalView
    import vtk
    
    # 创建VTK管道
    cone = vtk.vtkConeSource()
    mapper = vtk.vtkPolyDataMapper()
    mapper.SetInputConnection(cone.GetOutputPort())
    actor = vtk.vtkActor()
    actor.SetMapper(mapper)
    
    renderer = vtk.vtkRenderer()
    renderer.AddActor(actor)
    renderer.SetBackground(0.5, 0.5, 0.5)
    
    # 创建服务器
    server = get_server()
    
    # 创建UI
    with SinglePageLayout(server) as layout:
        layout.title.set_text("Trame VTK测试")
        with layout.content:
            view = VtkLocalView(renderer)
    
    print("Trame VTK功能测试成功")
    sys.exit(0)
except Exception as e:
    print(f"Trame VTK功能测试失败: {str(e)}")
    sys.exit(1)
"""
    
    with open("trame_test_vtk.py", "w", encoding="utf-8") as f:
        f.write(test_script)
    
    success, output = run_command([sys.executable, "trame_test_vtk.py"])
    
    try:
        os.remove("trame_test_vtk.py")
    except:
        pass
    
    if success:
        print_status("Trame VTK功能测试成功", "OK", output.strip())
        return True
    else:
        print_status("Trame VTK功能测试失败", "ERROR", output)
        return False

def main():
    """主函数"""
    print("\n" + "=" * 60)
    print("Trame检查工具")
    print("=" * 60 + "\n")
    
    # 检查Python版本
    if not check_python_version():
        print_status("Python版本不满足要求，请安装Python 3.7或更高版本", "ERROR")
        return False
    
    # 检查pip
    if not check_pip():
        print_status("pip不可用，请安装pip", "ERROR")
        return False
    
    # 检查Trame是否已安装
    trame_installed = check_trame_installed()
    
    # 检查Trame组件是否已安装
    if trame_installed:
        trame_components_installed = check_trame_components()
    else:
        trame_components_installed = False
    
    # 检查VTK是否已安装
    vtk_installed = check_vtk_installed()
    
    # 检查Matplotlib是否已安装
    matplotlib_installed = check_matplotlib_installed()
    
    # 检查项目中的Trame服务器
    trame_server_exists = check_trame_server()
    
    # 如果Trame未安装，询问是否安装
    if not trame_installed:
        try:
            response = input("是否安装Trame及其组件? (y/n): ")
            if response.lower() == 'y':
                if install_trame():
                    trame_installed = check_trame_installed()
                    if trame_installed:
                        trame_components_installed = check_trame_components()
                        vtk_installed = check_vtk_installed()
                        matplotlib_installed = check_matplotlib_installed()
            else:
                print_status("用户选择不安装Trame", "INFO")
        except KeyboardInterrupt:
            print("\n用户取消操作")
    
    # 如果Trame已安装，测试基本功能
    if trame_installed:
        test_trame_basic()
        if vtk_installed:
            test_trame_vtk()
    
    print("\n" + "=" * 60)
    print("Trame检查完成")
    print("=" * 60 + "\n")
    
    print("日志已保存到 trame_check.log")
    
    return True

if __name__ == "__main__":
    main() 