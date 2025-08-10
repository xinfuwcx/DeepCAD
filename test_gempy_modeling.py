#!/usr/bin/env python3
"""
GemPy地质建模真实测试
使用刚生成的测试数据进行完整建模流程测试
"""

import json
import asyncio
import sys
import os
from pathlib import Path

# 添加项目路径
sys.path.insert(0, os.path.abspath('.'))

from gateway.modules.geology.gempy_integration_service import get_gempy_integration_service
from gateway.modules.geology.direct_geology_service import get_direct_geology_service

async def test_gempy_basic():
    """测试基础GemPy功能"""
    print("=" * 60)
    print("测试 GemPy 基础功能...")
    print("=" * 60)
    
    service = get_gempy_integration_service()
    
    # 检查依赖
    deps = service.check_dependencies()
    print("依赖检查结果:")
    for dep, status in deps.items():
        status_str = "OK" if status else "MISSING"
        print(f"  {dep}: {status_str}")
    
    if not all(deps.values()):
        print("ERROR: 缺少必要依赖，无法继续测试")
        return False
    
    print("\nGemPy 基础功能测试通过!")
    return True

async def test_data_loading():
    """测试数据加载"""
    print("\n" + "=" * 60)
    print("测试钻孔数据加载...")
    print("=" * 60)
    
    # 加载标准项目数据
    data_file = Path("data/test_geology/standard_project_boreholes.json")
    
    if not data_file.exists():
        print(f"ERROR: 测试数据文件不存在: {data_file}")
        return None
    
    with open(data_file, 'r', encoding='utf-8') as f:
        dataset = json.load(f)
    
    holes = dataset["holes"]
    
    print(f"成功加载数据集:")
    print(f"  钻孔数量: {len(holes)}")
    print(f"  描述: {dataset['description']}")
    
    # 统计土层信息
    soil_types = set()
    total_layers = 0
    depths = []
    
    for hole in holes:
        depths.append(hole["depth"])
        total_layers += len(hole["layers"])
        for layer in hole["layers"]:
            soil_types.add(layer["soil_type"])
    
    print(f"  总土层: {total_layers}")
    print(f"  土壤类型: {len(soil_types)} 种")
    print(f"  深度范围: {min(depths):.1f}m - {max(depths):.1f}m")
    
    return dataset

async def test_direct_modeling(dataset):
    """测试直接建模（RBF插值）"""
    print("\n" + "=" * 60)
    print("测试直接地质建模 (RBF插值)...")
    print("=" * 60)
    
    service = get_direct_geology_service()
    holes = dataset["holes"]
    
    # 准备建模参数
    modeling_params = {
        "borehole_data": holes,
        "domain": {
            "mode": "auto",
            "bounds": {
                "x_min": -120, "x_max": 120,
                "y_min": -120, "y_max": 120, 
                "z_min": -60, "z_max": 8
            },
            "resolution": [30, 30, 20]  # 较低分辨率以加快测试
        },
        "options": {
            "method": "rbf_multiquadric",
            "resolution_x": 30,
            "resolution_y": 30, 
            "resolution_z": 20,
            "alpha": 0.1,
            "enable_faults": False,
            "physics": {"gravity": False, "magnetic": False}
        }
    }
    
    print("开始RBF插值建模...")
    print(f"  数据点: {len(holes)}")
    print(f"  分辨率: {modeling_params['domain']['resolution']}")
    print(f"  总网格点: {30*30*20:,}")
    
    try:
        # 调用直接地质建模服务
        result = service.interpolate_and_generate_mesh(modeling_params)
        
        print("\nRBF建模结果:")
        print(f"  成功: {result.get('success', False)}")
        
        if result.get('success'):
            print(f"  插值完成: {result.get('interpolation_completed', False)}")
            print(f"  网格生成: {result.get('mesh_generated', False)}")
            
            # 获取统计信息
            stats = service.get_statistics()
            print(f"  处理时间: {stats.get('last_processing_time', 0):.2f}s")
            print(f"  插值点数: {stats.get('interpolation_points', 0)}")
            print(f"  网格顶点: {stats.get('mesh_vertices', 0):,}")
            print(f"  网格面数: {stats.get('mesh_faces', 0):,}")
            
            return result
        else:
            error = result.get('error', '未知错误')
            print(f"  错误: {error}")
            return None
            
    except Exception as e:
        print(f"建模过程发生异常: {e}")
        import traceback
        traceback.print_exc()
        return None

