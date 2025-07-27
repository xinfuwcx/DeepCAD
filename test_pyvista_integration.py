#!/usr/bin/env python3
"""
测试PyVista集成
验证完整的gmsh→PyVista→Three.js渲染管道
"""

import os
import sys
import json
import time
import asyncio
import tempfile
import numpy as np
from pathlib import Path

# 添加项目路径
sys.path.append(os.path.dirname(__file__))
sys.path.append(os.path.join(os.path.dirname(__file__), 'gateway'))

def test_pyvista_availability():
    """测试PyVista可用性"""
    print("🔍 测试PyVista可用性...")
    try:
        import pyvista as pv
        print(f"✅ PyVista {pv.__version__} 可用")
        print(f"📦 VTK版本: {pv.vtk_version_info}")
        return True
    except ImportError as e:
        print(f"❌ PyVista不可用: {e}")
        return False

def test_basic_mesh_operations():
    """测试基本网格操作"""
    print("\n📦 测试基本网格操作...")
    try:
        import pyvista as pv
        
        # 创建简单网格 (使用ImageData代替UniformGrid)
        mesh = pv.ImageData(dimensions=(10, 10, 10))
        mesh["values"] = np.random.random(mesh.n_points)
        
        print(f"✅ 网格创建成功: {mesh.n_points} 点, {mesh.n_cells} 单元")
        
        # 测试导出
        temp_dir = Path(tempfile.mkdtemp())
        vtk_path = temp_dir / "test.vtk"
        mesh.save(str(vtk_path))
        
        # 测试加载
        loaded_mesh = pv.read(str(vtk_path))
        print(f"✅ 网格保存/加载成功")
        
        # 清理
        vtk_path.unlink()
        temp_dir.rmdir()
        
        return True
        
    except Exception as e:
        print(f"❌ 基本网格操作失败: {e}")
        return False

def test_web_bridge():
    """测试PyVista Web Bridge"""
    print("\n🌐 测试PyVista Web Bridge...")
    try:
        from gateway.modules.visualization.pyvista_web_bridge import get_pyvista_bridge
        
        bridge = get_pyvista_bridge()
        
        if not bridge.is_available:
            print("❌ PyVista Web Bridge不可用")
            return False
        
        # 健康检查
        health = bridge.health_check()
        print(f"✅ Bridge健康检查: {health}")
        
        # 测试支持的格式
        formats = bridge.get_supported_formats()
        print(f"✅ 支持的格式: {len(formats['input_formats'])} 输入, {len(formats['output_formats'])} 输出")
        
        return True
        
    except Exception as e:
        print(f"❌ PyVista Web Bridge测试失败: {e}")
        return False

def test_gmsh_to_pyvista():
    """测试gmsh→PyVista数据流"""
    print("\n🔀 测试gmsh→PyVista数据流...")
    try:
        import gmsh
        import pyvista as pv
        
        # 使用gmsh创建简单几何
        gmsh.initialize()
        gmsh.model.add("test_box")
        
        # 创建立方体
        box = gmsh.model.occ.addBox(0, 0, 0, 1, 1, 1)
        gmsh.model.occ.synchronize()
        
        # 生成网格
        gmsh.model.mesh.generate(3)
        
        # 导出为MSH格式（gmsh原生格式）
        temp_dir = Path(tempfile.mkdtemp())
        msh_path = temp_dir / "test_box.msh"
        gmsh.write(str(msh_path))
        
        gmsh.finalize()
        
        # 使用PyVista加载网格
        mesh = pv.read(str(msh_path))
        print(f"✅ gmsh→PyVista转换成功: {mesh.n_points} 点")
        
        # 测试导出为glTF
        from gateway.modules.visualization.pyvista_web_bridge import get_pyvista_bridge
        bridge = get_pyvista_bridge()
        
        # 创建输出目录
        output_dir = Path("/mnt/e/DeepCAD/static_content/web_exports")
        output_dir.mkdir(parents=True, exist_ok=True)
        
        gltf_path = bridge.mesh_to_web_format(mesh, "gltf")
        if gltf_path:
            print(f"✅ PyVista→glTF导出成功: {gltf_path}")
        else:
            print("❌ PyVista→glTF导出失败")
            
        # 清理
        msh_path.unlink()
        temp_dir.rmdir()
        
        return gltf_path is not None
        
    except Exception as e:
        print(f"❌ gmsh→PyVista数据流测试失败: {e}")
        return False

