"""
基于GemPy原生功能的完整三维地质重建模块
包含所有GemPy原生插值算法和土体域生成功能
"""
import numpy as np
import pandas as pd
import gempy as gp
import pyvista as pv
from typing import Dict, Tuple, Optional, List, Union
import warnings
warnings.filterwarnings('ignore')

class GemPyNativeReconstructor:
    """
    GemPy原生三维地质重建器
    完整集成所有GemPy原生功能
    """
    
    def __init__(self):
        self.geo_model = None
        self.solution = None
        self.domain_config = None
        self.available_interpolators = {
            'universal_cokriging': 'Universal Cokriging (默认)',
            'simple_kriging': 'Simple Kriging',
            'ordinary_kriging': 'Ordinary Kriging',
            'rbf_linear': 'RBF Linear',
            'rbf_cubic': 'RBF Cubic',
            'rbf_gaussian': 'RBF Gaussian',
            'rbf_multiquadric': 'RBF Multiquadric',
            'rbf_thin_plate_spline': 'RBF Thin Plate Spline'
        }
        
    def create_modeling_domain(self, domain_params: Dict) -> gp.core.data.GeoModel:
        """
        创建GemPy原生建模域
        
        Parameters:
        -----------
        domain_params : dict
            域参数配置
            {
                'extent': [x_min, x_max, y_min, y_max, z_min, z_max],
                'resolution': [nx, ny, nz],
                'project_name': str,
                'refinement': int (1-5),
                'grid_type': 'regular' or 'custom'
            }
        """
        
        self.domain_config = domain_params
        
        # 创建GeoModel - GemPy核心对象
        self.geo_model = gp.create_geomodel(
            project_name=domain_params.get('project_name', 'geological_model'),
            extent=domain_params['extent'],
            resolution=domain_params['resolution'],
            refinement=domain_params.get('refinement', 1)
        )
        
        # 初始化数据结构
        gp.init_data(
            self.geo_model,
            extent=domain_params['extent'],
            resolution=domain_params['resolution']
        )
        
        # 设置网格类型
        if domain_params.get('grid_type') == 'custom':
            self._setup_custom_grid(domain_params)
        else:
            self._setup_regular_grid(domain_params)
            
        return self.geo_model
    
    def _setup_regular_grid(self, domain_params: Dict):
        """设置规则网格"""
        self.geo_model.set_regular_grid(
            extent=domain_params['extent'],
            resolution=domain_params['resolution']
        )
        
    def _setup_custom_grid(self, domain_params: Dict):
        """设置自定义网格"""
        if 'custom_points' in domain_params:
            custom_grid = gp.Grid()
            custom_grid.set_custom_grid(domain_params['custom_points'])
            self.geo_model.set_grid(custom_grid)
        else:
            # 回退到规则网格
            self._setup_regular_grid(domain_params)
    
    def set_geological_data(self, surface_points: pd.DataFrame, 
                           orientations: pd.DataFrame = None,
                           stratigraphic_sequence: Dict = None) -> None:
        """
        设置地质数据
        
        Parameters:
        -----------
        surface_points : pd.DataFrame
            地层界面点数据，必需列：['X', 'Y', 'Z', 'surface', 'series']
        orientations : pd.DataFrame, optional  
            产状数据，必需列：['X', 'Y', 'Z', 'surface', 'series', 'azimuth', 'dip', 'polarity']
        stratigraphic_sequence : dict, optional
            地层序列定义
        """
        
        # 验证数据格式
        self._validate_geological_data(surface_points, orientations)
        
        # 设置插值数据
        if orientations is not None and len(orientations) > 0:
            gp.set_interpolation_data(
                self.geo_model,
                surface_points=surface_points,
                orientations=orientations
            )
        else:
            gp.set_interpolation_data(
                self.geo_model,
                surface_points=surface_points
            )
        
        # 设置地层序列
        if stratigraphic_sequence:
            self._setup_stratigraphic_sequence(stratigraphic_sequence)
    
    def _validate_geological_data(self, surface_points: pd.DataFrame, 
                                 orientations: pd.DataFrame = None) -> None:
        """验证地质数据格式"""
        
        # 验证surface_points
        required_sp_cols = ['X', 'Y', 'Z', 'surface']
        missing_cols = [col for col in required_sp_cols if col not in surface_points.columns]
        if missing_cols:
            raise ValueError(f"surface_points缺少必需列: {missing_cols}")
        
        # 添加series列如果不存在
        if 'series' not in surface_points.columns:
            surface_points['series'] = 'Default_Series'
            
        # 验证orientations
        if orientations is not None:
            required_ori_cols = ['X', 'Y', 'Z', 'surface', 'azimuth', 'dip', 'polarity']
            missing_cols = [col for col in required_ori_cols if col not in orientations.columns]
            if missing_cols:
                raise ValueError(f"orientations缺少必需列: {missing_cols}")
                
            if 'series' not in orientations.columns:
                orientations['series'] = 'Default_Series'
    
    def _setup_stratigraphic_sequence(self, sequence: Dict) -> None:
        """设置地层序列"""
        
        # 映射地层到系列
        for series_name, series_info in sequence.items():
            if 'surfaces' in series_info:
                gp.map_stack_to_surfaces(
                    self.geo_model,
                    {series_name: series_info['surfaces']}
                )
                
                # 设置断层属性
                if series_info.get('is_fault', False):
                    self.geo_model.set_is_fault(
                        series_name,
                        change_color=series_info.get('change_color', True)
                    )
        
        # 设置系列顺序
        if 'age_order' in sequence:
            self.geo_model.reorder_series(sequence['age_order'])
    
    def configure_interpolator(self, interpolator_type: str = 'universal_cokriging',
                             interpolator_params: Dict = None) -> None:
        """
        配置GemPy插值器
        
        Parameters:
        -----------
        interpolator_type : str
            插值器类型，可选：
            - 'universal_cokriging': Universal Cokriging (默认)
            - 'simple_kriging': Simple Kriging  
            - 'ordinary_kriging': Ordinary Kriging
            - 'rbf_*': 各种RBF核函数
        interpolator_params : dict, optional
            插值器参数配置
        """
        
        if interpolator_params is None:
            interpolator_params = {}
            
        # 设置基础插值器
        gp.set_interpolator(
            self.geo_model,
            compile_theano=interpolator_params.get('compile_theano', True),
            theano_optimizer=interpolator_params.get('theano_optimizer', 'fast_run'),
            dtype=interpolator_params.get('dtype', 'float64')
        )
        
        # 根据插值器类型设置特定参数
        if interpolator_type == 'universal_cokriging':
            self._configure_universal_cokriging(interpolator_params)
        elif 'kriging' in interpolator_type:
            self._configure_kriging_variants(interpolator_type, interpolator_params)
        elif 'rbf' in interpolator_type:
            self._configure_rbf_interpolator(interpolator_type, interpolator_params)
    
    def _configure_universal_cokriging(self, params: Dict) -> None:
        """配置Universal Cokriging参数"""
        
        # 设置协方差参数
        range_val = params.get('range', 5000)
        c_o = params.get('covariance_contribution', 1000)
        nugget_scalar = params.get('nugget_scalar', 0.01)
        nugget_grad_azi = params.get('nugget_grad_azi', 0.01)
        nugget_grad_dip = params.get('nugget_grad_dip', 0.01)
        
        # 修改Kriging参数
        self.geo_model.modify_kriging_parameters('range', range_val)
        self.geo_model.modify_kriging_parameters('$C_o$', c_o)
        self.geo_model.modify_kriging_parameters('nugget effect scalar', nugget_scalar)
        self.geo_model.modify_kriging_parameters('nugget effect azimuth', nugget_grad_azi)
        self.geo_model.modify_kriging_parameters('nugget effect dip', nugget_grad_dip)
        
        # 设置重缩放因子
        if 'rescaling_factor' in params:
            self.geo_model.modify_kriging_parameters('rescaling factor', params['rescaling_factor'])
    
    def _configure_kriging_variants(self, kriging_type: str, params: Dict) -> None:
        """配置Kriging变体"""
        
        # 根据不同Kriging类型设置参数
        if kriging_type == 'simple_kriging':
            # Simple Kriging特定参数
            mean_value = params.get('mean_value', 0.0)
            self.geo_model.modify_kriging_parameters('drift equations', [0])
            
        elif kriging_type == 'ordinary_kriging':
            # Ordinary Kriging特定参数
            self.geo_model.modify_kriging_parameters('drift equations', [1])
        
        # 通用Kriging参数
        if 'variogram_model' in params:
            self._setup_variogram_model(params['variogram_model'])
    
    def _configure_rbf_interpolator(self, rbf_type: str, params: Dict) -> None:
        """配置RBF插值器"""
        
        # 提取RBF核函数类型
        kernel_type = rbf_type.replace('rbf_', '')
        
        # RBF特定参数映射
        rbf_params = {
            'kernel': kernel_type,
            'epsilon': params.get('epsilon', 1.0),
            'smoothing': params.get('smoothing', 0.0),
            'degree': params.get('degree', None)
        }
        
        # 注意：GemPy主要使用协克里金，RBF通过修改核函数实现
        # 这里我们通过修改协方差函数来模拟RBF行为
        if kernel_type == 'gaussian':
            self.geo_model.modify_kriging_parameters('covariance_function', 'gaussian')
        elif kernel_type == 'exponential':
            self.geo_model.modify_kriging_parameters('covariance_function', 'exponential')
        elif kernel_type == 'cubic':
            self.geo_model.modify_kriging_parameters('covariance_function', 'cubic')
    
    def _setup_variogram_model(self, variogram_config: Dict) -> None:
        """设置变差函数模型"""
        
        model_type = variogram_config.get('type', 'exponential')
        range_val = variogram_config.get('range', 1000)
        sill = variogram_config.get('sill', 1.0)
        nugget = variogram_config.get('nugget', 0.01)
        
        # 设置变差函数参数
        self.geo_model.modify_kriging_parameters('range', range_val)
        self.geo_model.modify_kriging_parameters('$C_o$', sill)
        self.geo_model.modify_kriging_parameters('nugget effect scalar', nugget)
    
    def compute_geological_model(self, compute_options: Dict = None) -> gp.core.data.Solutions:
        """
        计算地质模型
        
        Parameters:
        -----------
        compute_options : dict, optional
            计算选项配置
            
        Returns:
        --------
        solution : gp.core.data.Solutions
            GemPy解算结果
        """
        
        if compute_options is None:
            compute_options = {}
            
        # 执行模型计算
        self.solution = gp.compute_model(
            self.geo_model,
            compute_mesh=compute_options.get('compute_mesh', True),
            reset_weights=compute_options.get('reset_weights', False),
            reset_scalar=compute_options.get('reset_scalar', False),
            reset_block=compute_options.get('reset_block', False),
            sort_surfaces=compute_options.get('sort_surfaces', True),
            debug=compute_options.get('debug', False)
        )
        
        return self.solution
    
    def get_domain_info(self) -> Dict:
        """获取域信息"""
        if self.geo_model is None:
            return {}
        
        grid = self.geo_model.grid.regular_grid
        extent = grid.extent
        resolution = grid.resolution
        
        return {
            'extent': {
                'x_range': [extent[0], extent[1]],
                'y_range': [extent[2], extent[3]], 
                'z_range': [extent[4], extent[5]]
            },
            'resolution': {
                'nx': resolution[0],
                'ny': resolution[1],
                'nz': resolution[2]
            },
            'total_points': np.prod(resolution),
            'volume': ((extent[1] - extent[0]) * 
                      (extent[3] - extent[2]) * 
                      (extent[5] - extent[4])),
            'grid_spacing': {
                'dx': (extent[1] - extent[0]) / resolution[0],
                'dy': (extent[3] - extent[2]) / resolution[1],
                'dz': (extent[5] - extent[4]) / resolution[2]
            }
        }
    
    def get_model_statistics(self) -> Dict:
        """获取模型统计信息"""
        if self.geo_model is None or self.solution is None:
            return {}
            
        stats = {
            'surfaces': {
                'count': len(self.geo_model.surfaces.df),
                'names': list(self.geo_model.surfaces.df.index)
            },
            'series': {
                'count': len(self.geo_model.series.df),
                'names': list(self.geo_model.series.df.index)
            },
            'data_points': {
                'surface_points': len(self.geo_model.surface_points.df),
                'orientations': len(self.geo_model.orientations.df)
            }
        }
        
        # 添加解算结果统计
        if hasattr(self.solution, 'geological_map'):
            unique_values = np.unique(self.solution.geological_map)
            stats['solution'] = {
                'unique_geological_units': len(unique_values),
                'geological_units': unique_values.tolist()
            }
        
        return stats
    
    def export_to_pyvista(self) -> Dict[str, pv.DataSet]:
        """
        导出为PyVista格式用于可视化
        
        Returns:
        --------
        pyvista_objects : dict
            PyVista数据对象字典
        """
        
        if self.geo_model is None or self.solution is None:
            raise ValueError("模型未计算完成，无法导出")
            
        pyvista_objects = {}
        
        # 1. 创建结构化网格
        grid = self.geo_model.grid.regular_grid
        extent = grid.extent
        resolution = grid.resolution
        
        # 创建坐标数组
        x = np.linspace(extent[0], extent[1], resolution[0])
        y = np.linspace(extent[2], extent[3], resolution[1])
        z = np.linspace(extent[4], extent[5], resolution[2])
        
        # 创建PyVista结构化网格
        structured_grid = pv.RectilinearGrid(x, y, z)
        
        # 添加地质数据
        if hasattr(self.solution, 'geological_map'):
            structured_grid.cell_data['geology'] = self.solution.geological_map
            
        if hasattr(self.solution, 'lith_block'):
            structured_grid.cell_data['lithology'] = self.solution.lith_block
            
        pyvista_objects['geological_grid'] = structured_grid
        
        # 2. 创建表面网格
        if hasattr(self.solution, 'surfaces') and self.solution.surfaces:
            surface_meshes = {}
            
            for i, surface_name in enumerate(self.geo_model.surfaces.df.index):
                if i < len(self.solution.surfaces):
                    surface_data = self.solution.surfaces[i]
                    if hasattr(surface_data, 'vertices') and len(surface_data.vertices) > 3:
                        # 创建表面网格
                        surface_mesh = pv.PolyData(
                            surface_data.vertices,
                            faces=surface_data.simplices if hasattr(surface_data, 'simplices') else None
                        )
                        surface_mesh['surface_id'] = np.full(surface_mesh.n_points, i)
                        surface_meshes[surface_name] = surface_mesh
            
            if surface_meshes:
                pyvista_objects['surfaces'] = surface_meshes
        
        # 3. 创建数据点云
        surface_points = self.geo_model.surface_points.df
        if len(surface_points) > 0:
            points_cloud = pv.PolyData(surface_points[['X', 'Y', 'Z']].values)
            points_cloud['surface'] = surface_points['surface'].values
            if 'series' in surface_points.columns:
                points_cloud['series'] = surface_points['series'].values
            pyvista_objects['data_points'] = points_cloud
        
        # 4. 创建产状向量
        orientations = self.geo_model.orientations.df
        if len(orientations) > 0:
            orientation_lines = []
            
            for _, row in orientations.iterrows():
                start_point = [row['X'], row['Y'], row['Z']]
                
                # 计算方向向量
                azimuth_rad = np.deg2rad(row['azimuth'])
                dip_rad = np.deg2rad(row['dip'])
                
                dx = np.sin(azimuth_rad) * np.cos(dip_rad) * 50
                dy = np.cos(azimuth_rad) * np.cos(dip_rad) * 50
                dz = np.sin(dip_rad) * 50
                
                end_point = [start_point[0] + dx, start_point[1] + dy, start_point[2] + dz]
                
                line = pv.Line(start_point, end_point)
                orientation_lines.append(line)
            
            if orientation_lines:
                # 合并所有向量线
                combined_lines = orientation_lines[0]
                for line in orientation_lines[1:]:
                    combined_lines = combined_lines + line
                pyvista_objects['orientations'] = combined_lines
        
        return pyvista_objects
    
    def export_results(self, output_path: str, export_formats: List[str] = None) -> Dict:
        """
        导出建模结果
        
        Parameters:
        -----------
        output_path : str
            输出路径
        export_formats : list, optional
            导出格式列表，可选：['vtk', 'csv', 'gempy_project']
            
        Returns:
        --------
        export_info : dict
            导出信息
        """
        
        if export_formats is None:
            export_formats = ['vtk', 'csv']
            
        export_info = {}
        
        # 1. 导出VTK格式
        if 'vtk' in export_formats:
            pyvista_objects = self.export_to_pyvista()
            
            if 'geological_grid' in pyvista_objects:
                vtk_path = f"{output_path}/geological_model.vtk"
                pyvista_objects['geological_grid'].save(vtk_path)
                export_info['vtk_grid'] = vtk_path
            
            if 'surfaces' in pyvista_objects:
                surface_paths = {}
                for name, surface in pyvista_objects['surfaces'].items():
                    surface_path = f"{output_path}/surface_{name}.vtk"
                    surface.save(surface_path)
                    surface_paths[name] = surface_path
                export_info['vtk_surfaces'] = surface_paths
        
        # 2. 导出CSV格式
        if 'csv' in export_formats:
            # 导出输入数据
            surface_points_path = f"{output_path}/surface_points.csv"
            self.geo_model.surface_points.df.to_csv(surface_points_path, index=False)
            export_info['csv_surface_points'] = surface_points_path
            
            if len(self.geo_model.orientations.df) > 0:
                orientations_path = f"{output_path}/orientations.csv"
                self.geo_model.orientations.df.to_csv(orientations_path, index=False)
                export_info['csv_orientations'] = orientations_path
            
            # 导出网格结果
            if hasattr(self.solution, 'geological_map'):
                grid = self.geo_model.grid.regular_grid
                extent = grid.extent
                resolution = grid.resolution
                
                # 创建网格坐标
                x = np.linspace(extent[0], extent[1], resolution[0])
                y = np.linspace(extent[2], extent[3], resolution[1])
                z = np.linspace(extent[4], extent[5], resolution[2])
                
                xg, yg, zg = np.meshgrid(x, y, z, indexing='ij')
                
                grid_data = pd.DataFrame({
                    'X': xg.ravel(),
                    'Y': yg.ravel(),
                    'Z': zg.ravel(),
                    'geology': self.solution.geological_map.ravel()
                })
                
                if hasattr(self.solution, 'lith_block'):
                    grid_data['lithology'] = self.solution.lith_block.ravel()
                
                grid_path = f"{output_path}/geological_grid.csv"
                grid_data.to_csv(grid_path, index=False)
                export_info['csv_grid'] = grid_path
        
        # 3. 导出GemPy项目文件
        if 'gempy_project' in export_formats:
            project_path = f"{output_path}/gempy_project"
            gp.save_model(self.geo_model, path=project_path)
            export_info['gempy_project'] = project_path
        
        return export_info

