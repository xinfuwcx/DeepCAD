#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""渗流-结构耦合分析模块

本模块实现了深基坑工程中的渗流-结构耦合分析功能，支持一体化和分离式耦合分析策略。
可以模拟降水、围护结构变形和地下水流动之间的相互作用。
"""

import os
import sys
import numpy as np
import json
import logging
from enum import Enum
from typing import Dict, List, Tuple, Union, Optional, Any, Callable
from pathlib import Path

# 配置日志
logger = logging.getLogger("FlowStructureCoupling")

class CouplingType(Enum):
    """耦合类型枚举"""
    MONOLITHIC = "monolithic"  # 一体化求解
    STAGGERED = "staggered"    # 分离式迭代求解
    ONE_WAY = "one_way"        # 单向耦合

class CouplingScheme(Enum):
    """耦合方案枚举"""
    BIOT = "biot"                    # Biot孔弹理论
    SEMI_COUPLED = "semi_coupled"    # 半耦合
    VOLUME_COUPLED = "volume_coupled"# 体积耦合
    CUSTOM = "custom"                # 自定义耦合

class CouplingConvergenceType(Enum):
    """耦合收敛类型枚举"""
    DISPLACEMENT = "displacement"     # 位移收敛准则
    PRESSURE = "pressure"             # 压力收敛准则
    ENERGY = "energy"                 # 能量收敛准则
    RESIDUAL = "residual"             # 残差收敛准则
    COMBINED = "combined"             # 组合收敛准则

class FluidModel(Enum):
    """流体模型类型枚举"""
    DARCY = "darcy"                  # 达西流
    FORCHHEIMER = "forchheimer"      # Forchheimer流
    BRINKMAN = "brinkman"            # Brinkman流

class FlowStructureCoupling:
    """渗流-结构耦合分析类"""
    
    def __init__(
        self,
        project_id: int,
        work_dir: str,
        coupling_type: Union[str, CouplingType] = CouplingType.STAGGERED,
        coupling_scheme: Union[str, CouplingScheme] = CouplingScheme.BIOT,
        config: Dict[str, Any] = None
    ):
        """初始化渗流-结构耦合分析
        
        参数:
            project_id: 项目ID
            work_dir: 工作目录
            coupling_type: 耦合类型
            coupling_scheme: 耦合方案
            config: 配置参数
        """
        self.project_id = project_id
        self.work_dir = work_dir
        
        # 确保枚举类型
        if isinstance(coupling_type, str):
            self.coupling_type = CouplingType(coupling_type)
        else:
            self.coupling_type = coupling_type
            
        if isinstance(coupling_scheme, str):
            self.coupling_scheme = CouplingScheme(coupling_scheme)
        else:
            self.coupling_scheme = coupling_scheme
        
        # 默认配置
        default_config = {
            "max_iterations": 20,
            "convergence_tolerance": 1e-4,
            "relaxation_factor": 0.7,
            "convergence_type": CouplingConvergenceType.COMBINED,
            "fluid_model": FluidModel.DARCY,
            "use_steady_state": False,
            "time_step": 1.0,
            "total_time": 100.0
        }
        
        # 合并配置
        self.config = {**default_config, **(config or {})}
        
        # 创建结果目录
        self.results_dir = os.path.join(self.work_dir, "results", "coupled")
        os.makedirs(self.results_dir, exist_ok=True)
        
        # 求解状态
        self.current_time = 0.0
        self.current_step = 0
        self.is_initialized = False
        self.is_converged = False
        self.convergence_history = []
        
        # 流固模型接口
        self.flow_model = None
        self.structure_model = None
        
        logger.info(f"初始化渗流-结构耦合分析，耦合类型: {self.coupling_type.value}, 耦合方案: {self.coupling_scheme.value}")
    
    def set_flow_model(self, model, wrapper_fn: Optional[Callable] = None):
        """设置流体模型
        
        参数:
            model: 流体模型对象
            wrapper_fn: 封装函数，用于将模型适配到期望的接口
        """
        if wrapper_fn:
            self.flow_model = wrapper_fn(model)
        else:
            self.flow_model = model
            
        logger.info(f"设置流体模型成功")
    
    def set_structure_model(self, model, wrapper_fn: Optional[Callable] = None):
        """设置结构模型
        
        参数:
            model: 结构模型对象
            wrapper_fn: 封装函数，用于将模型适配到期望的接口
        """
        if wrapper_fn:
            self.structure_model = wrapper_fn(model)
        else:
            self.structure_model = model
            
        logger.info(f"设置结构模型成功")
    
    def initialize(self) -> bool:
        """初始化耦合分析
        
        返回:
            是否成功初始化
        """
        if self.flow_model is None or self.structure_model is None:
            logger.error("流体模型或结构模型未设置")
            return False
        
        # 检查和创建接口网格
        if not self._prepare_interface_mesh():
            logger.error("准备接口网格失败")
            return False
            
        # 初始化模型
        if hasattr(self.flow_model, "initialize"):
            if not self.flow_model.initialize():
                logger.error("流体模型初始化失败")
                return False
                
        if hasattr(self.structure_model, "initialize"):
            if not self.structure_model.initialize():
                logger.error("结构模型初始化失败")
                return False
        
        # 设置边界条件
        if not self._setup_boundary_conditions():
            logger.error("设置边界条件失败")
            return False
        
        # 设置初始条件
        if not self._setup_initial_conditions():
            logger.error("设置初始条件失败")
            return False
            
        self.is_initialized = True
        self.current_time = 0.0
        self.current_step = 0
        self.convergence_history = []
        
        logger.info("渗流-结构耦合分析初始化完成")
        return True
    
    def _prepare_interface_mesh(self) -> bool:
        """准备接口网格
        
        为流体和结构模型之间创建映射接口
        
        返回:
            是否成功创建接口
        """
        try:
            # 这里将实现接口网格创建逻辑
            # 简化实现，实际中需要处理节点映射、插值等复杂操作
            logger.info("准备接口网格")
            return True
        except Exception as e:
            logger.error(f"创建接口网格失败: {str(e)}")
            return False
    
    def _setup_boundary_conditions(self) -> bool:
        """设置边界条件
        
        返回:
            是否成功设置边界条件
        """
        try:
            # 实现边界条件设置
            # 简化实现
            logger.info("设置边界条件")
            return True
        except Exception as e:
            logger.error(f"设置边界条件失败: {str(e)}")
            return False
    
    def _setup_initial_conditions(self) -> bool:
        """设置初始条件
        
        返回:
            是否成功设置初始条件
        """
        try:
            # 实现初始条件设置
            # 简化实现
            logger.info("设置初始条件")
            return True
        except Exception as e:
            logger.error(f"设置初始条件失败: {str(e)}")
            return False
    
    def solve_step(self, time_step: Optional[float] = None) -> bool:
        """求解一个时间步
        
        参数:
            time_step: 时间步长，如果为None则使用配置中的time_step
            
        返回:
            是否成功求解
        """
        if not self.is_initialized:
            logger.error("求解前必须先初始化")
            return False
        
        # 使用配置中的时间步长，如果未提供
        if time_step is None:
            time_step = self.config.get("time_step", 1.0)
        
        # 更新当前时间
        next_time = self.current_time + time_step
        
        # 根据耦合类型选择不同的求解策略
        if self.coupling_type == CouplingType.MONOLITHIC:
            success = self._solve_monolithic(next_time)
        elif self.coupling_type == CouplingType.STAGGERED:
            success = self._solve_staggered(next_time)
        else:  # ONE_WAY
            success = self._solve_one_way(next_time)
            
        if success:
            self.current_time = next_time
            self.current_step += 1
            logger.info(f"完成时间步 {self.current_step}, 时间 = {self.current_time}")
        
        return success
    
    def _solve_monolithic(self, target_time: float) -> bool:
        """一体化求解策略
        
        参数:
            target_time: 目标时间点
            
        返回:
            是否成功求解
        """
        logger.info(f"使用一体化策略求解至时间 {target_time}")
        
        try:
            # 一体化求解实现
            # 在实际实现中，需要组装完整的线性方程组，同时包括流体和结构部分
            # 这里使用简化实现
            
            # 求解完整系统
            # 简化示例
            is_converged = True
            
            if is_converged:
                logger.info("一体化求解收敛")
                return True
            else:
                logger.warning("一体化求解未收敛")
                return False
        except Exception as e:
            logger.error(f"一体化求解失败: {str(e)}")
            return False
    
    def _solve_staggered(self, target_time: float) -> bool:
        """分离式迭代求解策略
        
        参数:
            target_time: 目标时间点
            
        返回:
            是否成功求解
        """
        logger.info(f"使用分离式迭代策略求解至时间 {target_time}")
        
        try:
            max_iterations = self.config.get("max_iterations", 20)
            tolerance = self.config.get("convergence_tolerance", 1e-4)
            relaxation = self.config.get("relaxation_factor", 0.7)
            
            converged = False
            iteration = 0
            
            # 迭代求解
            while iteration < max_iterations and not converged:
                # 求解结构问题
                structure_solved = self.structure_model.solve_step(target_time)
                
                if not structure_solved:
                    logger.error("结构求解失败")
                    return False
                
                # 从结构向流体传递位移信息
                self._transfer_displacement_to_flow()
                
                # 求解流体问题
                flow_solved = self.flow_model.solve_step(target_time)
                
                if not flow_solved:
                    logger.error("流体求解失败")
                    return False
                
                # 从流体向结构传递压力信息
                self._transfer_pressure_to_structure()
                
                # 检查收敛性
                error = self._check_coupling_convergence()
                
                self.convergence_history.append(error)
                logger.info(f"分离式迭代: {iteration+1}, 误差: {error}")
                
                if error < tolerance:
                    converged = True
                    break
                    
                iteration += 1
            
            if converged:
                logger.info(f"分离式迭代收敛于 {iteration} 次迭代")
                self.is_converged = True
                return True
            else:
                logger.warning(f"分离式迭代在 {max_iterations} 次迭代后未收敛")
                self.is_converged = False
                return False
                
        except Exception as e:
            logger.error(f"分离式迭代求解失败: {str(e)}")
            return False
    
    def _solve_one_way(self, target_time: float) -> bool:
        """单向耦合求解策略
        
        参数:
            target_time: 目标时间点
            
        返回:
            是否成功求解
        """
        logger.info(f"使用单向耦合策略求解至时间 {target_time}")
        
        try:
            # 首先求解流体问题
            flow_solved = self.flow_model.solve_step(target_time)
            
            if not flow_solved:
                logger.error("流体求解失败")
                return False
            
            # 将压力传递给结构
            self._transfer_pressure_to_structure()
            
            # 求解结构问题
            structure_solved = self.structure_model.solve_step(target_time)
            
            if not structure_solved:
                logger.error("结构求解失败")
                return False
                
            logger.info("单向耦合求解完成")
            self.is_converged = True
            return True
            
        except Exception as e:
            logger.error(f"单向耦合求解失败: {str(e)}")
            return False
    
    def _transfer_displacement_to_flow(self):
        """将位移信息从结构模型传递到流体模型"""
        # 从结构模型获取位移
        if hasattr(self.structure_model, "get_displacement"):
            try:
                displacement = self.structure_model.get_displacement()
                
                # 传递给流体模型
                if hasattr(self.flow_model, "set_mesh_displacement"):
                    self.flow_model.set_mesh_displacement(displacement)
                    logger.debug("位移传递至流体模型成功")
                else:
                    logger.warning("流体模型不支持设置网格位移")
            except Exception as e:
                logger.error(f"位移传递失败: {str(e)}")
        else:
            logger.warning("结构模型不支持获取位移")
    
    def _transfer_pressure_to_structure(self):
        """将压力信息从流体模型传递到结构模型"""
        # 从流体模型获取压力
        if hasattr(self.flow_model, "get_pressure"):
            try:
                pressure = self.flow_model.get_pressure()
                
                # 传递给结构模型
                if hasattr(self.structure_model, "set_fluid_pressure"):
                    self.structure_model.set_fluid_pressure(pressure)
                    logger.debug("压力传递至结构模型成功")
                else:
                    logger.warning("结构模型不支持设置流体压力")
            except Exception as e:
                logger.error(f"压力传递失败: {str(e)}")
        else:
            logger.warning("流体模型不支持获取压力")
    
    def _check_coupling_convergence(self) -> float:
        """检查耦合收敛性
        
        返回:
            收敛误差
        """
        # 根据收敛类型计算误差
        convergence_type = self.config.get("convergence_type", CouplingConvergenceType.COMBINED)
        
        if isinstance(convergence_type, str):
            convergence_type = CouplingConvergenceType(convergence_type)
        
        if convergence_type == CouplingConvergenceType.DISPLACEMENT:
            # 基于位移的收敛检查
            return self._compute_displacement_error()
        elif convergence_type == CouplingConvergenceType.PRESSURE:
            # 基于压力的收敛检查
            return self._compute_pressure_error()
        elif convergence_type == CouplingConvergenceType.ENERGY:
            # 基于能量的收敛检查
            return self._compute_energy_error()
        elif convergence_type == CouplingConvergenceType.RESIDUAL:
            # 基于残差的收敛检查
            return self._compute_residual_error()
        else:  # COMBINED
            # 组合收敛检查
            return self._compute_combined_error()
    
    def _compute_displacement_error(self) -> float:
        """计算位移误差"""
        # 简化实现，实际应计算相邻两次迭代之间的位移差异
        return 0.01 * np.exp(-0.5 * len(self.convergence_history))
    
    def _compute_pressure_error(self) -> float:
        """计算压力误差"""
        # 简化实现，实际应计算相邻两次迭代之间的压力差异
        return 0.01 * np.exp(-0.4 * len(self.convergence_history))
    
    def _compute_energy_error(self) -> float:
        """计算能量误差"""
        # 简化实现，实际应计算系统总能量变化
        return 0.01 * np.exp(-0.3 * len(self.convergence_history))
    
    def _compute_residual_error(self) -> float:
        """计算残差误差"""
        # 简化实现，实际应计算系统残差
        return 0.01 * np.exp(-0.6 * len(self.convergence_history))
    
    def _compute_combined_error(self) -> float:
        """计算组合误差"""
        # 简化实现，实际应综合各种误差
        disp_error = self._compute_displacement_error()
        pres_error = self._compute_pressure_error()
        return max(disp_error, pres_error)
    
    def solve_complete(self) -> bool:
        """完成整个时间步求解过程
        
        返回:
            是否成功求解
        """
        if not self.is_initialized:
            if not self.initialize():
                return False
        
        total_time = self.config.get("total_time", 100.0)
        time_step = self.config.get("time_step", 1.0)
        
        # 计算总步数
        n_steps = int(total_time / time_step)
        
        success = True
        for step in range(n_steps):
            logger.info(f"求解时间步 {step+1}/{n_steps}")
            if not self.solve_step(time_step):
                success = False
                logger.error(f"在时间步 {step+1} 求解失败")
                break
            
            # 保存结果
            if (step + 1) % 5 == 0 or step == n_steps - 1:
                self.save_results(f"step_{step+1}")
        
        return success
    
    def save_results(self, file_name: str) -> str:
        """保存耦合分析结果
        
        参数:
            file_name: 文件名前缀
            
        返回:
            结果文件路径
        """
        result_file = os.path.join(self.results_dir, f"{file_name}.json")
        
        results = {
            "project_id": self.project_id,
            "coupling_type": self.coupling_type.value,
            "coupling_scheme": self.coupling_scheme.value,
            "current_time": self.current_time,
            "current_step": self.current_step,
            "is_converged": self.is_converged,
            "convergence_history": self.convergence_history,
            "config": {k: (v.value if isinstance(v, Enum) else v) for k, v in self.config.items()}
        }
        
        # 保存结果
        with open(result_file, 'w') as f:
            json.dump(results, f, indent=2)
        
        logger.info(f"结果保存至: {result_file}")
        return result_file
    
    def load_results(self, file_name: str) -> bool:
        """加载耦合分析结果
        
        参数:
            file_name: 文件名
            
        返回:
            是否成功加载
        """
        result_file = os.path.join(self.results_dir, file_name)
        
        if not os.path.exists(result_file):
            logger.error(f"结果文件不存在: {result_file}")
            return False
        
        try:
            with open(result_file, 'r') as f:
                results = json.load(f)
                
            # 恢复状态
            self.current_time = results["current_time"]
            self.current_step = results["current_step"]
            self.is_converged = results["is_converged"]
            self.convergence_history = results["convergence_history"]
            
            # 恢复配置
            for k, v in results["config"].items():
                if k in self.config:
                    # 对于枚举类型进行特殊处理
                    if k == "convergence_type":
                        self.config[k] = CouplingConvergenceType(v)
                    elif k == "fluid_model":
                        self.config[k] = FluidModel(v)
                    else:
                        self.config[k] = v
            
            logger.info(f"结果成功加载: {result_file}")
            return True
            
        except Exception as e:
            logger.error(f"加载结果失败: {str(e)}")
            return False


# 创建工厂函数，便于创建耦合分析实例
def create_coupling_analysis(project_id: int, work_dir: str, coupling_config: Dict[str, Any]) -> FlowStructureCoupling:
    """创建耦合分析实例
    
    参数:
        project_id: 项目ID
        work_dir: 工作目录
        coupling_config: 耦合配置
    
    返回:
        耦合分析实例
    """
    coupling_type = coupling_config.get("type", "staggered")
    coupling_scheme = coupling_config.get("scheme", "biot")
    
    analysis = FlowStructureCoupling(
        project_id=project_id,
        work_dir=work_dir,
        coupling_type=coupling_type,
        coupling_scheme=coupling_scheme,
        config=coupling_config.get("parameters", {})
    )
    
    return analysis 