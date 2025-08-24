#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
高级可视化模块 - 云图和动画生成
Advanced Visualization Module - Contour Maps and Animation Generation

功能:
1. 高质量云图生成
2. 流场动画制作
3. 结果导出(PNG/MP4/GIF)
4. 交互式3D可视化
"""

import numpy as np
import matplotlib.pyplot as plt
import matplotlib.animation as animation
from matplotlib.colors import ListedColormap
import pyvista as pv
from pathlib import Path
import json
import time
from datetime import datetime

class AdvancedVisualizer:
    """高级可视化器"""
    
    def __init__(self, output_dir="visualization_output"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        
        # 设置高质量渲染参数
        plt.rcParams['figure.dpi'] = 150
        plt.rcParams['savefig.dpi'] = 300
        plt.rcParams['font.size'] = 12
        plt.rcParams['axes.linewidth'] = 1.5
    
    def generate_publication_quality_contour(self, scour_data, params, save_path=None):
        """生成发表级质量的云图"""
        
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(16, 7))
        
        # 左图：冲刷深度分布
        X, Y = scour_data['x'], scour_data['y']
        Z = scour_data['scour_depth']
        
        # 使用自定义色彩映射
        colors = ['#0066CC', '#0080FF', '#66B2FF', '#B3D9FF', 'white', 
                 '#FFE6CC', '#FFCC99', '#FF9933', '#FF6600', '#CC3300']
        n_bins = 50
        cmap = ListedColormap(colors)
        
        # 冲刷深度等值线
        levels = np.linspace(Z.min(), Z.max(), 20)
        cs1 = ax1.contourf(X, Y, Z, levels=levels, cmap='RdBu_r', extend='both')
        cs1_lines = ax1.contour(X, Y, Z, levels=levels[::2], colors='black', 
                               alpha=0.4, linewidths=0.5)
        ax1.clabel(cs1_lines, inline=True, fontsize=10, fmt='%.2f')
        
        # 桥墩
        pier_circle = plt.Circle(scour_data['pier_center'], scour_data['pier_radius'], 
                               color='black', alpha=0.8, zorder=10)
        ax1.add_patch(pier_circle)
        
        # 流线（合成）
        y_stream = np.linspace(Y.min(), Y.max(), 15)
        for y in y_stream:
            if abs(y - scour_data['pier_center'][1]) > scour_data['pier_radius'] * 1.5:
                x_stream = np.linspace(X.min(), X.max(), 100)
                y_stream_line = np.full_like(x_stream, y)
                ax1.plot(x_stream, y_stream_line, 'gray', alpha=0.3, linewidth=1)
        
        ax1.set_xlabel('Distance (m)', fontsize=14)
        ax1.set_ylabel('Distance (m)', fontsize=14)
        ax1.set_title('Scour Depth Distribution\nHEC-18 Formula', fontsize=16, pad=20)
        ax1.set_aspect('equal')
        ax1.grid(True, alpha=0.3)
        
        # 色标
        cbar1 = fig.colorbar(cs1, ax=ax1, shrink=0.8, aspect=20)
        cbar1.set_label('Scour Depth (m)', fontsize=12)
        
        # 右图：3D表面图
        ax2 = fig.add_subplot(122, projection='3d')
        
        # 3D表面
        surf = ax2.plot_surface(X, Y, Z, cmap='RdBu_r', alpha=0.8, 
                               linewidth=0, antialiased=True)
        
        # 3D桥墩
        theta = np.linspace(0, 2*np.pi, 50)
        pier_x = scour_data['pier_center'][0] + scour_data['pier_radius'] * np.cos(theta)
        pier_y = scour_data['pier_center'][1] + scour_data['pier_radius'] * np.sin(theta)
        pier_z = np.zeros_like(pier_x)
        
        for i in range(len(pier_x)):
            ax2.plot([pier_x[i], pier_x[i]], [pier_y[i], pier_y[i]], 
                    [pier_z[i], params.water_depth], 'k-', linewidth=2)
        
        ax2.set_xlabel('X (m)', fontsize=12)
        ax2.set_ylabel('Y (m)', fontsize=12)
        ax2.set_zlabel('Elevation (m)', fontsize=12)
        ax2.set_title('3D Scour Surface', fontsize=14)
        
        # 调整视角
        ax2.view_init(elev=20, azim=45)
        
        # 整体标题
        fig.suptitle(f'Bridge Pier Scour Analysis\nD={params.pier_diameter}m, V={params.flow_velocity}m/s', 
                    fontsize=18, y=0.95)
        
        plt.tight_layout()
        
        # 保存
        if save_path is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            save_path = self.output_dir / f"scour_contour_{timestamp}.png"
        
        plt.savefig(save_path, dpi=300, bbox_inches='tight', 
                   facecolor='white', edgecolor='none')
        
        print(f"高质量云图已保存: {save_path}")
        return str(save_path)
    
    def create_flow_animation(self, flow_data, params, duration=5.0, fps=30):
        """创建流场动画"""
        
        print("创建流场动画...")
        
        # 设置动画参数
        frames = int(duration * fps)
        
        fig, ax = plt.subplots(figsize=(12, 8))
        
        # 流线动画的种子点
        pier_d = params.pier_diameter
        seed_points = []
        n_seeds = 8
        
        for i in range(n_seeds):
            y = (i - n_seeds/2) * pier_d * 0.8
            if abs(y) > pier_d/2 + 0.2:
                seed_points.append([-4*pier_d, y])
        
        # 动画函数
        def animate(frame):
            ax.clear()
            
            # 时间进度
            t = frame / frames * 2 * np.pi
            
            # 绘制流线（动态效果）
            for i, (x0, y0) in enumerate(seed_points):
                # 流线轨迹
                x_traj = []
                y_traj = []
                
                x, y = x0, y0
                dt = 0.1
                
                for step in range(int(8*pier_d/dt)):
                    # 简化的流场计算
                    dx = x - flow_data['pier_center'][0]
                    dy = y - flow_data['pier_center'][1]
                    r = np.sqrt(dx**2 + dy**2)
                    
                    if r < flow_data['pier_radius']:
                        break
                        
                    # 势流近似
                    V_base = params.flow_velocity
                    if r > flow_data['pier_radius']:
                        vx = V_base * (1 - (flow_data['pier_radius']/r)**2 * np.cos(2*np.arctan2(dy,dx)))
                        vy = -V_base * (flow_data['pier_radius']/r)**2 * np.sin(2*np.arctan2(dy,dx))
                    else:
                        vx = vy = 0
                    
                    # 动态相位
                    phase_shift = np.sin(t + i * 0.5) * 0.1
                    
                    x += (vx + phase_shift) * dt
                    y += vy * dt
                    
                    x_traj.append(x)
                    y_traj.append(y)
                    
                    if x > 6*pier_d:
                        break
                
                # 绘制流线
                if len(x_traj) > 1:
                    colors = plt.cm.viridis(np.linspace(0.3, 1.0, len(x_traj)))
                    for j in range(len(x_traj)-1):
                        ax.plot([x_traj[j], x_traj[j+1]], [y_traj[j], y_traj[j+1]], 
                               color=colors[j], linewidth=2, alpha=0.8)
            
            # 桥墩
            pier_circle = plt.Circle(flow_data['pier_center'], flow_data['pier_radius'], 
                                   color='darkgray', alpha=0.9, zorder=10)
            ax.add_patch(pier_circle)
            
            # 粒子效果（涡旋）
            if frame % 10 == 0:  # 每隔几帧添加粒子
                for angle in np.linspace(0, 2*np.pi, 12):
                    px = flow_data['pier_center'][0] + 1.5*flow_data['pier_radius']*np.cos(angle)
                    py = flow_data['pier_center'][1] + 1.5*flow_data['pier_radius']*np.sin(angle)
                    
                    ax.scatter(px, py, c='red', s=30, alpha=0.6, zorder=5)
            
            # 设置坐标轴
            ax.set_xlim(-4*pier_d, 6*pier_d)
            ax.set_ylim(-3*pier_d, 3*pier_d)
            ax.set_aspect('equal')
            ax.grid(True, alpha=0.3)
            ax.set_xlabel('X (m)')
            ax.set_ylabel('Y (m)')
            ax.set_title(f'Flow Field Animation\nFrame {frame+1}/{frames}')
        
        # 创建动画
        anim = animation.FuncAnimation(fig, animate, frames=frames, 
                                     interval=1000/fps, repeat=True)
        
        # 保存动画
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        gif_path = self.output_dir / f"flow_animation_{timestamp}.gif"
        mp4_path = self.output_dir / f"flow_animation_{timestamp}.mp4"
        
        # 保存GIF
        try:
            anim.save(gif_path, writer='pillow', fps=fps, dpi=100)
            print(f"GIF动画已保存: {gif_path}")
        except Exception as e:
            print(f"GIF保存失败: {e}")
        
        # 保存MP4（需要ffmpeg）
        try:
            anim.save(mp4_path, writer='ffmpeg', fps=fps, bitrate=1800)
            print(f"MP4动画已保存: {mp4_path}")
        except Exception as e:
            print(f"MP4保存失败: {e}")
        
        plt.show()
        
        return str(gif_path)
    
    def create_pyvista_animation(self, flow_data, params, duration=5.0, fps=30):
        """使用PyVista创建高质量3D动画"""
        
        if not pv._vtk_available:
            print("PyVista不可用，跳过3D动画")
            return None
        
        print("创建PyVista 3D动画...")
        
        # 创建绘图器
        plotter = pv.Plotter(off_screen=True, window_size=[1920, 1080])
        
        # 创建网格
        grid = pv.StructuredGrid(flow_data['x'], flow_data['y'], flow_data['z'])
        
        # 添加速度场
        velocity = np.stack([
            flow_data['u'].ravel(),
            flow_data['v'].ravel(),
            flow_data['w'].ravel()
        ], axis=1)
        
        grid['velocity'] = velocity
        speed = np.sqrt(flow_data['u']**2 + flow_data['v']**2 + flow_data['w']**2)
        grid['speed'] = speed.ravel()
        
        # 流线
        seed_points = []
        pier_d = params.pier_diameter
        for y in np.linspace(-2*pier_d, 2*pier_d, 8):
            for z in np.linspace(0.1, params.water_depth*0.8, 3):
                if abs(y) > pier_d/2 + 0.1:
                    seed_points.append([-4*pier_d, y, z])
        
        seeds = pv.PolyData(np.array(seed_points))
        
        streamlines = grid.streamlines(
            vectors='velocity',
            source=seeds,
            max_time=20.0,
            integration_direction='forward'
        )
        
        # 添加到绘图器
        plotter.add_mesh(streamlines, scalars='speed', cmap='viridis', line_width=3)
        
        # 桥墩
        cylinder = pv.Cylinder(
            center=[0, 0, params.water_depth/2],
            direction=[0, 0, 1],
            radius=pier_d/2,
            height=params.water_depth
        )
        
        plotter.add_mesh(cylinder, color='gray', opacity=0.8)
        
        # 水面
        water_surface = pv.Plane(
            center=[0, 0, params.water_depth],
            direction=[0, 0, 1],
            i_size=10*pier_d,
            j_size=8*pier_d
        )
        
        plotter.add_mesh(water_surface, color='lightblue', opacity=0.3)
        
        # 设置相机和照明
        plotter.camera_position = [(15*pier_d, 10*pier_d, 5*pier_d), 
                                  (0, 0, params.water_depth/2), 
                                  (0, 0, 1)]
        plotter.set_background('white')
        
        # 动画设置
        frames = int(duration * fps)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # 保存帧序列
        frame_dir = self.output_dir / f"frames_{timestamp}"
        frame_dir.mkdir(exist_ok=True)
        
        for i in range(frames):
            # 旋转相机
            angle = i * 360 / frames
            plotter.camera.azimuth = angle
            
            # 保存帧
            frame_path = frame_dir / f"frame_{i:04d}.png"
            plotter.screenshot(str(frame_path))
            
            print(f"保存帧 {i+1}/{frames}")
        
        plotter.close()
        
        # 使用ffmpeg合成视频（如果可用）
        try:
            import subprocess
            
            mp4_path = self.output_dir / f"pyvista_animation_{timestamp}.mp4"
            
            cmd = [
                'ffmpeg', '-y',
                '-framerate', str(fps),
                '-i', str(frame_dir / 'frame_%04d.png'),
                '-c:v', 'libx264',
                '-pix_fmt', 'yuv420p',
                str(mp4_path)
            ]
            
            subprocess.run(cmd, check=True)
            print(f"PyVista 3D动画已保存: {mp4_path}")
            
            # 清理帧文件
            import shutil
            shutil.rmtree(frame_dir)
            
            return str(mp4_path)
            
        except Exception as e:
            print(f"视频合成失败: {e}")
            print(f"帧文件保存在: {frame_dir}")
            return str(frame_dir)
    
    def generate_comprehensive_report(self, params, result, flow_data, scour_data):
        """生成综合分析报告"""
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # 创建报告
        report = {
            'metadata': {
                'timestamp': timestamp,
                'software': 'DeepCAD-SCOUR',
                'version': '1.0'
            },
            'parameters': {
                'pier_diameter': params.pier_diameter,
                'flow_velocity': params.flow_velocity,
                'water_depth': params.water_depth,
                'd50': params.d50,
                'pier_shape': params.pier_shape
            },
            'results': {
                'scour_depth': result.scour_depth,
                'scour_width': result.scour_width,
                'max_velocity': result.max_velocity,
                'reynolds_number': result.reynolds_number,
                'froude_number': result.froude_number,
                'method': result.method
            },
            'analysis': {
                'relative_scour_depth': result.scour_depth / params.pier_diameter,
                'flow_regime': 'subcritical' if result.froude_number < 1.0 else 'supercritical',
                'reynolds_regime': 'turbulent' if result.reynolds_number > 4000 else 'transitional'
            }
        }
        
        # 保存JSON报告
        json_path = self.output_dir / f"analysis_report_{timestamp}.json"
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        # 生成HTML报告
        html_path = self.output_dir / f"analysis_report_{timestamp}.html"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Bridge Pier Scour Analysis Report</title>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 40px; }}
                .header {{ background-color: #f4f4f4; padding: 20px; }}
                .section {{ margin: 20px 0; }}
                table {{ border-collapse: collapse; width: 100%; }}
                th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
                th {{ background-color: #f2f2f2; }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Bridge Pier Scour Analysis Report</h1>
                <p>Generated on: {timestamp}</p>
            </div>
            
            <div class="section">
                <h2>Input Parameters</h2>
                <table>
                    <tr><th>Parameter</th><th>Value</th><th>Unit</th></tr>
                    <tr><td>Pier Diameter</td><td>{params.pier_diameter}</td><td>m</td></tr>
                    <tr><td>Flow Velocity</td><td>{params.flow_velocity}</td><td>m/s</td></tr>
                    <tr><td>Water Depth</td><td>{params.water_depth}</td><td>m</td></tr>
                    <tr><td>Sediment d50</td><td>{params.d50}</td><td>mm</td></tr>
                </table>
            </div>
            
            <div class="section">
                <h2>Results</h2>
                <table>
                    <tr><th>Parameter</th><th>Value</th><th>Unit</th></tr>
                    <tr><td>Scour Depth</td><td>{result.scour_depth:.3f}</td><td>m</td></tr>
                    <tr><td>Scour Width</td><td>{result.scour_width:.3f}</td><td>m</td></tr>
                    <tr><td>Maximum Velocity</td><td>{result.max_velocity:.3f}</td><td>m/s</td></tr>
                    <tr><td>Reynolds Number</td><td>{result.reynolds_number:.0f}</td><td>-</td></tr>
                    <tr><td>Froude Number</td><td>{result.froude_number:.3f}</td><td>-</td></tr>
                </table>
            </div>
            
            <div class="section">
                <h2>Analysis</h2>
                <ul>
                    <li>Relative scour depth (ds/D): {result.scour_depth/params.pier_diameter:.2f}</li>
                    <li>Flow regime: {'Subcritical' if result.froude_number < 1.0 else 'Supercritical'}</li>
                    <li>Reynolds regime: {'Turbulent' if result.reynolds_number > 4000 else 'Transitional'}</li>
                    <li>Calculation method: {result.method}</li>
                </ul>
            </div>
            
        </body>
        </html>
        """
        
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        print(f"分析报告已保存:")
        print(f"  JSON: {json_path}")
        print(f"  HTML: {html_path}")
        
        return json_path, html_path

