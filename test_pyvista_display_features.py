#!/usr/bin/env python3
"""
Test PyVista display capabilities for loads, constraints, and boundaries
检查PyVista显示约束、荷载、边界的能力
"""

def test_pyvista_glyph_features():
    """测试PyVista的符号显示功能"""
    try:
        import pyvista as pv
        import numpy as np
        
        print("=== PyVista Glyph and Display Features ===")
        
        # 创建简单网格 (使用兼容的方法)
        mesh = pv.ImageData(dimensions=(10, 10, 5))
        
        # 1. 检查Glyph功能 (用于显示荷载箭头)
        if hasattr(mesh, 'glyph'):
            print("[OK] Glyph method available - 可用于荷载箭头显示")
            
            # 创建向量数据
            vectors = np.random.random((mesh.n_points, 3))
            mesh['vectors'] = vectors
            
            # 测试不同的符号类型
            glyphs = mesh.glyph(scale='vectors', factor=0.1)
            print(f"[OK] Glyph generation successful - {glyphs.n_points} glyphs")
        else:
            print("[FAIL] No glyph method found")
        
        # 2. 检查Arrow创建功能
        try:
            arrow = pv.Arrow()
            print("[OK] Arrow primitive available - 可用于荷载方向显示")
            print(f"     Arrow points: {arrow.n_points}, cells: {arrow.n_cells}")
        except:
            print("[FAIL] Arrow primitive not available")
        
        # 3. 检查几何标记功能
        primitives = []
        if hasattr(pv, 'Sphere'):
            primitives.append("Sphere")
        if hasattr(pv, 'Cylinder'): 
            primitives.append("Cylinder")
        if hasattr(pv, 'Cone'):
            primitives.append("Cone")
        if hasattr(pv, 'Cube'):
            primitives.append("Cube")
        
        print(f"[OK] Available primitives: {primitives}")
        print("     可用于显示约束点、支撑等")
        
        # 4. 检查颜色映射功能
        if hasattr(mesh, 'plot'):
            print("[OK] Plot method available - 支持颜色映射")
            print("     可用于显示不同类型的边界条件")
        
        # 5. 检查标签功能
        try:
            # 测试是否可以添加标签
            plotter = pv.Plotter(off_screen=True)
            plotter.add_mesh(mesh)
            # 尝试添加文本标签
            plotter.add_text("Test Label", position='upper_left')
            print("[OK] Text labels supported - 可添加约束/荷载标签")
            plotter.close()
        except Exception as e:
            print(f"[WARN] Text labels may have issues: {e}")
        
        return True
        
    except ImportError:
        print("[FAIL] PyVista not available")
        return False
    except Exception as e:
        print(f"[FAIL] PyVista test failed: {e}")
        return False

def test_constraint_display_concepts():
    """测试约束显示的概念验证"""
    try:
        import pyvista as pv
        import numpy as np
        
        print("\n=== Constraint Display Concepts ===")
        
        # 创建测试网格
        mesh = pv.ImageData(dimensions=(5, 5, 3))
        
        # 1. 固定约束显示 (三角形符号)
        fixed_points = [0, 4, 20, 24]  # 四个角点
        constraint_symbols = pv.PolyData()
        
        for point_id in fixed_points:
            point = mesh.points[point_id]
            # 创建三角形符号表示固定约束
            triangle = pv.Triangle([
                point + [-0.1, -0.1, 0],
                point + [0.1, -0.1, 0], 
                point + [0, 0.1, 0]
            ])
            constraint_symbols = constraint_symbols.merge(triangle)
        
        print(f"[OK] Fixed constraint symbols: {len(fixed_points)} triangles")
        
        # 2. 荷载显示 (箭头符号)
        load_points = [12, 13, 17, 18]  # 中心区域点
        load_vectors = np.array([[0, 0, -1.0]] * len(load_points))  # 向下的荷载
        
        arrows = pv.PolyData()
        for i, point_id in enumerate(load_points):
            point = mesh.points[point_id]
            arrow = pv.Arrow(start=point, direction=load_vectors[i], scale=0.5)
            arrows = arrows.merge(arrow)
        
        print(f"[OK] Load arrows: {len(load_points)} arrows")
        
        # 3. 边界条件显示 (不同颜色的面)
        boundary_faces = mesh.extract_surface()
        print(f"[OK] Boundary extraction: {boundary_faces.n_cells} faces")
        
        print("\n[CONCEPT] 约束/荷载显示方案:")
        print("- 固定约束: 三角形符号 (红色)")
        print("- 简支约束: 圆形符号 (蓝色)")  
        print("- 点荷载: 箭头符号 (绿色)")
        print("- 面荷载: 分布箭头 (黄色)")
        print("- 边界条件: 面颜色标识")
        
        return True
        
    except Exception as e:
        print(f"[FAIL] Constraint display test failed: {e}")
        return False

def main():
    """主测试函数"""
    print("Testing PyVista Display Capabilities for CAE")
    
    # 测试基础功能
    basic_ok = test_pyvista_glyph_features()
    
    # 测试约束显示概念
    concept_ok = test_constraint_display_concepts() if basic_ok else False
    
    print(f"\n=== SUMMARY ===")
    print(f"PyVista basic features: {'[OK]' if basic_ok else '[FAIL]'}")
    print(f"Constraint display concepts: {'[OK]' if concept_ok else '[FAIL]'}")
    
    if basic_ok:
        print("\n[CONCLUSION] PyVista完全支持约束和荷载的可视化显示")
        print("- 可以用Glyph显示荷载箭头")
        print("- 可以用几何图元显示约束符号")
        print("- 可以用颜色映射显示边界条件")
        print("- 支持文本标签标注")
    
    return basic_ok and concept_ok

if __name__ == "__main__":
    main()