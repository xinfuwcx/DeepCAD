#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
@file staged_construction.py
@description 分步施工模拟模块，支持深基坑工程的分步施工模拟分析
@author Deep Excavation Team
@version 1.0.0
@copyright 2025
"""

import os
import json
import logging
import time
from pathlib import Path
from typing import Dict, List, Union, Optional, Any
from enum import Enum

# 导入相关模块
from src.core.simulation.compute_base import ResultType

try:
    from src.core.simulation.terra_wrapper import TerraWrapper
    TERRA_AVAILABLE = True
except ImportError:
    TERRA_AVAILABLE = False
    logging.warning("TerraWrapper导入失败，部分功能可能不可用")

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("StagedConstruction")

class StageType(Enum):
    """施工阶段类型枚举"""
    INITIAL = "initial"                # 初始阶段
    EXCAVATION = "excavation"          # 开挖阶段
    DEWATERING = "dewatering"          # 降水阶段
    WALL_INSTALLATION = "wall"         # 围护结构安装
    ANCHOR_INSTALLATION = "anchor"     # 锚杆安装
    STRUT_INSTALLATION = "strut"       # 支撑安装
    LOAD_APPLICATION = "load"          # 荷载施加
    CONSOLIDATION = "consolidation"    # 固结阶段
    COMPLETION = "completion"          # 完工阶段
    CONTACT_SETUP = "contact"          # 接触设置阶段

class ContactType(Enum):
    """接触类型枚举"""
    TIED = "tied"                      # 绑定接触
    FRICTIONAL = "frictional"          # 摩擦接触
    FRICTIONLESS = "frictionless"      # 无摩擦接触
    ROUGH = "rough"                    # 粗糙接触
    BONDED = "bonded"                  # 粘结接触
    SEPARATION = "separation"          # 分离接触
    ELASTIC_SLIP = "elastic_slip"      # 弹性滑移接触

class ContactDefinition:
    """接触定义类，表示两个实体之间的接触关系"""
    
    def __init__(
        self,
        contact_id: str,
        master_entity: str,
        slave_entity: str,
        contact_type: ContactType,
        friction_coefficient: float = 0.3,
        adhesion_coefficient: float = 0.0,
        normal_stiffness: float = 1.0e8,
        tangential_stiffness: float = 1.0e8,
        penalty_factor: float = 1.0,
        description: str = ""
    ):
        """
        初始化接触定义
        
        参数:
            contact_id: 接触ID
            master_entity: 主实体（通常是较硬/较大的结构）
            slave_entity: 从实体（通常是较软/较小的结构）
            contact_type: 接触类型
            friction_coefficient: 摩擦系数
            adhesion_coefficient: 粘结系数
            normal_stiffness: 法向刚度系数
            tangential_stiffness: 切向刚度系数
            penalty_factor: 惩罚因子
            description: 接触描述
        """
        self.contact_id = contact_id
        self.master_entity = master_entity
        self.slave_entity = slave_entity
        self.contact_type = contact_type if isinstance(contact_type, ContactType) else ContactType(contact_type)
        self.friction_coefficient = friction_coefficient
        self.adhesion_coefficient = adhesion_coefficient
        self.normal_stiffness = normal_stiffness
        self.tangential_stiffness = tangential_stiffness
        self.penalty_factor = penalty_factor
        self.description = description
        
        # 状态信息
        self.status = {
            "is_active": False,
            "contact_normal_stress": 0.0,
            "contact_tangential_stress": 0.0,
            "contact_status": "not_initialized"  # not_initialized, active, slip, separation
        }
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "contact_id": self.contact_id,
            "master_entity": self.master_entity,
            "slave_entity": self.slave_entity,
            "contact_type": self.contact_type.value,
            "friction_coefficient": self.friction_coefficient,
            "adhesion_coefficient": self.adhesion_coefficient,
            "normal_stiffness": self.normal_stiffness,
            "tangential_stiffness": self.tangential_stiffness,
            "penalty_factor": self.penalty_factor,
            "description": self.description,
            "status": self.status
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ContactDefinition':
        """从字典创建对象"""
        return cls(
            contact_id=data["contact_id"],
            master_entity=data["master_entity"],
            slave_entity=data["slave_entity"],
            contact_type=data["contact_type"],
            friction_coefficient=data.get("friction_coefficient", 0.3),
            adhesion_coefficient=data.get("adhesion_coefficient", 0.0),
            normal_stiffness=data.get("normal_stiffness", 1.0e8),
            tangential_stiffness=data.get("tangential_stiffness", 1.0e8),
            penalty_factor=data.get("penalty_factor", 1.0),
            description=data.get("description", "")
        )

class ConstructionStage:
    """施工阶段类，表示施工模拟中的单个阶段"""
    
    def __init__(
        self,
        stage_id: str,
        stage_type: StageType,
        stage_name: str,
        stage_description: str = "",
        time_step: float = 0.0,
        elements: List[int] = None,
        entities: Dict[str, List[int]] = None,
        parameters: Dict[str, Any] = None
    ):
        """
        初始化施工阶段
        
        参数:
            stage_id: 阶段ID
            stage_type: 阶段类型
            stage_name: 阶段名称
            stage_description: 阶段描述
            time_step: 时间步长
            elements: 操作的单元列表
            entities: 操作的实体字典，如 {"soil": [1, 2, 3], "wall": [4, 5]}
            parameters: 阶段参数，如水位、荷载等
        """
        self.stage_id = stage_id
        self.stage_type = stage_type if isinstance(stage_type, StageType) else StageType(stage_type)
        self.stage_name = stage_name
        self.stage_description = stage_description
        self.time_step = time_step
        self.elements = elements or []
        self.entities = entities or {}
        self.parameters = parameters or {}
        
        # 阶段状态
        self.status = {
            "computed": False,
            "computation_time": 0.0,
            "convergence_status": None,
            "iterations": 0,
            "error": None
        }
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "stage_id": self.stage_id,
            "stage_type": self.stage_type.value,
            "stage_name": self.stage_name,
            "stage_description": self.stage_description,
            "time_step": self.time_step,
            "elements": self.elements,
            "entities": self.entities,
            "parameters": self.parameters,
            "status": self.status
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ConstructionStage':
        """从字典创建对象"""
        return cls(
            stage_id=data["stage_id"],
            stage_type=data["stage_type"],
            stage_name=data["stage_name"],
            stage_description=data.get("stage_description", ""),
            time_step=data.get("time_step", 0.0),
            elements=data.get("elements", []),
            entities=data.get("entities", {}),
            parameters=data.get("parameters", {})
        )

class StagedConstructionAnalysis:
    """分步施工模拟分析类，管理和执行深基坑工程的分步施工模拟分析"""
    
    def __init__(
        self,
        project_id: Union[int, str],
        model_file: str,
        work_dir: str = None,
        config: Dict[str, Any] = None
    ):
        """
        初始化分步施工模拟分析
        
        参数:
            project_id: 项目ID
            model_file: 模型文件路径
            work_dir: 工作目录
            config: 配置参数
        """
        self.project_id = project_id
        self.model_file = model_file
        self.config = config or {}
        
        # 设置工作目录
        if work_dir is None:
            base_dir = Path(__file__).resolve().parent.parent.parent.parent
            self.work_dir = os.path.join(base_dir, "data", "projects", f"project_{project_id}", "staged_construction")
        else:
            self.work_dir = work_dir
        
        os.makedirs(self.work_dir, exist_ok=True)
        
        # 初始化计算引擎
        self.compute_engine = None
        if TERRA_AVAILABLE:
            try:
                self.compute_engine = TerraWrapper()
                logger.info("Terra计算引擎初始化成功")
            except Exception as e:
                logger.error(f"Terra计算引擎初始化失败: {str(e)}")
        
        # 施工阶段列表
        self.stages: List[ConstructionStage] = []
        
        # 接触定义列表
        self.contacts: List[ContactDefinition] = []
        
        # 分析状态
        self.analysis_status = {
            "created_at": time.time(),
            "last_modified": time.time(),
            "current_stage": -1,  # -1表示尚未开始
            "total_stages": 0,
            "status": "not_started",  # not_started, running, completed, failed
            "error": None
        }
        
        # 接触分析配置
        self.contact_config = {
            "algorithm": "mortar",      # mortar, penalty, augmented_lagrangian
            "search_radius": 1.0,       # 搜索半径
            "auto_detection": True,     # 自动检测接触
            "friction_model": "coulomb", # coulomb, bilinear
            "stabilization": 0.0,       # 稳定化参数
            "max_iterations": 10        # 最大接触迭代次数
        }
        
        # 更新接触配置
        if "contact_config" in self.config:
            self.contact_config.update(self.config["contact_config"])
        
        logger.info(f"初始化分步施工模拟分析，项目ID: {project_id}")
    
    def add_stage(self, stage: ConstructionStage) -> str:
        """
        添加施工阶段
        
        参数:
            stage: 施工阶段对象
            
        返回:
            阶段ID
        """
        if not isinstance(stage, ConstructionStage):
            raise TypeError("stage必须是ConstructionStage类型")
        
        # 如果未指定阶段ID，则生成一个
        if not stage.stage_id:
            stage.stage_id = f"stage_{len(self.stages)}"
        
        self.stages.append(stage)
        self.analysis_status["total_stages"] = len(self.stages)
        self.analysis_status["last_modified"] = time.time()
        
        logger.info(f"添加施工阶段: {stage.stage_name} (ID: {stage.stage_id}), 类型: {stage.stage_type.value}")
        return stage.stage_id
    
    def add_initial_stage(self, name: str = "初始阶段", parameters: Dict[str, Any] = None) -> str:
        """
        添加初始阶段
        
        参数:
            name: 阶段名称
            parameters: 阶段参数
            
        返回:
            阶段ID
        """
        stage = ConstructionStage(
            stage_id=f"stage_0",
            stage_type=StageType.INITIAL,
            stage_name=name,
            stage_description="模型计算的初始阶段",
            parameters=parameters or {}
        )
        return self.add_stage(stage)
    
    def add_excavation_stage(
        self,
        name: str,
        elements: List[int],
        water_level: float = None,
        time_step: float = 0.0,
        parameters: Dict[str, Any] = None
    ) -> str:
        """
        添加开挖阶段
        
        参数:
            name: 阶段名称
            elements: 开挖单元列表
            water_level: 开挖后水位
            time_step: 时间步长
            parameters: 阶段参数
            
        返回:
            阶段ID
        """
        params = parameters or {}
        if water_level is not None:
            params["water_level"] = water_level
            
        stage = ConstructionStage(
            stage_id=f"stage_{len(self.stages)}",
            stage_type=StageType.EXCAVATION,
            stage_name=name,
            stage_description=f"开挖阶段: {name}",
            time_step=time_step,
            elements=elements,
            parameters=params
        )
        return self.add_stage(stage)
    
    def add_support_stage(
        self,
        name: str,
        stage_type: StageType,
        entities: Dict[str, List[int]],
        time_step: float = 0.0,
        parameters: Dict[str, Any] = None
    ) -> str:
        """
        添加支护安装阶段
        
        参数:
            name: 阶段名称
            stage_type: 阶段类型(WALL_INSTALLATION, ANCHOR_INSTALLATION, STRUT_INSTALLATION)
            entities: 支护实体字典
            time_step: 时间步长
            parameters: 阶段参数
            
        返回:
            阶段ID
        """
        if stage_type not in [StageType.WALL_INSTALLATION, StageType.ANCHOR_INSTALLATION, StageType.STRUT_INSTALLATION]:
            raise ValueError(f"无效的支护阶段类型: {stage_type}")
            
        stage = ConstructionStage(
            stage_id=f"stage_{len(self.stages)}",
            stage_type=stage_type,
            stage_name=name,
            stage_description=f"支护安装阶段: {name}",
            time_step=time_step,
            entities=entities,
            parameters=parameters or {}
        )
        return self.add_stage(stage)
    
    def add_dewatering_stage(
        self,
        name: str,
        water_level: float,
        area: List[int] = None,
        time_step: float = 0.0,
        parameters: Dict[str, Any] = None
    ) -> str:
        """
        添加降水阶段
        
        参数:
            name: 阶段名称
            water_level: 降水后水位
            area: 降水区域单元列表
            time_step: 时间步长
            parameters: 阶段参数
            
        返回:
            阶段ID
        """
        params = parameters or {}
        params["water_level"] = water_level
            
        stage = ConstructionStage(
            stage_id=f"stage_{len(self.stages)}",
            stage_type=StageType.DEWATERING,
            stage_name=name,
            stage_description=f"降水阶段: {name}",
            time_step=time_step,
            elements=area,
            parameters=params
        )
        return self.add_stage(stage)
    
    def add_load_stage(
        self,
        name: str,
        loads: Dict[str, Dict[str, Any]],
        time_step: float = 0.0,
        parameters: Dict[str, Any] = None
    ) -> str:
        """
        添加荷载施加阶段
        
        参数:
            name: 阶段名称
            loads: 荷载字典，键为荷载ID，值为荷载数据
            time_step: 时间步长
            parameters: 阶段参数
            
        返回:
            阶段ID
        """
        params = parameters or {}
        params["loads"] = loads
        
        stage = ConstructionStage(
            stage_id=f"stage_{len(self.stages)}",
            stage_type=StageType.LOAD_APPLICATION,
            stage_name=name,
            stage_description=f"荷载施加阶段: {name}",
            time_step=time_step,
            parameters=params
        )
        return self.add_stage(stage)
    
    def add_contact_definition(self, contact_def: ContactDefinition) -> str:
        """
        添加接触定义
        
        参数:
            contact_def: 接触定义对象
            
        返回:
            接触ID
        """
        if not isinstance(contact_def, ContactDefinition):
            raise TypeError("contact_def必须是ContactDefinition类型")
        
        # 检查ID冲突
        for contact in self.contacts:
            if contact.contact_id == contact_def.contact_id:
                logger.warning(f"接触ID '{contact_def.contact_id}' 已存在，将被更新")
                self.contacts.remove(contact)
                break
        
        self.contacts.append(contact_def)
        logger.info(f"添加接触定义: {contact_def.contact_id}, 类型: {contact_def.contact_type.value}, "
                   f"主实体: {contact_def.master_entity}, 从实体: {contact_def.slave_entity}")
        
        return contact_def.contact_id
    
    def add_frictional_contact(
        self,
        master_entity: str,
        slave_entity: str,
        friction_coefficient: float = 0.3,
        normal_stiffness: float = 1.0e8,
        description: str = ""
    ) -> str:
        """
        添加摩擦接触
        
        参数:
            master_entity: 主实体
            slave_entity: 从实体
            friction_coefficient: 摩擦系数
            normal_stiffness: 法向刚度
            description: 接触描述
            
        返回:
            接触ID
        """
        contact_id = f"contact_{master_entity}_{slave_entity}"
        contact = ContactDefinition(
            contact_id=contact_id,
            master_entity=master_entity,
            slave_entity=slave_entity,
            contact_type=ContactType.FRICTIONAL,
            friction_coefficient=friction_coefficient,
            normal_stiffness=normal_stiffness,
            description=description or f"摩擦接触 - {master_entity} 与 {slave_entity}"
        )
        
        return self.add_contact_definition(contact)
    
    def add_tied_contact(
        self,
        master_entity: str,
        slave_entity: str,
        normal_stiffness: float = 1.0e9,
        description: str = ""
    ) -> str:
        """
        添加绑定接触
        
        参数:
            master_entity: 主实体
            slave_entity: 从实体
            normal_stiffness: 法向刚度
            description: 接触描述
            
        返回:
            接触ID
        """
        contact_id = f"contact_{master_entity}_{slave_entity}"
        contact = ContactDefinition(
            contact_id=contact_id,
            master_entity=master_entity,
            slave_entity=slave_entity,
            contact_type=ContactType.TIED,
            normal_stiffness=normal_stiffness,
            description=description or f"绑定接触 - {master_entity} 与 {slave_entity}"
        )
        
        return self.add_contact_definition(contact)
    
    def add_contact_stage(
        self,
        name: str,
        contacts: List[str] = None,
        auto_detect: bool = False,
        entities: List[str] = None,
        parameters: Dict[str, Any] = None
    ) -> str:
        """
        添加接触设置阶段
        
        参数:
            name: 阶段名称
            contacts: 要激活的接触ID列表
            auto_detect: 是否自动检测接触
            entities: 如果auto_detect为True，指定要检测接触的实体列表
            parameters: 接触参数
            
        返回:
            阶段ID
        """
        stage_params = parameters or {}
        
        # 如果指定了接触列表，添加到参数中
        if contacts:
            stage_params["contacts"] = contacts
        
        # 如果启用自动检测，添加相关参数
        if auto_detect:
            stage_params["auto_detect"] = True
            if entities:
                stage_params["auto_detect_entities"] = entities
        
        stage = ConstructionStage(
            stage_id=f"stage_{len(self.stages)}",
            stage_type=StageType.CONTACT_SETUP,
            stage_name=name,
            stage_description=f"接触设置阶段: {name}",
            parameters=stage_params
        )
        
        return self.add_stage(stage)
    
    def run_analysis(self) -> Dict[str, Any]:
        """
        运行分步施工模拟分析
        
        返回:
            分析状态字典
        """
        if not self.stages:
            logger.error("未定义任何施工阶段")
            self.analysis_status["status"] = "failed"
            self.analysis_status["error"] = "未定义任何施工阶段"
            return self.analysis_status
        
        try:
            # 初始化分析
            logger.info("开始分步施工模拟分析")
            self.analysis_status["status"] = "running"
            self.analysis_status["last_modified"] = time.time()
            
            # 执行各个施工阶段
            for i, stage in enumerate(self.stages):
                logger.info(f"执行施工阶段 {i+1}/{len(self.stages)}: {stage.stage_name}")
                self.analysis_status["current_stage"] = i
                
                # 记录开始时间
                start_time = time.time()
                
                # 根据阶段类型调用不同的执行方法
                success = False
                if stage.stage_type == StageType.INITIAL:
                    success = self._execute_initial_stage(stage, i)
                elif stage.stage_type == StageType.EXCAVATION:
                    success = self._execute_excavation_stage(stage, i)
                elif stage.stage_type == StageType.WALL_INSTALLATION or \
                     stage.stage_type == StageType.ANCHOR_INSTALLATION or \
                     stage.stage_type == StageType.STRUT_INSTALLATION:
                    success = self._execute_support_stage(stage, i)
                elif stage.stage_type == StageType.DEWATERING:
                    success = self._execute_dewatering_stage(stage, i)
                elif stage.stage_type == StageType.LOAD_APPLICATION:
                    success = self._execute_load_stage(stage, i)
                elif stage.stage_type == StageType.CONTACT_SETUP:
                    success = self._execute_contact_stage(stage, i)
                else:
                    success = self._execute_general_stage(stage, i)
                
                # 更新阶段状态
                computation_time = time.time() - start_time
                stage.status["computation_time"] = computation_time
                stage.status["computed"] = success
                
                if not success:
                    logger.error(f"阶段 {stage.stage_name} 执行失败")
                    self.analysis_status["status"] = "failed"
                    self.analysis_status["error"] = f"阶段 {stage.stage_name} 执行失败"
                    return self.analysis_status
                
                logger.info(f"阶段 {stage.stage_name} 执行成功，耗时 {computation_time:.2f}s")
            
            # 所有阶段执行成功
            self.analysis_status["status"] = "completed"
            self.analysis_status["current_stage"] = len(self.stages)
            self.analysis_status["last_modified"] = time.time()
            
            logger.info("分步施工模拟分析完成")
            return self.analysis_status
            
        except Exception as e:
            logger.exception(f"分析执行过程中发生错误: {str(e)}")
            self.analysis_status["status"] = "failed"
            self.analysis_status["error"] = str(e)
            return self.analysis_status
    
    def _execute_initial_stage(self, stage: ConstructionStage, stage_index: int) -> bool:
        """执行初始阶段"""
        try:
            # 设置初始条件
            water_level = stage.parameters.get("water_level")
            if water_level is not None:
                self.compute_engine.set_water_level(water_level)
                
            # 设置初始应力场
            initial_stress_method = stage.parameters.get("initial_stress_method", "k0_procedure")
            k0 = stage.parameters.get("k0", 0.5)  # 默认侧压力系数
            
            if initial_stress_method == "k0_procedure":
                self.compute_engine.apply_initial_stress(method="k0", k0=k0)
            elif initial_stress_method == "gravity_loading":
                self.compute_engine.apply_initial_stress(method="gravity")
                
            # 执行求解
            return self.compute_engine.run_analysis(f"stage_{stage_index}", save_results=True)
        except Exception as e:
            logger.error(f"执行初始阶段失败: {str(e)}")
            stage.status["error"] = str(e)
            return False
    
    def _execute_excavation_stage(self, stage: ConstructionStage, stage_index: int) -> bool:
        """执行开挖阶段"""
        try:
            # 移除开挖单元
            if stage.elements:
                self.compute_engine.deactivate_elements(stage.elements)
                
            # 设置水位
            water_level = stage.parameters.get("water_level")
            if water_level is not None:
                self.compute_engine.set_water_level(water_level)
                
            # 执行求解
            return self.compute_engine.run_analysis(f"stage_{stage_index}", save_results=True)
        except Exception as e:
            logger.error(f"执行开挖阶段失败: {str(e)}")
            stage.status["error"] = str(e)
            return False
    
    def _execute_support_stage(self, stage: ConstructionStage, stage_index: int) -> bool:
        """执行支护安装阶段"""
        try:
            # 激活支护单元
            for entity_type, entity_ids in stage.entities.items():
                # 不同类型支护结构的处理
                if entity_type == "wall":
                    # 激活墙体单元
                    self.compute_engine.activate_elements(entity_ids)
                elif entity_type == "anchor":
                    # 添加锚杆，可能需要设置预应力
                    prestress = stage.parameters.get("prestress", {})
                    for anchor_id in entity_ids:
                        stress_value = prestress.get(str(anchor_id), 0.0)
                        self.compute_engine.add_anchor(anchor_id, prestress=stress_value)
                elif entity_type == "strut":
                    # 添加支撑
                    for strut_id in entity_ids:
                        self.compute_engine.add_strut(strut_id)
                else:
                    # 一般单元激活
                    self.compute_engine.activate_elements(entity_ids)
                    
            # 执行求解
            return self.compute_engine.run_analysis(f"stage_{stage_index}", save_results=True)
        except Exception as e:
            logger.error(f"执行支护安装阶段失败: {str(e)}")
            stage.status["error"] = str(e)
            return False
    
    def _execute_dewatering_stage(self, stage: ConstructionStage, stage_index: int) -> bool:
        """执行降水阶段"""
        try:
            # 设置水位
            water_level = stage.parameters.get("water_level")
            if water_level is not None:
                if stage.elements:
                    # 仅在特定区域设置水位
                    self.compute_engine.set_water_level(water_level, elements=stage.elements)
                else:
                    # 全局设置水位
                    self.compute_engine.set_water_level(water_level)
                    
            # 执行求解
            return self.compute_engine.run_analysis(f"stage_{stage_index}", save_results=True)
        except Exception as e:
            logger.error(f"执行降水阶段失败: {str(e)}")
            stage.status["error"] = str(e)
            return False
    
    def _execute_load_stage(self, stage: ConstructionStage, stage_index: int) -> bool:
        """执行荷载施加阶段"""
        try:
            # 施加荷载
            loads = stage.parameters.get("loads", {})
            for load_id, load_data in loads.items():
                load_type = load_data.get("type", "point")
                load_value = load_data.get("value", [0, 0, 0])
                entities = load_data.get("entities", [])
                
                if load_type == "point":
                    for entity in entities:
                        self.compute_engine.add_point_load(entity, load_value)
                elif load_type == "line":
                    for entity in entities:
                        self.compute_engine.add_line_load(entity, load_value)
                elif load_type == "surface":
                    for entity in entities:
                        self.compute_engine.add_surface_load(entity, load_value)
                elif load_type == "body":
                    for entity in entities:
                        self.compute_engine.add_body_force(entity, load_value)
                        
            # 执行求解
            return self.compute_engine.run_analysis(f"stage_{stage_index}", save_results=True)
        except Exception as e:
            logger.error(f"执行荷载施加阶段失败: {str(e)}")
            stage.status["error"] = str(e)
            return False
    
    def _execute_contact_stage(self, stage: ConstructionStage, stage_index: int) -> bool:
        """
        执行接触设置阶段
        
        参数:
            stage: 施工阶段对象
            stage_index: 阶段索引
            
        返回:
            是否执行成功
        """
        try:
            if self.compute_engine is None:
                logger.warning("未初始化计算引擎，模拟执行")
                return True
                
            # 获取参数
            params = stage.parameters
            
            # 获取要激活的接触列表
            contact_ids = params.get("contacts", [])
            
            # 处理自动检测
            if params.get("auto_detect", False):
                # 在实际实现中，这里会调用计算引擎的接触检测功能
                logger.info("执行自动接触检测")
                entities = params.get("auto_detect_entities", [])
                detected_contacts = self._detect_contacts(entities)
                contact_ids.extend(detected_contacts)
            
            # 激活接触
            for contact_id in contact_ids:
                # 查找对应的接触定义
                contact_def = next((c for c in self.contacts if c.contact_id == contact_id), None)
                if contact_def is None:
                    logger.warning(f"未找到接触定义: {contact_id}")
                    continue
                    
                # 激活接触
                self._activate_contact(contact_def)
            
            # 更新模型状态
            if self.compute_engine:
                self.compute_engine.update_model()
                
            return True
            
        except Exception as e:
            logger.error(f"执行接触阶段失败: {str(e)}")
            stage.status["error"] = str(e)
            return False
    
    def _detect_contacts(self, entities: List[str] = None) -> List[str]:
        """
        自动检测接触
        
        参数:
            entities: 要检测接触的实体列表，如果为空则检测所有实体
            
        返回:
            检测到的接触ID列表
        """
        # 在实际实现中，这里会调用计算引擎的几何检测功能
        # 此处为简化实现，返回空列表
        logger.info("执行接触自动检测")
        detected_contacts = []
        
        if self.compute_engine:
            # 假设compute_engine有detect_contacts方法
            entities_to_check = entities or []
            search_radius = self.contact_config["search_radius"]
            
            logger.info(f"使用搜索半径 {search_radius} 检测 {len(entities_to_check) or '所有'} 实体之间的接触")
            
            try:
                # 在实际实现中调用计算引擎方法
                # detected = self.compute_engine.detect_contacts(entities_to_check, search_radius)
                pass
            except Exception as e:
                logger.error(f"接触检测失败: {str(e)}")
        
        return detected_contacts
    
    def _activate_contact(self, contact_def: ContactDefinition) -> bool:
        """
        激活接触
        
        参数:
            contact_def: 接触定义对象
            
        返回:
            是否成功激活
        """
        if self.compute_engine is None:
            logger.warning(f"未初始化计算引擎，模拟激活接触 {contact_def.contact_id}")
            contact_def.status["is_active"] = True
            contact_def.status["contact_status"] = "active"
            return True
            
        try:
            logger.info(f"激活接触 {contact_def.contact_id}: {contact_def.master_entity} - {contact_def.slave_entity}")
            
            # 设置接触参数
            contact_params = {
                "contact_type": contact_def.contact_type.value,
                "friction_coefficient": contact_def.friction_coefficient,
                "adhesion_coefficient": contact_def.adhesion_coefficient,
                "normal_stiffness": contact_def.normal_stiffness,
                "tangential_stiffness": contact_def.tangential_stiffness,
                "penalty_factor": contact_def.penalty_factor,
                "algorithm": self.contact_config["algorithm"],
                "friction_model": self.contact_config["friction_model"],
                "stabilization": self.contact_config["stabilization"],
            }
            
            # 调用计算引擎激活接触
            # 在实际实现中会调用类似下面的方法
            # success = self.compute_engine.add_contact(
            #     contact_def.master_entity,
            #     contact_def.slave_entity,
            #     contact_params
            # )
            success = True  # 模拟成功
            
            # 更新接触状态
            contact_def.status["is_active"] = success
            contact_def.status["contact_status"] = "active" if success else "failed"
            
            return success
            
        except Exception as e:
            logger.error(f"激活接触 {contact_def.contact_id} 失败: {str(e)}")
            contact_def.status["contact_status"] = "failed"
            return False

    def get_contact(self, contact_id: str) -> Optional[ContactDefinition]:
        """
        获取接触定义
        
        参数:
            contact_id: 接触ID
            
        返回:
            接触定义对象，如果不存在则返回None
        """
        for contact in self.contacts:
            if contact.contact_id == contact_id:
                return contact
        return None
    
    def get_active_contacts(self) -> List[ContactDefinition]:
        """
        获取所有激活的接触
        
        返回:
            激活的接触定义对象列表
        """
        return [contact for contact in self.contacts if contact.status["is_active"]]
    
    def get_contact_results(self, contact_id: str = None) -> Dict[str, Any]:
        """
        获取接触分析结果
        
        参数:
            contact_id: 接触ID，如果为None则返回所有接触的结果
            
        返回:
            接触分析结果字典
        """
        results = {}
        
        if contact_id:
            # 获取指定接触的结果
            contact = self.get_contact(contact_id)
            if contact:
                results[contact_id] = self._get_contact_result(contact)
        else:
            # 获取所有激活接触的结果
            for contact in self.get_active_contacts():
                results[contact.contact_id] = self._get_contact_result(contact)
        
        return results
    
    def _get_contact_result(self, contact: ContactDefinition) -> Dict[str, Any]:
        """
        获取单个接触的分析结果
        
        参数:
            contact: 接触定义对象
            
        返回:
            接触分析结果字典
        """
        # 在实际实现中会从计算引擎获取结果
        # 这里简化为返回接触状态
        result = {
            "status": contact.status["contact_status"],
            "is_active": contact.status["is_active"],
            "normal_stress_max": 0.0,
            "tangential_stress_max": 0.0,
            "contact_area": 0.0,
            "slip_ratio": 0.0
        }
        
        if self.compute_engine and contact.status["is_active"]:
            # 模拟从计算引擎获取结果
            result["normal_stress_max"] = contact.status.get("contact_normal_stress", 0.0)
            result["tangential_stress_max"] = contact.status.get("contact_tangential_stress", 0.0)
        
        return result
    
    def _execute_general_stage(self, stage: ConstructionStage, stage_index: int) -> bool:
        """执行通用阶段"""
        try:
            # 执行求解
            return self.compute_engine.run_analysis(f"stage_{stage_index}", save_results=True)
        except Exception as e:
            logger.error(f"执行通用阶段失败: {str(e)}")
            stage.status["error"] = str(e)
            return False
    
    def get_stage(self, stage_id: str) -> Optional[ConstructionStage]:
        """获取指定ID的施工阶段"""
        for stage in self.stages:
            if stage.stage_id == stage_id:
                return stage
        return None
    
    def get_stage_by_index(self, index: int) -> Optional[ConstructionStage]:
        """获取指定索引的施工阶段"""
        if 0 <= index < len(self.stages):
            return self.stages[index]
        return None
    
    def get_current_stage(self) -> Optional[ConstructionStage]:
        """获取当前施工阶段"""
        index = self.analysis_status["current_stage"]
        return self.get_stage_by_index(index) if index >= 0 else None
    
    def get_status(self) -> Dict[str, Any]:
        """获取分析状态"""
        return self.analysis_status
    
    def get_results(self, stage_id: str = None) -> Dict[str, Any]:
        """
        获取分析结果
        
        参数:
            stage_id: 阶段ID，如果为None则返回最后一个阶段的结果
            
        返回:
            分析结果
        """
        if not self.compute_engine:
            return {"error": "计算引擎未初始化"}
            
        if stage_id is None:
            # 使用最后一个已计算的阶段
            for i in range(len(self.stages) - 1, -1, -1):
                if self.stages[i].status["computed"]:
                    stage_id = self.stages[i].stage_id
                    break
                    
        if not stage_id:
            return {"error": "未找到有效的阶段结果"}
            
        return self.compute_engine.get_results(stage_id)
    
    def export_results(self, output_file: str, format: str = "vtk", stage_id: str = None) -> str:
        """
        导出分析结果
        
        参数:
            output_file: 输出文件路径
            format: 导出格式(vtk, json等)
            stage_id: 阶段ID，如果为None则导出最后一个阶段的结果
            
        返回:
            导出文件路径
        """
        if not self.compute_engine:
            raise RuntimeError("计算引擎未初始化")
            
        if stage_id is None:
            # 使用最后一个已计算的阶段
            for i in range(len(self.stages) - 1, -1, -1):
                if self.stages[i].status["computed"]:
                    stage_id = self.stages[i].stage_id
                    break
                    
        if not stage_id:
            raise ValueError("未找到有效的阶段结果")
            
        return self.compute_engine.export_results(output_file, format, stage_id)
    
    def save(self, filename: str = None) -> str:
        """
        保存分析数据到文件
        
        参数:
            filename: 保存文件名，如果为空则使用默认名称
            
        返回:
            保存的文件路径
        """
        if filename is None:
            filename = f"staged_construction_{self.project_id}.json"
            
        save_path = os.path.join(self.work_dir, filename)
        
        # 准备保存数据
        data = {
            "project_id": self.project_id,
            "model_file": self.model_file,
            "config": self.config,
            "stages": [stage.to_dict() for stage in self.stages],
            "contacts": [contact.to_dict() for contact in self.contacts],
            "contact_config": self.contact_config,
            "analysis_status": self.analysis_status
        }
        
        # 保存为JSON文件
        with open(save_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        logger.info(f"分析数据已保存到: {save_path}")
        return save_path
    
    @classmethod
    def load(cls, filename: str) -> 'StagedConstructionAnalysis':
        """
        从文件加载分析数据
        
        参数:
            filename: 文件路径
            
        返回:
            StagedConstructionAnalysis实例
        """
        with open(filename, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # 创建实例
        work_dir = os.path.dirname(filename)
        instance = cls(
            project_id=data["project_id"],
            model_file=data["model_file"],
            work_dir=work_dir,
            config=data.get("config", {})
        )
        
        # 加载施工阶段
        instance.stages = [ConstructionStage.from_dict(stage_data) for stage_data in data["stages"]]
        
        # 加载接触定义
        if "contacts" in data:
            instance.contacts = [ContactDefinition.from_dict(contact_data) for contact_data in data["contacts"]]
        
        # 加载接触配置
        if "contact_config" in data:
            instance.contact_config = data["contact_config"]
        
        # 加载分析状态
        instance.analysis_status = data["analysis_status"]
        
        logger.info(f"从文件加载分析数据: {filename}")
        return instance
