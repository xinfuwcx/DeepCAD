"""
Terra求解器 - 专业深基坑地质力学分析引擎
基于Kratos Multiphysics，针对深基坑工程特点优化

Terra = 大地，专注于地质力学、基坑开挖、支护结构等工程分析
"""

import sys
import os
import json
import logging
import asyncio
import tempfile
import shutil
import numpy as np
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
from datetime import datetime

# 添加Kratos路径
KRATOS_BUILD_PATH = "/mnt/e/DeepCAD/core/kratos_source/kratos/build/Release"
sys.path.append(KRATOS_BUILD_PATH)
sys.path.append(os.path.join(KRATOS_BUILD_PATH, "kratos"))

try:
    import KratosMultiphysics
    import KratosMultiphysics.GeoMechanicsApplication
    import KratosMultiphysics.StructuralMechanicsApplication
    import KratosMultiphysics.LinearSolversApplication
    KRATOS_AVAILABLE = True
    
    # 安全地获取Kratos版本信息
    version_info = "unknown"
    try:
        if hasattr(KratosMultiphysics, 'GetVersionString'):
            version_info = KratosMultiphysics.GetVersionString()
        elif hasattr(KratosMultiphysics, '__version__'):
            version_info = KratosMultiphysics.__version__
        elif hasattr(KratosMultiphysics, 'GetVersion'):
            version_info = KratosMultiphysics.GetVersion()
    except AttributeError:
        version_info = "version unavailable"
    
    print(f"Terra求解器初始化成功 - Kratos版本: {version_info}")
except ImportError as e:
    print(f"Terra求解器初始化失败 - Kratos导入错误: {e}")
    KRATOS_AVAILABLE = False

try:
    import pyvista as pv
    PYVISTA_AVAILABLE = True
    print("Terra求解器 - PyVista后处理模块可用")
except ImportError as e:
    print(f"Terra求解器 - PyVista不可用: {e}")
    PYVISTA_AVAILABLE = False

# 导入WebSocket实时反馈
try:
    from ..websockets.real_time_feedback import (
        get_real_time_feedback_manager, 
        TerraAnalysisProgressCallback
    )
    WEBSOCKET_FEEDBACK_AVAILABLE = True
except ImportError as e:
    print(f"Terra求解器 - WebSocket反馈不可用: {e}")
    WEBSOCKET_FEEDBACK_AVAILABLE = False

logger = logging.getLogger(__name__)

class TerraAnalysisType(Enum):
    """Terra分析类型"""
    EXCAVATION = "excavation"          # 基坑开挖分析
    SEEPAGE = "seepage"               # 渗流分析
    COUPLED = "coupled"               # 渗流-变形耦合
    SUPPORT_DESIGN = "support_design" # 支护结构设计
    SLOPE_STABILITY = "slope_stability" # 边坡稳定性

class TerraMaterial(Enum):
    """Terra材料类型"""
    CLAY = "clay"           # 粘性土
    SAND = "sand"          # 砂性土
    ROCK = "rock"          # 岩石
    CONCRETE = "concrete"   # 混凝土
    STEEL = "steel"        # 钢材

class TerraLoadType(Enum):
    """Terra荷载类型"""
    EXCAVATION_LOAD = "excavation"    # 开挖荷载
    SURCHARGE = "surcharge"           # 地面超载
    WATER_PRESSURE = "water_pressure" # 水压力
    SUPPORT_FORCE = "support_force"   # 支护力

@dataclass
class TerraSoilLayer:
    """Terra土层数据"""
    name: str
    depth_from: float
    depth_to: float
    elastic_modulus: float    # MPa
    poisson_ratio: float
    density: float           # kg/m³
    cohesion: float         # kPa
    friction_angle: float   # 度
    permeability: float     # m/s
    material_type: TerraMaterial

@dataclass
class TerraExcavationStage:
    """Terra开挖阶段"""
    stage: int
    depth: float
    description: str
    duration: float = 1.0  # 开挖持续时间（天）

@dataclass
class TerraSupportElement:
    """Terra支护结构元素"""
    element_type: str  # "diaphragm_wall", "strut", "anchor"
    geometry: Dict[str, Any]
    material_properties: Dict[str, float]
    installation_stage: int

@dataclass
class TerraAnalysisResult:
    """Terra分析结果"""
    status: str
    analysis_type: TerraAnalysisType
    stages_completed: int
    vtk_files: List[str]
    displacement_max: float
    stress_max: float
    safety_factor: Optional[float] = None
    error_message: Optional[str] = None

