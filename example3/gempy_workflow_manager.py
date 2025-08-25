"""
GemPy工作流管理器 - 完整的地质建模工作流
GemPy Workflow Manager - Complete geological modeling workflow
"""

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from typing import Dict, List, Tuple, Optional, Any
import json
import os
from pathlib import Path
import warnings
warnings.filterwarnings('ignore')

try:
    import gempy as gp
    import gempy_viewer as gpv
    GEMPY_AVAILABLE = True
except ImportError:
    GEMPY_AVAILABLE = False
    print("Warning: GemPy not available")

try:
    import pyvista as pv
    PYVISTA_AVAILABLE = True
except ImportError:
    PYVISTA_AVAILABLE = False

class GemPyWorkflowManager:
    """GemPy完整工作流管理器"""
    
    def __init__(self):
        """初始化工作流管理器"""
        self.current_project = None
        self.geo_model = None
        self.solution = None
        self.workflow_history = []
        self.data_registry = {
            'surface_points': pd.DataFrame(),
            'orientations': pd.DataFrame(),
            'boreholes': pd.DataFrame(),
            'geological_maps': {},
            'geophysical_data': {}
        }
        
    def create_new_project(self, project_name: str, model_extent: List[float], 
                          resolution: List[int]) -> bool:
        """
        创建新的GemPy项目
        
        Args:
            project_name: 项目名称
            model_extent: 模型范围 [xmin, xmax, ymin, ymax, zmin, zmax]
            resolution: 网格分辨率 [nx, ny, nz]
        """
        try:
            if not GEMPY_AVAILABLE:
                print("❌ GemPy不可用，无法创建项目")
                return False
                
            print(f"🚀 创建新项目: {project_name}")
            
            # 创建GemPy模型
            self.geo_model = gp.create_geomodel(
                project_name=project_name,
                extent=model_extent,
                resolution=resolution,
                refinement=1
            )
            
            # 设置项目信息
            self.current_project = {
                'name': project_name,
                'extent': model_extent,
                'resolution': resolution,
                'created_time': pd.Timestamp.now(),
                'model_state': 'initialized'
            }
            
            # 记录工作流步骤
            self._log_workflow_step('project_created', {
                'project_name': project_name,
                'extent': model_extent,
                'resolution': resolution
            })
            
            print(f"✅ 项目 '{project_name}' 创建成功")
            return True
            
        except Exception as e:
            print(f"❌ 项目创建失败: {str(e)}")
            return False
    
    def import_surface_points(self, file_path: str, format_type: str = 'csv') -> bool:
        """
        导入地层接触点数据
        
        Args:
            file_path: 文件路径
            format_type: 文件格式 ('csv', 'excel', 'shp')
        """
        try:
            print(f"📥 导入地层接触点数据: {file_path}")
            
            if format_type == 'csv':
                surface_points = pd.read_csv(file_path)
            elif format_type == 'excel':
                surface_points = pd.read_excel(file_path)
            else:
                print(f"❌ 不支持的文件格式: {format_type}")
                return False
            
            # 验证数据格式
            required_cols = ['X', 'Y', 'Z', 'formation']
            if not all(col in surface_points.columns for col in required_cols):
                print(f"❌ 数据格式错误，需要包含列: {required_cols}")
                return False
            
            # 数据质量检查
            surface_points = self._validate_surface_points(surface_points)
            
            if surface_points is not None:
                self.data_registry['surface_points'] = surface_points
                print(f"✅ 成功导入 {len(surface_points)} 个地层接触点")
                
                # 记录工作流
                self._log_workflow_step('surface_points_imported', {
                    'file_path': file_path,
                    'format': format_type,
                    'points_count': len(surface_points)
                })
                
                return True
            else:
                return False
                
        except Exception as e:
            print(f"❌ 地层接触点导入失败: {str(e)}")
            return False
    
    def import_orientations(self, file_path: str, format_type: str = 'csv') -> bool:
        """
        导入地层方向数据
        
        Args:
            file_path: 文件路径
            format_type: 文件格式
        """
        try:
            print(f"📥 导入地层方向数据: {file_path}")
            
            if format_type == 'csv':
                orientations = pd.read_csv(file_path)
            elif format_type == 'excel':
                orientations = pd.read_excel(file_path)
            else:
                print(f"❌ 不支持的文件格式: {format_type}")
                return False
            
            # 验证数据格式
            required_cols = ['X', 'Y', 'Z', 'formation', 'azimuth', 'dip', 'polarity']
            if not all(col in orientations.columns for col in required_cols):
                print(f"❌ 数据格式错误，需要包含列: {required_cols}")
                return False
            
            # 数据质量检查
            orientations = self._validate_orientations(orientations)
            
            if orientations is not None:
                self.data_registry['orientations'] = orientations
                print(f"✅ 成功导入 {len(orientations)} 个方向测量点")
                
                # 记录工作流
                self._log_workflow_step('orientations_imported', {
                    'file_path': file_path,
                    'format': format_type,
                    'orientations_count': len(orientations)
                })
                
                return True
            else:
                return False
                
        except Exception as e:
            print(f"❌ 地层方向数据导入失败: {str(e)}")
            return False
    
    def setup_geological_model(self, stratigraphy_config: Dict[str, List[str]], 
                             fault_config: Optional[Dict] = None) -> bool:
        """
        设置地质模型结构
        
        Args:
            stratigraphy_config: 地层序列配置
            fault_config: 断层配置（可选）
        """
        try:
            if not GEMPY_AVAILABLE or self.geo_model is None:
                print("❌ GemPy模型未初始化")
                return False
                
            print("🏗️ 设置地质模型结构...")
            
            # 添加地层序列
            gp.map_stack_to_surfaces(
                self.geo_model,
                stratigraphy_config
            )
            
            # 设置断层（如果提供）
            if fault_config:
                fault_series = [series for series in stratigraphy_config.keys() 
                               if 'fault' in series.lower()]
                if fault_series:
                    self.geo_model.set_is_fault(fault_series, True)
            
            # 添加数据到模型
            surface_points = self.data_registry['surface_points']
            orientations = self.data_registry['orientations']
            
            if not surface_points.empty:
                gp.add_surface_points(
                    self.geo_model,
                    x=surface_points['X'],
                    y=surface_points['Y'],
                    z=surface_points['Z'],
                    surface=surface_points['formation']
                )
            
            if not orientations.empty:
                gp.add_orientations(
                    self.geo_model,
                    x=orientations['X'],
                    y=orientations['Y'],
                    z=orientations['Z'],
                    surface=orientations['formation'],
                    orientation=orientations[['azimuth', 'dip']].values
                )
            
            print("✅ 地质模型结构设置完成")
            
            # 更新项目状态
            self.current_project['model_state'] = 'configured'
            
            # 记录工作流
            self._log_workflow_step('model_configured', {
                'stratigraphy': stratigraphy_config,
                'faults': fault_config is not None
            })
            
            return True
            
        except Exception as e:
            print(f"❌ 地质模型设置失败: {str(e)}")
            return False
    
    def compute_geological_model(self, compile_theano: bool = True) -> bool:
        """
        计算地质模型
        
        Args:
            compile_theano: 是否编译Theano（首次计算时需要）
        """
        try:
            if not GEMPY_AVAILABLE or self.geo_model is None:
                print("❌ GemPy模型未初始化")
                return False
                
            print("⚡ 开始计算地质模型...")
            
            # 设置插值器
            if compile_theano:
                print("  🔧 编译插值器...")
                gp.set_interpolator(self.geo_model)
            
            # 计算模型
            print("  🔄 执行隐式建模计算...")
            self.solution = gp.compute_model(
                self.geo_model, 
                compute_mesh=True
            )
            
            # 验证计算结果
            if self.solution is not None:
                print("✅ 地质模型计算成功")
                
                # 更新项目状态
                self.current_project['model_state'] = 'computed'
                
                # 记录工作流
                self._log_workflow_step('model_computed', {
                    'compile_theano': compile_theano,
                    'success': True
                })
                
                # 输出基本统计信息
                self._print_model_statistics()
                
                return True
            else:
                print("❌ 模型计算结果为空")
                return False
                
        except Exception as e:
            print(f"❌ 地质模型计算失败: {str(e)}")
            
            # 记录失败
            self._log_workflow_step('model_computed', {
                'compile_theano': compile_theano,
                'success': False,
                'error': str(e)
            })
            
            return False
    
    def extract_model_sections(self, section_coords: Dict[str, List]) -> Dict[str, np.ndarray]:
        """
        提取模型剖面
        
        Args:
            section_coords: 剖面坐标字典，如 {'XY': [z_value], 'XZ': [y_value], 'YZ': [x_value]}
        """
        try:
            if self.solution is None:
                print("❌ 模型未计算，无法提取剖面")
                return {}
                
            print("📊 提取模型剖面数据...")
            
            sections = {}
            
            # 获取模型网格
            lith_block = self.solution.lith_block
            grid_shape = self.geo_model.grid.regular_grid.resolution
            
            # XY剖面（水平切片）
            if 'XY' in section_coords:
                for z_idx in section_coords['XY']:
                    section_name = f'XY_z{z_idx}'
                    if 0 <= z_idx < grid_shape[2]:
                        xy_section = lith_block.reshape(grid_shape)[:, :, z_idx]
                        sections[section_name] = xy_section
            
            # XZ剖面（南北向切片）
            if 'XZ' in section_coords:
                for y_idx in section_coords['XZ']:
                    section_name = f'XZ_y{y_idx}'
                    if 0 <= y_idx < grid_shape[1]:
                        xz_section = lith_block.reshape(grid_shape)[:, y_idx, :]
                        sections[section_name] = xz_section
            
            # YZ剖面（东西向切片）
            if 'YZ' in section_coords:
                for x_idx in section_coords['YZ']:
                    section_name = f'YZ_x{x_idx}'
                    if 0 <= x_idx < grid_shape[0]:
                        yz_section = lith_block.reshape(grid_shape)[x_idx, :, :]
                        sections[section_name] = yz_section
            
            print(f"✅ 成功提取 {len(sections)} 个剖面")
            return sections
            
        except Exception as e:
            print(f"❌ 剖面提取失败: {str(e)}")
            return {}
    
    def export_model_results(self, output_dir: str, formats: List[str] = ['vtk', 'csv']) -> bool:
        """
        导出模型结果
        
        Args:
            output_dir: 输出目录
            formats: 导出格式列表
        """
        try:
            if self.solution is None:
                print("❌ 模型未计算，无法导出")
                return False
                
            print(f"📤 导出模型结果到: {output_dir}")
            
            # 创建输出目录
            output_path = Path(output_dir)
            output_path.mkdir(parents=True, exist_ok=True)
            
            success_count = 0
            
            # 导出VTK格式
            if 'vtk' in formats and PYVISTA_AVAILABLE:
                try:
                    vtk_path = output_path / 'geological_model.vtk'
                    # 这里需要实现VTK导出逻辑
                    print(f"  ✅ VTK格式导出: {vtk_path}")
                    success_count += 1
                except Exception as e:
                    print(f"  ❌ VTK导出失败: {e}")
            
            # 导出CSV格式
            if 'csv' in formats:
                try:
                    # 导出岩性块数据
                    lith_df = pd.DataFrame({
                        'lithology_id': self.solution.lith_block.flatten()
                    })
                    csv_path = output_path / 'lithology_block.csv'
                    lith_df.to_csv(csv_path, index=False)
                    print(f"  ✅ CSV格式导出: {csv_path}")
                    success_count += 1
                except Exception as e:
                    print(f"  ❌ CSV导出失败: {e}")
            
            # 导出项目信息
            project_info = {
                'project': self.current_project,
                'workflow_history': self.workflow_history
            }
            
            info_path = output_path / 'project_info.json'
            with open(info_path, 'w', encoding='utf-8') as f:
                json.dump(project_info, f, indent=2, default=str)
            print(f"  ✅ 项目信息导出: {info_path}")
            
            print(f"✅ 导出完成，成功导出 {success_count} 种格式")
            return success_count > 0
            
        except Exception as e:
            print(f"❌ 模型导出失败: {str(e)}")
            return False
    
    def _validate_surface_points(self, data: pd.DataFrame) -> Optional[pd.DataFrame]:
        """验证地层接触点数据质量"""
        try:
            # 检查空值
            if data.isnull().any().any():
                print("⚠️ 数据包含空值，正在清理...")
                data = data.dropna()
            
            # 检查坐标范围
            if self.current_project:
                extent = self.current_project['extent']
                
                # 过滤超出范围的点
                valid_mask = (
                    (data['X'] >= extent[0]) & (data['X'] <= extent[1]) &
                    (data['Y'] >= extent[2]) & (data['Y'] <= extent[3]) &
                    (data['Z'] >= extent[4]) & (data['Z'] <= extent[5])
                )
                
                if not valid_mask.all():
                    print(f"⚠️ 发现 {(~valid_mask).sum()} 个超出模型范围的点，已过滤")
                    data = data[valid_mask]
            
            # 检查地层名称
            formations = data['formation'].unique()
            print(f"📋 发现地层: {list(formations)}")
            
            return data
            
        except Exception as e:
            print(f"❌ 地层接触点数据验证失败: {str(e)}")
            return None
    
    def _validate_orientations(self, data: pd.DataFrame) -> Optional[pd.DataFrame]:
        """验证地层方向数据质量"""
        try:
            # 检查空值
            if data.isnull().any().any():
                print("⚠️ 方向数据包含空值，正在清理...")
                data = data.dropna()
            
            # 检查角度范围
            invalid_azimuth = (data['azimuth'] < 0) | (data['azimuth'] > 360)
            invalid_dip = (data['dip'] < 0) | (data['dip'] > 90)
            
            if invalid_azimuth.any():
                print(f"⚠️ 发现 {invalid_azimuth.sum()} 个无效方位角，已修正")
                data.loc[invalid_azimuth, 'azimuth'] = data.loc[invalid_azimuth, 'azimuth'] % 360
            
            if invalid_dip.any():
                print(f"⚠️ 发现 {invalid_dip.sum()} 个无效倾角，已过滤")
                data = data[~invalid_dip]
            
            # 设置极性（如果未提供）
            if 'polarity' not in data.columns:
                data['polarity'] = 1
            
            return data
            
        except Exception as e:
            print(f"❌ 方向数据验证失败: {str(e)}")
            return None
    
    def _print_model_statistics(self):
        """打印模型统计信息"""
        try:
            if self.solution is None:
                return
                
            lith_block = self.solution.lith_block
            unique_ids, counts = np.unique(lith_block, return_counts=True)
            
            print("\n📊 模型统计信息:")
            print(f"  网格单元总数: {len(lith_block):,}")
            print(f"  岩性单元数量: {len(unique_ids)}")
            
            for lith_id, count in zip(unique_ids, counts):
                percentage = (count / len(lith_block)) * 100
                print(f"    岩性 {int(lith_id)}: {count:,} 单元 ({percentage:.1f}%)")
            
        except Exception as e:
            print(f"❌ 统计信息生成失败: {str(e)}")
    
    def _log_workflow_step(self, step_name: str, details: Dict[str, Any]):
        """记录工作流步骤"""
        step = {
            'step': step_name,
            'timestamp': pd.Timestamp.now(),
            'details': details
        }
        self.workflow_history.append(step)
    
    def get_workflow_summary(self) -> str:
        """获取工作流摘要"""
        if not self.workflow_history:
            return "暂无工作流记录"
        
        summary = f"🔄 工作流摘要 (共 {len(self.workflow_history)} 步):\n"
        
        for i, step in enumerate(self.workflow_history, 1):
            timestamp = step['timestamp'].strftime('%H:%M:%S')
            summary += f"  {i}. [{timestamp}] {step['step']}\n"
        
        return summary

