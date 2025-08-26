#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
深度分析FPN文件中的单元类型和参数转换
1. 分析FPN中实体元、壳元和truss的具体单元类型
2. 检查摩尔-库伦到修正摩尔-库伦的参数转换是否正确
"""

import sys
import os
import json
sys.path.append('.')

def analyze_fpn_element_types():
    """分析FPN文件中的单元类型分布"""
    print("=" * 60)
    print("分析FPN文件中的单元类型")
    print("=" * 60)
    
    try:
        from core.optimized_fpn_parser import OptimizedFPNParser
        
        print("1. 解析FPN文件...")
        parser = OptimizedFPNParser()
        fpn_data = parser.parse_file_streaming('data/两阶段-全锚杆-摩尔库伦.fpn')
        
        print(f"   总节点数: {len(fpn_data.get('nodes', []))}")
        print(f"   总单元数: {len(fpn_data.get('elements', []))}")
        
        print("\n2. 详细分析单元类型...")
        
        # 统计单元类型和材料ID的组合
        element_analysis = {}
        
        for element in fpn_data.get('elements', []):
            el_type = element.get('type', 'Unknown')
            material_id = int(element.get('material_id', 0))
            nodes_count = len(element.get('nodes', []))
            
            key = f"{el_type}_{nodes_count}nodes_mat{material_id}"
            
            if key not in element_analysis:
                element_analysis[key] = {
                    'count': 0,
                    'type': el_type,
                    'nodes_count': nodes_count,
                    'material_id': material_id,
                    'sample_element': element
                }
            
            element_analysis[key]['count'] += 1
        
        print("\n单元类型详细分布:")
        print("-" * 80)
        print(f"{'单元类型':<25} {'节点数':<8} {'材料ID':<8} {'数量':<10} {'分类'}")
        print("-" * 80)
        
        # 按数量排序显示
        sorted_elements = sorted(element_analysis.items(), key=lambda x: x[1]['count'], reverse=True)
        
        truss_elements = []
        shell_elements = []
        solid_elements = []
        other_elements = []
        
        for key, info in sorted_elements:
            el_type = info['type']
            nodes_count = info['nodes_count']
            material_id = info['material_id']
            count = info['count']
            
            # 分类判断
            if 'Truss' in el_type or nodes_count == 2:
                category = "Truss(桁架)"
                truss_elements.append(info)
            elif 'Shell' in el_type or 'Plate' in el_type or nodes_count in [3, 4, 6, 8] and 'Tetrahedron' not in el_type and 'Hexahedron' not in el_type:
                category = "Shell(壳)"
                shell_elements.append(info)
            elif 'Tetrahedron' in el_type or 'Hexahedron' in el_type or nodes_count in [4, 8, 10, 20]:
                category = "Solid(实体)"
                solid_elements.append(info)
            else:
                category = "Other(其他)"
                other_elements.append(info)
            
            print(f"{el_type:<25} {nodes_count:<8} {material_id:<8} {count:<10} {category}")
        
        print("-" * 80)
        print(f"总计: {sum(info['count'] for info in element_analysis.values())} 个单元")
        
        # 详细分类统计
        print("\n3. 单元分类统计:")
        
        print(f"\n【Truss单元 - 桁架/锚杆】: {len(truss_elements)} 种类型")
        for info in truss_elements:
            sample = info['sample_element']
            print(f"  - {info['type']} (材料{info['material_id']}): {info['count']}个")
            print(f"    节点示例: {sample.get('nodes', [])[:2]}")
            if 'properties' in sample:
                print(f"    属性: {sample['properties']}")
        
        print(f"\n【Shell单元 - 壳体/地连墙】: {len(shell_elements)} 种类型")
        for info in shell_elements:
            sample = info['sample_element']
            print(f"  - {info['type']} (材料{info['material_id']}): {info['count']}个")
            print(f"    节点数: {info['nodes_count']}, 节点示例: {sample.get('nodes', [])[:4]}")
            if 'properties' in sample:
                print(f"    属性: {sample['properties']}")
        
        print(f"\n【Solid单元 - 实体/土体】: {len(solid_elements)} 种类型")
        for info in solid_elements:
            sample = info['sample_element']
            print(f"  - {info['type']} (材料{info['material_id']}): {info['count']}个")
            print(f"    节点数: {info['nodes_count']}, 节点示例: {sample.get('nodes', [])[:4]}")
            if 'properties' in sample:
                print(f"    属性: {sample['properties']}")
        
        if other_elements:
            print(f"\n【Other单元 - 其他】: {len(other_elements)} 种类型")
            for info in other_elements:
                sample = info['sample_element']
                print(f"  - {info['type']} (材料{info['material_id']}): {info['count']}个")
                print(f"    节点数: {info['nodes_count']}")
        
        return {
            'total_elements': len(fpn_data.get('elements', [])),
            'element_types': element_analysis,
            'truss_elements': truss_elements,
            'shell_elements': shell_elements, 
            'solid_elements': solid_elements,
            'other_elements': other_elements
        }
        
    except Exception as e:
        print(f"ERROR: FPN单元类型分析失败: {e}")
        import traceback
        traceback.print_exc()
        return None

def analyze_material_parameter_conversion():
    """分析摩尔-库伦到修正摩尔-库伦的参数转换"""
    print("\n" + "=" * 60)
    print("分析材料参数转换：摩尔-库伦 -> 修正摩尔-库伦")
    print("=" * 60)
    
    try:
        from core.optimized_fpn_parser import OptimizedFPNParser
        from core.kratos_interface import KratosInterface
        
        print("1. 解析FPN材料数据...")
        parser = OptimizedFPNParser()
        fpn_data = parser.parse_file_streaming('data/两阶段-全锚杆-摩尔库伦.fpn')
        
        materials = fpn_data.get('materials', {})
        print(f"   找到材料定义: {len(materials)} 个")
        
        print("\n2. 分析原始FPN材料参数...")
        
        mohr_coulomb_materials = []
        
        for mat_id, material in materials.items():
            print(f"\n【材料 {mat_id}】:")
            print(f"  名称: {material.get('name', 'Unknown')}")
            print(f"  类型: {material.get('type', 'Unknown')}")
            
            # 检查是否是摩尔-库伦材料
            is_mohr_coulomb = False
            params = material.get('parameters', {})
            
            if 'cohesion' in params or 'friction_angle' in params or 'phi' in params:
                is_mohr_coulomb = True
                mohr_coulomb_materials.append((mat_id, material))
            
            print(f"  摩尔-库伦材料: {'是' if is_mohr_coulomb else '否'}")
            
            if params:
                print("  原始参数:")
                for param_name, param_value in params.items():
                    print(f"    {param_name}: {param_value}")
        
        print(f"\n找到摩尔-库伦材料: {len(mohr_coulomb_materials)} 个")
        
        print("\n3. 测试Kratos材料转换...")
        
        ki = KratosInterface()
        
        # 模拟材料转换过程
        conversion_results = []
        
        for mat_id, material in mohr_coulomb_materials:
            print(f"\n转换材料 {mat_id}:")
            
            try:
                # 调用kratos_interface中的材料转换方法
                kratos_material = ki._convert_material_to_kratos(mat_id, material)
                
                print("  转换后的Kratos材料:")
                print(f"    材料类型: {kratos_material.get('constitutive_law', 'Unknown')}")
                
                properties = kratos_material.get('properties', {})
                print("  转换后的参数:")
                for prop_name, prop_value in properties.items():
                    print(f"    {prop_name}: {prop_value}")
                
                conversion_results.append({
                    'material_id': mat_id,
                    'original': material,
                    'converted': kratos_material,
                    'success': True
                })
                
            except Exception as e:
                print(f"  ERROR: 材料转换失败: {e}")
                conversion_results.append({
                    'material_id': mat_id,
                    'original': material,
                    'success': False,
                    'error': str(e)
                })
        
        print("\n4. 参数转换验证...")
        
        # 检查关键参数的转换是否正确
        for result in conversion_results:
            if result['success']:
                print(f"\n验证材料 {result['material_id']} 的参数转换:")
                
                original_params = result['original'].get('parameters', {})
                converted_props = result['converted'].get('properties', {})
                
                # 检查关键参数映射
                parameter_mappings = [
                    ('Young_modulus', 'YOUNG_MODULUS', '弹性模量'),
                    ('Poisson_ratio', 'POISSON_RATIO', '泊松比'),
                    ('cohesion', 'COHESION', '粘聚力'),
                    ('friction_angle', 'INTERNAL_FRICTION_ANGLE', '内摩擦角'),
                    ('phi', 'INTERNAL_FRICTION_ANGLE', '内摩擦角(phi)'),
                    ('density', 'DENSITY', '密度'),
                    ('dilatancy_angle', 'DILATANCY_ANGLE', '剪胀角')
                ]
                
                for fpn_key, kratos_key, description in parameter_mappings:
                    fpn_value = original_params.get(fpn_key)
                    kratos_value = converted_props.get(kratos_key)
                    
                    if fpn_value is not None:
                        if kratos_value is not None:
                            print(f"  ✓ {description}: {fpn_value} -> {kratos_value}")
                            
                            # 检查单位转换是否正确
                            if fpn_key == 'friction_angle' or fpn_key == 'phi':
                                # 角度转换检查 (度 -> 弧度?)
                                if abs(float(fpn_value) - float(kratos_value)) > 0.1:
                                    print(f"    注意: 可能涉及角度单位转换")
                        else:
                            print(f"  ✗ {description}: {fpn_value} -> 未转换")
                    else:
                        if kratos_value is not None:
                            print(f"  ? {description}: 原始无值 -> {kratos_value} (默认值?)")
                
                # 检查是否正确转换为修正摩尔-库伦
                constitutive_law = result['converted'].get('constitutive_law', '')
                if 'ModifiedMohrCoulomb' in constitutive_law or 'MohrCoulomb' in constitutive_law:
                    print(f"  ✓ 本构模型: {constitutive_law}")
                else:
                    print(f"  ? 本构模型: {constitutive_law} (可能不是摩尔-库伦)")
        
        return {
            'mohr_coulomb_materials_count': len(mohr_coulomb_materials),
            'conversion_results': conversion_results,
            'total_materials': len(materials)
        }
        
    except Exception as e:
        print(f"ERROR: 材料参数转换分析失败: {e}")
        import traceback
        traceback.print_exc()
        return None

def check_current_kratos_interface_implementation():
    """检查当前kratos_interface.py中的实现"""
    print("\n" + "=" * 60)
    print("检查当前kratos_interface.py中的实现")
    print("=" * 60)
    
    try:
        # 读取kratos_interface.py文件
        with open('core/kratos_interface.py', 'r', encoding='utf-8') as f:
            content = f.read()
        
        print("1. 检查材料转换方法...")
        
        # 检查关键方法是否存在
        key_methods = [
            '_convert_material_to_kratos',
            '_map_mohr_coulomb_parameters', 
            '_convert_fpn_to_kratos',
            '_implement_anchor_constraints'
        ]
        
        method_status = {}
        for method in key_methods:
            if f'def {method}' in content:
                print(f"  ✓ {method}: 存在")
                method_status[method] = True
            else:
                print(f"  ✗ {method}: 不存在")
                method_status[method] = False
        
        print("\n2. 检查摩尔-库伦参数转换...")
        
        # 搜索摩尔-库伦相关的代码
        mohr_coulomb_keywords = [
            'MohrCoulomb',
            'ModifiedMohrCoulomb',
            'cohesion',
            'friction_angle',
            'COHESION',
            'INTERNAL_FRICTION_ANGLE'
        ]
        
        for keyword in mohr_coulomb_keywords:
            count = content.count(keyword)
            print(f"  {keyword}: 出现 {count} 次")
        
        print("\n3. 检查约束实现...")
        
        constraint_keywords = [
            'EmbeddedSkinUtility3D',
            '_implement_anchor_constraints',
            'LinearMasterSlaveConstraint',
            'anchor_constraints'
        ]
        
        for keyword in constraint_keywords:
            count = content.count(keyword)
            print(f"  {keyword}: 出现 {count} 次")
        
        return {
            'file_size': len(content),
            'methods_status': method_status,
            'implementation_status': 'analyzed'
        }
        
    except Exception as e:
        print(f"ERROR: 检查kratos_interface.py失败: {e}")
        return None

def generate_analysis_report(element_analysis, material_analysis, implementation_check):
    """生成分析报告"""
    print("\n" + "=" * 60)
    print("生成分析报告")
    print("=" * 60)
    
    report_content = f"""# FPN单元类型和参数转换深度分析报告

