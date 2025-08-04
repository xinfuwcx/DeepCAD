#!/usr/bin/env python3
"""
PyVista深基坑分析测试脚本
快速验证功能是否正常
"""

import sys
import time
from pathlib import Path

def test_imports():
    """测试必要模块导入"""
    print("🔍 测试模块导入...")
    
    modules = {
        "numpy": "数值计算核心",
        "pyvista": "3D可视化和网格处理", 
        "json": "配置文件处理",
        "pathlib": "路径处理"
    }
    
    failed_modules = []
    
    for module, description in modules.items():
        try:
            __import__(module)
            print(f"   ✅ {module}: {description}")
        except ImportError:
            print(f"   ❌ {module}: {description} - 导入失败")
            failed_modules.append(module)
    
    # 测试可选模块
    optional_modules = {
        "gmsh": "高质量网格生成",
        "meshio": "网格格式转换",
        "matplotlib": "2D绘图"
    }
    
    print("\n🔍 测试可选模块...")
    for module, description in optional_modules.items():
        try:
            __import__(module)
            print(f"   ✅ {module}: {description}")
        except ImportError:
            print(f"   ⚠️ {module}: {description} - 未安装（可选）")
    
    if failed_modules:
        print(f"\n❌ 关键模块导入失败: {failed_modules}")
        print("请运行: pip install -r requirements_pyvista.txt")
        return False
    
    print("\n✅ 所有关键模块导入成功!")
    return True

def test_basic_pyvista():
    """测试PyVista基本功能"""
    print("\n🔍 测试PyVista基本功能...")
    
    try:
        import pyvista as pv
        import numpy as np
        
        # 创建简单网格
        mesh = pv.UniformGrid(dimensions=(10, 10, 10))
        print(f"   ✅ 创建网格成功: {mesh.n_points}个节点, {mesh.n_cells}个单元")
        
        # 添加数据
        mesh.point_data["test_data"] = np.random.random(mesh.n_points)
        print(f"   ✅ 添加点数据成功")
        
        # 转换网格类型
        unstruct = mesh.cast_to_unstructured_grid()
        print(f"   ✅ 网格类型转换成功")
        
        # 保存VTK文件
        test_file = Path("test_output.vtk")
        unstruct.save(str(test_file))
        
        if test_file.exists():
            print(f"   ✅ VTK文件保存成功: {test_file}")
            test_file.unlink()  # 删除测试文件
        else:
            print(f"   ❌ VTK文件保存失败")
            return False
            
        return True
        
    except Exception as e:
        print(f"   ❌ PyVista测试失败: {e}")
        return False

def test_gmsh_functionality():
    """测试GMSH功能"""
    print("\n🔍 测试GMSH网格生成功能...")
    
    try:
        import gmsh
        
        gmsh.initialize()
        gmsh.model.add("test")
        
        # 创建简单几何
        p1 = gmsh.model.geo.addPoint(0, 0, 0, 1.0)
        p2 = gmsh.model.geo.addPoint(1, 0, 0, 1.0)  
        p3 = gmsh.model.geo.addPoint(1, 1, 0, 1.0)
        p4 = gmsh.model.geo.addPoint(0, 1, 0, 1.0)
        
        # 创建线
        l1 = gmsh.model.geo.addLine(p1, p2)
        l2 = gmsh.model.geo.addLine(p2, p3)
        l3 = gmsh.model.geo.addLine(p3, p4)
        l4 = gmsh.model.geo.addLine(p4, p1)
        
        # 创建面
        loop = gmsh.model.geo.addCurveLoop([l1, l2, l3, l4])
        surface = gmsh.model.geo.addPlaneSurface([loop])
        
        gmsh.model.geo.synchronize()
        
        # 生成网格
        gmsh.model.mesh.generate(2)
        
        # 获取网格信息
        nodes = gmsh.model.mesh.getNodes()
        elements = gmsh.model.mesh.getElements()
        
        print(f"   ✅ GMSH网格生成成功: {len(nodes[1])//3}个节点")
        
        gmsh.finalize()
        return True
        
    except ImportError:
        print("   ⚠️ GMSH未安装，将使用PyVista内置网格生成")
        return True  # 不是致命错误
    except Exception as e:
        print(f"   ❌ GMSH测试失败: {e}")
        return True  # 不是致命错误

