#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
地应力平衡求解器 - 专门针对两阶段-全锚杆-摩尔库伦.fpn项目

实现功能：
1. K0法初始应力场计算
2. 重力荷载平衡
3. 多层土体应力分布
4. 预应力锚杆系统集成
5. Kratos求解器接口
"""

import numpy as np
import json
from typing import Dict, List, Any, Tuple
from dataclasses import dataclass

@dataclass
class SoilLayer:
    """土层参数"""
    id: int
    name: str
    top_elevation: float
    bottom_elevation: float
    unit_weight: float  # kN/m³
    cohesion: float     # kPa
    friction_angle: float  # degrees
    young_modulus: float   # kPa
    poisson_ratio: float
    
    @property
    def k0(self) -> float:
        """Jaky公式计算K0系数"""
        phi_rad = np.radians(self.friction_angle)
        return 1 - np.sin(phi_rad)
    
    @property
    def dilatancy_angle(self) -> float:
        """剪胀角（经验公式：φ-30°或φ/3）"""
        return max(0, self.friction_angle - 30)

class GeostressEquilibriumSolver:
    """地应力平衡求解器"""
    
    def __init__(self):
        self.soil_layers = self._define_soil_layers()
        self.anchor_system = self._define_anchor_system()
        
    def _define_soil_layers(self) -> List[SoilLayer]:
        """定义土层参数（基于FPN文件分析）"""
        return [
            SoilLayer(2, '细砂', 0, -2, 20.0, 0, 20, 15000, 0.3),
            SoilLayer(3, '粉质粘土1', -2, -5, 19.5, 26, 9, 5000, 0.3),
            SoilLayer(4, '粉质粘土2', -5, -10, 19.1, 24, 10, 5000, 0.3),
            SoilLayer(5, '粉质粘土3', -10, -15, 20.8, 22, 13, 5000, 0.3),
            SoilLayer(6, '砂岩1', -15, -20, 19.5, 0, 21, 40000, 0.3),
            SoilLayer(7, '粉质粘土4', -20, -25, 20.8, 14, 25, 8000, 0.3),
            SoilLayer(8, '粉质粘土5', -25, -30, 20.7, 20.7, 20.5, 9000, 0.3),
            SoilLayer(9, '地方性粘土', -30, -35, 20.2, 23, 14, 9000, 0.3),
            SoilLayer(10, '砂岩2', -35, -50, 21.0, 0, 35, 40000, 0.3),
            SoilLayer(11, '粉质粘土6', -50, -60, 20.2, 24, 17, 12000, 0.3),
            SoilLayer(12, '细砂2', -60, -80, 20.3, 0, 26, 20000, 0.3)
        ]
    
    def _define_anchor_system(self) -> Dict[str, Any]:
        """定义锚杆系统参数"""
        return {
            'material': {
                'name': '钢材',
                'young_modulus': 206000000,  # kPa
                'density': 78.5,  # kN/m³
                'yield_strength': 400000,  # kPa
                'cross_area': 0.001  # m²
            },
            'prestress_forces': [345, 360, 450, 670, 640, 550],  # kN
            'anchor_length': 15.0,  # m (估算)
            'anchor_angle': 15.0,   # degrees (下倾角)
            'anchor_count': 120
        }
    
    def calculate_initial_stress_field(self, nodes: List[Dict[str, Any]], 
                                     ground_level: float = 0.0) -> Tuple[np.ndarray, Dict[str, Any]]:
        """计算初始应力场"""
        print('\n🌍 计算地应力平衡初始应力场')
        print('=' * 60)
        
        n_nodes = len(nodes)
        stress_field = np.zeros((n_nodes, 6))  # [σxx, σyy, σzz, τxy, τyz, τzx]
        displacement_field = np.zeros((n_nodes, 3))  # [ux, uy, uz]
        
        stress_statistics = {
            'max_vertical_stress': 0,
            'max_horizontal_stress': 0,
            'average_k0': 0,
            'stress_distribution': []
        }
        
        k0_values = []
        
        for i, node in enumerate(nodes):
            x, y, z = node['x'], node['y'], node['z']
            depth = max(0, ground_level - z)
            
            # 获取当前深度的土层
            soil_layer = self._get_soil_layer_by_depth(depth)
            
            if soil_layer:
                # 垂直有效应力（累积计算）
                sigma_v = self._calculate_vertical_stress(depth)
                
                # 水平有效应力
                K0 = soil_layer.k0
                sigma_h = K0 * sigma_v
                
                # 应力张量 [σxx, σyy, σzz, τxy, τyz, τzx]
                stress_field[i] = [sigma_h, sigma_h, sigma_v, 0, 0, 0]
                
                # 初始位移（考虑重力压缩）
                if soil_layer.young_modulus > 0:
                    vertical_strain = sigma_v / (soil_layer.young_modulus * 1000)
                    lateral_strain = soil_layer.poisson_ratio * vertical_strain
                    
                    displacement_field[i] = [
                        lateral_strain * x * 0.001,  # 微小侧向位移
                        lateral_strain * y * 0.001,
                        -vertical_strain * depth * 0.01  # 垂直压缩
                    ]
                
                k0_values.append(K0)
                
                # 统计信息
                stress_statistics['max_vertical_stress'] = max(stress_statistics['max_vertical_stress'], sigma_v)
                stress_statistics['max_horizontal_stress'] = max(stress_statistics['max_horizontal_stress'], sigma_h)
                
                if i % 5000 == 0:  # 每5000个节点输出一次
                    print(f'节点{i:6d}: 深度={depth:5.1f}m, 土层={soil_layer.name:8s}, '
                          f'σv={sigma_v/1000:6.1f}kPa, σh={sigma_h/1000:6.1f}kPa, K0={K0:.3f}')
        
        stress_statistics['average_k0'] = np.mean(k0_values) if k0_values else 0
        
        print(f'\n📊 应力场统计:')
        print(f'  最大垂直应力: {stress_statistics["max_vertical_stress"]/1000:.1f} kPa')
        print(f'  最大水平应力: {stress_statistics["max_horizontal_stress"]/1000:.1f} kPa')
        print(f'  平均K0系数: {stress_statistics["average_k0"]:.3f}')
        
        return stress_field, displacement_field, stress_statistics
    
    def _get_soil_layer_by_depth(self, depth: float) -> SoilLayer:
        """根据深度获取土层"""
        for layer in self.soil_layers:
            if layer.top_elevation >= -depth >= layer.bottom_elevation:
                return layer
        # 默认返回最深层
        return self.soil_layers[-1]
    
    def _calculate_vertical_stress(self, depth: float) -> float:
        """计算垂直应力（分层累积）"""
        sigma_v = 0.0
        current_depth = 0.0
        
        for layer in self.soil_layers:
            layer_top = -layer.top_elevation
            layer_bottom = -layer.bottom_elevation
            
            if depth > layer_top:
                # 穿过此土层
                layer_thickness = min(depth - layer_top, layer_bottom - layer_top)
                sigma_v += layer_thickness * layer.unit_weight * 1000  # Pa
                current_depth += layer_thickness
                
                if current_depth >= depth:
                    break
        
        return sigma_v
    
    def generate_kratos_initial_conditions(self, nodes: List[Dict[str, Any]]) -> Dict[str, Any]:
        """生成Kratos初始条件配置"""
        stress_field, displacement_field, stats = self.calculate_initial_stress_field(nodes)
        
        return {
            "initial_conditions_process_list": [
                {
                    "python_module": "assign_vector_variable_process",
                    "kratos_module": "KratosMultiphysics",
                    "process_name": "AssignVectorVariableProcess",
                    "Parameters": {
                        "model_part_name": "Structure",
                        "variable_name": "DISPLACEMENT",
                        "value": displacement_field.tolist(),
                        "interval": [0.0, 0.0]
                    }
                },
                {
                    "python_module": "assign_vector_variable_process", 
                    "kratos_module": "KratosMultiphysics.StructuralMechanicsApplication",
                    "process_name": "AssignVectorVariableProcess",
                    "Parameters": {
                        "model_part_name": "Structure",
                        "variable_name": "CAUCHY_STRESS_VECTOR",
                        "value": stress_field.tolist(),
                        "interval": [0.0, 0.0]
                    }
                }
            ],
            "stress_statistics": stats
        }

def main():
    """主函数"""
    print('🏗️ 地应力平衡求解器 - 两阶段全锚杆摩尔库伦项目')
    print('=' * 80)
    
    # 创建求解器
    solver = GeostressEquilibriumSolver()
    
    # 显示土层信息
    print('\n📋 土层参数表:')
    print('-' * 80)
    print(f'{"ID":>2} {"土层名称":>12} {"顶标高":>8} {"底标高":>8} {"重度":>8} {"粘聚力":>8} {"摩擦角":>8} {"K0":>6}')
    print('-' * 80)
    
    for layer in solver.soil_layers:
        print(f'{layer.id:2d} {layer.name:>12} {layer.top_elevation:8.1f} {layer.bottom_elevation:8.1f} '
              f'{layer.unit_weight:8.1f} {layer.cohesion:8.1f} {layer.friction_angle:8.1f} {layer.k0:6.3f}')
    
    # 显示锚杆系统
    print(f'\n⚓ 锚杆系统参数:')
    anchor = solver.anchor_system
    print(f'  材料: {anchor["material"]["name"]} (E={anchor["material"]["young_modulus"]/1e6:.0f}GPa)')
    print(f'  预应力: {anchor["prestress_forces"]} kN')
    print(f'  数量: {anchor["anchor_count"]}根')
    print(f'  长度: {anchor["anchor_length"]}m')
    print(f'  倾角: {anchor["anchor_angle"]}°')
    
    # 模拟节点数据进行测试
    test_nodes = [
        {'x': 0, 'y': 0, 'z': z} for z in np.linspace(0, -50, 11)
    ]
    
    # 计算初始条件
    initial_conditions = solver.generate_kratos_initial_conditions(test_nodes)
    
    # 保存配置
    with open('geostress_equilibrium_config.json', 'w', encoding='utf-8') as f:
        json.dump({
            'soil_layers': [
                {
                    'id': layer.id,
                    'name': layer.name,
                    'top_elevation': layer.top_elevation,
                    'bottom_elevation': layer.bottom_elevation,
                    'unit_weight': layer.unit_weight,
                    'cohesion': layer.cohesion,
                    'friction_angle': layer.friction_angle,
                    'young_modulus': layer.young_modulus,
                    'poisson_ratio': layer.poisson_ratio,
                    'k0': layer.k0,
                    'dilatancy_angle': layer.dilatancy_angle
                } for layer in solver.soil_layers
            ],
            'anchor_system': solver.anchor_system,
            'initial_conditions': initial_conditions
        }, f, ensure_ascii=False, indent=2)
    
    print('\n✅ 地应力平衡配置生成完成!')
    print('📁 保存文件: geostress_equilibrium_config.json')

if __name__ == '__main__':
    main()