## 分析时间
{time.strftime('%Y-%m-%d %H:%M:%S')}

## 分析目标
1. 深入分析FPN文件中实体元、壳元和truss的具体单元类型
2. 验证摩尔-库伦到修正摩尔-库伦的参数自动转换是否正确实现

---

## 1. FPN单元类型分析结果

### 总体统计
"""
    
    if element_analysis:
        report_content += f"""
- **总单元数**: {element_analysis['total_elements']:,}
- **单元类型种类**: {len(element_analysis['element_types'])}

### 详细分类

#### 🔧 Truss单元（桁架/锚杆）
- **类型数量**: {len(element_analysis['truss_elements'])}
"""
        for info in element_analysis['truss_elements']:
            report_content += f"  - `{info['type']}` (材料{info['material_id']}): {info['count']:,}个\n"
        
        report_content += f"""
#### 🏗️ Shell单元（壳体/地连墙）
- **类型数量**: {len(element_analysis['shell_elements'])}
"""
        for info in element_analysis['shell_elements']:
            report_content += f"  - `{info['type']}` (材料{info['material_id']}): {info['count']:,}个\n"
        
        report_content += f"""
#### 🧱 Solid单元（实体/土体）
- **类型数量**: {len(element_analysis['solid_elements'])}
"""
        for info in element_analysis['solid_elements']:
            report_content += f"  - `{info['type']}` (材料{info['material_id']}): {info['count']:,}个\n"
    
    report_content += """