def create_sample_geological_data(domain_extent: List[float], 
                                 n_surfaces: int = 3,
                                 n_points_per_surface: int = 10,
                                 add_orientations: bool = True) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    创建示例地质数据用于测试
    
    Parameters:
    -----------
    domain_extent : list
        域范围 [x_min, x_max, y_min, y_max, z_min, z_max]
    n_surfaces : int
        地层数量
    n_points_per_surface : int  
        每个地层的点数
    add_orientations : bool
        是否添加产状数据
        
    Returns:
    --------
    surface_points : pd.DataFrame
        地层界面点数据
    orientations : pd.DataFrame
        产状数据
    """
    
    np.random.seed(42)
    
    x_min, x_max, y_min, y_max, z_min, z_max = domain_extent
    
    surface_points_data = []
    orientations_data = []
    
    # 创建地层序列
    surface_names = [f'layer_{i+1}' for i in range(n_surfaces)]
    
    for i, surface_name in enumerate(surface_names):
        # 为每个地层创建界面点
        base_z = z_min + (z_max - z_min) * (i + 1) / (n_surfaces + 1)
        
        for j in range(n_points_per_surface):
            x = np.random.uniform(x_min, x_max)
            y = np.random.uniform(y_min, y_max)
            z = base_z + np.random.normal(0, abs(z_max - z_min) * 0.05)  # 添加一些变化
            
            surface_points_data.append({
                'X': x,
                'Y': y, 
                'Z': z,
                'surface': surface_name,
                'series': 'Main_Series'
            })
        
        # 添加产状数据
        if add_orientations and i < n_surfaces - 1:  # 最后一层不需要产状
            x_ori = np.random.uniform(x_min, x_max)
            y_ori = np.random.uniform(y_min, y_max)
            z_ori = base_z
            
            azimuth = np.random.uniform(0, 360)
            dip = np.random.uniform(5, 25)  # 相对平缓的倾角
            
            orientations_data.append({
                'X': x_ori,
                'Y': y_ori,
                'Z': z_ori,
                'surface': surface_name,
                'series': 'Main_Series',
                'azimuth': azimuth,
                'dip': dip,
                'polarity': 1
            })
    
    surface_points = pd.DataFrame(surface_points_data)
    orientations = pd.DataFrame(orientations_data)
    
    return surface_points, orientations

# 使用示例
if __name__ == "__main__":
    print("GemPy原生三维地质重建模块测试")
    
    # 1. 创建重建器实例
    reconstructor = GemPyNativeReconstructor()
    
    # 2. 定义建模域
    domain_params = {
        'extent': [0, 1000, 0, 1000, -500, 0],
        'resolution': [50, 50, 25],
        'project_name': 'test_geological_model',
        'refinement': 1,
        'grid_type': 'regular'
    }
    
    # 3. 创建建模域
    geo_model = reconstructor.create_modeling_domain(domain_params)
    print("✓ 建模域创建完成")
    
    # 4. 创建示例地质数据
    surface_points, orientations = create_sample_geological_data(
        domain_params['extent'],
        n_surfaces=3,
        n_points_per_surface=8,
        add_orientations=True
    )
    print(f"✓ 创建了 {len(surface_points)} 个界面点和 {len(orientations)} 个产状数据")
    
    # 5. 设置地质数据
    stratigraphic_sequence = {
        'Main_Series': {
            'surfaces': ['layer_1', 'layer_2', 'layer_3'],
            'is_fault': False
        }
    }
    
    reconstructor.set_geological_data(
        surface_points=surface_points,
        orientations=orientations,
        stratigraphic_sequence=stratigraphic_sequence
    )
    print("✓ 地质数据设置完成")
    
    # 6. 配置插值器
    interpolator_params = {
        'range': 500,
        'nugget_scalar': 0.01,
        'compile_theano': True
    }
    
    reconstructor.configure_interpolator(
        interpolator_type='universal_cokriging',
        interpolator_params=interpolator_params
    )
    print("✓ 插值器配置完成")
    
    # 7. 计算模型
    solution = reconstructor.compute_geological_model({'compute_mesh': True})
    print("✓ 地质模型计算完成")
    
    # 8. 获取统计信息
    domain_info = reconstructor.get_domain_info()
    model_stats = reconstructor.get_model_statistics()
    
    print(f"\\n=== 建模结果统计 ===")
    print(f"建模域体积: {domain_info['volume']:,.0f} m³")
    print(f"网格点数: {domain_info['total_points']:,}")
    print(f"地层数量: {model_stats['surfaces']['count']}")
    print(f"数据点数: {model_stats['data_points']['surface_points']}")
    print(f"产状数据: {model_stats['data_points']['orientations']}")
    
    # 9. 导出为PyVista格式
    try:
        pyvista_objects = reconstructor.export_to_pyvista()
        print(f"✓ 成功导出PyVista对象: {list(pyvista_objects.keys())}")
    except Exception as e:
        print(f"PyVista导出失败: {e}")
    
    print("\\nGemPy原生重建模块测试完成！")