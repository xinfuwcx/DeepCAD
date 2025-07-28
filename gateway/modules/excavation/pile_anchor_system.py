"""
排桩-锚杆支护体系计算模块
支持根据桩型自动选择计算模式的逻辑
2号几何专家 - 优化后的支护体系
"""

import logging
from typing import Dict, Any, List, Optional
from enum import Enum
from pydantic import BaseModel

logger = logging.getLogger(__name__)

class PileType(str, Enum):
    """桩型枚举"""
    PRESSED_PILE = "pressed_pile"      # 挤压桩
    CAST_IN_PLACE = "cast_in_place"    # 灌注桩
    BORED_PILE = "bored_pile"          # 钻孔桩

class CalculationMode(str, Enum):
    """计算模式枚举"""
    BEAM_CALCULATION = "beam_calculation"    # 梁计算模式
    EQUIVALENT_SHELL = "equivalent_shell"    # 等效壳元模式

class PileSystemConfig(BaseModel):
    """排桩系统配置"""
    pile_type: PileType
    calculation_mode: CalculationMode
    auto_mode_selection: bool = True
    pile_diameter: float = 0.8          # 桩径(m)
    pile_spacing: float = 1.5           # 桩间距(m)
    pile_top_elevation: float = 0.0     # 桩顶标高(m)
    pile_bottom_elevation: float = -15.0 # 桩底标高(m)
    concrete_grade: str = "C30"         # 混凝土强度等级
    reinforcement_ratio: float = 0.8    # 配筋率(%)

class CrownBeamConfig(BaseModel):
    """冠梁配置"""
    enabled: bool = True
    width: float = 1.0                  # 宽度(m)
    height: float = 0.8                 # 高度(m)
    top_elevation: float = 0.5          # 顶面标高(m)
    concrete_grade: str = "C35"         # 混凝土强度等级

class AnchorSystemConfig(BaseModel):
    """锚杆系统配置"""
    needs_waler_beam: bool = True       # 是否需要腰梁
    anchor_length: float = 12.0         # 锚杆长度(m)
    anchor_inclination: float = 15.0    # 锚杆倾角(度)
    anchor_spacing_h: float = 2.0       # 水平间距(m)
    anchor_spacing_v: float = 3.0       # 竖向间距(m)

