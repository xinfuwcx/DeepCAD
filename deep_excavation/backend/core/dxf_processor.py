"""
DXF Processing utilities.
"""
import io
import ezdxf
from typing import List, Tuple
import logging

logger = logging.getLogger(__name__)

def extract_polyline_from_dxf(dxf_content: str, layer_name: str = "EXCAVATION_OUTLINE") -> List[Tuple[float, float]]:
    """
    Processes DXF file content from a string to extract vertices from a polyline
    on a specified layer.

    Args:
        dxf_content: A string containing the full content of a DXF file.
        layer_name: The name of the layer to search for the polyline.

    Returns:
        A list of (x, y) tuples representing the vertices of the polyline.
    
    Raises:
        ValueError: If the DXF is invalid, the layer doesn't exist, or no
                    LWPOLYLINE is found on that layer.
    """
    try:
        dxf_stream = io.StringIO(dxf_content)
        doc = ezdxf.read(dxf_stream)
        msp = doc.modelspace()
        logger.info(f"DXF处理器: 成功加载DXF文档。图层: {list(doc.layers.names())}")
    except IOError:
        logger.error("DXF处理器错误: 无效的DXF文件格式或内容。")
        raise ValueError("无效的DXF文件格式。")
    except Exception as e:
        logger.error(f"DXF处理器错误: 发生未知错误: {e}")
        raise

    logger.info(f"DXF处理器: 在图层'{layer_name}'上搜索多段线...")
    polylines = msp.query(f'LWPOLYLINE[layer=="{layer_name}"]')
    
    if not polylines:
        logger.error(f"在图层'{layer_name}'上未找到LWPOLYLINE。")
        raise ValueError(f"在图层'{layer_name}'上未找到LWPOLYLINE。")

    # 假设找到的第一个多段线是正确的
    profile = polylines[0]
    vertices = list(profile.get_points('xy'))
    logger.info(f"DXF处理器: 找到具有 {len(vertices)} 个顶点的多段线。")
    return vertices 