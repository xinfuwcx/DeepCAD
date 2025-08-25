#!/usr/bin/env python3
"""Kratos原生功能深度调研脚本"""

import sys
import os
import importlib
from pathlib import Path

# 添加路径
sys.path.append('.')

def explore_kratos_applications():
    """探索Kratos所有可用的Application"""
    print("=== Kratos Applications 调研 ===")
    
    try:
        import KratosMultiphysics as KM
        print(f"✅ Kratos版本: {KM.KratosGlobals.Kernel.Version()}")
    except ImportError:
        print("❌ 无法导入KratosMultiphysics")
        return
    
    # 重点关注的Applications
    target_applications = [
        "StructuralMechanicsApplication",
        "ContactStructuralMechanicsApplication", 
        "GeomechanicsApplication",
        "SolidMechanicsApplication",
        "MeshingApplication"
    ]
    
    available_apps = []
    for app_name in target_applications:
        try:
            app_module = importlib.import_module(f"KratosMultiphysics.{app_name}")
            available_apps.append((app_name, app_module))
            print(f"✅ {app_name}: 可用")
        except ImportError:
            print(f"❌ {app_name}: 不可用")
    
    return available_apps

def explore_constraint_classes():
    """探索约束相关的类"""
    print("\n=== Kratos约束类调研 ===")
    
    try:
        import KratosMultiphysics as KM
        
        # 查找所有约束相关类
        constraint_classes = []
        for attr in dir(KM):
            if "Constraint" in attr:
                constraint_classes.append(attr)
        
        print(f"发现约束类 ({len(constraint_classes)}个):")
        for cls in constraint_classes:
            print(f"  - {cls}")
            
        return constraint_classes
    except Exception as e:
        print(f"❌ 探索约束类失败: {e}")
        return []

def explore_processes_in_apps(available_apps):
    """探索各Application中的Process类"""
    print("\n=== Process类调研 ===")
    
    anchor_related_processes = []
    
    for app_name, app_module in available_apps:
        print(f"\n📦 {app_name}:")
        
        processes = []
        for attr in dir(app_module):
            if "Process" in attr:
                processes.append(attr)
        
        if processes:
            print(f"  发现Process ({len(processes)}个):")
            for proc in processes:
                print(f"    - {proc}")
                
                # 检查是否与锚杆相关
                if any(keyword in proc.lower() for keyword in 
                      ['anchor', 'tie', 'embed', 'connect', 'attach', 'link']):
                    anchor_related_processes.append(f"{app_name}.{proc}")
                    print(f"      🎯 可能与锚杆相关!")
        else:
            print("  无Process类")
    
    print(f"\n🎯 潜在锚杆相关Process: {anchor_related_processes}")
    return anchor_related_processes

def explore_geomechanics_details():
    """详细探索GeomechanicsApplication"""
    print("\n=== GeomechanicsApplication详细调研 ===")
    
    try:
        import KratosMultiphysics.GeomechanicsApplication as GeoApp
        
        # 查找所有类和函数
        all_attrs = dir(GeoApp)
        
        categories = {
            'Elements': [attr for attr in all_attrs if 'Element' in attr],
            'Processes': [attr for attr in all_attrs if 'Process' in attr],
            'Conditions': [attr for attr in all_attrs if 'Condition' in attr],
            'Constraints': [attr for attr in all_attrs if 'Constraint' in attr],
            'Anchors': [attr for attr in all_attrs if 'anchor' in attr.lower()],
            'Embedded': [attr for attr in all_attrs if 'embed' in attr.lower()],
            'Interface': [attr for attr in all_attrs if 'interface' in attr.lower()]
        }
        
        for category, items in categories.items():
            if items:
                print(f"\n📂 {category} ({len(items)}个):")
                for item in items:
                    print(f"    - {item}")
                    
        return categories
        
    except ImportError:
        print("❌ GeomechanicsApplication不可用")
        return {}

def explore_structural_mechanics_details():
    """详细探索StructuralMechanicsApplication"""
    print("\n=== StructuralMechanicsApplication详细调研 ===")
    
    try:
        import KratosMultiphysics.StructuralMechanicsApplication as StructApp
        
        # 重点关注约束和连接相关功能
        all_attrs = dir(StructApp)
        
        categories = {
            'MPC_Constraints': [attr for attr in all_attrs if 'mpc' in attr.lower() or 'master' in attr.lower() or 'slave' in attr.lower()],
            'Tie_Constraints': [attr for attr in all_attrs if 'tie' in attr.lower()],
            'Contact': [attr for attr in all_attrs if 'contact' in attr.lower()],
            'Coupling': [attr for attr in all_attrs if 'coupling' in attr.lower() or 'connect' in attr.lower()]
        }
        
        for category, items in categories.items():
            if items:
                print(f"\n📂 {category} ({len(items)}个):")
                for item in items:
                    print(f"    - {item}")
                    
                    # 尝试获取类的文档字符串
                    try:
                        cls = getattr(StructApp, item)
                        if hasattr(cls, '__doc__') and cls.__doc__:
                            doc = cls.__doc__.strip().split('\n')[0]  # 第一行
                            print(f"      💡 {doc[:80]}...")
                    except:
                        pass
                        
        return categories
        
    except ImportError:
        print("❌ StructuralMechanicsApplication不可用")
        return {}

