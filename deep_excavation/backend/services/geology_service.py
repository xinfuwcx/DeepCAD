import pandas as pd
from typing import Dict, Any

from ..api.routes.geology_router import CreateGeologicalModelRequest
from ..core.geology_modeler import GeologyModeler


class GeologyService:
    """
    地质服务层，处理业务逻辑并与核心建模模块交互。
    """

    def __init__(self):
        """
        初始化地质服务。
        """
        pass

    async def create_model_from_borehole_data(
        self, request: CreateGeologicalModelRequest
    ) -> Dict[str, Any]:
        """
        根据钻孔数据创建地质模型。
        
        Args:
            request: 包含钻孔数据和建模参数的请求对象。
            
        Returns:
            一个包含模型ID和预览数据的字典。
        """
        # 1. 将Pydantic模型列表转换为Pandas DataFrame，这是GemPy喜欢的数据格式
        borehole_df = pd.DataFrame(
            [point.dict(by_alias=True) for point in request.boreholeData]
        )

        # 2. 初始化核心建模器
        modeler = GeologyModeler(
            borehole_df=borehole_df,
            gempy_params=request.gempyParams,
            color_scheme=request.colorScheme
        )

        # 3. 运行建模流程
        model_id, preview_data = await modeler.run_modeling_workflow()

        # 4. 返回结果
        return {
            "model_id": model_id,
            "preview_data": preview_data
        } 