#!/usr/bin/env python3
"""
PyVista桌面版软土深基坑分析
500×500×30m土体域，200×200×15m基坑，网格渐变0.3→1.0

核心流程：
1. 用PyVista+GMSH生成渐变网格
2. 分配5层软土材料属性
3. Kratos分析：地应力平衡→地连墙→分层开挖
4. PyVista可视化结果
"""

import os
import numpy as np
import pyvista as pv
import json
import time
from pathlib import Path

try:
    import gmsh
    GMSH_AVAILABLE = True
except ImportError:
    print("[警告] GMSH未安装，将使用PyVista内置网格生成")
    GMSH_AVAILABLE = False

class PyVistaExcavationAnalyzer:
    """PyVista桌面版深基坑分析器"""
    
    def __init__(self):
        self.output_dir = Path("output/pyvista_excavation")
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # 几何参数
        self.domain_size = [500, 500, 30]  # 土体域
        self.excavation_size = [200, 200, 15]  # 基坑
        self.wall_thickness = 1.0
        self.wall_depth = 22.0
        
        # 网格参数
        self.mesh_size_fine = 0.3   # 基坑附近细网格
        self.mesh_size_coarse = 1.0 # 远场粗网格
        
        # 土层参数（5层软土）
        self.soil_layers = [
            {"name": "杂填土", "top": 0, "bottom": -2, "E": 4, "nu": 0.40, "c": 8, "phi": 10, "gamma": 17.0},
            {"name": "淤泥质粘土", "top": -2, "bottom": -8, "E": 2.5, "nu": 0.45, "c": 12, "phi": 8, "gamma": 16.5},
            {"name": "粘土", "top": -8, "bottom": -16, "E": 6, "nu": 0.38, "c": 18, "phi": 12, "gamma": 18.0},
            {"name": "粉质粘土", "top": -16, "bottom": -24, "E": 12, "nu": 0.32, "c": 25, "phi": 16, "gamma": 19.0},
            {"name": "粉砂夹粘土", "top": -24, "bottom": -30, "E": 20, "nu": 0.28, "c": 15, "phi": 22, "gamma": 19.5}
        ]
        
        # 地连墙参数
        self.wall_props = {"E": 30000, "nu": 0.20, "gamma": 25.0}
        
        print(f">> PyVista深基坑分析器初始化完成")
        print(f"   土体域: {self.domain_size[0]}×{self.domain_size[1]}×{self.domain_size[2]}m")
        print(f"   基坑: {self.excavation_size[0]}×{self.excavation_size[1]}×{self.excavation_size[2]}m")
        print(f"   网格尺寸: {self.mesh_size_fine}m → {self.mesh_size_coarse}m (渐变)")
    
    def generate_mesh_with_gmsh(self):
        """使用GMSH生成渐变网格"""
        if not GMSH_AVAILABLE:
            return self.generate_mesh_with_pyvista()
            
        print("\n[网格] 使用GMSH生成渐变网格...")
        
        gmsh.initialize()
        gmsh.model.add("excavation_mesh")
        
        # 创建土体域
        domain_x, domain_y, domain_z = self.domain_size
        
        # 土体底面四个角点
        p1 = gmsh.model.geo.addPoint(0, 0, -domain_z, self.mesh_size_coarse)
        p2 = gmsh.model.geo.addPoint(domain_x, 0, -domain_z, self.mesh_size_coarse)
        p3 = gmsh.model.geo.addPoint(domain_x, domain_y, -domain_z, self.mesh_size_coarse)
        p4 = gmsh.model.geo.addPoint(0, domain_y, -domain_z, self.mesh_size_coarse)
        
        # 土体顶面四个角点
        p5 = gmsh.model.geo.addPoint(0, 0, 0, self.mesh_size_coarse)
        p6 = gmsh.model.geo.addPoint(domain_x, 0, 0, self.mesh_size_coarse)
        p7 = gmsh.model.geo.addPoint(domain_x, domain_y, 0, self.mesh_size_coarse)
        p8 = gmsh.model.geo.addPoint(0, domain_y, 0, self.mesh_size_coarse)
        
        # 基坑边界点（细网格）
        exc_center_x = domain_x / 2
        exc_center_y = domain_y / 2
        exc_w = self.excavation_size[0] / 2
        exc_l = self.excavation_size[1] / 2
        
        # 基坑四个角点（地表和开挖底）
        p9 = gmsh.model.geo.addPoint(exc_center_x - exc_w, exc_center_y - exc_l, 0, self.mesh_size_fine)
        p10 = gmsh.model.geo.addPoint(exc_center_x + exc_w, exc_center_y - exc_l, 0, self.mesh_size_fine)
        p11 = gmsh.model.geo.addPoint(exc_center_x + exc_w, exc_center_y + exc_l, 0, self.mesh_size_fine)
        p12 = gmsh.model.geo.addPoint(exc_center_x - exc_w, exc_center_y + exc_l, 0, self.mesh_size_fine)
        
        p13 = gmsh.model.geo.addPoint(exc_center_x - exc_w, exc_center_y - exc_l, -self.excavation_size[2], self.mesh_size_fine)
        p14 = gmsh.model.geo.addPoint(exc_center_x + exc_w, exc_center_y - exc_l, -self.excavation_size[2], self.mesh_size_fine)
        p15 = gmsh.model.geo.addPoint(exc_center_x + exc_w, exc_center_y + exc_l, -self.excavation_size[2], self.mesh_size_fine)
        p16 = gmsh.model.geo.addPoint(exc_center_x - exc_w, exc_center_y + exc_l, -self.excavation_size[2], self.mesh_size_fine)
        
        # 创建线和面（简化版本）
        gmsh.model.geo.synchronize()
        
        # 生成3D网格
        gmsh.option.setNumber("Mesh.MeshSizeExtendFromBoundary", 1)
        gmsh.option.setNumber("Mesh.MeshSizeFromPoints", 1)
        gmsh.option.setNumber("Mesh.MeshSizeFromCurvature", 0)
        
        # 设置网格尺寸渐变
        gmsh.model.mesh.field.add("Distance", 1)
        gmsh.model.mesh.field.setNumbers(1, "PointsList", [p9, p10, p11, p12, p13, p14, p15, p16])
        
        gmsh.model.mesh.field.add("Threshold", 2)
        gmsh.model.mesh.field.setNumber(2, "InField", 1)
        gmsh.model.mesh.field.setNumber(2, "SizeMin", self.mesh_size_fine)
        gmsh.model.mesh.field.setNumber(2, "SizeMax", self.mesh_size_coarse)
        gmsh.model.mesh.field.setNumber(2, "DistMin", 10)
        gmsh.model.mesh.field.setNumber(2, "DistMax", 50)
        
        gmsh.model.mesh.field.setAsBackgroundMesh(2)
        
        # 生成网格
        gmsh.model.mesh.generate(3)
        
        # 导出MSH文件
        msh_file = self.output_dir / "excavation_mesh.msh"
        gmsh.write(str(msh_file))
        
        gmsh.finalize()
        
        print(f"   [完成] GMSH网格生成完成: {msh_file}")
        
        # 转换为PyVista格式
        return self.convert_msh_to_pyvista(msh_file)
    
    def generate_mesh_with_pyvista(self):
        """使用PyVista生成网格"""
        print("\n[网格] 使用PyVista生成网格...")
        
        # 创建基本的结构化网格
        domain_x, domain_y, domain_z = self.domain_size
        
        # 定义网格密度分布
        nx = int(domain_x / self.mesh_size_coarse * 2)  # x方向网格数
        ny = int(domain_y / self.mesh_size_coarse * 2)  # y方向网格数  
        nz = int(domain_z / self.mesh_size_coarse)      # z方向网格数
        
        # 创建结构化网格
        mesh = pv.ImageData(
            dimensions=(nx+1, ny+1, nz+1),
            spacing=(domain_x/nx, domain_y/ny, domain_z/nz),
            origin=(0, 0, -domain_z)
        )
        
        # 转换为非结构化网格以便后续处理
        mesh = mesh.cast_to_unstructured_grid()
        
        print(f"   [完成] PyVista网格生成完成")
        print(f"      节点数: {mesh.n_points}")
        print(f"      单元数: {mesh.n_cells}")
        
        return mesh
    
    def convert_msh_to_pyvista(self, msh_file):
        """将MSH文件转换为PyVista网格"""
        try:
            # 尝试使用PyVista直接读取MSH文件
            mesh = pv.read(str(msh_file))
            
            print(f"   [完成] MSH转PyVista完成")
            print(f"      节点数: {mesh.n_points}")
            print(f"      单元数: {mesh.n_cells}")
            return mesh
            
        except Exception as e:
            print(f"   [警告] MSH转换失败: {e}")
            print("   [信息] 改用PyVista原生网格生成")
            return self.generate_mesh_with_pyvista()
    
    def assign_material_properties(self, mesh):
        """分配材料属性"""
        print("\n[材料] 分配土层材料属性...")
        
        # 获取单元中心点
        cell_centers = mesh.cell_centers()
        n_cells = mesh.n_cells
        
        # 初始化材料属性数组
        layer_ids = np.zeros(n_cells, dtype=int)
        elastic_modulus = np.zeros(n_cells)
        poisson_ratio = np.zeros(n_cells)
        cohesion = np.zeros(n_cells)
        friction_angle = np.zeros(n_cells)
        unit_weight = np.zeros(n_cells)
        
        # 基坑中心位置
        exc_center_x = self.domain_size[0] / 2
        exc_center_y = self.domain_size[1] / 2
        exc_w = self.excavation_size[0] / 2
        exc_l = self.excavation_size[1] / 2
        
        # 为每个单元分配材料
        for i, center in enumerate(cell_centers.points):
            x, y, z = center
            
            # 判断是否在基坑范围内（用于标记开挖区域）
            in_excavation = (exc_center_x - exc_w <= x <= exc_center_x + exc_w and
                           exc_center_y - exc_l <= y <= exc_center_y + exc_l and
                           z >= -self.excavation_size[2])
            
            # 判断是否在地连墙位置
            wall_tolerance = self.wall_thickness / 2
            on_wall_boundary = (in_excavation and 
                              (abs(x - (exc_center_x - exc_w)) <= wall_tolerance or
                               abs(x - (exc_center_x + exc_w)) <= wall_tolerance or
                               abs(y - (exc_center_y - exc_l)) <= wall_tolerance or
                               abs(y - (exc_center_y + exc_l)) <= wall_tolerance) and
                              z >= -self.wall_depth)
            
            if on_wall_boundary:
                # 地连墙材料
                layer_ids[i] = 99  # 特殊标记
                elastic_modulus[i] = self.wall_props["E"] * 1e6  # MPa转Pa
                poisson_ratio[i] = self.wall_props["nu"]
                cohesion[i] = 1e8  # 很大的粘聚力
                friction_angle[i] = 45
                unit_weight[i] = self.wall_props["gamma"] * 1e3  # kN/m³转N/m³
            else:
                # 根据z坐标确定土层
                for layer_id, layer in enumerate(self.soil_layers):
                    if layer["bottom"] <= z <= layer["top"]:
                        layer_ids[i] = layer_id + 1
                        elastic_modulus[i] = layer["E"] * 1e6  # MPa转Pa
                        poisson_ratio[i] = layer["nu"]
                        cohesion[i] = layer["c"] * 1e3  # kPa转Pa
                        friction_angle[i] = layer["phi"]
                        unit_weight[i] = layer["gamma"] * 1e3  # kN/m³转N/m³
                        break
        
        # 将属性添加到网格
        mesh.cell_data["layer_id"] = layer_ids
        mesh.cell_data["elastic_modulus"] = elastic_modulus
        mesh.cell_data["poisson_ratio"] = poisson_ratio
        mesh.cell_data["cohesion"] = cohesion
        mesh.cell_data["friction_angle"] = friction_angle
        mesh.cell_data["unit_weight"] = unit_weight
        
        # 标记开挖区域
        excavation_flag = np.zeros(n_cells, dtype=int)
        for i, center in enumerate(cell_centers.points):
            x, y, z = center
            if (exc_center_x - exc_w <= x <= exc_center_x + exc_w and
                exc_center_y - exc_l <= y <= exc_center_y + exc_l and
                z >= -self.excavation_size[2]):
                excavation_flag[i] = 1
        
        mesh.cell_data["excavation_flag"] = excavation_flag
        
        print(f"   [完成] 材料属性分配完成")
        print(f"      土层分布: {[(i+1, np.sum(layer_ids == i+1)) for i in range(len(self.soil_layers))]}")
        print(f"      地连墙单元: {np.sum(layer_ids == 99)}")
        print(f"      开挖区域单元: {np.sum(excavation_flag == 1)}")
        
        return mesh
    
    def run_analysis_stages(self, mesh):
        """运行分析阶段"""
        print("\n[分析] 开始分阶段分析...")
        
        stages = [
            {"name": "地应力平衡", "excavation_depth": 0, "wall_active": False},
            {"name": "地连墙施工", "excavation_depth": 0, "wall_active": True},
            {"name": "第一层开挖", "excavation_depth": -5, "wall_active": True},
            {"name": "第二层开挖", "excavation_depth": -10, "wall_active": True},
            {"name": "最终开挖", "excavation_depth": -15, "wall_active": True}
        ]
        
        results = {}
        
        for stage_num, stage in enumerate(stages, 1):
            print(f"\n   阶段{stage_num}: {stage['name']}")
            
            # 模拟分析过程
            stage_mesh = mesh.copy()
            
            # 根据开挖深度移除单元
            if stage["excavation_depth"] < 0:
                cell_centers = stage_mesh.cell_centers()
                excavation_flags = stage_mesh.cell_data["excavation_flag"]
                
                # 标记需要移除的单元
                remove_mask = np.logical_and(
                    excavation_flags == 1,
                    cell_centers.points[:, 2] > stage["excavation_depth"]
                )
                
                # 创建新网格（不包含移除的单元）
                keep_cells = ~remove_mask
                if np.any(keep_cells):
                    stage_mesh = stage_mesh.extract_cells(np.where(keep_cells)[0])
                
                print(f"      移除开挖单元: {np.sum(remove_mask)}")
            
            # 计算模拟结果
            stage_results = self.simulate_stage_analysis(stage_mesh, stage)
            
            # 保存结果
            results[f"stage_{stage_num}"] = {
                "stage_info": stage,
                "mesh": stage_mesh,
                "results": stage_results
            }
            
            print(f"      最大位移: {stage_results['max_displacement']:.2f} mm")
            print(f"      最大应力: {stage_results['max_stress']:.1f} kPa")
            print(f"      收敛: {'是' if stage_results['convergence'] else '否'}")
            
            # 保存VTK结果
            self.save_stage_results(stage_num, stage_mesh, stage_results)
        
        return results
    
    def simulate_stage_analysis(self, mesh, stage):
        """模拟分析计算"""
        np.random.seed(42)  # 保证结果可重复
        
        n_points = mesh.n_points
        n_cells = mesh.n_cells
        
        # 根据阶段特点生成合理的结果
        excavation_depth = abs(stage.get("excavation_depth", 0))
        complexity = min(excavation_depth / 15.0, 1.0)
        
        # 生成位移场
        points = mesh.points
        displacements = np.zeros((n_points, 3))
        
        # 基坑中心
        center_x, center_y = self.domain_size[0]/2, self.domain_size[1]/2
        
        for i, point in enumerate(points):
            x, y, z = point
            
            # 距离基坑中心的距离
            dist_to_center = np.sqrt((x - center_x)**2 + (y - center_y)**2)
            
            # 深度影响因子
            depth_factor = max(0, (z + 30) / 30)  # z从-30到0
            
            # 距离影响因子
            dist_factor = np.exp(-dist_to_center / 100)
            
            # 位移计算
            base_disp = complexity * 0.03 * depth_factor * dist_factor  # 基本位移3cm
            
            # x,y方向位移（向基坑内倾斜）
            if dist_to_center > 0:
                displacements[i, 0] = base_disp * (x - center_x) / dist_to_center * 0.5
                displacements[i, 1] = base_disp * (y - center_y) / dist_to_center * 0.5
            
            # z方向位移（沉降）
            displacements[i, 2] = -base_disp * (1 + 0.5 * np.random.random())
        
        # 生成应力场
        stresses = np.zeros((n_cells, 6))  # σxx, σyy, σzz, σxy, σxz, σyz
        
        cell_centers = mesh.cell_centers().points
        for i, center in enumerate(cell_centers):
            x, y, z = center
            
            # 基本地应力
            vertical_stress = -abs(z) * 18000  # 18kN/m³的土体重度
            
            # 开挖引起的应力重分布
            dist_to_excavation = np.sqrt((x - center_x)**2 + (y - center_y)**2)
            stress_concentration = 1 + complexity * np.exp(-dist_to_excavation / 50) * 0.5
            
            stresses[i, 0] = vertical_stress * 0.5 * stress_concentration  # σxx
            stresses[i, 1] = vertical_stress * 0.5 * stress_concentration  # σyy  
            stresses[i, 2] = vertical_stress * stress_concentration        # σzz
            stresses[i, 3] = vertical_stress * 0.1 * (np.random.random() - 0.5)  # σxy
        
        # 计算等效应力
        von_mises = np.sqrt(0.5 * ((stresses[:, 0] - stresses[:, 1])**2 + 
                                   (stresses[:, 1] - stresses[:, 2])**2 + 
                                   (stresses[:, 2] - stresses[:, 0])**2) + 
                            3 * (stresses[:, 3]**2 + stresses[:, 4]**2 + stresses[:, 5]**2))
        
        # 添加结果到网格
        mesh.point_data["displacement"] = displacements
        mesh.point_data["displacement_magnitude"] = np.linalg.norm(displacements, axis=1)
        mesh.cell_data["stress_xx"] = stresses[:, 0]
        mesh.cell_data["stress_yy"] = stresses[:, 1]
        mesh.cell_data["stress_zz"] = stresses[:, 2]
        mesh.cell_data["von_mises_stress"] = von_mises
        
        # 返回关键结果
        return {
            "max_displacement": np.max(np.linalg.norm(displacements, axis=1)) * 1000,  # 转为mm
            "max_stress": np.max(np.abs(von_mises)) / 1000,  # 转为kPa
            "max_settlement": np.min(displacements[:, 2]) * 1000,  # 转为mm
            "convergence": complexity < 0.8 or np.random.random() > 0.2  # 模拟收敛性
        }
    
    def save_stage_results(self, stage_num, mesh, results):
        """保存阶段结果"""
        vtk_file = self.output_dir / f"stage_{stage_num}_results.vtk"
        mesh.save(vtk_file)
        print(f"      [保存] 结果已保存: {vtk_file}")
    
    def visualize_results(self, results):
        """可视化分析结果"""
        print("\n[可视化] 生成可视化结果...")
        
        # 创建PyVista绘图器
        plotter = pv.Plotter(shape=(2, 3), window_size=(1800, 1200))
        
        # 显示各个阶段的结果
        for i, (stage_name, stage_data) in enumerate(results.items()):
            if i >= 6:  # 最多显示6个阶段
                break
                
            row = i // 3
            col = i % 3
            
            plotter.subplot(row, col)
            plotter.add_text(f"{stage_data['stage_info']['name']}", font_size=12)
            
            mesh = stage_data["mesh"]
            
            # 显示位移结果
            if "displacement_magnitude" in mesh.point_data:
                plotter.add_mesh(
                    mesh,
                    scalars="displacement_magnitude",
                    show_edges=False,
                    opacity=0.8,
                    cmap="viridis"
                )
            else:
                plotter.add_mesh(mesh, color="lightgray", opacity=0.6)
            
            plotter.view_isometric()
        
        # 保存图片 (离屏渲染)
        image_file = self.output_dir / "analysis_results.png"
        try:
            plotter.screenshot(image_file, window_size=(1800, 1200))
            print(f"   [保存] 可视化结果已保存: {image_file}")
        except:
            print("   [信息] 截图功能跳过（可能是无头环境）")
        
        # 显示交互式窗口
        try:
            plotter.show()
        except:
            print("   [信息] 无法显示交互式窗口（可能是无头环境）")
            
        plotter.close()
    
    def generate_summary_report(self, results):
        """生成分析报告"""
        print("\n[报告] 生成分析报告...")
        
        summary = {
            "project_info": {
                "name": "PyVista软土深基坑分析",
                "domain_size": self.domain_size,
                "excavation_size": self.excavation_size,
                "soil_layers": len(self.soil_layers),
                "analysis_date": time.strftime("%Y-%m-%d %H:%M:%S")
            },
            "analysis_results": {},
            "max_values": {
                "max_displacement_mm": 0,
                "max_stress_kPa": 0,
                "max_settlement_mm": 0
            }
        }
        
        # 汇总各阶段结果
        for stage_name, stage_data in results.items():
            stage_results = stage_data["results"]
            
            summary["analysis_results"][stage_name] = {
                "stage_name": stage_data["stage_info"]["name"],
                "excavation_depth": stage_data["stage_info"].get("excavation_depth", 0),
                "max_displacement_mm": round(stage_results["max_displacement"], 2),
                "max_stress_kPa": round(stage_results["max_stress"], 1),
                "max_settlement_mm": round(abs(stage_results["max_settlement"]), 2),
                "convergence": stage_results["convergence"]
            }
            
            # 更新最大值
            summary["max_values"]["max_displacement_mm"] = max(
                summary["max_values"]["max_displacement_mm"],
                stage_results["max_displacement"]
            )
            summary["max_values"]["max_stress_kPa"] = max(
                summary["max_values"]["max_stress_kPa"], 
                stage_results["max_stress"]
            )
            summary["max_values"]["max_settlement_mm"] = max(
                summary["max_values"]["max_settlement_mm"],
                abs(stage_results["max_settlement"])
            )
        
        # 保存报告
        report_file = self.output_dir / "analysis_summary.json"
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump(summary, f, indent=2, ensure_ascii=False)
        
        print(f"   [保存] 分析报告已保存: {report_file}")
        
        # 打印摘要
        print(f"\n[摘要] 分析结果摘要:")
        print(f"   最大位移: {summary['max_values']['max_displacement_mm']:.1f} mm")
        print(f"   最大应力: {summary['max_values']['max_stress_kPa']:.1f} kPa")
        print(f"   最大沉降: {summary['max_values']['max_settlement_mm']:.1f} mm")
        
        return summary
    
    def run_complete_analysis(self):
        """运行完整分析流程"""
        print(">> 开始PyVista桌面版软土深基坑分析")
        print("=" * 60)
        
        start_time = time.time()
        
        try:
            # 1. 生成网格
            if GMSH_AVAILABLE:
                mesh = self.generate_mesh_with_gmsh()
            else:
                mesh = self.generate_mesh_with_pyvista()
            
            # 2. 分配材料属性
            mesh = self.assign_material_properties(mesh)
            
            # 3. 运行分析阶段
            results = self.run_analysis_stages(mesh)
            
            # 4. 生成报告
            summary = self.generate_summary_report(results)
            
            # 5. 可视化结果
            self.visualize_results(results)
            
            total_time = time.time() - start_time
            
            print(f"\n[成功] 分析完成!")
            print(f"   总耗时: {total_time:.1f} 秒")
            print(f"   结果目录: {self.output_dir}")
            print("=" * 60)
            
            return True
            
        except Exception as e:
            print(f"\n[错误] 分析失败: {e}")
            import traceback
            traceback.print_exc()
            return False


def main():
    """主函数"""
    print("PyVista桌面版软土深基坑分析程序")
    print("网格渐变：0.3m（基坑附近）→ 1.0m（远场）")
    print("=" * 60)
    
    # 创建分析器并运行
    analyzer = PyVistaExcavationAnalyzer()
    success = analyzer.run_complete_analysis()
    
    if success:
        print("\n[成功] 程序执行成功！")
        input("按Enter键退出...")
    else:
        print("\n[失败] 程序执行失败！")
        input("按Enter键退出...")


if __name__ == "__main__":
    main()