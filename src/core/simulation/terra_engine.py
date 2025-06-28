"""
@file terra_engine.py
@description Terra计算引擎实现
@author Deep Excavation Team
@version 1.0.0
@copyright 2025
"""

import os
import sys
import logging
import json
import tempfile
import uuid
from typing import Dict, Any, List, Optional, Tuple, Union
import shutil
import time

# 导入基础接口
from .compute_base import (ComputeBase, AnalysisType, MaterialModelType, ElementType,
                           LoadType, BoundaryType, SolverType, ResultType)

# 导入Terra包装器
from .terra_wrapper import TerraWrapper, KRATOS_AVAILABLE

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("TerraEngine")

class TerraEngine(ComputeBase):
    """Terra计算引擎实现，基于TerraWrapper和ComputeBase接口"""
    
    def __init__(self, work_dir: Optional[str] = None, terra_path: Optional[str] = None):
        """初始化Terra计算引擎
        
        Args:
            work_dir: 工作目录，用于存放临时文件
            terra_path: Terra执行文件路径
        """
        super().__init__(work_dir)
        
        # 创建Terra包装器
        try:
            self.wrapper = TerraWrapper(terra_path)
            self.use_kratos = KRATOS_AVAILABLE
            logger.info(f"创建Terra包装器成功，使用Kratos: {self.use_kratos}")
        except Exception as e:
            logger.error(f"创建Terra包装器失败: {e}")
            raise
        
        # 初始化任务字典
        self.tasks = {}
    
    def load_mesh(self, mesh_file: str) -> bool:
        """加载网格文件
        
        Args:
            mesh_file: 网格文件路径
            
        Returns:
            bool: 是否加载成功
        """
        try:
            # 检查文件是否存在
            if not os.path.exists(mesh_file):
                logger.error(f"网格文件不存在: {mesh_file}")
                return False
            
            # 设置网格
            self.wrapper.set_mesh(mesh_file)
            self.mesh_file = mesh_file
            logger.info(f"加载网格文件成功: {mesh_file}")
            return True
        except Exception as e:
            logger.error(f"加载网格文件失败: {e}")
            return False
    
    def set_analysis_type(self, task_id: str, analysis_type: Union[AnalysisType, str]) -> bool:
        """设置分析类型
        
        Args:
            task_id: 任务ID
            analysis_type: 分析类型
            
        Returns:
            bool: 是否设置成功
        """
        try:
            # 检查任务是否存在
            if task_id not in self.tasks:
                # 创建新任务
                task_path = os.path.join(self.work_dir, task_id)
                os.makedirs(task_path, exist_ok=True)
                
                # 初始化任务数据
                self.tasks[task_id] = {
                    "id": task_id,
                    "path": task_path,
                    "model_file": None,
                    "result_file": None,
                    "mesh_file": self.mesh_file,
                    "settings": {},
                    "status": "initialized",
                    "progress": 0,
                    "materials": {},
                    "boundaries": {},
                    "loads": {},
                    "stages": [],
                    "results": {}
                }
                
                # 创建模型
                model_name = f"model_{task_id}"
                model_file = self.wrapper.create_model(model_name, task_path)
                self.tasks[task_id]["model_file"] = model_file
            
            # 转换分析类型
            if isinstance(analysis_type, str):
                try:
                    analysis_type = AnalysisType(analysis_type)
                except ValueError:
                    analysis_type = AnalysisType.STATIC
            
            # 获取模型数据
            model_file = self.tasks[task_id]["model_file"]
            with open(model_file, 'r', encoding='utf-8') as f:
                model_data = json.load(f)
            
            # 设置分析类型
            model_data["analysis_type"] = analysis_type.value
            
            # 保存模型数据
            with open(model_file, 'w', encoding='utf-8') as f:
                json.dump(model_data, f, indent=2)
            
            # 更新任务设置
            self.tasks[task_id]["settings"]["analysis_type"] = analysis_type.value
            logger.info(f"任务 {task_id} 设置分析类型: {analysis_type.value}")
            return True
        except Exception as e:
            logger.error(f"设置分析类型失败: {e}")
            return False
    
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
        try:
            # 检查任务是否存在
            if task_id not in self.tasks:
                logger.error(f"任务不存在: {task_id}")
                return ""
            
            # 转换材料类型
            if isinstance(material_type, str):
                try:
                    material_type = MaterialModelType(material_type)
                except ValueError:
                    material_type = MaterialModelType.LINEAR_ELASTIC
            
            # 生成材料ID
            material_id = str(uuid.uuid4())
            
            # Terra包装器添加土层材料
            self.wrapper.add_soil_layer(name, material_type.value, parameters, 
                                       group_id=group_ids[0] if group_ids else None)
            
            # 保存材料
            self.tasks[task_id]["materials"][material_id] = {
                "id": material_id,
                "name": name,
                "type": material_type.value,
                "parameters": parameters,
                "group_ids": group_ids
            }
            
            logger.info(f"任务 {task_id} 添加材料 {name}, 类型: {material_type.value}")
            return material_id
        except Exception as e:
            logger.error(f"添加材料失败: {e}")
            return ""
    
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
        try:
            # 检查任务是否存在
            if task_id not in self.tasks:
                logger.error(f"任务不存在: {task_id}")
                return False
            
            # 转换单元类型
            if isinstance(element_type, str):
                try:
                    element_type = ElementType(element_type)
                except ValueError:
                    element_type = ElementType.SOLID
            
            # 读取模型文件
            model_file = self.tasks[task_id]["model_file"]
            with open(model_file, 'r', encoding='utf-8') as f:
                model_data = json.load(f)
            
            # 设置单元类型
            if "element_types" not in model_data:
                model_data["element_types"] = []
            
            element_info = {
                "type": element_type.value,
                "group_ids": group_ids
            }
            
            model_data["element_types"].append(element_info)
            
            # 保存模型文件
            with open(model_file, 'w', encoding='utf-8') as f:
                json.dump(model_data, f, indent=2)
            
            # 更新任务设置
            if "element_types" not in self.tasks[task_id]:
                self.tasks[task_id]["element_types"] = []
                
            self.tasks[task_id]["element_types"].append(element_info)
            
            logger.info(f"任务 {task_id} 设置单元类型: {element_type.value}")
            return True
        except Exception as e:
            logger.error(f"设置单元类型失败: {e}")
            return False
    
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
        try:
            # 检查任务是否存在
            if task_id not in self.tasks:
                logger.error(f"任务不存在: {task_id}")
                return ""
            
            # 转换边界条件类型
            if isinstance(bc_type, str):
                try:
                    bc_type = BoundaryType(bc_type)
                except ValueError:
                    bc_type = BoundaryType.FIXED
            
            # 生成边界条件ID
            bc_id = str(uuid.uuid4())
            
            # Terra包装器添加边界条件
            self.wrapper.add_boundary_condition(bc_type.value, entities, values)
            
            # 保存边界条件
            self.tasks[task_id]["boundaries"][bc_id] = {
                "id": bc_id,
                "type": bc_type.value,
                "entities": entities,
                "values": values
            }
            
            logger.info(f"任务 {task_id} 添加边界条件, 类型: {bc_type.value}")
            return bc_id
        except Exception as e:
            logger.error(f"添加边界条件失败: {e}")
            return ""
    
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
        try:
            # 检查任务是否存在
            if task_id not in self.tasks:
                logger.error(f"任务不存在: {task_id}")
                return ""
            
            # 转换荷载类型
            if isinstance(load_type, str):
                try:
                    load_type = LoadType(load_type)
                except ValueError:
                    load_type = LoadType.BODY_FORCE
            
            # 生成荷载ID
            load_id = str(uuid.uuid4())
            
            # Terra包装器添加荷载
            # 在此实现荷载添加...
            
            # 读取模型文件
            model_file = self.tasks[task_id]["model_file"]
            with open(model_file, 'r', encoding='utf-8') as f:
                model_data = json.load(f)
            
            # 添加荷载
            if "loads" not in model_data:
                model_data["loads"] = []
            
            load_info = {
                "id": load_id,
                "type": load_type.value,
                "entities": entities,
                "values": values,
                "stage": stage
            }
            
            model_data["loads"].append(load_info)
            
            # 保存模型文件
            with open(model_file, 'w', encoding='utf-8') as f:
                json.dump(model_data, f, indent=2)
            
            # 保存荷载
            self.tasks[task_id]["loads"][load_id] = load_info
            
            logger.info(f"任务 {task_id} 添加荷载, 类型: {load_type.value}")
            return load_id
        except Exception as e:
            logger.error(f"添加荷载失败: {e}")
            return ""
    
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
        try:
            # 检查任务是否存在
            if task_id not in self.tasks:
                logger.error(f"任务不存在: {task_id}")
                return -1
            
            # Terra包装器添加开挖阶段
            self.wrapper.add_excavation_stage(name, elements, water_level, time_step)
            
            # 读取模型文件
            model_file = self.tasks[task_id]["model_file"]
            with open(model_file, 'r', encoding='utf-8') as f:
                model_data = json.load(f)
            
            # 添加开挖阶段
            if "excavation_stages" not in model_data:
                model_data["excavation_stages"] = []
            
            stage_info = {
                "name": name,
                "elements": elements,
                "water_level": water_level,
                "time_step": time_step
            }
            
            model_data["excavation_stages"].append(stage_info)
            
            # 保存模型文件
            with open(model_file, 'w', encoding='utf-8') as f:
                json.dump(model_data, f, indent=2)
            
            # 保存开挖阶段
            self.tasks[task_id]["stages"].append(stage_info)
            
            logger.info(f"任务 {task_id} 添加开挖阶段: {name}")
            return len(self.tasks[task_id]["stages"]) - 1
        except Exception as e:
            logger.error(f"添加开挖阶段失败: {e}")
            return -1
    
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
        try:
            # 检查任务是否存在
            if task_id not in self.tasks:
                logger.error(f"任务不存在: {task_id}")
                return False
            
            # 转换求解器类型
            if isinstance(solver_type, str):
                try:
                    solver_type = SolverType(solver_type)
                except ValueError:
                    solver_type = SolverType.DIRECT
            
            # 读取模型文件
            model_file = self.tasks[task_id]["model_file"]
            with open(model_file, 'r', encoding='utf-8') as f:
                model_data = json.load(f)
            
            # 设置求解器参数
            if "solver_settings" not in model_data:
                model_data["solver_settings"] = {}
            
            model_data["solver_settings"]["type"] = solver_type.value
            model_data["solver_settings"].update(settings)
            
            # 保存模型文件
            with open(model_file, 'w', encoding='utf-8') as f:
                json.dump(model_data, f, indent=2)
            
            # 更新任务设置
            if "solver_settings" not in self.tasks[task_id]:
                self.tasks[task_id]["solver_settings"] = {}
                
            self.tasks[task_id]["solver_settings"]["type"] = solver_type.value
            self.tasks[task_id]["solver_settings"].update(settings)
            
            logger.info(f"任务 {task_id} 设置求解器参数, 类型: {solver_type.value}")
            return True
        except Exception as e:
            logger.error(f"设置求解器参数失败: {e}")
            return False
    
    def run_analysis(self, task_id: str, num_threads: Optional[int] = None) -> bool:
        """运行分析
        
        Args:
            task_id: 任务ID
            num_threads: 线程数
            
        Returns:
            bool: 是否分析成功
        """
        try:
            # 检查任务是否存在
            if task_id not in self.tasks:
                logger.error(f"任务不存在: {task_id}")
                return False
            
            # 更新任务状态
            self.tasks[task_id]["status"] = "running"
            self.tasks[task_id]["progress"] = 0
            self.tasks[task_id]["started_at"] = time.time()
            
            # 运行分析
            result = self.wrapper.run_analysis(num_threads)
            self.tasks[task_id]["result_file"] = self.wrapper.result_file
            
            # 更新任务状态
            if result:
                self.tasks[task_id]["status"] = "completed"
                self.tasks[task_id]["completed_at"] = time.time()
                self.tasks[task_id]["progress"] = 100
                logger.info(f"任务 {task_id} 计算完成")
                return True
            else:
                self.tasks[task_id]["status"] = "failed"
                self.tasks[task_id]["error"] = "计算失败"
                self.tasks[task_id]["completed_at"] = time.time()
                logger.error(f"任务 {task_id} 计算失败")
                return False
        except Exception as e:
            logger.error(f"运行分析失败: {e}")
            # 更新任务状态
            if task_id in self.tasks:
                self.tasks[task_id]["status"] = "failed"
                self.tasks[task_id]["error"] = str(e)
                self.tasks[task_id]["completed_at"] = time.time()
            return False
    
    def get_status(self, task_id: str) -> Dict[str, Any]:
        """获取计算任务状态
        
        Args:
            task_id: 任务ID
            
        Returns:
            Dict[str, Any]: 任务状态信息
        """
        if task_id not in self.tasks:
            logger.warning(f"任务不存在: {task_id}")
            return {}
            
        # 返回任务状态
        status_info = {
            "id": task_id,
            "status": self.tasks[task_id]["status"],
            "progress": self.tasks[task_id]["progress"],
            "started_at": self.tasks[task_id].get("started_at"),
            "completed_at": self.tasks[task_id].get("completed_at"),
            "error": self.tasks[task_id].get("error")
        }
        
        return status_info
    
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
        try:
            # 检查任务是否存在
            if task_id not in self.tasks:
                logger.error(f"任务不存在: {task_id}")
                return {}
            
            # 检查任务是否已完成
            if self.tasks[task_id]["status"] != "completed":
                logger.warning(f"任务 {task_id} 未完成，无法获取结果")
                return {}
            
            # 转换结果类型
            if isinstance(result_type, str):
                try:
                    result_type = ResultType(result_type)
                except ValueError:
                    result_type = ResultType.DISPLACEMENT
            
            # 使用Terra包装器获取结果
            result_data = self.wrapper.get_results(result_type.value, stage)
            
            # 缓存结果
            result_key = f"{result_type.value}_{stage if stage is not None else 'all'}"
            self.tasks[task_id]["results"][result_key] = result_data
            
            return result_data
        except Exception as e:
            logger.error(f"获取计算结果失败: {e}")
            return {}
    
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
        try:
            # 检查任务是否存在
            if task_id not in self.tasks:
                logger.error(f"任务不存在: {task_id}")
                return ""
            
            # 检查任务是否已完成
            if self.tasks[task_id]["status"] != "completed":
                logger.warning(f"任务 {task_id} 未完成，无法导出结果")
                return ""
            
            # 确保输出目录存在
            output_dir = os.path.dirname(output_file)
            if output_dir and not os.path.exists(output_dir):
                os.makedirs(output_dir)
            
            # 使用Terra包装器导出结果
            if format.lower() == "vtk":
                result_file = self.wrapper.export_vtk(output_file, stage)
            else:
                logger.warning(f"不支持的导出格式: {format}")
                return ""
            
            logger.info(f"任务 {task_id} 导出结果成功: {result_file}")
            return result_file
        except Exception as e:
            logger.error(f"导出结果失败: {e}")
            return ""
    
    def import_model(self, input_file: str, format: str) -> str:
        """导入模型
        
        Args:
            input_file: 输入文件路径
            format: 输入格式
            
        Returns:
            str: 任务ID
        """
        try:
            # 检查文件是否存在
            if not os.path.exists(input_file):
                logger.error(f"输入文件不存在: {input_file}")
                return ""
            
            # 创建任务ID
            task_id = self.create_task_id()
            task_path = os.path.join(self.work_dir, task_id)
            os.makedirs(task_path, exist_ok=True)
            
            # 根据不同格式导入模型
            if format.lower() == "midas_fpn":
                # 模拟导入Midas FPN文件
                model_file = self._import_midas_fpn(input_file, task_id, task_path)
            elif format.lower() == "abaqus_inp":
                # 模拟导入Abaqus INP文件
                model_file = self._import_abaqus_inp(input_file, task_id, task_path)
            else:
                logger.warning(f"不支持的导入格式: {format}")
                return ""
            
            # 初始化任务数据
            self.tasks[task_id] = {
                "id": task_id,
                "path": task_path,
                "model_file": model_file,
                "result_file": None,
                "mesh_file": None,  # 导入时可能会自动设置网格
                "settings": {},
                "status": "initialized",
                "progress": 0,
                "materials": {},
                "boundaries": {},
                "loads": {},
                "stages": [],
                "results": {},
                "import_info": {
                    "file": input_file,
                    "format": format
                }
            }
            
            logger.info(f"导入模型成功，创建任务: {task_id}, 格式: {format}")
            return task_id
        except Exception as e:
            logger.error(f"导入模型失败: {e}")
            return ""
    
    def _import_midas_fpn(self, input_file: str, task_id: str, task_path: str) -> str:
        """导入Midas FPN文件
        
        Args:
            input_file: 输入文件路径
            task_id: 任务ID
            task_path: 任务路径
            
        Returns:
            str: 模型文件路径
        """
        # 在实际实现中，这里应该解析Midas FPN文件
        # 这里只是简单模拟
        
        # 创建Terra模型
        model_name = f"model_{task_id}_midas"
        model_file = os.path.join(task_path, f"{model_name}.json")
        
        # 模拟创建基本模型结构
        model_data = {
            "name": model_name,
            "import_source": "midas_fpn",
            "import_file": input_file,
            "mesh_file": None,
            "analysis_type": "static",
            "soil_layers": [],
            "boundary_conditions": [],
            "loads": [],
            "excavation_stages": [],
            "output_requests": ["displacement", "stress", "strain"]
        }
        
        # 保存模型文件
        with open(model_file, 'w', encoding='utf-8') as f:
            json.dump(model_data, f, indent=2)
        
        logger.info(f"导入Midas FPN文件: {input_file}, 创建模型: {model_file}")
        return model_file
    
    def _import_abaqus_inp(self, input_file: str, task_id: str, task_path: str) -> str:
        """导入Abaqus INP文件
        
        Args:
            input_file: 输入文件路径
            task_id: 任务ID
            task_path: 任务路径
            
        Returns:
            str: 模型文件路径
        """
        # 在实际实现中，这里应该解析Abaqus INP文件
        # 这里只是简单模拟
        
        # 创建Terra模型
        model_name = f"model_{task_id}_abaqus"
        model_file = os.path.join(task_path, f"{model_name}.json")
        
        # 模拟创建基本模型结构
        model_data = {
            "name": model_name,
            "import_source": "abaqus_inp",
            "import_file": input_file,
            "mesh_file": None,
            "analysis_type": "static",
            "soil_layers": [],
            "boundary_conditions": [],
            "loads": [],
            "excavation_stages": [],
            "output_requests": ["displacement", "stress", "strain"]
        }
        
        # 保存模型文件
        with open(model_file, 'w', encoding='utf-8') as f:
            json.dump(model_data, f, indent=2)
        
        logger.info(f"导入Abaqus INP文件: {input_file}, 创建模型: {model_file}")
        return model_file
    
    def export_model(self, task_id: str, output_file: str, format: str) -> str:
        """导出模型
        
        Args:
            task_id: 任务ID
            output_file: 输出文件路径
            format: 输出格式
            
        Returns:
            str: 输出文件路径
        """
        try:
            # 检查任务是否存在
            if task_id not in self.tasks:
                logger.error(f"任务不存在: {task_id}")
                return ""
            
            # 确保输出目录存在
            output_dir = os.path.dirname(output_file)
            if output_dir and not os.path.exists(output_dir):
                os.makedirs(output_dir)
            
            # 根据不同格式导出模型
            if format.lower() == "terra_json":
                # 直接复制已有的模型文件
                model_file = self.tasks[task_id]["model_file"]
                shutil.copy(model_file, output_file)
            elif format.lower() == "midas_fpn":
                # 模拟导出Midas FPN文件
                self._export_midas_fpn(task_id, output_file)
            elif format.lower() == "abaqus_inp":
                # 模拟导出Abaqus INP文件
                self._export_abaqus_inp(task_id, output_file)
            else:
                logger.warning(f"不支持的导出格式: {format}")
                return ""
            
            logger.info(f"导出模型成功: {output_file}, 格式: {format}")
            return output_file
        except Exception as e:
            logger.error(f"导出模型失败: {e}")
            return ""
    
    def _export_midas_fpn(self, task_id: str, output_file: str) -> bool:
        """导出Midas FPN文件
        
        Args:
            task_id: 任务ID
            output_file: 输出文件路径
            
        Returns:
            bool: 是否导出成功
        """
        # 在实际实现中，这里应该生成Midas FPN文件
        # 这里只是简单模拟
        try:
            # 读取模型文件
            model_file = self.tasks[task_id]["model_file"]
            with open(model_file, 'r', encoding='utf-8') as f:
                model_data = json.load(f)
            
            # 创建简单的FPN文本
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(f"*VERSION\n7.5.0\n\n")
                f.write(f"*UNIT\nN, M, KG, SEC\n\n")
                f.write(f"*TITLE\n{model_data['name']}\n\n")
                
                # 可以根据模型数据生成更多FPN内容
                # ...
                
            logger.info(f"导出Midas FPN文件: {output_file}")
            return True
        except Exception as e:
            logger.error(f"导出Midas FPN文件失败: {e}")
            return False
    
    def _export_abaqus_inp(self, task_id: str, output_file: str) -> bool:
        """导出Abaqus INP文件
        
        Args:
            task_id: 任务ID
            output_file: 输出文件路径
            
        Returns:
            bool: 是否导出成功
        """
        # 在实际实现中，这里应该生成Abaqus INP文件
        # 这里只是简单模拟
        try:
            # 读取模型文件
            model_file = self.tasks[task_id]["model_file"]
            with open(model_file, 'r', encoding='utf-8') as f:
                model_data = json.load(f)
            
            # 创建简单的INP文本
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(f"*HEADING\n")
                f.write(f"MODEL: {model_data['name']}\n")
                f.write(f"TERRA EXPORT\n\n")
                
                # 可以根据模型数据生成更多INP内容
                # ...
                
            logger.info(f"导出Abaqus INP文件: {output_file}")
            return True
        except Exception as e:
            logger.error(f"导出Abaqus INP文件失败: {e}")
            return False 