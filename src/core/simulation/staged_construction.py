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
        
        # 分析状态
        self.analysis_status = {
            "created_at": time.time(),
            "last_modified": time.time(),
            "current_stage": -1,  # -1表示尚未开始
            "total_stages": 0,
            "status": "not_started",  # not_started, running, completed, failed
            "error": None
        }
        
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
    
    def run_analysis(self) -> Dict[str, Any]:
        """
        运行分步施工模拟分析
        
        返回:
            分析结果摘要
        """
        if not self.stages:
            raise ValueError("未添加任何施工阶段，无法运行分析")
            
        if not self.compute_engine:
            raise RuntimeError("计算引擎未初始化，无法运行分析")
            
        logger.info(f"开始运行分步施工模拟分析，共{len(self.stages)}个阶段")
        
        # 更新分析状态
        self.analysis_status["status"] = "running"
        self.analysis_status["current_stage"] = 0
        start_time = time.time()
        
        try:
            # 加载模型
            self.compute_engine.load_model(self.model_file)
            
            # 逐阶段执行分析
            results = {}
            for i, stage in enumerate(self.stages):
                logger.info(f"执行第{i+1}/{len(self.stages)}阶段: {stage.stage_name}")
                self.analysis_status["current_stage"] = i
                
                stage_start_time = time.time()
                
                # 根据阶段类型执行不同操作
                if stage.stage_type == StageType.INITIAL:
                    # 初始阶段，设置初始条件
                    success = self._execute_initial_stage(stage, i)
                elif stage.stage_type == StageType.EXCAVATION:
                    # 开挖阶段，移除单元
                    success = self._execute_excavation_stage(stage, i)
                elif stage.stage_type in [StageType.WALL_INSTALLATION, StageType.ANCHOR_INSTALLATION, StageType.STRUT_INSTALLATION]:
                    # 支护安装阶段，激活单元
                    success = self._execute_support_stage(stage, i)
                elif stage.stage_type == StageType.DEWATERING:
                    # 降水阶段，调整水位
                    success = self._execute_dewatering_stage(stage, i)
                elif stage.stage_type == StageType.LOAD_APPLICATION:
                    # 荷载施加阶段
                    success = self._execute_load_stage(stage, i)
                else:
                    # 其他阶段
                    success = self._execute_general_stage(stage, i)
                
                # 更新阶段状态
                stage.status["computed"] = success
                stage.status["computation_time"] = time.time() - stage_start_time
                
                if not success:
                    logger.error(f"第{i+1}阶段执行失败: {stage.stage_name}")
                    self.analysis_status["status"] = "failed"
                    self.analysis_status["error"] = f"第{i+1}阶段执行失败: {stage.stage_name}"
                    break
                    
                # 收集结果
                stage_results = self.compute_engine.get_results(f"stage_{i}")
                results[f"stage_{i}"] = {
                    "name": stage.stage_name,
                    "type": stage.stage_type.value,
                    "results": stage_results
                }
                
                logger.info(f"第{i+1}阶段执行完成: {stage.stage_name}, 耗时: {stage.status['computation_time']:.2f}秒")
            
            # 如果所有阶段都执行成功，则标记为已完成
            if self.analysis_status["status"] != "failed":
                self.analysis_status["status"] = "completed"
                
            # 导出最终结果
            final_result_file = os.path.join(self.work_dir, f"final_results_{self.project_id}.vtk")
            self.compute_engine.export_results(final_result_file, "vtk")
            
            # 更新分析状态
            self.analysis_status["last_modified"] = time.time()
            self.analysis_status["computation_time"] = time.time() - start_time
            
            logger.info(f"分步施工模拟分析完成，总耗时: {self.analysis_status['computation_time']:.2f}秒")
            
            # 返回结果摘要
            return {
                "status": self.analysis_status["status"],
                "total_stages": len(self.stages),
                "completed_stages": self.analysis_status["current_stage"] + 1,
                "computation_time": self.analysis_status["computation_time"],
                "result_file": final_result_file,
                "results_summary": results
            }
            
        except Exception as e:
            logger.error(f"分步施工模拟分析失败: {str(e)}")
            self.analysis_status["status"] = "failed"
            self.analysis_status["error"] = str(e)
            
            return {
                "status": "failed",
                "error": str(e)
            }
    
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
        保存分析配置和状态
        
        参数:
            filename: 保存的文件名，如果为None则自动生成
            
        返回:
            保存的文件路径
        """
        if filename is None:
            filename = f"staged_construction_{self.project_id}_{int(time.time())}.json"
            
        output_path = os.path.join(self.work_dir, filename)
        
        # 准备数据
        data = {
            "project_id": self.project_id,
            "model_file": self.model_file,
            "config": self.config,
            "stages": [stage.to_dict() for stage in self.stages],
            "analysis_status": self.analysis_status
        }
        
        # 保存到文件
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
            
        logger.info(f"分析配置和状态已保存到: {output_path}")
        return output_path
    
    @classmethod
    def load(cls, filename: str) -> 'StagedConstructionAnalysis':
        """
        从文件加载分析配置和状态
        
        参数:
            filename: 文件路径
            
        返回:
            StagedConstructionAnalysis对象
        """
        with open(filename, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        # 创建对象
        analysis = cls(
            project_id=data["project_id"],
            model_file=data["model_file"],
            work_dir=os.path.dirname(filename),
            config=data.get("config", {})
        )
        
        # 加载阶段
        for stage_data in data.get("stages", []):
            stage = ConstructionStage.from_dict(stage_data)
            analysis.stages.append(stage)
            
        # 加载分析状态
        analysis.analysis_status = data.get("analysis_status", {})
        
        logger.info(f"从文件加载分析配置和状态: {filename}")
        return analysis
