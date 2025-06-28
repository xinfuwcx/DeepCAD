#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
PyTorch检查脚本
用于检查PyTorch是否正确安装，以及是否支持GPU加速
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
        logging.FileHandler('pytorch_check.log', mode='w', encoding='utf-8')
    ]
)
logger = logging.getLogger("PyTorchChecker")

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
    required_version = (3, 7)  # PyTorch需要Python 3.7+
    current_version = sys.version_info
    
    if current_version >= required_version:
        # 检查是否是Python 3.13版本
        if current_version.major == 3 and current_version.minor == 13:
            print_status(
                f"Python版本: {sys.version.split()[0]}",
                "OK",
                f"使用Python 3.13，PyTorch可能需要特殊版本"
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

def check_pytorch():
    """检查PyTorch是否已安装"""
    try:
        import torch
        version = torch.__version__
        print_status("PyTorch已安装", "OK", f"版本: {version}")
        
        # 检查CUDA支持
        cuda_available = torch.cuda.is_available()
        if cuda_available:
            cuda_version = torch.version.cuda
            device_count = torch.cuda.device_count()
            device_names = [torch.cuda.get_device_name(i) for i in range(device_count)]
            
            print_status("CUDA可用", "OK", f"CUDA版本: {cuda_version}, 设备数: {device_count}")
            for i, name in enumerate(device_names):
                print_status(f"CUDA设备 {i}", "INFO", name)
        else:
            print_status("CUDA不可用", "WARNING", "PyTorch将使用CPU模式")
        
        # 检查Python版本兼容性
        if sys.version_info.major == 3 and sys.version_info.minor >= 11:
            print_status("Python版本兼容性", "INFO", f"当前Python版本为{sys.version_info.major}.{sys.version_info.minor}")
            
            # 对于Python 3.13，提供特别说明
            if sys.version_info.minor == 13:
                print_status("Python 3.13兼容性", "WARNING", "PyTorch可能尚未完全支持Python 3.13，如果遇到问题，请考虑使用较低版本的Python")
        
        return True, version, cuda_available
    except ImportError:
        print_status("PyTorch未安装", "ERROR")
        return False, None, False
    except Exception as e:
        print_status("PyTorch检查失败", "ERROR", str(e))
        return False, None, False

def check_torchvision():
    """检查torchvision是否已安装"""
    try:
        import torchvision
        version = torchvision.__version__
        print_status("torchvision已安装", "OK", f"版本: {version}")
        return True, version
    except ImportError:
        print_status("torchvision未安装", "WARNING")
        return False, None
    except Exception as e:
        print_status("torchvision检查失败", "WARNING", str(e))
        return False, None

def check_torchaudio():
    """检查torchaudio是否已安装"""
    try:
        import torchaudio
        version = torchaudio.__version__
        print_status("torchaudio已安装", "OK", f"版本: {version}")
        return True, version
    except ImportError:
        print_status("torchaudio未安装", "INFO", "对于深基坑分析非必需")
        return False, None
    except Exception as e:
        print_status("torchaudio检查失败", "INFO", str(e))
        return False, None

def install_pytorch(with_cuda=True):
    """安装PyTorch"""
    print_status("正在安装PyTorch...", "INFO")
    
    # 根据系统和Python版本选择安装命令
    python_version = f"{sys.version_info.major}.{sys.version_info.minor}"
    
    # 对于Python 3.13，可能需要特殊处理
    if sys.version_info.major == 3 and sys.version_info.minor == 13:
        print_status("检测到Python 3.13", "WARNING", "PyTorch可能尚未完全支持此版本，尝试安装预发布版本")
        if with_cuda:
            cmd = [sys.executable, "-m", "pip", "install", "--pre", "torch", "torchvision", "torchaudio"]
        else:
            cmd = [sys.executable, "-m", "pip", "install", "--pre", "torch", "torchvision", "torchaudio", "--index-url", "https://download.pytorch.org/whl/cpu"]
    else:
        # 正常安装
        if with_cuda:
            if platform.system() == 'Windows':
                cmd = [sys.executable, "-m", "pip", "install", "torch", "torchvision", "torchaudio", "--index-url", "https://download.pytorch.org/whl/cu118"]
            else:
                cmd = [sys.executable, "-m", "pip", "install", "torch", "torchvision", "torchaudio"]
        else:
            if platform.system() == 'Windows':
                cmd = [sys.executable, "-m", "pip", "install", "torch", "torchvision", "torchaudio", "--index-url", "https://download.pytorch.org/whl/cpu"]
            else:
                cmd = [sys.executable, "-m", "pip", "install", "torch", "torchvision", "torchaudio", "--index-url", "https://download.pytorch.org/whl/cpu"]
    
    success, output = run_command(cmd)
    if success:
        print_status("PyTorch安装成功", "OK")
        return True
    else:
        print_status("PyTorch安装失败", "ERROR", output)
        return False

def test_pytorch_basic():
    """测试PyTorch基本功能"""
    print_status("正在测试PyTorch基本功能...", "INFO")
    
    test_script = """
import sys
try:
    import torch
    import torch.nn as nn
    import torch.optim as optim
    
    # 创建一个简单的神经网络
    class SimpleNet(nn.Module):
        def __init__(self):
            super(SimpleNet, self).__init__()
            self.fc = nn.Linear(10, 5)
            self.relu = nn.ReLU()
            self.fc2 = nn.Linear(5, 2)
            
        def forward(self, x):
            x = self.fc(x)
            x = self.relu(x)
            x = self.fc2(x)
            return x
    
    # 创建模型实例
    model = SimpleNet()
    
    # 创建一些随机数据
    x = torch.randn(3, 10)
    
    # 前向传播
    output = model(x)
    
    # 检查输出形状
    expected_shape = (3, 2)
    actual_shape = tuple(output.shape)
    
    # 获取版本信息
    version = torch.__version__
    
    print(f"PyTorch基本功能测试成功，版本: {version}")
    print(f"输出形状: {actual_shape}, 期望形状: {expected_shape}")
    print(f"模型摘要: {model}")
    
    sys.exit(0)
except Exception as e:
    print(f"PyTorch基本功能测试失败: {str(e)}")
    sys.exit(1)
"""
    
    with open("pytorch_test_basic.py", "w", encoding="utf-8") as f:
        f.write(test_script)
    
    success, output = run_command([sys.executable, "pytorch_test_basic.py"])
    
    try:
        os.remove("pytorch_test_basic.py")
    except:
        pass
    
    if success:
        print_status("PyTorch基本功能测试成功", "OK", output.strip())
        return True
    else:
        print_status("PyTorch基本功能测试失败", "ERROR", output)
        return False

def test_pytorch_cuda():
    """测试PyTorch CUDA功能"""
    print_status("正在测试PyTorch CUDA功能...", "INFO")
    
    test_script = """
import sys
try:
    import torch
    
    # 检查CUDA是否可用
    cuda_available = torch.cuda.is_available()
    if not cuda_available:
        print("CUDA不可用，跳过CUDA测试")
        sys.exit(0)
    
    # 获取CUDA设备信息
    device_count = torch.cuda.device_count()
    device_names = [torch.cuda.get_device_name(i) for i in range(device_count)]
    
    # 创建一个张量并移动到GPU
    x = torch.randn(1000, 1000)
    device = torch.device("cuda:0")
    x_gpu = x.to(device)
    
    # 在GPU上执行一些操作
    y_gpu = x_gpu @ x_gpu.t()
    
    # 将结果移回CPU
    y_cpu = y_gpu.to("cpu")
    
    # 检查结果
    y_expected = x @ x.t()
    max_diff = (y_cpu - y_expected).abs().max().item()
    
    print(f"PyTorch CUDA功能测试成功")
    print(f"CUDA设备数: {device_count}")
    for i, name in enumerate(device_names):
        print(f"CUDA设备 {i}: {name}")
    print(f"CPU和GPU计算结果最大差异: {max_diff}")
    
    sys.exit(0)
except Exception as e:
    print(f"PyTorch CUDA功能测试失败: {str(e)}")
    sys.exit(1)
"""
    
    with open("pytorch_test_cuda.py", "w", encoding="utf-8") as f:
        f.write(test_script)
    
    success, output = run_command([sys.executable, "pytorch_test_cuda.py"])
    
    try:
        os.remove("pytorch_test_cuda.py")
    except:
        pass
    
    if success:
        if "CUDA不可用" in output:
            print_status("PyTorch CUDA测试跳过", "INFO", "CUDA不可用")
        else:
            print_status("PyTorch CUDA功能测试成功", "OK", output.strip())
        return True
    else:
        print_status("PyTorch CUDA功能测试失败", "ERROR", output)
        return False

def check_pytorch_usage():
    """检查项目中的PyTorch使用情况"""
    pytorch_files = []
    
    # 搜索.py文件
    for root, _, files in os.walk("."):
        for file in files:
            if file.endswith(".py"):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        if "import torch" in content or "from torch" in content:
                            rel_path = os.path.relpath(file_path)
                            pytorch_files.append(rel_path)
                except Exception as e:
                    print_status(f"读取文件 {file_path} 失败", "ERROR", str(e))
    
    if pytorch_files:
        print_status(f"找到 {len(pytorch_files)} 个文件使用了PyTorch", "OK")
        for file_path in pytorch_files[:5]:  # 只显示前5个
            print_status(f"文件使用PyTorch", "INFO", file_path)
        if len(pytorch_files) > 5:
            print_status(f"还有 {len(pytorch_files) - 5} 个文件使用了PyTorch", "INFO")
        return True
    else:
        print_status("未找到PyTorch使用", "WARNING", "项目可能未使用PyTorch")
        return False

def main():
    """主函数"""
    print("\n" + "=" * 60)
    print("PyTorch检查工具")
    print("=" * 60 + "\n")
    
    # 检查Python版本
    if not check_python_version():
        print_status("Python版本不满足要求，请安装Python 3.7或更高版本", "ERROR")
        return False
    
    # 检查pip
    if not check_pip():
        print_status("pip不可用，请安装pip", "ERROR")
        return False
    
    # 检查PyTorch
    pytorch_available, version, cuda_available = check_pytorch()
    
    if pytorch_available:
        # 检查torchvision和torchaudio
        check_torchvision()
        check_torchaudio()
        
        # 测试PyTorch基本功能
        test_pytorch_basic()
        
        # 测试PyTorch CUDA功能
        if cuda_available:
            test_pytorch_cuda()
        
        # 检查项目中的PyTorch使用情况
        check_pytorch_usage()
    else:
        # 询问是否安装PyTorch
        try:
            response = input("是否安装PyTorch? (y/n): ")
            if response.lower() == 'y':
                cuda_response = input("是否安装带CUDA支持的PyTorch? (y/n): ")
                with_cuda = cuda_response.lower() == 'y'
                
                if install_pytorch(with_cuda):
                    pytorch_available, version, cuda_available = check_pytorch()
                    if pytorch_available:
                        test_pytorch_basic()
                        if cuda_available:
                            test_pytorch_cuda()
            else:
                print_status("用户选择不安装PyTorch", "INFO")
        except KeyboardInterrupt:
            print("\n用户取消操作")
    
    print("\n" + "=" * 60)
    print("PyTorch检查完成")
    print("=" * 60 + "\n")
    
    print("日志已保存到 pytorch_check.log")
    
    return True

if __name__ == "__main__":
    main()