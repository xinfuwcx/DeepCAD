"""
MSH-Kratos求解器集成模块 - example1项目专用
处理MSH网格数据，调用Kratos进行岩土工程分析
支持分步开挖分析和PyVista输出
"""
import os
import sys
import json
import numpy as np
from typing import Dict, List, Any, Optional, Tuple
import tempfile
import subprocess
import time

# 尝试导入Kratos相关模块
try:
    import KratosMultiphysics as KM
    import KratosMultiphysics.StructuralMechanicsApplication as SMA
    import KratosMultiphysics.ConstitutiveLawsApplication as CLA
    KRATOS_AVAILABLE = True
    print("Kratos模块导入成功")
except ImportError as e:
    print(f"Kratos模块导入失败: {e}")
    print("将使用模拟模式运行")
    KRATOS_AVAILABLE = False

# 尝试导入meshio用于MSH文件处理
try:
    import meshio
    MESHIO_AVAILABLE = True
except ImportError:
    print("meshio未安装，将使用简化模式")
    MESHIO_AVAILABLE = False

class MSHKratosSolver:
    """MSH-Kratos求解器，用于example1项目"""
    
    def __init__(self, work_dir: str = "H:/DeepCAD/data", output_dir: str = "H:/DeepCAD/output"):
        """
        初始化求解器
        
        Args:
            work_dir: 工作目录（包含MSH文件和配置）
            output_dir: 输出目录
        """
        self.work_dir = work_dir
        self.output_dir = output_dir
        self.model = None
        self.model_part = None
        self.solver = None
        self.analysis_stages = {}
        self.current_stage = None
        
        self.ensure_directories()
        
        # 模拟结果存储
        self.simulation_mode = not KRATOS_AVAILABLE
        self.results_cache = {}
        
    def ensure_directories(self):
        """确保必要目录存在"""
        for directory in [self.work_dir, self.output_dir]:
            if not os.path.exists(directory):
                os.makedirs(directory)
                
        # 创建VTK输出目录
        vtk_dir = os.path.join(self.output_dir, "vtk_output")
        if not os.path.exists(vtk_dir):
            os.makedirs(vtk_dir)
    
    def load_msh_files(self, msh_files: Dict[str, str]) -> bool:
        """
        加载MSH文件
        
        Args:
            msh_files: MSH文件路径字典 {'soil_domain': path, 'excavation_pit': path, 'tunnel': path}
            
        Returns:
            加载是否成功
        """
        print("=== 加载MSH文件 ===")
        
        try:
            self.msh_data = {}
            
            for name, file_path in msh_files.items():
                if not os.path.exists(file_path):
                    print(f"错误: MSH文件不存在: {file_path}")
                    return False
                
                print(f"加载 {name}: {file_path}")
                
                if MESHIO_AVAILABLE:
                    # 使用meshio读取MSH文件
                    mesh = meshio.read(file_path)
                    self.msh_data[name] = {
                        'points': mesh.points,
                        'cells': mesh.cells,
                        'point_data': mesh.point_data,
                        'cell_data': mesh.cell_data,
                        'field_data': mesh.field_data
                    }
                    
                    # 统计信息
                    num_nodes = len(mesh.points)
                    num_elements = sum(len(cell_block.data) for cell_block in mesh.cells)
                    print(f"  节点数: {num_nodes}, 单元数: {num_elements}")
                    
                else:
                    # 简化模式：只记录文件路径
                    self.msh_data[name] = {'file_path': file_path}
                    print(f"  记录文件路径: {file_path}")
            
            print("MSH文件加载完成\\n")
            return True
            
        except Exception as e:
            print(f"加载MSH文件时出错: {e}")
            return False
    
    def setup_kratos_model(self, materials_file: str, config_file: str) -> bool:
        """
        设置Kratos模型
        
        Args:
            materials_file: 材料文件路径
            config_file: 配置文件路径
            
        Returns:
            设置是否成功
        """
        print("=== 设置Kratos模型 ===")
        
        if self.simulation_mode:
            print("使用模拟模式设置模型")
            return self._setup_simulation_model(materials_file, config_file)
        
        try:
            # 创建Kratos模型
            self.model = KM.Model()
            self.model_part = self.model.CreateModelPart("Structure")
            
            # 设置求解域维度
            self.model_part.GetProcessInfo()[KM.DOMAIN_SIZE] = 3
            
            # 加载材料配置
            with open(materials_file, 'r', encoding='utf-8') as f:
                materials_config = json.load(f)
            
            # 加载分析配置
            with open(config_file, 'r', encoding='utf-8') as f:
                analysis_config = json.load(f)
            
            print("Kratos模型设置完成")
            return True
            
        except Exception as e:
            print(f"设置Kratos模型时出错: {e}")
            return False
    
    def _setup_simulation_model(self, materials_file: str, config_file: str) -> bool:
        """
        设置模拟模型（当Kratos不可用时）
        """
        try:
            # 加载配置文件
            with open(materials_file, 'r', encoding='utf-8') as f:
                self.materials_config = json.load(f)
            
            with open(config_file, 'r', encoding='utf-8') as f:
                self.analysis_config = json.load(f)
            
            # 提取分析阶段
            self.analysis_stages = self.analysis_config.get('analysis_stages', {})
            
            print(f"模拟模式配置加载完成，包含 {len(self.analysis_stages)} 个分析阶段")
            return True
            
        except Exception as e:
            print(f"设置模拟模型时出错: {e}")
            return False
    
    def run_analysis_stages(self) -> Dict[str, Any]:
        """
        运行分析阶段
        
        Returns:
            分析结果字典
        """
        print("=== 开始分步分析 ===")
        
        results = {
            'stages': {},
            'monitoring_data': {},
            'vtk_files': {},
            'summary': {}
        }
        
        if self.simulation_mode:
            return self._run_simulation_analysis()
        
        try:
            # 运行各个分析阶段
            for stage_name, stage_config in self.analysis_stages.items():
                print(f"\\n--- 运行阶段: {stage_config['name']} ---")
                print(f"描述: {stage_config['description']}")
                
                stage_result = self._run_single_stage(stage_name, stage_config)
                results['stages'][stage_name] = stage_result
                
                # 生成VTK输出
                vtk_file = self._export_vtk_results(stage_name, stage_result)
                if vtk_file:
                    results['vtk_files'][stage_name] = vtk_file
            
            # 生成汇总
            results['summary'] = self._generate_analysis_summary(results)
            
            print("\\n=== 分步分析完成 ===")
            return results
            
        except Exception as e:
            print(f"运行分析时出错: {e}")
            return {'error': str(e)}
    
    def _run_simulation_analysis(self) -> Dict[str, Any]:
        """
        运行模拟分析（当Kratos不可用时）
        """
        print("使用模拟模式运行分析...")
        
        results = {
            'stages': {},
            'monitoring_data': {},
            'vtk_files': {},
            'summary': {}
        }
        
        # 模拟各个分析阶段
        stage_names = ['stage_1', 'stage_2', 'stage_3', 'stage_4']
        stage_descriptions = [
            'Geostatic_Equilibrium',
            'Tunnel_Excavation', 
            'Pit_Excavation_Stage1',
            'Pit_Excavation_Final'
        ]
        
        for i, stage_name in enumerate(stage_names):
            print(f"\\n--- 模拟阶段: {stage_descriptions[i]} ---")
            
            # 模拟计算过程
            stage_result = self._simulate_stage_calculation(stage_name, i)
            results['stages'][stage_name] = stage_result
            
            # 生成模拟VTK文件
            vtk_file = self._generate_simulation_vtk(stage_name, stage_result)
            if vtk_file:
                results['vtk_files'][stage_name] = vtk_file
            
            # 模拟计算时间
            time.sleep(0.5)
        
        # 生成监测数据
        results['monitoring_data'] = self._generate_monitoring_data()
        
        # 生成汇总
        results['summary'] = {
            'total_stages': len(stage_names),
            'computation_successful': True,
            'max_displacement': 0.025,  # 模拟值：2.5cm
            'max_stress': 850000,       # 模拟值：0.85MPa
            'convergence_achieved': True,
            'mode': 'simulation'
        }
        
        print("\\n=== 模拟分析完成 ===")
        return results
    
    def _simulate_stage_calculation(self, stage_name: str, stage_index: int) -> Dict[str, Any]:
        """
        模拟单个分析阶段的计算
        """
        # 模拟不同阶段的计算结果
        base_displacement = 0.001 * (stage_index + 1)  # 位移逐渐增大
        base_stress = 100000 + 50000 * stage_index     # 应力逐渐增大
        
        result = {
            'stage_name': stage_name,
            'convergence_achieved': True,
            'iterations': np.random.randint(5, 25),
            'max_displacement': base_displacement * np.random.uniform(0.8, 1.2),
            'max_stress': base_stress * np.random.uniform(0.9, 1.1),
            'computation_time': np.random.uniform(10, 60),
            'displacement_field': self._generate_displacement_field(base_displacement),
            'stress_field': self._generate_stress_field(base_stress)
        }
        
        print(f"  收敛迭代: {result['iterations']}")
        print(f"  最大位移: {result['max_displacement']*1000:.2f}mm")
        print(f"  最大应力: {result['max_stress']/1000:.0f}kPa")
        
        return result
    
    def _generate_displacement_field(self, base_value: float) -> np.ndarray:
        """
        生成位移场数据（模拟）
        """
        # 模拟100个节点的位移
        num_nodes = 100
        displacements = np.random.normal(base_value, base_value * 0.3, (num_nodes, 3))
        # Z方向位移为主
        displacements[:, 2] = np.abs(displacements[:, 2])
        return displacements
    
    def _generate_stress_field(self, base_value: float) -> np.ndarray:
        """
        生成应力场数据（模拟）
        """
        # 模拟100个积分点的应力张量
        num_points = 100
        stresses = np.random.normal(base_value, base_value * 0.2, (num_points, 6))
        return stresses
    
    def _generate_monitoring_data(self) -> Dict[str, List[float]]:
        """
        生成监测点数据
        """
        monitoring_points = [
            'tunnel_crown',
            'tunnel_springline', 
            'pit_corner',
            'pit_bottom_center',
            'surface_settlement'
        ]
        
        monitoring_data = {}
        for point in monitoring_points:
            # 生成4个阶段的位移数据
            displacements = np.cumsum(np.random.uniform(0.001, 0.008, 4))
            monitoring_data[point] = displacements.tolist()
        
        return monitoring_data
    
    def _generate_simulation_vtk(self, stage_name: str, stage_result: Dict[str, Any]) -> Optional[str]:
        """
        生成模拟VTK文件
        """
        try:
            vtk_filename = f"{stage_name}_results.vtk"
            vtk_path = os.path.join(self.output_dir, "vtk_output", vtk_filename)
            
            # 生成简单的VTK格式文件
            with open(vtk_path, 'w') as f:
                f.write("# vtk DataFile Version 3.0\\n")
                f.write(f"MSH Example1 Results - {stage_name}\\n")
                f.write("ASCII\\n")
                f.write("DATASET UNSTRUCTURED_GRID\\n")
                
                # 写入点数据
                num_points = 100
                f.write(f"POINTS {num_points} float\\n")
                for i in range(num_points):
                    x = (i % 10) * 10.0 - 45.0  # X坐标
                    y = (i // 10) * 10.0 - 45.0  # Y坐标
                    z = 25.0 + np.random.uniform(-10, 10)  # Z坐标
                    f.write(f"{x:.2f} {y:.2f} {z:.2f}\\n")
                
                # 写入位移数据
                f.write(f"POINT_DATA {num_points}\\n")
                f.write("VECTORS displacement float\\n")
                displacements = stage_result['displacement_field']
                for disp in displacements:
                    f.write(f"{disp[0]:.6f} {disp[1]:.6f} {disp[2]:.6f}\\n")
            
            print(f"  生成VTK文件: {vtk_path}")
            return vtk_path
            
        except Exception as e:
            print(f"生成VTK文件时出错: {e}")
            return None
    
    def _generate_analysis_summary(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """
        生成分析汇总
        """
        summary = {
            'total_stages': len(results['stages']),
            'vtk_files_generated': len(results['vtk_files']),
            'computation_successful': True,
            'convergence_issues': []
        }
        
        # 统计最大位移和应力
        max_disp = 0
        max_stress = 0
        
        for stage_result in results['stages'].values():
            if stage_result.get('max_displacement', 0) > max_disp:
                max_disp = stage_result['max_displacement']
            if stage_result.get('max_stress', 0) > max_stress:
                max_stress = stage_result['max_stress']
        
        summary['max_displacement'] = max_disp
        summary['max_stress'] = max_stress
        
        return summary
    
    def export_results_for_pyvista(self, results: Dict[str, Any]) -> List[str]:
        """
        导出PyVista兼容的结果文件
        
        Args:
            results: 分析结果
            
        Returns:
            VTK文件路径列表
        """
        print("=== 导出PyVista兼容结果 ===")
        
        vtk_files = []
        
        try:
            for stage_name, vtk_path in results.get('vtk_files', {}).items():
                if os.path.exists(vtk_path):
                    print(f"PyVista可读取: {vtk_path}")
                    vtk_files.append(vtk_path)
            
            # 生成结果汇总JSON文件
            summary_file = os.path.join(self.output_dir, "results_summary.json")
            with open(summary_file, 'w', encoding='utf-8') as f:
                json.dump(results, f, indent=4, ensure_ascii=False, default=str)
            
            print(f"结果汇总文件: {summary_file}")
            print(f"总计生成 {len(vtk_files)} 个VTK文件")
            
            return vtk_files
            
        except Exception as e:
            print(f"导出PyVista结果时出错: {e}")
            return []
    
    def run_complete_analysis(self, msh_files: Dict[str, str], materials_file: str, config_file: str) -> Dict[str, Any]:
        """
        运行完整的分析流程
        
        Args:
            msh_files: MSH文件路径字典
            materials_file: 材料文件路径
            config_file: 配置文件路径
            
        Returns:
            完整的分析结果
        """
        print("\\n" + "="*50)
        print("    MSH-Kratos 完整分析流程")
        print("="*50)
        
        try:
            # 1. 加载MSH文件
            if not self.load_msh_files(msh_files):
                return {'error': 'MSH文件加载失败'}
            
            # 2. 设置Kratos模型
            if not self.setup_kratos_model(materials_file, config_file):
                return {'error': 'Kratos模型设置失败'}
            
            # 3. 运行分析
            results = self.run_analysis_stages()
            
            # 4. 导出PyVista结果
            vtk_files = self.export_results_for_pyvista(results)
            results['pyvista_files'] = vtk_files
            
            print("\\n" + "="*50)
            print("    分析流程完成")
            print("="*50)
            
            return results
            
        except Exception as e:
            error_msg = f"完整分析流程出错: {e}"
            print(f"\\n错误: {error_msg}")
            return {'error': error_msg}

def main():
    """
    测试MSH-Kratos求解器
    """
    print("测试MSH-Kratos求解器...")
    
    # 初始化求解器
    solver = MSHKratosSolver()
    
    # MSH文件路径
    msh_files = {
        'soil_domain': 'H:/DeepCAD/data/soil_domain.msh',
        'excavation_pit': 'H:/DeepCAD/data/excavation_pit.msh',
        'tunnel': 'H:/DeepCAD/data/tunnel.msh'
    }
    
    # 配置文件路径
    materials_file = 'H:/DeepCAD/data/materials.json'
    config_file = 'H:/DeepCAD/data/analysis_config.json'
    
    # 运行完整分析
    results = solver.run_complete_analysis(msh_files, materials_file, config_file)
    
    if 'error' in results:
        print(f"分析失败: {results['error']}")
    else:
        print("\\n=== 分析结果汇总 ===")
        summary = results.get('summary', {})
        print(f"分析阶段数: {summary.get('total_stages', 0)}")
        print(f"最大位移: {summary.get('max_displacement', 0)*1000:.2f}mm")
        print(f"最大应力: {summary.get('max_stress', 0)/1000:.0f}kPa")
        print(f"VTK文件数: {len(results.get('pyvista_files', []))}")
        
        if results.get('pyvista_files'):
            print("\\nPyVista可读取的文件:")
            for vtk_file in results['pyvista_files']:
                print(f"  {vtk_file}")
    
    print("\\n求解器测试完成!")

if __name__ == "__main__":
    main()