#!/usr/bin/env python3
# -*- coding: utf-8 -*-

print("=== 快速测试开始 ===")

try:
    print("1. 测试基本导入...")
    import sys
    from pathlib import Path
    
    # 添加路径
    project_root = Path(__file__).parent
    sys.path.insert(0, str(project_root))
    
    print("2. 导入PyQt6...")
    from PyQt6.QtWidgets import QApplication
    app = QApplication([])
    print("✅ QApplication创建成功")
    
    print("3. 导入PreProcessor...")
    from modules.preprocessor import PreProcessor
    print("✅ PreProcessor导入成功")
    
    print("4. 创建实例...")
    pp = PreProcessor()
    print("✅ PreProcessor实例创建成功")
    
    print("5. 检查基本属性...")
    print(f"显示模式: {getattr(pp, 'display_mode', 'unknown')}")
    print(f"土体显示: {getattr(pp, 'show_soil', 'unknown')}")
    print(f"网格对象: {getattr(pp, 'mesh', 'None')}")
    
    print("6. 检查FPN文件...")
    fpn_file = project_root / "data" / "两阶段-全锚杆-摩尔库伦.fpn"
    print(f"FPN文件存在: {fpn_file.exists()}")
    
    if fpn_file.exists():
        print("7. 尝试加载FPN（带force_load）...")
        result = pp.load_fpn_file(str(fpn_file), force_load=True)
        print(f"加载结果: {result is not None}")
        
        if result:
            print(f"节点数: {len(result.get('nodes', []))}")
            print(f"单元数: {len(result.get('elements', []))}")
            
            print("8. 检查网格创建...")
            if hasattr(pp, 'mesh') and pp.mesh:
                print(f"✅ 网格创建成功: {pp.mesh.n_points} 节点, {pp.mesh.n_cells} 单元")
                print(f"网格边界: {pp.mesh.bounds}")
            else:
                print("❌ 网格未创建")
        else:
            print("❌ FPN加载失败")
    
    print("=== 测试完成 ===")
    
except Exception as e:
    print(f"❌ 错误: {e}")
    import traceback
    traceback.print_exc()
