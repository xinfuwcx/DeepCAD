#!/usr/bin/env python3
"""
GemPy完整显示链路集成测试
测试 GemPy → GemPy-Viewer → PyVista → VTK → Three.js 的完整显示链路
"""

import sys
import json
import time
from typing import Dict, Any

def test_dependencies():
    """测试依赖库安装状态"""
    print("🔍 测试依赖库安装状态...")
    
    results = {}
    
    # 测试GemPy
    try:
        import gempy as gp
        results['gempy'] = {
            'available': True,
            'version': gp.__version__,
            'location': gp.__file__
        }
        print(f"✅ GemPy {gp.__version__}: 已安装")
    except Exception as e:
        results['gempy'] = {'available': False, 'error': str(e)}
        print(f"❌ GemPy: {e}")

    # 测试GemPy-Viewer
    try:
        import gempy_viewer as gpv
        results['gempy_viewer'] = {
            'available': True,
            'location': gpv.__file__
        }
        print(f"✅ GemPy-Viewer: 已安装")
    except Exception as e:
        results['gempy_viewer'] = {'available': False, 'error': str(e)}
        print(f"❌ GemPy-Viewer: {e}")

    # 测试PyVista
    try:
        import pyvista as pv
        results['pyvista'] = {
            'available': True,
            'version': pv.__version__,
            'location': pv.__file__
        }
        print(f"✅ PyVista {pv.__version__}: 已安装")
    except Exception as e:
        results['pyvista'] = {'available': False, 'error': str(e)}
        print(f"❌ PyVista: {e}")

    # 测试VTK
    try:
        import vtk
        results['vtk'] = {
            'available': True,
            'version': vtk.vtkVersion.GetVTKVersion(),
            'location': vtk.__file__
        }
        print(f"✅ VTK {vtk.vtkVersion.GetVTKVersion()}: 已安装")
    except Exception as e:
        results['vtk'] = {'available': False, 'error': str(e)}
        print(f"❌ VTK: {e}")

    return results

def test_gempy_integration_service():
    """测试GemPy集成服务"""
    print("\n🏔️ 测试GemPy集成服务...")
    
    try:
        # 导入我们的集成服务
        sys.path.append('E:\\DeepCAD')
        from gateway.modules.geology.gempy_integration_service import GemPyIntegrationService
        
        # 创建服务实例
        service = GemPyIntegrationService()
        
        # 检查依赖
        deps = service.check_dependencies()
        print(f"📦 依赖状态: {deps}")
        
        # 创建测试数据
        test_borehole_data = {
            'coordinates': [
                [0, 0, 0],
                [10, 0, -5],
                [20, 0, -10],
                [0, 10, -3],
                [10, 10, -8]
            ],
            'formations': ['clay', 'sand', 'clay', 'sand', 'clay'],
            'properties': [{} for _ in range(5)]
        }
        
        test_domain_config = {
            'extent': [-5, 25, -5, 15, -15, 5],
            'resolution': [20, 20, 15],
            'interpolation_method': 'rbf_multiquadric'
        }
        
        print("🎯 开始测试地质建模...")
        start_time = time.time()
        
        # 根据依赖可用性选择方法
        if deps.get('gempy', False):
            print("使用GemPy隐式建模")
            result = service.gempy_implicit_modeling(test_borehole_data, test_domain_config)
        else:
            print("使用增强RBF建模")
            result = service.enhanced_rbf_modeling(test_borehole_data, test_domain_config)
        
        end_time = time.time()
        
        print(f"⏱️ 建模耗时: {end_time - start_time:.2f}秒")
        print(f"📊 建模结果:")
        print(f"  - 成功: {result.get('success', False)}")
        print(f"  - 方法: {result.get('method', 'unknown')}")
        print(f"  - 显示链路: {result.get('display_chain', {})}")
        print(f"  - 模型统计: {result.get('model_stats', {})}")
        print(f"  - Three.js对象数: {len(result.get('threejs_data', {}))}")
        
        return result
        
    except Exception as e:
        print(f"❌ GemPy集成服务测试失败: {e}")
        import traceback
        traceback.print_exc()
        return None

