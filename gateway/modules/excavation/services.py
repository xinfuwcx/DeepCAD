# 导入GMSH OCC开挖构建器
from .gmsh_occ_excavation_builder import excavation_builder, GMSHOCCExcavationBuilder
import os
import uuid
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

class ExcavationGenerator:
    """
    基坑开挖生成器 - 使用GMSH OCC统一几何建模
    与地质建模保持一致的技术栈
    """
    
    def __init__(self):
        self.occ_builder = GMSHOCCExcavationBuilder()
    
    def create_excavation(
        self,
        dxf_path: str,
        soil_volumes: Dict[int, int],
        excavation_depth: float,
        placement_mode: str = 'auto_center',
        soil_domain_bounds: Dict[str, float] = None,
        soil_materials: Dict[int, Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        创建基坑开挖 - GMSH OCC版本
        
        Args:
            dxf_path: DXF文件路径
            soil_volumes: 土层体字典 {layer_id: volume_tag}
            excavation_depth: 开挖深度(m)
            placement_mode: 定位方式 ('centroid' | 'auto_center')
            soil_domain_bounds: 土体域边界信息
            soil_materials: 土层材料信息
            
        Returns:
            开挖结果字典
        """
        try:
            # 默认材料信息
            if soil_materials is None:
                soil_materials = {
                    layer_id: {'name': f'SoilLayer_{layer_id}'} 
                    for layer_id in soil_volumes.keys()
                }
            
            # 使用GMSH OCC构建完整开挖模型
            result = self.occ_builder.build_complete_excavation_model(
                dxf_path=dxf_path,
                excavation_depth=excavation_depth,
                soil_volumes=soil_volumes,
                soil_materials=soil_materials,
                placement_mode=placement_mode,
                soil_domain_bounds=soil_domain_bounds,
                surface_elevation=0.0
            )
            
            return result
            
        except Exception as e:
            logger.error(f"GMSH OCC开挖生成失败: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def export_mesh_to_gltf(self, mesh_file: str, output_dir: str, filename_prefix: str) -> str:
        """
        将GMSH网格转换为glTF文件
        
        Args:
            mesh_file: GMSH网格文件路径
            output_dir: 输出目录
            filename_prefix: 文件名前缀
            
        Returns:
            glTF文件路径
        """
        try:
            os.makedirs(output_dir, exist_ok=True)
            filename = f"{filename_prefix}_{uuid.uuid4().hex}.gltf"
            output_path = os.path.join(output_dir, filename)
            
            # 这里需要实现GMSH网格到glTF的转换
            # 暂时先复制mesh文件，后续实现转换逻辑
            import shutil
            temp_output = output_path.replace('.gltf', '.msh')
            shutil.copy2(mesh_file, temp_output)
            
            logger.info(f"网格文件导出: {temp_output}")
            return temp_output
            
        except Exception as e:
            logger.error(f"网格导出失败: {e}")
            return mesh_file 