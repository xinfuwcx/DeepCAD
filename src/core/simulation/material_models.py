import numpy as np
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Union, Tuple

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
            return False
        if self.poisson_ratio < -1.0 or self.poisson_ratio > 0.5:
            return False
        if self.density <= 0:
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
            "CONSTITUTIVE_LAW": "MohrCoulombPlasticityModel"
        }
    
    def validate_parameters(self) -> bool:
        if self.young_modulus <= 0:
            return False
        if self.poisson_ratio < -1.0 or self.poisson_ratio > 0.5:
            return False
        if self.cohesion < 0:
            return False
        if self.friction_angle < 0 or self.friction_angle > 89:
            return False
        if self.dilatancy_angle < 0 or self.dilatancy_angle > self.friction_angle:
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
            "CONSTITUTIVE_LAW": "DruckerPragerPlasticityModel"
        }
    
    def validate_parameters(self) -> bool:
        if self.young_modulus <= 0:
            return False
        if self.poisson_ratio < -1.0 or self.poisson_ratio > 0.5:
            return False
        if self.cohesion < 0:
            return False
        if self.friction_angle < 0 or self.friction_angle > 89:
            return False
        if self.dilatancy_angle < 0 or self.dilatancy_angle > self.friction_angle:
            return False
        return True

@dataclass
class CamClayState:
    """Cam-Clay模型状态参数"""
    void_ratio: float = 0.8
    preconsolidation_pressure: float = 100.0
    plastic_volumetric_strain: float = 0.0
    elastic_volumetric_strain: float = 0.0
    stress_tensor: Optional[np.ndarray] = None
    strain_tensor: Optional[np.ndarray] = None
    
    def __post_init__(self):
        if self.stress_tensor is None:
            self.stress_tensor = np.zeros(6)  # 3D应力张量
        if self.strain_tensor is None:
            self.strain_tensor = np.zeros(6)  # 3D应变张量

class ModifiedCamClayModel(MaterialModel):
    """修正剑桥模型（Modified Cam-Clay）"""
    
    def __init__(self,
                lambda_param: float,      # 压缩指数
                kappa: float,             # 回弹指数
                M: float,                 # 临界状态线斜率
                initial_void_ratio: float,  # 初始孔隙比
                poisson_ratio: float,     # 泊松比
                pc0: float,               # 初始预压固结压力
                density: float = 2000.0,  # 密度
                OCR: float = 1.0,         # 超固结比
                small_strain: bool = True): # 是否使用小应变理论
        
        self.lambda_param = lambda_param
        self.kappa = kappa
        self.M = M
        self.initial_void_ratio = initial_void_ratio
        self.poisson_ratio = poisson_ratio
        self.pc0 = pc0
        self.density = density
        self.OCR = OCR
        self.small_strain = small_strain
        
        # 缓存计算的弹性参数
        self._cached_bulk_modulus = None
        self._cached_shear_modulus = None
        
        # 初始状态
        self.state = CamClayState(
            void_ratio=initial_void_ratio,
            preconsolidation_pressure=pc0
        )
        
    def get_elastic_moduli(self, p: float) -> Tuple[float, float]:
        """计算体积弹性模量和剪切弹性模量
        
        Args:
            p: 平均有效应力
            
        Returns:
            (K, G): 体积弹性模量和剪切弹性模量
        """
        # 确保p不为零
        p = max(p, 0.1)  
        
        # 计算体积弹性模量
        K = (1 + self.state.void_ratio) * p / self.kappa
        
        # 通过泊松比计算剪切弹性模量
        G = 3 * K * (1 - 2 * self.poisson_ratio) / (2 * (1 + self.poisson_ratio))
        
        return K, G
    
    def calculate_yield_function(self, p: float, q: float) -> float:
        """计算屈服函数
        
        Args:
            p: 平均有效应力
            q: 偏应力
            
        Returns:
            f: 屈服函数值，小于0表示弹性状态，等于0表示屈服，大于0表示非法状态
        """
        pc = self.state.preconsolidation_pressure
        return q**2 / self.M**2 + p * (p - pc)
    
    def calculate_plastic_multiplier(self, p: float, q: float, dp: float, dq: float) -> float:
        """计算塑性乘子
        
        Args:
            p: 平均有效应力
            q: 偏应力
            dp: 平均应力增量
            dq: 偏应力增量
            
        Returns:
            Lambda: 塑性乘子
        """
        pc = self.state.preconsolidation_pressure
        
        # 计算屈服面法向
        df_dp = 2 * p - pc
        df_dq = 2 * q / self.M**2
        
        # 计算硬化模量
        H = (1 + self.state.void_ratio) * pc / (self.lambda_param - self.kappa)
        
        # 计算弹性模量
        K, G = self.get_elastic_moduli(p)
        
        # 计算塑性乘子
        numerator = df_dp * dp + df_dq * dq
        denominator = K * df_dp**2 + 3 * G * df_dq**2 + df_dp * pc * H
        
        return numerator / denominator if denominator != 0 else 0
    
    def update_state(self, stress_increment: np.ndarray, strain_increment: np.ndarray):
        """更新材料状态
        
        Args:
            stress_increment: 应力增量张量 [6]
            strain_increment: 应变增量张量 [6]
        """
        # 更新应力应变状态
        self.state.stress_tensor += stress_increment
        self.state.strain_tensor += strain_increment
        
        # 计算平均应力和偏应力
        p = (self.state.stress_tensor[0] + self.state.stress_tensor[1] + self.state.stress_tensor[2]) / 3
        s = self.state.stress_tensor.copy()
        s[0] -= p
        s[1] -= p
        s[2] -= p
        q = np.sqrt(1.5 * np.sum(s**2))
        
        # 计算体积应变和剪应变增量
        dev = strain_increment[0] + strain_increment[1] + strain_increment[2]
        
        # 检查屈服状态
        f = self.calculate_yield_function(p, q)
        
        if f >= 0:  # 塑性状态
            # 计算应力增量引起的平均应力和偏应力增量
            dp = (stress_increment[0] + stress_increment[1] + stress_increment[2]) / 3
            ds = stress_increment.copy()
            ds[0] -= dp
            ds[1] -= dp
            ds[2] -= dp
            dq = np.sqrt(1.5 * np.sum(ds**2))
            
            # 计算塑性乘子
            Lambda = self.calculate_plastic_multiplier(p, q, dp, dq)
            
            # 更新塑性体积应变
            self.state.plastic_volumetric_strain += Lambda * (2*p - self.state.preconsolidation_pressure)
            
            # 更新预压固结压力
            dpc = self.state.preconsolidation_pressure * (self.lambda_param - self.kappa) * Lambda * \
                  (2*p - self.state.preconsolidation_pressure) / (1 + self.state.void_ratio)
            self.state.preconsolidation_pressure += dpc
            
            # 更新孔隙比
            self.state.void_ratio -= (1 + self.state.void_ratio) * dev
        
        else:  # 弹性状态
            # 更新弹性体积应变
            self.state.elastic_volumetric_strain += dev
            
            # 更新孔隙比
            self.state.void_ratio -= (1 + self.state.void_ratio) * dev
    
    def get_kratos_properties(self) -> Dict:
        # 计算泊松比对应的拉梅常数
        K, G = self.get_elastic_moduli(100.0)  # 使用参考压力100kPa
        young_modulus = 9 * K * G / (3 * K + G)
        
        return {
            "LAMBDA": self.lambda_param,
            "KAPPA": self.kappa,
            "M": self.M,
            "VOID_RATIO": self.initial_void_ratio,
            "POISSON_RATIO": self.poisson_ratio,
            "PRECONSOLIDATION_PRESSURE": self.pc0,
            "OCR": self.OCR,
            "DENSITY": self.density,
            "YOUNG_MODULUS": young_modulus,  # 计算得到的杨氏模量
            "SMALL_STRAIN": self.small_strain,
            "CONSTITUTIVE_LAW": "ModifiedCamClayModel"
        }
    
    def validate_parameters(self) -> bool:
        if self.lambda_param <= 0:
            return False
        if self.kappa <= 0 or self.kappa >= self.lambda_param:
            return False
        if self.M <= 0:
            return False
        if self.initial_void_ratio <= 0:
            return False
        if self.poisson_ratio < 0 or self.poisson_ratio >= 0.5:
            return False
        if self.pc0 <= 0:
            return False
        if self.OCR < 1.0:
            return False
        return True

