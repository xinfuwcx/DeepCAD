import logging
from typing import List, Dict, Any

from deep_excavation.backend.models.geology import GeologyOptions
from deep_excavation.backend.core.geology_modeler import create_geological_model_geometry
from deep_excavation.backend.core.geometry_converter import pyvista_to_threejs_json

logger = logging.getLogger(__name__)


class GeologyService:
    """
    The service层，处理地质建模相关操作。
    """
    
    async def create_geological_model(
        self,
        borehole_data: List[Dict[str, Any]],
        formations: Dict[str, str],
        options: GeologyOptions,
    ) -> List[Dict[str, Any]]:
        """
        编排地质模型创建，并转换为three.js兼容格式。
        """
        logger.info(f"GeologyService: 开始创建地质模型，选项: {options.model_dump()}")

        # 使用Pydantic模型直接访问属性，不再需要.get()
        processed_options = {
            "resolution": [options.resolution_x, options.resolution_y],
            "alpha": options.alpha
        }
        logger.info(f"处理后的选项: {processed_options}")

        try:
            # 1. 使用PyVista生成地质层几何体
            model_layers = create_geological_model_geometry(
                borehole_data=borehole_data,
                formations=formations,
                options=processed_options,
            )

            # 2. 序列化每层几何体
            serialized_layers = []
            for layer in model_layers:
                # 转换PyVista几何体为Three.js格式
                serialized_geometry = pyvista_to_threejs_json(layer["geometry"])
                
                serialized_layers.append({
                    "name": layer["name"],
                    "color": layer["color"],
                    "opacity": layer["opacity"],
                    "geometry": serialized_geometry,
                })
            
            logger.info(f"成功序列化了{len(serialized_layers)}个地质层")
            return serialized_layers

        except Exception as e:
            logger.error(f"GeologyService发生错误: {e}")
            # 重新抛出异常，由路由的错误处理器捕获
            raise e


# --- FastAPI 依赖注入 ---

# 这个单例实例用于路由器中的依赖注入
_geology_service_instance = None


def get_geology_service() -> GeologyService:
    """
    FastAPI依赖，提供GeologyService的单例实例。
    """
    global _geology_service_instance
    if _geology_service_instance is None:
        _geology_service_instance = GeologyService()
    return _geology_service_instance 