#!/usr/bin/env python3
"""
Frontend Dependency Management Setup Script
设置前端依赖管理工具（pnpm）
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


def check_node_installed():
    """检查Node.js是否已安装"""
    result = run_command("node --version", check=False)
    if result and result.returncode == 0:
        version = result.stdout.strip()
        print(f"✅ Node.js {version} is installed")
        return True
    else:
        print("❌ Node.js not found")
        return False


def check_pnpm_installed():
    """检查pnpm是否已安装"""
    result = run_command("pnpm --version", check=False)
    if result and result.returncode == 0:
        version = result.stdout.strip()
        print(f"✅ pnpm {version} is installed")
        return True
    else:
        print("❌ pnpm not found")
        return False


def install_pnpm():
    """安装pnpm"""
    print("📦 Installing pnpm...")
    
    # Try installing via npm first
    result = run_command("npm install -g pnpm", check=False)
    
    if result and result.returncode == 0:
        print("✅ pnpm installed successfully via npm")
        return True
    
    # Try alternative installation method
    if platform.system() == "Windows":
        print("Trying PowerShell installation...")
        cmd = "iwr https://get.pnpm.io/install.ps1 -useb | iex"
        result = run_command(f'powershell -Command "{cmd}"', check=False)
    else:
        print("Trying curl installation...")
        cmd = "curl -fsSL https://get.pnpm.io/install.sh | sh -"
        result = run_command(cmd, check=False)
    
    if result and result.returncode == 0:
        print("✅ pnpm installed successfully")
        return True
    else:
        print("❌ Failed to install pnpm")
        print("Please install pnpm manually: https://pnpm.io/installation")
        return False


def setup_frontend_dependencies():
    """设置前端依赖"""
    project_root = Path(__file__).parent.parent
    frontend_dir = project_root / "frontend"
    
    print(f"🏠 Frontend directory: {frontend_dir}")
    
    if not frontend_dir.exists():
        print("❌ Frontend directory not found")
        return False
    
    print("📋 Installing frontend dependencies with pnpm...")
    
    # Remove existing node_modules and package-lock.json to ensure clean install
    node_modules = frontend_dir / "node_modules"
    package_lock = frontend_dir / "package-lock.json"
    
    if node_modules.exists():
        print("🧹 Removing existing node_modules...")
        run_command(f"rm -rf {node_modules}", check=False)
    
    if package_lock.exists():
        print("🧹 Removing package-lock.json (switching to pnpm)...")
        package_lock.unlink()
    
    # Install dependencies with pnpm
    result = run_command("pnpm install", cwd=frontend_dir)
    if not result or result.returncode != 0:
        print("❌ Failed to install frontend dependencies")
        return False
    
    # Show installed packages
    print("📦 Installed packages:")
    run_command("pnpm list", cwd=frontend_dir, check=False)
    
    return True


def create_frontend_scripts():
    """创建前端开发脚本"""
    project_root = Path(__file__).parent.parent
    scripts_dir = project_root / "scripts"
    
    # Frontend development script
    frontend_script_content = '''#!/bin/bash
# Frontend Development Script
echo "🚀 Starting DeepCAD Frontend Development Server..."

cd frontend
pnpm run dev
'''
    
    with open(scripts_dir / "dev_frontend.sh", "w") as f:
        f.write(frontend_script_content)
    
    # Make script executable on Unix systems
    if platform.system() != "Windows":
        os.chmod(scripts_dir / "dev_frontend.sh", 0o755)
    
    # Windows batch script
    frontend_batch_content = '''@echo off
REM Frontend Development Script for Windows
echo 🚀 Starting DeepCAD Frontend Development Server...

cd frontend
pnpm run dev
'''
    
    with open(scripts_dir / "dev_frontend.bat", "w") as f:
        f.write(frontend_batch_content)
    
    # Combined development script
    combined_script_content = '''#!/bin/bash
# Combined Development Script
echo "🚀 Starting DeepCAD Full Stack Development..."

# Function to handle cleanup
cleanup() {
    echo "🛑 Shutting down servers..."
    jobs -p | xargs kill
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start backend in background
echo "📡 Starting backend..."
cd "$(dirname "$0")/.."
poetry run uvicorn gateway.main:app --reload --host 0.0.0.0 --port 8080 &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend in background
echo "🎨 Starting frontend..."
cd frontend
pnpm run dev &
FRONTEND_PID=$!

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
'''
    
    with open(scripts_dir / "dev_fullstack.sh", "w") as f:
        f.write(combined_script_content)
    
    if platform.system() != "Windows":
        os.chmod(scripts_dir / "dev_fullstack.sh", 0o755)
    
    print("✅ Frontend development scripts created")


def setup_vscode_settings():
    """设置VSCode工作区配置"""
    project_root = Path(__file__).parent.parent
    vscode_dir = project_root / ".vscode"
    vscode_dir.mkdir(exist_ok=True)
    
    # Settings for better pnpm integration
    settings_content = {
        "typescript.preferences.includePackageJsonAutoImports": "on",
        "typescript.suggest.autoImports": True,
        "eslint.packageManager": "pnpm",
        "npm.packageManager": "pnpm",
        "eslint.workingDirectories": ["frontend"],
        "files.associations": {
            "pnpm-lock.yaml": "yaml"
        },
        "search.exclude": {
            "**/node_modules": True,
            "**/pnpm-lock.yaml": True,
            "**/.venv": True,
            "**/poetry.lock": True
        }
    }
    
    import json
    with open(vscode_dir / "settings.json", "w") as f:
        json.dump(settings_content, f, indent=2)
    
    print("✅ VSCode workspace settings configured")


def main():
    """主函数"""
    print("🏗️ DeepCAD Frontend Dependency Management Setup")
    print("=" * 50)
    
    # Check Node.js
    if not check_node_installed():
        print("Please install Node.js first: https://nodejs.org/")
        sys.exit(1)
    
    # Check if pnpm is installed
    if not check_pnpm_installed():
        print("pnpm not found. Installing...")
        if not install_pnpm():
            sys.exit(1)
    
    # Setup dependencies
    if setup_frontend_dependencies():
        print("✅ Frontend dependencies setup completed")
    else:
        print("❌ Frontend dependencies setup failed")
        sys.exit(1)
    
    # Create development scripts
    create_frontend_scripts()
    
    # Setup VSCode configuration
    setup_vscode_settings()
    
    print("\n🎉 Frontend dependency management setup completed!")
    print("\nNext steps:")
    print("1. Run 'cd frontend && pnpm run dev' to start the frontend")
    print("2. Or use './scripts/dev_frontend.sh' (Unix) or '.\\scripts\\dev_frontend.bat' (Windows)")
    print("3. For full-stack development, use './scripts/dev_fullstack.sh'")
    print("\nAvailable pnpm commands:")
    print("- pnpm run dev          # Start development server")
    print("- pnpm run build        # Build for production")
    print("- pnpm run lint         # Run linter")
    print("- pnpm run type-check   # Type checking")
    print("- pnpm run format       # Format code with Prettier")


if __name__ == "__main__":
    main()