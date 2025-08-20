#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
材料库管理界面
提供图形化的材料参数编辑功能
"""

from PyQt6.QtWidgets import *
from PyQt6.QtCore import Qt, pyqtSignal
from PyQt6.QtGui import QFont
import json
from pathlib import Path
from typing import Dict, List, Any

class MaterialManagerDialog(QDialog):
    """材料库管理对话框"""
    
    materials_updated = pyqtSignal(dict)  # 材料更新信号
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("材料库管理")
        self.setModal(True)
        self.resize(800, 600)
        
        # 默认材料库
        self.materials = {
            "基坑工程土体": {
                "type": "土体",
                "density": 1900.0,
                "young_modulus": 25e6,
                "poisson_ratio": 0.3,
                "cohesion": 35000.0,
                "friction_angle": 28.0,
                "dilatancy_angle": 8.0,
                "yield_stress_tension": 500000.0,
                "yield_stress_compression": 8000000.0
            },
            "C30混凝土": {
                "type": "混凝土", 
                "density": 2400.0,
                "young_modulus": 30e9,
                "poisson_ratio": 0.2,
                "compressive_strength": 20.1e6,
                "tensile_strength": 2.01e6
            },
            "Q235钢材": {
                "type": "钢材",
                "density": 7850.0,
                "young_modulus": 206e9,
                "poisson_ratio": 0.3,
                "yield_strength": 235e6
            }
        }
        
        self.setup_ui()
        self.load_material_library()
        
    def setup_ui(self):
        """设置界面"""
        layout = QHBoxLayout(self)
        
        # 左侧材料列表
        left_panel = self.create_material_list()
        left_panel.setMaximumWidth(250)
        layout.addWidget(left_panel)
        
        # 右侧参数编辑
        right_panel = self.create_parameter_editor()
        layout.addWidget(right_panel)
        
        # 底部按钮
        button_layout = QHBoxLayout()
        
        self.save_btn = QPushButton("💾 保存材料库")
        self.load_btn = QPushButton("📂 加载材料库")
        self.apply_btn = QPushButton("✅ 应用到分析")
        self.cancel_btn = QPushButton("❌ 取消")
        
        for btn in [self.save_btn, self.load_btn, self.apply_btn, self.cancel_btn]:
            button_layout.addWidget(btn)
            
        main_layout = QVBoxLayout()
        main_layout.addLayout(layout)
        main_layout.addLayout(button_layout)
        
        widget = QWidget()
        widget.setLayout(main_layout)
        
        scroll = QScrollArea()
        scroll.setWidget(widget)
        scroll.setWidgetResizable(True)
        
        final_layout = QVBoxLayout(self)
        final_layout.addWidget(scroll)
        
        # 连接信号
        self.connect_signals()
        
    def create_material_list(self):
        """创建材料列表面板"""
        panel = QGroupBox("📋 材料库")
        panel.setFont(QFont("Microsoft YaHei", 10, QFont.Weight.Bold))
        layout = QVBoxLayout(panel)
        
        # 材料列表
        self.material_list = QListWidget()
        layout.addWidget(self.material_list)
        
        # 操作按钮
        btn_layout = QHBoxLayout()
        self.add_material_btn = QPushButton("➕ 新增")
        self.copy_material_btn = QPushButton("📋 复制")  
        self.delete_material_btn = QPushButton("🗑️ 删除")
        
        for btn in [self.add_material_btn, self.copy_material_btn, self.delete_material_btn]:
            btn.setMaximumHeight(30)
            btn_layout.addWidget(btn)
            
        layout.addLayout(btn_layout)
        
        return panel
        
    def create_parameter_editor(self):
        """创建参数编辑面板"""
        panel = QGroupBox("⚙️ 材料参数")
        panel.setFont(QFont("Microsoft YaHei", 10, QFont.Weight.Bold))
        layout = QVBoxLayout(panel)
        
        # 材料基本信息
        info_group = QGroupBox("基本信息")
        info_layout = QFormLayout(info_group)
        
        self.name_edit = QLineEdit()
        self.type_combo = QComboBox()
        self.type_combo.addItems(["土体", "混凝土", "钢材", "其他"])
        
        info_layout.addRow("材料名称:", self.name_edit)
        info_layout.addRow("材料类型:", self.type_combo)
        
        layout.addWidget(info_group)
        
        # 物理参数
        physical_group = QGroupBox("物理参数")
        physical_layout = QFormLayout(physical_group)
        
        self.density_edit = QDoubleSpinBox()
        self.density_edit.setRange(0, 10000)
        self.density_edit.setSuffix(" kg/m³")
        
        self.young_edit = QDoubleSpinBox()
        self.young_edit.setRange(0, 1e12)
        self.young_edit.setSuffix(" Pa")
        self.young_edit.setDecimals(0)
        
        self.poisson_edit = QDoubleSpinBox()
        self.poisson_edit.setRange(0, 0.5)
        self.poisson_edit.setDecimals(3)
        
        physical_layout.addRow("密度:", self.density_edit)
        physical_layout.addRow("弹性模量:", self.young_edit)
        physical_layout.addRow("泊松比:", self.poisson_edit)
        
        layout.addWidget(physical_group)
        
        # 强度参数（土体）
        self.soil_group = QGroupBox("强度参数（摩尔-库伦）")
        soil_layout = QFormLayout(self.soil_group)
        
        self.cohesion_edit = QDoubleSpinBox()
        self.cohesion_edit.setRange(0, 1e8)
        self.cohesion_edit.setSuffix(" Pa")
        
        self.friction_edit = QDoubleSpinBox()
        self.friction_edit.setRange(0, 90)
        self.friction_edit.setSuffix(" °")
        
        self.dilatancy_edit = QDoubleSpinBox()
        self.dilatancy_edit.setRange(0, 45)
        self.dilatancy_edit.setSuffix(" °")
        
        self.tension_edit = QDoubleSpinBox()
        self.tension_edit.setRange(0, 1e8)
        self.tension_edit.setSuffix(" Pa")
        
        self.compression_edit = QDoubleSpinBox()
        self.compression_edit.setRange(0, 1e8)
        self.compression_edit.setSuffix(" Pa")
        
        soil_layout.addRow("粘聚力:", self.cohesion_edit)
        soil_layout.addRow("内摩擦角:", self.friction_edit)
        soil_layout.addRow("剪胀角:", self.dilatancy_edit)
        soil_layout.addRow("抗拉强度:", self.tension_edit)
        soil_layout.addRow("抗压强度:", self.compression_edit)
        
        layout.addWidget(self.soil_group)
        
        # 强度参数（混凝土）
        self.concrete_group = QGroupBox("强度参数（混凝土）")
        concrete_layout = QFormLayout(self.concrete_group)
        
        self.comp_strength_edit = QDoubleSpinBox()
        self.comp_strength_edit.setRange(0, 1e8)
        self.comp_strength_edit.setSuffix(" Pa")
        
        self.tens_strength_edit = QDoubleSpinBox()
        self.tens_strength_edit.setRange(0, 1e8)
        self.tens_strength_edit.setSuffix(" Pa")
        
        concrete_layout.addRow("抗压强度:", self.comp_strength_edit)
        concrete_layout.addRow("抗拉强度:", self.tens_strength_edit)
        
        layout.addWidget(self.concrete_group)
        
        # 强度参数（钢材）
        self.steel_group = QGroupBox("强度参数（钢材）")
        steel_layout = QFormLayout(self.steel_group)
        
        self.yield_strength_edit = QDoubleSpinBox()
        self.yield_strength_edit.setRange(0, 1e9)
        self.yield_strength_edit.setSuffix(" Pa")
        
        steel_layout.addRow("屈服强度:", self.yield_strength_edit)
        
        layout.addWidget(self.steel_group)
        
        return panel
        
    def connect_signals(self):
        """连接信号"""
        self.material_list.currentItemChanged.connect(self.on_material_selected)
        self.type_combo.currentTextChanged.connect(self.on_type_changed)
        
        self.add_material_btn.clicked.connect(self.add_material)
        self.copy_material_btn.clicked.connect(self.copy_material)
        self.delete_material_btn.clicked.connect(self.delete_material)
        
        self.save_btn.clicked.connect(self.save_material_library)
        self.load_btn.clicked.connect(self.load_material_library_file)
        self.apply_btn.clicked.connect(self.apply_materials)
        self.cancel_btn.clicked.connect(self.reject)
        
    def refresh_material_list(self):
        """刷新材料列表"""
        self.material_list.clear()
        for name in self.materials.keys():
            self.material_list.addItem(name)
            
    def on_material_selected(self, current, previous):
        """材料选择改变"""
        if current is None:
            return
            
        name = current.text()
        if name in self.materials:
            self.load_material_to_editor(name, self.materials[name])
            
    def on_type_changed(self, material_type):
        """材料类型改变"""
        self.soil_group.setVisible(material_type == "土体")
        self.concrete_group.setVisible(material_type == "混凝土")
        self.steel_group.setVisible(material_type == "钢材")
        
    def load_material_to_editor(self, name: str, material: dict):
        """加载材料到编辑器"""
        self.name_edit.setText(name)
        
        mat_type = material.get("type", "土体")
        index = self.type_combo.findText(mat_type)
        if index >= 0:
            self.type_combo.setCurrentIndex(index)
            
        # 基本物理参数
        self.density_edit.setValue(material.get("density", 0))
        self.young_edit.setValue(material.get("young_modulus", 0))
        self.poisson_edit.setValue(material.get("poisson_ratio", 0))
        
        # 土体参数
        if mat_type == "土体":
            self.cohesion_edit.setValue(material.get("cohesion", 0))
            self.friction_edit.setValue(material.get("friction_angle", 0))
            self.dilatancy_edit.setValue(material.get("dilatancy_angle", 0))
            self.tension_edit.setValue(material.get("yield_stress_tension", 0))
            self.compression_edit.setValue(material.get("yield_stress_compression", 0))
            
        # 混凝土参数
        elif mat_type == "混凝土":
            self.comp_strength_edit.setValue(material.get("compressive_strength", 0))
            self.tens_strength_edit.setValue(material.get("tensile_strength", 0))
            
        # 钢材参数
        elif mat_type == "钢材":
            self.yield_strength_edit.setValue(material.get("yield_strength", 0))
            
    def save_current_material(self):
        """保存当前编辑的材料"""
        name = self.name_edit.text().strip()
        if not name:
            return
            
        material = {
            "type": self.type_combo.currentText(),
            "density": self.density_edit.value(),
            "young_modulus": self.young_edit.value(),
            "poisson_ratio": self.poisson_edit.value()
        }
        
        mat_type = material["type"]
        
        if mat_type == "土体":
            material.update({
                "cohesion": self.cohesion_edit.value(),
                "friction_angle": self.friction_edit.value(),
                "dilatancy_angle": self.dilatancy_edit.value(),
                "yield_stress_tension": self.tension_edit.value(),
                "yield_stress_compression": self.compression_edit.value()
            })
        elif mat_type == "混凝土":
            material.update({
                "compressive_strength": self.comp_strength_edit.value(),
                "tensile_strength": self.tens_strength_edit.value()
            })
        elif mat_type == "钢材":
            material.update({
                "yield_strength": self.yield_strength_edit.value()
            })
            
        self.materials[name] = material
        self.refresh_material_list()
        
    def add_material(self):
        """添加新材料"""
        name, ok = QInputDialog.getText(self, "新增材料", "请输入材料名称:")
        if ok and name.strip():
            if name in self.materials:
                QMessageBox.warning(self, "警告", "材料名称已存在！")
                return
                
            self.materials[name] = {
                "type": "土体",
                "density": 1900.0,
                "young_modulus": 25e6,
                "poisson_ratio": 0.3
            }
            self.refresh_material_list()
            
            # 选择新添加的材料
            items = self.material_list.findItems(name, Qt.MatchFlag.MatchExactly)
            if items:
                self.material_list.setCurrentItem(items[0])
                
    def copy_material(self):
        """复制材料"""
        current = self.material_list.currentItem()
        if current is None:
            QMessageBox.warning(self, "警告", "请先选择要复制的材料！")
            return
            
        source_name = current.text()
        name, ok = QInputDialog.getText(self, "复制材料", f"复制 '{source_name}' 为:", text=f"{source_name}_副本")
        
        if ok and name.strip():
            if name in self.materials:
                QMessageBox.warning(self, "警告", "材料名称已存在！")
                return
                
            self.materials[name] = self.materials[source_name].copy()
            self.refresh_material_list()
            
    def delete_material(self):
        """删除材料"""
        current = self.material_list.currentItem()
        if current is None:
            QMessageBox.warning(self, "警告", "请先选择要删除的材料！")
            return
            
        name = current.text()
        reply = QMessageBox.question(self, "确认删除", f"确定要删除材料 '{name}' 吗？")
        
        if reply == QMessageBox.StandardButton.Yes:
            del self.materials[name]
            self.refresh_material_list()
            
    def save_material_library(self):
        """保存材料库到文件"""
        file_path, _ = QFileDialog.getSaveFileName(
            self, "保存材料库", "materials.json", "JSON文件 (*.json)"
        )
        
        if file_path:
            try:
                self.save_current_material()  # 保存当前编辑的材料
                with open(file_path, 'w', encoding='utf-8') as f:
                    json.dump(self.materials, f, ensure_ascii=False, indent=2)
                QMessageBox.information(self, "成功", "材料库保存成功！")
            except Exception as e:
                QMessageBox.critical(self, "错误", f"保存失败: {e}")
                
    def load_material_library_file(self):
        """从文件加载材料库"""
        file_path, _ = QFileDialog.getOpenFileName(
            self, "加载材料库", "", "JSON文件 (*.json)"
        )
        
        if file_path:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    self.materials = json.load(f)
                self.refresh_material_list()
                QMessageBox.information(self, "成功", "材料库加载成功！")
            except Exception as e:
                QMessageBox.critical(self, "错误", f"加载失败: {e}")
                
    def load_material_library(self):
        """加载默认材料库"""
        self.refresh_material_list()
        if self.materials:
            self.material_list.setCurrentRow(0)
            
    def apply_materials(self):
        """应用材料到分析"""
        self.save_current_material()  # 保存当前编辑的材料
        self.materials_updated.emit(self.materials)
        self.accept()

if __name__ == "__main__":
    import sys
    app = QApplication(sys.argv)
    dialog = MaterialManagerDialog()
    dialog.show()
    sys.exit(app.exec())