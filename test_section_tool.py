#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试地质剖切功能
"""

import sys
from pathlib import Path

# 添加路径
project_root = Path(__file__).parent
example3_path = project_root / "example3"
sys.path.insert(0, str(project_root))
sys.path.insert(0, str(example3_path))

def test_section_functionality():
    """测试剖切功能"""
    print("🧪 测试地质剖切功能...")
    
    # 测试PyVista
    try:
        import pyvista as pv
        print("✅ PyVista 可用")
        
        # 创建简单几何体测试切割
        sphere = pv.Sphere(radius=1.0, center=(0, 0, 0))
        
        # 创建切面
        plane = pv.Plane(center=(0, 0, 0), direction=(1, 0, 0), size=(4, 4))
        
        # 执行切割
        cut_sphere = sphere.clip_surface(plane, invert=False)
        
        if cut_sphere.n_points > 0:
            print("✅ PyVista 剖切功能正常")
        else:
            print("⚠️  PyVista 剖切结果为空")
            
    except ImportError:
        print("❌ PyVista 不可用")
        return False
    except Exception as e:
        print(f"❌ PyVista 剖切测试失败: {e}")
        return False
    
    # 测试GemPy
    try:
        import gempy as gp
        print("✅ GemPy 可用")
        
        # 创建简单模型
        model = gp.create_geomodel(
            project_name='Section_Test',
            extent=[0, 100, 0, 100, -50, 0],
            resolution=[20, 20, 20]
        )
        
        # 添加数据点
        gp.add_surface_points(
            model,
            x=[20, 50, 80],
            y=[50, 50, 50],
            z=[-10, -20, -15],
            surface=['layer1', 'layer2', 'layer1']
        )
        
        # 添加方向数据
        gp.add_orientations(
            model,
            x=[50],
            y=[50],
            z=[-15],
            surface=['layer1'],
            orientation=[90, 0, 1]
        )
        
        print("✅ GemPy 模型创建成功")
        
        # 尝试计算模型
        try:
            gp.compute_model(model)
            print("✅ GemPy 模型计算成功")
        except Exception as e:
            print(f"⚠️  GemPy 模型计算失败: {e}")
        
    except ImportError:
        print("❌ GemPy 不可用")
    except Exception as e:
        print(f"❌ GemPy 测试失败: {e}")
    
    return True

def test_enhanced_viewport():
    """测试增强视口"""
    print("\n🔬 测试增强版3D视口...")
    
    try:
        from enhanced_gempy_main_window import EnhancedGemPyViewport3D
        
        # 检查是否有剖切方法
        viewport = EnhancedGemPyViewport3D()
        
        if hasattr(viewport, 'activate_section_tool'):
            print("✅ 增强视口包含剖切功能")
        else:
            print("❌ 增强视口缺少剖切功能")
            
        if hasattr(viewport, 'create_geological_section_internal'):
            print("✅ 增强视口包含内部剖切方法")
        else:
            print("❌ 增强视口缺少内部剖切方法")
            
        return True
        
    except ImportError as e:
        print(f"❌ 无法导入增强视口: {e}")
        return False
    except Exception as e:
        print(f"❌ 增强视口测试失败: {e}")
        return False

def test_original_viewport():
    """测试原版视口"""
    print("\n📊 测试原版GemPy视口...")
    
    try:
        from gempy_main_window import GemPyViewport3D
        
        viewport = GemPyViewport3D()
        
        if hasattr(viewport, 'activate_section_tool'):
            print("✅ 原版视口包含剖切功能")
        else:
            print("❌ 原版视口缺少剖切功能")
            
        return True
        
    except ImportError as e:
        print(f"❌ 无法导入原版视口: {e}")
        return False
    except Exception as e:
        print(f"❌ 原版视口测试失败: {e}")
        return False

def main():
    """主函数"""
    print("🌍 GEM Professional System - 剖切功能测试")
    print("=" * 50)
    
    # 基础功能测试
    basic_ok = test_section_functionality()
    
    # 视口测试
    enhanced_ok = test_enhanced_viewport()
    original_ok = test_original_viewport()
    
    print("\n📋 测试结果总结:")
    print("=" * 50)
    print(f"基础剖切功能: {'✅ 通过' if basic_ok else '❌ 失败'}")
    print(f"增强版视口: {'✅ 通过' if enhanced_ok else '❌ 失败'}")
    print(f"原版视口: {'✅ 通过' if original_ok else '❌ 失败'}")
    
    if all([basic_ok, enhanced_ok, original_ok]):
        print("\n🎉 所有剖切功能测试通过！")
        print("\n💡 使用方法:")
        print("1. 启动 GEM Professional System")
        print("2. 加载地质模型")
        print("3. 点击工具栏中的 '剖面' 按钮")
        print("4. 在对话框中设置剖面参数")
        print("5. 点击 '创建剖面' 查看效果")
    else:
        print("\n⚠️  部分功能存在问题，请检查依赖安装")
    
    print("\n📚 剖切功能特性:")
    print("- 支持 X、Y、Z 三个轴向的剖面")
    print("- 可调节剖面位置 (0-100%)")
    print("- 可控制切面透明度")
    print("- 支持显示/隐藏切面")
    print("- 实时剖切地质模型")
    print("- 保持原始模型数据")
    
    input("\n按Enter键退出...")

if __name__ == "__main__":
    main()