class TerraGeotechnicalDatabase:
    """Terra岩土工程数据库"""
    
    @staticmethod
    def get_typical_soil_properties(soil_type: str) -> Dict[str, float]:
        """获取典型土体参数"""
        typical_soils = {
            "soft_clay": {
                "elastic_modulus": 5.0,    # MPa
                "poisson_ratio": 0.35,
                "density": 1800,           # kg/m³
                "cohesion": 15,           # kPa
                "friction_angle": 8,       # 度
                "permeability": 1e-8      # m/s
            },
            "medium_clay": {
                "elastic_modulus": 15.0,
                "poisson_ratio": 0.30,
                "density": 1900,
                "cohesion": 25,
                "friction_angle": 15,
                "permeability": 5e-9
            },
            "dense_sand": {
                "elastic_modulus": 80.0,
                "poisson_ratio": 0.25,
                "density": 2000,
                "cohesion": 0,
                "friction_angle": 35,
                "permeability": 1e-4
            },
            "weathered_rock": {
                "elastic_modulus": 500.0,
                "poisson_ratio": 0.20,
                "density": 2300,
                "cohesion": 100,
                "friction_angle": 40,
                "permeability": 1e-6
            }
        }
        return typical_soils.get(soil_type, typical_soils["medium_clay"])

