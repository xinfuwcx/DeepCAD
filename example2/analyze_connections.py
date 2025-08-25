#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
分析土-地连墙-锚杆之间的连接关系
"""

import re
from pathlib import Path
from collections import defaultdict

def analyze_connections():
    """分析连接关系"""
    print("🔍 分析土-地连墙-锚杆连接关系")
    print("=" * 60)
    
    mdpa_file = Path("temp_kratos_final/model.mdpa")
    if not mdpa_file.exists():
        print("❌ MDPA文件不存在")
        return
    
    # 收集不同类型单元的节点
    solid_nodes = set()  # 土体单元节点
    shell_nodes = set()  # 地连墙单元节点  
    truss_nodes = set()  # 锚杆单元节点
    
    current_element_type = None
    
    with open(mdpa_file, 'r', encoding='utf-8') as f:
        for line_num, line in enumerate(f, 1):
            line = line.strip()
            
            # 检测单元块开始
            if line.startswith("Begin Elements"):
                parts = line.split()
                if len(parts) >= 3:
                    current_element_type = parts[2]
                    print(f"📋 处理单元类型: {current_element_type}")
            
            # 检测单元块结束
            elif line.startswith("End Elements"):
                current_element_type = None
            
            # 处理单元定义行
            elif current_element_type and line and not line.startswith("//"):
                if re.match(r'^\d+', line):
                    parts = line.split()
                    if len(parts) >= 4:
                        element_nodes = [int(x) for x in parts[3:]]  # 跳过ID和材料ID
                        
                        if current_element_type == "SmallDisplacementElement3D4N":
                            solid_nodes.update(element_nodes)
                        elif current_element_type == "ShellThinElementCorotational3D3N":
                            shell_nodes.update(element_nodes)
                        elif current_element_type == "TrussElement3D2N":
                            truss_nodes.update(element_nodes)
    
    print(f"\n📊 节点统计:")
    print(f"  土体单元节点: {len(solid_nodes):,} 个")
    print(f"  地连墙单元节点: {len(shell_nodes):,} 个")
    print(f"  锚杆单元节点: {len(truss_nodes):,} 个")
    
    # 分析节点共享情况
    print(f"\n🔗 节点共享分析:")
    
    # 土体-地连墙共享节点
    solid_shell_shared = solid_nodes & shell_nodes
    print(f"  土体-地连墙共享节点: {len(solid_shell_shared):,} 个")
    
    # 土体-锚杆共享节点
    solid_truss_shared = solid_nodes & truss_nodes
    print(f"  土体-锚杆共享节点: {len(solid_truss_shared):,} 个")
    
    # 地连墙-锚杆共享节点
    shell_truss_shared = shell_nodes & truss_nodes
    print(f"  地连墙-锚杆共享节点: {len(shell_truss_shared):,} 个")
    
    # 三者共享节点
    all_shared = solid_nodes & shell_nodes & truss_nodes
    print(f"  三者共享节点: {len(all_shared):,} 个")
    
    print(f"\n🎯 连接关系评估:")
    
    if len(solid_shell_shared) > 0:
        print(f"  ✅ 土体-地连墙: 通过 {len(solid_shell_shared):,} 个共享节点连接")
    else:
        print(f"  ❌ 土体-地连墙: 无共享节点，需要接触或约束关系")
    
    if len(solid_truss_shared) > 0:
        print(f"  ✅ 土体-锚杆: 通过 {len(solid_truss_shared):,} 个共享节点连接")
    else:
        print(f"  ❌ 土体-锚杆: 无共享节点，需要嵌入约束")
    
    if len(shell_truss_shared) > 0:
        print(f"  ✅ 地连墙-锚杆: 通过 {len(shell_truss_shared):,} 个共享节点连接")
    else:
        print(f"  ❌ 地连墙-锚杆: 无共享节点，需要点-面约束")
    
    # 检查是否有MPC约束文件
    mpc_file = Path("temp_kratos_final/mpc_constraints.json")
    if mpc_file.exists():
        print(f"\n✅ 发现MPC约束文件: {mpc_file}")
        try:
            import json
            with open(mpc_file, 'r') as f:
                mpc_data = json.load(f)
            
            shell_anchor = mpc_data.get('shell_anchor', [])
            anchor_solid = mpc_data.get('anchor_solid', [])
            
            print(f"  地连墙-锚杆约束: {len(shell_anchor)} 个")
            print(f"  锚杆-土体约束: {len(anchor_solid)} 个")
            
        except Exception as e:
            print(f"  ⚠️ MPC文件读取失败: {e}")
    else:
        print(f"\n❌ 未发现MPC约束文件")
    
    print(f"\n💡 建议:")
    
    if len(solid_shell_shared) == 0:
        print(f"  1. 土体-地连墙需要添加接触关系或绑定约束")
    
    if len(solid_truss_shared) == 0:
        print(f"  2. 锚杆需要嵌入到土体中（embedded constraint）")
    
    if len(shell_truss_shared) == 0:
        print(f"  3. 锚杆端部需要连接到地连墙（point-to-surface constraint）")
    
    if not mpc_file.exists():
        print(f"  4. 需要生成MPC约束文件来处理非共享节点连接")
    
    return {
        'solid_nodes': len(solid_nodes),
        'shell_nodes': len(shell_nodes),
        'truss_nodes': len(truss_nodes),
        'solid_shell_shared': len(solid_shell_shared),
        'solid_truss_shared': len(solid_truss_shared),
        'shell_truss_shared': len(shell_truss_shared),
        'all_shared': len(all_shared),
        'has_mpc': mpc_file.exists()
    }

if __name__ == "__main__":
    analyze_connections()
