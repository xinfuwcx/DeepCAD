from pathlib import Path
import re

# 检查节点127周围是否有锚杆连接
mdpa_path = Path('two_stage_analysis/two_stage.mdpa')
text = mdpa_path.read_text(encoding='utf-8', errors='ignore').splitlines()

# 找到所有包含节点127的单元
mode = None
elements_with_127 = []

for ln in text:
    if ln.startswith('Begin Elements'):
        mode = 'elements'
        continue
    if ln.startswith('End Elements') and mode == 'elements':
        mode = None
        continue
        
    if mode == 'elements':
        parts = ln.split()
        if len(parts) >= 4 and parts[0].isdigit():
            try:
                elem_id = int(parts[0])
                prop_id = int(parts[1])
                node_ids = list(map(int, parts[2:]))
                if 127 in node_ids:
                    elements_with_127.append((elem_id, prop_id, node_ids))
            except:
                pass

print(f"包含节点127的单元:")
for elem_id, prop_id, node_ids in elements_with_127:
    elem_type = "Cable" if prop_id == 9001 else "Solid"
    print(f"  元素{elem_id} (属性{prop_id}, {elem_type}): 节点 {node_ids}")

# 检查节点127是否应该在某个边界子模型中
print(f"\n节点127坐标: (27.366, 1.021, 4.659)")
print("这个节点可能在模型的内部，既不在边界也不是锚杆端点")

# 检查是否有其他类似的无约束节点
print(f"\n检查前200个节点的约束情况...")
submodel_nodes = {}
current_smp = None
mode = None

for ln in text:
    if ln.startswith('Begin SubModelPart '):
        current_smp = ln.split()[2]
        submodel_nodes[current_smp] = set()
        mode = None
        continue
    if ln.startswith('End SubModelPart'):
        current_smp = None
        continue
    if ln.strip() == 'Begin SubModelPartNodes':
        mode = 'smp_nodes'
        continue
    if ln.strip() == 'End SubModelPartNodes':
        mode = None
        continue
        
    if mode == 'smp_nodes' and current_smp:
        parts = ln.split()
        for p in parts:
            if p.isdigit():
                submodel_nodes[current_smp].add(int(p))

# 收集所有有约束的节点
constrained_nodes = set()
for smp_name, node_set in submodel_nodes.items():
    if 'SUPPORT' in smp_name or 'ANCHOR_ENDS' in smp_name or 'BOUNDARY' in smp_name:
        constrained_nodes.update(node_set)

# 检查前200个节点中哪些没有约束
unconstrained = []
for nid in range(1, 201):
    if nid not in constrained_nodes:
        unconstrained.append(nid)

print(f"前200个节点中无约束的节点: {unconstrained[:20]}...")
print(f"总计无约束节点数: {len(unconstrained)}")
