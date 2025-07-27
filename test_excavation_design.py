"""
开挖设计功能测试脚本
测试DXF导入、地表高程查询、几何构建、体积计算的完整流程
"""

import sys
import os
import time
import numpy as np
from pathlib import Path

# 添加项目路径
project_root = Path(__file__).parent
sys.path.append(str(project_root))
sys.path.append(str(project_root / "gateway"))

# 测试数据目录
TEST_DATA_DIR = project_root / "test_data" / "excavation"
TEST_DATA_DIR.mkdir(parents=True, exist_ok=True)

def create_test_dxf():
    """创建测试用的DXF文件"""
    try:
        import ezdxf
        
        # 创建一个简单的DXF文件，包含矩形开挖轮廓
        doc = ezdxf.new('R2010')
        msp = doc.modelspace()
        
        # 创建开挖轮廓（50m x 30m的矩形）
        points = [(0, 0), (50, 0), (50, 30), (0, 30), (0, 0)]
        msp.add_lwpolyline(points, dxfattribs={'layer': '开挖轮廓'})
        
        # 保存测试DXF文件
        test_dxf_path = TEST_DATA_DIR / "test_excavation.dxf"
        doc.saveas(test_dxf_path)
        
        print(f"[成功] 创建测试DXF文件: {test_dxf_path}")
        return test_dxf_path
        
    except ImportError:
        print("[错误] ezdxf未安装，跳过DXF文件创建")
        return None

def test_dxf_contour_extraction():
    """测试DXF轮廓提取功能"""
    print("\n[测试] DXF轮廓提取...")
    
    try:
        from gateway.modules.excavation.dxf_excavation_processor import ExcavationDXFProcessor
        
        # 创建测试DXF
        test_dxf_path = create_test_dxf()
        if not test_dxf_path:
            print("❌ 无法创建测试DXF文件")
            return False
        
        # 测试轮廓提取
        processor = ExcavationDXFProcessor()
        result = processor.extract_excavation_contours(str(test_dxf_path))
        
        if result.success:
            print(f"[成功] 成功提取{len(result.contours)}个轮廓")
            for i, contour in enumerate(result.contours):
                print(f"   轮廓{i+1}: {contour.name}, 面积: {contour.area:.2f}平方米, 点数: {len(contour.points)}")
            return True
        else:
            print(f"[失败] 轮廓提取失败: {result.message}")
            return False
            
    except Exception as e:
        print(f"[错误] DXF轮廓提取测试失败: {str(e)}")
        return False

def test_surface_elevation_query():
    """测试地表高程查询功能"""
    print("\n🌍 测试地表高程查询...")
    
    try:
        import pyvista as pv
        from gateway.modules.excavation.surface_elevation_query import SurfaceElevationQueryEngine
        
        # 创建测试地质网格（简单的倾斜平面）
        x = np.arange(0, 100, 5)
        y = np.arange(0, 60, 5)
        X, Y = np.meshgrid(x, y)
        Z = X * 0.02 + Y * 0.01  # 轻微倾斜的地表
        
        # 创建PyVista网格
        points = np.column_stack([X.ravel(), Y.ravel(), Z.ravel()])
        geology_mesh = pv.StructuredGrid()
        geology_mesh.points = points
        geology_mesh.dimensions = (len(x), len(y), 1)
        
        # 测试高程查询
        engine = SurfaceElevationQueryEngine()
        if engine.load_geology_mesh(geology_mesh):
            print("✅ 成功加载地质网格")
            
            # 查询几个测试点的高程
            test_points = [(25, 15), (50, 30), (0, 0), (75, 45)]
            result = engine.query_elevation_batch(test_points)
            
            if result.success:
                print("✅ 高程查询成功")
                for point in result.points:
                    if point.z is not None:
                        print(f"   点({point.x:.1f}, {point.y:.1f}): 高程 {point.z:.3f}m")
                return True
            else:
                print(f"❌ 高程查询失败: {result.message}")
                return False
        else:
            print("❌ 地质网格加载失败")
            return False
            
    except Exception as e:
        print(f"❌ 地表高程查询测试失败: {str(e)}")
        return False

