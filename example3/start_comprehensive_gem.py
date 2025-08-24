"""
启动完整的GEM综合建模系统
Start Complete GEM Comprehensive Modeling System

快速启动脚本，包含错误处理和环境检查
"""

import sys
import os
from pathlib import Path
import warnings

# 添加项目路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

def main():
    """主启动函数"""
    print("="*60)
    print("🌋 GEM综合建模系统 v2.0 启动器")
    print("   Comprehensive Geological Modeling System")
    print("="*60)
    
    try:
        # 导入并运行主程序
        from comprehensive_gem_launcher import main as launcher_main
        return launcher_main()
        
    except ImportError as e:
        print(f"❌ 导入错误: {e}")
        print("\n🔧 请检查以下依赖包是否已安装:")
        print("  • PyQt6 (界面框架)")
        print("  • numpy (数值计算)")
        print("  • pandas (数据处理)")
        print("  • matplotlib (绘图)")
        print("  • pyvista (3D可视化)")
        print("  • scipy (科学计算, 可选)")
        print("\n📦 安装命令:")
        print("  pip install PyQt6 numpy pandas matplotlib pyvista")
        print("  pip install scipy scikit-learn  # 可选高级功能")
        return 1
        
    except Exception as e:
        print(f"❌ 启动失败: {e}")
        print("\n📋 错误详情:")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    sys.exit(main())