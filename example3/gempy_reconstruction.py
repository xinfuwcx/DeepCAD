"""
基于GemPy的三维地质重建示例
"""
import numpy as np
import pandas as pd
import gempy as gp
import matplotlib.pyplot as plt

def create_3d_geological_model():
    """
    创建基础的三维地质模型
    """
    # 创建地质模型
    geo_model = gp.create_model('example3_model')
    
    # 定义模型范围
    gp.init_data(geo_model, [0, 2000, 0, 2000, 0, 2000], [50, 50, 50])
    
    # 添加地质单元
    gp.map_stack_to_surfaces(geo_model, 
                            {"Strat_Series": ('rock2', 'rock1'),
                             "Basement_Series": ('basement')})
    
    # 设置地层年龄
    geo_model.set_is_fault(['Strat_Series'], False)
    
    # 添加观测点数据
    surface_points = pd.DataFrame({
        'X': [500, 1000, 1500, 500, 1000, 1500],
        'Y': [500, 1000, 1500, 1500, 1000, 500],
        'Z': [1500, 1200, 1000, 800, 600, 400],
        'surface': ['rock1', 'rock1', 'rock1', 'rock2', 'rock2', 'rock2']
    })
    
    # 添加方向数据
    orientations = pd.DataFrame({
        'X': [1000, 1000],
        'Y': [1000, 1000], 
        'Z': [1000, 800],
        'surface': ['rock1', 'rock2'],
        'azimuth': [90, 90],
        'dip': [10, 15],
        'polarity': [1, 1]
    })
    
    # 设置插值数据
    gp.set_interpolation_data(geo_model,
                             surface_points[['X', 'Y', 'Z', 'surface']],
                             orientations[['X', 'Y', 'Z', 'surface', 'azimuth', 'dip', 'polarity']])
    
    # 编译模型
    gp.set_interpolator(geo_model)
    
    # 计算地质模型
    solution = gp.compute_model(geo_model, compute_mesh=True)
    
    return geo_model, solution

def export_model_data(geo_model, solution):
    """
    导出模型数据用于pyvista渲染
    """
    # 获取网格数据
    vertices = solution.vertices
    simplices = solution.edges
    
    # 获取地质单元数据
    lith_block = solution.lith_block
    
    return {
        'vertices': vertices,
        'simplices': simplices,
        'lithology': lith_block,
        'geo_model': geo_model
    }

if __name__ == "__main__":
    print("开始创建三维地质模型...")
    
    # 创建模型
    geo_model, solution = create_3d_geological_model()
    
    # 导出数据
    model_data = export_model_data(geo_model, solution)
    
    print("三维地质模型创建完成!")
    print(f"模型包含 {len(model_data['vertices'])} 个顶点")
    
    # 保存模型数据
    np.savez('example3/geological_model_data.npz', 
             vertices=model_data['vertices'],
             lithology=model_data['lithology'])
    
    print("模型数据已保存到 geological_model_data.npz")