#!/usr/bin/env python3
"""
完整地质建模工作流测试
验证从数据生成到Three.js可视化的完整链路
"""

import json
import sys
import os
import time
from pathlib import Path

# 添加项目路径
sys.path.insert(0, os.path.abspath('.'))

def test_complete_workflow():
    """测试完整的地质建模工作流"""
    print("=" * 80)
    print("🌍 完整地质建模工作流测试")
    print("=" * 80)
    
    results = {}
    
    print("\n📊 第一步: 生成测试数据")
    print("-" * 50)
    try:
        # 执行测试数据生成
        import subprocess
        result = subprocess.run([sys.executable, 'test_realistic_geology_data.py'], 
                              capture_output=True, text=True, encoding='gbk', errors='ignore')
        if result.returncode == 0:
            print("✅ 测试数据生成成功")
            results['data_generation'] = True
        else:
            print("❌ 测试数据生成失败")
            results['data_generation'] = False
    except Exception as e:
        print(f"❌ 数据生成异常: {e}")
        results['data_generation'] = False
    
    print("\n🔧 第二步: 地质建模服务")
    print("-" * 50)
    try:
        from gateway.modules.geology.direct_geology_service import get_direct_geology_service
        service = get_direct_geology_service()
        
        # 简单测试数据
        test_points = [
            {"id": "T1", "x": 0.0, "y": 0.0, "z": 0.0, "soil_type": "clay", "layer_id": 1},
            {"id": "T2", "x": 100.0, "y": 0.0, "z": -3.0, "soil_type": "sand", "layer_id": 2}, 
            {"id": "T3", "x": 50.0, "y": 100.0, "z": -1.5, "soil_type": "clay", "layer_id": 1},
            {"id": "T4", "x": 0.0, "y": 100.0, "z": -2.0, "soil_type": "silt", "layer_id": 3}
        ]
        
        service.load_borehole_data(test_points)
        mesh_data = service.interpolate_and_generate_mesh(grid_resolution=30.0, expansion=25.0)
        
        if mesh_data:
            metadata = mesh_data.get('metadata', {})
            print(f"✅ 地质建模成功")
            print(f"   - 顶点: {metadata.get('n_vertices', 0):,}")
            print(f"   - 三角形: {metadata.get('n_triangles', 0):,}")
            print(f"   - 钻孔: {metadata.get('n_boreholes', 0)}")
            results['modeling'] = True
        else:
            print("❌ 地质建模失败")
            results['modeling'] = False
            
    except Exception as e:
        print(f"❌ 建模服务异常: {e}")
        results['modeling'] = False
    
    print("\n💾 第三步: Three.js数据导出")
    print("-" * 50)
    try:
        if results.get('modeling'):
            output_path = service.export_to_json("data/test_geology")
            if os.path.exists(output_path):
                file_size = os.path.getsize(output_path) / 1024  # KB
                print(f"✅ Three.js数据导出成功")
                print(f"   - 文件: {output_path}")
                print(f"   - 大小: {file_size:.1f} KB")
                results['threejs_export'] = True
            else:
                print("❌ 导出文件不存在")
                results['threejs_export'] = False
        else:
            print("⏭️  跳过（建模未成功）")
            results['threejs_export'] = False
            
    except Exception as e:
        print(f"❌ 数据导出异常: {e}")
        results['threejs_export'] = False
    
    print("\n🎨 第四步: HTML可视化页面")
    print("-" * 50)
    html_file = Path("test_threejs_integration.html")
    if html_file.exists():
        print(f"✅ Three.js可视化页面已创建")
        print(f"   - 文件: {html_file}")
        print(f"   - 大小: {html_file.stat().st_size / 1024:.1f} KB")
        results['visualization'] = True
    else:
        print("❌ 可视化页面不存在")
        results['visualization'] = False
    
    print("\n🔍 第五步: 验证数据完整性")
    print("-" * 50)
    try:
        # 检查生成的数据文件
        data_files = list(Path("data/test_geology").glob("*.json"))
        mesh_files = [f for f in data_files if 'geology_mesh' in f.name]
        
        if mesh_files:
            latest_mesh = max(mesh_files, key=lambda f: f.stat().st_mtime)
            with open(latest_mesh, 'r', encoding='utf-8') as f:
                mesh_data = json.load(f)
            
            # 验证数据结构
            required_fields = ['vertices', 'indices', 'colors', 'metadata']
            missing_fields = [field for field in required_fields if field not in mesh_data]
            
            if not missing_fields:
                print(f"✅ 数据完整性验证通过")
                print(f"   - 文件: {latest_mesh.name}")
                print(f"   - 顶点数组: {len(mesh_data['vertices'])} 元素")
                print(f"   - 索引数组: {len(mesh_data['indices'])} 元素")
                print(f"   - 颜色数组: {len(mesh_data['colors'])} 元素")
                results['data_integrity'] = True
            else:
                print(f"❌ 数据不完整，缺少字段: {missing_fields}")
                results['data_integrity'] = False
        else:
            print("❌ 未找到网格数据文件")
            results['data_integrity'] = False
            
    except Exception as e:
        print(f"❌ 数据验证异常: {e}")
        results['data_integrity'] = False
    
    print("\n🧪 第六步: 系统兼容性检查")
    print("-" * 50)
    compatibility_results = {}
    
    # 检查关键依赖
    try:
        import numpy as np
        compatibility_results['numpy'] = np.__version__
    except ImportError:
        compatibility_results['numpy'] = "❌ 缺失"
    
    try:
        import scipy
        compatibility_results['scipy'] = scipy.__version__
    except ImportError:
        compatibility_results['scipy'] = "❌ 缺失"
    
    try:
        import gempy as gp
        compatibility_results['gempy'] = gp.__version__
    except ImportError:
        compatibility_results['gempy'] = "❌ 缺失"
    
    try:
        import pyvista as pv
        compatibility_results['pyvista'] = pv.__version__
    except ImportError:
        compatibility_results['pyvista'] = "❌ 缺失"
    
    # 检查Python版本
    python_version = f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
    compatibility_results['python'] = python_version
    
    print("系统环境:")
    for lib, version in compatibility_results.items():
        status = "✅" if not version.startswith("❌") else "❌"
        print(f"   {lib}: {version} {status}")
    
    results['compatibility'] = all(not v.startswith("❌") for v in compatibility_results.values())
    
    return results

