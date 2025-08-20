"""
GemPy 数据管理器
Data Management System for GemPy CAE
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional, Any
import json
from pathlib import Path
import warnings

import gempy as gp
from PyQt6.QtWidgets import (
    QDialog, QVBoxLayout, QHBoxLayout, QFormLayout, QGroupBox,
    QLabel, QLineEdit, QPushButton, QComboBox, QSpinBox, QDoubleSpinBox,
    QCheckBox, QTableWidget, QTableWidgetItem, QHeaderView, QFileDialog,
    QMessageBox, QDialogButtonBox, QTabWidget, QTextEdit, QProgressBar
)
from PyQt6.QtCore import Qt, QThread, pyqtSignal
from PyQt6.QtGui import QFont

class DataImportDialog(QDialog):
    """数据导入对话框"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setup_ui()
        self.imported_data = None
        
    def setup_ui(self):
        """设置界面"""
        self.setWindowTitle("数据导入向导")
        self.setGeometry(200, 200, 800, 600)
        
        layout = QVBoxLayout(self)
        
        # 标签页
        self.tab_widget = QTabWidget()
        layout.addWidget(self.tab_widget)
        
        # 文件选择页面
        self.create_file_selection_tab()
        
        # 列映射页面
        self.create_column_mapping_tab()
        
        # 数据预览页面
        self.create_data_preview_tab()
        
        # 按钮区域
        button_layout = QHBoxLayout()
        
        self.back_btn = QPushButton("上一步")
        self.back_btn.clicked.connect(self.go_back)
        button_layout.addWidget(self.back_btn)
        
        self.next_btn = QPushButton("下一步")
        self.next_btn.clicked.connect(self.go_next)
        button_layout.addWidget(self.next_btn)
        
        button_layout.addStretch()
        
        self.cancel_btn = QPushButton("取消")
        self.cancel_btn.clicked.connect(self.reject)
        button_layout.addWidget(self.cancel_btn)
        
        self.import_btn = QPushButton("导入")
        self.import_btn.clicked.connect(self.import_data)
        self.import_btn.setEnabled(False)
        button_layout.addWidget(self.import_btn)
        
        layout.addLayout(button_layout)
        
        # 初始状态
        self.update_button_states()
        
    def create_file_selection_tab(self):
        """创建文件选择页面"""
        widget = QGroupBox("文件选择")
        layout = QVBoxLayout(widget)
        
        # 文件类型选择
        type_group = QGroupBox("数据类型")
        type_layout = QVBoxLayout(type_group)
        
        self.data_type_combo = QComboBox()
        self.data_type_combo.addItems([
            "钻孔数据", "地层点", "方向数据", "断层数据", "地形数据"
        ])
        type_layout.addWidget(self.data_type_combo)
        
        layout.addWidget(type_group)
        
        # 文件选择
        file_group = QGroupBox("文件路径")
        file_layout = QHBoxLayout(file_group)
        
        self.file_path_edit = QLineEdit()
        file_layout.addWidget(self.file_path_edit)
        
        browse_btn = QPushButton("浏览...")
        browse_btn.clicked.connect(self.browse_file)
        file_layout.addWidget(browse_btn)
        
        layout.addWidget(file_group)
        
        # 文件格式选项
        format_group = QGroupBox("格式选项")
        format_layout = QFormLayout(format_group)
        
        self.separator_combo = QComboBox()
        self.separator_combo.addItems([",", ";", "\t", "|", "空格"])
        format_layout.addRow("分隔符:", self.separator_combo)
        
        self.encoding_combo = QComboBox()
        self.encoding_combo.addItems(["utf-8", "gbk", "ascii", "latin1"])
        format_layout.addRow("编码:", self.encoding_combo)
        
        self.header_check = QCheckBox()
        self.header_check.setChecked(True)
        format_layout.addRow("包含标题行:", self.header_check)
        
        layout.addWidget(format_group)
        
        self.tab_widget.addTab(widget, "文件选择")
        
    def create_column_mapping_tab(self):
        """创建列映射页面"""
        widget = QGroupBox("列映射")
        layout = QVBoxLayout(widget)
        
        # 说明
        info_label = QLabel("请为每个必需的字段选择对应的数据列：")
        info_label.setFont(QFont("Arial", 10, QFont.Weight.Bold))
        layout.addWidget(info_label)
        
        # 映射表格
        self.mapping_table = QTableWidget()
        self.mapping_table.setColumnCount(3)
        self.mapping_table.setHorizontalHeaderLabels(["字段名", "必需", "数据列"])
        self.mapping_table.horizontalHeader().setStretchLastSection(True)
        layout.addWidget(self.mapping_table)
        
        self.tab_widget.addTab(widget, "列映射")
        
    def create_data_preview_tab(self):
        """创建数据预览页面"""
        widget = QGroupBox("数据预览")
        layout = QVBoxLayout(widget)
        
        # 统计信息
        self.stats_label = QLabel("数据统计信息将在此显示")
        layout.addWidget(self.stats_label)
        
        # 预览表格
        self.preview_table = QTableWidget()
        layout.addWidget(self.preview_table)
        
        self.tab_widget.addTab(widget, "数据预览")
        
    def browse_file(self):
        """浏览文件"""
        filename, _ = QFileDialog.getOpenFileName(
            self, "选择数据文件", "", 
            "CSV文件 (*.csv);;Excel文件 (*.xlsx *.xls);;文本文件 (*.txt);;所有文件 (*)"
        )
        if filename:
            self.file_path_edit.setText(filename)
            self.load_file_preview()
            
    def load_file_preview(self):
        """加载文件预览"""
        file_path = self.file_path_edit.text()
        if not file_path:
            return
            
        try:
            # 根据文件扩展名选择读取方法
            if file_path.endswith('.csv') or file_path.endswith('.txt'):
                sep_map = {",": ",", ";": ";", "\t": "\t", "|": "|", "空格": " "}
                separator = sep_map[self.separator_combo.currentText()]
                
                # 读取前几行预览
                df = pd.read_csv(
                    file_path, 
                    sep=separator,
                    encoding=self.encoding_combo.currentText(),
                    header=0 if self.header_check.isChecked() else None,
                    nrows=10  # 只读取前10行用于预览
                )
            elif file_path.endswith(('.xlsx', '.xls')):
                df = pd.read_excel(file_path, nrows=10)
            else:
                QMessageBox.warning(self, "警告", "不支持的文件格式")
                return
                
            # 更新列映射表格
            self.update_column_mapping(df.columns.tolist())
            
            # 更新预览表格
            self.update_preview_table(df)
            
            self.update_button_states()
            
        except Exception as e:
            QMessageBox.critical(self, "错误", f"读取文件失败: {str(e)}")
            
    def update_column_mapping(self, columns: List[str]):
        """更新列映射"""
        data_type = self.data_type_combo.currentText()
        
        # 根据数据类型定义必需字段
        required_fields = {
            "钻孔数据": [
                ("hole_id", True), ("x", True), ("y", True), ("z", True),
                ("soil_layer", False), ("soil_type", False), ("description", False)
            ],
            "地层点": [
                ("x", True), ("y", True), ("z", True), ("surface", True)
            ],
            "方向数据": [
                ("x", True), ("y", True), ("z", True), ("surface", True),
                ("azimuth", True), ("dip", True), ("polarity", False)
            ],
            "断层数据": [
                ("x", True), ("y", True), ("z", True), ("fault_name", True)
            ],
            "地形数据": [
                ("x", True), ("y", True), ("z", True)
            ]
        }
        
        fields = required_fields.get(data_type, [])
        
        self.mapping_table.setRowCount(len(fields))
        
        for i, (field_name, required) in enumerate(fields):
            # 字段名
            field_item = QTableWidgetItem(field_name)
            field_item.setFlags(Qt.ItemFlag.ItemIsEnabled)
            self.mapping_table.setItem(i, 0, field_item)
            
            # 是否必需
            required_item = QTableWidgetItem("是" if required else "否")
            required_item.setFlags(Qt.ItemFlag.ItemIsEnabled)
            self.mapping_table.setItem(i, 1, required_item)
            
            # 列选择下拉框
            column_combo = QComboBox()
            column_combo.addItem("-- 选择列 --")
            column_combo.addItems(columns)
            
            # 尝试自动匹配
            for col in columns:
                if field_name.lower() in col.lower():
                    column_combo.setCurrentText(col)
                    break
                    
            self.mapping_table.setCellWidget(i, 2, column_combo)
            
    def update_preview_table(self, df: pd.DataFrame):
        """更新预览表格"""
        self.preview_table.setRowCount(df.shape[0])
        self.preview_table.setColumnCount(df.shape[1])
        self.preview_table.setHorizontalHeaderLabels(df.columns.tolist())
        
        for i in range(df.shape[0]):
            for j in range(df.shape[1]):
                item = QTableWidgetItem(str(df.iloc[i, j]))
                self.preview_table.setItem(i, j, item)
                
        # 更新统计信息
        stats_text = f"数据行数: {df.shape[0]}\n数据列数: {df.shape[1]}\n列名: {', '.join(df.columns[:5])}"
        if len(df.columns) > 5:
            stats_text += "..."
        self.stats_label.setText(stats_text)
        
    def go_back(self):
        """返回上一步"""
        current_index = self.tab_widget.currentIndex()
        if current_index > 0:
            self.tab_widget.setCurrentIndex(current_index - 1)
        self.update_button_states()
        
    def go_next(self):
        """进入下一步"""
        current_index = self.tab_widget.currentIndex()
        if current_index < self.tab_widget.count() - 1:
            self.tab_widget.setCurrentIndex(current_index + 1)
        self.update_button_states()
        
    def update_button_states(self):
        """更新按钮状态"""
        current_index = self.tab_widget.currentIndex()
        
        self.back_btn.setEnabled(current_index > 0)
        self.next_btn.setEnabled(
            current_index < self.tab_widget.count() - 1 and 
            self.file_path_edit.text()
        )
        self.import_btn.setEnabled(
            current_index == self.tab_widget.count() - 1 and
            self.file_path_edit.text()
        )
        
    def import_data(self):
        """导入数据"""
        try:
            # 验证映射
            if not self.validate_mapping():
                return
                
            # 读取完整数据
            file_path = self.file_path_edit.text()
            
            if file_path.endswith('.csv') or file_path.endswith('.txt'):
                sep_map = {",": ",", ";": ";", "\t": "\t", "|": "|", "空格": " "}
                separator = sep_map[self.separator_combo.currentText()]
                
                df = pd.read_csv(
                    file_path, 
                    sep=separator,
                    encoding=self.encoding_combo.currentText(),
                    header=0 if self.header_check.isChecked() else None
                )
            elif file_path.endswith(('.xlsx', '.xls')):
                df = pd.read_excel(file_path)
            else:
                raise ValueError("不支持的文件格式")
                
            # 应用列映射
            mapped_data = self.apply_column_mapping(df)
            
            self.imported_data = {
                'data_type': self.data_type_combo.currentText(),
                'dataframe': mapped_data,
                'source_file': file_path
            }
            
            self.accept()
            
        except Exception as e:
            QMessageBox.critical(self, "错误", f"导入数据失败: {str(e)}")
            
    def validate_mapping(self) -> bool:
        """验证映射"""
        for i in range(self.mapping_table.rowCount()):
            required_item = self.mapping_table.item(i, 1)
            if required_item and required_item.text() == "是":
                combo = self.mapping_table.cellWidget(i, 2)
                if combo.currentText() == "-- 选择列 --":
                    field_name = self.mapping_table.item(i, 0).text()
                    QMessageBox.warning(self, "警告", f"必需字段 '{field_name}' 未映射")
                    return False
        return True
        
    def apply_column_mapping(self, df: pd.DataFrame) -> pd.DataFrame:
        """应用列映射"""
        mapped_df = pd.DataFrame()
        
        for i in range(self.mapping_table.rowCount()):
            field_name = self.mapping_table.item(i, 0).text()
            combo = self.mapping_table.cellWidget(i, 2)
            selected_column = combo.currentText()
            
            if selected_column != "-- 选择列 --":
                mapped_df[field_name] = df[selected_column]
                
        return mapped_df

