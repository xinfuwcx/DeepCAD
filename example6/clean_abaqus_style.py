#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
真正的Abaqus风格样式表 - 完全照抄Abaqus CAE
Clean and professional Abaqus-style interface
"""

# 真正的Abaqus CAE配色方案 - 直接照抄
CLEAN_ABAQUS_STYLE = """
/* 全局样式 - 完全照抄Abaqus CAE */
QMainWindow, QWidget, QFrame {
    background-color: #424242;  /* Abaqus标准中灰色 */
    color: #ffffff;             /* 纯白文字 */
    font-family: 'Segoe UI';
    font-size: 8pt;
}

/* 菜单栏 */
QMenuBar {
    background-color: #424242;
    color: #ffffff;
    border: none;
}

QMenuBar::item {
    background-color: transparent;
    padding: 4px 8px;
}

QMenuBar::item:selected {
    background-color: #555555;
}

/* 工具栏 */
QToolBar {
    background-color: #424242;
    border: none;
    spacing: 2px;
    padding: 2px;
}

/* 按钮 - Abaqus标准按钮 */
QPushButton {
    background-color: #525252;  /* 稍亮的灰 */
    color: #ffffff;
    border: 1px solid #666666;
    padding: 4px 8px;
    min-height: 18px;
}

QPushButton:hover {
    background-color: #606060;
}

QPushButton:pressed {
    background-color: #404040;
}

/* 输入控件 */
QLineEdit, QSpinBox, QDoubleSpinBox {
    background-color: #525252;
    color: #ffffff;
    border: 1px solid #666666;
    padding: 2px 4px;
}

QLineEdit:focus, QSpinBox:focus, QDoubleSpinBox:focus {
    border-color: #0078d4;  /* Windows蓝色 */
}

/* 组合框 */
QComboBox {
    background-color: #525252;
    color: #ffffff;
    border: 1px solid #666666;
    padding: 2px 4px;
}

QComboBox:hover {
    background-color: #606060;
}

QComboBox::drop-down {
    background-color: #525252;
    border-left: 1px solid #666666;
    width: 16px;
}

QComboBox::down-arrow {
    image: none;
    border-left: 3px solid transparent;
    border-right: 3px solid transparent;
    border-top: 4px solid #ffffff;
}

QComboBox QAbstractItemView {
    background-color: #424242;
    selection-background-color: #0078d4;
}

/* 分组框 */
QGroupBox {
    background-color: #424242;
    color: #ffffff;
    border: 1px solid #666666;
    margin-top: 8px;
    padding-top: 4px;
}

QGroupBox::title {
    subcontrol-origin: margin;
    left: 8px;
    padding: 0 4px;
    background-color: #424242;
    color: #ffffff;
}

/* 标签页 */
QTabWidget::pane {
    background-color: #424242;
    border: 1px solid #666666;
}

QTabBar::tab {
    background-color: #525252;
    color: #ffffff;
    border: 1px solid #666666;
    padding: 4px 12px;
    margin-right: 1px;
}

QTabBar::tab:selected {
    background-color: #424242;
}

/* 滚动条 */
QScrollBar:vertical {
    background-color: #525252;
    width: 12px;
}

QScrollBar::handle:vertical {
    background-color: #666666;
    min-height: 16px;
}

QScrollBar::handle:vertical:hover {
    background-color: #777777;
}

/* 分割器 */
QSplitter::handle {
    background-color: #525252;
}

QSplitter::handle:horizontal {
    width: 4px;
}

QSplitter::handle:vertical {
    height: 4px;
}

/* 选择控件 */
QCheckBox::indicator, QRadioButton::indicator {
    width: 12px;
    height: 12px;
    background-color: #525252;
    border: 1px solid #666666;
}

QCheckBox::indicator:checked, QRadioButton::indicator:checked {
    background-color: #0078d4;
}

/* 表格 */
QTableWidget {
    background-color: #424242;
    gridline-color: #666666;
    selection-background-color: #0078d4;
    color: #ffffff;
}

QHeaderView::section {
    background-color: #525252;
    color: #ffffff;
    border: 1px solid #666666;
    padding: 4px;
}

/* 状态栏 */
QStatusBar {
    background-color: #525252;
    color: #ffffff;
    border-top: 1px solid #666666;
}

/* 进度条 */
QProgressBar {
    background-color: #525252;
    color: #ffffff;
    border: 1px solid #666666;
    text-align: center;
    height: 16px;
}

QProgressBar::chunk {
    background-color: #0078d4;
}
"""