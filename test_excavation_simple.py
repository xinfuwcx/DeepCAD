"""
开挖设计功能简单测试脚本
测试核心模块的基本功能
"""

import sys
import os
from pathlib import Path

# 添加项目路径
project_root = Path(__file__).parent
sys.path.append(str(project_root))
sys.path.append(str(project_root / "gateway"))

def test_imports():
    """测试模块导入"""
    print("\n[测试] 模块导入...")
    
    try:
        from gateway.modules.excavation.dxf_excavation_processor import ExcavationDXFProcessor, ExcavationContour
        print("  - DXF处理器导入成功")
        
        from gateway.modules.excavation.surface_elevation_query import SurfaceElevationQueryEngine
        print("  - 地表高程查询引擎导入成功")
        
        from gateway.modules.excavation.excavation_geometry_builder import ExcavationGeometryBuilder
        print("  - 几何构建器导入成功")
        
        from gateway.modules.excavation.volume_calculator import ExcavationVolumeCalculator
        print("  - 体积计算器导入成功")
        
        return True
        
    except Exception as e:
        print(f"[错误] 模块导入失败: {str(e)}")
        return False

def test_contour_processing():
    """测试轮廓处理"""
    print("\n[测试] 轮廓处理...")
    
    try:
        from gateway.modules.excavation.dxf_excavation_processor import ExcavationContour, ExcavationDXFProcessor
        
        # 创建测试轮廓
        test_contour = ExcavationContour(
            id="test_1",
            name="测试矩形",
            points=[(0, 0), (50, 0), (50, 30), (0, 30)],
            is_closed=True,
            area=1500.0,
            centroid=(25.0, 15.0),
            layer_name="test"
        )
        
        print(f"  - 创建轮廓: {test_contour.name}")
        print(f"  - 轮廓面积: {test_contour.area} 平方米")
        print(f"  - 轮廓点数: {len(test_contour.points)}")
        print(f"  - 质心位置: {test_contour.centroid}")
        
        # 测试面积和质心计算
        processor = ExcavationDXFProcessor()
        calculated_area = abs(processor._calculate_polygon_area(test_contour.points))
        calculated_centroid = processor._calculate_polygon_centroid(test_contour.points)
        
        print(f"  - 计算面积: {calculated_area:.2f} 平方米")
        print(f"  - 计算质心: ({calculated_centroid[0]:.2f}, {calculated_centroid[1]:.2f})")
        
        return True
        
    except Exception as e:
        print(f"[错误] 轮廓处理测试失败: {str(e)}")
        return False

def test_volume_calculation():
    """测试体积计算"""
    print("\n[测试] 体积计算...")
    
    try:
        from gateway.modules.excavation.dxf_excavation_processor import ExcavationContour
        from gateway.modules.excavation.volume_calculator import ExcavationVolumeCalculator
        from gateway.modules.excavation.surface_elevation_query import ElevationPoint
        
        # 创建测试轮廓（20m x 20m正方形）
        test_contour = ExcavationContour(
            id="vol_test",
            name="体积测试",
            points=[(0, 0), (20, 0), (20, 20), (0, 20)],
            is_closed=True,
            area=400.0,
            centroid=(10.0, 10.0),
            layer_name="volume_test"
        )
        
        # 创建地表高程点（平坦地表）
        surface_elevations = [
            ElevationPoint(x=0, y=0, z=0.0),
            ElevationPoint(x=20, y=0, z=0.0),
            ElevationPoint(x=20, y=20, z=0.0),
            ElevationPoint(x=0, y=20, z=0.0)
        ]
        
        # 计算体积
        calculator = ExcavationVolumeCalculator()
        result = calculator.calculate_excavation_volume(
            contour=test_contour,
            surface_elevations=surface_elevations,
            excavation_depth=2.0,  # 2米深
            calculation_method='simple'
        )
        
        if result.success:
            print(f"  - 计算成功")
            print(f"  - 总体积: {result.total_volume:.2f} 立方米")
            print(f"  - 开挖面积: {result.surface_area:.2f} 平方米") 
            print(f"  - 平均深度: {result.avg_depth:.2f} 米")
            print(f"  - 计算方法: {result.calculation_method}")
            
            # 验证结果（理论值：20*20*2 = 800 立方米）
            expected = 400 * 2  # 800
            error = abs(result.total_volume - expected) / expected * 100 if expected > 0 else 0
            print(f"  - 理论值: {expected} 立方米")
            print(f"  - 误差: {error:.2f}%")
            
            return True
        else:
            print(f"[失败] 体积计算失败: {result.message}")
            return False
            
    except Exception as e:
        print(f"[错误] 体积计算测试失败: {str(e)}")
        return False

def test_dependencies():
    """测试依赖库"""
    print("\n[测试] 依赖库检查...")
    
    dependencies = {
        'numpy': 'numpy',
        'pydantic': 'pydantic',
        'pathlib': 'pathlib',
        'logging': 'logging',
        'typing': 'typing',
        'uuid': 'uuid',
        'time': 'time'
    }
    
    optional_deps = {
        'pyvista': 'pyvista',
        'scipy': 'scipy.spatial',
        'ezdxf': 'ezdxf'
    }
    
    # 检查必需依赖
    for name, module in dependencies.items():
        try:
            __import__(module)
            print(f"  - {name}: 已安装")
        except ImportError:
            print(f"  - {name}: 未安装 [必需]")
            return False
    
    # 检查可选依赖
    for name, module in optional_deps.items():
        try:
            __import__(module)
            print(f"  - {name}: 已安装 [可选]")
        except ImportError:
            print(f"  - {name}: 未安装 [可选，功能受限]")
    
    return True

def run_simple_tests():
    """运行简单测试"""
    print("=" * 60)
    print("开挖设计模块简单功能测试")
    print("=" * 60)
    
    tests = [
        ("依赖库检查", test_dependencies),
        ("模块导入", test_imports),
        ("轮廓处理", test_contour_processing),
        ("体积计算", test_volume_calculation)
    ]
    
    results = []
    
    for test_name, test_func in tests:
        print(f"\n{'='*20} {test_name} {'='*20}")
        try:
            success = test_func()
            results.append((test_name, success))
            print(f"\n[结果] {test_name}: {'通过' if success else '失败'}")
        except Exception as e:
            print(f"\n[异常] {test_name}: {str(e)}")
            results.append((test_name, False))
    
    # 总结
    print("\n" + "=" * 60)
    print("测试结果总结:")
    print("=" * 60)
    
    passed = 0
    for test_name, success in results:
        status = "通过" if success else "失败"
        print(f"  {test_name}: {status}")
        if success:
            passed += 1
    
    print(f"\n总体结果: {passed}/{len(results)} 测试通过")
    
    if passed == len(results):
        print("\n[成功] 所有测试通过，开挖设计模块基本功能正常！")
    else:
        print(f"\n[注意] {len(results) - passed} 个测试失败，需要检查相关功能")
    
    return passed == len(results)

if __name__ == "__main__":
    success = run_simple_tests()
    print("\n" + "=" * 60)
    sys.exit(0 if success else 1)