class GemPyDataManager:
    """GemPy数据管理器"""
    
    def __init__(self):
        self.geological_data = {
            'boreholes': pd.DataFrame(),
            'surface_points': pd.DataFrame(),
            'orientations': pd.DataFrame(),
            'faults': pd.DataFrame(),
            'topography': pd.DataFrame()
        }
        
    def import_data_from_dialog(self, parent=None) -> Tuple[bool, Optional[str]]:
        """通过对话框导入数据"""
        dialog = DataImportDialog(parent)
        
        if dialog.exec() == QDialog.DialogCode.Accepted:
            imported_data = dialog.imported_data
            
            if imported_data:
                data_type = imported_data['data_type']
                dataframe = imported_data['dataframe']
                
                # 根据数据类型存储
                if data_type == "钻孔数据":
                    self.geological_data['boreholes'] = dataframe
                elif data_type == "地层点":
                    self.geological_data['surface_points'] = dataframe
                elif data_type == "方向数据":
                    self.geological_data['orientations'] = dataframe
                elif data_type == "断层数据":
                    self.geological_data['faults'] = dataframe
                elif data_type == "地形数据":
                    self.geological_data['topography'] = dataframe
                    
                return True, f"成功导入 {len(dataframe)} 条 {data_type} 记录"
            else:
                return False, "导入数据为空"
        else:
            return False, "用户取消导入"
            
    def get_data(self, data_type: str) -> pd.DataFrame:
        """获取指定类型的数据"""
        return self.geological_data.get(data_type, pd.DataFrame())
        
    def has_data(self, data_type: str) -> bool:
        """检查是否有指定类型的数据"""
        df = self.get_data(data_type)
        return not df.empty
        
    def get_data_summary(self) -> Dict[str, int]:
        """获取数据摘要"""
        summary = {}
        for data_type, df in self.geological_data.items():
            summary[data_type] = len(df)
        return summary
        
    def export_data(self, data_type: str, filename: str) -> bool:
        """导出数据"""
        try:
            df = self.get_data(data_type)
            if df.empty:
                return False
                
            if filename.endswith('.csv'):
                df.to_csv(filename, index=False, encoding='utf-8')
            elif filename.endswith(('.xlsx', '.xls')):
                df.to_excel(filename, index=False)
            else:
                return False
                
            return True
        except Exception:
            return False
            
    def create_gempy_model_from_data(self, extent: List[float], resolution: List[int]) -> Optional[Any]:
        """从数据创建GemPy模型"""
        try:
            # 创建基础模型
            geo_model = gp.create_geomodel(
                project_name='Imported_Model',
                extent=extent,
                resolution=resolution
            )
            
            # 添加地层点数据
            surface_points = self.get_data('surface_points')
            if not surface_points.empty:
                gp.add_surface_points(
                    geo_model,
                    x=surface_points['x'].values,
                    y=surface_points['y'].values,
                    z=surface_points['z'].values,
                    surface=surface_points['surface'].values
                )
                
            # 添加方向数据
            orientations = self.get_data('orientations')
            if not orientations.empty:
                # 简化版本，实际需要根据数据格式调整
                gp.add_orientations(
                    geo_model,
                    x=orientations['x'].values,
                    y=orientations['y'].values,
                    z=orientations['z'].values,
                    surface=orientations['surface'].values,
                    orientation=orientations[['azimuth', 'dip']].values
                )
                
            return geo_model
            
        except Exception as e:
            print(f"创建GemPy模型失败: {e}")
            return None

