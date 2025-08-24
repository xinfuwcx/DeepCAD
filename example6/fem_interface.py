#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
FEM接口 - Windows到WSL FEniCSx的桥接器
FEM Interface - Windows to WSL FEniCSx Bridge

功能：
1. Windows端调用WSL中的FEniCSx求解器
2. 参数传递和结果回传
3. 实时进度显示
4. VTK文件处理和可视化
"""

import subprocess
import json
import time
import tempfile
from pathlib import Path
import numpy as np

try:
    import pyvista as pv
    PYVISTA_AVAILABLE = True
except ImportError:
    PYVISTA_AVAILABLE = False

class FEMInterface:
    """FEM接口类"""
    
    def __init__(self):
        self.wsl_available = self.check_wsl()
        self.fenicsx_available = False
        
        if self.wsl_available:
            self.fenicsx_available = self.check_fenicsx()
    
    def check_wsl(self):
        """检查WSL是否可用"""
        try:
            result = subprocess.run(
                ["wsl", "--version"], 
                capture_output=True, 
                text=True, 
                timeout=10
            )
            return result.returncode == 0
        except:
            return False
    
    def check_fenicsx(self):
        """检查WSL中FEniCSx是否可用"""
        try:
            result = subprocess.run([
                "wsl", "-e", "bash", "-c",
                "source ~/activate_fenicsx.sh 2>/dev/null && python3 -c 'import dolfinx; print(dolfinx.__version__)'"
            ], capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0 and "dolfinx" not in result.stderr.lower():
                print(f"✅ FEniCSx 可用，版本: {result.stdout.strip()}")
                return True
            else:
                print(f"⚠️ FEniCSx 检查失败: {result.stderr}")
                return False
        except Exception as e:
            print(f"❌ FEniCSx 检查异常: {e}")
            return False
    
    def run_fem_calculation(self, parameters, output_dir="fem_results"):
        """运行FEM计算"""
        
        if not self.fenicsx_available:
            raise RuntimeError("FEniCSx 不可用，请先安装")
        
        print("🚀 启动FEniCSx FEM计算...")
        
        # 准备参数文件
        output_path = Path(output_dir)
        output_path.mkdir(exist_ok=True)
        
        params_file = output_path / "fem_parameters.json"
        
        fem_params = {
            "pier_diameter": parameters.get("pier_diameter", 2.0),
            "inlet_velocity": parameters.get("flow_velocity", 1.2),
            "mesh_resolution": parameters.get("mesh_resolution", 0.2),
            "output_file": str(output_path / "fem_results"),
            "d50": parameters.get("d50", 0.6e-3),
            "viscosity": parameters.get("viscosity", 1e-3),
            "density": parameters.get("density", 1000.0)
        }
        
        with open(params_file, 'w') as f:
            json.dump(fem_params, f, indent=2)
        
        # 转换路径到WSL格式
        wsl_params_file = self.windows_to_wsl_path(str(params_file))
        wsl_solver_file = "/mnt/e/DeepCAD/example6/fenicsx_scour_solver.py"
        
        # 构建WSL命令
        wsl_command = [
            "wsl", "-e", "bash", "-c", 
            f"""
            source ~/activate_fenicsx.sh 2>/dev/null
            cd /mnt/e/DeepCAD/example6
            python3 -c "
import sys
sys.path.append('.')
from fenicsx_scour_solver import FEniCSxScourSolver
import json

# 读取参数
with open('{wsl_params_file}', 'r') as f:
    params = json.load(f)

# 运行计算
solver = FEniCSxScourSolver()
success, results = solver.solve_complete_problem(
    pier_diameter=params['pier_diameter'],
    inlet_velocity=params['inlet_velocity'], 
    mesh_resolution=params['mesh_resolution'],
    output_file=params['output_file']
)

print('FEM_RESULT_START')
if success:
    print(json.dumps({{'success': True, 'results': results}}))
else:
    print(json.dumps({{'success': False, 'error': 'Calculation failed'}}))