def test_linear_master_slave_constraint():
    """测试当前使用的LinearMasterSlaveConstraint"""
    print("\n=== LinearMasterSlaveConstraint功能测试 ===")
    
    try:
        import KratosMultiphysics as KM
        
        # 创建简单的ModelPart测试
        model = KM.Model()
        model_part = model.CreateModelPart("TestPart")
        
        # 添加变量
        model_part.AddNodalSolutionStepVariable(KM.DISPLACEMENT_X)
        model_part.AddNodalSolutionStepVariable(KM.DISPLACEMENT_Y)
        model_part.AddNodalSolutionStepVariable(KM.DISPLACEMENT_Z)
        
        # 创建几个节点
        node1 = model_part.CreateNewNode(1, 0.0, 0.0, 0.0)
        node2 = model_part.CreateNewNode(2, 1.0, 0.0, 0.0)
        node3 = model_part.CreateNewNode(3, 2.0, 0.0, 0.0)
        
        # 测试LinearMasterSlaveConstraint
        constraint = KM.LinearMasterSlaveConstraint(1)
        constraint.SetSlaveDoF(node1, KM.DISPLACEMENT_X)
        constraint.SetMasterDoF(node2, KM.DISPLACEMENT_X, 0.6)
        constraint.SetMasterDoF(node3, KM.DISPLACEMENT_X, 0.4)
        
        print("✅ LinearMasterSlaveConstraint创建成功")
        print(f"  - 从节点: {constraint.GetSlaveNode().Id}")
        print(f"  - 主节点数量: {len([n for n in constraint.GetMasterNodes()])}")
        
        return True
        
    except Exception as e:
        print(f"❌ LinearMasterSlaveConstraint测试失败: {e}")
        return False

def search_kratos_documentation():
    """搜索Kratos文档和示例"""
    print("\n=== Kratos文档资源搜索 ===")
    
    # 查找可能的文档和示例路径
    possible_paths = [
        "KratosMultiphysics/applications/GeomechanicsApplication/python_scripts",
        "KratosMultiphysics/applications/StructuralMechanicsApplication/python_scripts", 
        "KratosMultiphysics/applications/GeomechanicsApplication/tests",
        "KratosMultiphysics/applications/GeomechanicsApplication/custom_processes"
    ]
    
    try:
        import KratosMultiphysics as KM
        kratos_path = Path(KM.__file__).parent
        print(f"📂 Kratos路径: {kratos_path}")
        
        found_files = []
        for rel_path in possible_paths:
            full_path = kratos_path / rel_path.replace("KratosMultiphysics/", "")
            if full_path.exists():
                print(f"✅ 找到路径: {full_path}")
                
                # 搜索锚杆相关文件
                for pattern in ['*anchor*', '*embed*', '*tie*', '*mpc*']:
                    files = list(full_path.glob(pattern))
                    found_files.extend(files)
                    if files:
                        print(f"  📄 {pattern}: {[f.name for f in files]}")
            else:
                print(f"❌ 路径不存在: {full_path}")
        
        return found_files
        
    except Exception as e:
        print(f"❌ 搜索失败: {e}")
        return []

def main():
    """主函数：综合调研"""
    print("🔬 Kratos原生锚杆连接功能深度调研")
    print("=" * 60)
    
    # 1. 基础调研
    available_apps = explore_kratos_applications()
    constraint_classes = explore_constraint_classes()
    
    # 2. Process调研
    anchor_processes = explore_processes_in_apps(available_apps)
    
    # 3. 专项调研
    geo_categories = explore_geomechanics_details()
    struct_categories = explore_structural_mechanics_details()
    
    # 4. 当前方案测试
    mpc_works = test_linear_master_slave_constraint()
    
    # 5. 文档资源搜索
    doc_files = search_kratos_documentation()
    
    # 6. 总结和建议
    print("\n" + "=" * 60)
    print("🎯 调研总结和技术建议")
    print("=" * 60)
    
    if anchor_processes:
        print("✅ 发现潜在锚杆相关Process，建议深入研究:")
        for proc in anchor_processes:
            print(f"  - {proc}")
    else:
        print("⚠️ 未发现明显的锚杆专用Process")
    
    if geo_categories.get('Embedded') or geo_categories.get('Interface'):
        print("✅ GeomechanicsApplication有嵌入/接口功能，可能适用")
    
    if struct_categories.get('MPC_Constraints') or struct_categories.get('Tie_Constraints'):
        print("✅ StructuralMechanicsApplication有MPC/Tie约束功能")
    
    if mpc_works:
        print("✅ 当前LinearMasterSlaveConstraint方案可行")
    else:
        print("❌ 当前方案存在问题，需要修复")
    
    print("\n📋 下一步行动建议:")
    print("1. 如果发现专用锚杆Process，立即测试和集成")
    print("2. 如果只有通用MPC功能，继续优化当前手工实现")  
    print("3. 考虑混合方案：手工识别 + Kratos原生约束应用")

if __name__ == "__main__":
    main()