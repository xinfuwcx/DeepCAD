import numpy as np
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Union, Tuple
import logging

# 配置日志
logger = logging.getLogger("MaterialModels")

class MaterialModel(ABC):
    """材料模型基类"""
    
    @abstractmethod
    def get_kratos_properties(self) -> Dict:
        """返回Kratos材料属性字典"""
        pass
    
    @abstractmethod
    def validate_parameters(self) -> bool:
        """验证参数合理性"""
        pass
    
    def get_shear_modulus(self) -> float:
        """计算剪切模量 G"""
        if hasattr(self, "young_modulus") and hasattr(self, "poisson_ratio"):
            return self.young_modulus / (2 * (1 + self.poisson_ratio))
        return 0.0
    
    def get_bulk_modulus(self) -> float:
        """计算体积模量 K"""
        if hasattr(self, "young_modulus") and hasattr(self, "poisson_ratio"):
            return self.young_modulus / (3 * (1 - 2 * self.poisson_ratio))
        return 0.0
    
    def get_lame_parameters(self) -> Tuple[float, float]:
        """计算拉梅参数 lambda 和 mu"""
        if hasattr(self, "young_modulus") and hasattr(self, "poisson_ratio"):
            mu = self.get_shear_modulus()
            lmbda = self.young_modulus * self.poisson_ratio / ((1 + self.poisson_ratio) * (1 - 2 * self.poisson_ratio))
            return (lmbda, mu)
        return (0.0, 0.0)

class ElasticModel(MaterialModel):
    """线性弹性模型"""
    
    def __init__(self, young_modulus: float, poisson_ratio: float, density: float = 2000.0):
        self.young_modulus = young_modulus
        self.poisson_ratio = poisson_ratio
        self.density = density
        
    def get_kratos_properties(self) -> Dict:
        return {
            "YOUNG_MODULUS": self.young_modulus,
            "POISSON_RATIO": self.poisson_ratio,
            "DENSITY": self.density,
            "CONSTITUTIVE_LAW": "LinearElasticPlaneStrain2DLaw"
        }
    
    def validate_parameters(self) -> bool:
        # 验证参数合理性
        if self.young_modulus <= 0:
            logger.error(f"弹性模量必须为正值: {self.young_modulus}")
            return False
        if self.poisson_ratio < -1.0 or self.poisson_ratio > 0.5:
            logger.error(f"泊松比范围错误: {self.poisson_ratio}")
            return False
        if self.density <= 0:
            logger.error(f"密度必须为正值: {self.density}")
            return False
        return True

class MohrCoulombModel(MaterialModel):
    """莫尔-库伦模型"""
    
    def __init__(self, 
                 cohesion: float, 
                 friction_angle: float, 
                 dilatancy_angle: float,
                 young_modulus: float,
                 poisson_ratio: float,
                 density: float = 2000.0,
                 tension_cutoff: bool = True):
        self.cohesion = cohesion
        self.friction_angle = friction_angle
        self.dilatancy_angle = dilatancy_angle
        self.young_modulus = young_modulus
        self.poisson_ratio = poisson_ratio
        self.density = density
        self.tension_cutoff = tension_cutoff
    
    def get_kratos_properties(self) -> Dict:
        return {
            "YOUNG_MODULUS": self.young_modulus,
            "POISSON_RATIO": self.poisson_ratio,
            "COHESION": self.cohesion,
            "FRICTION_ANGLE": self.friction_angle,
            "DILATANCY_ANGLE": self.dilatancy_angle,
            "DENSITY": self.density,
            "TENSION_CUTOFF": self.tension_cutoff,
            "CONSTITUTIVE_LAW": "MohrCoulombPlasticityModel",
            "SHEAR_MODULUS": self.get_shear_modulus(),
            "BULK_MODULUS": self.get_bulk_modulus()
        }
    
    def validate_parameters(self) -> bool:
        if self.young_modulus <= 0:
            logger.error(f"弹性模量必须为正值: {self.young_modulus}")
            return False
        if self.poisson_ratio < -1.0 or self.poisson_ratio > 0.5:
            logger.error(f"泊松比范围错误: {self.poisson_ratio}")
            return False
        if self.cohesion < 0:
            logger.error(f"黏聚力不能为负: {self.cohesion}")
            return False
        if self.friction_angle < 0 or self.friction_angle > 89:
            logger.error(f"内摩擦角范围错误: {self.friction_angle}")
            return False
        if self.dilatancy_angle < 0 or self.dilatancy_angle > self.friction_angle:
            logger.error(f"膨胀角范围错误: {self.dilatancy_angle}")
            return False
        return True

