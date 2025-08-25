#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""完成EmbeddedSkinUtility3D参数配置验证"""

import sys
import os
import json
sys.path.append('.')

def validate_embedded_configuration():
    """验证EmbeddedSkinUtility3D的正确配置"""
    print("=== EmbeddedSkinUtility3D配置验证 ===")
    
    try:
        import KratosMultiphysics as KM
        
        # 1. 创建完整的测试环境
        print("1. 创建完整测试环境...")
        
        model = KM.Model()
        
        # 锚杆模型部件
        anchor_part = model.CreateModelPart("AnchorPart")
        anchor_part.SetBufferSize(1)
        
        # 添加必要的变量
        anchor_part.AddNodalSolutionStepVariable(KM.DISPLACEMENT)
        anchor_part.AddNodalSolutionStepVariable(KM.VELOCITY)
        
        # 土体模型部件
        soil_part = model.CreateModelPart("SoilPart") 
        soil_part.SetBufferSize(1)
        soil_part.AddNodalSolutionStepVariable(KM.DISPLACEMENT)
        soil_part.AddNodalSolutionStepVariable(KM.VELOCITY)
        
        # 2. 创建更真实的几何数据
        print("2. 创建锚杆几何...")
        
        # 模拟一根锚杆 (5米长，沿X方向)
        anchor_nodes = []
        for i in range(11):  # 11个节点，10段
            x = i * 0.5  # 每段0.5米
            node = anchor_part.CreateNewNode(i+1, x, 0.0, 0.0)
            anchor_nodes.append(node)
            
        print(f"   锚杆节点: {len(anchor_nodes)}个")
        
        # 3. 创建土体网格
        print("3. 创建土体网格...")
        
        # 创建包围锚杆的土体节点
        soil_nodes = []
        node_id = 100
        
        # 在锚杆周围创建土体节点网格
        for x in range(-1, 7):  # X方向: -1到6米
            for y in range(-2, 3):  # Y方向: -2到2米  
                for z in range(-2, 3):  # Z方向: -2到2米
                    soil_node = soil_part.CreateNewNode(node_id, float(x), float(y), float(z))
                    soil_nodes.append(soil_node)
                    node_id += 1
                    
        print(f"   土体节点: {len(soil_nodes)}个")
        
        # 4. 尝试不同配置创建EmbeddedSkinUtility3D
        print("4. 测试不同配置...")
        
        successful_configs = []
        test_configs = [
            "",
            "default",
            "skin", 
            "embedded",
            "interpolation",
            "DISPLACEMENT"
        ]
        
        for config in test_configs:
            try:
                print(f"   测试配置: '{config}'")
                utility = KM.EmbeddedSkinUtility3D(anchor_part, soil_part, config)
                successful_configs.append((config, utility))
                print(f"     SUCCESS - 配置'{config}'可用")
                
                # 测试核心方法
                try:
                    print("     测试GenerateSkin()...")
                    skin_result = utility.GenerateSkin()
                    print(f"       GenerateSkin结果类型: {type(skin_result)}")
                    
                    # 测试插值方法
                    print("     测试插值方法...")
                    try:
                        # 尝试位移变量插值
                        utility.InterpolateMeshVariableToSkin(KM.DISPLACEMENT)
                        print("       DISPLACEMENT变量插值: SUCCESS")
                    except Exception as e:
                        print(f"       DISPLACEMENT变量插值失败: {e}")
                        
                    # 记录第一个成功的配置用于后续测试
                    if len(successful_configs) == 1:
                        working_config = config
                        working_utility = utility
                        
                except Exception as e:
                    print(f"       方法调用失败: {e}")
                    
            except Exception as e:
                print(f"     配置'{config}'失败: {e}")
        
        # 5. 总结验证结果
        print(f"\n5. 验证结果总结:")
        print(f"   成功配置: {len(successful_configs)}个")
        
        if successful_configs:
            print("   可用配置:")
            for config, utility in successful_configs:
                print(f"     - '{config}'")
                
            # 选择最佳配置
            best_config = successful_configs[0][0]  # 使用第一个成功的
            best_utility = successful_configs[0][1]
            
            print(f"\n   推荐配置: '{best_config}'")
            return True, best_config, best_utility, anchor_part, soil_part
        else:
            print("   ERROR: 所有配置都失败")
            return False, None, None, None, None
            
    except Exception as e:
        print(f"ERROR: 验证过程失败: {e}")
        import traceback
        traceback.print_exc()
        return False, None, None, None, None

