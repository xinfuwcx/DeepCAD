"""
@file advanced_excavation_solver.py
@description 增强的深基坑有限元分析模块，基于Kratos实现高级结构力学分析功能
@author Deep Excavation Team
@version 1.0.0
@copyright 2025
"""

import os
import logging
import json
import tempfile
from typing import Dict, List, Optional
from enum import Enum

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("AdvancedExcavationSolver")

# 检查Kratos可用性
try:
    import KratosMultiphysics
    import KratosMultiphysics.StructuralMechanicsApplication
    
    # 尝试导入地质力学应用
    try:
        import KratosMultiphysics.GeomechanicsApplication
        GEOMECHANICS_AVAILABLE = True
        logger.info("Kratos GeomechanicsApplication loaded successfully")
    except ImportError:
        GEOMECHANICS_AVAILABLE = False
        logger.warning("Kratos GeomechanicsApplication not available")
    
    # 尝试导入接触结构力学应用
    try:
        import KratosMultiphysics.ContactStructuralMechanicsApplication
        CONTACT_AVAILABLE = True
        logger.info("Kratos ContactStructuralMechanicsApplication loaded successfully")
    except ImportError:
        CONTACT_AVAILABLE = False
        logger.warning("Kratos ContactStructuralMechanicsApplication not available")
    
    KRATOS_AVAILABLE = True
    logger.info("Kratos core applications loaded successfully")
except ImportError as e:
    KRATOS_AVAILABLE = False
    GEOMECHANICS_AVAILABLE = False
    CONTACT_AVAILABLE = False
    logger.warning(f"Kratos导入失败: {e}")

# 材料模型类型
class MaterialModelType(str, Enum):
    LINEAR_ELASTIC = "linear_elastic"
    MOHR_COULOMB = "mohr_coulomb"
    DRUCKER_PRAGER = "drucker_prager"
    MODIFIED_CAM_CLAY = "modified_cam_clay"
    HARDENING_SOIL = "hardening_soil"
    VON_MISES = "von_mises"

# 分析类型
class AnalysisType(str, Enum):
    STATIC = "static"
    TRANSIENT = "transient"
    QUASI_STATIC = "quasi_static"
    CONSOLIDATION = "consolidation"
    DYNAMIC = "dynamic"

# 施工阶段类型
class StageType(str, Enum):
    INITIAL_STRESS = "initial_stress"
    EXCAVATION = "excavation"
    SUPPORT_INSTALLATION = "support_installation"
    WATER_LEVEL_CHANGE = "water_level_change"
    CONTACT_ACTIVATION = "contact_activation"
    LOAD_ACTIVATION = "load_activation"