class DruckerPragerModel(MaterialModel):
    """德鲁克-普拉格模型"""
    
    def __init__(self,
                cohesion: float,
                friction_angle: float,
                dilatancy_angle: float,
                young_modulus: float,
                poisson_ratio: float,
                hardening_parameter: float = 0.0,
                density: float = 2000.0):
        self.cohesion = cohesion
        self.friction_angle = friction_angle
        self.dilatancy_angle = dilatancy_angle
        self.young_modulus = young_modulus
        self.poisson_ratio = poisson_ratio
        self.hardening_parameter = hardening_parameter
        self.density = density
        
    def get_kratos_properties(self) -> Dict:
        return {
            "YOUNG_MODULUS": self.young_modulus,
            "POISSON_RATIO": self.poisson_ratio,
            "COHESION": self.cohesion,
            "FRICTION_ANGLE": self.friction_angle,
            "DILATANCY_ANGLE": self.dilatancy_angle,
            "HARDENING_PARAMETER": self.hardening_parameter,
            "DENSITY": self.density,
            "CONSTITUTIVE_LAW": "DruckerPragerPlasticityModel",
            "SHEAR_MODULUS": self.get_shear_modulus(),
            "BULK_MODULUS": self.get_bulk_modulus()
        }
    
    def validate_parameters(self) -> bool:
        if self.young_modulus <= 0:
            logger.error(f"弹性模量必须为正值: {self.young_modulus}")
            return False
        if self.poisson_ratio < -1.0 or self.poisson_ratio > 0.5:
            logger.error(f"泊松比范围错误: {self.poisson_ratio}")
            return False
        if self.cohesion < 0:
            logger.error(f"黏聚力不能为负: {self.cohesion}")
            return False
        if self.friction_angle < 0 or self.friction_angle > 89:
            logger.error(f"内摩擦角范围错误: {self.friction_angle}")
            return False
        if self.dilatancy_angle < 0 or self.dilatancy_angle > self.friction_angle:
            logger.error(f"膨胀角范围错误: {self.dilatancy_angle}")
            return False
        return True