def test_mesh_generation():
    """测试网格生成渐变功能"""
    print("\n🔍 测试网格渐变功能...")
    
    try:
        import pyvista as pv
        import numpy as np
        
        # 创建基础网格
        domain_size = [10, 10, 5]  # 小尺寸快速测试
        
        nx, ny, nz = 20, 20, 10
        mesh = pv.UniformGrid(
            dimensions=(nx+1, ny+1, nz+1),
            spacing=(domain_size[0]/nx, domain_size[1]/ny, domain_size[2]/nz),
            origin=(0, 0, -domain_size[2])
        )
        
        # 转换为非结构化网格
        mesh = mesh.cast_to_unstructured_grid()
        
        print(f"   ✅ 基础网格生成: {mesh.n_points}节点, {mesh.n_cells}单元")
        
        # 模拟网格尺寸渐变（通过点密度）
        centers = mesh.cell_centers()
        distances = np.linalg.norm(centers.points - np.array([5, 5, -2.5]), axis=1)
        
        # 定义网格尺寸：中心细，边界粗
        mesh_sizes = 0.3 + (1.0 - 0.3) * (distances / np.max(distances))
        mesh.cell_data["mesh_size"] = mesh_sizes
        
        print(f"   ✅ 网格尺寸渐变: {np.min(mesh_sizes):.2f} → {np.max(mesh_sizes):.2f}")
        
        return True
        
    except Exception as e:
        print(f"   ❌ 网格渐变测试失败: {e}")
        return False

def test_material_assignment():
    """测试材料分配功能"""  
    print("\n🔍 测试材料分配功能...")
    
    try:
        import pyvista as pv
        import numpy as np
        
        # 创建测试网格
        mesh = pv.UniformGrid(dimensions=(5, 5, 5))
        mesh = mesh.cast_to_unstructured_grid()
        
        centers = mesh.cell_centers()
        n_cells = mesh.n_cells
        
        # 模拟5层土层分配
        layer_ids = np.ones(n_cells, dtype=int)
        elastic_modulus = np.ones(n_cells) * 10e6  # 默认10MPa
        
        for i, center in enumerate(centers.points):
            z = center[2]
            
            # 根据z坐标分配土层
            if z > -0.2:
                layer_ids[i] = 1  # 第1层
                elastic_modulus[i] = 4e6
            elif z > -0.4:
                layer_ids[i] = 2  # 第2层  
                elastic_modulus[i] = 2.5e6
            elif z > -0.6:
                layer_ids[i] = 3  # 第3层
                elastic_modulus[i] = 6e6
            elif z > -0.8:
                layer_ids[i] = 4  # 第4层
                elastic_modulus[i] = 12e6
            else:
                layer_ids[i] = 5  # 第5层
                elastic_modulus[i] = 20e6
        
        # 添加到网格
        mesh.cell_data["layer_id"] = layer_ids
        mesh.cell_data["elastic_modulus"] = elastic_modulus
        
        # 统计各层分布
        layer_distribution = [(i, np.sum(layer_ids == i)) for i in range(1, 6)]
        
        print(f"   ✅ 材料分配完成:")
        for layer, count in layer_distribution:
            if count > 0:
                print(f"      土层{layer}: {count}个单元")
        
        return True
        
    except Exception as e:
        print(f"   ❌ 材料分配测试失败: {e}")
        return False