def print_summary(results):
    """打印测试总结"""
    print("\n" + "=" * 80)
    print("📋 地质建模系统完整测试报告")
    print("=" * 80)
    
    test_items = [
        ("数据生成", results.get('data_generation', False)),
        ("地质建模", results.get('modeling', False)),
        ("Three.js导出", results.get('threejs_export', False)),
        ("可视化页面", results.get('visualization', False)),
        ("数据完整性", results.get('data_integrity', False)),
        ("系统兼容性", results.get('compatibility', False))
    ]
    
    passed = sum(1 for _, result in test_items if result)
    total = len(test_items)
    
    print(f"\n📊 测试结果概览:")
    for name, result in test_items:
        status = "✅ 通过" if result else "❌ 失败"
        print(f"   {name:12} : {status}")
    
    print(f"\n🎯 总体评分: {passed}/{total} ({passed/total*100:.1f}%)")
    
    if passed == total:
        print("\n🎉 恭喜！地质建模系统已完全就绪")
        print("   ✓ 所有核心功能测试通过")
        print("   ✓ 数据处理链路正常")
        print("   ✓ Three.js集成成功")
        print("   ✓ 可以投入生产使用")
    elif passed >= total * 0.8:
        print("\n🚀 系统基本可用，建议继续优化")
        print("   ✓ 核心功能正常")
        print("   ⚠ 部分功能需要完善")
    elif passed >= total * 0.5:
        print("\n🔧 系统部分可用，需要重点修复")
        print("   ⚠ 基础功能存在问题")
        print("   🔧 建议优先解决失败项")
    else:
        print("\n❌ 系统存在重大问题，需要全面检查")
        print("   ❌ 多个核心功能失败")
        print("   🔧 建议检查环境配置和依赖")
    
    print(f"\n📖 使用指南:")
    if results.get('visualization'):
        print("   1. 启动HTTP服务器: python -m http.server 8000")
        print("   2. 访问: http://localhost:8000/test_threejs_integration.html")
        print("   3. 查看地质网格三维可视化效果")
    
    if results.get('modeling'):
        print("   4. 集成到前端: 使用 data/test_geology/ 下的JSON文件")
        print("   5. API调用: 参考 gateway/modules/geology/ 服务")
    
    print("\n📁 相关文件:")
    print("   - 测试数据: data/test_geology/")
    print("   - 可视化页面: test_threejs_integration.html")
    print("   - API服务: gateway/modules/geology/")
    print("   - 前端组件: frontend/src/components/geology/")

def main():
    """主函数"""
    print("开始地质建模系统完整工作流测试...")
    
    start_time = time.time()
    results = test_complete_workflow()
    end_time = time.time()
    
    print(f"\n⏱️ 总耗时: {end_time - start_time:.2f} 秒")
    
    print_summary(results)
    
    # 返回成功状态
    passed = sum(1 for result in results.values() if result)
    return passed >= len(results) * 0.8  # 80%通过率算成功

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)