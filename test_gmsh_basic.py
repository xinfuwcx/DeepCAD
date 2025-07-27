#!/usr/bin/env python3
"""
基础gmsh测试
检查gmsh是否可用和基本功能
"""

def test_gmsh_import():
    """测试gmsh导入"""
    try:
        import gmsh
        print("✅ gmsh导入成功")
        print(f"   版本: {gmsh.__version__ if hasattr(gmsh, '__version__') else '未知'}")
        return True
    except ImportError as e:
        print(f"❌ gmsh导入失败: {e}")
        return False

def test_gmsh_basic_operations():
    """测试gmsh基本操作"""
    try:
        import gmsh
        
        # 初始化
        gmsh.initialize()
        print("✅ gmsh初始化成功")
        
        # 创建新模型
        gmsh.model.add("test_model")
        print("✅ 创建模型成功")
        
        # 测试OCC是否可用
        try:
            occ = gmsh.model.occ
            # 创建一个简单的立方体
            box_tag = occ.addBox(0, 0, 0, 1, 1, 1)
            occ.synchronize()
            print(f"✅ OCC立方体创建成功，tag: {box_tag}")
            
            # 获取几何信息
            try:
                mass_props = gmsh.model.occ.getMass(3, box_tag)
                volume = mass_props if isinstance(mass_props, (int, float)) else (mass_props[0] if mass_props else 1.0)
                print(f"✅ 立方体体积: {volume}")
            except Exception as e:
                print(f"⚠️  体积计算失败: {e}，但几何体创建成功")
            
        except Exception as e:
            print(f"❌ OCC操作失败: {e}")
            return False
        
        # 清理
        gmsh.finalize()
        print("✅ gmsh清理完成")
        return True
        
    except Exception as e:
        print(f"❌ gmsh基本操作失败: {e}")
        try:
            gmsh.finalize()
        except:
            pass
        return False

def test_required_modules():
    """测试所需模块"""
    modules = [
        'numpy',
        'requests',
        'json'
    ]
    
    all_ok = True
    for module in modules:
        try:
            __import__(module)
            print(f"✅ {module} 可用")
        except ImportError:
            print(f"❌ {module} 不可用")
            all_ok = False
    
    return all_ok

def main():
    """主测试函数"""
    print("🔧 开始gmsh基础功能测试")
    print("=" * 40)
    
    # 测试模块导入
    if not test_required_modules():
        print("❌ 缺少必要模块，测试终止")
        return
    
    print("\n📦 测试gmsh导入...")
    if not test_gmsh_import():
        print("❌ gmsh不可用，无法进行后续测试")
        return
    
    print("\n🛠️  测试gmsh基本操作...")
    if test_gmsh_basic_operations():
        print("\n✅ 所有测试通过！gmsh OCC功能正常")
        print("🎯 可以继续进行后端API测试")
    else:
        print("\n❌ gmsh操作测试失败")
    
    print("\n" + "=" * 40)
    print("🎯 gmsh基础测试完成")

if __name__ == "__main__":
    main()