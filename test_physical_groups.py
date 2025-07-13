#!/usr/bin/env python3
"""
Test script for Gmsh Physical Group Management API
"""
import requests
import json
import gmsh

# Test API endpoint
BASE_URL = "http://localhost:8000/api/meshing"

def test_physical_group_api():
    """Test the physical group management API endpoints"""
    
    print("🧪 Testing Gmsh Physical Group Management API")
    print("=" * 50)
    
    # Initialize Gmsh for testing
    gmsh.initialize()
    gmsh.model.add("test_model")
    
    # Create a simple box geometry
    print("1. Creating test geometry...")
    box = gmsh.model.occ.addBox(0, 0, 0, 10, 10, 10)
    gmsh.model.occ.synchronize()
    
    # Get all entities
    entities = gmsh.model.getEntities()
    print(f"   Created {len(entities)} geometric entities")
    
    # Test 1: List physical groups (should be empty initially)
    print("\n2. Testing GET /physical-groups...")
    try:
        response = requests.get(f"{BASE_URL}/physical-groups")
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Success: Found {data['total_count']} physical groups")
        else:
            print(f"   ❌ Failed: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test 2: Get geometry entities
    print("\n3. Testing GET /geometry/entities...")
    try:
        response = requests.get(f"{BASE_URL}/geometry/entities")
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Success: Found {data['total_count']} geometry entities")
            print(f"   Details: {data['by_dimension']}")
        else:
            print(f"   ❌ Failed: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test 3: Create a physical group
    print("\n4. Testing POST /physical-groups...")
    test_group = {
        "definition": {
            "name": "Test_Soil_Volume",
            "group_type": "volume",
            "material_type": "soil",
            "description": "Test soil volume for API testing",
            "color": "#8B4513",
            "properties": {
                "density": 2000,
                "young_modulus": 30e6,
                "poisson_ratio": 0.3
            }
        },
        "entity_tags": [box],  # Use the box entity
        "auto_tag": True
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/physical-groups",
            json=test_group,
            headers={"Content-Type": "application/json"}
        )
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Success: Created physical group '{data['group_info']['name']}'")
            print(f"   Tag: {data['group_info']['tag']}")
            created_tag = data['group_info']['tag']
        else:
            print(f"   ❌ Failed: {response.status_code} - {response.text}")
            created_tag = None
    except Exception as e:
        print(f"   ❌ Error: {e}")
        created_tag = None
    
    # Test 4: List physical groups again (should have one now)
    print("\n5. Testing GET /physical-groups (after creation)...")
    try:
        response = requests.get(f"{BASE_URL}/physical-groups")
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Success: Found {data['total_count']} physical groups")
            for group in data['groups']:
                print(f"   - {group['name']} (Tag: {group['tag']}, Type: {group['material_type']})")
        else:
            print(f"   ❌ Failed: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test 5: Get specific physical group
    if created_tag:
        print(f"\n6. Testing GET /physical-groups/3/{created_tag}...")
        try:
            response = requests.get(f"{BASE_URL}/physical-groups/3/{created_tag}")
            if response.status_code == 200:
                data = response.json()
                print(f"   ✅ Success: Retrieved group '{data['group_info']['name']}'")
            else:
                print(f"   ❌ Failed: {response.status_code}")
        except Exception as e:
            print(f"   ❌ Error: {e}")
    
        # Test 6: Update physical group
        print(f"\n7. Testing PUT /physical-groups/3/{created_tag}...")
        update_data = {
            "name": "Updated_Soil_Volume",
            "description": "Updated description for testing",
            "material_type": "rock",
            "properties": {
                "density": 2500,
                "young_modulus": 50e6,
                "poisson_ratio": 0.25
            }
        }
        
        try:
            response = requests.put(
                f"{BASE_URL}/physical-groups/3/{created_tag}",
                json=update_data,
                headers={"Content-Type": "application/json"}
            )
            if response.status_code == 200:
                data = response.json()
                print(f"   ✅ Success: Updated group to '{data['group_info']['name']}'")
            else:
                print(f"   ❌ Failed: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"   ❌ Error: {e}")
    
        # Test 7: Delete physical group
        print(f"\n8. Testing DELETE /physical-groups/3/{created_tag}...")
        try:
            response = requests.delete(f"{BASE_URL}/physical-groups/3/{created_tag}")
            if response.status_code == 200:
                data = response.json()
                print(f"   ✅ Success: {data['message']}")
            else:
                print(f"   ❌ Failed: {response.status_code}")
        except Exception as e:
            print(f"   ❌ Error: {e}")
    
    # Test 8: Test batch creation
    print("\n9. Testing POST /physical-groups/batch...")
    batch_requests = [
        {
            "definition": {
                "name": "Batch_Soil_1",
                "group_type": "volume",
                "material_type": "soil",
                "properties": {"density": 1800}
            },
            "entity_tags": [box],
            "auto_tag": True
        },
        {
            "definition": {
                "name": "Batch_Concrete_1",
                "group_type": "volume",
                "material_type": "concrete",
                "properties": {"density": 2400}
            },
            "entity_tags": [box],
            "auto_tag": True
        }
    ]
    
    try:
        response = requests.post(
            f"{BASE_URL}/physical-groups/batch",
            json=batch_requests,
            headers={"Content-Type": "application/json"}
        )
        if response.status_code == 200:
            data = response.json()
            success_count = sum(1 for item in data if item['success'])
            print(f"   ✅ Success: Created {success_count}/{len(batch_requests)} groups")
        else:
            print(f"   ❌ Failed: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test 9: Filter by material type
    print("\n10. Testing GET /physical-groups/materials/soil...")
    try:
        response = requests.get(f"{BASE_URL}/physical-groups/materials/soil")
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Success: Found {data['total_count']} soil groups")
        else:
            print(f"   ❌ Failed: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Clean up
    gmsh.finalize()
    
    print("\n" + "=" * 50)
    print("🎉 Physical Group API Testing Complete!")
    print("\nTo run this test:")
    print("1. Start the backend server: python start_backend.py")
    print("2. Run this script: python test_physical_groups.py")


if __name__ == "__main__":
    test_physical_group_api()