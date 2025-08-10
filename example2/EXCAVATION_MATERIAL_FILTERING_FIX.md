# 开挖阶段土体材料过滤修复说明

## 问题描述

在example2项目中，当进行开挖分析步时，被挖掉的土体材料仍然在3D视图中显示，没有被正确隐藏。这会影响用户对开挖过程的理解和可视化效果。

## 问题原因

经过分析，发现存在以下几个问题：

1. **材料过滤逻辑不完整**：虽然在`filter_materials_by_stage`方法中正确计算了应该激活的材料，但在`display_transparent_layers`方法中没有正确应用这个过滤。

2. **3D视图隐藏机制不完善**：[hide_materials_in_3d](file:///e:/DeepCAD/example2/modules/preprocessor.py#L1432-L1451)方法在尝试从3D视图中移除材料时，查找actor的方式不正确，导致无法正确隐藏被开挖的材料。

3. **材料映射逻辑混乱**：在早期版本中，存在物理组ID到实际材料ID的复杂映射逻辑，但这个逻辑与实际的材料ID系统不匹配，导致过滤结果不正确。

## 修复方案

### 1. 简化材料过滤逻辑

移除了不必要的物理组到材料ID的映射，直接使用`determine_active_groups_for_stage`方法返回的材料ID：

```python
def filter_materials_by_stage(self, active_materials: list):
    """根据分析步过滤材料显示"""
    print(f"根据分析步过滤材料: {active_materials}")

    # 直接使用计算出的材料ID，不再进行错误的映射
    self.current_active_materials = set(active_materials)
    
    print(f"设置激活材料为: {sorted(list(self.current_active_materials))}")
```

### 2. 完善3D视图隐藏机制

修复了[hide_materials_in_3d](file:///e:/DeepCAD/example2/modules/preprocessor.py#L1432-L1451)方法中查找和移除actor的逻辑：

```python
def hide_materials_in_3d(self, material_ids_to_hide):
    """在3D视图中隐藏指定的材料（用于开挖模拟）"""
    # ...
    # 遍历所有要隐藏的材料ID
    for mat_id in material_ids_to_hide:
        actor_name = f'material_{mat_id}'
        
        # 尝试移除对应的actor
        try:
            # 获取所有actor并查找匹配的
            actors_to_remove = []
            for actor_name_in_plotter, actor in self.plotter.renderer.actors.items():
                if actor_name_in_plotter == actor_name:
                    actors_to_remove.append(actor)
            
            # 移除找到的actor
            for actor in actors_to_remove:
                self.plotter.remove_actor(actor)
                print(f"  已移除材料 {mat_id} 的3D显示")
        # ...
```

### 3. 在智能材料选择中主动调用隐藏方法

在`intelligent_material_selection`方法中，在确定了被移除的材料后，主动调用[hide_materials_in_3d](file:///e:/DeepCAD/example2/modules/preprocessor.py#L1432-L1451)方法：

```python
# 计算和报告被开挖移除的材料
# ...
removed_materials = all_soil_materials - self.current_active_materials
if removed_materials:
    print(f"🗑️  开挖移除的土体材料: {sorted(removed_materials)}")
    print(f"✅ 开挖效果确认：{len(removed_materials)}种土体材料将被完全隐藏")
    
    # 确保在3D视图中隐藏这些材料
    self.hide_materials_in_3d(removed_materials)
```

## 验证测试

创建了测试脚本[simple_excavation_test.py](file:///e:/DeepCAD/example2/simple_excavation_test.py)来验证修复效果。测试结果表明：

1. 能够正确识别开挖阶段应该激活的材料
2. 能够正确计算出应该被移除的土体材料
3. 能够正确隐藏被移除的土体材料

## 结论

通过以上修复，现在在开挖分析步中，被挖掉的土体材料能够被正确地从3D视图中隐藏，提升了可视化效果和用户体验。