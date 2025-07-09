import pytest
from httpx import AsyncClient
from fastapi import status

# Sample data mimicking a frontend request with camelCase keys
SAMPLE_GEOLOGY_REQUEST = {
    "boreholeData": [
        {"x": 10, "y": 20, "z": -5, "formation": "sand"},
        {"x": 50, "y": 70, "z": -7, "formation": "sand"},
        {"x": 90, "y": 120, "z": -10, "formation": "sand"},
        {"x": 30, "y": 80, "z": -15, "formation": "clay"},
        {"x": 130, "y": 40, "z": -18, "formation": "clay"},
        {"x": 10, "y": 150, "z": -22, "formation": "clay"},
    ],
    "formations": {"DefaultSeries": "sand,clay"},
    "options": {
        "resolutionX": 15,
        "resolutionY": 15,
        "variogramModel": "spherical"
    }
}

@pytest.mark.asyncio
async def test_create_geological_model_with_camelcase(client: AsyncClient):
    """
    Tests if the /api/geology/create-geological-model endpoint can successfully
    process a request with camelCase keys, which validates the Pydantic alias fix.
    """
    response = await client.post("/api/geology/create-geological-model", json=SAMPLE_GEOLOGY_REQUEST)
    
    # Assert that the request was successful
    assert response.status_code == status.HTTP_200_OK
    
    # Assert that the response contains a list of layers
    response_data = response.json()
    assert isinstance(response_data, list)
    
    # Assert that at least one layer was created (sand should be valid)
    assert len(response_data) > 0
    
    # Check the structure of the first layer
    first_layer = response_data[0]
    assert "name" in first_layer
    assert "color" in first_layer
    assert "opacity" in first_layer
    assert "geometry" in first_layer
    assert "vertices" in first_layer["geometry"]
    assert "normals" in first_layer["geometry"]
    assert "faces" in first_layer["geometry"]
    assert first_layer["name"] == "sand" 