class ModifiedCamClayModel(MaterialModel):
    """修正剑桥模型
    
    修正剑桥模型是一种高级土体本构模型，特别适用于软黏土的临界状态分析。
    该模型考虑了土体的硬化/软化行为、体积变化特性和屈服面演化等。
    
    参数:
        lambda_param: 压缩指数
        kappa: 回弹指数
        M: 临界状态线斜率
        e0: 初始孔隙比
        p0: 初始有效平均应力
        ocr: 超固结比
        poisson_ratio: 泊松比
        density: 密度
        specific_gravity: 比重 (默认2.7)
        reference_pressure: 参考压力 (默认为100 kPa)
        k0nc: 正常固结条件下的静止土压力系数 (默认计算)
    """
    
    def __init__(self,
                 lambda_param: float,
                 kappa: float,
                 M: float,
                 e0: float,
                 p0: float,
                 poisson_ratio: float,
                 density: float = 2000.0,
                 ocr: float = 1.0,
                 specific_gravity: float = 2.7,
                 reference_pressure: float = 100.0,
                 k0nc: Optional[float] = None):
        self.lambda_param = lambda_param  # 压缩指数
        self.kappa = kappa                # 回弹指数
        self.M = M                        # 临界状态线斜率
        self.e0 = e0                      # 初始孔隙比
        self.p0 = p0                      # 初始有效平均应力
        self.poisson_ratio = poisson_ratio# 泊松比
        self.density = density            # 密度
        self.ocr = ocr                    # 超固结比
        self.specific_gravity = specific_gravity  # 比重
        self.reference_pressure = reference_pressure  # 参考压力
        
        # 计算K0nc
        if k0nc is None:
            self.k0nc = 1 - np.sin(np.radians(self._calculate_friction_angle()))
        else:
            self.k0nc = k0nc
            
        # 计算等效弹性参数
        self.equivalent_young_modulus = self._calculate_young_modulus()
        
        # 计算预固结压力
        self.pc = self.p0 * self.ocr
    
    def _calculate_friction_angle(self) -> float:
        """基于临界状态线斜率M计算内摩擦角"""
        # 摩擦角与M的关系: M = 6*sin(phi) / (3-sin(phi))
        if self.M <= 0:
            return 0
            
        sin_phi = 3 * self.M / (6 + self.M)
        phi = np.degrees(np.arcsin(sin_phi))
        return phi
    
    def _calculate_young_modulus(self) -> float:
        """计算当前应力状态下的等效杨氏模量"""
        if self.p0 <= 0 or self.e0 <= 0 or self.kappa <= 0:
            return 1e6  # 默认值
        
        # 对于剑桥模型，体积模量 K = p*(1+e)/kappa
        K = self.p0 * (1 + self.e0) / self.kappa
        
        # 从体积模量和泊松比计算杨氏模量
        E = 3 * K * (1 - 2 * self.poisson_ratio)
        return E
    
    def calculate_yield_surface_size(self) -> float:
        """计算屈服面大小"""
        return self.p0 * self.ocr
    
    def get_critical_state_void_ratio(self, p: float) -> float:
        """计算临界状态下的孔隙比
        
        参数:
            p: 平均有效应力
            
        返回:
            临界状态孔隙比
        """
        if p <= 0:
            return self.e0
            
        e_cs = self.e0 - self.lambda_param * np.log(p / self.p0)
        return e_cs
    
    def get_kratos_properties(self) -> Dict:
        """返回Kratos材料属性字典"""
        return {
            "LAMBDA": self.lambda_param,
            "KAPPA": self.kappa,
            "M": self.M,
            "VOID_RATIO": self.e0,
            "OCR": self.ocr,
            "INITIAL_STRESS": self.p0,
            "PRECONSOLIDATION_PRESSURE": self.pc,
            "POISSON_RATIO": self.poisson_ratio,
            "DENSITY": self.density,
            "YOUNG_MODULUS": self.equivalent_young_modulus,
            "K0NC": self.k0nc,
            "REFERENCE_PRESSURE": self.reference_pressure,
            "SPECIFIC_GRAVITY": self.specific_gravity,
            "CONSTITUTIVE_LAW": "ModifiedCamClayPlasticityModel"
        }
    
    def validate_parameters(self) -> bool:
        """验证参数合理性"""
        if self.lambda_param <= 0:
            logger.error(f"压缩指数必须为正值: {self.lambda_param}")
            return False
        if self.kappa <= 0:
            logger.error(f"回弹指数必须为正值: {self.kappa}")
            return False
        if self.kappa >= self.lambda_param:
            logger.error(f"回弹指数必须小于压缩指数: kappa={self.kappa}, lambda={self.lambda_param}")
            return False
        if self.M <= 0:
            logger.error(f"临界状态线斜率必须为正值: {self.M}")
            return False
        if self.e0 <= 0:
            logger.error(f"初始孔隙比必须为正值: {self.e0}")
            return False
        if self.p0 <= 0:
            logger.error(f"初始有效平均应力必须为正值: {self.p0}")
            return False
        if self.poisson_ratio < 0 or self.poisson_ratio >= 0.5:
            logger.error(f"泊松比范围错误: {self.poisson_ratio}")
            return False
        if self.density <= 0:
            logger.error(f"密度必须为正值: {self.density}")
            return False
        if self.ocr < 1.0:
            logger.error(f"超固结比必须大于等于1: {self.ocr}")
            return False
        if self.specific_gravity <= 0:
            logger.error(f"比重必须为正值: {self.specific_gravity}")
            return False
            
        return True

