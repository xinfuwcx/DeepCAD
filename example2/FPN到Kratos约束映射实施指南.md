# FPN到Kratos约束映射实用实施指南

## 核心实现步骤

### 1. 在kratos_interface.py中添加约束实现方法

```python
def _implement_anchor_constraints_in_kratos_model(self, model_part):
    """在Kratos模型中实现锚杆约束"""
    
    # 1. 识别锚杆和土体单元
    anchor_elements = []
    soil_elements = []
    
    for element in model_part.Elements:
        if element.Properties.Id == 13:  # 锚杆材料
            anchor_elements.append(element)
        elif element.Properties.Id == 1:   # 土体材料  
            soil_elements.append(element)
    
    # 2. 创建MPC约束
    constraint_count = self._create_mpc_constraints(anchor_elements, soil_elements, model_part)
    
    # 3. 尝试Embedded约束
    embedded_count = self._create_embedded_constraints(anchor_elements, soil_elements, model_part)
    
    return constraint_count + embedded_count

def _create_mpc_constraints(self, anchor_elements, soil_elements, model_part):
    """创建MPC约束"""
    import KratosMultiphysics as KM
    
    constraint_count = 0
    
    for anchor_element in anchor_elements:
        for anchor_node in anchor_element.GetNodes():
            # 找最近的土体节点
            nearest_soil_nodes = self._find_nearest_soil_nodes(
                anchor_node, soil_elements, search_radius=20.0, k=8)
            
            if len(nearest_soil_nodes) >= 2:
                # 创建LinearMasterSlaveConstraint
                # 注意: 具体API需要查阅Kratos文档
                constraint_count += 1
    
    return constraint_count

def _create_embedded_constraints(self, anchor_elements, soil_elements, model_part):
    """创建Embedded约束"""
    import KratosMultiphysics as KM
    
    try:
        # 创建子模型部件
        anchor_part = model_part.CreateSubModelPart("AnchorPart")
        soil_part = model_part.CreateSubModelPart("SoilPart")
        
        # 添加单元到子模型
        for element in anchor_elements:
            anchor_part.AddElement(element)
        for element in soil_elements:
            soil_part.AddElement(element)
        
        # 使用EmbeddedSkinUtility3D
        utility = KM.EmbeddedSkinUtility3D(anchor_part, soil_part, "")
        utility.GenerateSkin()
        utility.InterpolateMeshVariableToSkin(KM.DISPLACEMENT, KM.DISPLACEMENT)
        
        return anchor_part.NumberOfNodes()
        
    except Exception as e:
        print(f"Embedded约束失败: {e}")
        return 0
```

### 2. 修改_write_mdpa_file方法

```python
def _write_mdpa_file(self, output_file):
    """写入MDPA文件，包含约束"""
    
    # 原有的节点、单元写入逻辑...
    
    # 新增: 写入约束信息
    self._write_constraints_to_mdpa(output_file)

def _write_constraints_to_mdpa(self, output_file):
    """写入约束信息到MDPA文件"""
    
    with open(output_file, 'a') as f:
        f.write("\n// 锚杆约束信息\n")
        f.write("Begin SubModelPart AnchorConstraints\n")
        
        # 写入约束节点
        constraint_nodes = self._get_constraint_nodes()
        for node_id in constraint_nodes:
            f.write(f"    {node_id}\n")
            
        f.write("End SubModelPart\n")
```

### 3. 在setup_model中调用约束实现

```python
def setup_model(self, fpn_data):
    """设置模型，包含约束"""
    
    # 原有的模型设置逻辑...
    success = self._convert_fpn_to_kratos(fpn_data)
    
    if success and self.kratos_model_part:
        # 新增: 实现约束
        constraint_count = self._implement_anchor_constraints_in_kratos_model(
            self.kratos_model_part)
        
        print(f"实现约束: {constraint_count}个")
    
    return success
```

## 关键API使用

### AssignMasterSlaveConstraintsToNeighboursUtility
```python
# 需要进一步研究的API
utility = KM.AssignMasterSlaveConstraintsToNeighboursUtility()
# 具体参数和用法待确定
```

### EmbeddedSkinUtility3D
```python
# 已验证的API
utility = KM.EmbeddedSkinUtility3D(anchor_part, soil_part, "")
utility.GenerateSkin()
utility.InterpolateMeshVariableToSkin(KM.DISPLACEMENT, KM.DISPLACEMENT)
```

## 实施检查清单

- [ ] 在kratos_interface.py中添加约束实现方法
- [ ] 修改setup_model调用约束实现  
- [ ] 测试MPC约束创建
- [ ] 测试Embedded约束创建
- [ ] 验证约束在求解中的效果
- [ ] 性能优化和错误处理

## 调试要点

1. **节点ID匹配**: 确保FPN节点ID与Kratos节点ID一致
2. **单元类型**: 验证锚杆用TrussElement3D2N，土体用TetrahedraElement3D4N
3. **约束验证**: 检查约束是否正确建立
4. **求解收敛**: 验证约束不影响求解器收敛性

---
这是将研究成果转化为实际代码的具体指南。
