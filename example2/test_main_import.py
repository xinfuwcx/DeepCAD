#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
import os
from pathlib import Path

# 设置环境
os.environ['QT_OPENGL'] = 'software'
os.environ['PYVISTA_USE_PANEL'] = 'false'

# 添加路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

def test_main_window_import():
    """测试主窗口的FPN导入功能"""
    print("=== 测试主窗口FPN导入 ===")
    
    try:
        from PyQt6.QtWidgets import QApplication
        from gui.main_window import MainWindow
        
        # 创建应用
        app = QApplication([])
        print("✅ QApplication创建成功")
        
        # 创建主窗口
        main_window = MainWindow()
        print("✅ MainWindow创建成功")
        
        # 检查预处理器
        if hasattr(main_window, 'preprocessor'):
            print("✅ PreProcessor已连接到主窗口")
            
            # 检查FPN文件
            fpn_file = project_root / "data" / "两阶段-全锚杆-摩尔库伦.fpn"
            if fpn_file.exists():
                print(f"✅ FPN文件存在: {fpn_file}")
                
                # 模拟导入过程
                print("🔄 模拟FPN导入过程...")
                
                # 直接调用预处理器的加载方法
                try:
                    fpn_data = main_window.preprocessor.load_fpn_file(str(fpn_file), force_load=True)
                    print(f"✅ FPN数据加载成功: {fpn_data is not None}")
                    
                    if fpn_data:
                        print(f"节点数: {len(fpn_data.get('nodes', []))}")
                        print(f"单元数: {len(fpn_data.get('elements', []))}")
                        
                        # 创建网格
                        print("🔄 创建网格...")
                        main_window.preprocessor.create_mesh_from_fpn(fpn_data)
                        
                        # 检查网格
                        if hasattr(main_window.preprocessor, 'mesh') and main_window.preprocessor.mesh:
                            mesh = main_window.preprocessor.mesh
                            print(f"✅ 网格创建成功: {mesh.n_points} 节点, {mesh.n_cells} 单元")
                            
                            # 更新模型信息
                            main_window.update_model_info()
                            print("✅ 模型信息已更新")
                            
                        else:
                            print("❌ 网格创建失败")
                    else:
                        print("❌ FPN数据为空")
                        
                except Exception as e:
                    print(f"❌ 导入过程失败: {e}")
                    import traceback
                    traceback.print_exc()
            else:
                print(f"❌ FPN文件不存在: {fpn_file}")
        else:
            print("❌ PreProcessor未连接到主窗口")
            
    except Exception as e:
        print(f"❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_main_window_import()