# 地质建模工作流助手
class GeologicalWorkflowHelper:
    """地质建模工作流助手"""
    
    @staticmethod
    def validate_model_data(data_manager: GemPyDataManager) -> Tuple[bool, List[str]]:
        """验证模型数据完整性"""
        issues = []
        
        # 检查地层点
        if not data_manager.has_data('surface_points'):
            issues.append("缺少地层点数据")
        else:
            surface_points = data_manager.get_data('surface_points')
            required_cols = ['x', 'y', 'z', 'surface']
            missing_cols = [col for col in required_cols if col not in surface_points.columns]
            if missing_cols:
                issues.append(f"地层点数据缺少列: {', '.join(missing_cols)}")
                
        # 检查方向数据（可选但推荐）
        if data_manager.has_data('orientations'):
            orientations = data_manager.get_data('orientations')
            required_cols = ['x', 'y', 'z', 'surface', 'azimuth', 'dip']
            missing_cols = [col for col in required_cols if col not in orientations.columns]
            if missing_cols:
                issues.append(f"方向数据缺少列: {', '.join(missing_cols)}")
                
        return len(issues) == 0, issues
        
    @staticmethod
    def suggest_model_extent(data_manager: GemPyDataManager) -> List[float]:
        """建议模型范围"""
        all_points = []
        
        for data_type in ['surface_points', 'orientations']:
            df = data_manager.get_data(data_type)
            if not df.empty and all(col in df.columns for col in ['x', 'y', 'z']):
                all_points.append(df[['x', 'y', 'z']].values)
                
        if all_points:
            combined_points = np.vstack(all_points)
            
            x_min, y_min, z_min = combined_points.min(axis=0)
            x_max, y_max, z_max = combined_points.max(axis=0)
            
            # 添加边界缓冲
            x_buffer = (x_max - x_min) * 0.1
            y_buffer = (y_max - y_min) * 0.1
            z_buffer = abs(z_max - z_min) * 0.1
            
            return [
                x_min - x_buffer, x_max + x_buffer,
                y_min - y_buffer, y_max + y_buffer,
                z_min - z_buffer, z_max + z_buffer
            ]
        else:
            # 默认范围
            return [0, 1000, 0, 1000, -1000, 0]
            
    @staticmethod
    def suggest_model_resolution(extent: List[float]) -> List[int]:
        """建议模型分辨率"""
        x_range = extent[1] - extent[0]
        y_range = extent[3] - extent[2]
        z_range = extent[5] - extent[4]
        
        # 基于范围计算合适的分辨率
        base_resolution = 50
        
        x_res = max(20, min(100, int(x_range / 20)))
        y_res = max(20, min(100, int(y_range / 20)))
        z_res = max(10, min(50, int(abs(z_range) / 50)))
        
        return [x_res, y_res, z_res]

if __name__ == "__main__":
    # 测试代码
    import sys
    from PyQt6.QtWidgets import QApplication
    
    app = QApplication(sys.argv)
    
    # 测试数据导入对话框
    dialog = DataImportDialog()
    dialog.show()
    
    sys.exit(app.exec())