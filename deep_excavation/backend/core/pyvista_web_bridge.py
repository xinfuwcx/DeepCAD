"""
PyVista Web数据桥梁
将Kratos求解器的VTK输出转换为Web前端Three.js可直接使用的格式
"""

import os
import hashlib
import json
import logging
from typing import Dict, Any, List, Optional, Tuple
import asyncio
from pathlib import Path

import numpy as np
import pyvista as pv
import meshio

logger = logging.getLogger(__name__)

class PyVistaWebBridge:
    """
    PyVista到Web的数据桥梁
    
    核心功能：
    1. 读取Kratos输出的VTK文件
    2. 使用PyVista进行后处理计算
    3. 转换为Three.js友好的JSON格式
    4. 提供缓存和增量更新机制
    """
    
    def __init__(self, cache_dir: Optional[str] = None):
        """
        初始化PyVista Web桥梁
        
        Args:
            cache_dir: 缓存目录路径
        """
        self.cache_dir = Path(cache_dir) if cache_dir else Path.cwd() / "pyvista_cache"
        self.cache_dir.mkdir(exist_ok=True)
        
        self.cache = {}  # 内存缓存
        self.supported_fields = [
            'PRESSURE', 'DISPLACEMENT', 'VELOCITY', 'STRESS', 
            'STRAIN', 'TEMPERATURE', 'FLOW_RATE'
        ]
        
        logger.info(f"PyVista Web桥梁初始化完成，缓存目录: {self.cache_dir}")
    
    async def process_kratos_result(self, vtk_file_path: str, 
                                  fields: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        处理Kratos结果文件为Web格式
        
        Args:
            vtk_file_path: Kratos输出的VTK文件路径
            fields: 要处理的字段列表，None表示处理所有字段
            
        Returns:
            包含可视化数据的字典
        """
        logger.info(f"开始处理Kratos结果文件: {vtk_file_path}")
        
        # 1. 检查文件是否存在
        if not os.path.exists(vtk_file_path):
            raise FileNotFoundError(f"VTK文件不存在: {vtk_file_path}")
        
        # 2. 计算文件哈希用于缓存
        file_hash = await self._calculate_file_hash(vtk_file_path)
        cache_key = f"{file_hash}_{fields or 'all'}"
        
        # 3. 检查缓存
        cached_result = await self._get_cached_result(cache_key)
        if cached_result:
            logger.info("使用缓存的处理结果")
            return cached_result
        
        # 4. 读取VTK文件
        try:
            mesh = pv.read(vtk_file_path)
            logger.info(f"成功读取VTK文件: {mesh.n_points}个节点, {mesh.n_cells}个单元")
        except Exception as e:
            logger.error(f"读取VTK文件失败: {e}")
            raise ValueError(f"无法读取VTK文件: {e}")
        
        # 5. 处理字段
        available_fields = list(mesh.array_names)
        target_fields = fields or [f for f in available_fields if f in self.supported_fields]
        
        if not target_fields:
            logger.warning("未找到支持的物理场数据")
            target_fields = available_fields[:3]  # 取前3个字段
        
        logger.info(f"处理字段: {target_fields}")
        
        # 6. 生成可视化数据
        visualization_data = {}
        
        for field in target_fields:
            if field in mesh.array_names:
                try:
                    field_data = await self._process_field(mesh, field)
                    visualization_data[field] = field_data
                    logger.info(f"字段 {field} 处理完成")
                except Exception as e:
                    logger.error(f"处理字段 {field} 失败: {e}")
                    continue
        
        # 7. 生成分析摘要
        analysis_summary = await self._generate_analysis_summary(mesh, visualization_data)
        
        # 8. 构建最终结果
        result = {
            'status': 'success',
            'visualization_data': visualization_data,
            'analysis_summary': analysis_summary,
            'metadata': {
                'source_file': vtk_file_path,
                'processed_fields': list(visualization_data.keys()),
                'cache_key': cache_key
            }
        }
        
        # 9. 缓存结果
        await self._cache_result(cache_key, result)
        
        logger.info(f"Kratos结果处理完成，生成了{len(visualization_data)}个字段的可视化数据")
        return result
    
    async def _process_field(self, mesh: pv.UnstructuredGrid, field_name: str) -> Dict[str, Any]:
        """
        处理单个物理场
        
        Args:
            mesh: PyVista网格对象
            field_name: 字段名称
            
        Returns:
            Three.js可用的字段数据
        """
        logger.debug(f"开始处理字段: {field_name}")
        
        # 1. 获取字段数据
        field_data = mesh[field_name]
        field_range = [float(field_data.min()), float(field_data.max())]
        
        # 2. 计算等值面（用于可视化）
        try:
            # 生成8个等值面
            n_contours = 8
            contour_values = np.linspace(field_range[0], field_range[1], n_contours)
            contours = mesh.contour(scalars=field_name, isosurfaces=contour_values)
            
            # 如果等值面为空，使用原始网格的表面
            if contours.n_points == 0:
                logger.warning(f"字段 {field_name} 无法生成等值面，使用网格表面")
                contours = mesh.extract_surface()
        except Exception as e:
            logger.warning(f"生成等值面失败: {e}，使用网格表面")
            contours = mesh.extract_surface()
        
        # 3. 转换为Three.js格式
        web_data = await self._convert_to_threejs_format(contours, field_name)
        
        # 4. 添加字段特定信息
        web_data.update({
            'field_name': field_name,
            'range': field_range,
            'units': self._get_field_units(field_name),
            'description': self._get_field_description(field_name)
        })
        
        return web_data
    
    async def _convert_to_threejs_format(self, mesh: pv.PolyData, field_name: str) -> Dict[str, Any]:
        """
        转换PyVista网格为Three.js格式
        
        Args:
            mesh: PyVista多边形网格
            field_name: 字段名称
            
        Returns:
            Three.js BufferGeometry兼容的数据
        """
        # 1. 提取顶点坐标
        vertices = mesh.points.flatten().astype(np.float32).tolist()
        
        # 2. 提取面片索引
        faces = []
        for i in range(mesh.n_cells):
            cell = mesh.get_cell(i)
            if cell.type == pv.CellType.TRIANGLE:
                # 三角形面片
                point_ids = cell.point_ids
                faces.extend(point_ids)
            elif cell.type == pv.CellType.QUAD:
                # 四边形分解为两个三角形
                point_ids = cell.point_ids
                faces.extend([point_ids[0], point_ids[1], point_ids[2]])
                faces.extend([point_ids[0], point_ids[2], point_ids[3]])
        
        # 3. 提取标量数据
        scalars = []
        if field_name in mesh.array_names:
            scalars = mesh[field_name].astype(np.float32).tolist()
        else:
            # 如果字段不存在，使用默认值
            scalars = [0.0] * mesh.n_points
        
        # 4. 计算法向量
        mesh_with_normals = mesh.compute_normals()
        normals = mesh_with_normals.point_normals.flatten().astype(np.float32).tolist()
        
        # 5. 生成纹理坐标（用于颜色映射）
        if scalars:
            scalar_array = np.array(scalars)
            scalar_min, scalar_max = scalar_array.min(), scalar_array.max()
            if scalar_max > scalar_min:
                uv_coords = ((scalar_array - scalar_min) / (scalar_max - scalar_min)).tolist()
            else:
                uv_coords = [0.5] * len(scalars)
        else:
            uv_coords = [0.5] * mesh.n_points
        
        return {
            'vertices': vertices,
            'faces': faces,
            'scalars': scalars,
            'normals': normals,
            'uv_coords': uv_coords,
            'geometry_info': {
                'n_vertices': mesh.n_points,
                'n_faces': len(faces) // 3,
                'bounds': mesh.bounds.tolist(),
                'center': mesh.center.tolist()
            }
        }
    
    async def _generate_analysis_summary(self, mesh: pv.UnstructuredGrid, 
                                       visualization_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        生成分析摘要信息
        
        Args:
            mesh: 原始网格
            visualization_data: 可视化数据
            
        Returns:
            分析摘要
        """
        summary = {
            'mesh_info': {
                'n_points': int(mesh.n_points),
                'n_cells': int(mesh.n_cells),
                'volume': float(mesh.volume) if hasattr(mesh, 'volume') else 0.0,
                'bounds': mesh.bounds.tolist(),
                'center': mesh.center.tolist()
            },
            'field_info': {},
            'quality_metrics': await self._calculate_quality_metrics(mesh)
        }
        
        # 字段统计信息
        for field_name, field_data in visualization_data.items():
            if 'range' in field_data:
                summary['field_info'][field_name] = {
                    'min_value': field_data['range'][0],
                    'max_value': field_data['range'][1],
                    'range_span': field_data['range'][1] - field_data['range'][0],
                    'units': field_data.get('units', ''),
                    'description': field_data.get('description', '')
                }
        
        return summary
    
    async def _calculate_quality_metrics(self, mesh: pv.UnstructuredGrid) -> Dict[str, float]:
        """
        计算网格质量指标
        
        Args:
            mesh: PyVista网格
            
        Returns:
            质量指标字典
        """
        try:
            # 计算单元质量
            quality = mesh.compute_cell_quality()
            
            metrics = {
                'min_quality': float(quality['CellQuality'].min()),
                'max_quality': float(quality['CellQuality'].max()),
                'mean_quality': float(quality['CellQuality'].mean()),
                'std_quality': float(quality['CellQuality'].std())
            }
            
            # 计算几何指标
            if hasattr(mesh, 'volume'):
                metrics['total_volume'] = float(mesh.volume)
            
            # 计算边长统计
            edge_lengths = mesh.compute_cell_sizes()
            if 'Length' in edge_lengths.array_names:
                lengths = edge_lengths['Length']
                metrics.update({
                    'min_edge_length': float(lengths.min()),
                    'max_edge_length': float(lengths.max()),
                    'mean_edge_length': float(lengths.mean())
                })
            
            return metrics
            
        except Exception as e:
            logger.warning(f"计算质量指标失败: {e}")
            return {'error': str(e)}
    
    def _get_field_units(self, field_name: str) -> str:
        """获取字段单位"""
        units_map = {
            'PRESSURE': 'Pa',
            'DISPLACEMENT': 'm',
            'VELOCITY': 'm/s',
            'STRESS': 'Pa',
            'STRAIN': '-',
            'TEMPERATURE': 'K',
            'FLOW_RATE': 'm³/s'
        }
        return units_map.get(field_name.upper(), '')
    
    def _get_field_description(self, field_name: str) -> str:
        """获取字段描述"""
        descriptions = {
            'PRESSURE': '压力场分布',
            'DISPLACEMENT': '位移场分布',
            'VELOCITY': '速度场分布', 
            'STRESS': '应力场分布',
            'STRAIN': '应变场分布',
            'TEMPERATURE': '温度场分布',
            'FLOW_RATE': '流量场分布'
        }
        return descriptions.get(field_name.upper(), f'{field_name}场分布')
    
    async def _calculate_file_hash(self, file_path: str) -> str:
        """计算文件哈希值"""
        hash_md5 = hashlib.md5()
        
        # 读取文件内容计算哈希
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_md5.update(chunk)
        
        # 包含文件修改时间
        mtime = os.path.getmtime(file_path)
        hash_md5.update(str(mtime).encode())
        
        return hash_md5.hexdigest()
    
    async def _get_cached_result(self, cache_key: str) -> Optional[Dict[str, Any]]:
        """获取缓存结果"""
        # 检查内存缓存
        if cache_key in self.cache:
            return self.cache[cache_key]
        
        # 检查磁盘缓存
        cache_file = self.cache_dir / f"{cache_key}.json"
        if cache_file.exists():
            try:
                with open(cache_file, 'r', encoding='utf-8') as f:
                    cached_data = json.load(f)
                    self.cache[cache_key] = cached_data
                    return cached_data
            except Exception as e:
                logger.warning(f"读取缓存文件失败: {e}")
        
        return None
    
    async def _cache_result(self, cache_key: str, result: Dict[str, Any]):
        """缓存处理结果"""
        # 内存缓存
        self.cache[cache_key] = result
        
        # 磁盘缓存
        try:
            cache_file = self.cache_dir / f"{cache_key}.json"
            with open(cache_file, 'w', encoding='utf-8') as f:
                json.dump(result, f, indent=2, ensure_ascii=False)
            logger.debug(f"结果已缓存到: {cache_file}")
        except Exception as e:
            logger.warning(f"缓存结果失败: {e}")
    
    def clear_cache(self):
        """清理缓存"""
        self.cache.clear()
        
        # 清理磁盘缓存
        for cache_file in self.cache_dir.glob("*.json"):
            try:
                cache_file.unlink()
            except Exception as e:
                logger.warning(f"删除缓存文件失败: {e}")
        
        logger.info("缓存已清理")

# 便捷函数
async def process_kratos_vtk_for_web(vtk_file_path: str, 
                                   fields: Optional[List[str]] = None) -> Dict[str, Any]:
    """
    便捷函数：处理Kratos VTK文件为Web格式
    
    Args:
        vtk_file_path: VTK文件路径
        fields: 要处理的字段列表
        
    Returns:
        Web可视化数据
    """
    bridge = PyVistaWebBridge()
    return await bridge.process_kratos_result(vtk_file_path, fields)

# 测试函数
async def test_pyvista_bridge():
    """测试PyVista Web桥梁"""
    # 创建测试数据
    import tempfile
    
    # 生成简单的测试网格
    mesh = pv.Sphere(radius=10)
    
    # 添加模拟的物理场数据
    mesh['PRESSURE'] = mesh.points[:, 2] * 1000  # 基于Z坐标的压力场
    mesh['DISPLACEMENT'] = np.linalg.norm(mesh.points, axis=1) * 0.01  # 径向位移
    
    # 保存为VTK文件
    with tempfile.NamedTemporaryFile(suffix='.vtk', delete=False) as tmp_file:
        mesh.save(tmp_file.name)
        vtk_file = tmp_file.name
    
    try:
        # 测试处理
        bridge = PyVistaWebBridge()
        result = await bridge.process_kratos_result(vtk_file)
        
        print("测试结果:")
        print(f"状态: {result['status']}")
        print(f"可视化字段: {list(result['visualization_data'].keys())}")
        print(f"网格信息: {result['analysis_summary']['mesh_info']}")
        
        return result
        
    finally:
        # 清理临时文件
        os.unlink(vtk_file)

# 使用示例
if __name__ == "__main__":
    asyncio.run(test_pyvista_bridge()) 