---

## 2. 材料参数转换分析结果

### 摩尔-库伦材料识别
"""
    
    if material_analysis:
        report_content += f"""
- **总材料数**: {material_analysis['total_materials']}
- **摩尔-库伦材料数**: {material_analysis['mohr_coulomb_materials_count']}

### 参数转换验证
"""
        successful_conversions = sum(1 for r in material_analysis['conversion_results'] if r['success'])
        report_content += f"- **成功转换**: {successful_conversions}/{len(material_analysis['conversion_results'])}\n"
        
        for result in material_analysis['conversion_results']:
            if result['success']:
                report_content += f"\n#### 材料 {result['material_id']} 转换成功\n"
                constitutive_law = result['converted'].get('constitutive_law', 'Unknown')
                report_content += f"- **本构模型**: `{constitutive_law}`\n"
                
                original_params = result['original'].get('parameters', {})
                converted_props = result['converted'].get('properties', {})
                
                report_content += "- **参数映射**:\n"
                key_mappings = [
                    ('Young_modulus', 'YOUNG_MODULUS'),
                    ('Poisson_ratio', 'POISSON_RATIO'),
                    ('cohesion', 'COHESION'),
                    ('friction_angle', 'INTERNAL_FRICTION_ANGLE'),
                    ('density', 'DENSITY')
                ]
                
                for fpn_key, kratos_key in key_mappings:
                    fpn_val = original_params.get(fpn_key)
                    kratos_val = converted_props.get(kratos_key)
                    if fpn_val is not None and kratos_val is not None:
                        report_content += f"  - {fpn_key}: {fpn_val} → {kratos_val}\n"
            else:
                report_content += f"\n#### 材料 {result['material_id']} 转换失败\n"
                report_content += f"- **错误**: {result.get('error', 'Unknown')}\n"
    
    report_content += """