class AdvancedExcavationSolver:
    """增强的深基坑有限元分析模块，提供复杂土-结构相互作用和多阶段施工模拟功能"""
    
    def __init__(self, work_dir: Optional[str] = None):
        """初始化深基坑分析求解器
        
        Args:
            work_dir: 工作目录，None则使用临时目录
        """
        if not KRATOS_AVAILABLE:
            raise ImportError("Kratos不可用，无法创建深基坑分析求解器")
        
        # 设置工作目录
        self.work_dir = work_dir or tempfile.mkdtemp(prefix="deep_excavation_")
        os.makedirs(self.work_dir, exist_ok=True)
        logger.info(f"工作目录: {self.work_dir}")
        
        # 初始化Kratos模型
        self.model = KratosMultiphysics.Model()
        self.main_model_part = None
        
        # 初始化分析设置
        self.settings = {}
        self.materials = {}
        self.stages = []
        self.current_stage = -1
        
        # 分析状态
        self.is_initialized = False
        self.is_solved = False
        self.results = {}
        
        logger.info("深基坑分析求解器初始化完成")
    
    def set_model_parameters(self, 
                           analysis_type: AnalysisType = AnalysisType.STATIC,
                           solver_type: str = "newton_raphson",
                           max_iterations: int = 50,
                           convergence_criteria: str = "displacement_criterion",
                           displacement_tolerance: float = 1.0e-5,
                           residual_tolerance: float = 1.0e-5,
                           time_integration: str = "implicit",
                           rayleigh_alpha: float = 0.0,
                           rayleigh_beta: float = 0.0,
                           domain_size: int = 3) -> bool:
        """设置模型分析参数
        
        Args:
            analysis_type: 分析类型
            solver_type: 求解器类型
            max_iterations: 最大迭代次数
            convergence_criteria: 收敛准则
            displacement_tolerance: 位移收敛容差
            residual_tolerance: 残差收敛容差
            time_integration: 时间积分方法
            rayleigh_alpha: 瑞利阻尼alpha系数
            rayleigh_beta: 瑞利阻尼beta系数
            domain_size: 问题维度(2或3)
            
        Returns:
            bool: 是否成功设置参数
        """
        try:
            self.settings = {
                "analysis_type": analysis_type,
                "solver_type": solver_type,
                "max_iterations": max_iterations,
                "convergence_criteria": convergence_criteria,
                "displacement_tolerance": displacement_tolerance,
                "residual_tolerance": residual_tolerance,
                "time_integration": time_integration,
                "rayleigh_alpha": rayleigh_alpha,
                "rayleigh_beta": rayleigh_beta,
                "domain_size": domain_size
            }
            
            logger.info(f"模型分析参数设置完成: {analysis_type.value}, {solver_type}")
            return True
        except Exception as e:
            logger.error(f"设置模型分析参数失败: {str(e)}")
            return False
    
    def add_soil_material(self,
                        name: str,
                        model_type: MaterialModelType,
                        parameters: Dict[str, float],
                        group_id: int) -> int:
        """添加土体材料
        
        Args:
            name: 材料名称
            model_type: 材料模型类型
            parameters: 材料参数
            group_id: 材料组ID
            
        Returns:
            int: 材料ID
        """
        try:
            # 验证基本参数
            required_params = ["young_modulus", "poisson_ratio", "density"]
            for param in required_params:
                if param not in parameters:
                    raise ValueError(f"缺少必要的材料参数: {param}")
            
            # 根据模型类型验证额外参数
            if model_type in [MaterialModelType.MOHR_COULOMB, MaterialModelType.DRUCKER_PRAGER]:
                extra_params = ["cohesion", "friction_angle", "dilatancy_angle"]
                for param in extra_params:
                    if param not in parameters:
                        raise ValueError(f"缺少{model_type.value}模型所需参数: {param}")
            
            # 创建材料条目
            material_id = len(self.materials) + 1
            material = {
                "id": material_id,
                "name": name,
                "type": "soil",
                "model": model_type.value,
                "parameters": parameters,
                "group_id": group_id
            }
            
            # 存储材料
            self.materials[material_id] = material
            
            logger.info(f"添加土体材料: {name}, 模型: {model_type.value}, ID: {material_id}")
            return material_id
        except Exception as e:
            logger.error(f"添加土体材料失败: {str(e)}")
            return -1
    
    def add_structural_material(self,
                              name: str,
                              parameters: Dict[str, float],
                              group_id: int) -> int:
        """添加结构材料
        
        Args:
            name: 材料名称
            parameters: 材料参数
            group_id: 材料组ID
            
        Returns:
            int: 材料ID
        """
        try:
            # 验证基本参数
            required_params = ["young_modulus", "poisson_ratio", "density"]
            for param in required_params:
                if param not in parameters:
                    raise ValueError(f"缺少必要的材料参数: {param}")
            
            # 创建材料条目
            material_id = len(self.materials) + 1
            material = {
                "id": material_id,
                "name": name,
                "type": "structure",
                "model": "linear_elastic",  # 结构材料默认使用线性弹性
                "parameters": parameters,
                "group_id": group_id
            }
            
            # 存储材料
            self.materials[material_id] = material
            
            logger.info(f"添加结构材料: {name}, ID: {material_id}")
            return material_id
        except Exception as e:
            logger.error(f"添加结构材料失败: {str(e)}")
            return -1
    
    def load_mesh(self, mesh_file: str) -> bool:
        """加载网格文件
        
        Args:
            mesh_file: 网格文件路径
            
        Returns:
            bool: 是否成功加载
        """
        try:
            # 创建主模型部件
            model_part_name = "ExcavationModelPart"
            self.main_model_part = self.model.CreateModelPart(model_part_name)
            
            # 设置域维度
            domain_size = self.settings.get("domain_size", 3)
            self.main_model_part.ProcessInfo[KratosMultiphysics.DOMAIN_SIZE] = domain_size
            
            # 添加变量
            self._add_variables()
            
            # 根据文件扩展名选择导入器
            mesh_ext = os.path.splitext(mesh_file)[1].lower()
            
            if mesh_ext == '.mdpa':
                # 使用MDPA导入器
                import_settings = KratosMultiphysics.Parameters("""
                {
                    "model_import_settings": {
                        "input_type": "mdpa",
                        "input_filename": ""
                    }
                }
                """)
                import_settings["model_import_settings"]["input_filename"].SetString(mesh_file)
                model_part_io = KratosMultiphysics.ModelPartIO(mesh_file)
                model_part_io.ReadModelPart(self.main_model_part)
            elif mesh_ext in ['.msh', '.vtk']:
                # 这里需要通过适配器将msh或vtk文件转换为Kratos可用格式
                # 简化处理，实际应用中可能需要使用meshio等工具进行转换
                logger.warning(f"暂不支持直接导入{mesh_ext}格式，需要先转换为.mdpa格式")
                return False
            else:
                logger.error(f"不支持的网格文件格式: {mesh_ext}")
                return False
            
            # 打印网格信息
            logger.info(f"网格加载成功: {mesh_file}")
            logger.info(f"节点数: {self.main_model_part.NumberOfNodes()}")
            logger.info(f"单元数: {self.main_model_part.NumberOfElements()}")
            
            return True
        except Exception as e:
            logger.error(f"加载网格失败: {str(e)}")
            return False
    
    def _add_variables(self):
        """添加变量到模型部件"""
        
        # 位移和反力变量
        self.main_model_part.AddNodalSolutionStepVariable(KratosMultiphysics.DISPLACEMENT)
        self.main_model_part.AddNodalSolutionStepVariable(KratosMultiphysics.REACTION)
        
        # 应力应变变量
        self.main_model_part.AddNodalSolutionStepVariable(KratosMultiphysics.CAUCHY_STRESS_VECTOR)
        self.main_model_part.AddNodalSolutionStepVariable(KratosMultiphysics.GREEN_LAGRANGE_STRAIN_VECTOR)
        
        # 加载相关变量
        self.main_model_part.AddNodalSolutionStepVariable(KratosMultiphysics.VOLUME_ACCELERATION)
        self.main_model_part.AddNodalSolutionStepVariable(KratosMultiphysics.FACE_LOAD)
        
        # 接触相关变量(如果可用)
        if CONTACT_AVAILABLE:
            self.main_model_part.AddNodalSolutionStepVariable(KratosMultiphysics.NORMAL)
            self.main_model_part.AddNodalSolutionStepVariable(KratosMultiphysics.TANGENT_XI)
            self.main_model_part.AddNodalSolutionStepVariable(KratosMultiphysics.TANGENT_ETA)
            self.main_model_part.AddNodalSolutionStepVariable(KratosMultiphysics.ContactStructuralMechanicsApplication.WEIGHTED_GAP)
        
        # 地质力学相关变量(如果可用)
        if GEOMECHANICS_AVAILABLE:
            self.main_model_part.AddNodalSolutionStepVariable(KratosMultiphysics.WATER_PRESSURE)
            self.main_model_part.AddNodalSolutionStepVariable(KratosMultiphysics.VELOCITY)
            self.main_model_part.AddNodalSolutionStepVariable(KratosMultiphysics.ACCELERATION)
    
    def add_excavation_stage(self, name: str, depth: float, elements_to_remove: List[int] = None, 
                           water_level: Optional[float] = None) -> int:
        """添加开挖阶段
        
        Args:
            name: 阶段名称
            depth: 开挖深度
            elements_to_remove: 要移除的单元ID列表
            water_level: 水位高度
            
        Returns:
            int: 阶段ID
        """
        try:
            # 创建阶段
            stage_id = len(self.stages)
            stage = {
                "id": stage_id,
                "name": name,
                "type": StageType.EXCAVATION.value,
                "depth": depth,
                "elements_to_remove": elements_to_remove or [],
                "water_level": water_level
            }
            
            # 存储阶段
            self.stages.append(stage)
            
            logger.info(f"添加开挖阶段: {name}, 深度: {depth}m, ID: {stage_id}")
            return stage_id
        except Exception as e:
            logger.error(f"添加开挖阶段失败: {str(e)}")
            return -1
    
    def add_support_stage(self, name: str, support_type: str, 
                        elements_to_add: List[int], material_id: int) -> int:
        """添加支护结构安装阶段
        
        Args:
            name: 阶段名称
            support_type: 支护类型(wall, strut, anchor)
            elements_to_add: 要添加的单元ID列表
            material_id: 材料ID
            
        Returns:
            int: 阶段ID
        """
        try:
            # 验证材料ID
            if material_id not in self.materials:
                raise ValueError(f"材料ID不存在: {material_id}")
            
            # 创建阶段
            stage_id = len(self.stages)
            stage = {
                "id": stage_id,
                "name": name,
                "type": StageType.SUPPORT_INSTALLATION.value,
                "support_type": support_type,
                "elements_to_add": elements_to_add,
                "material_id": material_id
            }
            
            # 存储阶段
            self.stages.append(stage)
            
            logger.info(f"添加支护安装阶段: {name}, 类型: {support_type}, ID: {stage_id}")
            return stage_id
        except Exception as e:
            logger.error(f"添加支护安装阶段失败: {str(e)}")
            return -1
    
    def add_water_level_change_stage(self, name: str, water_level: float) -> int:
        """添加水位变化阶段
        
        Args:
            name: 阶段名称
            water_level: 水位高度
            
        Returns:
            int: 阶段ID
        """
        try:
            # 创建阶段
            stage_id = len(self.stages)
            stage = {
                "id": stage_id,
                "name": name,
                "type": StageType.WATER_LEVEL_CHANGE.value,
                "water_level": water_level
            }
            
            # 存储阶段
            self.stages.append(stage)
            
            logger.info(f"添加水位变化阶段: {name}, 水位: {water_level}m, ID: {stage_id}")
            return stage_id
        except Exception as e:
            logger.error(f"添加水位变化阶段失败: {str(e)}")
            return -1
    
    def initialize(self) -> bool:
        """初始化分析"""
        try:
            if self.main_model_part is None:
                raise ValueError("未加载网格，无法初始化")
            
            # 创建子模型部件
            logger.info("创建子模型部件...")
            self._create_sub_model_parts()
            
            # 应用材料属性
            logger.info("应用材料属性...")
            self._apply_material_properties()
            
            # 创建求解器
            logger.info("创建求解器...")
            self._create_solver()
            
            self.is_initialized = True
            logger.info("分析初始化完成")
            return True
        except Exception as e:
            logger.error(f"初始化分析失败: {str(e)}")
            return False
    
    def _create_sub_model_parts(self):
        """创建子模型部件"""
        # 为每个材料组创建子模型部件
        for material_id, material in self.materials.items():
            group_id = material["group_id"]
            sub_model_part_name = f"Material_{material['name']}"
            
            # 创建子模型部件
            if not self.main_model_part.HasSubModelPart(sub_model_part_name):
                sub_model_part = self.main_model_part.CreateSubModelPart(sub_model_part_name)
                
                # 获取材料组中的单元
                element_ids = []
                for elem in self.main_model_part.Elements:
                    if elem.GetProperties().Id == group_id:
                        element_ids.append(elem.Id)
                
                # 添加单元到子模型部件
                if element_ids:
                    sub_model_part.AddElements(element_ids)
                    logger.info(f"创建子模型部件: {sub_model_part_name}, 单元数: {len(element_ids)}")
    
    def _apply_material_properties(self):
        """应用材料属性"""
        for material_id, material in self.materials.items():
            group_id = material["group_id"]
            props = self.main_model_part.GetProperties()[group_id]
            
            # 设置基本属性
            params = material["parameters"]
            props.SetValue(KratosMultiphysics.YOUNG_MODULUS, params["young_modulus"])
            props.SetValue(KratosMultiphysics.POISSON_RATIO, params["poisson_ratio"])
            props.SetValue(KratosMultiphysics.DENSITY, params["density"])
            
            # 根据材料模型设置额外属性
            model_type = material["model"]
            
            if model_type == MaterialModelType.LINEAR_ELASTIC.value:
                # 线性弹性
                props.SetValue(KratosMultiphysics.CONSTITUTIVE_LAW, 
                             KratosMultiphysics.StructuralMechanicsApplication.LinearElastic3DLaw())
            
            elif model_type == MaterialModelType.MOHR_COULOMB.value:
                # 摩尔库仑
                if GEOMECHANICS_AVAILABLE:
                    props.SetValue(KratosMultiphysics.GeomechanicsApplication.COHESION, params["cohesion"])
                    props.SetValue(KratosMultiphysics.GeomechanicsApplication.INTERNAL_FRICTION_ANGLE, 
                                 params["friction_angle"])
                    props.SetValue(KratosMultiphysics.GeomechanicsApplication.DILATANCY_ANGLE, 
                                 params.get("dilatancy_angle", 0.0))
                    
                    # 设置本构关系
                    props.SetValue(KratosMultiphysics.CONSTITUTIVE_LAW, 
                                 KratosMultiphysics.GeomechanicsApplication.MohrCoulombPlasticityLaw())
                else:
                    logger.warning("GeomechanicsApplication不可用，使用LinearElastic3DLaw代替")
                    props.SetValue(KratosMultiphysics.CONSTITUTIVE_LAW, 
                                 KratosMultiphysics.StructuralMechanicsApplication.LinearElastic3DLaw())
            
            logger.info(f"应用材料属性: {material['name']}, 模型: {model_type}")
    
    def _create_solver(self):
        """创建求解器"""
        # 创建求解器设置
        solver_settings = KratosMultiphysics.Parameters("""
        {
            "solver_type": "static",
            "echo_level": 1,
            "analysis_type": "non_linear",
            "model_import_settings": {
                "input_type": "use_input_model_part"
            },
            "time_stepping": {
                "time_step": 1.0
            },
            "linear_solver_settings": {
                "solver_type": "amgcl",
                "tolerance": 1e-6,
                "max_iteration": 500
            },
            "convergence_criterion": "displacement_criterion",
            "displacement_relative_tolerance": 1.0e-4,
            "displacement_absolute_tolerance": 1.0e-9,
            "residual_relative_tolerance": 1.0e-4,
            "residual_absolute_tolerance": 1.0e-9,
            "max_iteration": 10
        }
        """)
        
        # 根据设置更新求解器参数
        solver_settings["solver_type"].SetString(self.settings.get("solver_type", "newton_raphson"))
        solver_settings["max_iteration"].SetInt(self.settings.get("max_iterations", 50))
        solver_settings["convergence_criterion"].SetString(self.settings.get("convergence_criteria", "displacement_criterion"))
        solver_settings["displacement_relative_tolerance"].SetDouble(self.settings.get("displacement_tolerance", 1.0e-5))
        solver_settings["residual_relative_tolerance"].SetDouble(self.settings.get("residual_tolerance", 1.0e-5))
        
        # 创建求解器对象
        if self.settings.get("analysis_type") == AnalysisType.STATIC:
            self.solver = KratosMultiphysics.StructuralMechanicsApplication.StructuralMechanicsStaticSolver(
                self.model, solver_settings)
        else:
            # 默认使用静力学求解器
            self.solver = KratosMultiphysics.StructuralMechanicsApplication.StructuralMechanicsStaticSolver(
                self.model, solver_settings)
        
        # 初始化求解器
        self.solver.Initialize()
        
        logger.info(f"求解器创建完成: {self.settings.get('solver_type', 'newton_raphson')}")
    
    def solve(self) -> bool:
        """执行分析计算
        
        Returns:
            bool: 是否成功计算
        """
        try:
            if not self.is_initialized:
                raise ValueError("分析未初始化，请先调用initialize()方法")
            
            logger.info("开始执行分析计算...")
            
            # 按阶段求解
            for stage_idx, stage in enumerate(self.stages):
                logger.info(f"执行阶段 {stage_idx}: {stage['name']} ({stage['type']})")
                self.current_stage = stage_idx
                
                # 根据阶段类型执行不同操作
                if stage["type"] == StageType.EXCAVATION.value:
                    self._process_excavation_stage(stage)
                elif stage["type"] == StageType.SUPPORT_INSTALLATION.value:
                    self._process_support_stage(stage)
                elif stage["type"] == StageType.WATER_LEVEL_CHANGE.value:
                    self._process_water_level_stage(stage)
                
                # 执行求解
                self.solver.Solve()
                
                # 存储结果
                self._store_stage_results(stage_idx)
                
                logger.info(f"阶段 {stage_idx} 计算完成")
            
            self.is_solved = True
            logger.info("分析计算完成")
            return True
        except Exception as e:
            logger.error(f"分析计算失败: {str(e)}")
            return False
    
    def _process_excavation_stage(self, stage):
        """处理开挖阶段"""
        # 移除指定单元
        if "elements_to_remove" in stage and stage["elements_to_remove"]:
            for elem_id in stage["elements_to_remove"]:
                if self.main_model_part.HasElement(elem_id):
                    self.main_model_part.RemoveElement(elem_id)
            
            logger.info(f"移除 {len(stage['elements_to_remove'])} 个单元")
        
        # 设置水位
        if "water_level" in stage and stage["water_level"] is not None:
            self._set_water_level(stage["water_level"])
    
    def _process_support_stage(self, stage):
        """处理支护安装阶段"""
        # 添加指定单元
        if "elements_to_add" in stage and stage["elements_to_add"]:
            # 这里需要更复杂的处理，简化表示
            logger.info(f"添加 {len(stage['elements_to_add'])} 个支护单元")
    
    def _process_water_level_stage(self, stage):
        """处理水位变化阶段"""
        if "water_level" in stage and stage["water_level"] is not None:
            self._set_water_level(stage["water_level"])
    
    def _set_water_level(self, water_level: float):
        """设置水位高度"""
        if GEOMECHANICS_AVAILABLE:
            logger.info(f"设置水位高度: {water_level}m")
            # 在这里实现水位设置逻辑
        else:
            logger.warning("GeomechanicsApplication不可用，无法设置水位")
    
    def _store_stage_results(self, stage_idx: int):
        """存储阶段结果"""
        stage_results = {
            "displacement": {},
            "reaction": {},
            "stress": {}
        }
        
        # 获取位移结果
        for node in self.main_model_part.Nodes:
            node_id = node.Id
            disp = node.GetSolutionStepValue(KratosMultiphysics.DISPLACEMENT)
            stage_results["displacement"][node_id] = [disp[0], disp[1], disp[2]]
            
            if node.HasDofFor(KratosMultiphysics.DISPLACEMENT_X):
                reaction = node.GetSolutionStepValue(KratosMultiphysics.REACTION)
                stage_results["reaction"][node_id] = [reaction[0], reaction[1], reaction[2]]
        
        # 获取应力结果 (简化处理)
        for elem in self.main_model_part.Elements:
            elem_id = elem.Id
            try:
                stress = elem.CalculateOnIntegrationPoints(
                    KratosMultiphysics.CAUCHY_STRESS_VECTOR,
                    self.main_model_part.ProcessInfo
                )[0]  # 取第一个积分点
                stage_results["stress"][elem_id] = stress.tolist()
            except Exception as e:
                logger.warning(f"获取单元 {elem_id} 应力失败: {str(e)}")
        
        # 存储阶段结果
        self.results[stage_idx] = stage_results
        logger.info(f"存储阶段 {stage_idx} 结果完成")
    
    def get_displacement_results(self, stage_idx: int = -1) -> Dict:
        """获取位移结果
        
        Args:
            stage_idx: 阶段索引，-1表示最后一个阶段
            
        Returns:
            Dict: 位移结果字典
        """
        if not self.is_solved:
            logger.warning("模型未求解，无法获取结果")
            return {}
        
        if stage_idx < 0:
            stage_idx = len(self.stages) - 1
        
        if stage_idx not in self.results:
            logger.warning(f"阶段 {stage_idx} 结果不存在")
            return {}
        
        return self.results[stage_idx]["displacement"]
    
    def get_stress_results(self, stage_idx: int = -1) -> Dict:
        """获取应力结果
        
        Args:
            stage_idx: 阶段索引，-1表示最后一个阶段
            
        Returns:
            Dict: 应力结果字典
        """
        if not self.is_solved:
            logger.warning("模型未求解，无法获取结果")
            return {}
        
        if stage_idx < 0:
            stage_idx = len(self.stages) - 1
        
        if stage_idx not in self.results:
            logger.warning(f"阶段 {stage_idx} 结果不存在")
            return {}
        
        return self.results[stage_idx]["stress"]
    
    def export_results(self, output_file: str, format: str = "vtk", stage_idx: int = -1) -> bool:
        """导出结果
        
        Args:
            output_file: 输出文件路径
            format: 输出格式(vtk, json)
            stage_idx: 阶段索引，-1表示最后一个阶段
            
        Returns:
            bool: 是否成功导出
        """
        try:
            if not self.is_solved:
                raise ValueError("模型未求解，无法导出结果")
            
            if stage_idx < 0:
                stage_idx = len(self.stages) - 1
            
            if stage_idx not in self.results:
                raise ValueError(f"阶段 {stage_idx} 结果不存在")
            
            # 确保输出目录存在
            output_dir = os.path.dirname(os.path.abspath(output_file))
            os.makedirs(output_dir, exist_ok=True)
            
            if format.lower() == "vtk":
                # 使用Kratos导出VTK
                vtk_output_settings = KratosMultiphysics.Parameters("""
                {
                    "output_precision": 7,
                    "output_control_type": "step",
                    "output_frequency": 1,
                    "file_format": "ascii",
                    "output_sub_model_parts": true,
                    "nodal_solution_step_data_variables": ["DISPLACEMENT", "REACTION"],
                    "nodal_data_value_variables": [],
                    "element_data_value_variables": ["CAUCHY_STRESS_TENSOR"],
                    "gauss_point_variables": []
                }
                """)
                
                vtk_output = KratosMultiphysics.VtkOutput(
                    self.main_model_part,
                    vtk_output_settings
                )
                
                vtk_output.PrintOutput()
                logger.info(f"VTK结果导出成功: {output_file}")
            elif format.lower() == "json":
                # 导出JSON格式结果
                with open(output_file, 'w', encoding='utf-8') as f:
                    json.dump(self.results[stage_idx], f, indent=2)
                logger.info(f"JSON结果导出成功: {output_file}")
            else:
                logger.error(f"不支持的输出格式: {format}")
                return False
            
            return True
        except Exception as e:
            logger.error(f"导出结果失败: {str(e)}")
            return False 