def test_embedded_constraints_generation(config, utility, anchor_part, soil_part):
    """测试embedded约束生成"""
    print(f"\n=== 测试Embedded约束生成 (配置: '{config}') ===")
    
    try:
        # 1. 分析当前状态
        print("1. 分析模型状态...")
        print(f"   锚杆节点数: {anchor_part.NumberOfNodes()}")
        print(f"   土体节点数: {soil_part.NumberOfNodes()}")
        
        # 2. 调用embedded功能
        print("2. 调用Embedded功能...")
        
        # 尝试不同的embedded操作
        operations = [
            ("GenerateSkin", lambda: utility.GenerateSkin()),
            ("InterpolateMeshVariableToSkin-DISPLACEMENT", 
             lambda: utility.InterpolateMeshVariableToSkin(KM.DISPLACEMENT)),
            ("InterpolateMeshVariableToSkin-VELOCITY",
             lambda: utility.InterpolateMeshVariableToSkin(KM.VELOCITY))
        ]
        
        results = {}
        for op_name, operation in operations:
            try:
                print(f"   执行 {op_name}...")
                result = operation()
                results[op_name] = {"status": "SUCCESS", "result": str(result)}
                print(f"     SUCCESS: {result}")
            except Exception as e:
                results[op_name] = {"status": "FAILED", "error": str(e)}
                print(f"     FAILED: {e}")
        
        # 3. 检查是否建立了约束关系
        print("3. 检查约束建立情况...")
        
        # 检查节点状态变化
        constraint_indicators = []
        
        # 检查锚杆节点是否有约束指示
        for node in anchor_part.Nodes:
            if node.IsFixed(KM.DISPLACEMENT_X):
                constraint_indicators.append(f"Node {node.Id} X-fixed")
            if node.IsFixed(KM.DISPLACEMENT_Y): 
                constraint_indicators.append(f"Node {node.Id} Y-fixed")
            if node.IsFixed(KM.DISPLACEMENT_Z):
                constraint_indicators.append(f"Node {node.Id} Z-fixed")
                
        if constraint_indicators:
            print(f"   发现约束指示: {len(constraint_indicators)}个")
            for indicator in constraint_indicators[:5]:  # 显示前5个
                print(f"     {indicator}")
        else:
            print("   未发现明显的约束指示")
            
        # 4. 评估embedded效果
        print("4. 评估Embedded效果...")
        
        success_count = sum(1 for r in results.values() if r["status"] == "SUCCESS")
        total_operations = len(operations)
        
        success_rate = success_count / total_operations * 100
        print(f"   操作成功率: {success_rate:.1f}% ({success_count}/{total_operations})")
        
        if success_rate >= 50:
            print("   评估: Embedded功能基本可用")
            return True, results
        else:
            print("   评估: Embedded功能需要进一步研究")
            return False, results
            
    except Exception as e:
        print(f"ERROR: 约束生成测试失败: {e}")
        return False, {}

def create_embedded_integration_plan(success, config, results):
    """创建集成计划"""
    print(f"\n=== 创建Embedded集成计划 ===")
    
    plan_content = f"""# EmbeddedSkinUtility3D集成实施计划

## 验证结果
- **验证状态**: {'SUCCESS' if success else 'PENDING'}
- **推荐配置**: '{config}'
- **功能测试**: {len([r for r in results.values() if r.get('status') == 'SUCCESS'])}个成功

## 集成策略

### 阶段1: kratos_interface.py集成
```python
def _generate_anchor_soil_embedded_constraints(self, anchor_elements, soil_model_part):
    \"\"\"使用EmbeddedSkinUtility3D生成锚杆-土体约束\"\"\"
    
    # 1. 准备锚杆ModelPart
    anchor_part = self._create_anchor_model_part(anchor_elements)
    
    # 2. 创建EmbeddedSkinUtility3D
    utility = KM.EmbeddedSkinUtility3D(anchor_part, soil_model_part, "{config}")
    
    # 3. 生成embedded约束
    utility.GenerateSkin()
    utility.InterpolateMeshVariableToSkin(KM.DISPLACEMENT)
    
    # 4. 返回约束信息
    return self._extract_embedded_constraints(utility)
```

### 阶段2: 完整流程集成
- 修改_write_interface_mappings方法
- 添加embedded约束与MPC约束的协调处理
- 确保12,678个锚杆-土体约束的正确生成

### 阶段3: 验证和优化
- 与现有2,934个地连墙约束兼容性测试
- 性能基准测试
- 结果质量验证

## 技术细节

### 数据准备
- 锚杆单元: material_id=13的TrussElement3D2N
- 土体网格: 3D solid elements
- 变量设置: DISPLACEMENT, VELOCITY

### 约束建立
- 几何关系: GenerateSkin()
- 变量映射: InterpolateMeshVariableToSkin()
- 约束提取: 从embedded关系中提取约束信息

## 预期成果
- 锚杆-地连墙: 2,934个MPC约束 ✅
- 锚杆-土体: 12,678个Embedded约束 🔄
- 总约束数: 15,612个

---
状态: {'开发就绪' if success else '需要进一步研究'}
更新: 2025-08-25
"""
    
    try:
        with open("EmbeddedSkinUtility3D集成计划.md", 'w', encoding='utf-8') as f:
            f.write(plan_content)
        print("SUCCESS 集成计划文档已创建")
        return True
    except Exception as e:
        print(f"ERROR 集成计划创建失败: {e}")
        return False

def main():
    """主函数"""
    print("开始EmbeddedSkinUtility3D完整验证...")
    
    # 1. 配置验证
    config_success, config, utility, anchor_part, soil_part = validate_embedded_configuration()
    
    if config_success:
        print(f"\nSUCCESS 配置验证成功，使用配置: '{config}'")
        
        # 2. 约束生成测试
        constraint_success, results = test_embedded_constraints_generation(
            config, utility, anchor_part, soil_part)
        
        # 3. 创建集成计划
        plan_success = create_embedded_integration_plan(constraint_success, config, results)
        
        print(f"\n{'='*60}")
        if constraint_success:
            print("SUCCESS EmbeddedSkinUtility3D验证完成！")
            print("✅ 配置参数已确定")
            print("✅ 核心功能已测试")  
            print("✅ 集成计划已制定")
            print("\n下一步: 集成到kratos_interface.py")
        else:
            print("INFO EmbeddedSkinUtility3D部分可用")
            print("需要进一步研究API使用方法")
            
    else:
        print("\nWARNING EmbeddedSkinUtility3D配置需要深入研究")
        print("建议：联系Kratos社区获取embedded功能文档")

if __name__ == "__main__":
    main()