#!/usr/bin/env python3
"""
测试DXF导入API的脚本
"""
import requests
import json
import time
import os
import tempfile

# API基础地址
BASE_URL = "http://localhost:8000/api/dxf-import"

def create_test_dxf_file():
    """创建一个简单的测试DXF文件"""
    dxf_content = '''  0
SECTION
  2
HEADER
  9
$ACADVER
  1
AC1012
  9
$INSUNITS
 70
4
  0
ENDSEC
  0
SECTION
  2
ENTITIES
  0
LINE
  8
0
 10
0.0
 20
0.0
 30
0.0
 11
100.0
 21
0.0
 31
0.0
  0
LINE
  8
0
 10
100.0
 20
0.0
 30
0.0
 11
100.0
 21
100.0
 31
0.0
  0
LINE
  8
0
 10
100.0
 20
100.0
 30
0.0
 11
0.0
 21
100.0
 31
0.0
  0
LINE
  8
0
 10
0.0
 20
100.0
 30
0.0
 11
0.0
 21
0.0
 31
0.0
  0
CIRCLE
  8
1
 10
50.0
 20
50.0
 30
0.0
 40
25.0
  0
ENDSEC
  0
EOF
'''
    
    # 创建临时DXF文件
    with tempfile.NamedTemporaryFile(mode='w', suffix='.dxf', delete=False) as f:
        f.write(dxf_content)
        return f.name