def test_state_manager():
    """测试状态管理器"""
    print("\n📊 测试PyVista状态管理器...")
    try:
        from gateway.modules.visualization.pyvista_state_manager import get_pyvista_state_manager
        
        state_manager = get_pyvista_state_manager()
        
        # 测试基本功能
        stats = state_manager.get_performance_stats()
        print(f"✅ 状态管理器性能统计: {stats}")
        
        return True
        
    except Exception as e:
        print(f"❌ 状态管理器测试失败: {e}")
        return False

async def test_async_operations():
    """测试异步操作"""
    print("\n⚡ 测试异步操作...")
    try:
        from gateway.modules.visualization.pyvista_state_manager import get_pyvista_state_manager
        
        state_manager = get_pyvista_state_manager()
        
        # 创建模拟会话
        session_id = await state_manager.create_session("test_client")
        print(f"✅ 异步会话创建: {session_id}")
        
        # 清理会话
        success = await state_manager.cleanup_session(session_id, "test_client")
        print(f"✅ 异步会话清理: {success}")
        
        return True
        
    except Exception as e:
        print(f"❌ 异步操作测试失败: {e}")
        return False

def test_visualization_routes():
    """测试可视化路由"""
    print("\n🛣️ 测试可视化路由...")
    try:
        from gateway.modules.visualization.routes import router, bridge
        
        # 检查路由器配置
        print(f"✅ 路由器前缀: {router.prefix}")
        print(f"✅ 路由器标签: {router.tags}")
        
        # 检查bridge可用性
        print(f"✅ Bridge可用性: {bridge.is_available}")
        
        return True
        
    except Exception as e:
        print(f"❌ 可视化路由测试失败: {e}")
        return False

async def run_async_tests():
    """运行异步测试"""
    return await test_async_operations()

def main():
    """主测试函数"""
    print("🚀 开始PyVista集成测试")
    print("=" * 50)
    
    # 基础测试
    tests = [
        ("PyVista可用性", test_pyvista_availability),
        ("基本网格操作", test_basic_mesh_operations),
        ("PyVista Web Bridge", test_web_bridge),
        ("gmsh→PyVista数据流", test_gmsh_to_pyvista),
        ("状态管理器", test_state_manager),
        ("可视化路由", test_visualization_routes),
    ]
    
    results = {}
    
    for test_name, test_func in tests:
        try:
            result = test_func()
            results[test_name] = result
            if result:
                print(f"✅ {test_name}: 通过")
            else:
                print(f"❌ {test_name}: 失败")
        except Exception as e:
            print(f"❌ {test_name}: 异常 - {e}")
            results[test_name] = False
        print()
    
    # 异步测试
    try:
        async_result = asyncio.run(run_async_tests())
        results["异步操作"] = async_result
        if async_result:
            print("✅ 异步操作: 通过")
        else:
            print("❌ 异步操作: 失败")
    except Exception as e:
        print(f"❌ 异步操作: 异常 - {e}")
        results["异步操作"] = False
    
    # 汇总结果
    print("\n" + "=" * 50)
    print("🎯 PyVista集成测试结果汇总:")
    
    passed = sum(1 for r in results.values() if r)
    total = len(results)
    
    print(f"📊 总体结果: {passed}/{total} 通过")
    
    for test_name, result in results.items():
        status = "✅ 通过" if result else "❌ 失败"
        print(f"  {test_name}: {status}")
    
    if passed == total:
        print("\n🎉 所有测试通过！PyVista渲染管道就绪。")
        return True
    else:
        print(f"\n⚠️  {total - passed} 个测试失败，需要修复。")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)