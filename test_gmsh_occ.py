#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
gmsh OCC 功能演示 - DeepCAD 架构简化验证
演示 gmsh 自带的 OpenCASCADE 几何建模能力
"""

import gmsh
import sys

def demo_gmsh_occ_basic():
    """演示 gmsh OCC 基础几何建模功能"""
    
    # 初始化 gmsh
    gmsh.initialize()
    gmsh.model.add("DeepCAD_OCC_Demo")
    
    print("=== DeepCAD gmsh OCC 功能演示 ===")
    
    # 1. 创建基础几何体
    print("\n1. 创建基础几何体...")
    
    # 创建一个立方体（模拟基坑）
    box_tag = gmsh.model.occ.addBox(0, 0, 0, 10, 8, 5)
    print(f"   - 基坑立方体: tag={box_tag}")
    
    # 创建圆柱体（模拟支护桩）
    cylinder_tag = gmsh.model.occ.addCylinder(2, 2, 0, 0, 0, 6, 0.5)
    print(f"   - 支护桩圆柱: tag={cylinder_tag}")
    
    # 创建球体（模拟锚杆球头）
    sphere_tag = gmsh.model.occ.addSphere(8, 6, 3, 0.8)
    print(f"   - 锚杆球头: tag={sphere_tag}")
    
    # 2. 演示布尔运算
    print("\n2. 布尔运算...")
    
    # 从基坑中减去支护桩孔洞
    try:
        cut_result = gmsh.model.occ.cut([(3, box_tag)], [(3, cylinder_tag)])
        print(f"   - 基坑开孔完成: 保留体={len(cut_result[0])}, 移除体={len(cut_result[1])}")
    except Exception as e:
        print(f"   - 布尔运算错误: {e}")
    
    # 3. 几何变换
    print("\n3. 几何变换...")
    
    # 复制球体
    sphere_copy = gmsh.model.occ.copy([(3, sphere_tag)])
    print(f"   - 复制球体: {len(sphere_copy)} 个")
    
    # 平移复制的球体
    if sphere_copy:
        gmsh.model.occ.translate(sphere_copy, 3, 0, 0)
        print("   - 平移球体完成")
    
    # 旋转操作
    gmsh.model.occ.rotate([(3, sphere_tag)], 5, 5, 5, 1, 0, 0, 3.14159/4)
    print("   - 旋转球体完成")
    
    # 4. 同步几何到 gmsh 模型
    print("\n4. 同步几何模型...")
    gmsh.model.occ.synchronize()
    print("   - OCC 几何同步完成")
    
    # 5. 获取模型信息
    print("\n5. 模型信息...")
    entities = gmsh.model.getEntities()
    print(f"   - 总实体数量: {len(entities)}")
    
    for dim, tag in entities:
        if dim == 3:  # 3D 实体
            volume = gmsh.model.occ.getMass(dim, tag)
            print(f"   - 3D实体 {tag}: 体积={volume:.2f}")
    
    # 6. 网格生成
    print("\n6. 网格生成...")
    gmsh.model.mesh.generate(3)
    
    num_nodes = len(gmsh.model.mesh.getNodes()[0])
    num_elements = len(gmsh.model.mesh.getElements()[1][0]) if gmsh.model.mesh.getElements()[1] else 0
    
    print(f"   - 节点数: {num_nodes}")
    print(f"   - 单元数: {num_elements}")
    
    # 7. 保存文件
    output_file = "/mnt/e/DeepCAD/test_gmsh_occ_demo.msh"
    gmsh.write(output_file)
    print(f"\n7. 保存文件: {output_file}")
    
    # 清理
    gmsh.finalize()
    print("\n=== 演示完成 ===")

def demo_gmsh_occ_advanced():
    """演示 gmsh OCC 高级功能"""
    
    gmsh.initialize()
    gmsh.model.add("DeepCAD_Advanced_Demo")
    
    print("\n=== gmsh OCC 高级功能演示 ===")
    
    # 1. 复杂曲线和曲面
    print("\n1. 创建复杂几何...")
    
    # 创建样条曲线（模拟基坑轮廓）
    points = []
    for i in range(6):
        x = 5 * (i / 5.0)
        y = 2 * (1 + 0.5 * (i % 2))  # 锯齿形轮廓
        z = 0
        point_tag = gmsh.model.occ.addPoint(x, y, z)
        points.append(point_tag)
    
    # 创建B样条曲线
    try:
        spline_tag = gmsh.model.occ.addBSpline(points)
        print(f"   - B样条曲线: tag={spline_tag}")
    except Exception as e:
        print(f"   - B样条创建失败: {e}")
        # 备用方案：使用简单直线连接
        for i in range(len(points)-1):
            line_tag = gmsh.model.occ.addLine(points[i], points[i+1])
            print(f"   - 直线段 {i}: tag={line_tag}")
    
    # 2. 复合几何体
    print("\n2. 复合几何操作...")
    
    # 创建多个几何体进行复合操作
    box1 = gmsh.model.occ.addBox(0, 0, 0, 3, 3, 3)
    box2 = gmsh.model.occ.addBox(2, 2, 2, 3, 3, 3)
    
    # 融合操作
    try:
        fuse_result = gmsh.model.occ.fuse([(3, box1)], [(3, box2)])
        print(f"   - 融合操作完成: 结果实体数={len(fuse_result[0])}")
    except Exception as e:
        print(f"   - 融合操作失败: {e}")
    
    # 3. 片段化操作（用于复杂布尔运算）
    cylinder1 = gmsh.model.occ.addCylinder(1, 1, 0, 0, 0, 4, 0.5)
    cylinder2 = gmsh.model.occ.addCylinder(1.5, 1.5, 1, 0, 0, 2, 0.3)
    
    try:
        fragment_result = gmsh.model.occ.fragment([(3, cylinder1)], [(3, cylinder2)])
        print(f"   - 片段化完成: 结果实体数={len(fragment_result[0])}")
    except Exception as e:
        print(f"   - 片段化失败: {e}")
    
    # 同步并完成
    gmsh.model.occ.synchronize()
    
    print("\n=== 高级功能演示完成 ===")
    gmsh.finalize()

def check_gmsh_occ_capabilities():
    """检查 gmsh OCC 的详细能力"""
    
    gmsh.initialize()
    
    print("\n=== gmsh OCC 能力详细检查 ===")
    
    # 获取所有 OCC 方法
    occ = gmsh.model.occ
    all_methods = [attr for attr in dir(occ) if not attr.startswith('_')]
    
    # 分类展示
    categories = {
        '基础几何': ['addBox', 'addSphere', 'addCylinder', 'addCone', 'addTorus', 'addPoint', 'addLine', 'addCircle'],
        '高级几何': ['addBSpline', 'addBezier', 'addSpline', 'addDisk', 'addRectangle', 'addEllipse'],
        '布尔运算': ['fuse', 'intersect', 'cut', 'fragment', 'remove'],
        '变换操作': ['translate', 'rotate', 'copy', 'mirror', 'dilate'],
        '查询功能': ['getMass', 'getCenterOfMass', 'getBoundingBox', 'getEntities'],
        '网格相关': ['synchronize', 'removeAllDuplicates', 'healShapes']
    }
    
    for category, functions in categories.items():
        print(f"\n{category}:")
        for func in functions:
            status = "✓" if func in all_methods else "✗"
            print(f"   {status} {func}")
    
    print(f"\n总方法数: {len(all_methods)}")
    print("主要特性:")
    print("  ✓ 完整的 OpenCASCADE 几何内核支持")
    print("  ✓ 参数化几何建模")
    print("  ✓ 复杂布尔运算")
    print("  ✓ 曲线曲面建模")
    print("  ✓ 几何变换和操作")
    print("  ✓ 自动网格生成")
    
    gmsh.finalize()

if __name__ == "__main__":
    try:
        # 运行基础演示
        demo_gmsh_occ_basic()
        
        # 运行高级功能演示
        demo_gmsh_occ_advanced()
        
        # 检查详细能力
        check_gmsh_occ_capabilities()
        
    except Exception as e:
        print(f"演示过程出错: {e}")
        sys.exit(1)