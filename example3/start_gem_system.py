#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
GEM隐式建模系统启动器
Simple launcher for GEM Implicit Modeling System
"""

import sys
import os
from pathlib import Path

# 添加当前目录到Python路径
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

def main():
    """启动GEM隐式建模系统"""
    print("启动GEM隐式建模系统...")
    
    try:
        # 导入并运行主系统
        from gem_implicit_modeling_system import main as gem_main
        return gem_main()
        
    except ImportError as e:
        print(f"[ERROR] 导入错误: {e}")
        print("请确保所有依赖包已正确安装")
        return 1
        
    except Exception as e:
        print(f"[ERROR] 启动失败: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)