"""
@file terra_wrapper.py
@description Terra计算引擎包装器，提供深基坑工程的有限元分析功能
@author Deep Excavation Team
@version 1.0.0
@copyright 2025
"""

import os
import sys
import numpy as np
import logging
import json
import tempfile
import subprocess
from pathlib import Path

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("TerraWrapper")

# 导入Kratos
try:
    import KratosMultiphysics
    import KratosMultiphysics.StructuralMechanicsApplication
    import KratosMultiphysics.FluidDynamicsApplication
    import KratosMultiphysics.LinearSolversApplication
    import KratosMultiphysics.MeshingApplication
    import KratosMultiphysics.MeshMovingApplication
    
    # 尝试导入IGA应用
    try:
        import KratosMultiphysics.IgaApplication
        IGA_AVAILABLE = True
        logger.info("Kratos IGA Application loaded successfully")
    except ImportError:
        IGA_AVAILABLE = False
        logger.warning("Kratos IGA Application not available")
    
    KRATOS_AVAILABLE = True
    logger.info("Kratos applications loaded successfully")
except ImportError as e:
    KRATOS_AVAILABLE = False
    IGA_AVAILABLE = False
    logging.warning(f"Kratos导入失败: {e}")

class TerraWrapper:
    """Terra计算引擎包装器类"""
    
    def __init__(self, terra_path=None):
        """初始化Terra包装器
        
        Args:
            terra_path (str, optional): Terra执行文件路径，None则自动查找
        """
        self.terra_path = terra_path or self._find_terra_path()
        self.model_file = None
        self.result_file = None
        self.mesh_file = None
        
        # Kratos相关
        self.kratos_model = None
        self.kratos_solver = None
        self.use_kratos = KRATOS_AVAILABLE
        
        if self.use_kratos:
            logger.info("将使用Kratos进行计算")
            self._init_kratos()
        else:
            # 检查Terra是否可用
            if not self._check_terra_available():
                logger.error("Terra计算引擎不可用，请检查安装")
                raise RuntimeError("Terra计算引擎不可用")
        
        logger.info(f"Terra包装器初始化成功，路径: {self.terra_path}")
    
    def _init_kratos(self):
        """初始化Kratos模型和求解器"""
        try:
            self.kratos_model = KratosMultiphysics.Model()
            logger.info("Kratos模型初始化成功")
        except Exception as e:
            logger.error(f"Kratos模型初始化失败: {e}")
            self.use_kratos = False
    
    def _find_terra_path(self):
        """查找Terra执行文件路径
        
        Returns:
            str: Terra执行文件路径
        """
        # 尝试从环境变量获取
        if 'TERRA_PATH' in os.environ:
            return os.environ['TERRA_PATH']
        
        # 尝试从常见位置查找
        common_paths = [
            "./bin/terra",
            "./terra",
            "C:/Program Files/Terra/bin/terra.exe",
            "/usr/local/bin/terra",
            "/opt/terra/bin/terra"
        ]
        
        for path in common_paths:
            if os.path.exists(path) and os.access(path, os.X_OK):
                return path
        
        # 如果找不到，使用默认名称，依赖PATH环境变量
        return "terra"
    
    def _check_terra_available(self):
        """检查Terra是否可用
        
        Returns:
            bool: Terra是否可用
        """
        try:
            # 尝试运行Terra版本命令
            result = subprocess.run([self.terra_path, "--version"], 
                                    capture_output=True, text=True, timeout=5)
            return result.returncode == 0
        except Exception as e:
            logger.warning(f"检查Terra可用性时出错: {str(e)}")
            return False
    
    def set_mesh(self, mesh_file):
        """设置网格文件
        
        Args:
            mesh_file (str): 网格文件路径
        """
        if not os.path.exists(mesh_file):
            raise FileNotFoundError(f"网格文件不存在: {mesh_file}")
        
        self.mesh_file = mesh_file
        logger.info(f"设置网格文件: {mesh_file}")
    
    def create_model(self, model_name, output_dir=None):
        """创建计算模型
        
        Args:
            model_name (str): 模型名称
            output_dir (str, optional): 输出目录，None则使用当前目录
            
        Returns:
            str: 模型文件路径
        """
        # 设置输出目录
        if output_dir is None:
            output_dir = os.path.join(os.getcwd(), "results")
        
        # 确保输出目录存在
        os.makedirs(output_dir, exist_ok=True)
        
        # 设置模型文件路径
        self.model_file = os.path.join(output_dir, f"{model_name}.json")
        
        # 创建基本模型结构
        model_data = {
            "name": model_name,
            "mesh_file": os.path.abspath(self.mesh_file) if self.mesh_file else None,
            "analysis_type": "static",
            "soil_layers": [],
            "boundary_conditions": [],
            "loads": [],
            "excavation_stages": [],
            "output_requests": ["displacement", "stress", "strain"]
        }
        
        # 保存模型文件
        with open(self.model_file, 'w', encoding='utf-8') as f:
            json.dump(model_data, f, indent=2)
        
        # 如果使用Kratos，创建Kratos模型部件
        if self.use_kratos:
            try:
                self.kratos_model_part = self.kratos_model.CreateModelPart(model_name)
                self.kratos_model_part.ProcessInfo[KratosMultiphysics.DOMAIN_SIZE] = 3  # 3D
                logger.info(f"创建Kratos模型部件: {model_name}")
            except Exception as e:
                logger.error(f"创建Kratos模型部件失败: {e}")
        
        logger.info(f"创建计算模型: {self.model_file}")
        return self.model_file
    
    def add_soil_layer(self, name, material_model, parameters, group_id=None):
        """添加土层材料
        
        Args:
            name (str): 土层名称
            material_model (str): 材料模型，如"mohr_coulomb", "cam_clay"等
            parameters (dict): 材料参数
            group_id (int, optional): 物理组ID，None则应用于所有
            
        Returns:
            int: 添加的土层索引
        """
        if self.model_file is None:
            raise RuntimeError("请先创建模型")
        
        # 读取模型文件
        with open(self.model_file, 'r', encoding='utf-8') as f:
            model_data = json.load(f)
        
        # 添加土层
        soil_layer = {
            "name": name,
            "material_model": material_model,
            "parameters": parameters,
            "group_id": group_id
        }
        
        model_data["soil_layers"].append(soil_layer)
        
        # 保存模型文件
        with open(self.model_file, 'w', encoding='utf-8') as f:
            json.dump(model_data, f, indent=2)
        
        # 如果使用Kratos，添加Kratos材料属性
        if self.use_kratos and hasattr(self, 'kratos_model_part'):
            try:
                props = self.kratos_model_part.GetProperties(len(model_data["soil_layers"]))
                
                # 根据材料模型设置参数
                if material_model.lower() == "linear_elastic":
                    young_modulus = parameters.get("young_modulus", 1.0e7)
                    poisson_ratio = parameters.get("poisson_ratio", 0.3)
                    density = parameters.get("density", 2000.0)
                    
                    props[KratosMultiphysics.YOUNG_MODULUS] = young_modulus
                    props[KratosMultiphysics.POISSON_RATIO] = poisson_ratio
                    props[KratosMultiphysics.DENSITY] = density
                    
                    # 设置本构关系
                    props[KratosMultiphysics.CONSTITUTIVE_LAW] = KratosMultiphysics.StructuralMechanicsApplication.LinearElastic3DLaw()
                
                logger.info(f"添加Kratos材料属性: {name}")
            except Exception as e:
                logger.error(f"添加Kratos材料属性失败: {e}")
        
        logger.info(f"添加土层材料: {name}, 模型: {material_model}")
        return len(model_data["soil_layers"]) - 1
    
    def add_boundary_condition(self, bc_type, entities, values=None):
        """添加边界条件
        
        Args:
            bc_type (str): 边界条件类型，如"displacement", "fixed"等
            entities (list): 实体ID列表
            values (list, optional): 边界条件值，None则为固定边界
            
        Returns:
            int: 添加的边界条件索引
        """
        if self.model_file is None:
            raise RuntimeError("请先创建模型")
        
        # 读取模型文件
        with open(self.model_file, 'r', encoding='utf-8') as f:
            model_data = json.load(f)
        
        # 添加边界条件
        boundary_condition = {
            "type": bc_type,
            "entities": entities,
            "values": values or [0.0, 0.0, 0.0]  # 默认固定边界
        }
        
        model_data["boundary_conditions"].append(boundary_condition)
        
        # 保存模型文件
        with open(self.model_file, 'w', encoding='utf-8') as f:
            json.dump(model_data, f, indent=2)
        
        logger.info(f"添加边界条件: {bc_type}, 实体数: {len(entities)}")
        return len(model_data["boundary_conditions"]) - 1
    
    def add_excavation_stage(self, name, excavation_entities, water_level=None, time_step=1.0):
        """添加开挖阶段
        
        Args:
            name (str): 阶段名称
            excavation_entities (list): 开挖区域实体ID列表
            water_level (float, optional): 水位高程，None则无水位
            time_step (float): 时间步长
            
        Returns:
            int: 添加的开挖阶段索引
        """
        if self.model_file is None:
            raise RuntimeError("请先创建模型")
        
        # 读取模型文件
        with open(self.model_file, 'r', encoding='utf-8') as f:
            model_data = json.load(f)
        
        # 添加开挖阶段
        stage = {
            "name": name,
            "excavation_entities": excavation_entities,
            "water_level": water_level,
            "time_step": time_step
        }
        
        model_data["excavation_stages"].append(stage)
        
        # 保存模型文件
        with open(self.model_file, 'w', encoding='utf-8') as f:
            json.dump(model_data, f, indent=2)
        
        logger.info(f"添加开挖阶段: {name}, 开挖实体数: {len(excavation_entities)}")
        return len(model_data["excavation_stages"]) - 1
    
    def run_analysis(self, num_threads=None):
        """运行分析
        
        Args:
            num_threads (int, optional): 线程数，None则使用默认值
            
        Returns:
            str: 结果文件路径
        """
        if self.model_file is None:
            raise RuntimeError("请先创建模型")
        
        # 确定结果文件路径
        result_dir = os.path.dirname(self.model_file)
        result_name = os.path.splitext(os.path.basename(self.model_file))[0] + "_results.json"
        self.result_file = os.path.join(result_dir, result_name)
        
        if self.use_kratos:
            # 使用Kratos进行计算
            try:
                logger.info("使用Kratos进行分析...")
                self._run_kratos_analysis(num_threads)
                logger.info(f"Kratos分析完成，结果保存到: {self.result_file}")
            except Exception as e:
                logger.error(f"Kratos分析失败: {e}")
                # 如果Kratos失败，尝试使用Terra
                if os.path.exists(self.terra_path):
                    logger.info("尝试使用Terra进行分析...")
                    self._run_terra_analysis(num_threads)
                else:
                    raise RuntimeError(f"分析失败: {e}")
        else:
            # 使用Terra进行计算
            self._run_terra_analysis(num_threads)
        
        return self.result_file
    
    def _run_kratos_analysis(self, num_threads=None):
        """使用Kratos运行分析"""
        # 设置线程数
        if num_threads is not None:
            KratosMultiphysics.OpenMPUtils().SetNumThreads(num_threads)
        
        # 读取模型文件
        with open(self.model_file, 'r', encoding='utf-8') as f:
            model_data = json.load(f)
        
        # 导入网格
        if self.mesh_file and os.path.exists(self.mesh_file):
            # 根据文件扩展名选择导入器
            mesh_ext = os.path.splitext(self.mesh_file)[1].lower()
            if mesh_ext == '.mdpa':
                # 使用Kratos内置的MDPA导入器
                import_settings = KratosMultiphysics.Parameters("""
                {
                    "model_import_settings": {
                        "input_type": "mdpa",
                        "input_filename": ""
                    }
                }
                """)
                import_settings["model_import_settings"]["input_filename"].SetString(self.mesh_file)
                KratosMultiphysics.ModelPartIO(self.mesh_file).ReadModelPart(self.kratos_model_part)
            elif mesh_ext == '.msh':
                # 使用GiD导入器
                # 这里需要先将.msh转换为Kratos可识别的格式
                # 简化处理，实际应用中可能需要更复杂的转换
                logger.warning("暂不支持直接导入.msh文件，请先转换为.mdpa格式")
                raise NotImplementedError("暂不支持直接导入.msh文件")
            else:
                logger.warning(f"不支持的网格文件格式: {mesh_ext}")
                raise ValueError(f"不支持的网格文件格式: {mesh_ext}")
        
        # 设置求解器参数
        solver_settings = KratosMultiphysics.Parameters("""
        {
            "solver_type": "static",
            "echo_level": 1,
            "analysis_type": "linear",
            "model_import_settings": {
                "input_type": "use_input_model_part"
            },
            "material_import_settings": {
                "materials_filename": ""
            },
            "time_stepping": {
                "time_step": 1.0
            },
            "linear_solver_settings": {
                "solver_type": "amgcl",
                "tolerance": 1e-6,
                "max_iteration": 1000
            }
        }
        """)
        
        # 创建求解器
        solver = KratosMultiphysics.StructuralMechanicsApplication.StructuralMechanicsStaticSolver(
            self.kratos_model,
            solver_settings,
            True  # 是否创建子模型部件
        )
        
        # 初始化求解器
        solver.Initialize()
        
        # 运行求解
        solver.Solve()
        
        # 导出结果
        self._export_kratos_results(model_data)
        
        return True
    
    def _export_kratos_results(self, model_data):
        """导出Kratos计算结果"""
        # 创建结果数据结构
        results = {
            "model_name": model_data["name"],
            "stages": [],
            "displacement": {},
            "stress": {},
            "strain": {}
        }
        
        # 获取位移结果
        for node in self.kratos_model_part.Nodes:
            node_id = node.Id
            disp = node.GetSolutionStepValue(KratosMultiphysics.DISPLACEMENT)
            results["displacement"][str(node_id)] = [disp[0], disp[1], disp[2]]
        
        # 获取应力结果
        for elem in self.kratos_model_part.Elements:
            elem_id = elem.Id
            stress = elem.CalculateOnIntegrationPoints(
                KratosMultiphysics.PK2_STRESS_VECTOR,
                self.kratos_model_part.ProcessInfo
            )[0]  # 取第一个积分点
            results["stress"][str(elem_id)] = stress.tolist()
        
        # 保存结果到文件
        with open(self.result_file, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2)
    
    def _run_terra_analysis(self, num_threads=None):
        """使用Terra运行分析"""
        # 构建命令行参数
        cmd = [self.terra_path, "-i", self.model_file, "-o", self.result_file]
        
        if num_threads is not None:
            cmd.extend(["-t", str(num_threads)])
        
        # 运行Terra
        logger.info(f"运行Terra分析: {' '.join(cmd)}")
        try:
            result = subprocess.run(cmd, capture_output=True, text=True)
            if result.returncode != 0:
                logger.error(f"Terra分析失败: {result.stderr}")
                raise RuntimeError(f"Terra分析失败，返回码: {result.returncode}")
            
            logger.info(f"Terra分析完成，结果保存到: {self.result_file}")
        except Exception as e:
            logger.error(f"运行Terra分析时出错: {str(e)}")
            raise
    
    def get_results(self, result_type, stage_index=-1):
        """获取计算结果
        
        Args:
            result_type (str): 结果类型，如"displacement", "stress", "strain"
            stage_index (int): 阶段索引，-1表示最后一个阶段
            
        Returns:
            dict: 结果数据
        """
        if self.result_file is None or not os.path.exists(self.result_file):
            raise FileNotFoundError(f"结果文件不存在: {self.result_file}")
        
        # 读取结果文件
        with open(self.result_file, 'r', encoding='utf-8') as f:
            results = json.load(f)
        
        # 获取指定类型的结果
        if result_type not in results:
            raise ValueError(f"不支持的结果类型: {result_type}")
        
        # 如果是分阶段结果，获取指定阶段
        if stage_index >= 0 and "stages" in results and len(results["stages"]) > stage_index:
            return results["stages"][stage_index].get(result_type, {})
        else:
            return results.get(result_type, {})
    
    def export_vtk(self, output_file, stage_index=-1):
        """导出VTK格式结果
        
        Args:
            output_file (str): 输出文件路径
            stage_index (int): 阶段索引，-1表示最后一个阶段
            
        Returns:
            str: VTK文件路径
        """
        if self.result_file is None or not os.path.exists(self.result_file):
            raise FileNotFoundError(f"结果文件不存在: {self.result_file}")
        
        # 确保输出目录存在
        os.makedirs(os.path.dirname(os.path.abspath(output_file)), exist_ok=True)
        
        if self.use_kratos:
            # 使用Kratos导出VTK
            try:
                vtk_output_settings = KratosMultiphysics.Parameters("""
                {
                    "output_precision": 7,
                    "output_control_type": "step",
                    "output_frequency": 1,
                    "file_format": "ascii",
                    "output_sub_model_parts": false,
                    "nodal_solution_step_data_variables": ["DISPLACEMENT", "REACTION"],
                    "nodal_data_value_variables": [],
                    "element_data_value_variables": ["CAUCHY_STRESS_TENSOR"],
                    "gauss_point_variables": []
                }
                """)
                
                vtk_output = KratosMultiphysics.VtkOutput(
                    self.kratos_model_part,
                    vtk_output_settings
                )
                
                vtk_output.PrintOutput()
                logger.info(f"Kratos VTK导出成功: {output_file}")
                return output_file
            except Exception as e:
                logger.error(f"Kratos VTK导出失败: {e}")
                # 如果Kratos导出失败，尝试使用自定义导出
        
        # 自定义导出VTK
        try:
            # 读取结果文件
            with open(self.result_file, 'r', encoding='utf-8') as f:
                results = json.load(f)
            
            # 读取网格文件
            if self.mesh_file is None or not os.path.exists(self.mesh_file):
                raise FileNotFoundError(f"网格文件不存在: {self.mesh_file}")
            
            # 这里需要根据网格文件格式进行解析
            # 简化处理，实际应用中需要更复杂的解析
            logger.warning("自定义VTK导出功能尚未实现，请使用Trame可视化")
            
            return output_file
        except Exception as e:
            logger.error(f"VTK导出失败: {str(e)}")
            raise

# 使用示例
if __name__ == "__main__":
    try:
        # 创建Terra包装器
        terra = TerraWrapper()
        
        # 设置网格文件
        terra.set_mesh("test_mesh.msh")
        
        # 创建模型
        terra.create_model("test_excavation")
        
        # 添加土层材料
        terra.add_soil_layer("Clay", "mohr_coulomb", {
            "young_modulus": 5e6,
            "poisson_ratio": 0.3,
            "cohesion": 20e3,
            "friction_angle": 20,
            "unit_weight": 18e3
        }, 1)
        
        # 添加边界条件
        terra.add_boundary_condition("fixed", [1, 2, 3, 4])
        
        # 添加开挖阶段
        terra.add_excavation_stage("Stage 1", [10, 11], water_level=-5.0)
        
        # 运行分析
        terra.run_analysis()
        
        # 导出结果
        terra.export_vtk("test_results.vtk")
        
        print("示例运行完成")
    except Exception as e:
        print(f"运行示例时出错: {str(e)}") 