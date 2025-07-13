#!/usr/bin/env python3
"""
Backend Dependency Management Setup Script
设置后端依赖管理工具（Poetry）
"""

import os
import sys
import subprocess
import platform
from pathlib import Path


def run_command(cmd, cwd=None, check=True):
    """运行命令并返回结果"""
    print(f"🔧 Running: {cmd}")
    try:
        result = subprocess.run(
            cmd, shell=True, cwd=cwd, check=check, 
            capture_output=True, text=True
        )
        if result.stdout:
            print(result.stdout)
        return result
    except subprocess.CalledProcessError as e:
        print(f"❌ Command failed: {e}")
        if e.stderr:
            print(f"Error: {e.stderr}")
        return None


def check_poetry_installed():
    """检查Poetry是否已安装"""
    result = run_command("poetry --version", check=False)
    return result is not None and result.returncode == 0


def install_poetry():
    """安装Poetry"""
    print("📦 Installing Poetry...")
    
    if platform.system() == "Windows":
        # Windows PowerShell installation
        cmd = '(Invoke-WebRequest -Uri https://install.python-poetry.org -UseBasicParsing).Content | python -'
        result = run_command(f'powershell -Command "{cmd}"', check=False)
    else:
        # Unix/Linux/macOS installation
        cmd = "curl -sSL https://install.python-poetry.org | python3 -"
        result = run_command(cmd, check=False)
    
    if result and result.returncode == 0:
        print("✅ Poetry installed successfully")
        return True
    else:
        print("❌ Failed to install Poetry")
        print("Please install Poetry manually: https://python-poetry.org/docs/#installation")
        return False


def setup_poetry_config():
    """配置Poetry设置"""
    print("⚙️ Configuring Poetry...")
    
    # 配置Poetry在项目目录下创建虚拟环境
    run_command("poetry config virtualenvs.in-project true")
    
    # 配置Poetry使用系统证书（企业环境）
    run_command("poetry config certificates.cert-store system", check=False)
    
    print("✅ Poetry configuration completed")


def setup_backend_dependencies():
    """设置后端依赖"""
    project_root = Path(__file__).parent.parent
    print(f"🏠 Project root: {project_root}")
    
    print("📋 Installing backend dependencies with Poetry...")
    
    # Install dependencies
    result = run_command("poetry install", cwd=project_root)
    if not result or result.returncode != 0:
        print("❌ Failed to install dependencies")
        return False
    
    # Generate requirements.txt for compatibility
    print("📄 Generating requirements.txt for compatibility...")
    run_command("poetry export -f requirements.txt --output requirements-poetry.txt", 
                cwd=project_root, check=False)
    
    # Show installed packages
    print("📦 Installed packages:")
    run_command("poetry show", cwd=project_root, check=False)
    
    return True


def create_dev_scripts():
    """创建开发脚本"""
    project_root = Path(__file__).parent.parent
    scripts_dir = project_root / "scripts"
    
    # Backend development script
    backend_script_content = '''#!/bin/bash
# Backend Development Script
echo "🚀 Starting DeepCAD Backend Development Server..."

# Activate Poetry environment and start FastAPI server
poetry run uvicorn gateway.main:app --reload --host 0.0.0.0 --port 8080
'''
    
    with open(scripts_dir / "dev_backend.sh", "w") as f:
        f.write(backend_script_content)
    
    # Make script executable on Unix systems
    if platform.system() != "Windows":
        os.chmod(scripts_dir / "dev_backend.sh", 0o755)
    
    # Windows batch script
    backend_batch_content = '''@echo off
REM Backend Development Script for Windows
echo 🚀 Starting DeepCAD Backend Development Server...

REM Activate Poetry environment and start FastAPI server
poetry run uvicorn gateway.main:app --reload --host 0.0.0.0 --port 8080
'''
    
    with open(scripts_dir / "dev_backend.bat", "w") as f:
        f.write(backend_batch_content)
    
    print("✅ Development scripts created")


def main():
    """主函数"""
    print("🏗️ DeepCAD Backend Dependency Management Setup")
    print("=" * 50)
    
    # Check if Poetry is installed
    if not check_poetry_installed():
        print("Poetry not found. Installing...")
        if not install_poetry():
            sys.exit(1)
    else:
        print("✅ Poetry is already installed")
    
    # Configure Poetry
    setup_poetry_config()
    
    # Setup dependencies
    if setup_backend_dependencies():
        print("✅ Backend dependencies setup completed")
    else:
        print("❌ Backend dependencies setup failed")
        sys.exit(1)
    
    # Create development scripts
    create_dev_scripts()
    
    print("\n🎉 Backend dependency management setup completed!")
    print("\nNext steps:")
    print("1. Run 'poetry shell' to activate the virtual environment")
    print("2. Run 'poetry run uvicorn gateway.main:app --reload' to start the backend")
    print("3. Or use './scripts/dev_backend.sh' (Unix) or '.\\scripts\\dev_backend.bat' (Windows)")


if __name__ == "__main__":
    main()