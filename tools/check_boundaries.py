from pathlib import Path

mdpa_path = Path('two_stage_analysis/two_stage.mdpa')
text = mdpa_path.read_text(encoding='utf-8', errors='ignore').splitlines()

# 统计各子模型的节点数
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

print("各子模型的节点数量:")
for smp_name, node_set in submodel_nodes.items():
    if 'SUPPORT' in smp_name or 'ANCHOR_ENDS' in smp_name or 'BOUNDARY' in smp_name:
        node_list = sorted(list(node_set))
        print(f"{smp_name}: {len(node_set)} 节点")
        if len(node_list) > 0:
            print(f"  范围: {min(node_list)} - {max(node_list)}")
            print(f"  前10个: {node_list[:10]}")

# 检查总节点数
all_nodes = set()
mode = None
for ln in text:
    if ln.startswith('Begin Nodes'):
        mode = 'nodes'
        continue
    if ln.startswith('End Nodes') and mode == 'nodes':
        mode = None
        continue
    if mode == 'nodes':
        parts = ln.split()
        if len(parts) >= 4 and parts[0].isdigit():
            all_nodes.add(int(parts[0]))

print(f"\n总节点数: {len(all_nodes)}")
print(f"节点编号范围: {min(all_nodes)} - {max(all_nodes)}")

# 检查约束覆盖率
constrained_nodes = set()
for smp_name, node_set in submodel_nodes.items():
    if 'SUPPORT' in smp_name or 'ANCHOR_ENDS' in smp_name or 'BOUNDARY' in smp_name:
        constrained_nodes.update(node_set)

print(f"\n约束节点总数: {len(constrained_nodes)}")
print(f"约束覆盖率: {len(constrained_nodes)/len(all_nodes)*100:.1f}%")

# 找出前1000个节点中无约束的
unconstrained_low = []
for nid in range(1, min(1001, max(all_nodes)+1)):
    if nid in all_nodes and nid not in constrained_nodes:
        unconstrained_low.append(nid)

print(f"\n前1000个节点中无约束的数量: {len(unconstrained_low)}")
if len(unconstrained_low) > 0:
    print(f"前20个无约束节点: {unconstrained_low[:20]}")