# 测试函数
def test_advanced_visualization():
    """测试高级可视化功能"""
    
    # 创建测试数据
    class TestParams:
        def __init__(self):
            self.pier_diameter = 2.0
            self.flow_velocity = 1.2
            self.water_depth = 4.0
            self.d50 = 0.8
            self.pier_shape = "circular"
    
    class TestResult:
        def __init__(self):
            self.scour_depth = 3.5
            self.scour_width = 12.0
            self.max_velocity = 2.4
            self.reynolds_number = 2400000
            self.froude_number = 0.19
            self.method = "HEC-18"
    
    params = TestParams()
    result = TestResult()
    
    # 生成测试数据
    from working_scour_analyzer import FlowFieldGenerator
    
    flow_gen = FlowFieldGenerator()
    flow_data = flow_gen.generate_flow_field(params)
    scour_data = flow_gen.generate_scour_field(params, result)
    
    # 创建可视化器
    viz = AdvancedVisualizer()
    
    print("开始高级可视化测试...")
    
    # 生成云图
    contour_path = viz.generate_publication_quality_contour(scour_data, params)
    
    # 生成动画
    animation_path = viz.create_flow_animation(flow_data, params, duration=3.0)
    
    # 生成报告
    json_path, html_path = viz.generate_comprehensive_report(params, result, flow_data, scour_data)
    
    print("高级可视化测试完成!")

if __name__ == "__main__":
    test_advanced_visualization()