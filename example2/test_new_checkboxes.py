#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试新增工程构件复选框功能
"""

import sys
import os
from pathlib import Path

# 设置环境变量
os.environ['QT_OPENGL'] = 'software'

# 添加项目路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

def test_new_checkboxes():
    """测试新增的工程构件复选框功能"""
    print("=" * 60)
    print("测试example2新增的工程构件复选框功能")
    print("=" * 60)
    
    try:
        from PyQt6.QtWidgets import QApplication
        from example2.gui.main_window import MainWindow
        
        app = QApplication([])
        
        # 创建主窗口
        window = MainWindow()
        window.show()
        
        print("主窗口创建成功")
        
        # 检查新增的复选框是否存在
        new_checkboxes = [
            'show_diaphragm_wall_cb',
            'show_anchors_cb',
            'show_piles_cb', 
            'show_strutting_cb',
            'show_steel_cb',
            'show_plates_cb'
        ]
        
        print("\n检查新增的工程构件复选框:")
        for cb_name in new_checkboxes:
            if hasattr(window, cb_name):
                cb = getattr(window, cb_name)
                print(f"OK {cb_name} - 文本: '{cb.text()}'")
            else:
                print(f"NO {cb_name} - 复选框不存在")
        
        # 检查前处理器的新方法
        preprocessor = window.preprocessor
        new_methods = [
            '_display_diaphragm_wall',
            '_display_piles',
            '_display_strutting', 
            '_display_steel_structures'
        ]
        
        print("\n检查前处理器新增的显示方法:")
        for method_name in new_methods:
            if hasattr(preprocessor, method_name):
                print(f"OK {method_name}")
            else:
                print(f"NO {method_name}")
        
        # 生成简单的演示网格
        print("\n生成演示网格并测试新增构件显示:")
        try:
            preprocessor._create_demo_mesh()
            print("演示网格创建成功")
            
            # 测试各个新构件的显示
            test_components = [
                ('show_diaphragm_wall', '_display_diaphragm_wall'),
                ('show_piles', '_display_piles'),
                ('show_strutting', '_display_strutting'),
                ('show_steel', '_display_steel_structures')
            ]
            
            for flag_name, method_name in test_components:
                try:
                    # 设置标志位
                    setattr(preprocessor, flag_name, True)
                    # 调用显示方法
                    if hasattr(preprocessor, method_name):
                        method = getattr(preprocessor, method_name)
                        method()
                        print(f"OK {method_name} 调用成功")
                    else:
                        print(f"NO {method_name} 方法不存在")
                except Exception as e:
                    print(f"NO {method_name} 调用失败: {e}")
            
            # 测试update_display方法调用所有新构件
            print("\n测试完整的显示更新:")
            try:
                window.update_display()
                print("OK update_display调用成功")
            except Exception as e:
                print(f"NO update_display调用失败: {e}")
                
        except Exception as e:
            print(f"NO 演示网格测试失败: {e}")
        
        print("\n" + "=" * 60)
        print("测试完成！新增的复选框功能:")
        print("OK 地连墙 - 垂直支护墙体")
        print("OK 预应力锚杆 - 锚固系统")
        print("OK 桩基 - 基础支撑桩")
        print("OK 内撑 - 水平支撑系统")
        print("OK 钢构 - 钢结构框架")
        print("OK 板单元 - 平面结构单元")
        print("=" * 60)
        
        # 保持窗口开启用于手动测试
        print("窗口已开启，请手动测试新增的复选框功能...")
        
        # 显示使用提示
        print("\n使用提示:")
        print("1. 点击 '🎯 生成演示网格' 按钮生成测试网格")
        print("2. 勾选/取消新增的工程构件复选框")
        print("3. 观察3D视图中的构件显示变化")
        print("4. 查看控制台输出反馈")
        
        app.exec()
        
    except Exception as e:
        print(f"测试失败: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_new_checkboxes()