print('FEM_RESULT_END')
"
            """
        ]
        
        print("⚡ 执行FEniCSx计算...")
        print(f"📋 参数: 直径={fem_params['pier_diameter']}m, 速度={fem_params['inlet_velocity']}m/s")
        
        try:
            # 执行计算
            result = subprocess.run(
                wsl_command,
                capture_output=True,
                text=True,
                timeout=600  # 10分钟超时
            )
            
            print(f"📤 WSL返回码: {result.returncode}")
            
            if result.stdout:
                print("📤 标准输出:")
                print(result.stdout)
            
            if result.stderr:
                print("❌ 标准错误:")  
                print(result.stderr)
            
            # 解析结果
            output_lines = result.stdout.strip().split('\n')
            
            json_start = -1
            json_end = -1
            
            for i, line in enumerate(output_lines):
                if "FEM_RESULT_START" in line:
                    json_start = i + 1
                elif "FEM_RESULT_END" in line:
                    json_end = i
                    break
            
            if json_start >= 0 and json_end >= 0:
                json_lines = output_lines[json_start:json_end]
                json_str = '\n'.join(json_lines)
                
                print(f"📊 FEniCSx计算结果:")
                print(json_str)
                
                try:
                    fem_result = json.loads(json_str)
                    
                    if fem_result.get('success'):
                        print("✅ FEniCSx计算成功!")
                        
                        # 处理VTK文件
                        vtk_path = output_path / "fem_results.pvd"
                        if vtk_path.exists():
                            print(f"📁 VTK结果文件: {vtk_path}")
                        
                        return fem_result['results']
                    else:
                        raise RuntimeError(f"FEM计算失败: {fem_result.get('error', '未知错误')}")
                        
                except json.JSONDecodeError as e:
                    raise RuntimeError(f"结果解析失败: {e}")
            else:
                raise RuntimeError("未找到有效的计算结果")
                
        except subprocess.TimeoutExpired:
            raise RuntimeError("FEM计算超时")
        except Exception as e:
            raise RuntimeError(f"FEM计算异常: {e}")
    
    def windows_to_wsl_path(self, windows_path):
        """Windows路径转WSL路径"""
        path = Path(windows_path).as_posix()
        # 转换 E:\ 到 /mnt/e/
        if path.startswith('E:'):
            path = path.replace('E:', '/mnt/e')
        elif path.startswith('C:'):
            path = path.replace('C:', '/mnt/c')
        return path
    
    def visualize_vtk_results(self, vtk_file, output_image=None):
        """可视化VTK结果"""
        
        if not PYVISTA_AVAILABLE:
            print("⚠️ PyVista不可用，无法可视化")
            return None
        
        if not Path(vtk_file).exists():
            print(f"❌ VTK文件不存在: {vtk_file}")
            return None
        
        try:
            print(f"🎨 可视化VTK结果: {vtk_file}")
            
            # 读取VTK数据
            reader = pv.get_reader(vtk_file)
            mesh = reader.read()
            
            if len(mesh) == 0:
                print("❌ VTK文件为空")
                return None
            
            # 创建绘图器
            plotter = pv.Plotter(off_screen=True, window_size=[1200, 800])
            
            # 添加速度场
            if 'velocity' in mesh.array_names:
                # 速度矢量
                arrows = mesh.glyph(scale='velocity', factor=0.1, orient='velocity')
                plotter.add_mesh(arrows, color='red', opacity=0.8, label='Velocity')
                
                # 速度大小云图
                mesh_with_speed = mesh.copy()
                if 'speed' in mesh.array_names:
                    plotter.add_mesh(
                        mesh_with_speed, 
                        scalars='speed',
                        cmap='viridis',
                        opacity=0.7,
                        scalar_bar_args={'title': 'Speed (m/s)'}
                    )
                else:
                    # 计算速度大小
                    velocity_data = mesh['velocity']
                    speed = np.linalg.norm(velocity_data, axis=1)
                    mesh_with_speed['speed'] = speed
                    
                    plotter.add_mesh(
                        mesh_with_speed,
                        scalars='speed', 
                        cmap='viridis',
                        opacity=0.7,
                        scalar_bar_args={'title': 'Speed (m/s)'}
                    )
            
            # 添加压力云图
            if 'pressure' in mesh.array_names:
                pressure_mesh = mesh.copy()
                plotter.add_mesh(
                    pressure_mesh,
                    scalars='pressure',
                    cmap='RdBu_r',
                    opacity=0.5,
                    scalar_bar_args={'title': 'Pressure (Pa)'}
                )
            
            # 设置视角和样式
            plotter.set_background('white')
            plotter.add_title('FEniCSx Bridge Pier Flow Simulation', font_size=16)
            
            # 添加坐标轴
            plotter.add_axes()
            
            # 设置相机
            plotter.camera_position = 'xy'
            plotter.camera.zoom(1.2)
            
            # 保存截图
            if output_image:
                plotter.screenshot(output_image, transparent_background=False)
                print(f"🖼️ 截图已保存: {output_image}")
            
            # 显示
            plotter.show()
            
            return mesh
            
        except Exception as e:
            print(f"❌ VTK可视化失败: {e}")
            return None
    
    def create_animation(self, vtk_file, output_gif=None, n_frames=36):
        """创建旋转动画"""
        
        if not PYVISTA_AVAILABLE:
            print("⚠️ PyVista不可用，无法创建动画")
            return None
        
        try:
            print(f"🎬 创建动画: {vtk_file}")
            
            # 读取VTK数据
            reader = pv.get_reader(vtk_file)
            mesh = reader.read()
            
            # 创建绘图器
            plotter = pv.Plotter(off_screen=True, window_size=[800, 600])
            
            # 添加网格和数据
            if 'speed' in mesh.array_names:
                plotter.add_mesh(
                    mesh,
                    scalars='speed',
                    cmap='viridis',
                    scalar_bar_args={'title': 'Speed (m/s)'}
                )
            else:
                plotter.add_mesh(mesh, color='lightblue')
            
            plotter.set_background('white')
            plotter.add_title('FEniCSx Flow Animation')
            
            # 创建动画帧
            frames = []
            for i in range(n_frames):
                angle = i * 360 / n_frames
                plotter.camera.azimuth = angle
                
                # 截图
                frame = plotter.screenshot(transparent_background=True, return_img=True)
                frames.append(frame)
                
                print(f"🎞️ 生成帧 {i+1}/{n_frames}")
            
            plotter.close()
            
            # 保存GIF动画
            if output_gif and frames:
                try:
                    import imageio
                    imageio.mimsave(output_gif, frames, duration=0.1)
                    print(f"🎥 动画已保存: {output_gif}")
                    return output_gif
                except ImportError:
                    print("⚠️ imageio不可用，无法保存GIF")
            
            return frames
            
        except Exception as e:
            print(f"❌ 动画创建失败: {e}")
            return None

# 测试接口
def test_fem_interface():
    """测试FEM接口"""
    
    print("🧪 测试FEM接口...")
    
    interface = FEMInterface()
    
    print(f"WSL可用: {interface.wsl_available}")
    print(f"FEniCSx可用: {interface.fenicsx_available}")
    
    if not interface.fenicsx_available:
        print("❌ FEniCSx不可用，请先安装")
        return False
    
    # 测试参数
    test_params = {
        "pier_diameter": 2.0,
        "flow_velocity": 1.2, 
        "mesh_resolution": 0.3,  # 较粗网格用于快速测试
        "d50": 0.6e-3
    }
    
    try:
        # 运行FEM计算
        results = interface.run_fem_calculation(test_params, "test_fem_output")
        
        print("✅ FEM计算成功!")
        print(f"🏆 冲刷深度: {results['scour_depth']:.3f} m")
        
        # 可视化结果
        vtk_file = "test_fem_output/fem_results.pvd"
        mesh = interface.visualize_vtk_results(vtk_file, "test_fem_result.png")
        
        if mesh:
            print("✅ 可视化成功!")
            
            # 创建动画
            interface.create_animation(vtk_file, "test_fem_animation.gif")
        
        return True
        
    except Exception as e:
        print(f"❌ 测试失败: {e}")
        return False

if __name__ == "__main__":
    test_fem_interface()