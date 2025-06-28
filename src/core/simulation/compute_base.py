"""
@file compute_base.py
@description 计算引擎基础接口类，定义通用功能和接口
@author Deep Excavation Team
@version 1.0.0
@copyright 2025
"""

from abc import ABC, abstractmethod
from enum import Enum
from typing import Dict, Any, List, Optional, Tuple, Union
import os
import tempfile
import uuid
import logging

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("ComputeBase")

class AnalysisType(Enum):
    """分析类型枚举"""
    STATIC = "static"                # 静力分析
    CONSOLIDATION = "consolidation"  # 固结分析
    DYNAMIC = "dynamic"              # 动力分析
    STEADY_FLOW = "steady_flow"      # 稳态渗流
    TRANSIENT_FLOW = "transient_flow"# 瞬态渗流
    COUPLED = "coupled"              # 耦合分析

class MaterialModelType(Enum):
    """材料模型类型枚举"""
    LINEAR_ELASTIC = "linear_elastic"      # 线性弹性
    MOHR_COULOMB = "mohr_coulomb"          # 莫尔库仑模型
    DRUCKER_PRAGER = "drucker_prager"      # Drucker-Prager模型
    CAM_CLAY = "cam_clay"                  # Cam-Clay模型
    MODIFIED_CAM_CLAY = "modified_cam_clay" # 修正Cam-Clay模型
    HYPOPLASTIC = "hypoplastic"            # 超塑性模型
    DUNCAN_CHANG = "duncan_chang"          # Duncan-Chang模型
    SOFT_SOIL = "soft_soil"                # 软土模型
    HARDENING_SOIL = "hardening_soil"      # 硬化土模型
    USER_DEFINED = "user_defined"          # 用户自定义

class ElementType(Enum):
    """单元类型枚举"""
    SOLID = "solid"                  # 实体单元
    SHELL = "shell"                  # 壳单元
    BEAM = "beam"                    # 梁单元
    TRUSS = "truss"                  # 桁架单元
    MEMBRANE = "membrane"            # 膜单元
    INTERFACE = "interface"          # 界面单元
    CONNECTOR = "connector"          # 连接单元
    SPRING = "spring"                # 弹簧单元

class LoadType(Enum):
    """荷载类型枚举"""
    POINT_LOAD = "point_load"        # 点荷载
    LINE_LOAD = "line_load"          # 线荷载
    SURFACE_LOAD = "surface_load"    # 面荷载
    BODY_FORCE = "body_force"        # 体力(如重力)
    PRESSURE = "pressure"            # 压力荷载
    TEMPERATURE = "temperature"      # 温度荷载
    HYDROSTATIC = "hydrostatic"      # 静水压力
    PRESCRIBED_DISP = "prescribed_disp" # 位移荷载
    
class BoundaryType(Enum):
    """边界条件类型枚举"""
    FIXED = "fixed"                  # 固定边界
    DISPLACEMENT = "displacement"    # 位移边界
    VELOCITY = "velocity"            # 速度边界
    ACCELERATION = "acceleration"    # 加速度边界
    FORCE = "force"                  # 力边界
    PRESSURE = "pressure"            # 压力边界
    FLOW = "flow"                    # 流量边界
    HEAD = "head"                    # 水头边界
    CONTACT = "contact"              # 接触边界
    SYMMETRY = "symmetry"            # 对称边界
    SPRING = "spring"                # 弹性支撑

class SolverType(Enum):
    """求解器类型枚举"""
    DIRECT = "direct"                # 直接求解器
    ITERATIVE = "iterative"          # 迭代求解器
    MULTIGRID = "multigrid"          # 多重网格求解器
    NESTED = "nested"                # 嵌套求解器

class ResultType(Enum):
    """结果类型枚举"""
    DISPLACEMENT = "displacement"    # 位移
    VELOCITY = "velocity"            # 速度
    ACCELERATION = "acceleration"    # 加速度
    STRESS = "stress"                # 应力
    STRAIN = "strain"                # 应变
    PORE_PRESSURE = "pore_pressure"  # 孔隙水压力
    FLOW_VELOCITY = "flow_velocity"  # 流速
    HEAD = "head"                    # 水头
    REACTION = "reaction"            # 反力
    INTERNAL_FORCE = "internal_force"# 内力
    USER_DEFINED = "user_defined"    # 用户自定义

