#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Kratos检查脚本
用于检查Kratos计算引擎是否正确安装
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
        logging.FileHandler('kratos_check.log', mode='w', encoding='utf-8')
    ]
)
logger = logging.getLogger("KratosChecker")

# 定义颜色
if platform.system() == 'Windows':
    # Windows命令行颜色
    GREEN = ''
    YELLOW = ''
    RED = ''
    BLUE = ''
    RESET = ''
else:
    # ANSI颜色
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    RESET = '\033[0m'

def print_status(message, status, details=None):
    """打印状态信息"""
    if status == "OK":
        status_color = f"{GREEN}[✓]{RESET}"
    elif status == "WARNING":
        status_color = f"{YELLOW}[!]{RESET}"
    elif status == "ERROR":
        status_color = f"{RED}[✗]{RESET}"
    elif status == "INFO":
        status_color = f"{BLUE}[i]{RESET}"
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
    required_version = (3, 7)  # Kratos需要Python 3.7+
    current_version = sys.version_info
    
    if current_version >= required_version:
        # 检查是否是Python 3.13版本
        if current_version.major == 3 and current_version.minor == 13:
            print_status(
                f"Python版本: {sys.version.split()[0]}",
                "OK",
                f"使用Python 3.13，Kratos可能需要适配"
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
                # 尝试从其他属性获取版本信息
                try:
                    version = KratosMultiphysics.BuildType
                    if hasattr(KratosMultiphysics, 'Version'):
                        version = f"{version} {KratosMultiphysics.Version}"
                except AttributeError:
                    version = "未知版本"
        
        print_status("Kratos已安装", "OK", f"版本: {version}")
        
        # 检查Kratos核心模块
        modules = []
        for name in dir(KratosMultiphysics):
            if name.startswith("Kratos") and not name.startswith("KratosMultiphysics"):
                modules.append(name)
        
        print_status("Kratos核心模块", "INFO", f"找到 {len(modules)} 个模块")
        for module in modules[:5]:  # 只显示前5个
            print_status(f"Kratos模块", "INFO", module)
        if len(modules) > 5:
            print_status(f"还有 {len(modules) - 5} 个Kratos模块", "INFO")
        
        # 检查Python版本兼容性
        if sys.version_info.major == 3 and sys.version_info.minor >= 11:
            print_status("Python版本兼容性", "WARNING", f"当前Python版本为{sys.version_info.major}.{sys.version_info.minor}，Kratos可能需要适配")
        
        return True, version
    except ImportError:
        print_status("Kratos未安装", "ERROR", "请参考Kratos官方文档进行安装")
        return False, None
    except Exception as e:
        print_status("Kratos检查失败", "ERROR", str(e))
        return False, None

def check_kratos_applications():
    """检查Kratos应用程序"""
    try:
        import KratosMultiphysics
        
        # 尝试导入常用的Kratos应用
        applications = [
            "StructuralMechanicsApplication",
            "FluidDynamicsApplication",
            "SolidMechanicsApplication",
            "ContactStructuralMechanicsApplication",
            "DEMApplication",
            "GeomechanicsApplication"
        ]
        
        available_apps = []
        missing_apps = []
        
        for app in applications:
            try:
                importlib.import_module(f"KratosMultiphysics.{app}")
                available_apps.append(app)
            except ImportError:
                missing_apps.append(app)
        
        if available_apps:
            print_status(f"找到 {len(available_apps)} 个Kratos应用", "OK")
            for app in available_apps:
                print_status(f"Kratos应用", "INFO", app)
        
        if missing_apps:
            print_status(f"缺少 {len(missing_apps)} 个Kratos应用", "WARNING")
            for app in missing_apps:
                print_status(f"缺少Kratos应用", "WARNING", app)
        
        return True
    except ImportError:
        print_status("无法检查Kratos应用", "ERROR", "Kratos未安装")
        return False
    except Exception as e:
        print_status("检查Kratos应用失败", "ERROR", str(e))
        return False

def check_mpi():
    """检查MPI是否可用"""
    try:
        from mpi4py import MPI
        print_status("MPI可用", "OK", f"MPI4Py版本: {MPI.__version__}")
        
        # 检查MPI实现
        comm = MPI.COMM_WORLD
        size = comm.Get_size()
        rank = comm.Get_rank()
        name = MPI.Get_processor_name()
        
        print_status("MPI配置", "INFO", f"进程数: {size}, 当前进程: {rank}, 处理器名称: {name}")
        
        return True
    except ImportError:
        print_status("MPI不可用", "WARNING", "MPI4Py未安装")
        return False
    except Exception as e:
        print_status("检查MPI失败", "ERROR", str(e))
        return False

def test_kratos_basic():
    """测试Kratos基本功能"""
    print_status("正在测试Kratos基本功能...", "INFO")
    
    test_script = """
import sys
try:
    import KratosMultiphysics
    
    # 创建一个模型部件
    model = KratosMultiphysics.Model()
    model_part = model.CreateModelPart("TestModelPart")
    
    # 添加变量
    model_part.AddNodalSolutionStepVariable(KratosMultiphysics.DISPLACEMENT)
    model_part.AddNodalSolutionStepVariable(KratosMultiphysics.VELOCITY)
    
    # 创建节点
    model_part.CreateNewNode(1, 0.0, 0.0, 0.0)
    model_part.CreateNewNode(2, 1.0, 0.0, 0.0)
    model_part.CreateNewNode(3, 1.0, 1.0, 0.0)
    
    # 创建单元
    model_part.CreateNewElement("Element2D3N", 1, [1, 2, 3], model_part.GetProperties()[1])
    
    # 获取版本信息
    try:
        version = KratosMultiphysics.__version__
    except AttributeError:
        version = "未知版本"
    
    print(f"Kratos基本功能测试成功，版本: {version}")
    print(f"模型部件名称: {model_part.Name}")
    print(f"节点数: {model_part.NumberOfNodes()}")
    print(f"单元数: {model_part.NumberOfElements()}")
    
    sys.exit(0)
except Exception as e:
    print(f"Kratos基本功能测试失败: {str(e)}")
    sys.exit(1)
"""
    
    with open("kratos_test_basic.py", "w", encoding="utf-8") as f:
        f.write(test_script)
    
    success, output = run_command([sys.executable, "kratos_test_basic.py"])
    
    try:
        os.remove("kratos_test_basic.py")
    except:
        pass
    
    if success:
        print_status("Kratos基本功能测试成功", "OK", output.strip())
        return True
    else:
        print_status("Kratos基本功能测试失败", "ERROR", output)
        return False

def check_kratos_wrapper():
    """检查项目中的Kratos包装器"""
    kratos_wrapper_path = "src/core/simulation/terra_wrapper.py"
    
    if os.path.exists(kratos_wrapper_path):
        print_status(f"找到Kratos包装器: {kratos_wrapper_path}", "OK")
        
        # 检查包装器内容
        try:
            with open(kratos_wrapper_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            if "import KratosMultiphysics" in content:
                print_status("Kratos包装器导入了Kratos", "OK")
            else:
                print_status("Kratos包装器可能未正确导入Kratos", "WARNING")
            
            return True
        except Exception as e:
            print_status(f"读取Kratos包装器失败", "ERROR", str(e))
            return False
    else:
        print_status("未找到Kratos包装器", "WARNING", f"期望路径: {kratos_wrapper_path}")
        return False

def check_kratos_environment():
    """检查Kratos环境变量"""
    kratos_env_vars = [
        "KRATOS_PATH",
        "LD_LIBRARY_PATH",
        "PYTHONPATH"
    ]
    
    for var in kratos_env_vars:
        value = os.environ.get(var)
        if value:
            print_status(f"环境变量 {var} 已设置", "OK", f"值: {value}")
        else:
            print_status(f"环境变量 {var} 未设置", "INFO")
    
    return True

def print_kratos_install_guide():
    """打印Kratos安装指南"""
    guide = """
Kratos安装指南:

1. 克隆Kratos仓库:
   git clone https://github.com/KratosMultiphysics/Kratos.git

2. 创建构建目录:
   mkdir build
   cd build

3. 配置CMake:
   cmake -DCMAKE_BUILD_TYPE=Release -DUSE_MPI=ON ..

4. 编译:
   make -j4

5. 安装:
   make install

6. 设置环境变量:
   export KRATOS_PATH=/path/to/kratos
   export PYTHONPATH=$PYTHONPATH:$KRATOS_PATH
   export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:$KRATOS_PATH/libs

详细安装指南请参考: https://github.com/KratosMultiphysics/Kratos/wiki/Installation-guidelines
"""
    
    print_status("Kratos安装指南", "INFO", guide)
    return True

def main():
    """主函数"""
    print("\n" + "=" * 60)
    print("Kratos检查工具")
    print("=" * 60 + "\n")
    
    # 检查Python版本
    if not check_python_version():
        print_status("Python版本不满足要求，请安装Python 3.7或更高版本", "ERROR")
        return False
    
    # 检查pip
    if not check_pip():
        print_status("pip不可用，请安装pip", "ERROR")
        return False
    
    # 检查Kratos
    kratos_available, version = check_kratos()
    
    if kratos_available:
        # 检查Kratos应用
        check_kratos_applications()
        
        # 检查MPI
        check_mpi()
        
        # 测试Kratos基本功能
        test_kratos_basic()
        
        # 检查Kratos环境变量
        check_kratos_environment()
        
        # 检查项目中的Kratos包装器
        check_kratos_wrapper()
    else:
        # 打印Kratos安装指南
        print_kratos_install_guide()
    
    print("\n" + "=" * 60)
    print("Kratos检查完成")
    print("=" * 60 + "\n")
    
    print("日志已保存到 kratos_check.log")
    
    return True

if __name__ == "__main__":
    main() 