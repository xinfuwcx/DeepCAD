"""
GemPy → PyVista → Three.js 数据转换器
优化的地质建模可视化数据管道
"""

import numpy as np
import json
import logging
from typing import Dict, Any, List, Optional, Tuple
import time

logger = logging.getLogger(__name__)

# 地质体颜色映射
GEOLOGICAL_COLORS = {
    'sandstone': '#F4A460',    # 砂岩 - 沙褐色
    'claystone': '#8B4513',    # 粘土 - 马鞍棕
    'limestone': '#D3D3D3',    # 灰岩 - 浅灰色  
    'mudstone': '#696969',     # 泥岩 - 暗灰色
    'bedrock': '#2F4F4F',      # 基岩 - 深石板灰
    'quaternary': '#90EE90',   # 第四系 - 浅绿色
    'fault': '#DC143C',        # 断层 - 深红色
    'water_table': '#4169E1',  # 地下水位 - 蓝色
    'default': '#B8860B'       # 默认 - 暗金色
}

class GemPyThreeJSConverter:
    """GemPy到Three.js的优化转换器"""
    
    def __init__(self):
        self.conversion_cache = {}
        
    def convert_pyvista_mesh_to_threejs(self, 
                                      pyvista_mesh: Any, 
                                      formation_name: str = "unknown",
                                      include_wireframe: bool = False) -> Dict[str, Any]:
        """
        将单个PyVista网格转换为Three.js格式
        
        Args:
            pyvista_mesh: PyVista mesh对象
            formation_name: 地质体名称
            include_wireframe: 是否包含线框数据
        
        Returns:
            Three.js兼容的网格数据
        """
        try:
            if not hasattr(pyvista_mesh, 'points') or len(pyvista_mesh.points) == 0:
                logger.warning(f"网格 {formation_name} 无有效顶点数据")
                return {}
            
            # 1. 顶点数据
            vertices = pyvista_mesh.points.astype(np.float32)
            
            # 2. 法向量计算
            try:
                pyvista_mesh.compute_normals(inplace=True)
                normals = pyvista_mesh.point_normals.astype(np.float32)
            except Exception as e:
                logger.warning(f"法向量计算失败: {e}")
                normals = np.zeros_like(vertices, dtype=np.float32)
            
            # 3. 面索引
            faces = []
            if hasattr(pyvista_mesh, 'faces') and len(pyvista_mesh.faces) > 0:
                faces_raw = pyvista_mesh.faces
                # PyVista格式: [n, v1, v2, v3, n, v4, v5, v6, ...]
                i = 0
                while i < len(faces_raw):
                    n_vertices = faces_raw[i]
                    if n_vertices == 3:  # 三角形面
                        faces.extend([faces_raw[i+1], faces_raw[i+2], faces_raw[i+3]])
                    elif n_vertices == 4:  # 四边形面，分解为两个三角形
                        v1, v2, v3, v4 = faces_raw[i+1:i+5]
                        faces.extend([v1, v2, v3, v1, v3, v4])
                    i += n_vertices + 1
                faces = np.array(faces, dtype=np.uint32)
            else:
                faces = np.array([], dtype=np.uint32)
            
            # 4. 颜色数据
            color = self._get_formation_color(formation_name)
            colors = np.tile(color, (len(vertices), 1)).astype(np.float32)
            
            # 5. 标量数据（如果有）
            scalars = None
            if hasattr(pyvista_mesh, 'point_data') and len(pyvista_mesh.point_data) > 0:
                scalar_name = list(pyvista_mesh.point_data.keys())[0]
                scalars = pyvista_mesh.point_data[scalar_name].astype(np.float32)
            
            # 6. 构建Three.js数据
            threejs_data = {
                'type': 'geological_mesh',
                'formation': formation_name,
                'metadata': {
                    'vertex_count': len(vertices),
                    'face_count': len(faces) // 3,
                    'has_normals': len(normals) > 0,
                    'has_colors': True,
                    'has_scalars': scalars is not None
                },
                'geometry': {
                    'vertices': vertices.flatten().tolist(),  # [x1,y1,z1, x2,y2,z2, ...]
                    'normals': normals.flatten().tolist() if len(normals) > 0 else [],
                    'indices': faces.tolist(),
                    'colors': colors.flatten().tolist(),  # [r1,g1,b1, r2,g2,b2, ...]
                    'scalars': scalars.tolist() if scalars is not None else []
                },
                'material': {
                    'color': color.tolist(),
                    'opacity': 0.8,
                    'transparent': True,
                    'side': 'DoubleSide'
                }
            }
            
            # 7. 线框数据（可选）
            if include_wireframe:
                wireframe_data = self._extract_wireframe(pyvista_mesh)
                threejs_data['wireframe'] = wireframe_data
            
            logger.debug(f"✓ 转换完成: {formation_name} - {len(vertices)}顶点, {len(faces)//3}面")
            
            return threejs_data
            
        except Exception as e:
            logger.error(f"PyVista到Three.js转换失败 ({formation_name}): {e}")
            return {}
    
    def convert_geological_model_to_threejs(self, 
                                          pyvista_meshes: Dict[str, Any],
                                          model_metadata: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        转换完整的地质模型到Three.js格式
        
        Args:
            pyvista_meshes: PyVista网格字典 {formation_name: mesh}
            model_metadata: 模型元数据
        
        Returns:
            完整的Three.js地质模型数据
        """
        try:
            logger.info("🔄 开始转换地质模型到Three.js格式...")
            start_time = time.time()
            
            threejs_model = {
                'type': 'geological_model',
                'version': '1.0',
                'timestamp': int(time.time()),
                'metadata': model_metadata or {},
                'formations': {},
                'statistics': {}
            }
            
            total_vertices = 0
            total_faces = 0
            
            # 转换每个地质体
            for formation_name, mesh in pyvista_meshes.items():
                if mesh is None:
                    continue
                    
                formation_data = self.convert_pyvista_mesh_to_threejs(
                    mesh, formation_name, include_wireframe=False
                )
                
                if formation_data:
                    threejs_model['formations'][formation_name] = formation_data
                    total_vertices += formation_data['metadata']['vertex_count']
                    total_faces += formation_data['metadata']['face_count']
            
            # 统计信息
            threejs_model['statistics'] = {
                'formation_count': len(threejs_model['formations']),
                'total_vertices': total_vertices,
                'total_faces': total_faces,
                'conversion_time': time.time() - start_time
            }
            
            logger.info(f"✓ 地质模型转换完成: {len(threejs_model['formations'])}个地质体, "
                       f"{total_vertices}顶点, {total_faces}面, "
                       f"用时{threejs_model['statistics']['conversion_time']:.2f}秒")
            
            return threejs_model
            
        except Exception as e:
            logger.error(f"地质模型转换失败: {e}")
            return {'type': 'error', 'message': str(e)}
    
    def optimize_for_web_transfer(self, threejs_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        优化数据以便Web传输
        
        Args:
            threejs_data: Three.js格式数据
        
        Returns:
            优化后的数据
        """
        try:
            logger.info("🔄 优化数据传输格式...")
            
            optimized = threejs_data.copy()
            
            # 1. 数据压缩：移除重复顶点
            for formation_name, formation_data in optimized.get('formations', {}).items():
                if 'geometry' in formation_data:
                    geometry = formation_data['geometry']
                    
                    # 简化：如果顶点数超过阈值，进行降采样
                    vertex_count = len(geometry['vertices']) // 3
                    if vertex_count > 50000:  # 5万顶点阈值
                        logger.info(f"对 {formation_name} 进行顶点降采样: {vertex_count} → ", end="")
                        simplified = self._simplify_mesh(geometry)
                        formation_data['geometry'] = simplified
                        logger.info(f"{len(simplified['vertices'])//3}")
            
            # 2. 添加LOD信息
            optimized['lod_levels'] = self._generate_lod_info(optimized)
            
            logger.info("✓ 数据传输优化完成")
            return optimized
            
        except Exception as e:
            logger.warning(f"数据优化失败: {e}")
            return threejs_data
    
    def _get_formation_color(self, formation_name: str) -> np.ndarray:
        """获取地质体颜色"""
        formation_lower = formation_name.lower()
        
        # 匹配关键词
        for key, color_hex in GEOLOGICAL_COLORS.items():
            if key in formation_lower:
                return np.array(self._hex_to_rgb(color_hex), dtype=np.float32) / 255.0
        
        # 默认颜色（基于名称哈希）
        hash_val = hash(formation_name) % 360
        return np.array(self._hsv_to_rgb(hash_val, 0.7, 0.8), dtype=np.float32)
    
    def _hex_to_rgb(self, hex_color: str) -> Tuple[int, int, int]:
        """16进制颜色转RGB"""
        hex_color = hex_color.lstrip('#')
        return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
    
    def _hsv_to_rgb(self, h: float, s: float, v: float) -> Tuple[float, float, float]:
        """HSV颜色空间转RGB"""
        import colorsys
        return tuple(int(c * 255) for c in colorsys.hsv_to_rgb(h/360, s, v))
    
    def _extract_wireframe(self, mesh: Any) -> Dict[str, Any]:
        """提取网格的线框数据"""
        try:
            edges = mesh.extract_edges()
            if hasattr(edges, 'points') and len(edges.points) > 0:
                return {
                    'vertices': edges.points.flatten().tolist(),
                    'indices': edges.lines.reshape(-1, 3)[:, 1:3].flatten().tolist()
                }
            return {}
        except:
            return {}
    
    def _simplify_mesh(self, geometry: Dict[str, Any]) -> Dict[str, Any]:
        """简化网格（降采样）"""
        # 简单的顶点降采样实现
        vertices = np.array(geometry['vertices']).reshape(-1, 3)
        indices = np.array(geometry['indices'])
        
        # 每隔n个顶点取一个（简单降采样）
        step = max(1, len(vertices) // 25000)  # 目标2.5万顶点
        
        simplified_vertices = vertices[::step]
        
        # 重建索引（简化版）
        simplified_indices = []
        for i in range(0, len(simplified_vertices) - 2, 3):
            simplified_indices.extend([i, i+1, i+2])
        
        return {
            'vertices': simplified_vertices.flatten().tolist(),
            'normals': geometry.get('normals', [])[::step*3] if geometry.get('normals') else [],
            'indices': simplified_indices,
            'colors': geometry.get('colors', [])[::step*3] if geometry.get('colors') else [],
            'scalars': geometry.get('scalars', [])[::step] if geometry.get('scalars') else []
        }
    
    def _generate_lod_info(self, model_data: Dict[str, Any]) -> Dict[str, Any]:
        """生成LOD（细节层次）信息"""
        lod_info = {
            'enabled': True,
            'levels': [
                {'distance': 100, 'detail': 'high'},
                {'distance': 500, 'detail': 'medium'}, 
                {'distance': 1000, 'detail': 'low'}
            ]
        }
        return lod_info

# 全局转换器实例
converter = GemPyThreeJSConverter()