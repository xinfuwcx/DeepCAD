"""
渗流分析工作流集成测试
"""
from fastapi import status


class TestSeepageWorkflow:
    """测试渗流分析完整工作流"""

    def test_end_to_end_workflow(self, test_client):
        """
        测试端到端渗流分析工作流：
        1. 创建模型
        2. 执行分析
        3. 获取结果
        4. 导出数据
        """
        # 1. 创建渗流模型
        model_data = {
            "name": "集成测试模型",
            "soil_layers": [
                {
                    "id": "layer1",
                    "name": "粘土层",
                    "hydraulic_conductivity_x": 0.00001,
                    "hydraulic_conductivity_y": 0.00001,
                    "hydraulic_conductivity_z": 0.000005,
                    "specific_storage": 0.0001,
                    "porosity": 0.3
                }
            ],
            "boundary_conditions": [
                {
                    "id": "bc1",
                    "type": "fixed_head",
                    "value": 10.0,
                    "location": {"boundary_id": "left_boundary"}
                }
            ]
        }

        # 创建模型
        create_response = test_client.post(
            "/api/v4/api/v4/seepage/models",
            json=model_data
        )
        assert create_response.status_code == status.HTTP_200_OK
        model_id = create_response.json()["model_id"]

        # 2. 执行渗流分析
        analysis_data = {
            "model_id": model_id,
            "soil_layers": model_data["soil_layers"],
            "boundary_conditions": model_data["boundary_conditions"],
            "analysis_type": "steady",
            "output_variables": ["head", "pressure", "velocity"]
        }

        analyze_response = test_client.post(
            "/api/v4/api/v4/seepage/analyze",
            json=analysis_data
        )
        assert analyze_response.status_code == status.HTTP_200_OK
        analysis_result = analyze_response.json()
        assert analysis_result["status"] == "success"

        # 3. 获取结果
        result_response = test_client.get(
            f"/api/v4/api/v4/seepage/results/{model_id}"
        )
        assert result_response.status_code == status.HTTP_200_OK
        result_data = result_response.json()
        assert result_data["model_id"] == model_id

        # 4. 获取动画帧
        frame_response = test_client.get(
            f"/api/v4/api/v4/seepage/animation/{model_id}/frame/0"
        )
        assert frame_response.status_code == status.HTTP_200_OK
        frame_data = frame_response.json()
        assert "head" in frame_data
        assert "pressure" in frame_data

        # 5. 导出结果为CSV
        csv_response = test_client.get(
            f"/api/v4/api/v4/seepage/export/{model_id}/csv"
        )
        assert csv_response.status_code == status.HTTP_200_OK
        assert "text/csv" in csv_response.headers["Content-Type"]

        # 6. 导出结果为Excel
        excel_response = test_client.get(
            f"/api/v4/api/v4/seepage/export/{model_id}/xlsx"
        )
        assert excel_response.status_code == status.HTTP_200_OK
        assert "application/vnd.openxmlformats" in (
            excel_response.headers["Content-Type"]
        ) 