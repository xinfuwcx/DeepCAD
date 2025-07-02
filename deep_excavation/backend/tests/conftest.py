"""
pytest配置文件，包含测试用的fixtures
"""
import os
import sys
import pytest
from fastapi.testclient import TestClient

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.abspath(os.path.join(
    os.path.dirname(__file__), "..")))

# 不能在顶部导入app，因为需要先设置sys.path
from app import app  # noqa: E402


@pytest.fixture
def test_client():
    """创建测试客户端"""
    return TestClient(app)


@pytest.fixture
def mock_soil_layers():
    """模拟土层数据"""
    return [
        {
            "id": "layer1",
            "name": "粘土层",
            "hydraulic_conductivity_x": 0.00001,
            "hydraulic_conductivity_y": 0.00001,
            "hydraulic_conductivity_z": 0.000005,
            "specific_storage": 0.0001,
            "porosity": 0.3
        },
        {
            "id": "layer2",
            "name": "砂层",
            "hydraulic_conductivity_x": 0.01,
            "hydraulic_conductivity_y": 0.01,
            "hydraulic_conductivity_z": 0.005,
            "specific_storage": 0.0005,
            "porosity": 0.4
        }
    ]


@pytest.fixture
def mock_boundary_conditions():
    """模拟边界条件"""
    return [
        {
            "id": "bc1",
            "type": "fixed_head",
            "value": 10.0,
            "location": {"boundary_id": "left_boundary"}
        },
        {
            "id": "bc2",
            "type": "fixed_head",
            "value": 5.0,
            "location": {"boundary_id": "right_boundary"}
        }
    ]


@pytest.fixture
def mock_model_id():
    """模拟模型ID"""
    return "test_model_1234" 