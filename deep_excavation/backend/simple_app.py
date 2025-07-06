"""
简化的后端启动文件，用于调试数据处理
"""
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import json
from typing import Dict, Any

app = FastAPI(
    title="Deep Excavation API",
    description="深基坑分析系统API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def read_root():
    return {"message": "Deep Excavation API is running"}

@app.get("/health")
async def health_check():
    return {"status": "ok", "message": "API is healthy"}

@app.post("/api/geology/upload-csv")
async def upload_geological_data(file: UploadFile = File(...)):
    """处理地质数据CSV上传"""
    try:
        # 读取CSV内容
        contents = await file.read()
        content_str = contents.decode('utf-8')
        
        # 解析CSV
        lines = content_str.strip().split('\n')
        if len(lines) < 2:
            return {"error": "CSV文件必须至少包含表头和一行数据"}
        
        headers = lines[0].split(',')
        required_columns = ['X', 'Y', 'Z', 'surface']
        
        # 检查必需列
        missing_columns = [col for col in required_columns if col not in headers]
        if missing_columns:
            return {"error": f"CSV必须包含以下列: {', '.join(missing_columns)}"}
        
        # 解析数据点
        data_points = []
        for i, line in enumerate(lines[1:], 1):
            if line.strip():
                data = line.split(',')
                if len(data) >= len(headers):
                    point = {}
                    for j, header in enumerate(headers):
                        if j < len(data):
                            point[header] = data[j].strip()
                    data_points.append(point)
        
        # 按地层分组
        surfaces = {}
        for point in data_points:
            surface = point.get('surface', '')
            if surface:
                if surface not in surfaces:
                    surfaces[surface] = []
                surfaces[surface].append(point)
        
        # 生成地层信息
        layers = []
        for surface_name, points in surfaces.items():
            # 计算统计信息
            z_values = [float(p['Z']) for p in points if p.get('Z', '').replace('.', '').replace('-', '').isdigit()]
            x_values = [float(p['X']) for p in points if p.get('X', '').replace('.', '').replace('-', '').isdigit()]
            y_values = [float(p['Y']) for p in points if p.get('Y', '').replace('.', '').replace('-', '').isdigit()]
            
            if z_values and x_values and y_values:
                layer_info = {
                    'name': surface_name,
                    'pointCount': len(points),
                    'avgDepth': sum(z_values) / len(z_values),
                    'extent': {
                        'x_min': min(x_values),
                        'x_max': max(x_values),
                        'y_min': min(y_values),
                        'y_max': max(y_values),
                        'z_min': min(z_values),
                        'z_max': max(z_values)
                    },
                    'points': points[:10],  # 只返回前10个点作为示例
                    'description': points[0].get('description', '') if points else ''
                }
                
                # 根据描述推断土壤类型
                description = layer_info['description'].lower()
                if '砂' in description or 'sand' in description:
                    layer_info['soilType'] = 'sand'
                elif '粘土' in description or 'clay' in description:
                    layer_info['soilType'] = 'clay'
                elif '粉' in description or 'silt' in description:
                    layer_info['soilType'] = 'silt'
                elif '岩' in description or 'rock' in description:
                    layer_info['soilType'] = 'bedrock'
                else:
                    layer_info['soilType'] = 'unknown'
                
                layers.append(layer_info)
        
        # 按深度排序
        layers.sort(key=lambda x: x['avgDepth'], reverse=True)
        
        return {
            "success": True,
            "message": f"成功解析{len(data_points)}个数据点，识别出{len(layers)}个地质层",
            "data": {
                "totalPoints": len(data_points),
                "layerCount": len(layers),
                "layers": layers,
                "surfaces": list(surfaces.keys())
            }
        }
        
    except Exception as e:
        return {"error": f"数据处理失败: {str(e)}"}

@app.post("/api/geology/create-3d-model")
async def create_3d_geological_model(data: Dict[str, Any]):
    """创建3D地质模型"""
    try:
        layers = data.get('layers', [])
        if not layers:
            return {"error": "没有地质层数据"}
        
        # 模拟3D模型创建过程
        model_data = {
            "modelId": "model_" + str(hash(str(layers))),
            "layerCount": len(layers),
            "totalVolume": sum([
                (layer['extent']['x_max'] - layer['extent']['x_min']) *
                (layer['extent']['y_max'] - layer['extent']['y_min']) *
                (layer['extent']['z_max'] - layer['extent']['z_min'])
                for layer in layers
            ]),
            "boundingBox": {
                "x_min": min([layer['extent']['x_min'] for layer in layers]),
                "x_max": max([layer['extent']['x_max'] for layer in layers]),
                "y_min": min([layer['extent']['y_min'] for layer in layers]),
                "y_max": max([layer['extent']['y_max'] for layer in layers]),
                "z_min": min([layer['extent']['z_min'] for layer in layers]),
                "z_max": max([layer['extent']['z_max'] for layer in layers])
            },
            "meshInfo": {
                "vertices": sum([layer['pointCount'] for layer in layers]),
                "faces": sum([layer['pointCount'] * 2 for layer in layers]),  # 估算
                "quality": "good"
            },
            "layers": layers
        }
        
        return {
            "success": True,
            "message": "3D地质模型创建成功",
            "model": model_data
        }
        
    except Exception as e:
        return {"error": f"3D模型创建失败: {str(e)}"}

if __name__ == "__main__":
    import uvicorn
    print("🚀 启动简化后端服务...")
    print("📍 地址: http://localhost:8000")
    print("📖 文档: http://localhost:8000/docs")
    uvicorn.run(app, host="0.0.0.0", port=8000) 