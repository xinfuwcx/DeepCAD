"""
GemPy Professional Interface Launcher
专业地质隐式建模系统启动器
"""

import sys
import os
from pathlib import Path

# Add project path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

def main():
    """Launch GemPy professional interface"""
    print("=" * 60)
    print("GemPy Professional - 专业地质隐式建模系统")
    print("三维地质隐式建模 + PyVista专业可视化")
    print("=" * 60)
    
    try:
        from gempy_professional_interface import main as gempy_main
        return gempy_main()
        
    except ImportError as e:
        print(f"导入错误: {e}")
        print("\n需要安装以下包:")
        print("  pip install PyQt6 numpy pandas matplotlib pyvista gempy")
        return 1
        
    except Exception as e:
        print(f"启动失败: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    sys.exit(main())