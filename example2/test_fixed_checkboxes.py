#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试修复后的复选框功能
"""

import sys
from pathlib import Path
import os

# 设置环境变量
os.environ['QT_OPENGL'] = 'software'

# 添加项目路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

def test_checkbox_functionality():
    """测试复选框功能修复效果"""
    print("=" * 60)
    print("测试example2复选框功能修复效果")
    print("=" * 60)
    
    try:
        from PyQt6.QtWidgets import QApplication
        from example2.gui.main_window import MainWindow
        
        app = QApplication([])
        
        # 创建主窗口
        window = MainWindow()
        window.show()
        
        print("✅ 主窗口创建成功")
        
        # 测试前处理器功能
        preprocessor = window.preprocessor
        print(f"前处理器类型: {type(preprocessor).__name__}")
        
        # 检查新增的方法
        methods_to_check = [
            '_display_main_mesh',
            '_create_demo_mesh', 
            '_display_nodes',
            '_display_supports',
            '_display_loads',
            '_update_status_display'
        ]
        
        print("\n检查新增的显示方法:")
        for method in methods_to_check:
            if hasattr(preprocessor, method):
                print(f"✅ {method}")
            else:
                print(f"❌ {method}")
        
        # 检查复选框
        checkboxes_to_check = [
            'show_mesh_cb',
            'show_nodes_cb',
            'show_supports_cb', 
            'show_loads_cb',
            'demo_mesh_btn'
        ]
        
        print("\n检查界面控件:")
        for cb in checkboxes_to_check:
            if hasattr(window, cb):
                widget = getattr(window, cb)
                print(f"✅ {cb} - {widget.text() if hasattr(widget, 'text') else 'Button'}")
            else:
                print(f"❌ {cb}")
        
        # 测试演示网格生成
        print("\n测试演示网格生成:")
        try:
            preprocessor._create_demo_mesh()
            print("✅ 演示网格生成成功")
            
            # 测试显示属性设置
            preprocessor.show_nodes = True
            preprocessor.show_supports = True
            preprocessor.show_loads = True
            preprocessor.show_mesh_edges = True
            
            print("✅ 显示属性设置成功")
            
            # 测试显示方法调用
            preprocessor.display_mesh()
            print("✅ 显示方法调用成功")
            
        except Exception as e:
            print(f"❌ 演示网格测试失败: {e}")
        
        print("\n" + "=" * 60)
        print("测试完成！现在可以手动测试复选框功能:")
        print("1. 点击 '🎯 生成演示网格' 按钮")
        print("2. 勾选/取消各个复选框，观察3D视图变化")
        print("3. 切换线框/实体/半透明模式")
        print("4. 查看控制台输出和状态栏反馈")
        print("=" * 60)
        
        # 保持窗口开启用于手动测试
        app.exec()
        
    except Exception as e:
        print(f"测试失败: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_checkbox_functionality()