async def test_gempy_modeling(dataset):
    """测试GemPy完整建模"""
    print("\n" + "=" * 60)
    print("测试 GemPy 完整地质建模...")
    print("=" * 60)
    
    service = get_gempy_integration_service()
    holes = dataset["holes"]
    
    # 准备GemPy建模参数
    modeling_params = {
        "borehole_data": holes,
        "domain": {
            "mode": "auto",
            "bounds": {
                "x_min": -120, "x_max": 120,
                "y_min": -120, "y_max": 120,
                "z_min": -60, "z_max": 8
            },
            "resolution": [25, 25, 15]  # GemPy推荐的分辨率
        },
        "formations": {
            "素填土": "fill",
            "粘土": "clay", 
            "淤泥质粘土": "muddy_clay",
            "粉质粘土": "silty_clay",
            "粉砂": "silt",
            "细砂": "fine_sand",
            "中砂": "medium_sand",
            "砂质粘土": "sandy_clay"
        },
        "options": {
            "method": "kriging_interpolation",
            "resolution_x": 25,
            "resolution_y": 25,
            "resolution_z": 15,
            "alpha": 0.15,
            "enable_faults": False,
            "physics": {"gravity": False, "magnetic": False},
            "boundary": {
                "top": "free",
                "bottom": "fixed", 
                "groundwater": True
            }
        }
    }
    
    print("开始GemPy建模...")
    print(f"  土层类型: {len(modeling_params['formations'])} 种")
    print(f"  分辨率: {modeling_params['domain']['resolution']}")
    print(f"  总体素: {25*25*15:,}")
    
    try:
        # 调用GemPy隐式建模
        result = service.gempy_implicit_modeling(modeling_params)
        
        print("\nGemPy建模结果:")
        print(f"  成功: {result.get('success', False)}")
        
        if result.get('success'):
            model_stats = result.get('model_stats', {})
            print(f"  模型顶点: {model_stats.get('vertex_count', 0):,}")
            print(f"  三角面: {model_stats.get('triangle_count', 0):,}")
            print(f"  地质单元: {model_stats.get('n_formations', 0)}")
            print(f"  处理时间: {result.get('processing_time', 0):.2f}s")
            
            # 检查显示链数据
            display_chain = result.get('display_chain', {})
            if display_chain:
                threejs_objects = display_chain.get('threejs_objects_count', 0)
                print(f"  Three.js对象: {threejs_objects}")
                
                bounds = display_chain.get('bounds')
                if bounds:
                    print(f"  边界: X({bounds['x_min']:.1f},{bounds['x_max']:.1f}) "
                          f"Y({bounds['y_min']:.1f},{bounds['y_max']:.1f}) "
                          f"Z({bounds['z_min']:.1f},{bounds['z_max']:.1f})")
            
            return result
        else:
            error = result.get('error', '未知错误')
            print(f"  错误: {error}")
            return None
            
    except Exception as e:
        print(f"GemPy建模过程发生异常: {e}")
        import traceback
        traceback.print_exc()
        return None

