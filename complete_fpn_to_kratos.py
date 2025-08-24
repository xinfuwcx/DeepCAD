"""
完整的FPN到Kratos转换器
彻彻底底完成从FPN到Kratos的转换，特别注意材料模型
"""

import sys
import json
import math
from pathlib import Path

def complete_fpn_to_kratos():
    """完整的FPN到Kratos转换"""
    print("🚀 开始完整的FPN到Kratos转换...")

    # 1. 解析FPN文件
    print("📖 解析FPN文件...")
    try:
        from example2.core.optimized_fpn_parser import OptimizedFPNParser

        project_root = Path(__file__).parent
        fpn_file = project_root / "example2" / "data" / "两阶段-全锚杆-摩尔库伦.fpn"

        parser = OptimizedFPNParser()
        fpn_data = parser.parse_file_streaming(str(fpn_file))

        print(f"✅ FPN文件解析成功")
        print(f"   节点数量: {len(fpn_data.get('nodes', []))}")
        print(f"   单元数量: {len(fpn_data.get('elements', []))}")
        print(f"   材料数量: {len(fpn_data.get('materials', {}))}")

    except Exception as e:
        print(f"❌ FPN解析失败: {e}")
        return False

    # 2. 创建输出目录
    output_dir = Path('complete_fpn_kratos_conversion')
    output_dir.mkdir(exist_ok=True)
    print(f"📁 创建输出目录: {output_dir}")

    # 3. 转换节点数据
    print("🔄 转换节点数据...")
    nodes = fpn_data.get('nodes', [])
    converted_nodes = []

    for node in nodes:
        converted_node = {
            'id': node['id'],
            'coordinates': [node['x'], node['y'], node['z']]
        }
        converted_nodes.append(converted_node)

    print(f"   转换了{len(converted_nodes)}个节点")

    # 4. 转换单元数据
    print("🔄 转换单元数据...")
    converted_elements = []

    # 单元类型映射
    element_type_mapping = {
        'tetra': 'Tetrahedra3D4N',
        'truss': 'TrussElement3D2N',  # 保持锚杆为轴向杆件（不引入弯曲刚度）
        'triangle': 'Triangle2D3N',
        'quad': 'Quadrilateral2D4N'
    }

    # 4.1 转换体单元（土体）
    elements = fpn_data.get('elements', [])
    for element in elements:
        original_type = element.get('type', '')
        kratos_type = element_type_mapping.get(original_type, original_type)

        converted_element = {
            'id': element['id'],
            'type': kratos_type,
            'material_id': element.get('material_id', 1),
            'nodes': element.get('nodes', [])
        }
        converted_elements.append(converted_element)

    print(f"   转换了{len(converted_elements)}个体单元")

    # 4.2 转换板单元（地连墙、隧道衬砌、筏板）
    plate_elements = fpn_data.get('plate_elements', {})
    plate_count = 0
    for eid, elem in plate_elements.items():
        nodes = elem.get('nodes', [])
        e_type = 'triangle' if len(nodes) == 3 else 'quad'

        # 板单元使用PSHELL属性ID，需要映射到材料ID
        prop_id = elem.get('prop_id', 1)
        # PSHELL属性13,14,16都使用材料1（C30混凝土）
        material_id = 1 if prop_id in [13, 14, 16] else prop_id

        converted_element = {
            'id': int(eid),
            'type': element_type_mapping.get(e_type, e_type),
            'material_id': material_id,
            'nodes': nodes
        }
        converted_elements.append(converted_element)
        plate_count += 1

    print(f"   转换了{plate_count}个板单元")

    # 4.3 转换线单元（锚杆）
    line_elements = fpn_data.get('line_elements', {})
    line_count = 0
    for eid, elem in line_elements.items():
        # 线单元使用PETRUSS属性ID，映射到材料13（钢材）
        prop_id = elem.get('prop_id', 13)
        material_id = 13  # 锚杆统一使用材料13（钢材）

        # 线单元的节点信息存储在n1和n2字段中
        n1 = elem.get('n1')
        n2 = elem.get('n2')
        nodes = [n1, n2] if n1 is not None and n2 is not None else []

        converted_element = {
            'id': int(eid),
            'type': 'TrussElement3D2N',
            'material_id': material_id,
            'nodes': nodes
        }
        converted_elements.append(converted_element)
        line_count += 1

    print(f"   转换了{line_count}个线单元")
    print(f"   总计转换了{len(converted_elements)}个单元")

    # 4.4 处理embedded约束（锚杆与土体的连接）
    print("🔗 处理embedded约束...")
    embedded_constraints = []

    # 获取边界条件信息
    boundary_groups = fpn_data.get('boundary_groups', {})
    mesh_sets = fpn_data.get('mesh_sets', {})

    # 检查是否有锚杆相关的约束
    anchor_constraints = 0
    for bg_id, bg_data in boundary_groups.items():
        constraints = bg_data.get('constraints', [])
        if constraints:
            # 检查约束类型，'111000'通常表示底部固定约束
            sample_constraint = constraints[0]
            dof_code = sample_constraint.get('dof_code', '')
            if dof_code == '111000':  # 底部固定约束
                print(f"   发现底部固定约束组{bg_id}: {len(constraints)}个节点")
                # 这些约束将在边界条件中处理
            else:
                print(f"   发现其他约束组{bg_id}: {len(constraints)}个节点, 约束代码: {dof_code}")

    # 实现锚杆与土体的embedded连接
    # 策略：为每个锚杆节点找到最近的土体单元节点，建立MasterSlaveConstraint
    print(f"🔍 分析锚杆与土体的连接关系...")

    # 收集所有锚杆节点
    anchor_nodes = set()
    for eid, elem in line_elements.items():
        n1 = elem.get('n1')
        n2 = elem.get('n2')
        if n1 and n2:
            anchor_nodes.add(n1)
            anchor_nodes.add(n2)

    # 收集所有土体单元的节点
    soil_nodes = set()
    elements = fpn_data.get('elements', [])
    for element in elements:
        nodes = element.get('nodes', [])
        soil_nodes.update(nodes)

    print(f"   锚杆节点数量: {len(anchor_nodes)}")
    print(f"   土体节点数量: {len(soil_nodes)}")

    # 找到锚杆节点与土体节点的重合点（共享节点）
    shared_nodes = anchor_nodes.intersection(soil_nodes)
    print(f"   共享节点数量: {len(shared_nodes)}")

    if len(shared_nodes) > 0:
        print(f"✓ 锚杆与土体通过{len(shared_nodes)}个共享节点自然连接")
        print("   无需额外的embedded约束")
    else:
        print("⚠️ 锚杆与土体没有共享节点，需要建立embedded约束")
        # 这种情况下需要实现空间搜索算法，暂时跳过
        print("   注意：当前版本暂不支持非共享节点的embedded约束")

    # 5. 转换材料数据
    print("🔄 转换材料数据...")
    materials = fpn_data.get('materials', {})

    class FPNMaterialAdapter:
        """FPN材料到Kratos材料的适配器 - 统一弹塑性摩尔-库伦模型"""
        def __init__(self, mat_id, fpn_mat_data):
            self.id = mat_id
            self.name = fpn_mat_data.get('name', f'Material_{mat_id}')

            # 从FPN的properties字段中提取材料参数
            props = fpn_mat_data.get('properties', {})

            # 基本弹性参数 - 从FPN读取
            self.elastic_modulus = props.get('E', 30e6)  # Pa，FPN已转换
            self.young_modulus = self.elastic_modulus  # 别名
            self.poisson_ratio = props.get('NU', 0.3)
            self.density = props.get('DENSITY', 2000.0)  # kg/m³，FPN已转换

            # 摩尔-库伦参数 - 优先从FPN读取
            self.friction_angle = props.get('FRICTION_ANGLE')
            self.cohesion = props.get('COHESION')  # Pa，FPN已转换

            # 根据材料名称推断缺失的摩尔-库伦参数
            self._infer_missing_parameters()

            # 其他参数
            self.porosity = props.get('POROSITY', 0.5)
            self.material_type = props.get('type', 'soil')

        def _infer_missing_parameters(self):
            """根据材料名称推断缺失的摩尔-库伦参数"""
            material_name_lower = self.name.lower()

            # 如果摩擦角或粘聚力缺失或为0，则推断参数
            if self.friction_angle is None or self.friction_angle == 0.0 or self.cohesion is None:
                if any(keyword in material_name_lower for keyword in ['砂', '细砂', 'sand']):
                    # 砂土：高摩擦角，无粘聚力
                    self.friction_angle = self.friction_angle or 32.0  # 中密砂土
                    self.cohesion = self.cohesion or 0.0
                    print(f"🏖️ 砂土材料 {self.name}: 推断 φ={self.friction_angle}°, c={self.cohesion/1000:.1f}kPa")
                elif any(keyword in material_name_lower for keyword in ['卵石', 'gravel', '碎石']):
                    # 卵石：很高摩擦角，无粘聚力
                    self.friction_angle = self.friction_angle or 38.0  # 密实卵石
                    self.cohesion = self.cohesion or 0.0
                    print(f"🪨 卵石材料 {self.name}: 推断 φ={self.friction_angle}°, c={self.cohesion/1000:.1f}kPa")
                elif any(keyword in material_name_lower for keyword in ['粘土', 'clay', '粉质']):
                    # 粘土：中等摩擦角，有粘聚力
                    self.friction_angle = self.friction_angle or 22.0  # 中等粘土
                    self.cohesion = self.cohesion or 15000.0  # 15kPa
                    print(f"🧱 粘土材料 {self.name}: 推断 φ={self.friction_angle}°, c={self.cohesion/1000:.1f}kPa")
                else:
                    # 默认土体参数
                    self.friction_angle = self.friction_angle or 25.0
                    self.cohesion = self.cohesion or 10000.0  # 10kPa
                    print(f"🌍 通用土体 {self.name}: 推断 φ={self.friction_angle}°, c={self.cohesion/1000:.1f}kPa")

    # 转换FPN材料为Kratos兼容格式
    kratos_materials = {}
    for mat_id, fpn_mat_data in materials.items():
        kratos_materials[mat_id] = FPNMaterialAdapter(mat_id, fpn_mat_data)

    print(f"   转换了{len(kratos_materials)}个材料")

    # 6. 处理边界条件 - 按约束类型分组节点
    boundary_node_groups = {}  # 按约束类型分组节点

    for bg_id, bg_data in boundary_groups.items():
        print(f"   处理边界组 {bg_id}")

        if 'constraints' in bg_data:
            # 按DOF码分组节点
            dof_groups = {}
            for constraint in bg_data['constraints']:
                node_id = constraint['node']
                dof_code = constraint.get('dof_code', '111000')
                dof_bools = constraint.get('dof_bools', [True, True, True])

                if dof_code not in dof_groups:
                    dof_groups[dof_code] = []
                dof_groups[dof_code].append(node_id)

            # 为每种约束类型创建边界组
            for dof_code, nodes in dof_groups.items():
                group_name = f"BOUNDARY_GROUP_{bg_id}_{dof_code}"
                boundary_node_groups[group_name] = {
                    'nodes': nodes,
                    'dof_code': dof_code,
                    'dof_bools': [c == '1' for c in dof_code[:3]]  # 只取前3位（位移）
                }
                print(f"     {group_name}: {len(nodes)}个节点, 约束={dof_code}")

        # 处理节点组约束（如果有的话）
        if 'nodes' in bg_data and 'constraints' not in bg_data:
            group_name = f"BOUNDARY_GROUP_{bg_id}"
            boundary_node_groups[group_name] = {
                'nodes': bg_data['nodes'],
                'dof_code': '111000',  # 默认全约束
                'dof_bools': [True, True, True]
            }
            print(f"     {group_name}: {len(bg_data['nodes'])}个节点, 默认全约束")

    # 7. 生成MDPA文件
    print("📝 生成MDPA文件...")
    mdpa_file = output_dir / 'kratos_analysis.mdpa'

    try:
        with open(mdpa_file, 'w') as f:
            # 写出MDPA文件头（声明变量）
            f.write("Begin ModelPartData\n")
            f.write("//  VARIABLE_NAME value\n")
            f.write("End ModelPartData\n\n")

            # 声明节点变量（只声明DISPLACEMENT，让求解器自动处理ROTATION）
            f.write("Begin NodalData DISPLACEMENT\n")
            f.write("End NodalData\n\n")

            # 添加ROTATION变量定义（Shell单元需要）
            f.write("Begin NodalData ROTATION\n")
            f.write("End NodalData\n\n")

            # 收集使用的材料ID
            used_material_ids = set()
            for element in converted_elements:
                used_material_ids.add(element.get('material_id', 1))

            # 写出属性
            for mat_id in sorted(used_material_ids):
                f.write(f"Begin Properties {mat_id}\n")
                f.write("End Properties\n\n")

            # 写出节点
            f.write("Begin Nodes\n")
            for node in converted_nodes:
                coords = node['coordinates']
                f.write(f"{node['id']} {coords[0]} {coords[1]} {coords[2]}\n")
            f.write("End Nodes\n\n")

            # 预先收集材料分组到集合，方便后续构建联合分组
            mat_to_nodes = {mat_id: set() for mat_id in sorted(used_material_ids)}
            for el in converted_elements:
                mat_to_nodes[el.get('material_id', 1)].update(el.get('nodes', []))

            # 构建辅助映射：节点坐标
            node_coords = {n['id']: n['coordinates'] for n in converted_nodes}

            # 收集壳与实体节点集合
            shell_nodes = set()
            for el in converted_elements:
                if el['type'] in ('Triangle2D3N', 'Quadrilateral2D4N'):
                    shell_nodes.update(el.get('nodes', []))
            solid_host_nodes = set()
            for mid in sorted(used_material_ids):
                if mid not in [1, 13]:
                    solid_host_nodes.update(mat_to_nodes.get(mid, set()))

            # 分类锚杆节点：靠近壳的归为 ANCHOR_TO_SHELL，其余为 ANCHOR_TO_SOIL
            anchor_to_shell = set()
            anchor_to_soil = set()
            near_shell_radius = 0.5  # m，按用户要求放宽到0.5 m
            r2 = near_shell_radius * near_shell_radius
            shell_list = list(shell_nodes)
            for an in sorted(list(anchor_nodes)):
                ax, ay, az = node_coords.get(an, [None, None, None])
                if ax is None:
                    continue
                is_near = False
                # 粗暴最近邻半径检查（数目可控：壳节点通常较少）
                for sn in shell_list:
                    sx, sy, sz = node_coords.get(sn, [None, None, None])
                    if sx is None:
                        continue
                    dx = ax - sx; dy = ay - sy; dz = az - sz
                    if dx*dx + dy*dy + dz*dz <= r2:
                        is_near = True
                        break
                if is_near:
                    anchor_to_shell.add(an)
                else:
                    anchor_to_soil.add(an)
            print(f"   壳节点数: {len(shell_nodes)}, 实体宿主节点数: {len(solid_host_nodes)}")
            print(f"   锚杆分组: 壳端{len(anchor_to_shell)}个, 土中{len(anchor_to_soil)}个")

            # 当rotation_dofs=true时，需要显式定义ROTATION变量
            # Shell单元需要ROTATION变量来处理转角自由度

            # 找到底部节点（Z坐标最小的节点）并写入一个底部支撑的 SubModelPart
            z_coords = [node['coordinates'][2] for node in converted_nodes]
            min_z = min(z_coords)
            z_tolerance = 1.0  # 1米容差
            bottom_nodes = [node['id'] for node in converted_nodes
                           if node['coordinates'][2] <= min_z + z_tolerance]
            print(f"🔒 识别底部固定节点: {len(bottom_nodes)} 个 (Z <= {min_z + z_tolerance:.2f})")
            # 写出 SubModelPart: BOTTOM_SUPPORT
            f.write("Begin SubModelPart BOTTOM_SUPPORT\n")
            f.write("  Begin SubModelPartNodes\n")
            for node_id in sorted(bottom_nodes):
                f.write(f"  {node_id}\n")
            f.write("  End SubModelPartNodes\n")
            f.write("  Begin SubModelPartElements\n")
            # 可选：不需要固定到元素，这里留空
            f.write("  End SubModelPartElements\n")
            f.write("End SubModelPart\n")

            # 写出边界条件SubModelPart（按约束类型分组）
            for group_name, group_data in boundary_node_groups.items():
                f.write(f"Begin SubModelPart {group_name}\n")
                f.write("  Begin SubModelPartNodes\n")
                for node_id in sorted(group_data['nodes']):
                    f.write(f"    {node_id}\n")
                f.write("  End SubModelPartNodes\n")
                f.write("  Begin SubModelPartElements\n")
                f.write("  End SubModelPartElements\n")
                f.write("End SubModelPart\n\n")
                print(f"🔒 写入边界组 {group_name}: {len(group_data['nodes'])}个节点")

            # 写出单元
            # 1. 体单元（土体）
            tetra_elements = [el for el in converted_elements if el['type'] == 'Tetrahedra3D4N']
            if tetra_elements:
                f.write("Begin Elements SmallDisplacementElement3D4N\n")
                for el in tetra_elements:
                    nodes_str = ' '.join(map(str, el['nodes']))
                    f.write(f"{el['id']} {el['material_id']} {nodes_str}\n")
                f.write("End Elements\n\n")
                print(f"✓ 写入{len(tetra_elements)}个体单元")

            # 2. 板单元（地连墙、隧道衬砌）
            triangle_elements = [el for el in converted_elements if el['type'] == 'Triangle2D3N']
            if triangle_elements:
                f.write("Begin Elements ShellThinElement3D3N\n")
                for el in triangle_elements:
                    nodes_str = ' '.join(map(str, el['nodes']))
                    f.write(f"{el['id']} {el['material_id']} {nodes_str}\n")
                f.write("End Elements\n\n")
                print(f"✓ 写入{len(triangle_elements)}个三角形板单元")

            quad_elements = [el for el in converted_elements if el['type'] == 'Quadrilateral2D4N']
            if quad_elements:
                f.write("Begin Elements ShellThinElement3D4N\n")
                for el in quad_elements:
                    nodes_str = ' '.join(map(str, el['nodes']))
                    f.write(f"{el['id']} {el['material_id']} {nodes_str}\n")
                f.write("End Elements\n\n")
                print(f"✓ 写入{len(quad_elements)}个四边形板单元")

            # 3. 线单元（锚杆）
            truss_elements = [el for el in converted_elements if el['type'] == 'TrussElement3D2N']
            if truss_elements:
                f.write("Begin Elements TrussElement3D2N\n")
                for el in truss_elements:
                    nodes_str = ' '.join(map(str, el['nodes']))
                    f.write(f"{el['id']} {el['material_id']} {nodes_str}\n")
                f.write("End Elements\n\n")
                print(f"✓ 写入{len(truss_elements)}个线单元（锚杆）")

            # 写出子模型部分（各材料）
            for mat_id in sorted(used_material_ids):
                f.write(f"Begin SubModelPart MAT_{mat_id}\n")
                f.write("  Begin SubModelPartNodes\n")
                # 收集该材料的节点
                material_nodes = set()
                for el in converted_elements:
                    if el.get('material_id') == mat_id:
                        material_nodes.update(el.get('nodes', []))
                for node_id in sorted(material_nodes):
                    f.write(f"  {node_id}\n")
                f.write("  End SubModelPartNodes\n")
                f.write("  Begin SubModelPartElements\n")
                for el in converted_elements:
                    if el.get('material_id') == mat_id:
                        f.write(f"  {el['id']}\n")
                f.write("  End SubModelPartElements\n")
                f.write("End SubModelPart\n")

            # 写出联合分组：SOLID_HOST、ANCHOR_TO_SHELL、ANCHOR_TO_SOIL
            f.write("Begin SubModelPart SOLID_HOST\n")
            f.write("  Begin SubModelPartNodes\n")
            for nid in sorted(solid_host_nodes):
                f.write(f"  {nid}\n")
            f.write("  End SubModelPartNodes\n")
            f.write("  Begin SubModelPartElements\n")
            for el in converted_elements:
                if el.get('material_id') not in [1, 13]:
                    f.write(f"  {el['id']}\n")
            f.write("  End SubModelPartElements\n")
            f.write("End SubModelPart\n")

            f.write("Begin SubModelPart ANCHOR_TO_SHELL\n")
            f.write("  Begin SubModelPartNodes\n")
            for nid in sorted(anchor_to_shell):
                f.write(f"  {nid}\n")
            f.write("  End SubModelPartNodes\n")
            f.write("  Begin SubModelPartElements\n")
            for el in converted_elements:
                if el.get('type') == 'TrussElement3D2N' and any(n in anchor_to_shell for n in el.get('nodes', [])):
                    f.write(f"  {el['id']}\n")
            f.write("  End SubModelPartElements\n")
            f.write("End SubModelPart\n")

            f.write("Begin SubModelPart ANCHOR_TO_SOIL\n")
            f.write("  Begin SubModelPartNodes\n")
            for nid in sorted(anchor_to_soil):
                f.write(f"  {nid}\n")
            f.write("  End SubModelPartNodes\n")
            f.write("  Begin SubModelPartElements\n")
            for el in converted_elements:
                if el.get('type') == 'TrussElement3D2N' and any(n in anchor_to_soil for n in el.get('nodes', [])):
                    f.write(f"  {el['id']}\n")
            f.write("  End SubModelPartElements\n")
            f.write("End SubModelPart\n")

        print(f"✅ MDPA文件生成成功: {mdpa_file}")

    except Exception as e:
        print(f"❌ MDPA文件生成失败: {e}")
        return False

    # 7. 生成材料文件
    print("📝 生成材料文件...")
    materials_file = output_dir / 'materials.json'

    try:
        properties = []

        # 只为实际使用的材料生成配置 - 统一使用摩尔-库伦弹塑性模型
        for mat_id in sorted(used_material_ids):
            if mat_id not in kratos_materials:
                continue
            mat = kratos_materials[mat_id]

            # 统一使用摩尔-库伦材料模型（兼容当前Kratos版本的D+/D− damage变体）
            phi_deg = float(mat.friction_angle)
            phi_rad = math.radians(phi_deg)
            cohesion_pa = float(mat.cohesion)

            # 剪胀角：优先用FPN提供；否则 ψ = max(0, φ - 30°)，单位：度
            dilatancy_deg = max(0.0, phi_deg - 30.0)
            dilatancy_rad = math.radians(dilatancy_deg)

            # 计算屈服应力 (摩尔-库伦): 使用弧度进行三角函数
            sin_phi = math.sin(phi_rad)
            cos_phi = math.cos(phi_rad)
            tension_yield = 2.0 * cohesion_pa * cos_phi / max(1e-12, (1.0 + sin_phi))
            compression_yield = 2.0 * cohesion_pa * cos_phi / max(1e-12, (1.0 - sin_phi))
            # 最小值兜底，避免数值过小
            tension_yield = max(tension_yield, 1.0e3)      # ≥ 1 kPa
            compression_yield = max(compression_yield, 1.0e4)  # ≥ 10 kPa

            # 根据材料ID判断材料类型和本构模型
            if mat_id == 1:
                # 材料1: C30混凝土 - 用于地连墙、隧道衬砌、筏板（板单元）
                constitutive_law = "LinearElastic3DLaw"

                # 从FPN数据中获取板厚度
                thickness = 0.2  # 默认厚度 200mm
                shell_sections = fpn_data.get('shell_sections', {})
                if shell_sections:
                    # 查找PESHELL属性中的厚度
                    for section_id, section_data in shell_sections.items():
                        thick = section_data.get('thickness')
                        if thick and thick > 0:
                            thickness = float(thick)
                            print(f"   从PESHELL读取厚度: {thickness*1000:.1f} mm")
                            break

                material_props = {
                    "YOUNG_MODULUS": float(mat.elastic_modulus),
                    "POISSON_RATIO": float(mat.poisson_ratio),
                    "DENSITY": float(mat.density),
                    "THICKNESS": thickness  # 板厚度 m（板单元必需）
                }
                print(f"🧱 混凝土材料 {mat.name}: 线弹性 E={mat.elastic_modulus/1e6:.1f} MPa, t={thickness*1000:.1f} mm")
            elif mat_id == 13:
                # 材料13: 锚杆钢材 - 线弹性（线单元）
                constitutive_law = "TrussConstitutiveLaw"

                # 从FPN数据中获取线单元截面积
                cross_area = 0.001  # 默认截面积 1000 mm²
                truss_sections = fpn_data.get('truss_sections', {})
                if truss_sections:
                    # 查找PETRUSS属性中的截面积
                    for section_id, section_data in truss_sections.items():
                        area = section_data.get('area')
                        if area and area > 0:
                            cross_area = float(area)
                            print(f"   从PETRUSS读取截面积: {cross_area*1e6:.1f} mm²")
                            break

                material_props = {
                    "YOUNG_MODULUS": float(mat.elastic_modulus),
                    "POISSON_RATIO": float(mat.poisson_ratio),
                    "DENSITY": float(mat.density),
                    "CROSS_AREA": cross_area  # 截面积 m²（线单元必需）
                }
                print(f"🔩 钢材 {mat.name}: 线弹性 E={mat.elastic_modulus/1e6:.1f} MPa, A={cross_area*1e6:.1f} mm²")
            else:
                # 材料2-12: 土体 - 使用修正摩尔-库伦模型（体单元）
                constitutive_law = "SmallStrainDplusDminusDamageModifiedMohrCoulombVonMises3D"
                # 计算剪胀角（通常为摩擦角的1/3到1/2）
                friction_angle_deg = float(mat.friction_angle)
                dilatancy_angle_deg = max(0.0, friction_angle_deg * 0.4)  # 取摩擦角的40%

                material_props = {
                    "YOUNG_MODULUS": float(mat.elastic_modulus),
                    "POISSON_RATIO": float(mat.poisson_ratio),
                    "DENSITY": float(mat.density),
                    "FRICTION_ANGLE": friction_angle_deg,
                    "DILATANCY_ANGLE": dilatancy_angle_deg,  # 根据摩擦角计算的剪胀角
                    "COHESION": float(mat.cohesion),
                    # 软化参数（必需）
                    "SOFTENING_TYPE": 0,  # 0=线性软化, 1=指数软化
                    "FRACTURE_ENERGY": 100.0,  # 断裂能 (J/m²)
                    # 屈服应力（改善收敛性）
                    "YIELD_STRESS_TENSION": float(mat.cohesion * 2.0),
                    "YIELD_STRESS_COMPRESSION": float(mat.cohesion * 10.0),
                    # 重力加速度
                    "VOLUME_ACCELERATION": [0.0, 0.0, -9.81]
                }
                print(f"🌍 土体材料 {mat.name}: 修正摩尔-库伦 φ={friction_angle_deg:.1f}°, ψ={dilatancy_angle_deg:.1f}°, c={mat.cohesion/1000:.1f}kPa, E={mat.elastic_modulus/1e6:.1f} MPa")

            properties.append({
                "model_part_name": f"Structure.MAT_{mat_id}",
                "properties_id": mat_id,
                "Material": {
                    "constitutive_law": {
                        "name": constitutive_law
                    },
                    "Variables": material_props,
                    "Tables": {}
                }
            })

        materials_data = {
            "properties": properties
        }

        with open(materials_file, 'w', encoding='utf-8') as f:
            json.dump(materials_data, f, ensure_ascii=False, indent=2)

        print(f"✅ 材料文件生成成功: {materials_file}")

    except Exception as e:
        print(f"❌ 材料文件生成失败: {e}")
        return False

    # 7.5. 处理边界条件和荷载
    print("🔄 处理边界条件和荷载...")
    boundary_conditions = []
    loads = []

    # 从FPN数据中提取边界条件
    boundary_groups = fpn_data.get('boundary_groups', {})
    load_groups = fpn_data.get('load_groups', {})

    print(f"   发现 {len(boundary_groups)} 个边界组")
    print(f"   发现 {len(load_groups)} 个荷载组")



    # 处理荷载 - 重力和其他荷载
    gravity_load = None
    for lg_id, lg_data in load_groups.items():
        if 'gravity' in lg_data:
            gravity = lg_data['gravity']
            gravity_load = gravity
            print(f"   添加重力荷载: {gravity}")

    # 强制使用增强重力进行测试
    gravity_load = [0.0, 0.0, -98.0665]  # 增大10倍重力用于测试
    print(f"   使用增强重力荷载: {gravity_load}")

    # 8. 生成项目参数文件
    print("📝 生成项目参数文件...")
    params_file = output_dir / 'ProjectParameters.json'

    try:
        # 统一使用非线性分析（弹塑性摩尔-库伦模型）
        analysis_type = "non_linear"

        project_params = {
            "problem_data": {
                "problem_name": "fpn_kratos_analysis",
                "parallel_type": "OpenMP",
                "echo_level": 1,
                "start_time": 0.0,
                "end_time": 1.0
            },
            "solver_settings": {
                "solver_type": "Static",
                "model_part_name": "Structure",
                "domain_size": 3,
                "echo_level": 1,
                "analysis_type": analysis_type,
                "model_import_settings": {
                    "input_type": "mdpa",
                    "input_filename": "kratos_analysis"
                },
                "material_import_settings": {
                    "materials_filename": "materials.json"
                },
                "time_stepping": {
                    "time_step": 1.0
                },
                "solving_strategy_settings": {
                    "type": "line_search"
                },
                "convergence_criterion": "residual_criterion",
                "displacement_relative_tolerance": 1e-4,
                "displacement_absolute_tolerance": 1e-9,
                "residual_relative_tolerance": 1e-4,
                "residual_absolute_tolerance": 1e-9,
                "max_iteration": 20,
                "rotation_dofs": True  # 启用壳单元转角DOF
            },
            "processes": {
                "constraints_process_list": [
                    # 添加FPN边界条件（按约束类型分组）
                    {
                        "python_module": "assign_vector_variable_process",
                        "kratos_module": "KratosMultiphysics",
                        "process_name": "AssignVectorVariableProcess",
                        "Parameters": {
                            "model_part_name": f"Structure.{group_name}",
                            "variable_name": "DISPLACEMENT",
                            "constrained": group_data['dof_bools'],
                            "value": [0.0, 0.0, 0.0],
                            "interval": [0.0, "End"]
                        }
                    } for group_name, group_data in boundary_node_groups.items()
                ] + [
                    # 全局固定所有节点的ROTATION，避免非壳节点转角悬空
                    {
                        "python_module": "assign_vector_variable_process",
                        "kratos_module": "KratosMultiphysics",
                        "process_name": "AssignVectorVariableProcess",
                        "Parameters": {
                            "model_part_name": "Structure",
                            "variable_name": "ROTATION",
                            "constrained": [True, True, True],
                            "value": [0.0, 0.0, 0.0],
                            "interval": [0.0, "End"]
                        }
                    },
                    # 在壳分组释放ROTATION（MAT_1为板/壳）
                    {
                        "python_module": "assign_vector_variable_process",
                        "kratos_module": "KratosMultiphysics",
                        "process_name": "AssignVectorVariableProcess",
                        "Parameters": {
                            "model_part_name": "Structure.MAT_1",
                            "variable_name": "ROTATION",
                            "constrained": [False, False, False],
                            "value": [0.0, 0.0, 0.0],
                            "interval": [0.0, "End"]
                        }
                    }
                ],
                "loads_process_list": [
                    {
                        "python_module": "assign_vector_by_direction_process",
                        "kratos_module": "KratosMultiphysics",
                        "process_name": "AssignVectorByDirectionProcess",
                        "Parameters": {
                            "model_part_name": "Structure",
                            "variable_name": "VOLUME_ACCELERATION",
                            "constrained": False,
                            "modulus": 98.0665,  # 增大10倍重力
                            "direction": [0.0, 0.0, -1.0],
                            "interval": [0.0, "End"]
                        }
                    }
                ] + [
                    # MPC: 锚杆壳端（铰接，位移耦合）
                    {
                        "python_module": "assign_master_slave_constraints_to_neighbours_process",
                        "kratos_module": "KratosMultiphysics",
                        "process_name": "AssignMasterSlaveConstraintsToNeighboursProcess",
                        "Parameters": {
                            "model_part_name": "Structure",
                            "slave_model_part_name": "Structure.ANCHOR_TO_SHELL",
                            "master_model_part_name": "Structure.MAT_1",
                            "variable_names": ["DISPLACEMENT"],
                            "search_radius": 0.5,
                            "minimum_number_of_neighbouring_nodes": 3,
                            "reform_constraints_at_each_step": False
                        }
                    },
                    # MPC: 锚杆土中段（嵌入等效，位移耦合）
                    {
                        "python_module": "assign_master_slave_constraints_to_neighbours_process",
                        "kratos_module": "KratosMultiphysics",
                        "process_name": "AssignMasterSlaveConstraintsToNeighboursProcess",
                        "Parameters": {
                            "model_part_name": "Structure",
                            "slave_model_part_name": "Structure.ANCHOR_TO_SOIL",
                            "master_model_part_name": "Structure.SOLID_HOST",
                            "variable_names": ["DISPLACEMENT"],
                            "search_radius": 1.0,
                            "minimum_number_of_neighbouring_nodes": 3,
                            "reform_constraints_at_each_step": False
                        }
                    }
                ],
                "list_other_processes": [
                    {
                        "python_module": "vtk_output_process",
                        "kratos_module": "KratosMultiphysics",
                        "process_name": "VtkOutputProcess",
                        "help": "This process writes postprocessing files for Paraview",
                        "Parameters": {
                            "model_part_name": "Structure",
                            "output_control_type": "step",
                            "output_interval": 1,
                            "file_format": "ascii",
                            "output_precision": 7,
                            "output_sub_model_parts": False,
                            "output_path": "VTK_Output",
                            "save_output_files_in_folder": True,
                            "nodal_solution_step_data_variables": ["DISPLACEMENT", "REACTION"],
                            "nodal_data_value_variables": [],
                            "element_data_value_variables": [],
                            "condition_data_value_variables": []
                        }
                    }
                ]
            },
            "output_processes": {}
        }

        with open(params_file, 'w', encoding='utf-8') as f:
            json.dump(project_params, f, ensure_ascii=False, indent=2)

        print(f"✅ 项目参数文件生成成功: {params_file}")
        print(f"   分析类型: {analysis_type}")

    except Exception as e:
        print(f"❌ 项目参数文件生成失败: {e}")
        return False

    print(f"\n🎉 完整的FPN到Kratos转换成功完成!")
    print(f"📁 输出目录: {output_dir}")
    print(f"📋 生成的文件:")
    print(f"   - kratos_analysis.mdpa ({len(converted_nodes)}个节点, {len(converted_elements)}个单元)")
    print(f"   - materials.json ({len(kratos_materials)}种材料)")
    print(f"   - ProjectParameters.json ({analysis_type}分析)")

    return True

if __name__ == "__main__":
    success = complete_fpn_to_kratos()

    if success:
        print(f"\n✅ 转换成功! 现在可以运行Kratos分析了")
        print(f"💡 下一步:")
        print(f"   1. cd complete_fpn_kratos_conversion")
        print(f"   2. python -c \"import KratosMultiphysics; from KratosMultiphysics.StructuralMechanicsApplication import structural_mechanics_analysis; analysis = structural_mechanics_analysis.StructuralMechanicsAnalysis(KratosMultiphysics.Model(), KratosMultiphysics.Parameters(open('ProjectParameters.json').read())); analysis.Run()\"")
    else:
        print(f"\n❌ 转换失败")
