"""
测试材料参数导入功能
"""
import requests
import json
from pathlib import Path

# 后端API基础URL
BASE_URL = "http://127.0.0.1:8000"

def test_material_template_api():
    """测试材料模板API"""
    try:
        response = requests.get(f"{BASE_URL}/api/materials/template")
        if response.status_code == 200:
            print("材料模板API工作正常")
            template = response.json()
            print(f"模板内容: {json.dumps(template, indent=2, ensure_ascii=False)}")
            return True
        else:
            print(f"❌ 材料模板API失败: {response.status_code}")
            print(f"错误: {response.text}")
            return False
    except Exception as e:
        print(f"❌ 连接API失败: {e}")
        return False

def test_excel_upload():
    """测试Excel文件上传"""
    # 查找示例Excel文件
    excel_file = Path("deep_excavation/data/材料参数模板.xlsx")
    
    if not excel_file.exists():
        print(f"❌ 找不到Excel文件: {excel_file}")
        return False
    
    try:
        with open(excel_file, 'rb') as f:
            files = {'file': (excel_file.name, f, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
            
            # 先测试验证API
            response = requests.post(f"{BASE_URL}/api/materials/validate-excel", files=files)
            
            if response.status_code == 200:
                print("✅ Excel文件验证成功")
                result = response.json()
                print(f"验证结果: {json.dumps(result, indent=2, ensure_ascii=False)}")
                
                # 如果验证成功，测试导入
                if result.get('valid'):
                    with open(excel_file, 'rb') as f2:
                        files2 = {'file': (excel_file.name, f2, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
                        import_response = requests.post(f"{BASE_URL}/api/materials/import-excel", files=files2)
                        
                        if import_response.status_code == 200:
                            print("✅ Excel材料导入成功")
                            import_result = import_response.json()
                            print(f"导入结果: {json.dumps(import_result, indent=2, ensure_ascii=False)}")
                            return True
                        else:
                            print(f"❌ Excel材料导入失败: {import_response.status_code}")
                            print(f"错误: {import_response.text}")
                            return False
                
            else:
                print(f"❌ Excel文件验证失败: {response.status_code}")
                print(f"错误: {response.text}")
                return False
                
    except Exception as e:
        print(f"❌ Excel上传测试失败: {e}")
        return False

def test_health_check():
    """测试后端健康状态"""
    try:
        response = requests.get(f"{BASE_URL}/api/health")
        if response.status_code == 200:
            print("✅ 后端服务正常")
            return True
        else:
            print(f"❌ 后端服务异常: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ 无法连接后端: {e}")
        return False

def main():
    print("开始测试材料参数导入功能...\n")
    
    # 1. 测试后端健康状态
    print("1. 测试后端健康状态:")
    if not test_health_check():
        print("后端服务不可用，无法继续测试")
        return
    print()
    
    # 2. 测试材料模板API
    print("2. 测试材料模板API:")
    test_material_template_api()
    print()
    
    # 3. 测试Excel文件上传
    print("3. 测试Excel文件上传和导入:")
    test_excel_upload()
    print()
    
    print("测试完成!")

if __name__ == "__main__":
    main()