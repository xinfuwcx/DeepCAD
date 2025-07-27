#!/usr/bin/env python3
"""
简化的PyVista功能测试
验证核心功能而不依赖gmsh
"""

import os
import sys
import tempfile
import numpy as np
from pathlib import Path

# 添加项目路径
sys.path.append(os.path.dirname(__file__))
sys.path.append(os.path.join(os.path.dirname(__file__), 'gateway'))

def test_basic_workflow():
    """测试基本工作流程"""
    print("🔄 测试基本PyVista工作流程...")
    
    try:
        import pyvista as pv
        from gateway.modules.visualization.pyvista_web_bridge import get_pyvista_bridge
        
        # 1. 创建简单网格
        mesh = pv.Sphere(radius=1.0, center=(0, 0, 0))
        mesh["temperature"] = np.random.random(mesh.n_points) * 100
        mesh["stress"] = np.random.random(mesh.n_points) * 50
        
        print(f"✅ 创建球形网格: {mesh.n_points} 点, {mesh.n_cells} 单元")
        
        # 2. 获取bridge实例
        bridge = get_pyvista_bridge()
        if not bridge.is_available:
            raise RuntimeError("PyVista bridge not available")
        
        # 3. 获取网格信息
        mesh_info = bridge.get_mesh_info(mesh)
        print(f"✅ 网格信息: {mesh_info}")
        
        # 4. 导出为glTF
        gltf_path = bridge.mesh_to_web_format(mesh, "gltf")
        if gltf_path:
            print(f"✅ glTF导出成功: {gltf_path}")
            
            # 验证文件存在
            if Path(gltf_path).exists():
                file_size = Path(gltf_path).stat().st_size
                print(f"✅ glTF文件大小: {file_size} bytes")
            else:
                print("❌ glTF文件不存在")
                return False
        else:
            print("❌ glTF导出失败")
            return False
        
        # 5. 生成预览图像
        preview_path = bridge.generate_preview_image(mesh)
        if preview_path:
            print(f"✅ 预览图生成成功: {preview_path}")
        else:
            print("⚠️  预览图生成失败（可能是由于无显示设备）")
        
        # 6. 测试网格处理
        processed_mesh = bridge.process_mesh_for_web(
            mesh, 
            render_type="surface",
            color_by="temperature"
        )
        
        if processed_mesh:
            print("✅ 网格处理成功")
        else:
            print("❌ 网格处理失败")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ 基本工作流程测试失败: {e}")
        return False

def test_mesh_formats():
    """测试支持的网格格式"""
    print("\n📁 测试网格格式支持...")
    
    try:
        import pyvista as pv
        from gateway.modules.visualization.pyvista_web_bridge import get_pyvista_bridge
        
        bridge = get_pyvista_bridge()
        
        # 创建测试网格
        mesh = pv.Cube()
        
        # 测试不同输出格式
        formats_to_test = ["gltf", "obj", "ply"]
        results = {}
        
        for fmt in formats_to_test:
            try:
                output_path = bridge.mesh_to_web_format(mesh, fmt)
                if output_path and Path(output_path).exists():
                    results[fmt] = True
                    print(f"✅ {fmt.upper()}格式导出成功")
                else:
                    results[fmt] = False
                    print(f"❌ {fmt.upper()}格式导出失败")
            except Exception as e:
                results[fmt] = False
                print(f"❌ {fmt.upper()}格式导出异常: {e}")
        
        # 汇总结果
        success_count = sum(1 for success in results.values() if success)
        print(f"📊 格式支持: {success_count}/{len(formats_to_test)} 成功")
        
        return success_count > 0
        
    except Exception as e:
        print(f"❌ 格式测试失败: {e}")
        return False

def test_state_manager_basic():
    """测试状态管理器基本功能"""
    print("\n🗂️  测试状态管理器...")
    
    try:
        from gateway.modules.visualization.pyvista_state_manager import get_pyvista_state_manager
        
        state_manager = get_pyvista_state_manager()
        
        # 检查初始状态
        stats = state_manager.get_performance_stats()
        print(f"✅ 初始状态: {stats}")
        
        # 测试缓存机制
        import pyvista as pv
        test_mesh = pv.Sphere()
        cache_key = "test_mesh"
        
        # 模拟缓存操作
        state_manager.mesh_cache[cache_key] = test_mesh
        print(f"✅ 缓存添加成功")
        
        # 检查缓存状态
        updated_stats = state_manager.get_performance_stats()
        print(f"✅ 更新状态: {updated_stats}")
        
        # 清理缓存
        del state_manager.mesh_cache[cache_key]
        
        return True
        
    except Exception as e:
        print(f"❌ 状态管理器测试失败: {e}")
        return False

def main():
    """主测试函数"""
    print("🚀 开始简化PyVista功能测试")
    print("=" * 50)
    
    tests = [
        ("基本工作流程", test_basic_workflow),
        ("网格格式支持", test_mesh_formats),
        ("状态管理器", test_state_manager_basic),
    ]
    
    results = {}
    
    for test_name, test_func in tests:
        try:
            result = test_func()
            results[test_name] = result
            status = "✅ 通过" if result else "❌ 失败"
            print(f"\n{status} {test_name}")
        except Exception as e:
            print(f"\n❌ {test_name}: 异常 - {e}")
            results[test_name] = False
        print("-" * 30)
    
    # 汇总结果
    print("\n" + "=" * 50)
    print("🎯 测试结果汇总:")
    
    passed = sum(1 for r in results.values() if r)
    total = len(results)
    
    print(f"📊 总体结果: {passed}/{total} 通过")
    
    for test_name, result in results.items():
        status = "✅ 通过" if result else "❌ 失败"
        print(f"  {test_name}: {status}")
    
    if passed == total:
        print("\n🎉 所有测试通过！PyVista核心功能正常。")
        print("💡 gmsh→PyVista→Three.js渲染管道基础架构已就绪。")
        return True
    else:
        print(f"\n⚠️  {total - passed} 个测试失败。")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)