async def test_direct_display_chain(dataset):
    """测试GemPy直接显示链路"""
    print("\n" + "=" * 60)
    print("测试 GemPy -> Three.js 直接显示链路...")
    print("=" * 60)
    
    service = get_gempy_integration_service()
    holes = dataset["holes"]
    
    # 准备直接显示链路参数
    params = {
        "borehole_data": holes,
        "domain": {
            "mode": "auto",
            "bounds": {
                "x_min": -100, "x_max": 100,
                "y_min": -100, "y_max": 100,
                "z_min": -50, "z_max": 5
            },
            "resolution": [20, 20, 12]  # 更低分辨率，专注测试链路
        },
        "formations": {
            "素填土": "fill",
            "粘土": "clay",
            "淤泥质粘土": "muddy_clay", 
            "粉质粘土": "silty_clay",
            "粉砂": "silt",
            "细砂": "fine_sand"
        },
        "options": {
            "method": "direct_chain",
            "resolution_x": 20,
            "resolution_y": 20,
            "resolution_z": 12,
            "alpha": 0.1,
            "enable_faults": False
        }
    }
    
    print("开始直接显示链路测试...")
    print(f"  分辨率: {params['domain']['resolution']}")
    print(f"  目标: 直接生成Three.js可用数据")
    
    try:
        # 调用地质建模处理请求 (包含显示链)
        result = service.process_geological_modeling_request(params)
        
        print("\n直接显示链路结果:")
        print(f"  成功: {result.get('success', False)}")
        
        if result.get('success'):
            threejs_data = result.get('threejs_data', {})
            print(f"  Three.js对象数: {len(threejs_data)}")
            
            total_vertices = 0
            for obj_name, obj_data in threejs_data.items():
                vertices = obj_data.get('vertices', [])
                faces = obj_data.get('faces', [])
                material = obj_data.get('material', {})
                
                print(f"    {obj_name}:")
                print(f"      顶点: {len(vertices)//3:,}")
                print(f"      面片: {len(faces)//3:,}")
                print(f"      颜色: {material.get('color', 'default')}")
                
                total_vertices += len(vertices)//3
            
            print(f"  总顶点数: {total_vertices:,}")
            print(f"  处理时间: {result.get('processing_time', 0):.2f}s")
            
            # 保存结果以供前端使用
            output_file = Path("data/test_geology/direct_chain_result.json") 
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(result, f, ensure_ascii=False, indent=2)
            print(f"  结果已保存: {output_file}")
            
            return result
        else:
            error = result.get('error', '未知错误')
            print(f"  错误: {error}")
            return None
            
    except Exception as e:
        print(f"直接显示链路测试异常: {e}")
        import traceback
        traceback.print_exc()
        return None

async def main():
    """主测试函数"""
    print("开始GemPy地质建模完整测试流程...")
    
    # 1. 基础功能测试
    basic_ok = await test_gempy_basic()
    if not basic_ok:
        return
    
    # 2. 数据加载测试
    dataset = await test_data_loading()
    if not dataset:
        return
        
    # 3. 直接建模测试（RBF）
    direct_result = await test_direct_modeling(dataset)
    
    # 4. GemPy完整建模测试
    gempy_result = await test_gempy_modeling(dataset)
    
    # 5. 直接显示链路测试
    chain_result = await test_direct_display_chain(dataset)
    
    # 总结测试结果
    print("\n" + "="*80)
    print("地质建模测试总结")
    print("="*80)
    
    tests = [
        ("RBF直接建模", direct_result),
        ("GemPy完整建模", gempy_result),
        ("直接显示链路", chain_result)
    ]
    
    success_count = 0
    for test_name, result in tests:
        status = "成功" if result and result.get('success') else "失败"
        print(f"  {test_name}: {status}")
        if result and result.get('success'):
            success_count += 1
    
    print(f"\n测试通过率: {success_count}/{len(tests)} ({success_count/len(tests)*100:.1f}%)")
    
    if success_count == len(tests):
        print("所有地质建模功能测试通过！系统可以投入使用。")
    else:
        print("部分测试失败，请检查错误信息并修复问题。")

if __name__ == "__main__":
    asyncio.run(main())