def test_api_endpoint():
    """测试API端点（如果服务器在运行）"""
    print("\n🌐 测试API端点...")
    
    try:
        import requests
        
        # 测试数据
        test_payload = {
            "borehole_data": [
                {"x": 0, "y": 0, "z": 0, "formation": "clay", "properties": {}},
                {"x": 10, "y": 0, "z": -5, "formation": "sand", "properties": {}},
                {"x": 20, "y": 0, "z": -10, "formation": "clay", "properties": {}}
            ],
            "formations": {"clay": "clay", "sand": "sand"},
            "options": {"resolution_x": 20, "resolution_y": 20, "alpha": 0.1}
        }
        
        # 发送请求
        response = requests.post(
            'http://localhost:8000/api/geology/gempy-modeling',
            json=test_payload,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            print("✅ API端点测试成功!")
            print(f"  - 方法: {result.get('method', 'unknown')}")
            print(f"  - 显示链路状态: {result.get('display_chain', {})}")
            return result
        else:
            print(f"❌ API请求失败: {response.status_code}")
            print(f"  - 响应: {response.text}")
            return None
            
    except requests.exceptions.ConnectionError:
        print("⚠️ API服务器未运行，跳过API端点测试")
        return None
    except Exception as e:
        print(f"❌ API端点测试失败: {e}")
        return None

def main():
    """主测试函数"""
    print("🚀 GemPy完整显示链路集成测试")
    print("=" * 50)
    
    # 1. 测试依赖
    deps_result = test_dependencies()
    
    # 2. 测试集成服务
    service_result = test_gempy_integration_service()
    
    # 3. 测试API端点
    api_result = test_api_endpoint()
    
    # 生成测试报告
    print("\n📋 测试报告")
    print("=" * 50)
    
    # 依赖报告
    all_deps = ['gempy', 'gempy_viewer', 'pyvista', 'vtk']
    available_deps = [dep for dep in all_deps if deps_result.get(dep, {}).get('available', False)]
    
    print(f"📦 依赖状态: {len(available_deps)}/{len(all_deps)} 可用")
    for dep in all_deps:
        status = "✅" if deps_result.get(dep, {}).get('available', False) else "❌"
        print(f"  {status} {dep}")
    
    # 服务报告
    if service_result:
        print(f"🏔️ 集成服务: ✅ 正常")
        print(f"  - 建模方法: {service_result.get('method', 'unknown')}")
        if 'display_chain' in service_result:
            chain = service_result['display_chain']
            print(f"  - GemPy: {'✅' if chain.get('gempy_available') else '❌'}")
            print(f"  - GemPy-Viewer: {'✅' if chain.get('gempy_viewer_available') else '❌'}")
            print(f"  - PyVista: {'✅' if chain.get('pyvista_available') else '❌'}")
    else:
        print("🏔️ 集成服务: ❌ 异常")
    
    # API报告
    if api_result:
        print("🌐 API端点: ✅ 正常")
    else:
        print("🌐 API端点: ❌ 异常或未运行")
    
    # 综合评估
    print("\n🎯 综合评估")
    if len(available_deps) >= 3 and service_result:
        print("✅ GemPy完整显示链路基本就绪!")
        print("💡 建议: 确保所有依赖都已安装，然后启动Web服务测试完整功能")
    elif len(available_deps) >= 2:
        print("⚠️ GemPy显示链路部分就绪")
        print("💡 建议: 安装缺失的依赖以获得完整功能")
    else:
        print("❌ GemPy显示链路未就绪")
        print("💡 建议: 运行 'pip install -r requirements.txt' 安装依赖")

if __name__ == "__main__":
    main()