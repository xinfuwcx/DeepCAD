"""
v4路由单元测试
"""
import pytest
from fastapi import status


def test_health_endpoint(test_client):
    """测试健康检查端点"""
    response = test_client.get("/health")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["status"] == "ok"


def test_create_seepage_model(test_client, mock_soil_layers, mock_boundary_conditions):
    """测试创建渗流分析模型"""
    # 构建请求数据
    request_data = {
        "name": "测试模型",
        "soil_layers": mock_soil_layers,
        "boundary_conditions": mock_boundary_conditions
    }

    # 发送请求
    response = test_client.post(
        "/api/v4/api/v4/seepage/models", 
        json=request_data
    )

    # 验证响应
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "model_id" in data


def test_analyze_seepage(test_client, mock_soil_layers, mock_boundary_conditions, 
                          mock_model_id):
    """测试渗流分析"""
    # 构建请求数据
    request_data = {
        "model_id": mock_model_id,
        "soil_layers": mock_soil_layers,
        "boundary_conditions": mock_boundary_conditions,
        "analysis_type": "steady",
        "output_variables": ["head", "pressure", "velocity"]
    }

    # 发送请求
    response = test_client.post(
        "/api/v4/api/v4/seepage/analyze", 
        json=request_data
    )

    # 验证响应
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["model_id"] == mock_model_id
    assert data["status"] == "success"
    assert "results" in data
    
    # 验证结果包含请求的输出变量
    results = data["results"]
    assert "head" in results
    assert "pressure" in results
    assert "velocity" in results


def test_get_seepage_results(test_client, mock_model_id):
    """测试获取渗流分析结果"""
    response = test_client.get(
        f"/api/v4/api/v4/seepage/results/{mock_model_id}"
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["model_id"] == mock_model_id


def test_get_animation_frame(test_client, mock_model_id):
    """测试获取动画帧"""
    frame_index = 1
    response = test_client.get(
        f"/api/v4/api/v4/seepage/animation/{mock_model_id}/frame/{frame_index}"
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["frame_index"] == frame_index
    assert data["model_id"] == mock_model_id


def test_export_results_csv(test_client, mock_model_id):
    """测试导出CSV格式结果"""
    # 先创建一个分析结果
    analyze_data = {
        "model_id": mock_model_id,
        "soil_layers": [],
        "boundary_conditions": [],
        "analysis_type": "steady",
    }
    test_client.post("/api/v4/api/v4/seepage/analyze", json=analyze_data)
    
    # 导出结果
    response = test_client.get(
        f"/api/v4/api/v4/seepage/export/{mock_model_id}/csv"
    )
    assert response.status_code == status.HTTP_200_OK
    
    content_disp = f"attachment; filename=seepage_results_{mock_model_id}.csv"
    assert response.headers["Content-Disposition"] == content_disp
    assert response.headers["Content-Type"] == "text/csv" 