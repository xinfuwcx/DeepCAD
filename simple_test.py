"""
简单测试材料参数导入功能
"""
import requests

# 后端API基础URL
BASE_URL = "http://127.0.0.1:8000"

def test_health():
    """测试后端健康状态"""
    try:
        response = requests.get(f"{BASE_URL}/api/health")
        print(f"健康检查: {response.status_code} - {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"连接失败: {e}")
        return False

def test_template():
    """测试材料模板API"""
    try:
        response = requests.get(f"{BASE_URL}/api/materials/template")
        print(f"模板API: {response.status_code}")
        if response.status_code == 200:
            print("模板API工作正常")
            return True
        else:
            print(f"错误: {response.text}")
            return False
    except Exception as e:
        print(f"模板API测试失败: {e}")
        return False

if __name__ == "__main__":
    print("测试开始...")
    
    if test_health():
        print("后端正常，继续测试...")
        test_template()
    else:
        print("后端不可用")
    
    print("测试结束")