def test_volume_calculation():
    """测试体积计算功能"""
    print("\n📊 测试体积计算...")
    
    try:
        from gateway.modules.excavation.dxf_excavation_processor import ExcavationContour
        from gateway.modules.excavation.volume_calculator import ExcavationVolumeCalculator
        from gateway.modules.excavation.surface_elevation_query import ElevationPoint
        
        # 创建测试轮廓（50m x 30m矩形）
        test_contour = ExcavationContour(
            id="test_contour",
            name="测试矩形开挖",
            points=[(0, 0), (50, 0), (50, 30), (0, 30)],
            is_closed=True,
            area=1500.0,  # 50 * 30
            centroid=(25.0, 15.0),
            layer_name="test"
        )
        
        # 创建地表高程点（平坦地表，高程0）
        surface_elevations = [
            ElevationPoint(x=0, y=0, z=0.0),
            ElevationPoint(x=50, y=0, z=0.0), 
            ElevationPoint(x=50, y=30, z=0.0),
            ElevationPoint(x=0, y=30, z=0.0)
        ]
        
        # 测试不同的计算方法
        calculator = ExcavationVolumeCalculator()
        methods = ['simple', 'triangular_prism', 'grid_integration']
        
        for method in methods:
            print(f"\n   测试{method}方法...")
            result = calculator.calculate_excavation_volume(
                contour=test_contour,
                surface_elevations=surface_elevations,
                excavation_depth=5.0,  # 5米深
                calculation_method=method
            )
            
            if result.success:
                print(f"   ✅ {method}: 体积 {result.total_volume:.2f}m³, 用时 {result.calculation_time:.3f}s")
                # 理论值应该是 50 * 30 * 5 = 7500 m³
                expected = 1500 * 5  # 7500
                error = abs(result.total_volume - expected) / expected * 100
                print(f"   📈 误差: {error:.2f}% (理论值: {expected}m³)")
            else:
                print(f"   ❌ {method}计算失败: {result.message}")
        
        return True
        
    except Exception as e:
        print(f"❌ 体积计算测试失败: {str(e)}")
        return False

def test_geometry_construction():
    """测试几何构建功能"""
    print("\n🏗️ 测试几何构建...")
    
    try:
        import pyvista as pv
        from gateway.modules.excavation.dxf_excavation_processor import ExcavationContour
        from gateway.modules.excavation.excavation_geometry_builder import ExcavationGeometryBuilder
        
        # 创建测试轮廓
        test_contour = ExcavationContour(
            id="test_build",
            name="构建测试",
            points=[(10, 10), (40, 10), (40, 25), (10, 25)],
            is_closed=True,
            area=750.0,  # 30 * 15
            centroid=(25.0, 17.5),
            layer_name="build_test"
        )
        
        # 创建简单的地质网格
        geology_mesh = pv.Plane(center=(25, 17.5, 0), direction=(0, 0, 1), 
                               i_size=50, j_size=35, i_resolution=5, j_resolution=5)
        
        # 测试几何构建
        builder = ExcavationGeometryBuilder()
        result = builder.build_excavation_from_contour(
            contour=test_contour,
            geology_mesh=geology_mesh,
            total_depth=3.0
        )
        
        if result.success:
            print("✅ 几何构建成功")
            print(f"   开挖ID: {result.excavation.id}")
            print(f"   总体积: {result.excavation.total_volume:.2f}m³")
            print(f"   表面积: {result.excavation.surface_area:.2f}m²")
            print(f"   构建时间: {result.build_time:.3f}s")
            return True
        else:
            print(f"❌ 几何构建失败: {result.message}")
            return False
            
    except Exception as e:
        print(f"❌ 几何构建测试失败: {str(e)}")
        return False

def run_all_tests():
    """运行所有测试"""
    print("[开始] 开挖设计功能测试开始...")
    print("=" * 60)
    
    start_time = time.time()
    
    # 运行各项测试
    tests = [
        ("DXF轮廓提取", test_dxf_contour_extraction),
        ("地表高程查询", test_surface_elevation_query),
        ("体积计算", test_volume_calculation),
        ("几何构建", test_geometry_construction)
    ]
    
    results = {}
    
    for test_name, test_func in tests:
        try:
            results[test_name] = test_func()
        except Exception as e:
            print(f"❌ {test_name}测试异常: {str(e)}")
            results[test_name] = False
    
    # 统计结果
    total_time = time.time() - start_time
    passed = sum(results.values())
    total = len(results)
    
    print("\n" + "=" * 60)
    print("📋 测试结果汇总:")
    
    for test_name, passed in results.items():
        status = "✅ 通过" if passed else "❌ 失败"
        print(f"   {test_name}: {status}")
    
    print(f"\n🏆 总体结果: {passed}/{total} 通过")
    print(f"⏱️ 总用时: {total_time:.2f}秒")
    
    if passed == total:
        print("🎉 所有测试通过！开挖设计功能实现完成。")
    else:
        print("⚠️ 部分测试失败，需要进一步调试。")
    
    return passed == total

if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)