---

## 3. 当前实现检查结果

### kratos_interface.py方法状态
"""
    
    if implementation_check:
        methods_status = implementation_check['methods_status']
        for method, exists in methods_status.items():
            status = "✅ 已实现" if exists else "❌ 未实现"
            report_content += f"- `{method}`: {status}\n"
    
    report_content += """
---

## 4. 关键发现和建议

### 单元类型发现
1. **FPN单元映射**: 需要建立FPN单元类型到Kratos单元类型的准确映射表
2. **材料ID关联**: 不同单元类型使用不同的材料ID，需要正确识别
3. **几何分类**: 通过节点数和单元类型名称可以准确分类

### 参数转换发现  
1. **转换实现状态**: 需要验证摩尔-库伦参数转换是否完整实现
2. **单位转换**: 注意角度单位（度/弧度）和应力单位的转换
3. **本构模型**: 确保正确映射到Kratos的修正摩尔-库伦模型

### 下一步建议
1. **完善单元映射**: 建立完整的FPN到Kratos单元类型映射表
2. **验证参数转换**: 深入测试每个参数的转换正确性
3. **单位一致性**: 确保所有参数的单位转换正确
4. **集成测试**: 在实际FPN数据上验证整个转换流程

---

*分析基于文件: data/两阶段-全锚杆-摩尔库伦.fpn*
"""
    
    try:
        with open('FPN单元类型和参数转换分析报告.md', 'w', encoding='utf-8') as f:
            f.write(report_content)
        print("SUCCESS 分析报告已生成: FPN单元类型和参数转换分析报告.md")
        return True
    except Exception as e:
        print(f"ERROR 报告生成失败: {e}")
        return False

def main():
    """主分析流程"""
    print("开始FPN单元类型和参数转换深度分析...")
    
    # 1. 分析FPN单元类型
    element_analysis = analyze_fpn_element_types()
    
    # 2. 分析材料参数转换
    material_analysis = analyze_material_parameter_conversion()
    
    # 3. 检查当前实现
    implementation_check = check_current_kratos_interface_implementation()
    
    # 4. 生成报告
    generate_analysis_report(element_analysis, material_analysis, implementation_check)
    
    print("\n" + "=" * 60)
    print("分析完成!")
    print("=" * 60)
    
    # 总结关键发现
    if element_analysis:
        print(f"\n单元类型发现:")
        print(f"  - Truss单元: {len(element_analysis['truss_elements'])} 类型")
        print(f"  - Shell单元: {len(element_analysis['shell_elements'])} 类型") 
        print(f"  - Solid单元: {len(element_analysis['solid_elements'])} 类型")
    
    if material_analysis:
        print(f"\n材料转换发现:")
        print(f"  - 摩尔-库伦材料: {material_analysis['mohr_coulomb_materials_count']} 个")
        successful = sum(1 for r in material_analysis['conversion_results'] if r['success'])
        print(f"  - 转换成功: {successful}/{len(material_analysis['conversion_results'])}")

if __name__ == "__main__":
    import time
    main()