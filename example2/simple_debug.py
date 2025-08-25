#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
from pathlib import Path

# 添加路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

print("开始简单调试...")

try:
    print("1. 导入PreProcessor...")
    from modules.preprocessor import PreProcessor
    print("✅ PreProcessor导入成功")
    
    print("2. 检查PyVista...")
    import pyvista as pv
    print(f"✅ PyVista版本: {pv.__version__}")
    
    print("3. 创建QApplication...")
    from PyQt6.QtWidgets import QApplication
    app = QApplication([])
    print("✅ QApplication创建成功")

    print("4. 创建PreProcessor实例...")
    pp = PreProcessor()
    print("✅ PreProcessor实例创建成功")
    
    print("5. 检查FPN文件...")
    fpn_file = project_root / "data" / "两阶段-全锚杆-摩尔库伦.fpn"
    print(f"FPN文件存在: {fpn_file.exists()}")

    if fpn_file.exists():
        print("6. 尝试加载FPN...")
        try:
            fpn_data = pp.load_fpn_file(str(fpn_file), force_load=True)
            print(f"✅ FPN加载成功，数据类型: {type(fpn_data)}")
            
            if fpn_data:
                print(f"节点数: {len(fpn_data.get('nodes', []))}")
                print(f"单元数: {len(fpn_data.get('elements', []))}")
                
                print("7. 检查网格创建...")
                if hasattr(pp, 'mesh') and pp.mesh:
                    print(f"✅ 网格存在: {pp.mesh.n_points} 节点, {pp.mesh.n_cells} 单元")
                else:
                    print("❌ 网格不存在")
            else:
                print("❌ FPN数据为空")
                
        except Exception as e:
            print(f"❌ FPN加载失败: {e}")
            import traceback
            traceback.print_exc()
    
except Exception as e:
    print(f"❌ 调试失败: {e}")
    import traceback
    traceback.print_exc()

print("调试完成")
