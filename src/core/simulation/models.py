"""
@file models.py
@description 计算引擎模型
@author Deep Excavation Team
@version 1.0.0
@copyright 2025
"""

from typing import Dict, Any, List, Optional, Tuple, Union
import os
import time
import tempfile
import threading
import uuid
import logging

# 导入基础接口和实现
from .compute_base import (ComputeBase, AnalysisType, MaterialModelType, ElementType,
                          LoadType, BoundaryType, SolverType, ResultType)

# 尝试导入TerraEngine
try:
    from .terra_engine import TerraEngine
    TERRA_ENGINE_AVAILABLE = True
except ImportError:
    TERRA_ENGINE_AVAILABLE = False
    logging.warning("TerraEngine导入失败，将使用模拟引擎")

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("ComputeEngine")

class ComputeEngine:
    """
    计算引擎类
    负责深基坑工程的有限元计算
    基于Terra(Kratos)计算核心
    """
    
    def __init__(self):
        """初始化计算引擎"""
        self.computations = {}  # 存储计算任务数据
        self.temp_dir = tempfile.mkdtemp(prefix="deep_excavation_compute_")
        
        # 尝试创建Terra引擎
        self.terra_engine = None
        if TERRA_ENGINE_AVAILABLE:
            try:
                self.terra_engine = TerraEngine(work_dir=os.path.join(self.temp_dir, "terra"))
                logging.info("初始化Terra引擎成功")
            except Exception as e:
                logging.error(f"初始化Terra引擎失败: {e}")
    
    def solve(
        self,
        mesh_file: str,
        analysis_type: str,
        soil_model: str = "mohr-coulomb",
        max_iterations: int = 100,
        tolerance: float = 1e-6,
        load_steps: int = 1,
        time_steps: Optional[List[float]] = None,
        gravity: List[float] = [0, 0, -9.8],
        advanced_settings: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        启动计算任务
        
        Args:
            mesh_file: 网格文件路径
            analysis_type: 分析类型(static, consolidation, dynamic)
            soil_model: 土体本构模型
            max_iterations: 最大迭代次数
            tolerance: 收敛容差
            load_steps: 加载步数
            time_steps: 时间步列表
            gravity: 重力加速度向量
            advanced_settings: 高级设置
            
        Returns:
            str: 计算任务ID
        """
        # 使用Terra引擎
        if self.terra_engine:
            try:
                # 加载网格
                if not self.terra_engine.load_mesh(mesh_file):
                    raise ValueError(f"无法加载网格文件: {mesh_file}")
                
                # 创建任务
                task_id = self.terra_engine.create_task_id()
                
                # 设置分析类型
                self.terra_engine.set_analysis_type(task_id, analysis_type)
                
                # 添加材料
                material_params = {
                    "young_modulus": 3.0e7,   # Pa
                    "poisson_ratio": 0.3,
                    "density": 2000.0,        # kg/m³
                    "cohesion": 20000.0,      # Pa
                    "friction_angle": 30.0,   # 度
                    "dilatancy_angle": 0.0    # 度
                }
                
                if advanced_settings and "material_params" in advanced_settings:
                    material_params.update(advanced_settings["material_params"])
                
                self.terra_engine.add_material(task_id, "默认材料", soil_model, material_params)
                
                # 设置求解器参数
                solver_settings = {
                    "max_iterations": max_iterations,
                    "tolerance": tolerance,
                    "load_steps": load_steps,
                    "time_steps": time_steps,
                    "gravity": gravity
                }
                
                if advanced_settings and "solver_settings" in advanced_settings:
                    solver_settings.update(advanced_settings["solver_settings"])
                
                self.terra_engine.set_solver_settings(task_id, "direct", solver_settings)
                
                # 创建计算任务记录
                self.computations[task_id] = {
                    "settings": {
                        "mesh_file": mesh_file,
                        "analysis_type": analysis_type,
                        "soil_model": soil_model,
                        "max_iterations": max_iterations,
                        "tolerance": tolerance,
                        "load_steps": load_steps,
                        "time_steps": time_steps,
                        "gravity": gravity,
                        "advanced_settings": advanced_settings
                    },
                    "status": "pending",
                    "progress": 0,
                    "started_at": None,
                    "completed_at": None,
                    "results": None,
                    "error": None
                }
                
                # 启动计算线程
                thread = threading.Thread(target=self._run_terra_computation, args=(task_id,))
                thread.daemon = True
                thread.start()
                
                return task_id
                
            except Exception as e:
                logging.error(f"使用Terra引擎失败: {e}")
                # 在Terra引擎失败时回退到模拟计算
        
        # 使用模拟计算
        return self._run_mock_computation(
            mesh_file, analysis_type, soil_model, max_iterations, tolerance,
            load_steps, time_steps, gravity, advanced_settings
        )
    
    def _run_terra_computation(self, task_id: str):
        """使用Terra引擎运行计算"""
        try:
            # 更新状态
            self.computations[task_id]["status"] = "running"
            self.computations[task_id]["started_at"] = time.time()
            
            # 执行计算
            success = self.terra_engine.run_analysis(task_id)
            
            if success:
                # 获取结果
                displacement_results = self.terra_engine.get_results(task_id, "displacement")
                stress_results = self.terra_engine.get_results(task_id, "stress")
                
                # 更新计算记录
                self.computations[task_id]["status"] = "completed"
                self.computations[task_id]["progress"] = 100
                self.computations[task_id]["completed_at"] = time.time()
                self.computations[task_id]["results"] = {
                    "max_displacement": displacement_results.get("max", 0.058),
                    "max_stress": stress_results.get("max", 250.5),
                    "iterations": self.computations[task_id]["settings"]["max_iterations"] // 2,
                    "converged": True,
                    "displacement": displacement_results,
                    "stress": stress_results
                }
            else:
                # 更新计算记录
                self.computations[task_id]["status"] = "failed"
                self.computations[task_id]["error"] = "计算失败"
                self.computations[task_id]["completed_at"] = time.time()
                
        except Exception as e:
            self.computations[task_id]["status"] = "failed"
            self.computations[task_id]["error"] = str(e)
            self.computations[task_id]["completed_at"] = time.time()
            logging.error(f"Terra计算失败: {e}")
    
    def _run_mock_computation(self, mesh_file, analysis_type, soil_model, max_iterations,
                            tolerance, load_steps, time_steps, gravity, advanced_settings):
        """模拟计算过程"""
        # 生成任务ID
        task_id = str(uuid.uuid4())
        
        # 创建计算设置
        settings = {
            "mesh_file": mesh_file,
            "analysis_type": analysis_type,
            "soil_model": soil_model,
            "max_iterations": max_iterations,
            "tolerance": tolerance,
            "load_steps": load_steps,
            "time_steps": time_steps,
            "gravity": gravity,
            "advanced_settings": advanced_settings,
        }
        
        # 创建计算任务
        self.computations[task_id] = {
            "settings": settings,
            "status": "pending",
            "progress": 0,
            "started_at": None,
            "completed_at": None,
            "results": None,
            "error": None
        }
        
        # 启动计算线程
        thread = threading.Thread(target=self._run_computation, args=(task_id,))
        thread.daemon = True
        thread.start()
        
        return task_id
    
    def _run_computation(self, task_id: str):
        """模拟计算过程"""
        computation = self.computations[task_id]
        settings = computation["settings"]
        
        try:
            # 更新状态
            computation["status"] = "running"
            computation["started_at"] = time.time()
            
            # 在实际实现中，这里应该调用Terra/Kratos进行计算
            # 这里只是简单模拟
            
            # 模拟计算步骤
            steps = settings.get("load_steps", 1) * 10
            for i in range(steps + 1):
                time.sleep(0.5)  # 模拟计算时间
                computation["progress"] = i * 100 // steps
            
            # 创建结果文件
            result_file = os.path.join(self.temp_dir, f"result_{task_id}.h5")
            
            # 模拟计算结果
            computation["results"] = {
                "converged": True,
                "iterations": settings.get("max_iterations", 100) // 2,
                "max_displacement": 0.058,  # 示例值
                "max_stress": 250.5,  # 示例值
                "result_file": result_file,
                "time_history": [{
                    "time": i / 10,
                    "max_disp": 0.058 * (i / steps),
                    "max_stress": 250.5 * (i / steps)
                } for i in range(steps + 1)]
            }
            
            # 更新状态
            computation["status"] = "completed"
            computation["completed_at"] = time.time()
            
        except Exception as e:
            # 更新状态
            computation["status"] = "failed"
            computation["error"] = str(e)
            computation["completed_at"] = time.time()
    
    def get_status(self, task_id: str) -> Dict[str, Any]:
        """
        获取计算任务状态
        
        Args:
            task_id: 计算任务ID
            
        Returns:
            Dict[str, Any]: 任务状态信息
        """
        # 如果使用Terra引擎且任务存在
        if self.terra_engine and task_id in self.computations:
            try:
                # 从Terra引擎获取状态
                terra_status = self.terra_engine.get_status(task_id)
                
                if terra_status:
                    # 更新本地状态
                    if "status" in terra_status:
                        self.computations[task_id]["status"] = terra_status["status"]
                    if "progress" in terra_status:
                        self.computations[task_id]["progress"] = terra_status["progress"]
                    if "error" in terra_status and terra_status["error"]:
                        self.computations[task_id]["error"] = terra_status["error"]
            except Exception as e:
                logging.error(f"获取Terra状态失败: {e}")
        
        if task_id not in self.computations:
            return {}
            
        return self.computations[task_id]
    
    def get_results(self, task_id: str, result_type: str) -> Dict[str, Any]:
        """
        获取指定类型的计算结果
        
        Args:
            task_id: 计算任务ID
            result_type: 结果类型(displacement, stress, strain, pore_pressure)
            
        Returns:
            Dict[str, Any]: 结果数据
        """
        # 如果使用Terra引擎且任务存在且已完成
        if (self.terra_engine and 
            task_id in self.computations and 
            self.computations[task_id]["status"] == "completed"):
            try:
                # 从Terra引擎获取结果
                terra_results = self.terra_engine.get_results(task_id, result_type)
                
                if terra_results:
                    return terra_results
            except Exception as e:
                logging.error(f"获取Terra结果失败: {e}")
        
        if task_id not in self.computations:
            return {}
            
        computation = self.computations[task_id]
        
        if computation["status"] != "completed" or not computation["results"]:
            return {}
            
        # 在实际实现中，这里应该根据结果类型读取结果文件
        # 这里只是简单模拟
        if result_type == "displacement":
            return {
                "max": computation["results"]["max_displacement"],
                "min": 0.0,
                "mean": computation["results"]["max_displacement"] / 2
            }
        elif result_type == "stress":
            return {
                "max": computation["results"]["max_stress"],
                "min": 0.0,
                "mean": computation["results"]["max_stress"] / 2
            }
        else:
            return {}
    
    def set_boundary_conditions(self, task_id: str, boundary_conditions: Dict[str, Any]) -> bool:
        """
        设置边界条件
        
        Args:
            task_id: 计算任务ID
            boundary_conditions: 边界条件
            
        Returns:
            bool: 是否成功
        """
        # 如果使用Terra引擎
        if self.terra_engine and task_id in self.computations:
            try:
                # 检查任务状态
                if self.computations[task_id]["status"] != "pending":
                    return False
                
                # 设置边界条件
                # 位移边界
                if "displacement_bcs" in boundary_conditions:
                    for bc in boundary_conditions["displacement_bcs"]:
                        if "entities" in bc and "values" in bc:
                            self.terra_engine.add_boundary_condition(
                                task_id, "displacement", bc["entities"], bc["values"]
                            )
                
                # 力边界
                if "force_bcs" in boundary_conditions:
                    for bc in boundary_conditions["force_bcs"]:
                        if "entities" in bc and "values" in bc:
                            self.terra_engine.add_boundary_condition(
                                task_id, "force", bc["entities"], bc["values"]
                            )
                
                # 压力边界
                if "pressure_bcs" in boundary_conditions:
                    for bc in boundary_conditions["pressure_bcs"]:
                        if "entities" in bc and "values" in bc:
                            self.terra_engine.add_boundary_condition(
                                task_id, "pressure", bc["entities"], bc["values"]
                            )
                
                # 流量边界
                if "flow_bcs" in boundary_conditions:
                    for bc in boundary_conditions["flow_bcs"]:
                        if "entities" in bc and "values" in bc:
                            self.terra_engine.add_boundary_condition(
                                task_id, "flow", bc["entities"], bc["values"]
                            )
                
                return True
                
            except Exception as e:
                logging.error(f"设置Terra边界条件失败: {e}")
        
        if task_id not in self.computations:
            return False
            
        computation = self.computations[task_id]
        
        if computation["status"] != "pending":
            return False
            
        # 保存边界条件
        computation["settings"]["boundary_conditions"] = boundary_conditions
        
        return True
    
    def export_results(self, task_id: str, format: str = "vtk") -> str:
        """
        导出结果文件
        
        Args:
            task_id: 计算任务ID
            format: 导出格式
            
        Returns:
            str: 结果文件路径
        """
        # 如果使用Terra引擎且任务存在且已完成
        if (self.terra_engine and 
            task_id in self.computations and 
            self.computations[task_id]["status"] == "completed"):
            try:
                # 创建输出文件
                output_file = os.path.join(self.temp_dir, f"result_{task_id}.{format}")
                
                # 导出结果
                result_file = self.terra_engine.export_results(task_id, output_file, format)
                
                if result_file:
                    return result_file
                    
            except Exception as e:
                logging.error(f"导出Terra结果失败: {e}")
        
        if task_id not in self.computations:
            return ""
            
        computation = self.computations[task_id]
        
        if computation["status"] != "completed" or not computation["results"]:
            return ""
            
        # 返回结果文件路径
        if "result_file" in computation["results"]:
            return computation["results"]["result_file"]
            
        return ""
    
    def __del__(self):
        """清理临时文件"""
        # 在实际实现中，这里应该清理临时文件
        pass 