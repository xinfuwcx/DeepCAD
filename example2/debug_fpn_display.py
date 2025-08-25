#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
调试FPN导入和3D显示问题
"""

import sys
import os
from pathlib import Path

# 添加项目路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))
sys.path.insert(0, str(project_root.parent))

def test_fpn_import_and_display():
    """测试FPN导入和显示流程"""
    print("=" * 60)
    print("调试FPN导入和3D显示问题")
    print("=" * 60)
    
    # 检查FPN文件是否存在
    fpn_file = project_root / "data" / "两阶段-全锚杆-摩尔库伦.fpn"
    if not fpn_file.exists():
        print(f"❌ FPN文件不存在: {fpn_file}")
        return False
    
    print(f"✅ FPN文件存在: {fpn_file}")
    print(f"文件大小: {fpn_file.stat().st_size / 1024:.1f} KB")
    
    try:
        # 导入预处理器
        from modules.preprocessor import PreProcessor
        print("✅ PreProcessor导入成功")
        
        # 创建预处理器实例
        preprocessor = PreProcessor()
        print("✅ PreProcessor实例创建成功")
        
        # 检查PyVista可用性
        try:
            import pyvista as pv
            print(f"✅ PyVista可用，版本: {pv.__version__}")
        except ImportError:
            print("❌ PyVista不可用")
            return False
        
        # 加载FPN文件
        print(f"\n🔄 开始加载FPN文件...")
        fpn_data = preprocessor.load_fpn_file(str(fpn_file))
        
        if fpn_data:
            print("✅ FPN文件加载成功")
            print(f"节点数: {len(fpn_data.get('nodes', []))}")
            print(f"单元数: {len(fpn_data.get('elements', []))}")
            print(f"材料数: {len(fpn_data.get('materials', []))}")
            print(f"分析步数: {len(fpn_data.get('analysis_stages', []))}")
        else:
            print("❌ FPN文件加载失败")
            return False
        
        # 检查网格是否创建成功
        if hasattr(preprocessor, 'mesh') and preprocessor.mesh:
            mesh = preprocessor.mesh
            print(f"\n✅ 网格创建成功:")
            print(f"  节点数: {mesh.n_points}")
            print(f"  单元数: {mesh.n_cells}")
            print(f"  边界: {mesh.bounds}")
            
            # 检查MaterialID
            if hasattr(mesh, 'cell_data') and 'MaterialID' in mesh.cell_data:
                import numpy as np
                mat_ids = np.unique(mesh.cell_data['MaterialID'])
                print(f"  材料ID: {mat_ids.tolist()}")
            else:
                print("  ⚠️ 未找到MaterialID数据")
        else:
            print("❌ 网格创建失败")
            return False
        
        # 检查显示状态
        print(f"\n🔍 显示状态检查:")
        print(f"  显示模式: {getattr(preprocessor, 'display_mode', 'unknown')}")
        print(f"  土体显示: {getattr(preprocessor, 'show_soil', 'unknown')}")
        print(f"  板元显示: {getattr(preprocessor, 'show_plates', 'unknown')}")
        print(f"  锚杆显示: {getattr(preprocessor, 'show_anchors', 'unknown')}")
        print(f"  地连墙显示: {getattr(preprocessor, 'show_diaphragm_wall', 'unknown')}")
        
        # 检查plotter状态
        if hasattr(preprocessor, 'plotter') and preprocessor.plotter:
            print(f"  Plotter可用: True")
            try:
                # 获取当前场景中的actors
                actors = preprocessor.plotter.renderer.actors
                print(f"  场景中的actors数量: {len(actors)}")
                for name, actor in actors.items():
                    print(f"    - {name}: {type(actor)}")
            except Exception as e:
                print(f"  无法获取actors信息: {e}")
        else:
            print(f"  Plotter可用: False")
        
        return True
        
    except Exception as e:
        print(f"❌ 测试过程中出错: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_simple_mesh_display():
    """测试简单网格显示"""
    print("\n" + "=" * 60)
    print("测试简单网格显示")
    print("=" * 60)
    
    try:
        from modules.preprocessor import PreProcessor
        import pyvista as pv
        
        # 创建预处理器
        preprocessor = PreProcessor()
        
        # 创建简单测试网格
        mesh = pv.Box()
        preprocessor.mesh = mesh
        
        print(f"✅ 创建测试网格: {mesh.n_points} 节点, {mesh.n_cells} 单元")
        
        # 尝试显示
        preprocessor.display_mesh()
        print("✅ 显示测试完成")
        
        return True
        
    except Exception as e:
        print(f"❌ 简单测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    # 设置环境变量
    os.environ['QT_OPENGL'] = 'software'
    os.environ['PYVISTA_USE_PANEL'] = 'false'
    
    # 运行测试
    success1 = test_fpn_import_and_display()
    success2 = test_simple_mesh_display()
    
    if success1 and success2:
        print("\n🎉 所有测试通过！")
    else:
        print("\n❌ 部分测试失败")
        
    print("\n请检查上面的输出，找出3D显示问题的根本原因。")
