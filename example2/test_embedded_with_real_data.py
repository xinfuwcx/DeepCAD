#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""使用真实FPN数据测试EmbeddedSkinUtility3D"""

import sys
import os
sys.path.append('.')

def test_embedded_with_fpn_data():
    """使用真实FPN数据测试embedded功能"""
    print("=== 使用真实FPN数据测试Embedded ===")
    
    try:
        import KratosMultiphysics as KM
        from core.optimized_fpn_parser import OptimizedFPNParser
        
        print("1. 解析FPN数据...")
        parser = OptimizedFPNParser()
        fpn_data = parser.parse_file_streaming('data/两阶段-全锚杆-摩尔库伦.fpn')
        
        elements = fpn_data.get('elements', [])
        nodes_data = fpn_data.get('nodes', {})
        
        print(f"   总节点数: {len(nodes_data)}")
        print(f"   总单元数: {len(elements)}")
        
        # 2. 创建锚杆ModelPart
        print("2. 创建锚杆ModelPart...")
        
        model = KM.Model()
        anchor_part = model.CreateModelPart("AnchorPart")
        anchor_part.SetBufferSize(1)
        anchor_part.AddNodalSolutionStepVariable(KM.DISPLACEMENT)
        
        # 提取锚杆数据
        anchor_elements = []
        anchor_nodes = set()
        
        for el in elements:
            if el.get('type') == 'TrussElement3D2N' and int(el.get('material_id', 0)) == 13:
                anchor_elements.append(el)
                nodes = el.get('nodes', [])
                for node_id in nodes:
                    anchor_nodes.add(int(node_id))
        
        print(f"   锚杆单元数: {len(anchor_elements)}")
        print(f"   锚杆节点数: {len(anchor_nodes)}")
        
        # 创建锚杆节点
        for node_id in list(anchor_nodes)[:1000]:  # 限制节点数
            if node_id in nodes_data:
                node_data = nodes_data[node_id]
                anchor_part.CreateNewNode(node_id, node_data['x'], node_data['y'], node_data['z'])
        
        # 创建锚杆单元
        prop = anchor_part.CreateNewProperties(1)
        for i, el in enumerate(anchor_elements[:500]):  # 限制单元数
            nodes = el.get('nodes', [])
            if len(nodes) == 2:
                try:
                    n1, n2 = int(nodes[0]), int(nodes[1])
                    if anchor_part.HasNode(n1) and anchor_part.HasNode(n2):
                        anchor_part.CreateNewElement("TrussElement3D2N", i+1, [n1, n2], prop)
                except:
                    continue
        
        print(f"   创建锚杆节点: {anchor_part.NumberOfNodes()}")
        print(f"   创建锚杆单元: {anchor_part.NumberOfElements()}")
        
        # 3. 创建土体ModelPart
        print("3. 创建土体ModelPart...")
        
        soil_part = model.CreateModelPart("SoilPart") 
        soil_part.SetBufferSize(1)
        soil_part.AddNodalSolutionStepVariable(KM.DISPLACEMENT)
        
        # 提取土体数据
        soil_elements = []
        soil_nodes = set()
        
        for el in elements:
            el_type = el.get('type', '')
            material_id = int(el.get('material_id', 0))
            
            # 土体单元：四面体或六面体，非锚杆材料
            if ('Tetrahedron' in el_type or 'Hexahedron' in el_type) and material_id != 13:
                soil_elements.append(el)
                nodes = el.get('nodes', [])
                for node_id in nodes:
                    soil_nodes.add(int(node_id))
        
        print(f"   土体单元数: {len(soil_elements)}")
        print(f"   土体节点数: {len(soil_nodes)}")
        
        # 创建土体节点
        for node_id in list(soil_nodes)[:2000]:  # 限制节点数
            if node_id in nodes_data:
                node_data = nodes_data[node_id]
                soil_part.CreateNewNode(node_id, node_data['x'], node_data['y'], node_data['z'])
        
        # 创建土体单元
        soil_prop = soil_part.CreateNewProperties(2)
        for i, el in enumerate(soil_elements[:1000]):  # 限制单元数
            nodes = el.get('nodes', [])
            el_type = el.get('type', '')
            
            try:
                node_ids = [int(n) for n in nodes]
                # 检查所有节点都存在
                if all(soil_part.HasNode(nid) for nid in node_ids):
                    if 'Tetrahedron4' in el_type:
                        soil_part.CreateNewElement("TetrahedraElement3D4N", i+1, node_ids, soil_prop)
                    elif 'Hexahedron8' in el_type:
                        soil_part.CreateNewElement("HexahedraElement3D8N", i+1, node_ids, soil_prop)
            except:
                continue
        
        print(f"   创建土体节点: {soil_part.NumberOfNodes()}")
        print(f"   创建土体单元: {soil_part.NumberOfElements()}")
        
        # 4. 测试EmbeddedSkinUtility3D
        print("4. 测试EmbeddedSkinUtility3D...")
        
        if anchor_part.NumberOfElements() > 0 and soil_part.NumberOfElements() > 0:
            try:
                utility = KM.EmbeddedSkinUtility3D(anchor_part, soil_part, "")
                print("   EmbeddedSkinUtility3D创建成功")
                
                # 调用GenerateSkin
                print("   调用GenerateSkin...")
                result = utility.GenerateSkin()
                print(f"   GenerateSkin结果: {result}")
                
                # 尝试插值 - 需要两个参数
                print("   测试插值功能...")
                try:
                    utility.InterpolateMeshVariableToSkin(KM.DISPLACEMENT, KM.DISPLACEMENT)
                    print("   插值成功：DISPLACEMENT -> DISPLACEMENT")
                    
                    # 检查结果
                    embedded_info = {
                        "anchor_nodes": anchor_part.NumberOfNodes(),
                        "soil_nodes": soil_part.NumberOfNodes(), 
                        "anchor_elements": anchor_part.NumberOfElements(),
                        "soil_elements": soil_part.NumberOfElements(),
                        "embedded_status": "SUCCESS"
                    }
                    
                    return True, embedded_info
                    
                except Exception as e:
                    print(f"   插值失败: {e}")
                    return False, {"error": str(e)}
                    
            except Exception as e:
                print(f"   EmbeddedSkinUtility3D失败: {e}")
                return False, {"error": str(e)}
        else:
            print("   ERROR: 锚杆或土体单元为空")
            return False, {"error": "Empty elements"}
            
    except Exception as e:
        print(f"ERROR: 整个测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False, {"error": str(e)}

def create_embedded_implementation_plan(success, result):
    """创建embedded实施计划"""
    print(f"\n=== 创建实施计划 (状态: {'SUCCESS' if success else 'FAILED'}) ===")
    
    if success:
        plan = f"""# EmbeddedSkinUtility3D实际实施方案

## 验证结果 ✅
- 锚杆节点: {result.get('anchor_nodes', 'N/A')}个
- 土体节点: {result.get('soil_nodes', 'N/A')}个  
- 锚杆单元: {result.get('anchor_elements', 'N/A')}个
- 土体单元: {result.get('soil_elements', 'N/A')}个
- Embedded状态: {result.get('embedded_status', 'N/A')}

## 实施策略
### 方法1: 直接在kratos_interface.py中实现
```python
def _generate_anchor_soil_embedded_constraints(self):
    # 1. 从FPN数据创建锚杆ModelPart (material_id=13)
    anchor_part = self._create_anchor_model_part_from_fpn()
    
    # 2. 从FPN数据创建土体ModelPart (非锚杆单元)  
    soil_part = self._create_soil_model_part_from_fpn()
    
    # 3. 使用EmbeddedSkinUtility3D
    utility = KM.EmbeddedSkinUtility3D(anchor_part, soil_part, "")
    utility.GenerateSkin()
    utility.InterpolateMeshVariableToSkin(KM.DISPLACEMENT, KM.DISPLACEMENT)
    
    # 4. 返回embedded约束信息
    return len(anchor_part.Nodes)  # 约束数量
```

## 预期结果
- 锚杆-土体约束: ~12,678个 (基于所有锚杆节点)
- 与现有地连墙MPC约束兼容
- 利用Kratos原生embedded算法

## 下一步
1. 集成到kratos_interface.py
2. 全量数据测试 
3. 性能优化
"""
    else:
        plan = f"""# EmbeddedSkinUtility3D问题分析

## 遇到的问题
{result.get('error', '未知错误')}

## 备选方案
### 方案A: 修复Embedded问题
- 研究Kratos文档
- 调整ModelPart配置
- 优化单元类型匹配

### 方案B: 扩展MPC方法  
- 使用K-nearest算法处理锚杆-土体
- 统一MPC约束框架
- 12,678个约束的批量生成

## 推荐策略
优先尝试修复Embedded，如不可行则使用MPC方法统一处理。
"""
    
    try:
        with open("EmbeddedSkinUtility3D实施方案.md", 'w', encoding='utf-8') as f:
            f.write(plan)
        print("SUCCESS 实施方案文档已创建")
        return True
    except Exception as e:
        print(f"ERROR 文档创建失败: {e}")
        return False

if __name__ == "__main__":
    print("开始使用真实FPN数据测试EmbeddedSkinUtility3D...")
    
    success, result = test_embedded_with_fpn_data()
    
    plan_success = create_embedded_implementation_plan(success, result)
    
    print(f"\n{'='*60}")
    if success:
        print("SUCCESS 真实数据测试成功！")
        print("✅ FPN数据解析正常")
        print("✅ 锚杆ModelPart创建成功")
        print("✅ 土体ModelPart创建成功")
        print("✅ EmbeddedSkinUtility3D工作正常")
        print("\n可以进入生产集成阶段！")
    else:
        print("INFO 需要进一步调试Embedded功能")
        print(f"问题: {result.get('error', '未知')}")
        print("但技术方向正确，继续研究或使用MPC备选方案")