class PileAnchorSystemCalculator:
    """排桩-锚杆体系计算器"""
    
    def __init__(self):
        self.calculation_rules = {
            PileType.PRESSED_PILE: {
                "recommended_mode": CalculationMode.EQUIVALENT_SHELL,
                "reason": "挤压桩桩体连续性好，适合等效壳元模拟",
                "crown_beam_required": False
            },
            PileType.CAST_IN_PLACE: {
                "recommended_mode": CalculationMode.BEAM_CALCULATION,
                "reason": "灌注桩桩间需要连接，适合梁计算模式",
                "crown_beam_required": True
            },
            PileType.BORED_PILE: {
                "recommended_mode": CalculationMode.BEAM_CALCULATION,
                "reason": "钻孔桩桩间需要连接，适合梁计算模式",
                "crown_beam_required": True
            }
        }
    
    def get_recommended_calculation_mode(self, pile_type: PileType) -> Dict[str, Any]:
        """
        根据桩型获取推荐的计算模式
        
        Args:
            pile_type: 桩型
            
        Returns:
            推荐配置信息
        """
        rule = self.calculation_rules.get(pile_type)
        if not rule:
            logger.warning(f"未知桩型: {pile_type}, 使用默认配置")
            return {
                "recommended_mode": CalculationMode.BEAM_CALCULATION,
                "reason": "默认推荐梁计算模式",
                "crown_beam_required": True
            }
        
        logger.info(f"桩型 {pile_type.value} 推荐计算模式: {rule['recommended_mode'].value}")
        return rule
    
    def validate_system_configuration(self, 
                                    pile_config: PileSystemConfig,
                                    crown_beam_config: CrownBeamConfig,
                                    anchor_config: AnchorSystemConfig) -> Dict[str, Any]:
        """
        验证支护体系配置的合理性
        
        Args:
            pile_config: 排桩配置
            crown_beam_config: 冠梁配置
            anchor_config: 锚杆配置
            
        Returns:
            验证结果
        """
        validation_result = {
            "is_valid": True,
            "warnings": [],
            "errors": [],
            "recommendations": []
        }
        
        # 1. 检查桩型与计算模式匹配性
        recommended = self.get_recommended_calculation_mode(pile_config.pile_type)
        
        if pile_config.auto_mode_selection:
            if pile_config.calculation_mode != recommended["recommended_mode"]:
                validation_result["warnings"].append(
                    f"桩型 {pile_config.pile_type.value} 推荐使用 {recommended['recommended_mode'].value}，"
                    f"但当前配置为 {pile_config.calculation_mode.value}"
                )
        
        # 2. 检查冠梁配置合理性
        if pile_config.calculation_mode == CalculationMode.BEAM_CALCULATION:
            if not crown_beam_config.enabled:
                validation_result["errors"].append(
                    "梁计算模式下必须启用冠梁连接"
                )
        elif pile_config.calculation_mode == CalculationMode.EQUIVALENT_SHELL:
            if crown_beam_config.enabled:
                validation_result["warnings"].append(
                    "等效壳元模式下通常不需要冠梁，建议禁用以简化计算"
                )
        
        # 3. 检查桩间距合理性
        clear_spacing = pile_config.pile_spacing - pile_config.pile_diameter
        if clear_spacing < 0.2:
            validation_result["errors"].append(
                f"桩間净距过小 ({clear_spacing:.2f}m)，建议至少0.2m"
            )
        elif clear_spacing > 3.0:
            validation_result["warnings"].append(
                f"桩间净距较大 ({clear_spacing:.2f}m)，可能影响支护效果"
            )
        
        # 4. 检查桩长径比
        pile_length = pile_config.pile_top_elevation - pile_config.pile_bottom_elevation
        length_diameter_ratio = pile_length / pile_config.pile_diameter
        
        if length_diameter_ratio < 10:
            validation_result["warnings"].append(
                f"桩长径比较小 ({length_diameter_ratio:.1f})，可能影响承载力"
            )
        elif length_diameter_ratio > 50:
            validation_result["warnings"].append(
                f"桩长径比过大 ({length_diameter_ratio:.1f})，可能需要考虑压屈稳定性"
            )
        
        # 5. 检查锚杆配置
        if anchor_config.needs_waler_beam:
            validation_result["recommendations"].append(
                "排桩-锚杆体系需要腰梁来分配锚杆荷载"
            )
        
        # 更新总体验证状态
        validation_result["is_valid"] = len(validation_result["errors"]) == 0
        
        logger.info(f"支护体系配置验证完成: {'通过' if validation_result['is_valid'] else '失败'}")
        return validation_result
    
    def generate_calculation_parameters(self,
                                      pile_config: PileSystemConfig,
                                      crown_beam_config: CrownBeamConfig,
                                      anchor_config: AnchorSystemConfig) -> Dict[str, Any]:
        """
        生成用于有限元计算的参数
        
        Args:
            pile_config: 排桩配置
            crown_beam_config: 冠梁配置
            anchor_config: 锚杆配置
            
        Returns:
            计算参数字典
        """
        calc_params = {
            "pile_system": {
                "calculation_mode": pile_config.calculation_mode.value,
                "element_type": "beam" if pile_config.calculation_mode == CalculationMode.BEAM_CALCULATION else "shell",
                "pile_diameter": pile_config.pile_diameter,
                "pile_spacing": pile_config.pile_spacing,
                "pile_length": pile_config.pile_top_elevation - pile_config.pile_bottom_elevation,
                "material_properties": {
                    "concrete_grade": pile_config.concrete_grade,
                    "elastic_modulus": self._get_concrete_elastic_modulus(pile_config.concrete_grade),
                    "poisson_ratio": 0.2,
                    "density": 2500  # kg/m³
                }
            },
            "crown_beam": {
                "enabled": crown_beam_config.enabled,
                "cross_section": {
                    "width": crown_beam_config.width,
                    "height": crown_beam_config.height,
                    "area": crown_beam_config.width * crown_beam_config.height
                },
                "material_properties": {
                    "concrete_grade": crown_beam_config.concrete_grade,
                    "elastic_modulus": self._get_concrete_elastic_modulus(crown_beam_config.concrete_grade)
                }
            } if crown_beam_config.enabled else None,
            "anchor_system": {
                "needs_waler_beam": anchor_config.needs_waler_beam,
                "anchor_geometry": {
                    "length": anchor_config.anchor_length,
                    "inclination": anchor_config.anchor_inclination,
                    "spacing_horizontal": anchor_config.anchor_spacing_h,
                    "spacing_vertical": anchor_config.anchor_spacing_v
                }
            }
        }
        
        logger.info(f"生成计算参数: {pile_config.calculation_mode.value} 模式")
        return calc_params
    
    def _get_concrete_elastic_modulus(self, concrete_grade: str) -> float:
        """根据混凝土强度等级获取弹性模量"""
        grade_modulus = {
            "C25": 28000,  # MPa
            "C30": 30000,
            "C35": 31500,
            "C40": 32500,
            "C45": 33500
        }
        return grade_modulus.get(concrete_grade, 30000)

# 全局计算器实例
pile_anchor_calculator = PileAnchorSystemCalculator()

# 示例使用
def example_usage():
    """示例用法"""
    # 创建配置
    pile_config = PileSystemConfig(
        pile_type=PileType.PRESSED_PILE,
        calculation_mode=CalculationMode.EQUIVALENT_SHELL,
        auto_mode_selection=True
    )
    
    crown_beam_config = CrownBeamConfig(
        enabled=False  # 挤压桩+等效壳元模式不需要冠梁
    )
    
    anchor_config = AnchorSystemConfig(
        needs_waler_beam=True
    )
    
    # 验证配置
    validation = pile_anchor_calculator.validate_system_configuration(
        pile_config, crown_beam_config, anchor_config
    )
    
    print("验证结果:", validation)
    
    # 生成计算参数
    if validation["is_valid"]:
        calc_params = pile_anchor_calculator.generate_calculation_parameters(
            pile_config, crown_beam_config, anchor_config
        )
        print("计算参数:", calc_params)

if __name__ == "__main__":
    example_usage()