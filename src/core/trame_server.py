#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Trame服务器模块
用于可视化深基坑计算结果
"""

import os
import sys
import logging
import json
from pathlib import Path

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("TrameServer")

# 尝试导入trame
try:
    from trame.app import get_server
    from trame.ui.vuetify import SinglePageLayout
    from trame.widgets import vtk, vuetify
    import vtk as vtk_lib
    TRAME_AVAILABLE = True
except ImportError:
    TRAME_AVAILABLE = False
    logger.warning("Trame导入失败，可视化功能将不可用")

class TrameServer:
    """Trame服务器类"""
    
    def __init__(self, port=8080):
        """初始化Trame服务器
        
        Args:
            port (int): 服务器端口
        """
        if not TRAME_AVAILABLE:
            raise ImportError("Trame库不可用，请先安装")
        
        self.port = port
        self.server = get_server()
        self.state = self.server.state
        self.ctrl = self.server.controller
        
        # VTK渲染器
        self.renderer = None
        self.render_window = None
        
        # 初始化UI
        self._initialize_ui()
        
        logger.info(f"Trame服务器初始化成功，端口: {port}")
    
    def _initialize_ui(self):
        """初始化UI"""
        # 创建VTK渲染器
        self.renderer = vtk_lib.vtkRenderer()
        self.renderer.SetBackground(0.2, 0.3, 0.4)
        
        # 创建渲染窗口
        self.render_window = vtk_lib.vtkRenderWindow()
        self.render_window.AddRenderer(self.renderer)
        
        # 设置状态变量
        self.state.trame__title = "深基坑分析可视化"
        
        # 创建UI布局
        with SinglePageLayout(self.server) as layout:
            # 设置标题
            layout.title.set_text("深基坑分析可视化")
            
            # 添加工具栏
            with layout.toolbar:
                vuetify.VSpacer()
                vuetify.VBtn(
                    "加载结果",
                    click=self.ctrl.load_results,
                    icon="mdi-folder-open",
                )
                vuetify.VBtn(
                    "显示位移",
                    click=self.ctrl.show_displacement,
                    icon="mdi-arrow-expand-all",
                )
                vuetify.VBtn(
                    "显示应力",
                    click=self.ctrl.show_stress,
                    icon="mdi-chart-bubble",
                )
                vuetify.VBtn(
                    "重置视图",
                    click=self.ctrl.reset_camera,
                    icon="mdi-refresh",
                )
            
            # 添加内容区域
            with layout.content:
                with vuetify.VContainer(fluid=True, classes="pa-0 fill-height"):
                    # 添加VTK视图
                    view = vtk.VtkLocalView(self.render_window)
                    self.ctrl.view_update = view.update
                    self.ctrl.view_reset_camera = view.reset_camera
            
            # 添加侧边栏
            with layout.drawer as drawer:
                drawer.width = 300
                with vuetify.VContainer(fluid=True):
                    vuetify.VSubheader("显示选项")
                    vuetify.VSlider(
                        v_model=("displacement_scale", 1.0),
                        min=0.1,
                        max=10,
                        step=0.1,
                        label="位移放大系数",
                        thumb_label=True,
                        change=self.ctrl.update_displacement_scale,
                    )
                    vuetify.VDivider()
                    vuetify.VSubheader("颜色映射")
                    vuetify.VSelect(
                        v_model=("color_map", "Rainbow"),
                        items=("color_maps", ["Rainbow", "Jet", "Viridis", "Plasma", "Magma"]),
                        label="颜色映射",
                        change=self.ctrl.update_color_map,
                    )
                    vuetify.VDivider()
                    vuetify.VSubheader("模型信息")
                    with vuetify.VRow():
                        with vuetify.VCol():
                            vuetify.VTextField(
                                v_model=("model_name", ""),
                                label="模型名称",
                                readonly=True,
                            )
                    with vuetify.VRow():
                        with vuetify.VCol(cols=6):
                            vuetify.VTextField(
                                v_model=("node_count", "0"),
                                label="节点数",
                                readonly=True,
                            )
                        with vuetify.VCol(cols=6):
                            vuetify.VTextField(
                                v_model=("element_count", "0"),
                                label="单元数",
                                readonly=True,
                            )
        
        # 注册控制器函数
        self.ctrl.load_results = self.load_results
        self.ctrl.show_displacement = self.show_displacement
        self.ctrl.show_stress = self.show_stress
        self.ctrl.reset_camera = self.reset_camera
        self.ctrl.update_displacement_scale = self.update_displacement_scale
        self.ctrl.update_color_map = self.update_color_map
        
        # 初始化场景
        self.reset_camera()
    
    def load_results(self):
        """加载计算结果"""
        # 在实际应用中，这里应该弹出文件选择对话框
        # 简化起见，这里使用固定路径
        result_file = os.path.join(os.getcwd(), "data", "results", "excavation_results.json")
        
        if not os.path.exists(result_file):
            logger.error(f"结果文件不存在: {result_file}")
            return
        
        try:
            with open(result_file, 'r', encoding='utf-8') as f:
                results = json.load(f)
            
            # 更新模型信息
            self.state.model_name = results.get("model_name", "未知模型")
            
            # 加载网格文件
            mesh_file = results.get("mesh_file")
            if mesh_file and os.path.exists(mesh_file):
                self._load_mesh(mesh_file)
            
            # 加载结果数据
            self._load_result_data(results)
            
            # 更新视图
            self.reset_camera()
            
            logger.info(f"加载结果成功: {result_file}")
        except Exception as e:
            logger.error(f"加载结果失败: {str(e)}")
    
    def _load_mesh(self, mesh_file):
        """加载网格文件
        
        Args:
            mesh_file (str): 网格文件路径
        """
        # 清空当前场景
        self.renderer.RemoveAllViewProps()
        
        # 根据文件扩展名选择读取器
        file_ext = os.path.splitext(mesh_file)[1].lower()
        
        if file_ext == '.vtk':
            reader = vtk_lib.vtkUnstructuredGridReader()
        elif file_ext == '.vtu':
            reader = vtk_lib.vtkXMLUnstructuredGridReader()
        elif file_ext == '.msh':
            # 对于Gmsh文件，需要先转换为VTK格式
            logger.warning("暂不支持直接读取.msh文件，请先转换为VTK格式")
            return
        else:
            logger.error(f"不支持的网格文件格式: {file_ext}")
            return
        
        reader.SetFileName(mesh_file)
        reader.Update()
        
        # 创建网格映射器
        mapper = vtk_lib.vtkDataSetMapper()
        mapper.SetInputConnection(reader.GetOutputPort())
        
        # 创建演员
        actor = vtk_lib.vtkActor()
        actor.SetMapper(mapper)
        actor.GetProperty().SetRepresentationToSurface()
        actor.GetProperty().SetColor(0.8, 0.8, 0.8)
        actor.GetProperty().SetOpacity(0.7)
        
        # 添加到渲染器
        self.renderer.AddActor(actor)
        
        # 更新模型信息
        grid = reader.GetOutput()
        self.state.node_count = grid.GetNumberOfPoints()
        self.state.element_count = grid.GetNumberOfCells()
    
    def _load_result_data(self, results):
        """加载结果数据
        
        Args:
            results (dict): 结果数据
        """
        # 在实际应用中，这里应该解析结果数据并映射到网格上
        # 简化起见，这里只是示例
        
        # 检查是否有位移数据
        if "displacement" in results:
            # 创建位移数据
            displacement = results["displacement"]
            
            # TODO: 将位移数据映射到网格上
            logger.info(f"加载位移数据，节点数: {len(displacement)}")
        
        # 检查是否有应力数据
        if "stress" in results:
            # 创建应力数据
            stress = results["stress"]
            
            # TODO: 将应力数据映射到网格上
            logger.info(f"加载应力数据，单元数: {len(stress)}")
    
    def show_displacement(self):
        """显示位移"""
        # 在实际应用中，这里应该切换到位移显示模式
        logger.info("显示位移")
        
        # 示例：改变演员颜色以表示切换到位移模式
        for actor in self.renderer.GetActors():
            actor.GetProperty().SetColor(0.2, 0.6, 1.0)
        
        # 更新视图
        self.ctrl.view_update()
    
    def show_stress(self):
        """显示应力"""
        # 在实际应用中，这里应该切换到应力显示模式
        logger.info("显示应力")
        
        # 示例：改变演员颜色以表示切换到应力模式
        for actor in self.renderer.GetActors():
            actor.GetProperty().SetColor(1.0, 0.6, 0.2)
        
        # 更新视图
        self.ctrl.view_update()
    
    def reset_camera(self):
        """重置相机"""
        self.renderer.ResetCamera()
        self.ctrl.view_reset_camera()
    
    def update_displacement_scale(self):
        """更新位移放大系数"""
        scale = self.state.displacement_scale
        logger.info(f"更新位移放大系数: {scale}")
        
        # 在实际应用中，这里应该更新位移显示的放大系数
        
        # 更新视图
        self.ctrl.view_update()
    
    def update_color_map(self):
        """更新颜色映射"""
        color_map = self.state.color_map
        logger.info(f"更新颜色映射: {color_map}")
        
        # 在实际应用中，这里应该更新颜色映射
        
        # 更新视图
        self.ctrl.view_update()
    
    def start(self):
        """启动服务器"""
        if not TRAME_AVAILABLE:
            logger.error("Trame库不可用，无法启动服务器")
            return False
        
        try:
            logger.info(f"启动Trame服务器，端口: {self.port}")
            self.server.start(port=self.port)
            return True
        except Exception as e:
            logger.error(f"启动Trame服务器失败: {str(e)}")
            return False


# 示例用法
if __name__ == "__main__":
    # 创建Trame服务器
    server = TrameServer(port=8080)
    
    # 启动服务器
    server.start()