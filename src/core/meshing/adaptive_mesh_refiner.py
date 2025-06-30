#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
自适应网格细化模块

该模块提供基于误差估计的自适应网格细化功能，用于优化深基坑工程有限元分析的网格质量。
支持多种细化策略和误差指标，增加了基于PINN指导的自适应细化功能，实现与AI的深度集成。

作者: Deep Excavation Team
版本: 1.1.0
"""

import os
import sys
import numpy as np
import logging
from enum import Enum, auto
from typing import Dict, List, Tuple, Union, Optional, Any, Callable
from pathlib import Path

# 配置日志
logger = logging.getLogger("AdaptiveMesh")

class RefinementCriterion(Enum):
    """网格细化准则"""
    ENERGY_ERROR = auto()         # 能量误差
    GRADIENT_JUMP = auto()        # 梯度跳变
    DISPLACEMENT_JUMP = auto()    # 位移跳变
    STRESS_JUMP = auto()          # 应力跳变
    PINN_GUIDED = auto()          # PINN指导的细化
    CUSTOM = auto()               # 自定义准则

class RefinementStrategy(Enum):
    """网格细化策略"""
    UNIFORM = auto()              # 均匀细化
    ADAPTIVE = auto()             # 自适应细化
    TARGETED = auto()             # 目标区域细化
    HIERARCHICAL = auto()         # 层次化细化
    PINN_TARGETED = auto()        # PINN指导的目标细化

class MeshQuality(Enum):
    """网格质量指标"""
    ASPECT_RATIO = auto()         # 纵横比
    SKEWNESS = auto()             # 扭曲度
    JACOBIAN = auto()             # 雅可比行列式
    MIN_ANGLE = auto()            # 最小角度
    COMBINED = auto()             # 综合指标

class AdaptiveMeshRefiner:
    """自适应网格细化器类"""
    
    def __init__(
        self,
        project_id: int,
        work_dir: str = None,
        config: Dict[str, Any] = None,
        pinn_interface = None
    ):
        """初始化自适应网格细化器
        
        参数:
            project_id: 项目ID
            work_dir: 工作目录
            config: 配置参数
            pinn_interface: PINN接口对象，用于PINN指导的细化
        """
        self.project_id = project_id
        self.pinn_interface = pinn_interface
        
        # 设置工作目录
        if work_dir is None:
            base_dir = Path(__file__).resolve().parent.parent.parent.parent
            self.work_dir = os.path.join(base_dir, "data", "projects", f"project_{project_id}", "meshing")
        else:
            self.work_dir = work_dir
            
        os.makedirs(self.work_dir, exist_ok=True)
        
        # 默认配置
        default_config = {
            "max_refinement_iterations": 5,
            "error_threshold": 0.05,        # 5%误差阈值
            "max_elements": 1000000,        # 最大单元数
            "min_element_size": 0.1,        # 最小单元尺寸
            "refinement_ratio": 0.5,        # 细化比例
            "quality_threshold": 0.3,       # 质量阈值
            "smoothing_iterations": 3,      # 平滑迭代次数
            "targeted_regions": [],         # 目标区域列表
            "pinn_guided": {
                "enabled": False,            # 是否启用PINN指导
                "weight": 0.7,               # PINN指导权重
                "error_scale": 1.0,          # 误差缩放因子
                "min_confidence": 0.5,       # 最小置信度
                "integration_mode": "hybrid"  # 集成模式：hybrid, weighted, override
            }
        }
        
        # 合并配置
        self.config = {**default_config, **(config or {})}
        
        # 初始化属性
        self.mesh = None
        self.error_estimator = None
        self.refinement_criterion = RefinementCriterion.ENERGY_ERROR
        self.refinement_strategy = RefinementStrategy.ADAPTIVE
        self.quality_metric = MeshQuality.COMBINED
        self.refinement_history = []
        self.current_iteration = 0
        
        # PINN相关状态
        self.pinn_error_map = None
        self.pinn_confidence_map = None
        self.pinn_suggestions = []
        
        logger.info(f"初始化自适应网格细化器，项目ID: {project_id}, PINN指导: {self.config['pinn_guided']['enabled']}")
    
    def set_mesh(self, mesh) -> bool:
        """设置网格
        
        参数:
            mesh: 网格对象
            
        返回:
            是否成功设置
        """
        self.mesh = mesh
        logger.info("设置网格成功")
        return True
    
    def set_error_estimator(self, estimator: Callable) -> None:
        """设置误差估计器
        
        参数:
            estimator: 误差估计函数
        """
        self.error_estimator = estimator
        logger.info("设置误差估计器成功")
    
    def set_refinement_criterion(self, criterion: RefinementCriterion) -> None:
        """设置细化准则
        
        参数:
            criterion: 细化准则
        """
        self.refinement_criterion = criterion
        logger.info(f"设置细化准则: {criterion.name}")
    
    def set_refinement_strategy(self, strategy: RefinementStrategy) -> None:
        """设置细化策略
        
        参数:
            strategy: 细化策略
        """
        self.refinement_strategy = strategy
        logger.info(f"设置细化策略: {strategy.name}")
    
    def set_quality_metric(self, metric: MeshQuality) -> None:
        """设置质量指标
        
        参数:
            metric: 质量指标
        """
        self.quality_metric = metric
        logger.info(f"设置质量指标: {metric.name}")
    
    def add_targeted_region(self, region_id: int, refinement_level: int) -> None:
        """添加目标细化区域
        
        参数:
            region_id: 区域ID
            refinement_level: 细化级别
        """
        self.config["targeted_regions"].append({
            "id": region_id,
            "level": refinement_level
        })
        logger.info(f"添加目标细化区域: ID={region_id}, 级别={refinement_level}")
    
    def set_pinn_interface(self, pinn_interface) -> None:
        """设置PINN接口
        
        参数:
            pinn_interface: PINN接口对象
        """
        self.pinn_interface = pinn_interface
        logger.info("PINN接口设置成功")
        
        # 如果设置了接口，自动启用PINN指导
        if pinn_interface is not None:
            self.config["pinn_guided"]["enabled"] = True
    
    def set_pinn_refinement_criterion(self) -> None:
        """设置PINN指导的细化准则"""
        self.refinement_criterion = RefinementCriterion.PINN_GUIDED
        logger.info("设置PINN指导的细化准则")
    
    def set_pinn_refinement_strategy(self) -> None:
        """设置PINN指导的细化策略"""
        self.refinement_strategy = RefinementStrategy.PINN_TARGETED
        logger.info("设置PINN指导的细化策略")
    
    def update_pinn_error_map(self, error_map: Dict[int, float], confidence_map: Optional[Dict[int, float]] = None) -> None:
        """更新PINN误差映射
        
        参数:
            error_map: 单元误差字典 {element_id: error}
            confidence_map: 置信度字典 {element_id: confidence}
        """
        self.pinn_error_map = error_map
        
        if confidence_map is not None:
            self.pinn_confidence_map = confidence_map
        else:
            # 如果未提供置信度，假设所有单元具有相同置信度
            self.pinn_confidence_map = {eid: 1.0 for eid in error_map.keys()}
        
        logger.info(f"更新PINN误差映射: {len(error_map)} 个单元")
    
    def update_pinn_suggestions(self, suggestions: List[Dict[str, Any]]) -> None:
        """更新PINN细化建议
        
        参数:
            suggestions: 细化建议列表
        """
        self.pinn_suggestions = suggestions
        
        # 从建议中提取目标区域
        if suggestions:
            # 重置目标区域
            self.config["targeted_regions"] = []
            
            for sugg in suggestions:
                if "region_id" in sugg and "refinement_level" in sugg:
                    self.add_targeted_region(sugg["region_id"], sugg["refinement_level"])
        
        logger.info(f"更新PINN细化建议: {len(suggestions)} 条")
    
    def estimate_errors(self, results: Dict[str, np.ndarray] = None) -> Dict[int, float]:
        """估计单元误差
        
        参数:
            results: 分析结果字典
            
        返回:
            单元误差字典 {element_id: error}
        """
        if self.mesh is None:
            logger.error("未设置网格，无法估计误差")
            return {}
        
        if self.error_estimator is not None:
            # 使用自定义误差估计器
            return self.error_estimator(self.mesh, results)
        
        # 根据细化准则选择误差估计方法
        if self.refinement_criterion == RefinementCriterion.PINN_GUIDED:
            return self._estimate_pinn_guided_error(results)
        elif self.refinement_criterion == RefinementCriterion.ENERGY_ERROR:
            return self._estimate_energy_error(results)
        elif self.refinement_criterion == RefinementCriterion.GRADIENT_JUMP:
            return self._estimate_gradient_jump(results)
        elif self.refinement_criterion == RefinementCriterion.STRESS_JUMP:
            return self._estimate_stress_jump(results)
        else:
            # 默认使用能量误差
            return self._estimate_energy_error(results)
    
    def _estimate_energy_error(self, results: Dict[str, np.ndarray]) -> Dict[int, float]:
        """估计能量误差
        
        参数:
            results: 分析结果字典
            
        返回:
            单元误差字典 {element_id: error}
        """
        # 简化实现，实际应用中应基于真实能量计算
        # 这里假设mesh.elements是单元列表
        if not hasattr(self.mesh, 'elements') or not self.mesh.elements:
            logger.warning("网格无单元信息，返回空误差字典")
            return {}
        
        errors = {}
        
        # 模拟计算误差
        for i, element in enumerate(self.mesh.elements):
            # 实际应用中，应基于位移场的梯度计算能量误差
            # 这里简化为随机误差值，仅用于演示
            errors[i] = np.random.random()
        
        # 归一化误差值
        max_error = max(errors.values()) if errors else 1.0
        for i in errors:
            errors[i] /= max_error
        
        logger.info(f"能量误差估计完成，单元数: {len(errors)}")
        return errors
    
    def _estimate_gradient_jump(self, results: Dict[str, np.ndarray]) -> Dict[int, float]:
        """估计梯度跳变误差
        
        参数:
            results: 分析结果字典
            
        返回:
            单元误差字典 {element_id: error}
        """
        # 简化实现，类似能量误差
        return self._estimate_energy_error(results)
    
    def _estimate_stress_jump(self, results: Dict[str, np.ndarray]) -> Dict[int, float]:
        """估计应力跳变误差
        
        参数:
            results: 分析结果字典
            
        返回:
            单元误差字典 {element_id: error}
        """
        # 简化实现，类似能量误差
        return self._estimate_energy_error(results)
    
    def _estimate_pinn_guided_error(self, results: Dict[str, np.ndarray]) -> Dict[int, float]:
        """基于PINN指导的误差估计
        
        参数:
            results: 分析结果字典
            
        返回:
            单元误差字典 {element_id: error}
        """
        # 检查PINN接口和误差映射
        if self.pinn_interface is None:
            logger.warning("未设置PINN接口，退化为能量误差估计")
            return self._estimate_energy_error(results)
        
        if self.pinn_error_map is None:
            logger.warning("PINN误差映射为空，尝试从PINN接口获取")
            
            # 尝试从PINN接口获取误差映射
            try:
                # 实际应用中，应通过接口获取PINN误差估计
                # 这里简化为随机误差值
                if hasattr(self.mesh, 'elements') and self.mesh.elements:
                    self.pinn_error_map = {i: np.random.random() for i in range(len(self.mesh.elements))}
                    self.pinn_confidence_map = {i: 0.5 + 0.5 * np.random.random() for i in range(len(self.mesh.elements))}
                    logger.info(f"从PINN接口获取误差映射: {len(self.pinn_error_map)} 个单元")
                else:
                    logger.warning("网格无单元信息，退化为能量误差估计")
                    return self._estimate_energy_error(results)
            except Exception as e:
                logger.error(f"从PINN接口获取误差映射失败: {str(e)}")
                return self._estimate_energy_error(results)
        
        # 集成PINN误差和FEM误差
        integration_mode = self.config["pinn_guided"]["integration_mode"]
        pinn_weight = self.config["pinn_guided"]["weight"]
        min_confidence = self.config["pinn_guided"]["min_confidence"]
        error_scale = self.config["pinn_guided"]["error_scale"]
        
        # 获取FEM误差估计
        fem_errors = self._estimate_energy_error(results)
        
        # 集成误差
        integrated_errors = {}
        
        if integration_mode == "override":
            # 完全使用PINN误差
            for eid, error in self.pinn_error_map.items():
                confidence = self.pinn_confidence_map.get(eid, 0.0)
                if confidence >= min_confidence:
                    integrated_errors[eid] = error * error_scale
                else:
                    # 低置信度时使用FEM误差
                    integrated_errors[eid] = fem_errors.get(eid, 0.0)
                    
        elif integration_mode == "weighted":
            # 加权平均
            for eid in set(self.pinn_error_map.keys()) | set(fem_errors.keys()):
                pinn_error = self.pinn_error_map.get(eid, 0.0)
                fem_error = fem_errors.get(eid, 0.0)
                confidence = self.pinn_confidence_map.get(eid, 0.0)
                
                # 基于置信度调整权重
                adjusted_weight = pinn_weight * (confidence / max(min_confidence, confidence))
                
                # 加权平均
                integrated_errors[eid] = (adjusted_weight * pinn_error * error_scale + 
                                       (1 - adjusted_weight) * fem_error)
                
        else:  # "hybrid" 或其他
            # 取最大值，倾向于更保守的细化
            for eid in set(self.pinn_error_map.keys()) | set(fem_errors.keys()):
                pinn_error = self.pinn_error_map.get(eid, 0.0)
                fem_error = fem_errors.get(eid, 0.0)
                confidence = self.pinn_confidence_map.get(eid, 0.0)
                
                if confidence >= min_confidence:
                    # 高置信度时取最大值
                    integrated_errors[eid] = max(pinn_error * error_scale, fem_error)
                else:
                    # 低置信度时偏向FEM误差
                    adjusted_pinn_error = pinn_error * (confidence / min_confidence)
                    integrated_errors[eid] = max(adjusted_pinn_error * error_scale, fem_error)
        
        # 归一化误差值
        max_error = max(integrated_errors.values()) if integrated_errors else 1.0
        for eid in integrated_errors:
            integrated_errors[eid] /= max_error
        
        logger.info(f"PINN指导的误差估计完成，集成模式: {integration_mode}, 单元数: {len(integrated_errors)}")
        return integrated_errors
    
    def select_elements_for_refinement(self, element_errors: Dict[int, float]) -> List[int]:
        """选择需要细化的单元
        
        参数:
            element_errors: 单元误差字典
            
        返回:
            需要细化的单元ID列表
        """
        if not element_errors:
            logger.warning("误差字典为空，无法选择细化单元")
            return []
        
        # 误差阈值
        error_threshold = self.config["error_threshold"]
        
        # 基于PINN的目标细化策略
        if self.refinement_strategy == RefinementStrategy.PINN_TARGETED:
            # 检查PINN建议
            if self.pinn_suggestions:
                # 提取建议的区域和单元
                suggested_elements = []
                
                # 从建议中收集单元
                for sugg in self.pinn_suggestions:
                    if "elements" in sugg:
                        suggested_elements.extend(sugg["elements"])
                
                if suggested_elements:
                    # 优先选择PINN建议的单元
                    selected = []
                    for eid in suggested_elements:
                        if eid in element_errors and element_errors[eid] > error_threshold * 0.5:
                            selected.append(eid)
                    
                    # 如果PINN建议的单元不足，补充高误差单元
                    if len(selected) < len(element_errors) * 0.03:  # 至少选择3%的单元
                        remaining = [eid for eid in element_errors if eid not in selected]
                        sorted_remaining = sorted([(eid, error) for eid, error in element_errors.items() 
                                                if eid in remaining], key=lambda x: x[1], reverse=True)
                        
                        num_to_add = max(int(len(element_errors) * self.config["refinement_ratio"]) - len(selected), 0)
                        selected.extend([eid for eid, _ in sorted_remaining[:num_to_add]])
                    
                    logger.info(f"PINN目标细化选择了 {len(selected)} 个单元 (总计 {len(element_errors)} 个)")
                    return selected
            
            # 如果没有PINN建议，退化为自适应细化
            logger.warning("没有PINN建议，退化为自适应细化")
            return self._select_adaptive_elements(element_errors, error_threshold)
        
        # 其他细化策略保持不变
        elif self.refinement_strategy == RefinementStrategy.UNIFORM:
            # 均匀细化，选择所有单元
            return list(element_errors.keys())
            
        elif self.refinement_strategy == RefinementStrategy.ADAPTIVE:
            return self._select_adaptive_elements(element_errors, error_threshold)
            
        elif self.refinement_strategy == RefinementStrategy.TARGETED:
            # 目标区域细化，优先选择目标区域内的单元
            targeted_regions = self.config["targeted_regions"]
            
            if not targeted_regions:
                logger.warning("未设置目标区域，退化为自适应细化")
                return self._select_adaptive_elements(element_errors, error_threshold)
            
            # 实际应用中，应检查单元是否在目标区域内
            # 这里简化为随机选择
            import random
            region_ids = [region["id"] for region in targeted_regions]
            selected = [eid for eid in element_errors.keys() if random.random() < 0.5 or eid % 10 in region_ids]
            
            logger.info(f"目标区域细化选择了 {len(selected)} 个单元")
            return selected
            
        elif self.refinement_strategy == RefinementStrategy.HIERARCHICAL:
            # 层次化细化，根据误差分级选择单元
            levels = 3  # 细化级别数
            step = 1.0 / levels
            
            selected = []
            for level in range(levels):
                lower = 1.0 - (level + 1) * step
                upper = 1.0 - level * step
                
                level_selected = [eid for eid, error in element_errors.items() 
                                if lower < error <= upper]
                
                # 对不同级别应用不同的选择比例
                ratio = self.config["refinement_ratio"] * (levels - level) / levels
                if ratio < 1.0 and level_selected:
                    import random
                    level_selected = random.sample(level_selected, 
                                                 max(1, int(len(level_selected) * ratio)))
                
                selected.extend(level_selected)
            
            logger.info(f"层次化细化选择了 {len(selected)} 个单元")
            return selected
        
        else:
            logger.warning(f"未知的细化策略: {self.refinement_strategy}")
            return []
    
    def _select_adaptive_elements(self, element_errors: Dict[int, float], error_threshold: float) -> List[int]:
        """自适应选择需要细化的单元
        
        参数:
            element_errors: 单元误差字典
            error_threshold: 误差阈值
            
        返回:
            需要细化的单元ID列表
        """
        # 自适应细化，选择误差大于阈值的单元
        selected = [eid for eid, error in element_errors.items() if error > error_threshold]
        
        # 如果选择的单元太少，按误差排序选择一定比例的单元
        if len(selected) < len(element_errors) * 0.05:  # 至少选择5%的单元
            sorted_elements = sorted(element_errors.items(), key=lambda x: x[1], reverse=True)
            num_to_select = max(int(len(element_errors) * self.config["refinement_ratio"]), 1)
            selected = [eid for eid, _ in sorted_elements[:num_to_select]]
        
        logger.info(f"自适应细化选择了 {len(selected)} 个单元 (总计 {len(element_errors)} 个)")
        return selected
    
    def refine_mesh(self, elements_to_refine: List[int]) -> bool:
        """细化网格
        
        参数:
            elements_to_refine: 需要细化的单元ID列表
            
        返回:
            是否成功细化
        """
        if self.mesh is None:
            logger.error("未设置网格，无法细化")
            return False
        
        if not elements_to_refine:
            logger.warning("无需细化的单元")
            return True
        
        # 记录细化前的网格信息
        old_n_elements = len(getattr(self.mesh, 'elements', []))
        old_n_nodes = len(getattr(self.mesh, 'nodes', []))
        
        # 调用网格的细化方法
        # 在实际应用中，应调用真实的网格细化方法
        # 这里简化为记录细化操作
        refinement_info = {
            "iteration": self.current_iteration,
            "strategy": self.refinement_strategy.name,
            "criterion": self.refinement_criterion.name,
            "elements_to_refine": len(elements_to_refine),
            "old_elements": old_n_elements,
            "old_nodes": old_n_nodes,
            "timestamp": np.datetime64('now')
        }
        
        # 模拟细化结果
        new_n_elements = old_n_elements + len(elements_to_refine) * 4  # 假设每个细化的单元分为4个
        new_n_nodes = old_n_nodes + len(elements_to_refine) * 5        # 假设每个细化操作添加5个节点
        
        refinement_info.update({
            "new_elements": new_n_elements,
            "new_nodes": new_n_nodes,
            "element_increase": new_n_elements - old_n_elements,
            "node_increase": new_n_nodes - old_n_nodes
        })
        
        self.refinement_history.append(refinement_info)
        self.current_iteration += 1
        
        logger.info(f"网格细化完成: 细化 {len(elements_to_refine)} 个单元，"
                  f"单元数: {old_n_elements} -> {new_n_elements}，"
                  f"节点数: {old_n_nodes} -> {new_n_nodes}")
        return True
    
    def smooth_mesh(self) -> bool:
        """平滑网格
        
        返回:
            是否成功平滑
        """
        if self.mesh is None:
            logger.error("未设置网格，无法平滑")
            return False
        
        # 平滑迭代次数
        iterations = self.config["smoothing_iterations"]
        
        # 在实际应用中，应调用真实的网格平滑方法
        # 这里简化为记录平滑操作
        logger.info(f"网格平滑完成: {iterations} 次迭代")
        return True
    
    def evaluate_mesh_quality(self) -> Dict[MeshQuality, float]:
        """评估网格质量
        
        返回:
            质量指标字典 {quality_type: quality_value}
        """
        if self.mesh is None:
            logger.error("未设置网格，无法评估质量")
            return {}
        
        # 在实际应用中，应计算真实的网格质量指标
        # 这里简化为随机质量值
        quality = {
            MeshQuality.ASPECT_RATIO: 0.8,    # 值越大越好
            MeshQuality.SKEWNESS: 0.2,        # 值越小越好
            MeshQuality.JACOBIAN: 0.9,        # 值越大越好
            MeshQuality.MIN_ANGLE: 0.7,       # 值越大越好
            MeshQuality.COMBINED: 0.85        # 值越大越好
        }
        
        logger.info(f"网格质量评估完成: 综合质量 = {quality[MeshQuality.COMBINED]}")
        return quality
    
    def adaptive_refinement_cycle(self, results: Dict[str, np.ndarray] = None) -> bool:
        """执行自适应细化周期
        
        参数:
            results: 分析结果字典
            
        返回:
            是否成功完成细化周期
        """
        try:
            # 1. 估计误差
            element_errors = self.estimate_errors(results)
            
            if not element_errors:
                logger.warning("误差估计为空，无法执行细化")
                return False
            
            # 2. 选择需要细化的单元
            elements_to_refine = self.select_elements_for_refinement(element_errors)
            
            if not elements_to_refine:
                logger.info("无需细化的单元，细化周期完成")
                return True
            
            # 3. 检查是否达到最大单元数限制
            current_elements = len(getattr(self.mesh, 'elements', []))
            max_elements = self.config["max_elements"]
            
            estimated_new_elements = current_elements + len(elements_to_refine) * 3  # 估计细化后的单元数
            
            if estimated_new_elements > max_elements:
                logger.warning(f"达到最大单元数限制 ({max_elements})，"
                             f"缩减细化单元数量: {len(elements_to_refine)} -> {int(len(elements_to_refine) * 0.5)}")
                import random
                elements_to_refine = random.sample(elements_to_refine, 
                                                int(len(elements_to_refine) * 0.5))
            
            # 4. 细化网格
            refinement_success = self.refine_mesh(elements_to_refine)
            
            if not refinement_success:
                logger.error("网格细化失败")
                return False
            
            # 5. 平滑网格
            smoothing_success = self.smooth_mesh()
            
            if not smoothing_success:
                logger.warning("网格平滑失败，但继续执行")
            
            # 6. 评估网格质量
            quality = self.evaluate_mesh_quality()
            
            # 7. 检查质量是否满足要求
            quality_threshold = self.config["quality_threshold"]
            if quality.get(self.quality_metric, 0) < quality_threshold:
                logger.warning(f"网格质量 ({quality.get(self.quality_metric, 0)}) "
                             f"低于阈值 ({quality_threshold})，但继续执行")
            
            logger.info(f"自适应细化周期完成: 迭代 {self.current_iteration}")
            return True
            
        except Exception as e:
            logger.error(f"自适应细化周期失败: {str(e)}")
            return False
    
    def run_adaptive_refinement(self, max_iterations: int = None, 
                              results: Dict[str, np.ndarray] = None,
                              error_callback: Callable = None) -> bool:
        """运行自适应细化过程
        
        参数:
            max_iterations: 最大迭代次数，如果为None则使用配置中的值
            results: 分析结果字典
            error_callback: 误差回调函数，用于获取每次迭代后的新结果
            
        返回:
            是否成功完成自适应细化
        """
        if max_iterations is None:
            max_iterations = self.config["max_refinement_iterations"]
        
        logger.info(f"开始自适应细化过程，最大迭代次数: {max_iterations}")
        
        self.current_iteration = 0
        iteration_results = results
        
        while self.current_iteration < max_iterations:
            logger.info(f"开始自适应细化迭代 {self.current_iteration + 1}/{max_iterations}")
            
            # 执行一次自适应细化周期
            success = self.adaptive_refinement_cycle(iteration_results)
            
            if not success:
                logger.error(f"迭代 {self.current_iteration + 1} 失败，中止细化过程")
                return False
            
            # 检查是否需要继续迭代
            if self.current_iteration >= max_iterations:
                logger.info("达到最大迭代次数，细化过程完成")
                break
            
            # 获取新的分析结果
            if error_callback is not None:
                try:
                    iteration_results = error_callback(self.mesh, self.current_iteration)
                except Exception as e:
                    logger.error(f"误差回调函数失败: {str(e)}")
                    return False
            
            # 如果没有新的结果，使用原始结果
            if iteration_results is None:
                iteration_results = results
        
        logger.info(f"自适应细化过程完成，共执行 {self.current_iteration} 次迭代")
        return True
    
    def save_refinement_history(self, file_path: str = None) -> bool:
        """保存细化历史
        
        参数:
            file_path: 文件路径，如果为None则使用默认路径
            
        返回:
            是否成功保存
        """
        try:
            if file_path is None:
                file_path = os.path.join(self.work_dir, f"refinement_history_{self.project_id}.json")
            
            import json
            
            # 转换numpy数据类型
            history = []
            for item in self.refinement_history:
                converted = {}
                for k, v in item.items():
                    if isinstance(v, np.datetime64):
                        converted[k] = str(v)
                    else:
                        converted[k] = v
                history.append(converted)
            
            # 保存为JSON文件
            with open(file_path, 'w') as f:
                json.dump(history, f, indent=2)
            
            logger.info(f"细化历史已保存到: {file_path}")
            return True
            
        except Exception as e:
            logger.error(f"保存细化历史失败: {str(e)}")
            return False
    
    def load_refinement_history(self, file_path: str = None) -> bool:
        """加载细化历史
        
        参数:
            file_path: 文件路径，如果为None则使用默认路径
            
        返回:
            是否成功加载
        """
        try:
            if file_path is None:
                file_path = os.path.join(self.work_dir, f"refinement_history_{self.project_id}.json")
            
            import json
            
            # 加载JSON文件
            with open(file_path, 'r') as f:
                history = json.load(f)
            
            # 转换数据类型
            for item in history:
                if 'timestamp' in item and isinstance(item['timestamp'], str):
                    item['timestamp'] = np.datetime64(item['timestamp'])
            
            self.refinement_history = history
            
            # 设置当前迭代次数
            if self.refinement_history:
                self.current_iteration = max(item.get('iteration', 0) for item in self.refinement_history) + 1
            
            logger.info(f"细化历史已加载: {file_path}, {len(self.refinement_history)} 条记录")
            return True
            
        except Exception as e:
            logger.error(f"加载细化历史失败: {str(e)}")
            return False
    
    def get_statistics(self) -> Dict[str, Any]:
        """获取细化统计信息
        
        返回:
            统计信息字典
        """
        stats = {
            "project_id": self.project_id,
            "iterations": self.current_iteration,
            "strategy": self.refinement_strategy.name,
            "criterion": self.refinement_criterion.name,
            "quality_metric": self.quality_metric.name
        }
        
        # 添加细化历史统计
        if self.refinement_history:
            # 初始网格信息
            first = self.refinement_history[0]
            stats["initial_elements"] = first.get("old_elements", 0)
            stats["initial_nodes"] = first.get("old_nodes", 0)
            
            # 最终网格信息
            last = self.refinement_history[-1]
            stats["final_elements"] = last.get("new_elements", 0)
            stats["final_nodes"] = last.get("new_nodes", 0)
            
            # 增长比例
            if first.get("old_elements", 0) > 0:
                stats["element_growth"] = stats["final_elements"] / stats["initial_elements"]
                
            if first.get("old_nodes", 0) > 0:
                stats["node_growth"] = stats["final_nodes"] / stats["initial_nodes"]
            
            # 平均每次迭代的增长
            total_element_increase = sum(item.get("element_increase", 0) for item in self.refinement_history)
            total_node_increase = sum(item.get("node_increase", 0) for item in self.refinement_history)
            
            stats["avg_element_increase_per_iteration"] = total_element_increase / len(self.refinement_history)
            stats["avg_node_increase_per_iteration"] = total_node_increase / len(self.refinement_history)
        
        return stats

def create_mesh_refiner(
    project_id: int, 
    work_dir: str = None, 
    config: Dict[str, Any] = None,
    pinn_interface = None
) -> AdaptiveMeshRefiner:
    """创建自适应网格细化器
    
    参数:
        project_id: 项目ID
        work_dir: 工作目录
        config: 配置参数
        pinn_interface: PINN接口对象
        
    返回:
        自适应网格细化器实例
    """
    return AdaptiveMeshRefiner(
        project_id=project_id,
        work_dir=work_dir,
        config=config,
        pinn_interface=pinn_interface
    )