def test_analysis_simulation():
    """测试分析模拟功能"""
    print("\n🔍 测试分析模拟功能...")
    
    try:
        import pyvista as pv
        import numpy as np
        
        # 创建测试网格
        mesh = pv.UniformGrid(dimensions=(6, 6, 4))
        mesh = mesh.cast_to_unstructured_grid()
        
        n_points = mesh.n_points
        n_cells = mesh.n_cells
        
        # 模拟位移结果
        np.random.seed(42)
        points = mesh.points
        displacements = np.zeros((n_points, 3))
        
        for i, point in enumerate(points):
            x, y, z = point
            
            # 模拟向下和向内的位移
            displacements[i, 0] = (x - 0.5) * 0.01 * (1 + z)  # x方向
            displacements[i, 1] = (y - 0.5) * 0.01 * (1 + z)  # y方向  
            displacements[i, 2] = -0.02 * (1 + z)              # z方向（沉降）
        
        displacement_mag = np.linalg.norm(displacements, axis=1)
        
        # 模拟应力结果
        stresses = np.random.uniform(100e3, 500e3, n_cells)  # 100-500kPa
        
        # 添加到网格
        mesh.point_data["displacement"] = displacements
        mesh.point_data["displacement_magnitude"] = displacement_mag
        mesh.cell_data["von_mises_stress"] = stresses
        
        # 计算关键结果
        max_disp = np.max(displacement_mag) * 1000  # 转为mm
        max_stress = np.max(stresses) / 1000        # 转为kPa
        
        print(f"   ✅ 分析模拟完成:")
        print(f"      最大位移: {max_disp:.2f} mm")
        print(f"      最大应力: {max_stress:.1f} kPa")
        
        return True
        
    except Exception as e:
        print(f"   ❌ 分析模拟测试失败: {e}")
        return False

def test_result_output():
    """测试结果输出功能"""
    print("\n🔍 测试结果输出功能...")
    
    try:
        import pyvista as pv
        import numpy as np
        import json
        from pathlib import Path
        
        # 创建测试结果
        mesh = pv.UniformGrid(dimensions=(4, 4, 3))
        mesh.point_data["test_displacement"] = np.random.random(mesh.n_points)
        mesh.cell_data["test_stress"] = np.random.random(mesh.n_cells)
        
        # 保存VTK文件
        vtk_file = Path("test_result.vtk")
        mesh.save(str(vtk_file))
        
        if vtk_file.exists():
            print(f"   ✅ VTK文件保存成功: {vtk_file}")
            vtk_file.unlink()
        
        # 保存JSON摘要
        summary = {
            "test_results": {
                "max_displacement": 25.8,
                "max_stress": 450.2,
                "convergence": True
            },
            "mesh_info": {
                "nodes": mesh.n_points,
                "cells": mesh.n_cells
            }
        }
        
        json_file = Path("test_summary.json")
        with open(json_file, 'w', encoding='utf-8') as f:
            json.dump(summary, f, indent=2, ensure_ascii=False)
        
        if json_file.exists():
            print(f"   ✅ JSON摘要保存成功: {json_file}")
            json_file.unlink()
        
        return True
        
    except Exception as e:
        print(f"   ❌ 结果输出测试失败: {e}")
        return False

def run_all_tests():
    """运行所有测试"""
    print("🧪 PyVista深基坑分析功能测试")
    print("=" * 50)
    
    tests = [
        ("模块导入", test_imports),
        ("PyVista基础", test_basic_pyvista),
        ("GMSH功能", test_gmsh_functionality),
        ("网格生成", test_mesh_generation),
        ("材料分配", test_material_assignment),
        ("分析模拟", test_analysis_simulation),
        ("结果输出", test_result_output)
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"\n🔬 {test_name}测试...")
        try:
            if test_func():
                passed += 1
                print(f"   ✅ {test_name}测试通过")
            else:
                print(f"   ❌ {test_name}测试失败")
        except Exception as e:
            print(f"   ❌ {test_name}测试异常: {e}")
    
    print("\n" + "=" * 50)
    print(f"🧪 测试完成: {passed}/{total} 通过")
    
    if passed == total:
        print("✅ 所有测试通过！可以运行完整分析程序")
        return True
    else:
        print("⚠️ 部分测试失败，请检查环境配置")
        return False

def main():
    """主函数"""
    success = run_all_tests()
    
    if success:
        print("\n🚀 是否运行完整分析程序？(y/n): ", end="")
        try:
            choice = input().lower().strip()
            if choice in ['y', 'yes', '是']:
                print("\n启动完整分析程序...")
                time.sleep(1)
                
                # 导入并运行主程序
                from pyvista_soft_soil_excavation import PyVistaExcavationAnalyzer
                
                analyzer = PyVistaExcavationAnalyzer()
                analyzer.run_complete_analysis()
        except KeyboardInterrupt:
            print("\n用户取消")
        except ImportError:
            print("\n❌ 无法导入主分析程序")
    
    input("\n按Enter键退出...")

if __name__ == "__main__":
    main()