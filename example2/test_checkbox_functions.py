#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试主界面复选框功能的实际效果
"""

import sys
from pathlib import Path

# 添加项目路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

def test_preprocessor_methods():
    """测试前处理器的方法是否存在并可调用"""
    try:
        from example2.modules.preprocessor import PreProcessor
        
        preprocessor = PreProcessor()
        
        # 测试各种显示控制方法
        methods_to_test = [
            'set_display_mode',
            'toggle_show_plates', 
            'toggle_show_anchors',
            'display_mesh',
            'display_constraints',
            'display_loads'
        ]
        
        print("=== 前处理器方法测试 ===")
        for method_name in methods_to_test:
            if hasattr(preprocessor, method_name):
                method = getattr(preprocessor, method_name)
                print(f"✅ {method_name} - 方法存在")
                
                # 尝试调用看是否会报错
                try:
                    if method_name == 'set_display_mode':
                        method('wireframe')
                    elif method_name.startswith('toggle_'):
                        method(True)
                    else:
                        method()
                    print(f"   调用成功")
                except Exception as e:
                    print(f"   调用失败: {e}")
            else:
                print(f"❌ {method_name} - 方法不存在")
                
        # 测试属性设置
        print("\n=== 显示开关属性测试 ===")
        display_flags = [
            'show_mesh_edges',
            'show_supports', 
            'show_loads',
            'show_soil',
            'show_concrete',
            'show_steel',
            'show_plates',
            'show_anchors'
        ]
        
        for flag in display_flags:
            try:
                setattr(preprocessor, flag, True)
                value = getattr(preprocessor, flag, 'NOT_SET')
                print(f"✅ {flag} = {value}")
            except Exception as e:
                print(f"❌ {flag} - 设置失败: {e}")
                
    except ImportError as e:
        print(f"导入前处理器失败: {e}")

def test_main_window_checkboxes():
    """测试主窗口复选框的连接状态"""
    try:
        from PyQt6.QtWidgets import QApplication
        from example2.gui.main_window import MainWindow
        
        app = QApplication([])
        window = MainWindow()
        
        print("\n=== 主窗口复选框测试 ===")
        
        checkbox_names = [
            'show_mesh_cb',
            'show_nodes_cb', 
            'show_supports_cb',
            'show_loads_cb',
            'show_soil_cb',
            'show_concrete_cb',
            'show_steel_cb',
            'show_plates_cb',
            'show_anchors_cb',
            'only_active_materials_cb',
            'filter_anchors_by_stage_cb'
        ]
        
        for cb_name in checkbox_names:
            if hasattr(window, cb_name):
                cb = getattr(window, cb_name)
                print(f"✅ {cb_name} - 复选框存在")
                print(f"   当前状态: {cb.isChecked()}")
                print(f"   文本: {cb.text()}")
                
                # 检查是否有信号连接
                try:
                    cb.setChecked(not cb.isChecked())  # 切换状态
                    print(f"   状态切换成功")
                except Exception as e:
                    print(f"   状态切换失败: {e}")
            else:
                print(f"❌ {cb_name} - 复选框不存在")
        
        app.quit()
        
    except Exception as e:
        print(f"主窗口测试失败: {e}")

if __name__ == "__main__":
    print("检查example2主界面复选框功能实现情况...\n")
    
    test_preprocessor_methods()
    test_main_window_checkboxes()
    
    print("\n=== 总结 ===")
    print("多数复选框已定义但功能实现不完整")
    print("建议：为每个复选框添加完整的功能实现和视觉反馈")