"""
基于trame的FEM结果可视化器，用于高效展示FEM分析结果
"""

import os
import numpy as np
from typing import Dict, List, Any, Optional, Union, Tuple
import json
import logging

# 设置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 尝试导入trame相关库
try:
    from trame.app import get_server
    from trame.ui.vuetify import SinglePageLayout
    from trame.widgets import vtk, vuetify, html
    
    import vtk
    from vtkmodules.vtkIOXML import vtkXMLUnstructuredGridReader
    from vtkmodules.vtkRenderingCore import (
        vtkActor,
        vtkPolyDataMapper,
        vtkRenderer,
        vtkRenderWindow,
        vtkRenderWindowInteractor
    )
    from vtkmodules.vtkFiltersCore import vtkFeatureEdges
    from vtkmodules.vtkCommonColor import vtkNamedColors
    from vtkmodules.vtkCommonDataModel import (
        vtkDataObject,
        vtkDataSet
    )
    from vtkmodules.vtkFiltersGeneral import vtkWarpVector
    from vtkmodules.vtkCommonCore import vtkDoubleArray, vtkPoints
    from vtkmodules.vtkCommonDataModel import vtkCellArray, vtkUnstructuredGrid
    
    HAS_TRAME = True
except ImportError:
    HAS_TRAME = False
    logger.warning("trame或vtk库未安装或无法导入，可视化功能将受限")

