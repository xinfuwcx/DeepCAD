#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DeepCAD增强桩基计算引擎 - 基于2号专家修正的桩基分类
3号计算专家 - 计算系统集成修正

根据2号几何专家的桩基建模策略修正，实现差异化计算：
- 置换型桩基（梁元）：承载力分析 + 桩-土相互作用
- 挤密型桩基（壳元）：土体改良效应 + 复合地基计算
"""

import numpy as np
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, field
from enum import Enum
import logging

# 桩基类型枚举（与2号专家保持一致）
class PileType(Enum):
    BORED_CAST_IN_PLACE = 'BORED_CAST_IN_PLACE'     # 钻孔灌注桩
    HAND_DUG = 'HAND_DUG'                           # 人工挖孔桩  
    PRECAST_DRIVEN = 'PRECAST_DRIVEN'               # 预制桩
    SWM_METHOD = 'SWM_METHOD'                       # SWM工法桩（搅拌桩）
    CFG_PILE = 'CFG_PILE'                           # CFG桩
    HIGH_PRESSURE_JET = 'HIGH_PRESSURE_JET'          # 高压旋喷桩

class PileModelingStrategy(Enum):
    BEAM_ELEMENT = 'BEAM_ELEMENT'    # 梁元模拟
    SHELL_ELEMENT = 'SHELL_ELEMENT'  # 壳元模拟

@dataclass
class PileGeometry:
    """桩基几何参数"""
    diameter: float          # 桩径 (m)
    length: float           # 桩长 (m)
    pile_type: PileType     # 桩基类型
    modeling_strategy: PileModelingStrategy  # 建模策略
    
    # 置换型桩基参数
    concrete_grade: Optional[str] = None      # 混凝土标号
    reinforcement_ratio: Optional[float] = None  # 配筋率
    
    # 挤密型桩基参数
    improvement_diameter: Optional[float] = None  # 改良直径
    cement_content: Optional[float] = None        # 水泥掺入比
    compaction_ratio: Optional[float] = None      # 挤密比

@dataclass
class SoilLayer:
    """土层参数"""
    depth_top: float        # 层顶深度 (m)
    depth_bottom: float     # 层底深度 (m)
    unit_weight: float      # 重度 (kN/m³)
    cohesion: float         # 粘聚力 (kPa)
    friction_angle: float   # 内摩擦角 (°)
    compression_modulus: float  # 压缩模量 (MPa)
    
    # 挤密改良后参数
    improved_cohesion: Optional[float] = None
    improved_friction_angle: Optional[float] = None
    improved_modulus: Optional[float] = None

@dataclass
class PileCalculationResult:
    """桩基计算结果"""
    pile_id: str
    pile_type: PileType
    modeling_strategy: PileModelingStrategy
    
    # 承载力计算结果
    ultimate_capacity: float      # 极限承载力 (kN)
    allowable_capacity: float     # 允许承载力 (kN)
    side_resistance: float        # 侧阻力 (kN)
    tip_resistance: float         # 端阻力 (kN)
    
    # 变形计算结果
    settlement: float            # 沉降量 (mm)
    elastic_shortening: float    # 弹性压缩量 (mm)
    
    # 挤密型桩基特有结果
    improvement_effect: Optional[Dict[str, float]] = None  # 改良效果
    composite_foundation_capacity: Optional[float] = None  # 复合地基承载力

class EnhancedPileCalculationEngine:
    """增强桩基计算引擎"""
    
    def __init__(self):
        self.logger = logging.getLogger(f"{__name__}.PileCalculationEngine")
        
        # 桩基类型到建模策略的映射（与2号专家一致）
        self.pile_type_strategies = {
            # 置换型桩基 → 梁元模拟
            PileType.BORED_CAST_IN_PLACE: PileModelingStrategy.BEAM_ELEMENT,
            PileType.HAND_DUG: PileModelingStrategy.BEAM_ELEMENT,
            PileType.PRECAST_DRIVEN: PileModelingStrategy.BEAM_ELEMENT,
            
            # 挤密型桩基 → 壳元模拟
            PileType.SWM_METHOD: PileModelingStrategy.SHELL_ELEMENT,
            PileType.CFG_PILE: PileModelingStrategy.SHELL_ELEMENT,
            PileType.HIGH_PRESSURE_JET: PileModelingStrategy.SHELL_ELEMENT
        }
        
        # 不同桩基类型的计算系数
        self.pile_calculation_coefficients = {
            PileType.BORED_CAST_IN_PLACE: {
                'side_friction_factor': 0.6,    # 侧阻系数
                'tip_bearing_factor': 4.0,      # 端阻系数
                'safety_factor': 2.0             # 安全系数
            },
            PileType.HAND_DUG: {
                'side_friction_factor': 0.7,
                'tip_bearing_factor': 4.5,
                'safety_factor': 2.0
            },
            PileType.PRECAST_DRIVEN: {
                'side_friction_factor': 0.8,
                'tip_bearing_factor': 5.0,
                'safety_factor': 2.5
            },
            PileType.SWM_METHOD: {
                'improvement_factor': 1.5,       # 土体改良系数
                'composite_ratio': 0.15,         # 置换率
                'safety_factor': 2.0
            },
            PileType.CFG_PILE: {
                'improvement_factor': 2.0,
                'composite_ratio': 0.12,
                'safety_factor': 2.0
            },
            PileType.HIGH_PRESSURE_JET: {
                'improvement_factor': 2.5,
                'composite_ratio': 0.20,
                'safety_factor': 2.0
            }
        }
    
    def calculate_single_pile(
        self, 
        pile: PileGeometry, 
        soil_layers: List[SoilLayer],
        pile_id: str = "PILE_001"
    ) -> PileCalculationResult:
        """计算单桩承载力 - 差异化策略"""
        
        self.logger.info(f"开始计算桩基 {pile_id} - 类型: {pile.pile_type.value}")
        
        # 根据桩基类型选择计算策略
        if pile.modeling_strategy == PileModelingStrategy.BEAM_ELEMENT:
            return self._calculate_displacement_pile(pile, soil_layers, pile_id)
        else:
            return self._calculate_compacting_pile(pile, soil_layers, pile_id)
    
    def _calculate_displacement_pile(
        self, 
        pile: PileGeometry, 
        soil_layers: List[SoilLayer],
        pile_id: str
    ) -> PileCalculationResult:
        """置换型桩基计算（梁元策略）"""
        
        self.logger.info(f"执行置换型桩基计算 - {pile.pile_type.value}")
        
        coeffs = self.pile_calculation_coefficients[pile.pile_type]
        
        # 1. 侧阻力计算
        side_resistance = 0.0
        pile_perimeter = np.pi * pile.diameter
        
        for layer in soil_layers:
            if layer.depth_top >= pile.length:
                break
                
            effective_length = min(layer.depth_bottom, pile.length) - layer.depth_top
            if effective_length <= 0:
                continue
            
            # 考虑土层特性的侧阻力
            layer_side_resistance = (
                pile_perimeter * effective_length * 
                coeffs['side_friction_factor'] * 
                (layer.cohesion + layer.unit_weight * layer.depth_top * np.tan(np.radians(layer.friction_angle)))
            )
            side_resistance += layer_side_resistance
        
        # 2. 端阻力计算
        tip_area = np.pi * (pile.diameter / 2) ** 2
        bottom_layer = None
        for layer in soil_layers:
            if layer.depth_top <= pile.length <= layer.depth_bottom:
                bottom_layer = layer
                break
        
        if bottom_layer:
            tip_resistance = (
                tip_area * coeffs['tip_bearing_factor'] * 
                (bottom_layer.cohesion + bottom_layer.unit_weight * pile.length * 
                 np.tan(np.radians(bottom_layer.friction_angle)))
            )
        else:
            tip_resistance = tip_area * 200  # 默认端阻力 200kPa
        
        # 3. 极限承载力和允许承载力
        ultimate_capacity = side_resistance + tip_resistance
        allowable_capacity = ultimate_capacity / coeffs['safety_factor']
        
        # 4. 沉降计算（简化）
        settlement = self._calculate_pile_settlement(pile, soil_layers, allowable_capacity)
        elastic_shortening = allowable_capacity * pile.length / (
            pile.concrete_grade and 30000 or 25000
        ) / tip_area  # 简化弹性压缩
        
        return PileCalculationResult(
            pile_id=pile_id,
            pile_type=pile.pile_type,
            modeling_strategy=pile.modeling_strategy,
            ultimate_capacity=ultimate_capacity,
            allowable_capacity=allowable_capacity,
            side_resistance=side_resistance,
            tip_resistance=tip_resistance,
            settlement=settlement,
            elastic_shortening=elastic_shortening
        )
    
    def _calculate_compacting_pile(
        self, 
        pile: PileGeometry, 
        soil_layers: List[SoilLayer],
        pile_id: str
    ) -> PileCalculationResult:
        """挤密型桩基计算（壳元策略）"""
        
        self.logger.info(f"执行挤密型桩基计算 - {pile.pile_type.value}")
        
        coeffs = self.pile_calculation_coefficients[pile.pile_type]
        
        # 1. 土体改良效应计算
        improvement_diameter = pile.improvement_diameter or pile.diameter * 1.5
        improvement_effect = {}
        
        improved_layers = []
        for layer in soil_layers:
            if layer.depth_top >= pile.length:
                improved_layers.append(layer)
                continue
                
            # 土体改良参数计算
            improved_layer = SoilLayer(
                depth_top=layer.depth_top,
                depth_bottom=layer.depth_bottom,
                unit_weight=layer.unit_weight,
                cohesion=layer.cohesion,
                friction_angle=layer.friction_angle,
                compression_modulus=layer.compression_modulus
            )
            
            # 应用改良系数
            improved_layer.improved_cohesion = layer.cohesion * coeffs['improvement_factor']
            improved_layer.improved_friction_angle = min(45, layer.friction_angle * 1.2)
            improved_layer.improved_modulus = layer.compression_modulus * coeffs['improvement_factor']
            
            improved_layers.append(improved_layer)
            
            # 记录改良效果
            improvement_effect[f"layer_{layer.depth_top}_{layer.depth_bottom}"] = {
                'cohesion_improvement': (improved_layer.improved_cohesion - layer.cohesion) / layer.cohesion * 100,
                'friction_angle_improvement': improved_layer.improved_friction_angle - layer.friction_angle,
                'modulus_improvement': (improved_layer.improved_modulus - layer.compression_modulus) / layer.compression_modulus * 100
            }
        
        # 2. 复合地基承载力计算
        pile_area = np.pi * (pile.diameter / 2) ** 2
        improvement_area = np.pi * (improvement_diameter / 2) ** 2
        composite_ratio = coeffs['composite_ratio']
        
        # 桩身强度贡献
        pile_strength = 0
        if pile.pile_type == PileType.CFG_PILE:
            pile_strength = 5000  # CFG桩强度 5MPa
        elif pile.pile_type == PileType.SWM_METHOD:
            pile_strength = 2000  # 搅拌桩强度 2MPa
        elif pile.pile_type == PileType.HIGH_PRESSURE_JET:
            pile_strength = 8000  # 高压旋喷桩强度 8MPa
        
        pile_capacity = pile_area * pile_strength
        
        # 改良土体强度贡献
        improved_soil_capacity = 0
        for layer in improved_layers:
            if layer.depth_top >= pile.length:
                break
                
            effective_length = min(layer.depth_bottom, pile.length) - layer.depth_top
            if effective_length <= 0:
                continue
            
            layer_capacity = (
                improvement_area * effective_length * 
                (layer.improved_cohesion or layer.cohesion) * 
                coeffs['improvement_factor']
            )
            improved_soil_capacity += layer_capacity
        
        # 复合地基总承载力
        composite_foundation_capacity = (
            composite_ratio * pile_capacity + 
            (1 - composite_ratio) * improved_soil_capacity
        )
        
        ultimate_capacity = composite_foundation_capacity
        allowable_capacity = ultimate_capacity / coeffs['safety_factor']
        
        # 3. 变形计算
        settlement = self._calculate_composite_foundation_settlement(
            pile, improved_layers, allowable_capacity
        )
        
        return PileCalculationResult(
            pile_id=pile_id,
            pile_type=pile.pile_type,
            modeling_strategy=pile.modeling_strategy,
            ultimate_capacity=ultimate_capacity,
            allowable_capacity=allowable_capacity,
            side_resistance=0,  # 挤密桩不计算侧阻
            tip_resistance=pile_capacity,  # 桩身强度作为端阻
            settlement=settlement,
            elastic_shortening=0,  # 挤密桩弹性压缩很小
            improvement_effect=improvement_effect,
            composite_foundation_capacity=composite_foundation_capacity
        )
    
    def _calculate_pile_settlement(
        self, 
        pile: PileGeometry, 
        soil_layers: List[SoilLayer], 
        load: float
    ) -> float:
        """置换型桩基沉降计算"""
        
        settlement = 0.0
        pile_area = np.pi * (pile.diameter / 2) ** 2
        stress = load / pile_area
        
        for layer in soil_layers:
            if layer.depth_top >= pile.length * 2:  # 影响深度为桩长的2倍
                break
                
            effective_length = min(layer.depth_bottom, pile.length * 2) - max(layer.depth_top, pile.length)
            if effective_length <= 0:
                continue
            
            # 应力扩散计算
            depth_factor = max(0.1, 1.0 - (layer.depth_top - pile.length) / pile.length)
            layer_stress = stress * depth_factor
            
            # 分层总和法计算沉降
            layer_settlement = (
                layer_stress * effective_length * 1000 / 
                (layer.compression_modulus * 1000)  # 转换单位
            )
            settlement += layer_settlement
        
        return settlement  # mm
    
    def _calculate_composite_foundation_settlement(
        self, 
        pile: PileGeometry, 
        improved_layers: List[SoilLayer], 
        load: float
    ) -> float:
        """复合地基沉降计算"""
        
        settlement = 0.0
        influence_area = np.pi * ((pile.improvement_diameter or pile.diameter * 1.5) / 2) ** 2
        stress = load / influence_area
        
        for layer in improved_layers:
            if layer.depth_top >= pile.length * 1.5:  # 复合地基影响深度
                break
                
            effective_length = min(layer.depth_bottom, pile.length * 1.5) - layer.depth_top
            if effective_length <= 0:
                continue
            
            # 使用改良后的模量
            modulus = layer.improved_modulus or layer.compression_modulus
            layer_settlement = stress * effective_length * 1000 / (modulus * 1000)
            settlement += layer_settlement
        
        return settlement * 0.7  # 复合地基沉降折减系数
    
    def batch_calculate_piles(
        self, 
        piles: List[Tuple[PileGeometry, str]], 
        soil_layers: List[SoilLayer]
    ) -> List[PileCalculationResult]:
        """批量计算桩基承载力"""
        
        results = []
        beam_element_count = 0
        shell_element_count = 0
        
        for pile_geometry, pile_id in piles:
            try:
                result = self.calculate_single_pile(pile_geometry, soil_layers, pile_id)
                results.append(result)
                
                if result.modeling_strategy == PileModelingStrategy.BEAM_ELEMENT:
                    beam_element_count += 1
                else:
                    shell_element_count += 1
                    
            except Exception as e:
                self.logger.error(f"桩基 {pile_id} 计算失败: {e}")
                continue
        
        self.logger.info(f"批量计算完成 - 梁元桩基: {beam_element_count}个, 壳元桩基: {shell_element_count}个")
        return results
    
    def generate_calculation_report(
        self, 
        results: List[PileCalculationResult]
    ) -> Dict[str, Any]:
        """生成计算报告"""
        
        beam_element_results = [r for r in results if r.modeling_strategy == PileModelingStrategy.BEAM_ELEMENT]
        shell_element_results = [r for r in results if r.modeling_strategy == PileModelingStrategy.SHELL_ELEMENT]
        
        report = {
            "calculation_summary": {
                "total_piles": len(results),
                "beam_element_piles": len(beam_element_results),
                "shell_element_piles": len(shell_element_results)
            },
            "beam_element_analysis": {
                "pile_types": list(set([r.pile_type.value for r in beam_element_results])),
                "average_capacity": np.mean([r.allowable_capacity for r in beam_element_results]) if beam_element_results else 0,
                "average_settlement": np.mean([r.settlement for r in beam_element_results]) if beam_element_results else 0
            },
            "shell_element_analysis": {
                "pile_types": list(set([r.pile_type.value for r in shell_element_results])),
                "average_composite_capacity": np.mean([r.composite_foundation_capacity or 0 for r in shell_element_results]) if shell_element_results else 0,
                "improvement_effectiveness": self._analyze_improvement_effectiveness(shell_element_results)
            },
            "detailed_results": [
                {
                    "pile_id": r.pile_id,
                    "pile_type": r.pile_type.value,
                    "modeling_strategy": r.modeling_strategy.value,
                    "allowable_capacity": r.allowable_capacity,
                    "settlement": r.settlement,
                    "improvement_effect": r.improvement_effect
                }
                for r in results
            ]
        }
        
        return report
    
    def _analyze_improvement_effectiveness(
        self, 
        shell_results: List[PileCalculationResult]
    ) -> Dict[str, float]:
        """分析土体改良效果"""
        
        if not shell_results:
            return {}
        
        total_cohesion_improvement = 0
        total_friction_improvement = 0
        total_modulus_improvement = 0
        improvement_count = 0
        
        for result in shell_results:
            if result.improvement_effect:
                for layer_effect in result.improvement_effect.values():
                    total_cohesion_improvement += layer_effect['cohesion_improvement']  
                    total_friction_improvement += layer_effect['friction_angle_improvement']
                    total_modulus_improvement += layer_effect['modulus_improvement']
                    improvement_count += 1
        
        if improvement_count == 0:
            return {}
        
        return {
            "average_cohesion_improvement": total_cohesion_improvement / improvement_count,
            "average_friction_improvement": total_friction_improvement / improvement_count, 
            "average_modulus_improvement": total_modulus_improvement / improvement_count
        }

# 与前端接口集成
def integrate_with_geometry_system(pile_data_from_frontend: Dict[str, Any]) -> PileCalculationResult:
    """与几何系统集成的接口函数"""
    
    # 解析前端传来的桩基数据
    pile_type = PileType(pile_data_from_frontend['properties']['pileType'])
    
    pile_geometry = PileGeometry(
        diameter=pile_data_from_frontend['diameter'],
        length=pile_data_from_frontend['length'],
        pile_type=pile_type,
        modeling_strategy=PileModelingStrategy(pile_data_from_frontend['properties'].get('pileModeling', {}).get('strategy', 'BEAM_ELEMENT'))
    )
    
    # 解析土层数据
    soil_layers = [
        SoilLayer(
            depth_top=layer['depth_top'],
            depth_bottom=layer['depth_bottom'],
            unit_weight=layer['unit_weight'],
            cohesion=layer['cohesion'],
            friction_angle=layer['friction_angle'],
            compression_modulus=layer['compression_modulus']
        )
        for layer in pile_data_from_frontend['soil_layers']
    ]
    
    # 执行计算
    engine = EnhancedPileCalculationEngine()
    result = engine.calculate_single_pile(
        pile_geometry, 
        soil_layers, 
        pile_data_from_frontend['pile_id']
    )
    
    return result

if __name__ == "__main__":
    # 测试示例
    logging.basicConfig(level=logging.INFO)
    
    # 创建测试数据
    test_piles = [
        (PileGeometry(
            diameter=0.8,
            length=25.0,
            pile_type=PileType.BORED_CAST_IN_PLACE,
            modeling_strategy=PileModelingStrategy.BEAM_ELEMENT
        ), "PILE_001"),
        
        (PileGeometry(
            diameter=0.6,
            length=15.0,
            pile_type=PileType.CFG_PILE,
            modeling_strategy=PileModelingStrategy.SHELL_ELEMENT,
            improvement_diameter=1.2
        ), "PILE_002")
    ]
    
    test_soil_layers = [
        SoilLayer(0, 5, 18.0, 15, 10, 8),      # 填土层
        SoilLayer(5, 15, 19.5, 25, 18, 12),   # 粘土层
        SoilLayer(15, 30, 20.0, 35, 22, 18)   # 砂土层
    ]
    
    # 执行计算
    engine = EnhancedPileCalculationEngine()
    results = engine.batch_calculate_piles(test_piles, test_soil_layers)
    
    # 生成报告
    report = engine.generate_calculation_report(results)
    
    print("=== 桩基计算结果 ===")
    for result in results:
        print(f"桩基ID: {result.pile_id}")
        print(f"类型: {result.pile_type.value}")
        print(f"建模策略: {result.modeling_strategy.value}")
        print(f"允许承载力: {result.allowable_capacity:.1f} kN")
        print(f"沉降量: {result.settlement:.1f} mm")
        if result.composite_foundation_capacity:
            print(f"复合地基承载力: {result.composite_foundation_capacity:.1f} kN")
        print("-" * 40)