class ComputeBase(ABC):
    """计算引擎基础接口类"""
    
    def __init__(self, work_dir: Optional[str] = None):
        """初始化计算引擎基础接口
        
        Args:
            work_dir: 工作目录，用于存放临时文件
        """
        # 设置工作目录
        if work_dir:
            self.work_dir = work_dir
            os.makedirs(self.work_dir, exist_ok=True)
        else:
            self.work_dir = tempfile.mkdtemp(prefix="deep_excavation_compute_")
        
        # 初始化任务字典
        self.tasks = {}
        
        # 初始状态
        self.model_file = None
        self.mesh_file = None
        self.result_file = None
        
        logger.info(f"计算引擎基础接口初始化完成，工作目录: {self.work_dir}")
    
    def create_task_id(self) -> str:
        """创建新的任务ID
        
        Returns:
            str: 任务ID
        """
        return str(uuid.uuid4())
    
    @abstractmethod
    def load_mesh(self, mesh_file: str) -> bool:
        """加载网格文件
        
        Args:
            mesh_file: 网格文件路径
            
        Returns:
            bool: 是否加载成功
        """
        pass
    
    @abstractmethod
    def set_analysis_type(self, task_id: str, analysis_type: Union[AnalysisType, str]) -> bool:
        """设置分析类型
        
        Args:
            task_id: 任务ID
            analysis_type: 分析类型
            
        Returns:
            bool: 是否设置成功
        """
        pass
    
    @abstractmethod
    def add_material(self, task_id: str, name: str, material_type: Union[MaterialModelType, str], 
                    parameters: Dict[str, Any], group_ids: Optional[List[int]] = None) -> str:
        """添加材料
        
        Args:
            task_id: 任务ID
            name: 材料名称
            material_type: 材料类型
            parameters: 材料参数
            group_ids: 物理组ID列表
            
        Returns:
            str: 材料ID
        """
        pass
    
    @abstractmethod
    def set_element_type(self, task_id: str, element_type: Union[ElementType, str], 
                         group_ids: Optional[List[int]] = None) -> bool:
        """设置单元类型
        
        Args:
            task_id: 任务ID
            element_type: 单元类型
            group_ids: 物理组ID列表
            
        Returns:
            bool: 是否设置成功
        """
        pass
    
    @abstractmethod
    def add_boundary_condition(self, task_id: str, bc_type: Union[BoundaryType, str], 
                             entities: List[int], values: Optional[List[float]] = None) -> str:
        """添加边界条件
        
        Args:
            task_id: 任务ID
            bc_type: 边界条件类型
            entities: 实体ID列表
            values: 边界条件值
            
        Returns:
            str: 边界条件ID
        """
        pass
    
    @abstractmethod
    def add_load(self, task_id: str, load_type: Union[LoadType, str], entities: List[int], 
               values: List[float], stage: Optional[int] = None) -> str:
        """添加荷载
        
        Args:
            task_id: 任务ID
            load_type: 荷载类型
            entities: 实体ID列表
            values: 荷载值
            stage: 施工阶段索引
            
        Returns:
            str: 荷载ID
        """
        pass
    
    @abstractmethod
    def add_excavation_stage(self, task_id: str, name: str, elements: List[int], 
                           water_level: Optional[float] = None, time_step: float = 1.0) -> int:
        """添加开挖阶段
        
        Args:
            task_id: 任务ID
            name: 阶段名称
            elements: 开挖单元列表
            water_level: 水位高程
            time_step: 时间步长
            
        Returns:
            int: 阶段索引
        """
        pass
    
    @abstractmethod
    def set_solver_settings(self, task_id: str, solver_type: Union[SolverType, str], 
                          settings: Dict[str, Any]) -> bool:
        """设置求解器参数
        
        Args:
            task_id: 任务ID
            solver_type: 求解器类型
            settings: 求解器设置
            
        Returns:
            bool: 是否设置成功
        """
        pass
    
    @abstractmethod
    def run_analysis(self, task_id: str, num_threads: Optional[int] = None) -> bool:
        """运行分析
        
        Args:
            task_id: 任务ID
            num_threads: 线程数
            
        Returns:
            bool: 是否分析成功
        """
        pass
    
    @abstractmethod
    def get_status(self, task_id: str) -> Dict[str, Any]:
        """获取计算任务状态
        
        Args:
            task_id: 任务ID
            
        Returns:
            Dict[str, Any]: 任务状态信息
        """
        pass
    
    @abstractmethod
    def get_results(self, task_id: str, result_type: Union[ResultType, str], 
                  stage: Optional[int] = None, component: Optional[str] = None) -> Dict[str, Any]:
        """获取计算结果
        
        Args:
            task_id: 任务ID
            result_type: 结果类型
            stage: 施工阶段索引
            component: 结果分量
            
        Returns:
            Dict[str, Any]: 结果数据
        """
        pass
    
    @abstractmethod
    def export_results(self, task_id: str, output_file: str, format: str = "vtk", 
                     stage: Optional[int] = None) -> str:
        """导出结果
        
        Args:
            task_id: 任务ID
            output_file: 输出文件路径
            format: 输出格式
            stage: 施工阶段索引
            
        Returns:
            str: 输出文件路径
        """
        pass
    
    @abstractmethod
    def import_model(self, input_file: str, format: str) -> str:
        """导入模型
        
        Args:
            input_file: 输入文件路径
            format: 输入格式
            
        Returns:
            str: 任务ID
        """
        pass
    
    @abstractmethod
    def export_model(self, task_id: str, output_file: str, format: str) -> str:
        """导出模型
        
        Args:
            task_id: 任务ID
            output_file: 输出文件路径
            format: 输出格式
            
        Returns:
            str: 输出文件路径
        """
        pass
    
    def cleanup(self, task_id: Optional[str] = None):
        """清理资源
        
        Args:
            task_id: 任务ID，None则清理所有资源
        """
        if task_id:
            if task_id in self.tasks:
                # 清理特定任务资源
                task_temp_dir = os.path.join(self.work_dir, task_id)
                if os.path.exists(task_temp_dir):
                    try:
                        import shutil
                        shutil.rmtree(task_temp_dir)
                        logger.info(f"清理任务资源: {task_id}")
                    except Exception as e:
                        logger.error(f"清理任务资源失败: {e}")
                
                # 从字典中移除
                del self.tasks[task_id]
        else:
            # 清理所有资源
            for task_id in list(self.tasks.keys()):
                self.cleanup(task_id)
                
            # 尝试清理工作目录
            try:
                import shutil
                shutil.rmtree(self.work_dir)
                logger.info(f"清理工作目录: {self.work_dir}")
            except Exception as e:
                logger.error(f"清理工作目录失败: {e}") 