class TrameFEMVisualizer:
    """基于trame的FEM结果可视化器"""
    
    def __init__(self, 
                cache_dir: str = None,
                title: str = "FEM分析结果可视化",
                show_ui_controls: bool = True,
                default_theme: str = "dark"):
        """
        初始化FEM结果可视化器
        
        Args:
            cache_dir: 缓存目录
            title: 可视化器标题
            show_ui_controls: 是否显示UI控件
            default_theme: 默认主题 ("dark" 或 "light")
        """
        self.cache_dir = cache_dir or os.path.join("data", "visualization", "cache")
        self.title = title
        self.show_ui_controls = show_ui_controls
        self.default_theme = default_theme
        
        # 创建缓存目录
        if not os.path.exists(self.cache_dir):
            try:
                os.makedirs(self.cache_dir)
            except Exception as e:
                logger.warning(f"无法创建缓存目录: {e}")
        
        # 初始化trame服务器和UI组件
        if HAS_TRAME:
            self.server = get_server()
            self.server.state.trame__title = self.title
            self.server.state.update({
                "result_type": "displacement",
                "scale_factor": 1.0,
                "color_map": "rainbow",
                "show_mesh": True,
                "show_edges": True,
                "show_nodes": False,
                "show_deformed": True,
                "theme": self.default_theme,
                "available_results": [],
                "current_result": None,
                "opacity": 1.0,
                "ui_visible": self.show_ui_controls,
                "info_text": "准备就绪",
                "slice_position": 0.5,
                "slice_enabled": False
            })
            
            # 初始化VTK管线
            self._setup_vtk_pipeline()
            
            # 初始化UI布局
            self._setup_ui()
        else:
            logger.error("trame未安装，无法初始化可视化器")
            
    def _setup_vtk_pipeline(self):
        """设置VTK渲染管线"""
        # 创建VTK渲染器
        self.renderer = vtk.vtkRenderer()
        self.renderer.SetBackground(0.1, 0.1, 0.2)  # 深蓝色背景
        
        # 创建场景对象
        self.vtk_widget = vtk.VtkLocalView(self.server)
        self.vtk_widget.setRenderer(self.renderer)
        
        # 数据映射器
        self.mapper = vtk.vtkDataSetMapper()
        
        # 创建主要Actor
        self.actor = vtk.vtkActor()
        self.actor.SetMapper(self.mapper)
        
        # 创建边缘Actor
        self.edge_actor = vtk.vtkActor()
        self.edge_actor.GetProperty().SetColor(0.1, 0.1, 0.1)  # 暗色边缘
        self.edge_actor.GetProperty().SetLineWidth(1.0)
        
        # 添加Actors到渲染器
        self.renderer.AddActor(self.actor)
        self.renderer.AddActor(self.edge_actor)
        self.edge_actor.SetVisibility(True)
        
        # 色标Actor
        self.scalar_bar = vtk.vtkScalarBarActor()
        self.scalar_bar.SetTitle("分析结果")
        self.scalar_bar.SetNumberOfLabels(5)
        self.scalar_bar.SetOrientationToVertical()
        self.scalar_bar.SetWidth(0.1)
        self.scalar_bar.SetHeight(0.7)
        self.scalar_bar.SetPosition(0.9, 0.15)
        self.renderer.AddActor(self.scalar_bar)
        
        # 初始化平面切割器
        self.plane_widget = vtk.vtkImplicitPlaneWidget()
        self.slice_filter = vtk.vtkCutter()
        self.slice_mapper = vtk.vtkPolyDataMapper()
        self.slice_actor = vtk.vtkActor()
        self.slice_actor.SetMapper(self.slice_mapper)
        self.slice_actor.GetProperty().SetColor(1, 1, 1)
        self.slice_actor.GetProperty().SetLineWidth(3)
        self.renderer.AddActor(self.slice_actor)
        self.slice_actor.SetVisibility(False)
        
        # 设置交互方式
        self.vtk_widget.resetCamera()
        
    def _setup_ui(self):
        """设置UI布局"""
        with SinglePageLayout(self.server) as layout:
            # 添加应用栏
            layout.title.set_text(self.title)
            
            with layout.toolbar as toolbar:
                vuetify.VSpacer()
                
                with vuetify.VBtn(icon=True, click=self.vtk_widget.reset_camera):
                    vuetify.VIcon("mdi-home")
                    
                with vuetify.VBtn(icon=True, click=self.toggle_ui):
                    vuetify.VIcon("mdi-cog")
                    
                with vuetify.VBtn(icon=True, click=self.toggle_theme):
                    vuetify.VIcon("mdi-theme-light-dark")
            
            # 主内容区域
            with layout.content:
                with vuetify.VContainer(fluid=True, classes="pa-0 fill-height"):
                    with vuetify.VRow(classes="fill-height"):
                        # 控制面板
                        with vuetify.VCol(cols=3, classes="py-0", v_if=("ui_visible",)):
                            with vuetify.VCard(classes="fill-height"):
                                with vuetify.VCardTitle():
                                    vuetify.VIcon("mdi-tune", classes="mr-2")
                                    html.Div("分析结果控制面板")
                                
                                with vuetify.VCardText():
                                    # 结果类型选择
                                    with vuetify.VSelect(
                                        v_model=("result_type",),
                                        items=("available_results",),
                                        label="结果类型",
                                        hide_details=True,
                                        dense=True,
                                        classes="mb-2"
                                    ):
                                        pass
                                    
                                    # 缩放系数
                                    vuetify.VSlider(
                                        v_model=("scale_factor",),
                                        min=0,
                                        max=20,
                                        step=0.1,
                                        label="变形缩放系数",
                                        thumb_label=True,
                                        hide_details=True,
                                        classes="mt-4"
                                    )
                                    
                                    # 色标选择
                                    with vuetify.VSelect(
                                        v_model=("color_map",),
                                        items=(["rainbow", "jet", "viridis", "plasma", "cool", "hot"],),
                                        label="色标",
                                        hide_details=True,
                                        dense=True,
                                        classes="mb-2 mt-4"
                                    ):
                                        pass
                                    
                                    # 显示选项
                                    vuetify.VCheckbox(
                                        v_model=("show_mesh",),
                                        label="显示网格",
                                        hide_details=True,
                                        dense=True
                                    )
                                    
                                    vuetify.VCheckbox(
                                        v_model=("show_edges",),
                                        label="显示边缘",
                                        hide_details=True,
                                        dense=True
                                    )
                                    
                                    vuetify.VCheckbox(
                                        v_model=("show_deformed",),
                                        label="显示变形",
                                        hide_details=True,
                                        dense=True
                                    )
                                    
                                    # 透明度
                                    vuetify.VSlider(
                                        v_model=("opacity",),
                                        min=0,
                                        max=1,
                                        step=0.01,
                                        label="透明度",
                                        thumb_label=True,
                                        hide_details=True,
                                        classes="mt-4"
                                    )
                                    
                                    # 切片控制
                                    vuetify.VCheckbox(
                                        v_model=("slice_enabled",),
                                        label="启用切片",
                                        hide_details=True,
                                        dense=True,
                                        classes="mt-4"
                                    )
                                    
                                    vuetify.VSlider(
                                        v_model=("slice_position",),
                                        min=0,
                                        max=1,
                                        step=0.01,
                                        label="切片位置",
                                        thumb_label=True,
                                        hide_details=True,
                                        classes="mt-0",
                                        disabled=("!slice_enabled",)
                                    )
                                    
                                    # 信息文本
                                    with vuetify.VCard(classes="mt-4", outlined=True):
                                        with vuetify.VCardText(classes="py-1"):
                                            html.Div("{{ info_text }}")
                        
                        # VTK视图
                        with vuetify.VCol(
                            cols=("ui_visible ? 9 : 12",),
                            classes="py-0",
                        ):
                            html.Div(
                                self.vtk_widget.html,
                                style="width: 100%; height: 100%;",
                                classes="d-flex"
                            )
            
            # 底部状态栏
            with layout.footer:
                vuetify.VFooter(app=True, height="24"):
                    vuetify.VProgressLinear(
                        indeterminate=True,
                        absolute=True,
                        top=True,
                        active=False,
                        height=4
                    )
        
        # 设置状态变更响应
        self.server.controller.on_change("result_type")(self.update_result_display)
        self.server.controller.on_change("scale_factor")(self.update_deformation)
        self.server.controller.on_change("color_map")(self.update_color_map)
        self.server.controller.on_change("show_mesh")(self.toggle_mesh_visibility)
        self.server.controller.on_change("show_edges")(self.toggle_edges_visibility)
        self.server.controller.on_change("show_deformed")(self.toggle_deformation)
        self.server.controller.on_change("opacity")(self.update_opacity)
        self.server.controller.on_change("theme")(self.apply_theme)
        self.server.controller.on_change("slice_enabled")(self.toggle_slice)
        self.server.controller.on_change("slice_position")(self.update_slice_position)
    
    def visualize_fem_results(self, mesh_file, result_data=None, result_file=None):
        """
        可视化FEM结果
        
        Args:
            mesh_file: 网格文件路径(VTK或VTU格式)
            result_data: 结果数据字典(可选)
            result_file: 结果文件路径(可选，VTK或VTU格式)
            
        Returns:
            成功与否
        """
        if not HAS_TRAME:
            logger.error("trame未安装，无法可视化结果")
            return False
            
        try:
            # 加载网格
            success = self._load_mesh(mesh_file)
            if not success:
                return False
                
            # 加载结果
            if result_file:
                success = self._load_result_file(result_file)
            elif result_data:
                success = self._load_result_data(result_data)
                
            if success:
                # 更新可用结果列表
                self._update_available_results()
                
                # 设置默认结果类型
                if self.server.state.available_results:
                    self.server.state.result_type = self.server.state.available_results[0]["value"]
                
                # 更新显示
                self.update_result_display()
                
                # 重置相机
                self.vtk_widget.reset_camera()
                
                # 更新信息文本
                self.server.state.info_text = f"已加载: {os.path.basename(mesh_file)}"
                
                return True
            else:
                self.server.state.info_text = "结果加载失败"
                return False
                
        except Exception as e:
            logger.error(f"可视化FEM结果出错: {e}")
            self.server.state.info_text = f"错误: {str(e)}"
            return False
    
    def _load_mesh(self, mesh_file):
        """加载网格文件"""
        if not os.path.exists(mesh_file):
            logger.error(f"网格文件不存在: {mesh_file}")
            return False
            
        try:
            # 检查文件扩展名
            ext = os.path.splitext(mesh_file)[1].lower()
            
            # 创建适当的读取器
            if ext == ".vtu":
                reader = vtk.vtkXMLUnstructuredGridReader()
            elif ext == ".vtk":
                reader = vtk.vtkUnstructuredGridReader()
            else:
                logger.error(f"不支持的网格文件格式: {ext}")
                return False
                
            # 读取文件
            reader.SetFileName(mesh_file)
            reader.Update()
            
            # 存储数据
            self.mesh_data = reader.GetOutput()
            
            # 设置数据源
            self.mapper.SetInputData(self.mesh_data)
            
            # 设置边缘
            feature_edges = vtk.vtkFeatureEdges()
            feature_edges.SetInputData(self.mesh_data)
            feature_edges.BoundaryEdgesOn()
            feature_edges.FeatureEdgesOff()
            feature_edges.ManifoldEdgesOff()
            feature_edges.NonManifoldEdgesOff()
            feature_edges.Update()
            
            edge_mapper = vtk.vtkPolyDataMapper()
            edge_mapper.SetInputConnection(feature_edges.GetOutputPort())
            self.edge_actor.SetMapper(edge_mapper)
            
            # 设置切片平面
            bounds = self.mesh_data.GetBounds()
            center = [
                (bounds[0] + bounds[1]) / 2,
                (bounds[2] + bounds[3]) / 2,
                (bounds[4] + bounds[5]) / 2
            ]
            
            # 设置切片过滤器
            plane = vtk.vtkPlane()
            plane.SetOrigin(center)
            plane.SetNormal(1, 0, 0)  # X轴切片
            
            self.slice_filter.SetInputData(self.mesh_data)
            self.slice_filter.SetCutFunction(plane)
            self.slice_mapper.SetInputConnection(self.slice_filter.GetOutputPort())
            
            # 初始化变形过滤器
            self.warp_filter = vtk.vtkWarpVector()
            self.warp_filter.SetInputData(self.mesh_data)
            self.warp_filter.SetScaleFactor(0.0)  # 初始不变形
            
            return True
        except Exception as e:
            logger.error(f"加载网格文件出错: {e}")
            return False
    
    def _load_result_file(self, result_file):
        """从文件加载结果数据"""
        if not os.path.exists(result_file):
            logger.error(f"结果文件不存在: {result_file}")
            return False
            
        try:
            # 检查文件扩展名
            ext = os.path.splitext(result_file)[1].lower()
            
            # 创建适当的读取器
            if ext == ".vtu":
                reader = vtk.vtkXMLUnstructuredGridReader()
            elif ext == ".vtk":
                reader = vtk.vtkUnstructuredGridReader()
            else:
                logger.error(f"不支持的结果文件格式: {ext}")
                return False
                
            # 读取文件
            reader.SetFileName(result_file)
            reader.Update()
            
            # 存储结果数据
            self.result_data = reader.GetOutput()
            
            return True
        except Exception as e:
            logger.error(f"加载结果文件出错: {e}")
            return False
    
    def _load_result_data(self, result_data):
        """从数据字典加载结果"""
        try:
            if not self.mesh_data:
                logger.error("未加载网格数据，无法添加结果")
                return False
                
            # 创建结果数据
            self.result_data = self.mesh_data.NewInstance()
            self.result_data.CopyStructure(self.mesh_data)
            
            # 添加结果数组
            for result_name, values in result_data.items():
                if isinstance(values, list) or isinstance(values, np.ndarray):
                    # 创建数据数组
                    array = vtk.vtkDoubleArray()
                    array.SetName(result_name)
                    
                    # 检查数据类型
                    if len(values) > 0 and isinstance(values[0], (list, tuple, np.ndarray)) and len(values[0]) > 1:
                        # 向量数据
                        components = len(values[0])
                        array.SetNumberOfComponents(components)
                        
                        for i, value in enumerate(values):
                            if i < self.mesh_data.GetNumberOfPoints():
                                array.InsertNextTuple(value)
                    else:
                        # 标量数据
                        array.SetNumberOfComponents(1)
                        
                        for i, value in enumerate(values):
                            if i < self.mesh_data.GetNumberOfPoints():
                                array.InsertNextValue(value)
                    
                    # 添加到结果数据
                    if array.GetNumberOfTuples() > 0:
                        self.result_data.GetPointData().AddArray(array)
            
            return True
        except Exception as e:
            logger.error(f"加载结果数据出错: {e}")
            return False
    
    def _update_available_results(self):
        """更新可用结果列表"""
        available_results = []
        
        if self.result_data:
            # 遍历点数据
            point_data = self.result_data.GetPointData()
            for i in range(point_data.GetNumberOfArrays()):
                array = point_data.GetArray(i)
                name = array.GetName()
                
                # 检查是否是位移场
                is_displacement = name.lower() in ["displacement", "displacements", "u", "disp"]
                
                # 添加到列表
                available_results.append({
                    "text": name,
                    "value": name,
                    "is_displacement": is_displacement,
                    "components": array.GetNumberOfComponents()
                })
            
            # 遍历单元数据
            cell_data = self.result_data.GetCellData()
            for i in range(cell_data.GetNumberOfArrays()):
                array = cell_data.GetArray(i)
                name = array.GetName()
                
                # 添加到列表
                available_results.append({
                    "text": name + " (Cell)",
                    "value": name + "_cell",
                    "is_displacement": False,
                    "components": array.GetNumberOfComponents()
                })
        
        # 更新状态
        self.server.state.available_results = available_results
    
    def update_result_display(self, *args):
        """更新结果显示"""
        if not hasattr(self, 'result_data') or not self.result_data:
            return
            
        result_type = self.server.state.result_type
        
        try:
            # 查找当前结果类型
            current_result = None
            for result in self.server.state.available_results:
                if result["value"] == result_type:
                    current_result = result
                    break
            
            if not current_result:
                return
                
            self.server.state.current_result = current_result
            
            # 检查是否是单元数据
            is_cell_data = result_type.endswith("_cell")
            if is_cell_data:
                actual_name = result_type[:-5]  # 移除"_cell"后缀
                
                # 设置单元数据为活动标量
                self.result_data.GetCellData().SetActiveScalars(actual_name)
                
                # 设置映射器标量范围
                self.mapper.SetScalarModeToUseCellData()
            else:
                # 设置点数据为活动标量
                self.result_data.GetPointData().SetActiveScalars(result_type)
                
                # 设置映射器标量范围
                self.mapper.SetScalarModeToUsePointData()
            
            self.mapper.SetScalarRange(
                self.result_data.GetScalarRange()
            )
            
            # 更新色标标题
            self.scalar_bar.SetTitle(result_type)
            
            # 如果是位移场，设置变形显示
            if current_result.get("is_displacement", False):
                if self.server.state.show_deformed:
                    self.warp_filter.SetInputData(self.result_data)
                    self.warp_filter.SetInputArrayToProcess(
                        0, 0, 0, 
                        vtk.vtkDataObject.FIELD_ASSOCIATION_POINTS,
                        result_type
                    )
                    self.warp_filter.SetScaleFactor(self.server.state.scale_factor)
                    self.warp_filter.Update()
                    
                    self.mapper.SetInputConnection(self.warp_filter.GetOutputPort())
                    
                    # 更新切片过滤器输入
                    self.slice_filter.SetInputConnection(self.warp_filter.GetOutputPort())
                else:
                    self.mapper.SetInputData(self.result_data)
                    self.slice_filter.SetInputData(self.result_data)
            else:
                self.mapper.SetInputData(self.result_data)
                self.slice_filter.SetInputData(self.result_data)
            
            # 更新色标
            self.update_color_map()
            
            # 更新透明度
            self.update_opacity()
            
            # 触发更新
            self.server.state.modified()
            
            # 重绘
            self.vtk_widget.update()
        except Exception as e:
            logger.error(f"更新结果显示出错: {e}")
    
    def update_deformation(self, *args):
        """更新变形缩放系数"""
        if not hasattr(self, 'warp_filter'):
            return
            
        scale_factor = self.server.state.scale_factor
        
        # 设置变形缩放系数
        self.warp_filter.SetScaleFactor(scale_factor)
        self.warp_filter.Update()
        
        # 触发更新
        self.server.state.modified()
        
        # 重绘
        self.vtk_widget.update()
    
    def update_color_map(self, *args):
        """更新色标"""
        color_map = self.server.state.color_map
        
        # 创建查找表
        lut = vtk.vtkLookupTable()
        
        # 设置色标
        if color_map == "rainbow":
            lut.SetHueRange(0.667, 0.0)
            lut.SetSaturationRange(0.75, 0.75)
            lut.SetValueRange(1.0, 1.0)
        elif color_map == "jet":
            lut.SetHueRange(0.667, 0.0)
            lut.SetSaturationRange(1.0, 1.0)
            lut.SetValueRange(1.0, 1.0)
        elif color_map == "viridis":
            # 自定义Viridis色标
            lut = vtk.vtkColorTransferFunction()
            lut.AddRGBPoint(0.0, 0.267, 0.005, 0.329)
            lut.AddRGBPoint(0.25, 0.254, 0.265, 0.530)
            lut.AddRGBPoint(0.5, 0.164, 0.471, 0.558)
            lut.AddRGBPoint(0.75, 0.211, 0.751, 0.476)
            lut.AddRGBPoint(1.0, 0.654, 0.865, 0.125)
        elif color_map == "plasma":
            # 自定义Plasma色标
            lut = vtk.vtkColorTransferFunction()
            lut.AddRGBPoint(0.0, 0.050, 0.029, 0.527)
            lut.AddRGBPoint(0.25, 0.415, 0.060, 0.710)
            lut.AddRGBPoint(0.5, 0.741, 0.211, 0.639)
            lut.AddRGBPoint(0.75, 0.954, 0.439, 0.388)
            lut.AddRGBPoint(1.0, 0.940, 0.832, 0.152)
        elif color_map == "cool":
            lut.SetHueRange(0.333, 0.667)
            lut.SetSaturationRange(1.0, 1.0)
            lut.SetValueRange(1.0, 1.0)
        elif color_map == "hot":
            # 自定义Hot色标
            lut = vtk.vtkColorTransferFunction()
            lut.AddRGBPoint(0.0, 0.0, 0.0, 0.0)
            lut.AddRGBPoint(0.33, 1.0, 0.0, 0.0)
            lut.AddRGBPoint(0.66, 1.0, 1.0, 0.0)
            lut.AddRGBPoint(1.0, 1.0, 1.0, 1.0)
        
        # 设置查找表
        if isinstance(lut, vtk.vtkLookupTable):
            lut.SetNumberOfTableValues(256)
            lut.Build()
        
        # 应用查找表
        self.mapper.SetLookupTable(lut)
        
        # 更新色标
        self.scalar_bar.SetLookupTable(lut)
        
        # 触发更新
        self.server.state.modified()
        
        # 重绘
        self.vtk_widget.update()
    
    def toggle_mesh_visibility(self, *args):
        """切换网格可见性"""
        show_mesh = self.server.state.show_mesh
        
        # 设置Actor可见性
        self.actor.SetVisibility(show_mesh)
        
        # 触发更新
        self.server.state.modified()
        
        # 重绘
        self.vtk_widget.update()
    
    def toggle_edges_visibility(self, *args):
        """切换边缘可见性"""
        show_edges = self.server.state.show_edges
        
        # 设置边缘Actor可见性
        self.edge_actor.SetVisibility(show_edges)
        
        # 触发更新
        self.server.state.modified()
        
        # 重绘
        self.vtk_widget.update()
    
    def toggle_deformation(self, *args):
        """切换变形显示"""
        # 更新结果显示，内部会处理变形
        self.update_result_display()
    
    def update_opacity(self, *args):
        """更新透明度"""
        opacity = self.server.state.opacity
        
        # 设置Actor透明度
        self.actor.GetProperty().SetOpacity(opacity)
        
        # 启用/禁用透明度
        if opacity < 1.0:
            self.actor.GetProperty().SetBackfaceCulling(True)
            self.mapper.SetScalarOpacityUnitDistance(0.1)
        else:
            self.actor.GetProperty().SetBackfaceCulling(False)
        
        # 触发更新
        self.server.state.modified()
        
        # 重绘
        self.vtk_widget.update()
    
    def toggle_ui(self, *args):
        """切换UI可见性"""
        self.server.state.ui_visible = not self.server.state.ui_visible
    
    def toggle_theme(self, *args):
        """切换主题"""
        self.server.state.theme = "light" if self.server.state.theme == "dark" else "dark"
    
    def apply_theme(self, *args):
        """应用主题"""
        theme = self.server.state.theme
        
        if theme == "dark":
            # 深色主题
            self.renderer.SetBackground(0.1, 0.1, 0.2)  # 深蓝色背景
            self.edge_actor.GetProperty().SetColor(0.3, 0.3, 0.3)  # 深灰色边缘
            self.scalar_bar.GetLabelTextProperty().SetColor(1, 1, 1)  # 白色文本
            self.scalar_bar.GetTitleTextProperty().SetColor(1, 1, 1)  # 白色标题
        else:
            # 浅色主题
            self.renderer.SetBackground(0.9, 0.9, 1.0)  # 浅蓝色背景
            self.edge_actor.GetProperty().SetColor(0.1, 0.1, 0.1)  # 黑色边缘
            self.scalar_bar.GetLabelTextProperty().SetColor(0, 0, 0)  # 黑色文本
            self.scalar_bar.GetTitleTextProperty().SetColor(0, 0, 0)  # 黑色标题
        
        # 触发更新
        self.server.state.modified()
        
        # 重绘
        self.vtk_widget.update()
    
    def toggle_slice(self, *args):
        """切换切片显示"""
        slice_enabled = self.server.state.slice_enabled
        
        # 设置切片Actor可见性
        self.slice_actor.SetVisibility(slice_enabled)
        
        # 如果启用切片，更新切片位置
        if slice_enabled:
            self.update_slice_position()
        
        # 触发更新
        self.server.state.modified()
        
        # 重绘
        self.vtk_widget.update()
    
    def update_slice_position(self, *args):
        """更新切片位置"""
        if not hasattr(self, 'mesh_data') or not self.mesh_data:
            return
            
        slice_position = self.server.state.slice_position
        
        # 获取边界
        bounds = self.mesh_data.GetBounds()
        
        # 计算X轴切片位置
        x_min, x_max = bounds[0], bounds[1]
        x_pos = x_min + slice_position * (x_max - x_min)
        
        # 计算中心
        y_center = (bounds[2] + bounds[3]) / 2
        z_center = (bounds[4] + bounds[5]) / 2
        
        # 设置切片平面
        plane = vtk.vtkPlane()
        plane.SetOrigin(x_pos, y_center, z_center)
        plane.SetNormal(1, 0, 0)  # X轴切片
        
        self.slice_filter.SetCutFunction(plane)
        self.slice_filter.Update()
        
        # 触发更新
        self.server.state.modified()
        
        # 重绘
        self.vtk_widget.update()
    
    def start(self, port=8080, **kwargs):
        """
        启动可视化服务器
        
        Args:
            port: 服务器端口
            **kwargs: 其他trame服务器参数
            
        Returns:
            服务器实例
        """
        if not HAS_TRAME:
            logger.error("trame未安装，无法启动服务器")
            return None
            
        # 启动服务器
        self.server.start(port=port, **kwargs)
        return self.server

# 示例用法
if __name__ == "__main__":
    # 创建可视化器
    visualizer = TrameFEMVisualizer(
        title="深基坑FEM分析结果可视化",
        show_ui_controls=True,
        default_theme="dark"
    )
    
    # 尝试加载示例结果
    sample_vtk = "data/mesh/simple_box.vtk"
    if os.path.exists(sample_vtk):
        visualizer.visualize_fem_results(sample_vtk)
    
    # 启动服务器
    visualizer.start(port=8080, open_browser=True) 