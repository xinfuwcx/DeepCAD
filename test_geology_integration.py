#!/usr/bin/env python3
"""
测试地质几何建模集成功能
验证GSTools + GMSH OCC + PyVista的完整工作流程
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'gateway'))

from modules.geology.gstools_geometry_service import (
    GeologyGeometryService, 
    ComputationDomain, 
    ThreeZoneParams, 
    GMSHParams
)

def test_geology_workflow():
    """测试完整的地质几何建模工作流程"""
    
    print("Testing multi-layer segmented geology modeling...")
    
    # 1. 初始化服务
    service = GeologyGeometryService()
    print(f"Service initialized. Work directory: {service.work_dir}")
    
    # 2. 准备测试数据（符合前端UI设计的数据结构）
    test_boreholes = [
        {
            'id': 'BH001', 'name': 'ZK001', 'x': 0, 'y': 0,
            'ground_elevation': 3.5, 'total_depth': 30,
            'strata': [
                {'id': 'S1', 'top_elev': 3.5, 'bottom_elev': -2.5, 'soil_type': 'fill',
                 'density': 1800, 'cohesion': 15, 'friction': 18},
                {'id': 'S2', 'top_elev': -2.5, 'bottom_elev': -15.0, 'soil_type': 'clay',
                 'density': 1900, 'cohesion': 45, 'friction': 12},
            ]
        },
        {
            'id': 'BH002', 'name': 'ZK002', 'x': 50, 'y': 30,
            'ground_elevation': 3.8, 'total_depth': 35,
            'strata': [
                {'id': 'S3', 'top_elev': 3.8, 'bottom_elev': -1.2, 'soil_type': 'fill',
                 'density': 1750, 'cohesion': 12, 'friction': 20},
                {'id': 'S4', 'top_elev': -1.2, 'bottom_elev': -18.3, 'soil_type': 'clay',
                 'density': 1950, 'cohesion': 50, 'friction': 10},
            ]
        },
        {
            'id': 'BH003', 'name': 'ZK003', 'x': -30, 'y': 40,
            'ground_elevation': 3.2, 'total_depth': 32,
            'strata': [
                {'id': 'S5', 'top_elev': 3.2, 'bottom_elev': -2.8, 'soil_type': 'fill',
                 'density': 1750, 'cohesion': 14, 'friction': 19},
                {'id': 'S6', 'top_elev': -2.8, 'bottom_elev': -16.5, 'soil_type': 'clay',
                 'density': 1920, 'cohesion': 42, 'friction': 11},
            ]
        },
    ]
    
    # 3. 配置参数（符合前端设计）
    domain = ComputationDomain(
        extension_method='convex_hull',
        x_extend=100, y_extend=100,
        foundation_multiplier=None,
        bottom_elevation=-50,
        mesh_resolution=2.0
    )
    
    algorithm = ThreeZoneParams(
        core_radius=50,
        transition_distance=150,
        variogram_model='spherical',
        trend_order='linear',
        uncertainty_analysis=False
    )
    
    gmsh_params = GMSHParams(
        characteristic_length=2.0,
        physical_groups=False,  # 几何建模不需要物理分组
        mesh_quality=0.8
    )
    
    print("Parameters configured:")
    print(f"   - Boreholes: {len(test_boreholes)}")
    print(f"   - Domain method: {domain.extension_method}")
    print(f"   - Core radius: {algorithm.core_radius}m")
    print(f"   - Transition distance: {algorithm.transition_distance}m")
    print(f"   - Mesh resolution: {domain.mesh_resolution}m")
    
    # 4. 执行完整工作流程
    result = service.run_complete_workflow(
        test_boreholes, domain, algorithm, gmsh_params
    )
    
    # 5. 验证结果
    print(f"\nModeling Results:")
    print(f"   - Success: {result['success']}")
    print(f"   - Message: {result['message']}")
    
    if result['success']:
        print(f"   - Generated files: {len(result['files'])}")
        for file_type, file_path in result['files'].items():
            file_exists = os.path.exists(file_path)
            print(f"   - {file_type.upper()}: {'OK' if file_exists else 'Missing'} {file_path}")
        
        stats = result['statistics']
        print(f"\nStatistics:")
        print(f"   - Boreholes processed: {stats['boreholes_count']}")
        print(f"   - Layers processed: {stats['layers_processed']}")
        print(f"   - Total strata: {stats['total_strata']}")
        
        bounds = stats['domain_bounds']
        if bounds:
            print(f"   - Domain: X[{bounds['x_min']:.1f}, {bounds['x_max']:.1f}], Y[{bounds['y_min']:.1f}, {bounds['y_max']:.1f}], Z[{bounds['z_min']:.1f}, {bounds['z_max']:.1f}]")
        
        print(f"\nMulti-layer geology modeling test SUCCESS!")
        print(f"   Generated files can be used for:")
        print(f"   - GMSH mesh files (.msh): CAE numerical computation")
        print(f"   - PLY files (.ply): Three.js 3D visualization")
        print(f"   - STL files (.stl): 3D printing and CAD software")
        print(f"   - VTK files (.vtk): Scientific visualization")
        print(f"   - STEP files (.step): CAD geometry exchange")
    else:
        print(f"Modeling FAILED: {result['message']}")
        
    return result

if __name__ == "__main__":
    try:
        result = test_geology_workflow()
        
        # 提供前端集成建议
        if result['success']:
            print(f"\nFrontend Integration Suggestions:")
            print(f"   1. Use THREE.PLYLoader to load .ply files for 3D visualization")
            print(f"   2. Get files via /geology/geometry-download/{{task_id}}/{{file_type}} API")
            print(f"   3. Supported file formats: {', '.join(result['files'].keys())}")
            print(f"   4. Display statistics: boreholes, layers, domain bounds etc.")
            
    except Exception as e:
        print(f"Test process error: {e}")
        import traceback
        traceback.print_exc()