"""
@file iga_seepage_solver.py
@description IGA渗流分析求解器，基于Kratos ConvectionDiffusion应用
@author Deep Excavation Team
@version 1.0.0
@copyright 2025
"""

import os
import sys
import json
import numpy as np
import logging
from typing import Dict, Any, List, Optional, Union, Tuple

# 配置日志
logger = logging.getLogger(__name__)

try:
    # 确保Kratos在路径中
    kratos_root = os.getenv("KRATOS_ROOT", "../Kratos")
    sys.path.append(kratos_root)
    
    import KratosMultiphysics
    import KratosMultiphysics.ConvectionDiffusionApplication
    import KratosMultiphysics.StructuralMechanicsApplication
    
    HAS_KRATOS_CD = True
except ImportError:
    HAS_KRATOS_CD = False
    logger.warning("Kratos ConvectionDiffusion应用不可用")


class IGASeepageSolver:
    """IGA渗流分析求解器 - 用于饱和土渗流分析"""
    
    def __init__(self, output_dir: str = "./results"):
        """
        初始化IGA渗流求解器
        
        Args:
            output_dir: 结果输出目录
        """
        self.output_dir = output_dir
        
        if not HAS_KRATOS_CD:
            logger.warning("Kratos ConvectionDiffusion不可用，运行在模拟模式")
            return
        
        # 创建输出目录
        os.makedirs(output_dir, exist_ok=True)
        
        # 初始化模型
        self.model = KratosMultiphysics.Model()
        self.parameters = None
        self.analysis = None
        
        # 渗流分析特定参数
        self.permeability = None  # 渗透系数
        self.fluid_density = 1000.0  # 水密度 (kg/m³)
        self.gravity = 9.81  # 重力加速度 (m/s²)
        self.fluid_viscosity = 1e-3  # 水动力粘度 (Pa·s)
        
        logger.info("IGA渗流分析求解器初始化完成")
    
    def set_parameters_from_file(self, param_file: str) -> bool:
        """
        从文件加载参数
        
        Args:
            param_file: 参数文件路径
            
        Returns:
            bool: 是否成功加载参数
        """
        if not HAS_KRATOS_CD:
            return False
            
        try:
            with open(param_file, 'r') as f:
                parameters = KratosMultiphysics.Parameters(f.read())
            
            self.parameters = parameters
            return True
        except Exception as e:
            logger.error(f"加载参数失败: {e}")
            return False
    
    def set_material_properties(self, material_props: Dict[str, Any]) -> None:
        """
        设置材料属性
        
        Args:
            material_props: 材料属性字典，包含渗透系数等
        """
        # 设置渗透系数 (m/s)
        self.permeability = material_props.get("PERMEABILITY", 1e-5)
        
        # 其他可选参数
        self.fluid_density = material_props.get("FLUID_DENSITY", 1000.0)
        self.fluid_viscosity = material_props.get("FLUID_VISCOSITY", 1e-3)
        
        logger.info(f"设置渗透系数: {self.permeability} m/s")
    
    def analyze_nurbs_model(
        self,
        nurbs_data: Dict[str, Any],
        material_props: Dict[str, Any],
        boundary_conditions: List[Dict[str, Any]],
        is_steady_state: bool = True
    ) -> bool:
        """
        分析NURBS模型的渗流
        
        Args:
            nurbs_data: NURBS几何数据
            material_props: 材料属性
            boundary_conditions: 边界条件列表
            is_steady_state: 是否为稳态分析
            
        Returns:
            bool: 分析是否成功
        """
        if not HAS_KRATOS_CD:
            logger.warning("Kratos ConvectionDiffusion不可用，无法执行分析")
            return False
        
        try:
            # 设置材料属性
            self.set_material_properties(material_props)
            
            # 创建模型部件
            model_part_name = "SeepageModelPart"
            model_part = self.model.CreateModelPart(model_part_name)
            
            # 添加必要的变量
            self._add_variables(model_part)
            
            # 创建几何
            success = self._create_geometry(model_part, nurbs_data)
            if not success:
                logger.error("创建几何失败")
                return False
            
            # 应用边界条件
            self._apply_boundary_conditions(model_part, boundary_conditions)
            
            # 生成分析参数
            if self.parameters is None:
                self.parameters = self._generate_default_parameters(is_steady_state)
            
            # 设置求解器
            solver_module = KratosMultiphysics.ConvectionDiffusionApplication.convection_diffusion_solver
            solver = solver_module.CreateSolver(model_part, self.parameters["solver_settings"])
            
            # 初始化求解器
            solver.Initialize()
            
            # 求解
            solver.Solve()
            
            # 导出结果
            self._export_results(model_part)
            
            logger.info("渗流分析完成")
            return True
            
        except Exception as e:
            logger.error(f"渗流分析失败: {e}")
            return False
    
    def get_results(self, variable_name: str) -> Dict[int, Union[float, List[float]]]:
        """
        获取特定变量的结果
        
        Args:
            variable_name: Kratos变量名
            
        Returns:
            Dict[int, Union[float, List[float]]]: 节点ID到结果值的映射
        """
        if not HAS_KRATOS_CD or not hasattr(self, 'model'):
            # 模拟模式下返回假数据
            if not HAS_KRATOS_CD:
                logger.info("生成模拟结果...")
                return {i: (np.random.random() - 0.5) * 10 for i in range(1, 101)}
            return {}
        
        try:
            model_part = self.model.GetModelPart("SeepageModelPart")
            results = {}
            
            # 获取Kratos变量
            kratos_var = getattr(KratosMultiphysics, variable_name, None)
            if kratos_var is None:
                kratos_var = getattr(KratosMultiphysics.ConvectionDiffusionApplication, variable_name, None)
            
            if kratos_var is None:
                logger.error(f"未找到变量: {variable_name}")
                return {}
            
            # 获取节点结果
            for node in model_part.Nodes:
                if kratos_var.IsComponent():
                    # 矢量变量
                    value = node.GetSolutionStepValue(kratos_var)
                    results[node.Id] = [value[0], value[1], value[2]]
                else:
                    # 标量变量
                    value = node.GetSolutionStepValue(kratos_var)
                    results[node.Id] = value
            
            return results
        except Exception as e:
            logger.error(f"获取结果失败: {e}")
            return {}
    
    def calculate_flow_rate(self, section_points: List[List[float]]) -> float:
        """
        计算指定截面的流量
        
        Args:
            section_points: 截面上的点列表
            
        Returns:
            float: 流量 (m³/s)
        """
        if not HAS_KRATOS_CD:
            # 模拟模式
            return self.permeability * 10.0  # 假设水头差10m
        
        # TODO: 实现截面流量计算
        return 0.0
    
    def export_results(self, file_path: str, format_type: str = "vtk") -> bool:
        """
        导出结果到文件
        
        Args:
            file_path: 输出文件路径
            format_type: 输出格式 (vtk, gid, etc.)
            
        Returns:
            bool: 是否成功导出
        """
        if not HAS_KRATOS_CD:
            logger.warning("Kratos ConvectionDiffusion不可用，无法导出结果")
            return False
        
        try:
            model_part = self.model.GetModelPart("SeepageModelPart")
            
            if format_type.lower() == "vtk":
                vtk_output = KratosMultiphysics.VtkOutput(model_part, self.parameters["vtk_output_parameters"])
                vtk_output.PrintOutput()
            elif format_type.lower() == "gid":
                gid_output = KratosMultiphysics.GidOutput(
                    file_path,
                    True,
                    "Binary",
                    "Multifile",
                    True,
                    "RAW"
                )
                gid_output.initialize_results(model_part)
                gid_output.write_results(0, model_part)
                gid_output.finalize_results()
            
            logger.info(f"结果已导出到: {file_path}")
            return True
        except Exception as e:
            logger.error(f"导出结果失败: {e}")
            return False
    
    def _add_variables(self, model_part):
        """添加渗流分析所需变量"""
        # 基本变量
        model_part.AddNodalSolutionStepVariable(KratosMultiphysics.TEMPERATURE)  # 用于表示水头
        model_part.AddNodalSolutionStepVariable(KratosMultiphysics.HEAT_FLUX)    # 用于表示流速
        model_part.AddNodalSolutionStepVariable(KratosMultiphysics.FACE_LOAD)
        model_part.AddNodalSolutionStepVariable(KratosMultiphysics.NORMAL)
        
        # 渗流特定变量
        model_part.AddNodalSolutionStepVariable(KratosMultiphysics.DENSITY)
        model_part.AddNodalSolutionStepVariable(KratosMultiphysics.CONDUCTIVITY)
        model_part.AddNodalSolutionStepVariable(KratosMultiphysics.SPECIFIC_HEAT)
        
        logger.info("添加渗流分析变量完成")
    
    def _create_geometry(self, model_part, nurbs_data):
        """
        从NURBS数据创建几何
        
        Args:
            model_part: Kratos模型部件
            nurbs_data: NURBS几何数据
            
        Returns:
            bool: 是否成功创建几何
        """
        try:
            # 从NURBS数据创建网格
            # 目前简化处理，将控制点作为节点
            control_points = nurbs_data.get("control_points", [])
            
            # 创建节点
            for i, point in enumerate(control_points, 1):
                model_part.CreateNewNode(i, point[0], point[1], point[2] if len(point) > 2 else 0.0)
            
            # TODO: 根据NURBS数据创建单元
            # 这里需要根据NURBS拓扑创建适当的单元
            # 简化处理，假设是结构化网格
            
            # 设置材料属性
            props = model_part.CreateNewProperties(1)
            props[KratosMultiphysics.DENSITY] = self.fluid_density
            props[KratosMultiphysics.CONDUCTIVITY] = self.permeability * self.fluid_density * self.gravity / self.fluid_viscosity
            props[KratosMultiphysics.SPECIFIC_HEAT] = 1.0
            
            logger.info(f"创建几何完成，节点数: {len(control_points)}")
            return True
        except Exception as e:
            logger.error(f"创建几何失败: {e}")
            return False
    
    def _apply_boundary_conditions(self, model_part, boundary_conditions):
        """
        应用边界条件
        
        Args:
            model_part: Kratos模型部件
            boundary_conditions: 边界条件列表
        """
        try:
            for bc in boundary_conditions:
                bc_type = bc.get("type", "").lower()
                variable = bc.get("variable", "").upper()
                value = bc.get("value", 0.0)
                nodes = bc.get("nodes", [])
                
                if bc_type == "dirichlet":
                    # 固定水头边界
                    for node_id in nodes:
                        node = model_part.GetNode(node_id)
                        node.Fix(KratosMultiphysics.TEMPERATURE)
                        node.SetSolutionStepValue(KratosMultiphysics.TEMPERATURE, 0, value)
                
                elif bc_type == "neumann":
                    # 流量边界
                    for node_id in nodes:
                        node = model_part.GetNode(node_id)
                        node.SetSolutionStepValue(KratosMultiphysics.HEAT_FLUX, 0, value)
            
            logger.info(f"应用边界条件完成，共{len(boundary_conditions)}个")
        except Exception as e:
            logger.error(f"应用边界条件失败: {e}")
    
    def _export_results(self, model_part):
        """
        导出分析结果
        
        Args:
            model_part: Kratos模型部件
        """
        try:
            vtk_output_file = os.path.join(self.output_dir, "seepage_results")
            vtk_parameters = KratosMultiphysics.Parameters("""
            {
                "file_format": "binary",
                "output_precision": 7,
                "output_control_type": "step",
                "output_frequency": 1,
                "output_sub_model_parts": false,
                "folder_name": \"""" + self.output_dir + """\"
            }""")
            
            vtk_output = KratosMultiphysics.VtkOutput(model_part, vtk_parameters)
            vtk_output.PrintOutput()
            
            logger.info(f"结果已导出到: {self.output_dir}")
        except Exception as e:
            logger.error(f"导出结果失败: {e}")
    
    def _generate_default_parameters(self, is_steady_state: bool) -> Dict[str, Any]:
        """
        生成默认分析参数
        
        Args:
            is_steady_state: 是否为稳态分析
            
        Returns:
            Dict[str, Any]: 默认参数字典
        """
        default_params = {
            "problem_data": {
                "problem_name": "seepage_analysis",
                "echo_level": 1,
                "start_time": 0.0,
                "end_time": 1.0,
                "parallel_type": "OpenMP"
            },
            "solver_settings": {
                "solver_type": "stationary" if is_steady_state else "transient",
                "model_part_name": "SeepageModelPart",
                "domain_size": 2,
                "model_import_settings": {
                    "input_type": "use_input_model_part"
                },
                "time_stepping": {
                    "time_step": 1.0
                },
                "analysis_type": "linear",
                "echo_level": 1,
                "max_iteration": 20
            },
            "vtk_output_parameters": {
                "file_format": "binary",
                "output_precision": 7,
                "output_control_type": "step",
                "output_frequency": 1,
                "output_sub_model_parts": False,
                "folder_name": self.output_dir
            }
        }
        
        return default_params 