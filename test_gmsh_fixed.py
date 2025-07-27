#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
基础gmsh测试 - 修复版本
检查gmsh是否可用和基本功能
"""

def test_gmsh_import():
    """测试gmsh导入"""
    try:
        import gmsh
        print("✓ gmsh导入成功")
        print(f"   版本: {gmsh.__version__ if hasattr(gmsh, '__version__') else '未知'}")
        return True
    except ImportError as e:
        print(f"✗ gmsh导入失败: {e}")
        return False

def test_gmsh_basic_operations():
    """测试gmsh基本操作"""
    try:
        import gmsh
        
        # 初始化gmsh
        gmsh.initialize()
        print("✓ gmsh初始化成功")
        
        # 创建新模型
        gmsh.model.add("test")
        print("✓ 创建模型成功")
        
        # 创建一个简单的立方体
        box = gmsh.model.occ.addBox(0, 0, 0, 1, 1, 1)
        gmsh.model.occ.synchronize()
        print("✓ 创建几何体成功")
        
        # 生成网格
        gmsh.model.mesh.generate(3)
        print("✓ 网格生成成功")
        
        # 获取网格统计
        nodes = gmsh.model.mesh.getNodes()
        elements = gmsh.model.mesh.getElements()
        
        node_count = len(nodes[0])
        element_count = sum(len(elem_tags) for elem_tags in elements[1])
        
        print(f"✓ 网格统计: {node_count}个节点, {element_count}个单元")
        
        # 清理
        gmsh.finalize()
        print("✓ gmsh清理成功")
        
        return True
        
    except Exception as e:
        print(f"✗ gmsh基本操作失败: {e}")
        try:
            gmsh.finalize()
        except:
            pass
        return False

def test_occ_availability():
    """测试OpenCASCADE几何核心"""
    try:
        import gmsh
        gmsh.initialize()
        
        # 测试OCC功能
        box = gmsh.model.occ.addBox(0, 0, 0, 1, 1, 1)
        sphere = gmsh.model.occ.addSphere(0.5, 0.5, 0.5, 0.3)
        
        # 布尔操作测试
        gmsh.model.occ.cut([(3, box)], [(3, sphere)])
        gmsh.model.occ.synchronize()
        
        print("✓ OpenCASCADE几何核心可用")
        print("✓ 布尔操作支持")
        
        gmsh.finalize()
        return True
        
    except Exception as e:
        print(f"✗ OpenCASCADE测试失败: {e}")
        try:
            gmsh.finalize()
        except:
            pass
        return False

def test_file_formats():
    """测试文件格式支持"""
    supported_formats = []
    import tempfile
    import os
    
    try:
        import gmsh
        gmsh.initialize()
        
        # 创建简单网格
        gmsh.model.add("format_test")
        box = gmsh.model.occ.addBox(0, 0, 0, 1, 1, 1)
        gmsh.model.occ.synchronize()
        gmsh.model.mesh.generate(3)
        
        # 测试不同格式
        formats_to_test = [
            ("msh", "Gmsh原生格式"),
            ("vtk", "VTK格式"),
            ("stl", "STL格式"),
            ("obj", "OBJ格式")
        ]
        
        with tempfile.TemporaryDirectory() as temp_dir:
            for fmt, desc in formats_to_test:
                try:
                    test_file = os.path.join(temp_dir, f"test.{fmt}")
                    gmsh.write(test_file)
                    if os.path.exists(test_file):
                        supported_formats.append(f"{fmt} ({desc})")
                        print(f"✓ {desc} 支持")
                    else:
                        print(f"✗ {desc} 不支持")
                except Exception as e:
                    print(f"✗ {desc} 测试失败: {e}")
        
        gmsh.finalize()
        
    except Exception as e:
        print(f"✗ 文件格式测试失败: {e}")
        try:
            gmsh.finalize()
        except:
            pass
    
    return supported_formats

def main():
    """主测试函数"""
    print("=== GMSH基础功能测试 ===")
    
    # 测试1: 导入
    if not test_gmsh_import():
        print("\n❌ GMSH不可用，无法继续测试")
        return False
    
    # 测试2: 基本操作
    print("\n--- 基本操作测试 ---")
    basic_ok = test_gmsh_basic_operations()
    
    # 测试3: OCC核心
    print("\n--- OpenCASCADE测试 ---")
    occ_ok = test_occ_availability()
    
    # 测试4: 文件格式
    print("\n--- 文件格式支持 ---")
    formats = test_file_formats()
    
    # 总结
    print("\n=== 测试总结 ===")
    print(f"基本操作: {'✓ 可用' if basic_ok else '✗ 不可用'}")
    print(f"OCC几何核心: {'✓ 可用' if occ_ok else '✗ 不可用'}")
    print(f"支持格式数量: {len(formats)}")
    
    if formats:
        print("支持的格式:")
        for fmt in formats:
            print(f"  - {fmt}")
    
    overall_ok = basic_ok and occ_ok and len(formats) > 0
    print(f"\n整体状态: {'✓ GMSH完全可用' if overall_ok else '⚠ GMSH部分可用'}")
    
    return overall_ok

if __name__ == "__main__":
    main()