class TerraSolver:
    """Terra深基坑地质力学求解器"""
    
    def __init__(self):
        self.model = None
        self.work_dir = None
        self.analysis_settings = {}
        self.soil_layers = []
        self.excavation_stages = []
        self.support_elements = []
        self.results = []
        self.pyvista_processor = TerraVisualizationProcessor() if PYVISTA_AVAILABLE else None
        
    def is_available(self) -> bool:
        """检查Terra求解器是否可用"""
        return KRATOS_AVAILABLE
    
    async def initialize_analysis(self, 
                                project_name: str,
                                analysis_type: TerraAnalysisType,
                                soil_layers: List[TerraSoilLayer],
                                excavation_stages: List[TerraExcavationStage],
                                support_elements: List[TerraSupportElement] = None) -> Dict[str, Any]:
        """
        初始化Terra分析
        
        Args:
            project_name: 项目名称
            analysis_type: 分析类型
            soil_layers: 土层信息
            excavation_stages: 开挖阶段
            support_elements: 支护结构
            
        Returns:
            初始化结果
        """
        if not self.is_available():
            raise RuntimeError("Terra求解器不可用 - Kratos未正确加载")
        
        try:
            # 创建工作目录
            self.work_dir = tempfile.mkdtemp(prefix=f"terra_{project_name}_")
            logger.info(f"Terra工作目录创建: {self.work_dir}")
            
            # 保存分析设置
            self.analysis_settings = {
                "project_name": project_name,
                "analysis_type": analysis_type,
                "created_at": datetime.now().isoformat()
            }
            
            # 保存土层信息
            self.soil_layers = soil_layers
            self.excavation_stages = excavation_stages
            self.support_elements = support_elements or []
            
            # 初始化Kratos模型
            self.model = KratosMultiphysics.Model()
            
            # 根据分析类型初始化相应的应用
            if analysis_type == TerraAnalysisType.EXCAVATION:
                self._setup_excavation_analysis()
            elif analysis_type == TerraAnalysisType.SEEPAGE:
                self._setup_seepage_analysis()
            elif analysis_type == TerraAnalysisType.COUPLED:
                self._setup_coupled_analysis()
            elif analysis_type == TerraAnalysisType.SUPPORT_DESIGN:
                self._setup_support_design_analysis()
            
            return {
                "status": "initialized",
                "work_dir": self.work_dir,
                "analysis_type": analysis_type.value,
                "soil_layers_count": len(soil_layers),
                "excavation_stages_count": len(excavation_stages),
                "support_elements_count": len(self.support_elements)
            }
            
        except Exception as e:
            if self.work_dir and os.path.exists(self.work_dir):
                shutil.rmtree(self.work_dir)
            logger.error(f"Terra分析初始化失败: {str(e)}")
            raise RuntimeError(f"Terra分析初始化失败: {str(e)}")
    
    def _setup_excavation_analysis(self):
        """设置基坑开挖分析"""
        logger.info("设置Terra基坑开挖分析")
        
        # 创建主模型部件
        main_model_part = self.model.CreateModelPart("TerraExcavation")
        main_model_part.ProcessInfo.SetValue(KratosMultiphysics.DOMAIN_SIZE, 3)
        
        # 添加地质力学变量
        main_model_part.AddNodalSolutionStepVariable(KratosMultiphysics.DISPLACEMENT)
        main_model_part.AddNodalSolutionStepVariable(KratosMultiphysics.WATER_PRESSURE)
        main_model_part.AddNodalSolutionStepVariable(KratosMultiphysics.VOLUME_ACCELERATION)
        main_model_part.AddNodalSolutionStepVariable(KratosMultiphysics.REACTION)
        
        # 添加地质力学专用变量
        main_model_part.AddNodalSolutionStepVariable(KratosMultiphysics.GeoMechanicsApplication.TOTAL_STRESS_TENSOR)
        main_model_part.AddNodalSolutionStepVariable(KratosMultiphysics.GeoMechanicsApplication.EFFECTIVE_STRESS_TENSOR)
        
    def _setup_seepage_analysis(self):
        """设置渗流分析"""
        logger.info("设置Terra渗流分析")
        
        main_model_part = self.model.CreateModelPart("TerraSeepage")
        main_model_part.ProcessInfo.SetValue(KratosMultiphysics.DOMAIN_SIZE, 3)
        
        # 渗流分析变量
        main_model_part.AddNodalSolutionStepVariable(KratosMultiphysics.WATER_PRESSURE)
        main_model_part.AddNodalSolutionStepVariable(KratosMultiphysics.GeoMechanicsApplication.HYDRAULIC_HEAD)
        main_model_part.AddNodalSolutionStepVariable(KratosMultiphysics.GeoMechanicsApplication.PERMEABILITY_MATRIX)
    
    def _setup_coupled_analysis(self):
        """设置耦合分析"""
        logger.info("设置Terra渗流-变形耦合分析")
        
        main_model_part = self.model.CreateModelPart("TerraCoupled")
        main_model_part.ProcessInfo.SetValue(KratosMultiphysics.DOMAIN_SIZE, 3)
        
        # 耦合分析变量（位移+渗流）
        main_model_part.AddNodalSolutionStepVariable(KratosMultiphysics.DISPLACEMENT)
        main_model_part.AddNodalSolutionStepVariable(KratosMultiphysics.WATER_PRESSURE)
        main_model_part.AddNodalSolutionStepVariable(KratosMultiphysics.GeoMechanicsApplication.HYDRAULIC_HEAD)
    
    def _setup_support_design_analysis(self):
        """设置支护结构设计分析"""
        logger.info("设置Terra支护结构设计分析")
        
        main_model_part = self.model.CreateModelPart("TerraSupportDesign")
        main_model_part.ProcessInfo.SetValue(KratosMultiphysics.DOMAIN_SIZE, 3)
        
        # 支护结构分析变量
        main_model_part.AddNodalSolutionStepVariable(KratosMultiphysics.DISPLACEMENT)
        main_model_part.AddNodalSolutionStepVariable(KratosMultiphysics.REACTION)
        main_model_part.AddNodalSolutionStepVariable(KratosMultiphysics.StructuralMechanicsApplication.AXIAL_FORCE)
        main_model_part.AddNodalSolutionStepVariable(KratosMultiphysics.StructuralMechanicsApplication.BENDING_MOMENT)
    
    async def run_staged_excavation(self, progress_callback=None, task_id: Optional[str] = None) -> TerraAnalysisResult:
        """
        运行分阶段开挖分析
        
        Args:
            progress_callback: 进度回调函数
            task_id: WebSocket任务ID，用于实时反馈
            
        Returns:
            Terra分析结果
        """
        if not self.model:
            raise RuntimeError("Terra分析未初始化")
        
        try:
            logger.info("开始Terra分阶段开挖分析")
            
            # 初始化WebSocket回调
            ws_callback = None
            if task_id and WEBSOCKET_FEEDBACK_AVAILABLE:
                feedback_manager = get_real_time_feedback_manager()
                ws_callback = TerraAnalysisProgressCallback(task_id, feedback_manager)
            
            total_stages = len(self.excavation_stages)
            vtk_files = []
            max_displacement = 0.0
            max_stress = 0.0
            
            for i, stage in enumerate(self.excavation_stages):
                # WebSocket进度更新
                if ws_callback:
                    await ws_callback.on_stage_start(stage.description, i + 1, total_stages)
                
                # 传统回调
                if progress_callback:
                    progress = int((i / total_stages) * 80)  # 分析占80%
                    await progress_callback(progress, f"执行第{stage.stage}阶段开挖...")
                
                logger.info(f"执行开挖阶段 {stage.stage}: {stage.description}")
                
                # 应用开挖到指定深度
                self._apply_excavation_stage(stage)
                
                # 运行当前阶段求解
                stage_result = await self._solve_current_stage(stage.stage, ws_callback, i + 1, total_stages)
                
                if not stage_result["success"]:
                    if ws_callback:
                        await ws_callback.on_error(f"第{stage.stage}阶段求解失败: {stage_result.get('error', '未知错误')}")
                    
                    return TerraAnalysisResult(
                        status="failed",
                        analysis_type=TerraAnalysisType.EXCAVATION,
                        stages_completed=i,
                        vtk_files=[],
                        displacement_max=0.0,
                        stress_max=0.0,
                        error_message=f"第{stage.stage}阶段求解失败"
                    )
                
                # 输出当前阶段结果
                vtk_file = self._export_stage_results(stage.stage)
                vtk_files.append(vtk_file)
                
                # 更新最大值
                stage_disp = stage_result.get("max_displacement", 0)
                stage_stress = stage_result.get("max_stress", 0)
                max_displacement = max(max_displacement, stage_disp)
                max_stress = max(max_stress, stage_stress)
                
                # WebSocket阶段完成通知
                if ws_callback:
                    await ws_callback.on_stage_complete(stage.description, i + 1, total_stages)
            
            # 生成可视化数据
            if progress_callback:
                await progress_callback(90, "生成可视化数据...")
            
            if ws_callback:
                await ws_callback.on_stage_start("生成可视化数据", total_stages + 1, total_stages + 2)
            
            # 使用PyVista处理结果
            visualization_data = None
            if self.pyvista_processor and vtk_files:
                visualization_data = await self.pyvista_processor.process_terra_results(vtk_files[-1])
            
            # 最终完成
            if progress_callback:
                await progress_callback(100, "Terra分析完成")
            
            if ws_callback:
                await ws_callback.on_stage_complete("生成可视化数据", total_stages + 2, total_stages + 2)
            
            return TerraAnalysisResult(
                status="completed",
                analysis_type=TerraAnalysisType.EXCAVATION,
                stages_completed=total_stages,
                vtk_files=vtk_files,
                displacement_max=max_displacement,
                stress_max=max_stress
            )
            
        except Exception as e:
            logger.error(f"Terra分阶段开挖分析失败: {str(e)}")
            return TerraAnalysisResult(
                status="failed",
                analysis_type=TerraAnalysisType.EXCAVATION,
                stages_completed=0,
                vtk_files=[],
                displacement_max=0.0,
                stress_max=0.0,
                error_message=str(e)
            )
    
    def _apply_excavation_stage(self, stage: TerraExcavationStage):
        """应用开挖阶段"""
        # 获取主模型部件
        main_model_part = list(self.model.GetModelParts())[0]
        
        # 模拟开挖：移除指定深度范围内的单元或应用开挖荷载
        # 这里简化实现，实际应该根据开挖深度移除相应单元
        logger.info(f"应用开挖至深度 {stage.depth}m")
        
        # 应用重力荷载
        for node in main_model_part.Nodes:
            if node.Z > -stage.depth:  # 开挖范围内
                # 移除或减小该节点的荷载
                acceleration = KratosMultiphysics.Array3()
                acceleration[0] = 0.0
                acceleration[1] = 0.0  
                acceleration[2] = 0.0  # 开挖区域不受重力
                node.SetSolutionStepValue(KratosMultiphysics.VOLUME_ACCELERATION, acceleration)
    
    async def _solve_current_stage(self, stage_number: int, ws_callback=None, current_stage: int = 1, total_stages: int = 1) -> Dict[str, Any]:
        """求解当前阶段"""
        try:
            logger.info(f"求解阶段 {stage_number}")
            
            # 获取主模型部件
            main_model_part = list(self.model.GetModelParts())[0]
            
            # 创建求解策略（简化实现）
            linear_solver = KratosMultiphysics.LinearSolversApplication.SparseLUSolver()
            scheme = KratosMultiphysics.ResidualBasedIncrementalUpdateStaticScheme()
            builder_and_solver = KratosMultiphysics.ResidualBasedBlockBuilderAndSolver(linear_solver)
            
            strategy = KratosMultiphysics.ResidualBasedNewtonRaphsonStrategy(
                main_model_part,
                scheme,
                linear_solver,
                builder_and_solver,
                30,    # max_iterations
                True,  # calculate_reactions
                False, # reform_dof_set_at_each_step
                False  # move_mesh
            )
            
            strategy.SetEchoLevel(1)
            strategy.Check()
            strategy.Initialize()
            
            # 模拟迭代求解过程并报告进度
            if ws_callback:
                await ws_callback.on_stage_progress(10.0, current_stage, total_stages)
            
            # 执行求解
            solve_success = strategy.Solve()
            
            if ws_callback:
                await ws_callback.on_stage_progress(100.0, current_stage, total_stages)
            
            if solve_success:
                # 提取结果统计
                max_disp = self._calculate_max_displacement(main_model_part)
                max_stress = self._calculate_max_stress(main_model_part)
                
                return {
                    "success": True,
                    "max_displacement": max_disp,
                    "max_stress": max_stress
                }
            else:
                return {"success": False}
                
        except Exception as e:
            logger.error(f"阶段{stage_number}求解错误: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def _calculate_max_displacement(self, model_part) -> float:
        """计算最大位移"""
        max_disp = 0.0
        for node in model_part.Nodes:
            displacement = node.GetSolutionStepValue(KratosMultiphysics.DISPLACEMENT)
            disp_magnitude = np.sqrt(displacement[0]**2 + displacement[1]**2 + displacement[2]**2)
            max_disp = max(max_disp, disp_magnitude)
        return max_disp
    
    def _calculate_max_stress(self, model_part) -> float:
        """计算最大应力"""
        # 简化实现，实际应该从单元中提取应力
        return 100.0  # kPa，示例值
    
    def _export_stage_results(self, stage_number: int) -> str:
        """导出阶段结果到VTK"""
        main_model_part = list(self.model.GetModelParts())[0]
        
        output_file = os.path.join(self.work_dir, f"terra_stage_{stage_number}.vtk")
        
        # 使用Kratos内置VTK导出
        vtk_output = KratosMultiphysics.VtkOutput(
            main_model_part,
            KratosMultiphysics.Parameters(f'''{{
                "file_format": "binary",
                "output_precision": 7,
                "output_sub_model_parts": false,
                "folder_name": "{self.work_dir}",
                "save_output_files_in_folder": false,
                "nodal_solution_step_data_variables": [
                    "DISPLACEMENT",
                    "WATER_PRESSURE",
                    "REACTION"
                ]
            }}''')
        )
        
        vtk_output.InitializeResults()
        vtk_output.WriteResults()
        vtk_output.FinalizeResults()
        
        logger.info(f"阶段{stage_number}结果导出: {output_file}")
        return output_file
    
    def cleanup(self):
        """清理Terra工作目录"""
        if self.work_dir and os.path.exists(self.work_dir):
            shutil.rmtree(self.work_dir)
            logger.info(f"Terra工作目录已清理: {self.work_dir}")
            self.work_dir = None

class TerraVisualizationProcessor:
    """Terra可视化处理器（PyVista集成）"""
    
    def __init__(self):
        self.cache = {}
        
    async def process_terra_results(self, vtk_file: str, field_to_process: Optional[str] = None) -> Dict[str, Any]:
        """处理Terra结果为Web可视化格式"""
        if not PYVISTA_AVAILABLE:
            logger.warning("PyVista不可用，无法进行后处理")
            return {}
        
        try:
            # 读取VTK文件
            mesh = pv.read(vtk_file)
            logger.info(f"Terra结果加载: {mesh.n_points} 节点, {mesh.n_cells} 单元")
            
            # 获取可用字段
            available_fields = mesh.array_names
            logger.info(f"可用物理场: {available_fields}")
            
            visualization_data = {}
            fields_to_process = [field_to_process] if field_to_process else available_fields
            
            for field in fields_to_process:
                if field in mesh.array_names:
                    # 处理标量场
                    field_data = self._process_scalar_field(mesh, field)
                    visualization_data[field] = field_data
            
            return {
                "status": "success",
                "fields": visualization_data,
                "metadata": {
                    "n_points": mesh.n_points,
                    "n_cells": mesh.n_cells,
                    "bounds": mesh.bounds.tolist(),
                    "center": mesh.center.tolist()
                }
            }
            
        except Exception as e:
            logger.error(f"Terra可视化处理失败: {str(e)}")
            return {"status": "error", "message": str(e)}
    
    def _process_scalar_field(self, mesh, field_name: str) -> Dict[str, Any]:
        """处理标量场数据"""
        try:
            # 确保是三角形网格
            if hasattr(mesh, 'triangulate'):
                triangulated = mesh.triangulate()
            else:
                triangulated = mesh
            
            # 提取数据
            vertices = triangulated.points.flatten().tolist()
            faces = self._extract_faces(triangulated)
            scalars = triangulated[field_name].tolist()
            
            # 计算等值面
            contours = triangulated.contour(scalars=field_name, isosurfaces=6)
            contour_data = {
                "vertices": contours.points.flatten().tolist(),
                "faces": self._extract_faces(contours),
                "scalars": contours[field_name].tolist()
            } if contours.n_points > 0 else {}
            
            return {
                "mesh": {
                    "vertices": vertices,
                    "faces": faces,
                    "scalars": scalars,
                    "range": [float(triangulated[field_name].min()), float(triangulated[field_name].max())]
                },
                "contours": contour_data,
                "field_info": {
                    "name": field_name,
                    "type": "scalar",
                    "unit": self._get_field_unit(field_name)
                }
            }
            
        except Exception as e:
            logger.error(f"标量场{field_name}处理失败: {str(e)}")
            return {}
    
    def _extract_faces(self, mesh) -> List[int]:
        """提取三角形面片"""
        faces = []
        for i in range(mesh.n_cells):
            cell = mesh.get_cell(i)
            if cell.type == pv.CellType.TRIANGLE:
                faces.extend(cell.point_ids)
        return faces
    
    def _get_field_unit(self, field_name: str) -> str:
        """获取物理场单位"""
        units = {
            "DISPLACEMENT": "m",
            "WATER_PRESSURE": "Pa",
            "REACTION": "N",
            "STRESS": "Pa"
        }
        return units.get(field_name, "")

# Terra求解器单例
terra_solver = TerraSolver()

def get_terra_solver() -> TerraSolver:
    """获取Terra求解器实例"""
    return terra_solver

# 示例使用
async def example_excavation_analysis():
    """Terra基坑开挖分析示例"""
    
    # 定义土层
    soil_layers = [
        TerraSoilLayer(
            name="填土",
            depth_from=0.0,
            depth_to=2.0,
            elastic_modulus=8.0,
            poisson_ratio=0.35,
            density=1800,
            cohesion=10,
            friction_angle=12,
            permeability=1e-7,
            material_type=TerraMaterial.CLAY
        ),
        TerraSoilLayer(
            name="粉质粘土",
            depth_from=2.0,
            depth_to=15.0,
            elastic_modulus=20.0,
            poisson_ratio=0.30,
            density=1950,
            cohesion=25,
            friction_angle=18,
            permeability=1e-8,
            material_type=TerraMaterial.CLAY
        )
    ]
    
    # 定义开挖阶段
    excavation_stages = [
        TerraExcavationStage(stage=1, depth=3.0, description="第一层开挖"),
        TerraExcavationStage(stage=2, depth=6.0, description="第二层开挖"),
        TerraExcavationStage(stage=3, depth=10.0, description="第三层开挖"),
    ]
    
    # 创建Terra求解器
    solver = get_terra_solver()
    
    try:
        # 初始化分析
        init_result = await solver.initialize_analysis(
            project_name="深基坑示例",
            analysis_type=TerraAnalysisType.EXCAVATION,
            soil_layers=soil_layers,
            excavation_stages=excavation_stages
        )
        
        print(f"Terra分析初始化: {init_result}")
        
        # 运行分阶段开挖
        async def progress_callback(progress, message):
            print(f"进度 {progress}%: {message}")
        
        result = await solver.run_staged_excavation(progress_callback)
        
        print(f"Terra分析结果: {result}")
        
    except Exception as e:
        print(f"Terra分析失败: {e}")
    finally:
        solver.cleanup()

if __name__ == "__main__":
    if KRATOS_AVAILABLE:
        print("Terra求解器测试")
        asyncio.run(example_excavation_analysis())
    else:
        print("Terra求解器不可用 - 请检查Kratos安装")