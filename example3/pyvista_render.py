"""
基于PyVista的三维地质模型渲染和可视化
"""
import pyvista as pv
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.colors import ListedColormap

def load_geological_data(data_file='geological_model_data.npz'):
    """
    加载地质模型数据
    """
    try:
        data = np.load(data_file)
        return {
            'vertices': data['vertices'],
            'lithology': data['lithology']
        }
    except FileNotFoundError:
        print(f"数据文件 {data_file} 未找到，使用示例数据")
        return create_sample_data()

def create_sample_data():
    """
    创建示例数据用于演示
    """
    # 创建简单的网格数据
    x = np.linspace(0, 2000, 50)
    y = np.linspace(0, 2000, 50)
    z = np.linspace(0, 2000, 50)
    
    vertices = np.stack(np.meshgrid(x, y, z, indexing='ij'), axis=-1).reshape(-1, 3)
    
    # 创建简单的地质分层
    lithology = np.zeros(len(vertices))
    lithology[vertices[:, 2] > 1500] = 1  # 上层
    lithology[(vertices[:, 2] > 1000) & (vertices[:, 2] <= 1500)] = 2  # 中层
    lithology[vertices[:, 2] <= 1000] = 3  # 下层
    
    return {
        'vertices': vertices,
        'lithology': lithology
    }

def create_structured_grid(vertices, lithology, grid_shape=(50, 50, 50)):
    """
    创建结构化网格用于pyvista渲染
    """
    # 重塑数据为结构化网格
    x = vertices[:, 0].reshape(grid_shape)
    y = vertices[:, 1].reshape(grid_shape)
    z = vertices[:, 2].reshape(grid_shape)
    
    # 创建pyvista网格
    grid = pv.StructuredGrid(x, y, z)
    
    # 添加地质单元数据
    grid['lithology'] = lithology.reshape(grid_shape, order='F').flatten(order='F')
    
    return grid

def create_mesh_from_points(vertices, lithology):
    """
    从点云创建网格
    """
    # 创建点云
    point_cloud = pv.PolyData(vertices)
    point_cloud['lithology'] = lithology
    
    # 使用Delaunay 3D三角化
    mesh = point_cloud.delaunay_3d()
    
    return mesh

def render_geological_model(grid, rendering_mode='volume'):
    """
    渲染三维地质模型
    """
    # 创建渲染器
    plotter = pv.Plotter(window_size=(1200, 800))
    
    # 定义地质单元颜色
    colors = ['#8B4513', '#DAA520', '#228B22', '#4682B4']  # 棕色、金色、绿色、蓝色
    n_colors = len(np.unique(grid['lithology']))
    cmap = ListedColormap(colors[:n_colors])
    
    if rendering_mode == 'volume':
        # 体积渲染
        plotter.add_volume(grid, scalars='lithology', cmap=cmap, opacity='linear')
    elif rendering_mode == 'isosurface':
        # 等值面渲染
        for i, value in enumerate(np.unique(grid['lithology'])):
            if value > 0:  # 跳过背景值
                contour = grid.contour(isosurfaces=[value], scalars='lithology')
                plotter.add_mesh(contour, color=colors[int(value)-1], 
                               opacity=0.7, label=f'地层 {int(value)}')
    elif rendering_mode == 'slice':
        # 切片渲染
        slices = grid.slice_orthogonal()
        plotter.add_mesh(slices, scalars='lithology', cmap=cmap)
    
    # 设置视角和样式
    plotter.add_axes()
    plotter.add_scalar_bar(title='地质单元', n_labels=n_colors)
    plotter.set_background('white')
    plotter.camera_position = 'iso'
    
    # 添加标题
    plotter.add_title('三维地质模型 - GemPy & PyVista', font_size=16)
    
    return plotter

def interactive_visualization():
    """
    交互式可视化
    """
    # 加载数据
    data = load_geological_data()
    
    # 创建网格
    try:
        grid = create_structured_grid(data['vertices'], data['lithology'])
    except:
        # 如果结构化网格失败，使用网格化方法
        grid = create_mesh_from_points(data['vertices'], data['lithology'])
    
    # 创建多窗口显示
    plotter = pv.Plotter(shape=(2, 2), window_size=(1600, 1200))
    
    # 体积渲染
    plotter.subplot(0, 0)
    plotter.add_volume(grid, scalars='lithology', opacity='linear')
    plotter.add_title('体积渲染')
    
    # 等值面渲染
    plotter.subplot(0, 1)
    colors = ['#DAA520', '#228B22', '#4682B4']
    for i, value in enumerate(np.unique(grid['lithology'])):
        if value > 0:
            contour = grid.contour(isosurfaces=[value], scalars='lithology')
            plotter.add_mesh(contour, color=colors[min(i, len(colors)-1)], opacity=0.7)
    plotter.add_title('等值面渲染')
    
    # 切片渲染
    plotter.subplot(1, 0)
    slices = grid.slice_orthogonal()
    plotter.add_mesh(slices, scalars='lithology')
    plotter.add_title('正交切片')
    
    # 轮廓线渲染
    plotter.subplot(1, 1)
    edges = grid.extract_all_edges()
    plotter.add_mesh(edges, color='black', line_width=1)
    plotter.add_mesh(grid.outline(), color='red', line_width=3)
    plotter.add_title('网格轮廓')
    
    return plotter

def save_model_screenshots(plotter, output_dir='example3/screenshots/'):
    """
    保存模型截图
    """
    import os
    os.makedirs(output_dir, exist_ok=True)
    
    # 保存不同角度的截图
    angles = ['iso', 'xy', 'xz', 'yz']
    for angle in angles:
        plotter.camera_position = angle
        plotter.screenshot(f'{output_dir}model_{angle}.png', window_size=(800, 600))

if __name__ == "__main__":
    print("开始渲染三维地质模型...")
    
    # 基础渲染
    data = load_geological_data()
    
    try:
        grid = create_structured_grid(data['vertices'], data['lithology'])
    except:
        grid = create_mesh_from_points(data['vertices'], data['lithology'])
    
    # 简单渲染
    plotter = render_geological_model(grid, rendering_mode='volume')
    plotter.show()
    
    # 交互式可视化
    print("启动交互式可视化...")
    interactive_plotter = interactive_visualization()
    interactive_plotter.show()
    
    print("渲染完成!")