class LargeStrainElastoPlasticModel(MaterialModel):
    """大应变弹塑性模型"""
    
    def __init__(self, 
                 elastic_model: MaterialModel,
                 plastic_model: MaterialModel,
                 max_iterations: int = 20,
                 tolerance: float = 1e-6,
                 use_consistent_tangent: bool = True):
        """
        初始化大应变弹塑性模型
        
        Args:
            elastic_model: 弹性本构模型
            plastic_model: 塑性本构模型
            max_iterations: 局部迭代最大次数
            tolerance: 收敛容差
            use_consistent_tangent: 是否使用一致切线刚度
        """
        self.elastic_model = elastic_model
        self.plastic_model = plastic_model
        self.max_iterations = max_iterations
        self.tolerance = tolerance
        self.use_consistent_tangent = use_consistent_tangent
        
    def get_kratos_properties(self) -> Dict:
        """返回Kratos材料属性字典"""
        properties = {}
        
        # 融合弹性模型属性
        elastic_props = self.elastic_model.get_kratos_properties()
        for key, value in elastic_props.items():
            if key != "CONSTITUTIVE_LAW":
                properties[key] = value
        
        # 融合塑性模型属性
        plastic_props = self.plastic_model.get_kratos_properties()
        for key, value in plastic_props.items():
            if key != "CONSTITUTIVE_LAW" and key not in properties:
                properties[key] = value
        
        # 设置大应变特有属性
        properties["MAX_ITERATIONS"] = self.max_iterations
        properties["TOLERANCE"] = self.tolerance
        properties["USE_CONSISTENT_TANGENT"] = self.use_consistent_tangent
        properties["LARGE_STRAIN"] = True
        properties["CONSTITUTIVE_LAW"] = "LargeStrainElastoPlasticModel"
        
        return properties
    
    def validate_parameters(self) -> bool:
        """验证参数合理性"""
        return (self.elastic_model.validate_parameters() and
                self.plastic_model.validate_parameters() and
                self.max_iterations > 0 and
                self.tolerance > 0)

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
    
    model = material_models[model_name](**kwargs)
    
    if not model.validate_parameters():
        raise ValueError(f"材料参数无效: {kwargs}")
    
    return model
