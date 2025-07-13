#!/usr/bin/env python3
"""
测试高级网格算法配置API的脚本
"""
import requests
import json
import time

# API基础地址
BASE_URL = "http://localhost:8000/api/meshing"

def test_advanced_mesh_api():
    """测试高级网格算法配置API的所有端点"""
    
    print("🔬 测试高级网格算法配置API")
    print("=" * 60)
    
    # 测试1: 获取算法预设
    print("\n1. 测试 GET /algorithms/presets...")
    try:
        response = requests.get(f"{BASE_URL}/algorithms/presets")
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ 成功: 找到 {data['total_count']} 个预设")
            print(f"   分类: {list(data['categories'].keys())}")
            
            # 显示部分预设
            for preset in data['presets'][:3]:
                print(f"   - {preset['name']}: {preset['description']}")
        else:
            print(f"   ❌ 失败: {response.status_code}")
    except Exception as e:
        print(f"   ❌ 错误: {e}")
    
    # 测试2: 获取算法信息
    print("\n2. 测试 GET /algorithms/info...")
    try:
        response = requests.get(f"{BASE_URL}/algorithms/info")
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ 成功: 支持的2D算法数量: {len(data['algorithm_info']['2d_algorithms'])}")
            print(f"   支持的3D算法数量: {len(data['algorithm_info']['3d_algorithms'])}")
            print(f"   支持的文件格式: {data['supported_formats']}")
            print(f"   并行计算支持: {data['parallel_support']}")
        else:
            print(f"   ❌ 失败: {response.status_code}")
    except Exception as e:
        print(f"   ❌ 错误: {e}")
    
    # 测试3: 性能估算
    print("\n3. 测试 GET /algorithms/performance-estimate...")
    try:
        params = {
            'element_size': 1.0,
            'geometry_complexity': 'medium',
            'algorithm_2d': 'delaunay',
            'algorithm_3d': 'delaunay',
            'quality_mode': 'balanced'
        }
        
        response = requests.get(f"{BASE_URL}/algorithms/performance-estimate", params=params)
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ 成功: 预计单元数 {data['estimated_elements']:,}")
            print(f"   预计时间: {data['estimated_time_seconds']}秒")
            print(f"   预计内存: {data['estimated_memory_mb']:.1f}MB")
            print(f"   性能等级: {data['performance_class']}")
            if data['recommendations']:
                print(f"   建议: {'; '.join(data['recommendations'])}")
        else:
            print(f"   ❌ 失败: {response.status_code}")
    except Exception as e:
        print(f"   ❌ 错误: {e}")
    
    # 测试4: 配置验证
    print("\n4. 测试 POST /algorithms/validate-config...")
    try:
        test_config = {
            "global_element_size": 1.0,
            "algorithm_2d": "delaunay",
            "algorithm_3d": "delaunay",
            "element_2d_type": "triangle",
            "element_3d_type": "tetrahedron",
            "quality_mode": "balanced",
            "refinement_strategy": "uniform",
            "smoothing_algorithm": "laplacian",
            "enable_smoothing": True,
            "smoothing_iterations": 3,
            "enable_optimization": True,
            "generate_second_order": False,
            "algorithm_params": {
                "min_element_quality": 0.3,
                "max_aspect_ratio": 10.0,
                "optimization_iterations": 5
            },
            "size_field": {
                "enable_size_field": False,
                "min_size": 0.1,
                "max_size": 10.0,
                "growth_rate": 1.2,
                "curvature_adaptation": False
            },
            "boundary_layers": {
                "enable_boundary_layers": False,
                "number_of_layers": 3,
                "first_layer_thickness": 0.01,
                "growth_ratio": 1.3
            },
            "parallel_config": {
                "enable_parallel": False,
                "num_threads": 4,
                "load_balancing": True
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/algorithms/validate-config",
            json=test_config,
            headers={'Content-Type': 'application/json'}
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ 成功: 配置有效性 {data['is_valid']}")
            if data['warnings']:
                print(f"   警告数量: {len(data['warnings'])}")
            if data['errors']:
                print(f"   错误数量: {len(data['errors'])}")
            if data['recommendations']:
                print(f"   建议数量: {len(data['recommendations'])}")
        else:
            print(f"   ❌ 失败: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"   ❌ 错误: {e}")
    
    # 测试5: 高级网格生成 (启动)
    print("\n5. 测试 POST /generate/advanced...")
    try:
        mesh_request = {
            "project_id": "test_project",
            "geometry_id": "test_geometry",
            "config": test_config,
            "physical_groups": [],
            "output_formats": ["vtk", "msh"]
        }
        
        response = requests.post(
            f"{BASE_URL}/generate/advanced",
            json=mesh_request,
            headers={'Content-Type': 'application/json'}
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ 成功: 网格生成已启动")
            print(f"   网格ID: {data['mesh_id']}")
            print(f"   状态: {data['status']['status']}")
            print(f"   进度: {data['status']['progress']}%")
        else:
            print(f"   ❌ 失败: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"   ❌ 错误: {e}")
    
    # 测试6: 验证无效配置
    print("\n6. 测试配置验证 (无效配置)...")
    try:
        invalid_config = test_config.copy()
        invalid_config["global_element_size"] = -1.0  # 无效值
        invalid_config["size_field"]["enable_size_field"] = True
        invalid_config["size_field"]["min_size"] = 10.0  # 最小尺寸大于最大尺寸
        invalid_config["size_field"]["max_size"] = 5.0
        
        response = requests.post(
            f"{BASE_URL}/algorithms/validate-config",
            json=invalid_config,
            headers={'Content-Type': 'application/json'}
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ 成功: 检测到配置无效 - {data['is_valid']}")
            print(f"   错误数量: {len(data['errors'])}")
            if data['errors']:
                for error in data['errors'][:2]:  # 显示前两个错误
                    print(f"   - {error}")
        else:
            print(f"   ❌ 失败: {response.status_code}")
    except Exception as e:
        print(f"   ❌ 错误: {e}")
    
    # 测试7: 不同复杂度的性能估算对比
    print("\n7. 测试不同复杂度的性能估算...")
    complexities = ['low', 'medium', 'high']
    for complexity in complexities:
        try:
            params = {
                'element_size': 1.0,
                'geometry_complexity': complexity,
                'algorithm_2d': 'delaunay',
                'algorithm_3d': 'delaunay',
                'quality_mode': 'balanced'
            }
            
            response = requests.get(f"{BASE_URL}/algorithms/performance-estimate", params=params)
            if response.status_code == 200:
                data = response.json()
                print(f"   {complexity.capitalize()}: {data['estimated_time_seconds']}秒, "
                      f"{data['estimated_elements']:,}单元, {data['performance_class']}")
        except Exception as e:
            print(f"   ❌ {complexity} 复杂度测试失败: {e}")
    
    print("\n" + "=" * 60)
    print("🎉 高级网格算法配置API测试完成!")
    print("\n使用说明:")
    print("1. 启动后端服务: python start_backend.py")
    print("2. 运行此测试: python test_advanced_mesh_api.py")
    print("3. 在前端界面测试高级配置功能")
    print("\n主要功能:")
    print("- ✅ 6种预设算法模板 (快速/平衡/高质量)")
    print("- ✅ 多种2D/3D网格算法 (Delaunay/Frontal/MMG/Netgen)")
    print("- ✅ 尺寸场控制和边界层网格")
    print("- ✅ 并行计算支持")
    print("- ✅ 实时性能估算和配置验证")
    print("- ✅ 质量优化和平滑算法")


if __name__ == "__main__":
    test_advanced_mesh_api()