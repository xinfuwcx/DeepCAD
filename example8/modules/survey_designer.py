"""
SimPEG 观测系统设计器
支持多种地球物理方法的观测系统设计和优化
"""

import numpy as np
from typing import List, Tuple, Dict, Optional, Union
import matplotlib.pyplot as plt
from scipy.spatial.distance import cdist


class SurveyDesigner:
    """观测系统设计器"""
    
    def __init__(self):
        self.surveys = {}
        self.current_survey = None
        
    def design_gravity_survey(self, 
                            stations: Union[np.ndarray, List],
                            station_spacing: float = None,
                            components: List[str] = ['gz'],
                            elevation: float = 0.0) -> Dict:
        """
        设计重力观测系统
        
        Parameters:
        -----------
        stations : array or list
            测点坐标 (n_stations, 2) 或 (n_stations, 3)
        station_spacing : float, optional
            测点间距（用于规则网格）
        components : list
            重力分量 ['gz', 'gx', 'gy'] 等
        elevation : float
            观测高程
            
        Returns:
        --------
        survey_config : dict
            观测系统配置
        """
        if isinstance(stations, list):
            stations = np.array(stations)
            
        # 确保为3D坐标
        if stations.shape[1] == 2:
            stations = np.column_stack([stations, np.full(stations.shape[0], elevation)])
        elif stations.shape[1] == 3:
            stations[:, 2] = elevation  # 统一设置观测高程
            
        # 检查测点间距
        if station_spacing is not None:
            distances = cdist(stations[:, :2], stations[:, :2])
            distances[distances == 0] = np.inf  # 排除自身距离
            min_distance = np.min(distances)
            
            if min_distance < station_spacing * 0.8:
                print(f"警告: 最小测点间距 {min_distance:.1f}m 小于设计间距 {station_spacing:.1f}m")
                
        survey_config = {
            'method': 'gravity',
            'stations': stations,
            'n_stations': len(stations),
            'components': components,
            'elevation': elevation,
            'station_spacing': station_spacing,
            'survey_area': self._calculate_survey_area(stations),
            'station_density': len(stations) / self._calculate_survey_area(stations)
        }
        
        self.surveys['gravity'] = survey_config
        self.current_survey = survey_config
        
        print(f"重力观测系统设计完成:")
        print(f"  测点数量: {len(stations)}")
        print(f"  观测分量: {components}")
        print(f"  观测高程: {elevation:.1f} m")
        print(f"  测网面积: {survey_config['survey_area']:.1f} km²")
        print(f"  测点密度: {survey_config['station_density']:.3f} 点/km²")
        
        return survey_config
        
    def design_regular_gravity_grid(self, 
                                  bounds: Dict,
                                  spacing: float,
                                  elevation: float = 0.0) -> Dict:
        """
        设计规则重力测网
        
        Parameters:
        -----------
        bounds : dict
            测区边界 {'x': [xmin, xmax], 'y': [ymin, ymax]}
        spacing : float
            测点间距 (米)
        elevation : float
            观测高程
            
        Returns:
        --------
        survey_config : dict
            观测系统配置
        """
        x_coords = np.arange(bounds['x'][0], bounds['x'][1] + spacing, spacing)
        y_coords = np.arange(bounds['y'][0], bounds['y'][1] + spacing, spacing)
        
        X, Y = np.meshgrid(x_coords, y_coords)
        stations = np.column_stack([X.ravel(), Y.ravel(), 
                                  np.full(X.size, elevation)])
        
        return self.design_gravity_survey(stations, spacing, elevation=elevation)
        
    def design_magnetic_survey(self,
                             stations: Union[np.ndarray, List],
                             background_field: List[float] = [50000, 60, 0],
                             components: List[str] = ['tmi'],
                             flight_height: float = 100.0) -> Dict:
        """
        设计磁法观测系统
        
        Parameters:
        -----------
        stations : array or list
            测点坐标
        background_field : list
            背景磁场 [强度(nT), 倾角(度), 偏角(度)]
        components : list
            磁场分量 ['tmi', 'bx', 'by', 'bz'] 等
        flight_height : float
            飞行高度（航磁）或观测高度
            
        Returns:
        --------
        survey_config : dict
            观测系统配置
        """
        if isinstance(stations, list):
            stations = np.array(stations)
            
        # 确保为3D坐标，设置观测高度
        if stations.shape[1] == 2:
            stations = np.column_stack([stations, np.full(stations.shape[0], flight_height)])
        else:
            stations[:, 2] = flight_height
            
        survey_config = {
            'method': 'magnetics',
            'stations': stations,
            'n_stations': len(stations),
            'components': components,
            'background_field': {
                'intensity': background_field[0],
                'inclination': background_field[1],
                'declination': background_field[2]
            },
            'flight_height': flight_height,
            'survey_area': self._calculate_survey_area(stations),
            'line_spacing': None,  # 将根据测线设计计算
            'survey_type': 'aeromagnetic' if flight_height > 50 else 'ground_magnetic'
        }
        
        self.surveys['magnetics'] = survey_config
        self.current_survey = survey_config
        
        print(f"磁法观测系统设计完成:")
        print(f"  测点数量: {len(stations)}")
        print(f"  观测分量: {components}")
        print(f"  观测高度: {flight_height:.1f} m")
        print(f"  背景磁场: {background_field[0]:.0f} nT, I={background_field[1]:.1f}°, D={background_field[2]:.1f}°")
        
        return survey_config
        
    def design_magnetic_flight_lines(self,
                                   bounds: Dict,
                                   line_spacing: float,
                                   line_direction: float = 0,
                                   flight_height: float = 100.0,
                                   station_spacing: float = 10.0) -> Dict:
        """
        设计航磁测线
        
        Parameters:
        -----------
        bounds : dict
            测区边界
        line_spacing : float
            测线间距 (米)
        line_direction : float
            测线方向 (度，0为东西向)
        flight_height : float
            飞行高度
        station_spacing : float
            测点间距
            
        Returns:
        --------
        survey_config : dict
            观测系统配置
        """
        # 计算测线
        if line_direction == 0:  # 东西向测线
            y_lines = np.arange(bounds['y'][0], bounds['y'][1] + line_spacing, line_spacing)
            stations = []
            
            for y in y_lines:
                x_coords = np.arange(bounds['x'][0], bounds['x'][1] + station_spacing, station_spacing)
                for x in x_coords:
                    stations.append([x, y, flight_height])
                    
        elif line_direction == 90:  # 南北向测线
            x_lines = np.arange(bounds['x'][0], bounds['x'][1] + line_spacing, line_spacing)
            stations = []
            
            for x in x_lines:
                y_coords = np.arange(bounds['y'][0], bounds['y'][1] + station_spacing, station_spacing)
                for y in y_coords:
                    stations.append([x, y, flight_height])
                    
        else:
            raise NotImplementedError("任意角度测线设计待实现")
            
        stations = np.array(stations)
        
        survey_config = self.design_magnetic_survey(stations, flight_height=flight_height)
        survey_config['line_spacing'] = line_spacing
        survey_config['line_direction'] = line_direction
        survey_config['station_spacing'] = station_spacing
        
        n_lines = len(y_lines) if line_direction == 0 else len(x_lines)
        print(f"  测线数量: {n_lines}")
        print(f"  测线间距: {line_spacing:.1f} m")
        print(f"  测线方向: {line_direction:.1f}°")
        
        return survey_config
        
    def design_dc_survey(self,
                        electrodes: Union[np.ndarray, List],
                        survey_type: str = 'dipole-dipole',
                        a_spacings: List[float] = None,
                        n_levels: int = 6) -> Dict:
        """
        设计直流电法观测系统
        
        Parameters:
        -----------
        electrodes : array or list
            电极位置
        survey_type : str
            排列类型 ['wenner', 'schlumberger', 'dipole-dipole', 'pole-dipole']
        a_spacings : list
            电极距
        n_levels : int
            观测层数（偶极排列）
            
        Returns:
        --------
        survey_config : dict
            观测系统配置
        """
        if isinstance(electrodes, list):
            electrodes = np.array(electrodes)
            
        if a_spacings is None:
            a_spacings = [5, 10, 15, 20, 25, 30]  # 默认电极距
            
        survey_config = {
            'method': 'dc_resistivity',
            'electrodes': electrodes,
            'n_electrodes': len(electrodes),
            'survey_type': survey_type,
            'a_spacings': a_spacings,
            'n_levels': n_levels,
            'max_depth': max(a_spacings) * 0.2,  # 估算最大勘探深度
        }
        
        # 计算测量配置数量
        if survey_type == 'wenner':
            n_measurements = len(a_spacings) * (len(electrodes) - 3)
        elif survey_type == 'dipole-dipole':
            n_measurements = 0
            for a in a_spacings:
                for n in range(1, n_levels + 1):
                    n_measurements += len(electrodes) - 3 * a - n * a
        else:
            n_measurements = len(a_spacings) * len(electrodes)  # 粗略估算
            
        survey_config['n_measurements'] = max(0, n_measurements)
        
        self.surveys['dc_resistivity'] = survey_config
        self.current_survey = survey_config
        
        print(f"直流电法观测系统设计完成:")
        print(f"  电极数量: {len(electrodes)}")
        print(f"  排列类型: {survey_type}")
        print(f"  电极距: {a_spacings}")
        print(f"  测量数量: {n_measurements}")
        print(f"  最大深度: {survey_config['max_depth']:.1f} m")
        
        return survey_config
        
    def design_em_survey(self,
                        transmitters: Union[np.ndarray, List],
                        receivers: Union[np.ndarray, List],
                        frequencies: Union[np.ndarray, List],
                        tx_type: str = 'loop',
                        rx_type: str = 'coil') -> Dict:
        """
        设计电磁法观测系统
        
        Parameters:
        -----------
        transmitters : array or list
            发射器位置
        receivers : array or list
            接收器位置
        frequencies : array or list
            观测频率
        tx_type : str
            发射器类型 ['loop', 'dipole', 'grounded']
        rx_type : str
            接收器类型 ['coil', 'dipole']
            
        Returns:
        --------
        survey_config : dict
            观测系统配置
        """
        if isinstance(transmitters, list):
            transmitters = np.array(transmitters)
        if isinstance(receivers, list):
            receivers = np.array(receivers)
        if isinstance(frequencies, list):
            frequencies = np.array(frequencies)
            
        survey_config = {
            'method': 'electromagnetics',
            'transmitters': transmitters,
            'receivers': receivers,
            'frequencies': frequencies,
            'n_transmitters': len(transmitters),
            'n_receivers': len(receivers),
            'n_frequencies': len(frequencies),
            'tx_type': tx_type,
            'rx_type': rx_type,
            'frequency_range': [float(np.min(frequencies)), float(np.max(frequencies))],
            'n_measurements': len(transmitters) * len(receivers) * len(frequencies)
        }
        
        # 计算发射-接收距离统计
        if len(transmitters) > 0 and len(receivers) > 0:
            distances = cdist(transmitters[:, :2], receivers[:, :2])
            survey_config.update({
                'min_offset': float(np.min(distances)),
                'max_offset': float(np.max(distances)),
                'mean_offset': float(np.mean(distances))
            })
            
        self.surveys['electromagnetics'] = survey_config
        self.current_survey = survey_config
        
        print(f"电磁法观测系统设计完成:")
        print(f"  发射器数量: {len(transmitters)}")
        print(f"  接收器数量: {len(receivers)}")
        print(f"  频率数量: {len(frequencies)}")
        print(f"  频率范围: {survey_config['frequency_range'][0]:.1e} ~ {survey_config['frequency_range'][1]:.1e} Hz")
        print(f"  测量数量: {survey_config['n_measurements']}")
        
        return survey_config
        
    def design_mt_survey(self,
                        stations: Union[np.ndarray, List],
                        frequencies: Union[np.ndarray, List],
                        components: List[str] = ['zxx', 'zxy', 'zyx', 'zyy'],
                        survey_type: str = 'broadband') -> Dict:
        """
        设计大地电磁法观测系统
        
        Parameters:
        -----------
        stations : array or list
            测点坐标
        frequencies : array or list
            观测频率
        components : list
            阻抗张量分量
        survey_type : str
            观测类型 ['broadband', 'long_period', 'audio']
            
        Returns:
        --------
        survey_config : dict
            观测系统配置
        """
        if isinstance(stations, list):
            stations = np.array(stations)
        if isinstance(frequencies, list):
            frequencies = np.array(frequencies)
            
        # 根据频率范围确定勘探深度
        min_freq = np.min(frequencies)
        max_freq = np.max(frequencies)
        
        # 使用经验公式估算穿透深度 (皮肤深度)
        resistivity = 100  # 假设平均电阻率 100 ohm-m
        skin_depth_max = 503 * np.sqrt(resistivity / min_freq)  # 米
        skin_depth_min = 503 * np.sqrt(resistivity / max_freq)
        
        survey_config = {
            'method': 'magnetotellurics',
            'stations': stations,
            'frequencies': frequencies,
            'components': components,
            'n_stations': len(stations),
            'n_frequencies': len(frequencies),
            'survey_type': survey_type,
            'frequency_range': [float(min_freq), float(max_freq)],
            'estimated_depth_range': [float(skin_depth_min), float(skin_depth_max)],
            'n_measurements': len(stations) * len(frequencies) * len(components)
        }
        
        self.surveys['magnetotellurics'] = survey_config
        self.current_survey = survey_config
        
        print(f"大地电磁法观测系统设计完成:")
        print(f"  测点数量: {len(stations)}")
        print(f"  频率数量: {len(frequencies)}")
        print(f"  频率范围: {min_freq:.1e} ~ {max_freq:.1e} Hz")
        print(f"  估算深度: {skin_depth_min:.0f} ~ {skin_depth_max:.0f} m")
        print(f"  阻抗分量: {components}")
        
        return survey_config
        
    def optimize_survey_geometry(self, 
                               method: str,
                               target_resolution: float,
                               budget_constraint: int = None) -> Dict:
        """
        优化观测系统几何
        
        Parameters:
        -----------
        method : str
            地球物理方法
        target_resolution : float
            目标分辨率
        budget_constraint : int, optional
            预算约束（测点数量上限）
            
        Returns:
        --------
        optimized_config : dict
            优化后的观测系统配置
        """
        if method not in self.surveys:
            raise ValueError(f"方法 {method} 的观测系统尚未设计")
            
        current_config = self.surveys[method]
        
        if method == 'gravity':
            # 重力方法优化：根据目标分辨率调整测点密度
            current_density = current_config['station_density']
            target_density = 1.0 / (target_resolution ** 2)  # 点/km²
            
            if budget_constraint:
                max_density = budget_constraint / current_config['survey_area']
                target_density = min(target_density, max_density)
                
            optimization_factor = target_density / current_density
            
            optimized_config = current_config.copy()
            optimized_config['optimized'] = True
            optimized_config['optimization_factor'] = optimization_factor
            optimized_config['target_resolution'] = target_resolution
            
            print(f"重力观测系统优化:")
            print(f"  当前密度: {current_density:.3f} 点/km²")
            print(f"  目标密度: {target_density:.3f} 点/km²")
            print(f"  优化因子: {optimization_factor:.2f}")
            
        elif method == 'magnetics':
            # 磁法优化：调整测线间距和测点间距
            current_spacing = current_config.get('line_spacing', 100)
            target_spacing = target_resolution * 2  # 测线间距为分辨率的2倍
            
            optimized_config = current_config.copy()
            optimized_config['optimized_line_spacing'] = target_spacing
            optimized_config['target_resolution'] = target_resolution
            
            print(f"磁法观测系统优化:")
            print(f"  当前测线间距: {current_spacing:.1f} m")
            print(f"  优化测线间距: {target_spacing:.1f} m")
            
        else:
            print(f"方法 {method} 的优化功能待实现")
            optimized_config = current_config
            
        return optimized_config
        
    def _calculate_survey_area(self, stations: np.ndarray) -> float:
        """计算测网面积 (km²)"""
        if len(stations) < 3:
            return 0.0
            
        x_range = np.max(stations[:, 0]) - np.min(stations[:, 0])
        y_range = np.max(stations[:, 1]) - np.min(stations[:, 1])
        
        area_m2 = x_range * y_range
        area_km2 = area_m2 / 1e6
        
        return area_km2
        
    def plot_survey_geometry(self, method: str = None, show_3d: bool = False):
        """
        绘制观测系统几何
        
        Parameters:
        -----------
        method : str, optional
            指定方法，默认为当前观测系统
        show_3d : bool
            是否显示3D图
        """
        if method is None:
            config = self.current_survey
        else:
            config = self.surveys.get(method)
            
        if config is None:
            print("没有可绘制的观测系统")
            return
            
        method_name = config['method']
        
        if show_3d:
            fig = plt.figure(figsize=(12, 8))
            ax = fig.add_subplot(111, projection='3d')
        else:
            fig, ax = plt.subplots(1, 1, figsize=(10, 8))
            
        if method_name == 'gravity':
            stations = config['stations']
            if show_3d:
                ax.scatter(stations[:, 0], stations[:, 1], stations[:, 2], 
                          c='red', s=20, label='重力测点')
                ax.set_zlabel('高程 (m)')
            else:
                ax.scatter(stations[:, 0], stations[:, 1], 
                          c='red', s=20, label='重力测点')
                
        elif method_name == 'magnetics':
            stations = config['stations']
            if show_3d:
                ax.scatter(stations[:, 0], stations[:, 1], stations[:, 2], 
                          c='blue', s=10, label='磁测点')
                ax.set_zlabel('飞行高度 (m)')
            else:
                ax.scatter(stations[:, 0], stations[:, 1], 
                          c='blue', s=10, label='磁测点')
                
        elif method_name == 'dc_resistivity':
            electrodes = config['electrodes']
            if show_3d:
                ax.scatter(electrodes[:, 0], electrodes[:, 1], electrodes[:, 2], 
                          c='green', s=30, marker='^', label='电极')
                ax.set_zlabel('高程 (m)')
            else:
                ax.plot(electrodes[:, 0], electrodes[:, 1], 
                       'g^-', markersize=8, label='电极')
                
        elif method_name == 'electromagnetics':
            tx = config['transmitters']
            rx = config['receivers']
            if show_3d:
                ax.scatter(tx[:, 0], tx[:, 1], tx[:, 2], 
                          c='orange', s=50, marker='s', label='发射器')
                ax.scatter(rx[:, 0], rx[:, 1], rx[:, 2], 
                          c='purple', s=30, marker='o', label='接收器')
                ax.set_zlabel('高程 (m)')
            else:
                ax.scatter(tx[:, 0], tx[:, 1], 
                          c='orange', s=50, marker='s', label='发射器')
                ax.scatter(rx[:, 0], rx[:, 1], 
                          c='purple', s=30, marker='o', label='接收器')
                
        elif method_name == 'magnetotellurics':
            stations = config['stations']
            if show_3d:
                ax.scatter(stations[:, 0], stations[:, 1], stations[:, 2], 
                          c='cyan', s=40, marker='D', label='MT测点')
                ax.set_zlabel('高程 (m)')
            else:
                ax.scatter(stations[:, 0], stations[:, 1], 
                          c='cyan', s=40, marker='D', label='MT测点')
                
        ax.set_xlabel('X (m)')
        ax.set_ylabel('Y (m)')
        ax.legend()
        ax.grid(True, alpha=0.3)
        ax.set_title(f'{method_name.upper()} 观测系统几何')
        
        plt.tight_layout()
        plt.show()
        
        return fig
        
    def export_survey_config(self, file_path: str, method: str = None):
        """
        导出观测系统配置
        
        Parameters:
        -----------
        file_path : str
            输出文件路径
        method : str, optional
            指定方法
        """
        import json
        
        if method is None:
            config = self.current_survey
        else:
            config = self.surveys.get(method)
            
        if config is None:
            print("没有可导出的观测系统配置")
            return
            
        # 转换 numpy 数组为列表以便 JSON 序列化
        export_config = {}
        for key, value in config.items():
            if isinstance(value, np.ndarray):
                export_config[key] = value.tolist()
            else:
                export_config[key] = value
                
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(export_config, f, indent=2, ensure_ascii=False)
            
        print(f"观测系统配置已导出到: {file_path}")


# 示例使用
def create_example_surveys():
    """创建示例观测系统"""
    designer = SurveyDesigner()
    
    print("=== 创建重力观测系统 ===")
    # 规则重力测网
    bounds = {'x': [0, 1000], 'y': [0, 800]}
    gravity_survey = designer.design_regular_gravity_grid(bounds, spacing=50)
    
    print("\n=== 创建磁法观测系统 ===")
    # 航磁测线
    magnetic_survey = designer.design_magnetic_flight_lines(
        bounds, line_spacing=100, flight_height=150
    )
    
    print("\n=== 创建电法观测系统 ===")
    # 电法剖面
    electrodes = np.array([[i*5, 0, 0] for i in range(48)])  # 48个电极，间距5米
    dc_survey = designer.design_dc_survey(electrodes, 'dipole-dipole')
    
    print("\n=== 创建大地电磁观测系统 ===")
    # MT测点
    mt_stations = np.array([[i*500, j*500, 0] for i in range(5) for j in range(4)])
    frequencies = np.logspace(-3, 3, 25)  # 0.001 ~ 1000 Hz
    mt_survey = designer.design_mt_survey(mt_stations, frequencies)
    
    return designer


if __name__ == "__main__":
    # 运行示例
    survey_designer = create_example_surveys()