def test_dxf_import_api():
    """测试DXF导入API的所有端点"""
    
    print("🔧 测试DXF导入API")
    print("=" * 60)
    
    # 创建测试DXF文件
    test_file = create_test_dxf_file()
    print(f"创建测试DXF文件: {test_file}")
    
    try:
        # 测试1: 获取支持的格式
        print("\n1. 测试 GET /supported-formats...")
        try:
            response = requests.get(f"{BASE_URL}/supported-formats")
            if response.status_code == 200:
                data = response.json()
                print(f"   ✅ 成功: 输入格式 {data['input_formats']}")
                print(f"   输出格式: {data['output_formats']}")
                print(f"   支持的DXF版本: {len(data['dxf_versions'])}个")
                print(f"   处理模式: {data['processing_modes']}")
            else:
                print(f"   ❌ 失败: {response.status_code}")
        except Exception as e:
            print(f"   ❌ 错误: {e}")
        
        # 测试2: 分析DXF文件
        print("\n2. 测试 POST /analyze...")
        try:
            with open(test_file, 'rb') as f:
                files = {'file': ('test.dxf', f, 'application/octet-stream')}
                response = requests.post(f"{BASE_URL}/analyze", files=files)
            
            if response.status_code == 200:
                data = response.json()
                print(f"   ✅ 成功: 找到 {data['statistics']['total_entities']} 个实体")
                print(f"   图层数: {data['statistics']['layers_count']}")
                print(f"   块数量: {data['statistics']['blocks_count']}")
                print(f"   验证问题: {len(data['validation_issues'])}个")
                print(f"   分析时间: {data['analysis_time']:.3f}秒")
                
                # 保存分析结果供后续测试使用
                global analysis_result
                analysis_result = data
            else:
                print(f"   ❌ 失败: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"   ❌ 错误: {e}")
        
        # 测试3: 处理DXF文件
        print("\n3. 测试 POST /process...")
        try:
            # 准备处理选项
            options = {
                "mode": "tolerant",
                "coordinate_system": "wcs",
                "scale_factor": 1.0,
                "rotation_angle": 0.0,
                "translation": [0.0, 0.0, 0.0],
                "fix_duplicate_vertices": True,
                "fix_zero_length_lines": True,
                "fix_invalid_geometries": True,
                "preserve_layers": True,
                "preserve_colors": True,
                "preserve_linetypes": True
            }
            
            with open(test_file, 'rb') as f:
                files = {'file': ('test.dxf', f, 'application/octet-stream')}
                data = {'options': json.dumps(options)}
                response = requests.post(f"{BASE_URL}/process", files=files, data=data)
            
            if response.status_code == 200:
                result = response.json()
                print(f"   ✅ 成功: 处理状态 {result['success']}")
                print(f"   处理的实体: {result['processed_entities']}")
                print(f"   跳过的实体: {result['skipped_entities']}")
                print(f"   修复的实体: {result['repaired_entities']}")
                print(f"   处理时间: {result['processing_time']:.3f}秒")
                if result['output_files']:
                    print(f"   输出文件: {len(result['output_files'])}个")
            else:
                print(f"   ❌ 失败: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"   ❌ 错误: {e}")
        
        # 测试4: 上传并异步处理
        print("\n4. 测试 POST /upload...")
        try:
            options = {
                "mode": "tolerant",
                "fix_duplicate_vertices": True,
                "fix_zero_length_lines": True,
                "preserve_layers": True
            }
            
            with open(test_file, 'rb') as f:
                files = {'file': ('test.dxf', f, 'application/octet-stream')}
                data = {
                    'project_id': 'test_project',
                    'options': json.dumps(options)
                }
                response = requests.post(f"{BASE_URL}/upload", files=files, data=data)
            
            if response.status_code == 200:
                upload_result = response.json()
                import_id = upload_result['import_id']
                print(f"   ✅ 成功: 上传任务ID {import_id}")
                print(f"   初始状态: {upload_result['status']}")
                
                # 轮询状态
                print("   轮询处理状态...")
                max_attempts = 10
                for attempt in range(max_attempts):
                    time.sleep(1)
                    status_response = requests.get(f"{BASE_URL}/status/{import_id}")
                    if status_response.status_code == 200:
                        status_data = status_response.json()
                        print(f"     尝试 {attempt + 1}: {status_data['status']}")
                        
                        if status_data['status'] in ['completed', 'failed']:
                            if status_data['status'] == 'completed':
                                print("   ✅ 异步处理完成")
                                if status_data.get('analysis_result'):
                                    stats = status_data['analysis_result']['statistics']
                                    print(f"     最终统计: {stats['total_entities']}实体, {stats['layers_count']}图层")
                            else:
                                print("   ❌ 异步处理失败")
                            break
                    else:
                        print(f"     状态查询失败: {status_response.status_code}")
                else:
                    print("   ⚠️ 轮询超时")
            else:
                print(f"   ❌ 失败: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"   ❌ 错误: {e}")
        
        # 测试5: 质量报告（如果有分析结果）
        if 'analysis_result' in globals():
            print("\n5. 测试质量报告生成...")
            try:
                # 这里需要一个有效的import_id，使用上面的
                if 'import_id' in locals():
                    response = requests.get(f"{BASE_URL}/quality-report/{import_id}")
                    if response.status_code == 200:
                        quality_data = response.json()
                        print(f"   ✅ 成功: 整体质量 {quality_data['overall_quality']}")
                        print(f"   质量分数: {quality_data['quality_score']:.1f}/100")
                        print(f"   几何完整性: {quality_data['geometry_integrity']:.1f}")
                        print(f"   数据一致性: {quality_data['data_consistency']:.1f}")
                        print(f"   标准符合性: {quality_data['standards_compliance']:.1f}")
                        if quality_data['recommendations']:
                            print(f"   建议数量: {len(quality_data['recommendations'])}条")
                    else:
                        print(f"   ❌ 失败: {response.status_code}")
                else:
                    print("   ⚠️ 跳过: 没有有效的import_id")
            except Exception as e:
                print(f"   ❌ 错误: {e}")
        
        # 测试6: 清理任务（如果有import_id）
        if 'import_id' in locals():
            print("\n6. 测试清理任务...")
            try:
                response = requests.delete(f"{BASE_URL}/import/{import_id}")
                if response.status_code == 200:
                    result = response.json()
                    print(f"   ✅ 成功: {result['message']}")
                else:
                    print(f"   ❌ 失败: {response.status_code}")
            except Exception as e:
                print(f"   ❌ 错误: {e}")
        
    finally:
        # 清理测试文件
        if os.path.exists(test_file):
            os.unlink(test_file)
            print(f"\n清理测试文件: {test_file}")
    
    print("\n" + "=" * 60)
    print("🎉 DXF导入API测试完成!")
    print("\n使用说明:")
    print("1. 启动后端服务: python start_backend.py")
    print("2. 运行此测试: python test_dxf_import_api.py")
    print("3. 在前端界面测试DXF导入功能: http://localhost:3000/dxf-import")
    print("\n主要功能:")
    print("- ✅ DXF文件上传和分析")
    print("- ✅ 多种处理模式 (严格/容错/修复/预览)")
    print("- ✅ 图层过滤和实体转换")
    print("- ✅ 几何修复和验证")
    print("- ✅ 质量评估报告")
    print("- ✅ 异步处理和状态跟踪")
    print("- ✅ 批量文件处理")
    print("- ✅ 多种输出格式支持")


if __name__ == "__main__":
    test_dxf_import_api()