class LargeStrainElastoPlasticModel(MaterialModel):
    """大变形弹塑性模型
    
    适用于土体大变形问题的弹塑性模型，考虑几何非线性和材料非线性。
    """
    
    def __init__(self,
                young_modulus: float,
                poisson_ratio: float,
                cohesion: float,
                friction_angle: float,
                dilatancy_angle: float,
                density: float = 2000.0,
                hardening_modulus: float = 0.0,
                tension_cutoff: bool = True):
        self.young_modulus = young_modulus
        self.poisson_ratio = poisson_ratio
        self.cohesion = cohesion
        self.friction_angle = friction_angle
        self.dilatancy_angle = dilatancy_angle
        self.density = density
        self.hardening_modulus = hardening_modulus
        self.tension_cutoff = tension_cutoff
    
    def get_kratos_properties(self) -> Dict:
        return {
            "YOUNG_MODULUS": self.young_modulus,
            "POISSON_RATIO": self.poisson_ratio,
            "COHESION": self.cohesion,
            "FRICTION_ANGLE": self.friction_angle,
            "DILATANCY_ANGLE": self.dilatancy_angle,
            "DENSITY": self.density,
            "HARDENING_MODULUS": self.hardening_modulus,
            "TENSION_CUTOFF": self.tension_cutoff,
            "CONSTITUTIVE_LAW": "LargeStrainElastoPlasticModel",
            "SHEAR_MODULUS": self.get_shear_modulus(),
            "BULK_MODULUS": self.get_bulk_modulus()
        }
    
    def validate_parameters(self) -> bool:
        if self.young_modulus <= 0:
            logger.error(f"弹性模量必须为正值: {self.young_modulus}")
            return False
        if self.poisson_ratio < -1.0 or self.poisson_ratio > 0.5:
            logger.error(f"泊松比范围错误: {self.poisson_ratio}")
            return False
        if self.cohesion < 0:
            logger.error(f"黏聚力不能为负: {self.cohesion}")
            return False
        if self.friction_angle < 0 or self.friction_angle > 89:
            logger.error(f"内摩擦角范围错误: {self.friction_angle}")
            return False
        if self.dilatancy_angle < 0 or self.dilatancy_angle > self.friction_angle:
            logger.error(f"膨胀角范围错误: {self.dilatancy_angle}")
            return False
        if self.density <= 0:
            logger.error(f"密度必须为正值: {self.density}")
            return False
        return True

# 注册所有模型到一个字典，便于UI显示和选择
material_models = {
    "LinearElastic": ElasticModel,
    "MohrCoulomb": MohrCoulombModel,
    "DruckerPrager": DruckerPragerModel,
    "ModifiedCamClay": ModifiedCamClayModel,
    "LargeStrainElastoPlastic": LargeStrainElastoPlasticModel
}

def create_material_model(model_name: str, **kwargs) -> MaterialModel:
    """创建指定的材料模型实例
    
    Args:
        model_name: 材料模型名称
        **kwargs: 模型参数
        
    Returns:
        实例化的材料模型对象
    
    Raises:
        ValueError: 如果模型名称不存在或参数无效
    """
    if model_name not in material_models:
        raise ValueError(f"未知的材料模型: {model_name}")
    
    try:
        model = material_models[model_name](**kwargs)
        
        if not model.validate_parameters():
            raise ValueError(f"材料参数验证失败: {kwargs}")
            
        logger.info(f"成功创建材料模型 {model_name}")
        return model
        
    except TypeError as e:
        logger.error(f"创建材料模型失败: {str(e)}")
        missing_params = str(e).split(": ")[-1]
        raise ValueError(f"创建材料模型 {model_name} 缺少必要参数: {missing_params}")
