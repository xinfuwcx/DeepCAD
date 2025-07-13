#!/usr/bin/env python3
"""
Comprehensive Dependency Management Setup Script
设置完整的依赖管理工具链（Poetry + pnpm）
"""

import os
import sys
import subprocess
import platform
from pathlib import Path


def main():
    """主函数"""
    print("🏗️ DeepCAD Comprehensive Dependency Management Setup")
    print("=" * 60)
    
    project_root = Path(__file__).parent.parent
    scripts_dir = project_root / "scripts"
    
    # Run backend setup
    print("\n📡 Setting up Backend Dependencies (Poetry)...")
    backend_script = scripts_dir / "setup_backend_deps.py"
    result = subprocess.run([sys.executable, str(backend_script)], cwd=project_root)
    
    if result.returncode != 0:
        print("❌ Backend setup failed")
        return 1
    
    # Run frontend setup
    print("\n🎨 Setting up Frontend Dependencies (pnpm)...")
    frontend_script = scripts_dir / "setup_frontend_deps.py"
    result = subprocess.run([sys.executable, str(frontend_script)], cwd=project_root)
    
    if result.returncode != 0:
        print("❌ Frontend setup failed")
        return 1
    
    # Create master lockfile info
    create_lockfile_info(project_root)
    
    print("\n🎉 Complete dependency management setup finished!")
    print("\n" + "=" * 60)
    print("✅ Backend: Poetry + pyproject.toml")
    print("✅ Frontend: pnpm + package.json")
    print("✅ Development scripts created")
    print("✅ VSCode settings configured")
    
    print("\n🚀 Quick Start Commands:")
    print("Backend:  poetry run uvicorn gateway.main:app --reload")
    print("Frontend: cd frontend && pnpm run dev")
    print("Full:     ./scripts/dev_fullstack.sh")
    
    return 0


def create_lockfile_info(project_root):
    """创建锁文件信息文档"""
    lockfile_info = """# Dependency Management Information

## Backend (Python)
- **Package Manager**: Poetry
- **Configuration**: `pyproject.toml`
- **Lock File**: `poetry.lock`
- **Virtual Environment**: `.venv/` (created by Poetry)

### Commands:
```bash
poetry install          # Install dependencies
poetry add <package>    # Add new dependency
poetry run <command>    # Run command in venv
poetry shell           # Activate venv
poetry export -f requirements.txt --output requirements.txt  # Export for deployment
```

## Frontend (TypeScript/React)
- **Package Manager**: pnpm
- **Configuration**: `frontend/package.json`, `frontend/.npmrc`
- **Lock File**: `frontend/pnpm-lock.yaml`
- **Node Modules**: `frontend/node_modules/`

### Commands:
```bash
cd frontend
pnpm install           # Install dependencies
pnpm add <package>     # Add new dependency
pnpm run dev           # Start development server
pnpm run build         # Build for production
pnpm run lint          # Run linter
pnpm run type-check    # Type checking
```

## Development Workflow

### Full Stack Development:
```bash
# Option 1: Run both simultaneously
./scripts/dev_fullstack.sh

# Option 2: Run separately in different terminals
./scripts/dev_backend.sh
./scripts/dev_frontend.sh
```

### Dependency Updates:
```bash
# Backend
poetry update

# Frontend
cd frontend && pnpm update
```

### Troubleshooting:
- Backend dependencies not found: `poetry install`
- Frontend dependencies not found: `cd frontend && pnpm install`
- Lock file conflicts: Delete lock file and reinstall
- Poetry not found: Run `scripts/setup_backend_deps.py`
- pnpm not found: Run `scripts/setup_frontend_deps.py`
"""
    
    with open(project_root / "DEPENDENCY_MANAGEMENT.md", "w") as f:
        f.write(lockfile_info)
    
    print("📝 Created DEPENDENCY_MANAGEMENT.md documentation")


if __name__ == "__main__":
    sys.exit(main())