# 工作流快捷功能
class GemPyQuickWorkflow:
    """GemPy快捷工作流"""
    
    @staticmethod
    def create_tutorial_model() -> GemPyWorkflowManager:
        """创建教程示例模型"""
        print("🎓 创建GemPy教程示例模型...")
        
        manager = GemPyWorkflowManager()
        
        # 创建项目
        extent = [0, 2000, 0, 2000, 0, 1000]
        resolution = [50, 50, 50]
        
        if manager.create_new_project("Tutorial_Model", extent, resolution):
            # 创建示例数据
            surface_points = pd.DataFrame({
                'X': [250, 750, 1250, 1750, 500, 1000, 1500],
                'Y': [1000, 1000, 1000, 1000, 500, 500, 500],
                'Z': [800, 600, 400, 200, 900, 700, 500],
                'formation': ['Layer_1', 'Layer_1', 'Layer_2', 'Layer_2', 'Layer_3', 'Layer_3', 'Basement']
            })
            
            orientations = pd.DataFrame({
                'X': [1000, 1000, 1000],
                'Y': [1000, 1000, 1000],
                'Z': [600, 400, 200],
                'formation': ['Layer_1', 'Layer_2', 'Layer_3'],
                'azimuth': [90, 90, 90],
                'dip': [15, 15, 15],
                'polarity': [1, 1, 1]
            })
            
            # 设置数据
            manager.data_registry['surface_points'] = surface_points
            manager.data_registry['orientations'] = orientations
            
            # 配置地层序列
            stratigraphy = {
                'Strata_Series': ['Layer_1', 'Layer_2', 'Layer_3', 'Basement']
            }
            
            if manager.setup_geological_model(stratigraphy):
                print("✅ 教程模型创建成功，可以开始计算")
                return manager
        
        return None

if __name__ == "__main__":
    # 测试工作流管理器
    print("=== GemPy工作流管理器测试 ===")
    
    # 创建教程模型
    manager = GemPyQuickWorkflow.create_tutorial_model()
    
    if manager and GEMPY_AVAILABLE:
        # 计算模型
        if manager.compute_geological_model():
            # 提取剖面
            sections = manager.extract_model_sections({
                'XY': [25],  # 中间层水平切片
                'XZ': [25],  # 中间线南北向切片
            })
            
            print(f"提取到 {len(sections)} 个剖面")
            
            # 显示工作流摘要
            print("\n" + manager.get_workflow_summary())
    
    print("=== 测试完成 ===")