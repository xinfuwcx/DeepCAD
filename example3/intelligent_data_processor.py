"""
Intelligent Data Processor - 智能数据预处理系统
Advanced data preprocessing and validation for geological modeling
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Any, Tuple, Optional, Union
from dataclasses import dataclass
from enum import Enum
import warnings
from scipy import stats
from scipy.spatial import ConvexHull, Delaunay
from scipy.interpolate import griddata
from sklearn.preprocessing import StandardScaler, RobustScaler
from sklearn.cluster import DBSCAN
from sklearn.neighbors import NearestNeighbors

from PyQt6.QtCore import QObject, pyqtSignal, QThread, QTimer
from PyQt6.QtWidgets import (QWidget, QVBoxLayout, QHBoxLayout, QGridLayout, 
                           QLabel, QPushButton, QProgressBar, QTextEdit, 
                           QComboBox, QSpinBox, QDoubleSpinBox, QCheckBox,
                           QGroupBox, QTabWidget, QTableWidget, QTableWidgetItem)
from PyQt6.QtGui import QFont, QColor
from PyQt6.QtCore import Qt


class DataQualityLevel(Enum):
    """数据质量等级"""
    EXCELLENT = "excellent"
    GOOD = "good"
    FAIR = "fair"
    POOR = "poor"
    CRITICAL = "critical"


class DataIssueType(Enum):
    """数据问题类型"""
    MISSING_VALUES = "missing_values"
    OUTLIERS = "outliers"
    DUPLICATES = "duplicates"
    INCONSISTENT_FORMAT = "inconsistent_format"
    SPATIAL_GAPS = "spatial_gaps"
    COORDINATE_ISSUES = "coordinate_issues"
    FORMATION_MISMATCHES = "formation_mismatches"


@dataclass
class DataIssue:
    """数据问题"""
    issue_type: DataIssueType
    description: str
    affected_rows: List[int]
    severity: str  # low, medium, high, critical
    suggestion: str
    auto_fixable: bool = False


@dataclass
class DataQualityReport:
    """数据质量报告"""
    overall_quality: DataQualityLevel
    total_records: int
    issues: List[DataIssue]
    statistics: Dict[str, Any]
    recommendations: List[str]


class GeologicalDataValidator:
    """地质数据验证器"""
    
    def __init__(self):
        self.coordinate_columns = ['X', 'Y', 'Z', 'x', 'y', 'z']
        self.formation_columns = ['formation', 'Formation', 'FORMATION', 'lithology', 'unit']
        self.orientation_columns = ['azimuth', 'dip', 'polarity', 'strike', 'dip_direction']
        
    def validate_data(self, data: pd.DataFrame) -> DataQualityReport:
        """验证数据质量"""
        issues = []
        statistics = {}
        
        # 基本统计
        statistics['total_rows'] = len(data)
        statistics['total_columns'] = len(data.columns)
        statistics['memory_usage'] = data.memory_usage(deep=True).sum()
        
        # 检查缺失值
        missing_issues = self._check_missing_values(data)
        issues.extend(missing_issues)
        
        # 检查重复值
        duplicate_issues = self._check_duplicates(data)
        issues.extend(duplicate_issues)
        
        # 检查坐标有效性
        coordinate_issues = self._check_coordinates(data)
        issues.extend(coordinate_issues)
        
        # 检查地层信息
        formation_issues = self._check_formations(data)
        issues.extend(formation_issues)
        
        # 检查异常值
        outlier_issues = self._check_outliers(data)
        issues.extend(outlier_issues)
        
        # 检查空间分布
        spatial_issues = self._check_spatial_distribution(data)
        issues.extend(spatial_issues)
        
        # 计算整体质量等级
        overall_quality = self._calculate_overall_quality(issues)
        
        # 生成建议
        recommendations = self._generate_recommendations(issues)
        
        return DataQualityReport(
            overall_quality=overall_quality,
            total_records=len(data),
            issues=issues,
            statistics=statistics,
            recommendations=recommendations
        )
    
    def _check_missing_values(self, data: pd.DataFrame) -> List[DataIssue]:
        """检查缺失值"""
        issues = []
        
        for column in data.columns:
            missing_count = data[column].isnull().sum()
            missing_percentage = (missing_count / len(data)) * 100
            
            if missing_count > 0:
                severity = "low"
                if missing_percentage > 50:
                    severity = "critical"
                elif missing_percentage > 20:
                    severity = "high"
                elif missing_percentage > 5:
                    severity = "medium"
                
                missing_rows = data[data[column].isnull()].index.tolist()
                
                issue = DataIssue(
                    issue_type=DataIssueType.MISSING_VALUES,
                    description=f"Column '{column}' has {missing_count} missing values ({missing_percentage:.1f}%)",
                    affected_rows=missing_rows,
                    severity=severity,
                    suggestion=f"Consider interpolation, imputation, or removal of rows with missing {column}",
                    auto_fixable=True if severity in ["low", "medium"] else False
                )
                issues.append(issue)
        
        return issues
    
    def _check_duplicates(self, data: pd.DataFrame) -> List[DataIssue]:
        """检查重复值"""
        issues = []
        
        # 检查完全重复的行
        duplicate_rows = data.duplicated()
        if duplicate_rows.sum() > 0:
            duplicate_indices = data[duplicate_rows].index.tolist()
            
            issue = DataIssue(
                issue_type=DataIssueType.DUPLICATES,
                description=f"Found {duplicate_rows.sum()} completely duplicate rows",
                affected_rows=duplicate_indices,
                severity="medium",
                suggestion="Remove duplicate rows to avoid bias in modeling",
                auto_fixable=True
            )
            issues.append(issue)
        
        # 检查坐标重复
        coord_cols = [col for col in self.coordinate_columns if col in data.columns]
        if len(coord_cols) >= 2:
            coord_duplicates = data.duplicated(subset=coord_cols)
            if coord_duplicates.sum() > 0:
                coord_duplicate_indices = data[coord_duplicates].index.tolist()
                
                issue = DataIssue(
                    issue_type=DataIssueType.DUPLICATES,
                    description=f"Found {coord_duplicates.sum()} rows with duplicate coordinates",
                    affected_rows=coord_duplicate_indices,
                    severity="high",
                    suggestion="Review and consolidate data points at same location",
                    auto_fixable=False
                )
                issues.append(issue)
        
        return issues
    
    def _check_coordinates(self, data: pd.DataFrame) -> List[DataIssue]:
        """检查坐标有效性"""
        issues = []
        
        coord_cols = [col for col in self.coordinate_columns if col in data.columns]
        
        for col in coord_cols:
            if col in data.columns:
                # 检查坐标范围
                col_data = data[col].dropna()
                
                if len(col_data) == 0:
                    continue
                
                # 检查异常坐标值
                q1, q3 = col_data.quantile(0.25), col_data.quantile(0.75)
                iqr = q3 - q1
                lower_bound = q1 - 3 * iqr
                upper_bound = q3 + 3 * iqr
                
                outliers = data[(data[col] < lower_bound) | (data[col] > upper_bound)]
                
                if len(outliers) > 0:
                    issue = DataIssue(
                        issue_type=DataIssueType.COORDINATE_ISSUES,
                        description=f"Found {len(outliers)} potential coordinate outliers in {col}",
                        affected_rows=outliers.index.tolist(),
                        severity="medium",
                        suggestion=f"Review coordinate values for {col} outside range [{lower_bound:.1f}, {upper_bound:.1f}]",
                        auto_fixable=False
                    )
                    issues.append(issue)
        
        return issues
    
    def _check_formations(self, data: pd.DataFrame) -> List[DataIssue]:
        """检查地层信息"""
        issues = []
        
        formation_cols = [col for col in self.formation_columns if col in data.columns]
        
        for col in formation_cols:
            formation_data = data[col].dropna()
            
            if len(formation_data) == 0:
                continue
            
            # 检查地层名称一致性
            unique_formations = formation_data.unique()
            
            # 检查可能的拼写错误或格式不一致
            formation_groups = {}
            for formation in unique_formations:
                key = str(formation).lower().strip()
                if key not in formation_groups:
                    formation_groups[key] = []
                formation_groups[key].append(formation)
            
            inconsistent_formations = []
            for key, formations in formation_groups.items():
                if len(formations) > 1:
                    inconsistent_formations.extend(formations)
            
            if inconsistent_formations:
                affected_rows = data[data[col].isin(inconsistent_formations)].index.tolist()
                
                issue = DataIssue(
                    issue_type=DataIssueType.FORMATION_MISMATCHES,
                    description=f"Found inconsistent formation names: {inconsistent_formations}",
                    affected_rows=affected_rows,
                    severity="medium",
                    suggestion="Standardize formation naming convention",
                    auto_fixable=True
                )
                issues.append(issue)
        
        return issues
    
    def _check_outliers(self, data: pd.DataFrame) -> List[DataIssue]:
        """检查异常值"""
        issues = []
        
        numeric_columns = data.select_dtypes(include=[np.number]).columns
        
        for col in numeric_columns:
            col_data = data[col].dropna()
            
            if len(col_data) < 10:  # 数据太少无法检测异常值
                continue
            
            # 使用IQR方法检测异常值
            q1, q3 = col_data.quantile(0.25), col_data.quantile(0.75)
            iqr = q3 - q1
            lower_bound = q1 - 1.5 * iqr
            upper_bound = q3 + 1.5 * iqr
            
            outliers = data[(data[col] < lower_bound) | (data[col] > upper_bound)]
            
            if len(outliers) > 0:
                outlier_percentage = (len(outliers) / len(data)) * 100
                
                severity = "low"
                if outlier_percentage > 10:
                    severity = "high"
                elif outlier_percentage > 5:
                    severity = "medium"
                
                issue = DataIssue(
                    issue_type=DataIssueType.OUTLIERS,
                    description=f"Found {len(outliers)} outliers in {col} ({outlier_percentage:.1f}%)",
                    affected_rows=outliers.index.tolist(),
                    severity=severity,
                    suggestion=f"Review outlier values in {col} outside range [{lower_bound:.2f}, {upper_bound:.2f}]",
                    auto_fixable=False
                )
                issues.append(issue)
        
        return issues
    
    def _check_spatial_distribution(self, data: pd.DataFrame) -> List[DataIssue]:
        """检查空间分布"""
        issues = []
        
        coord_cols = [col for col in ['X', 'Y', 'Z', 'x', 'y', 'z'] if col in data.columns]
        
        if len(coord_cols) >= 2:
            # 检查数据点空间聚集度
            coords = data[coord_cols[:2]].dropna()
            
            if len(coords) > 10:
                # 使用DBSCAN检测聚集
                scaler = StandardScaler()
                coords_scaled = scaler.fit_transform(coords)
                
                db = DBSCAN(eps=0.5, min_samples=5).fit(coords_scaled)
                labels = db.labels_
                
                n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
                n_noise = list(labels).count(-1)
                
                if n_noise > len(coords) * 0.2:  # 超过20%的点被认为是噪声
                    issue = DataIssue(
                        issue_type=DataIssueType.SPATIAL_GAPS,
                        description=f"Spatial distribution shows {n_noise} isolated points ({n_noise/len(coords)*100:.1f}%)",
                        affected_rows=coords.index[labels == -1].tolist(),
                        severity="medium",
                        suggestion="Consider adding more data points to fill spatial gaps",
                        auto_fixable=False
                    )
                    issues.append(issue)
        
        return issues
    
    def _calculate_overall_quality(self, issues: List[DataIssue]) -> DataQualityLevel:
        """计算整体数据质量等级"""
        if not issues:
            return DataQualityLevel.EXCELLENT
        
        critical_count = sum(1 for issue in issues if issue.severity == "critical")
        high_count = sum(1 for issue in issues if issue.severity == "high")
        medium_count = sum(1 for issue in issues if issue.severity == "medium")
        
        if critical_count > 0:
            return DataQualityLevel.CRITICAL
        elif high_count > 2:
            return DataQualityLevel.POOR
        elif high_count > 0 or medium_count > 3:
            return DataQualityLevel.FAIR
        elif medium_count > 0:
            return DataQualityLevel.GOOD
        else:
            return DataQualityLevel.EXCELLENT
    
    def _generate_recommendations(self, issues: List[DataIssue]) -> List[str]:
        """生成数据改进建议"""
        recommendations = []
        
        # 按问题类型分组建议
        issue_types = set(issue.issue_type for issue in issues)
        
        if DataIssueType.MISSING_VALUES in issue_types:
            recommendations.append("Consider data imputation techniques or collect additional measurements")
        
        if DataIssueType.OUTLIERS in issue_types:
            recommendations.append("Verify outlier values through field validation or measurement review")
        
        if DataIssueType.DUPLICATES in issue_types:
            recommendations.append("Remove duplicate entries to improve model accuracy")
        
        if DataIssueType.SPATIAL_GAPS in issue_types:
            recommendations.append("Add sampling points in areas with sparse data coverage")
        
        if DataIssueType.COORDINATE_ISSUES in issue_types:
            recommendations.append("Verify coordinate system and measurement accuracy")
        
        if DataIssueType.FORMATION_MISMATCHES in issue_types:
            recommendations.append("Standardize geological formation naming conventions")
        
        if not recommendations:
            recommendations.append("Data quality is good. Consider advanced preprocessing for optimization")
        
        return recommendations


class IntelligentDataProcessor(QObject):
    """智能数据处理器"""
    
    progress_updated = pyqtSignal(int, str)
    processing_completed = pyqtSignal(object)  # DataQualityReport
    error_occurred = pyqtSignal(str)
    
    def __init__(self):
        super().__init__()
        self.validator = GeologicalDataValidator()
        self.data = None
        self.processed_data = None
        self.quality_report = None
    
    def process_data(self, data: pd.DataFrame, auto_fix: bool = True) -> pd.DataFrame:
        """处理数据"""
        self.data = data.copy()
        self.progress_updated.emit(0, "Starting data processing...")
        
        try:
            # 第1步：数据验证
            self.progress_updated.emit(20, "Validating data quality...")
            self.quality_report = self.validator.validate_data(self.data)
            
            # 第2步：自动修复
            if auto_fix:
                self.progress_updated.emit(40, "Applying automatic fixes...")
                self.processed_data = self._apply_auto_fixes(self.data, self.quality_report.issues)
            else:
                self.processed_data = self.data.copy()
            
            # 第3步：数据标准化
            self.progress_updated.emit(60, "Standardizing data format...")
            self.processed_data = self._standardize_data(self.processed_data)
            
            # 第4步：空间插值填充
            self.progress_updated.emit(80, "Filling spatial gaps...")
            self.processed_data = self._fill_spatial_gaps(self.processed_data)
            
            # 第5步：最终验证
            self.progress_updated.emit(90, "Final validation...")
            final_report = self.validator.validate_data(self.processed_data)
            
            self.progress_updated.emit(100, "Processing completed!")
            self.processing_completed.emit(final_report)
            
            return self.processed_data
            
        except Exception as e:
            self.error_occurred.emit(f"Data processing failed: {str(e)}")
            raise
    
    def _apply_auto_fixes(self, data: pd.DataFrame, issues: List[DataIssue]) -> pd.DataFrame:
        """应用自动修复"""
        fixed_data = data.copy()
        
        for issue in issues:
            if not issue.auto_fixable:
                continue
            
            if issue.issue_type == DataIssueType.DUPLICATES:
                if "completely duplicate" in issue.description:
                    fixed_data = fixed_data.drop_duplicates()
                    
            elif issue.issue_type == DataIssueType.FORMATION_MISMATCHES:
                # 简单的地层名称标准化
                formation_cols = [col for col in self.validator.formation_columns if col in fixed_data.columns]
                for col in formation_cols:
                    fixed_data[col] = fixed_data[col].str.strip().str.title()
                    
            elif issue.issue_type == DataIssueType.MISSING_VALUES:
                # 对于数值列，使用中位数填充
                for col in fixed_data.select_dtypes(include=[np.number]).columns:
                    if fixed_data[col].isnull().sum() > 0:
                        median_val = fixed_data[col].median()
                        fixed_data[col].fillna(median_val, inplace=True)
        
        return fixed_data
    
    def _standardize_data(self, data: pd.DataFrame) -> pd.DataFrame:
        """标准化数据格式"""
        standardized_data = data.copy()
        
        # 标准化坐标列名
        coord_mapping = {
            'x': 'X', 'y': 'Y', 'z': 'Z',
            'lon': 'X', 'lat': 'Y', 'elevation': 'Z',
            'longitude': 'X', 'latitude': 'Y', 'altitude': 'Z'
        }
        
        for old_name, new_name in coord_mapping.items():
            if old_name in standardized_data.columns and new_name not in standardized_data.columns:
                standardized_data.rename(columns={old_name: new_name}, inplace=True)
        
        # 标准化地层列名
        formation_mapping = {
            'lithology': 'Formation',
            'unit': 'Formation',
            'formation': 'Formation',
            'FORMATION': 'Formation'
        }
        
        for old_name, new_name in formation_mapping.items():
            if old_name in standardized_data.columns and new_name not in standardized_data.columns:
                standardized_data.rename(columns={old_name: new_name}, inplace=True)
        
        return standardized_data
    
    def _fill_spatial_gaps(self, data: pd.DataFrame) -> pd.DataFrame:
        """填充空间间隙"""
        filled_data = data.copy()
        
        # 检查是否有足够的坐标信息
        coord_cols = [col for col in ['X', 'Y', 'Z'] if col in filled_data.columns]
        
        if len(coord_cols) >= 2:
            # 对于地层信息，使用最近邻插值
            if 'Formation' in filled_data.columns:
                coords = filled_data[coord_cols].values
                formations = filled_data['Formation'].values
                
                # 找到缺失地层信息的点
                missing_mask = pd.isnull(filled_data['Formation'])
                
                if missing_mask.sum() > 0 and (~missing_mask).sum() > 0:
                    known_coords = coords[~missing_mask]
                    known_formations = formations[~missing_mask]
                    missing_coords = coords[missing_mask]
                    
                    if len(known_coords) > 0 and len(missing_coords) > 0:
                        # 使用最近邻
                        nbrs = NearestNeighbors(n_neighbors=1).fit(known_coords)
                        _, indices = nbrs.kneighbors(missing_coords)
                        
                        filled_formations = known_formations[indices.flatten()]
                        filled_data.loc[missing_mask, 'Formation'] = filled_formations
        
        return filled_data


class DataProcessorWidget(QWidget):
    """数据处理器界面组件"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.processor = IntelligentDataProcessor()
        self.data = None
        self.quality_report = None
        self.setup_ui()
        self.connect_signals()
        
    def setup_ui(self):
        """设置界面"""
        layout = QVBoxLayout(self)
        
        # 标题
        title = QLabel("🧠 Intelligent Data Processor")
        title.setStyleSheet("""
            QLabel {
                font-size: 16pt;
                font-weight: 700;
                color: #3b82f6;
                padding: 15px;
                background: qlineargradient(x1:0, y1:0, x2:1, y2:0,
                    stop:0 rgba(59, 130, 246, 0.1),
                    stop:1 rgba(59, 130, 246, 0.05));
                border-radius: 10px;
                margin-bottom: 10px;
            }
        """)
        layout.addWidget(title)
        
        # 选项区域
        options_group = QGroupBox("Processing Options")
        options_group.setStyleSheet("""
            QGroupBox {
                font-weight: 700;
                color: #e5e7eb;
                border: 2px solid #374151;
                border-radius: 8px;
                margin-top: 10px;
                padding-top: 10px;
            }
            QGroupBox::title {
                subcontrol-origin: margin;
                left: 10px;
                padding: 0 10px 0 10px;
                background: rgba(55, 65, 81, 0.8);
            }
        """)
        
        options_layout = QGridLayout(options_group)
        
        # 自动修复选项
        self.auto_fix_check = QCheckBox("Auto-fix Issues")
        self.auto_fix_check.setChecked(True)
        self.auto_fix_check.setStyleSheet("""
            QCheckBox {
                color: #e5e7eb;
                font-weight: 600;
            }
            QCheckBox::indicator {
                width: 18px;
                height: 18px;
            }
            QCheckBox::indicator:checked {
                background: #10b981;
                border: 2px solid #059669;
            }
        """)
        
        # 处理级别
        level_label = QLabel("Processing Level:")
        level_label.setStyleSheet("color: #e5e7eb; font-weight: 600;")
        
        self.level_combo = QComboBox()
        self.level_combo.addItems(["Basic", "Standard", "Advanced", "Professional"])
        self.level_combo.setCurrentText("Standard")
        self.level_combo.setStyleSheet("""
            QComboBox {
                background: rgba(51, 65, 85, 0.9);
                border: 2px solid #6b7280;
                border-radius: 6px;
                color: #e5e7eb;
                padding: 6px;
                font-weight: 600;
            }
        """)
        
        options_layout.addWidget(self.auto_fix_check, 0, 0, 1, 2)
        options_layout.addWidget(level_label, 1, 0)
        options_layout.addWidget(self.level_combo, 1, 1)
        
        layout.addWidget(options_group)
        
        # 控制按钮
        button_layout = QHBoxLayout()
        
        self.process_btn = QPushButton("🔄 Process Data")
        self.process_btn.setStyleSheet("""
            QPushButton {
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                    stop:0 rgba(16, 185, 129, 0.9),
                    stop:1 rgba(5, 150, 105, 0.9));
                border: 2px solid #10b981;
                border-radius: 8px;
                color: white;
                font-weight: 700;
                font-size: 11pt;
                padding: 12px 24px;
                min-width: 150px;
            }
            QPushButton:hover {
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                    stop:0 rgba(16, 205, 149, 0.9),
                    stop:1 rgba(5, 170, 125, 0.9));
            }
            QPushButton:disabled {
                background: rgba(107, 114, 128, 0.5);
                border: 2px solid #6b7280;
                color: #9ca3af;
            }
        """)
        
        self.export_btn = QPushButton("💾 Export Results")
        self.export_btn.setStyleSheet("""
            QPushButton {
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                    stop:0 rgba(59, 130, 246, 0.9),
                    stop:1 rgba(30, 64, 175, 0.9));
                border: 2px solid #3b82f6;
                border-radius: 8px;
                color: white;
                font-weight: 700;
                font-size: 11pt;
                padding: 12px 24px;
                min-width: 150px;
            }
            QPushButton:hover {
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                    stop:0 rgba(79, 150, 255, 0.9),
                    stop:1 rgba(50, 84, 195, 0.9));
            }
            QPushButton:disabled {
                background: rgba(107, 114, 128, 0.5);
                border: 2px solid #6b7280;
                color: #9ca3af;
            }
        """)
        self.export_btn.setEnabled(False)
        
        button_layout.addWidget(self.process_btn)
        button_layout.addWidget(self.export_btn)
        button_layout.addStretch()
        
        layout.addLayout(button_layout)
        
        # 进度条
        self.progress_bar = QProgressBar()
        self.progress_bar.setStyleSheet("""
            QProgressBar {
                background: rgba(51, 65, 85, 0.8);
                border: 2px solid #374151;
                border-radius: 10px;
                text-align: center;
                color: white;
                font-weight: 600;
                font-size: 10pt;
                padding: 2px;
            }
            QProgressBar::chunk {
                background: qlineargradient(x1:0, y1:0, x2:1, y2:0,
                    stop:0 #3b82f6, stop:1 #1d4ed8);
                border-radius: 8px;
            }
        """)
        self.progress_bar.hide()
        layout.addWidget(self.progress_bar)
        
        # 结果显示区域
        self.results_tabs = QTabWidget()
        self.results_tabs.setStyleSheet("""
            QTabWidget::pane {
                border: 2px solid #374151;
                border-radius: 8px;
                background: rgba(30, 41, 59, 0.8);
            }
            QTabWidget::tab-bar {
                alignment: left;
            }
            QTabBar::tab {
                background: rgba(51, 65, 85, 0.8);
                border: 2px solid #4b5563;
                border-bottom: none;
                border-top-left-radius: 6px;
                border-top-right-radius: 6px;
                color: #e5e7eb;
                font-weight: 600;
                padding: 8px 16px;
                margin-right: 2px;
            }
            QTabBar::tab:selected {
                background: rgba(59, 130, 246, 0.8);
                border-color: #3b82f6;
                color: white;
            }
            QTabBar::tab:hover {
                background: rgba(75, 85, 99, 0.9);
            }
        """)
        
        # 质量报告标签页
        self.quality_tab = QWidget()
        self.setup_quality_tab()
        self.results_tabs.addTab(self.quality_tab, "📊 Quality Report")
        
        # 数据统计标签页
        self.stats_tab = QWidget()
        self.setup_stats_tab()
        self.results_tabs.addTab(self.stats_tab, "📈 Statistics")
        
        # 问题详情标签页
        self.issues_tab = QWidget()
        self.setup_issues_tab()
        self.results_tabs.addTab(self.issues_tab, "⚠️ Issues")
        
        layout.addWidget(self.results_tabs)
        
    def setup_quality_tab(self):
        """设置质量报告标签页"""
        layout = QVBoxLayout(self.quality_tab)
        
        self.quality_summary = QLabel("No data processed yet")
        self.quality_summary.setStyleSheet("""
            QLabel {
                background: rgba(51, 65, 85, 0.6);
                border: 2px solid #6b7280;
                border-radius: 8px;
                color: #e5e7eb;
                font-size: 12pt;
                font-weight: 600;
                padding: 15px;
                margin: 10px;
            }
        """)
        layout.addWidget(self.quality_summary)
        
        self.recommendations_text = QTextEdit()
        self.recommendations_text.setStyleSheet("""
            QTextEdit {
                background: rgba(30, 41, 59, 0.8);
                border: 2px solid #374151;
                border-radius: 8px;
                color: #e5e7eb;
                font-family: 'Consolas', monospace;
                font-size: 10pt;
                padding: 10px;
            }
        """)
        self.recommendations_text.setReadOnly(True)
        layout.addWidget(self.recommendations_text)
        
    def setup_stats_tab(self):
        """设置统计标签页"""
        layout = QVBoxLayout(self.stats_tab)
        
        self.stats_text = QTextEdit()
        self.stats_text.setStyleSheet("""
            QTextEdit {
                background: rgba(30, 41, 59, 0.8);
                border: 2px solid #374151;
                border-radius: 8px;
                color: #e5e7eb;
                font-family: 'Consolas', monospace;
                font-size: 10pt;
                padding: 10px;
            }
        """)
        self.stats_text.setReadOnly(True)
        layout.addWidget(self.stats_text)
        
    def setup_issues_tab(self):
        """设置问题详情标签页"""
        layout = QVBoxLayout(self.issues_tab)
        
        self.issues_table = QTableWidget()
        self.issues_table.setStyleSheet("""
            QTableWidget {
                background: rgba(30, 41, 59, 0.8);
                border: 2px solid #374151;
                border-radius: 8px;
                color: #e5e7eb;
                gridline-color: #4b5563;
            }
            QTableWidget::item {
                padding: 8px;
                border-bottom: 1px solid #4b5563;
            }
            QTableWidget::item:selected {
                background: rgba(59, 130, 246, 0.3);
            }
            QHeaderView::section {
                background: rgba(51, 65, 85, 0.9);
                color: white;
                font-weight: 700;
                padding: 10px;
                border: 1px solid #4b5563;
            }
        """)
        layout.addWidget(self.issues_table)
        
    def connect_signals(self):
        """连接信号"""
        self.process_btn.clicked.connect(self.process_data)
        self.export_btn.clicked.connect(self.export_results)
        
        self.processor.progress_updated.connect(self.update_progress)
        self.processor.processing_completed.connect(self.on_processing_completed)
        self.processor.error_occurred.connect(self.on_error)
        
    def set_data(self, data: pd.DataFrame):
        """设置数据"""
        self.data = data
        self.process_btn.setEnabled(True)
        
    def process_data(self):
        """处理数据"""
        if self.data is None:
            return
        
        self.process_btn.setEnabled(False)
        self.progress_bar.show()
        self.progress_bar.setValue(0)
        
        # 在后台线程中处理数据
        self.processor.process_data(self.data, self.auto_fix_check.isChecked())
        
    def update_progress(self, value: int, message: str):
        """更新进度"""
        self.progress_bar.setValue(value)
        self.progress_bar.setFormat(f"{message} - {value}%")
        
    def on_processing_completed(self, quality_report: DataQualityReport):
        """处理完成"""
        self.quality_report = quality_report
        self.progress_bar.hide()
        self.process_btn.setEnabled(True)
        self.export_btn.setEnabled(True)
        
        self.update_quality_display()
        self.update_statistics_display()
        self.update_issues_display()
        
    def on_error(self, error_message: str):
        """处理错误"""
        self.progress_bar.hide()
        self.process_btn.setEnabled(True)
        
        self.quality_summary.setText(f"❌ Processing failed: {error_message}")
        self.quality_summary.setStyleSheet("""
            QLabel {
                background: rgba(239, 68, 68, 0.2);
                border: 2px solid #ef4444;
                border-radius: 8px;
                color: #ef4444;
                font-size: 12pt;
                font-weight: 600;
                padding: 15px;
                margin: 10px;
            }
        """)
        
    def update_quality_display(self):
        """更新质量显示"""
        if not self.quality_report:
            return
        
        # 质量等级颜色
        quality_colors = {
            DataQualityLevel.EXCELLENT: "#10b981",
            DataQualityLevel.GOOD: "#3b82f6",
            DataQualityLevel.FAIR: "#f59e0b",
            DataQualityLevel.POOR: "#f97316",
            DataQualityLevel.CRITICAL: "#ef4444"
        }
        
        quality_level = self.quality_report.overall_quality
        color = quality_colors.get(quality_level, "#6b7280")
        
        summary_text = f"""
        📊 Data Quality: {quality_level.value.upper()}
        📈 Total Records: {self.quality_report.total_records:,}
        ⚠️ Issues Found: {len(self.quality_report.issues)}
        """
        
        self.quality_summary.setText(summary_text)
        self.quality_summary.setStyleSheet(f"""
            QLabel {{
                background: rgba({int(color[1:3], 16)}, {int(color[3:5], 16)}, {int(color[5:7], 16)}, 0.2);
                border: 2px solid {color};
                border-radius: 8px;
                color: {color};
                font-size: 12pt;
                font-weight: 600;
                padding: 15px;
                margin: 10px;
            }}
        """)
        
        # 更新建议
        recommendations = "\n".join([f"• {rec}" for rec in self.quality_report.recommendations])
        self.recommendations_text.setText(f"📋 Recommendations:\n\n{recommendations}")
        
    def update_statistics_display(self):
        """更新统计显示"""
        if not self.quality_report:
            return
        
        stats = self.quality_report.statistics
        stats_text = "📊 Data Statistics:\n\n"
        
        for key, value in stats.items():
            if key == 'memory_usage':
                value = f"{value / 1024 / 1024:.2f} MB"
            stats_text += f"{key.replace('_', ' ').title()}: {value}\n"
        
        self.stats_text.setText(stats_text)
        
    def update_issues_display(self):
        """更新问题显示"""
        if not self.quality_report:
            return
        
        issues = self.quality_report.issues
        
        self.issues_table.setRowCount(len(issues))
        self.issues_table.setColumnCount(4)
        self.issues_table.setHorizontalHeaderLabels(["Type", "Severity", "Description", "Affected Rows"])
        
        for i, issue in enumerate(issues):
            self.issues_table.setItem(i, 0, QTableWidgetItem(issue.issue_type.value))
            
            severity_item = QTableWidgetItem(issue.severity.upper())
            # 根据严重程度设置颜色
            severity_colors = {
                "low": "#10b981",
                "medium": "#f59e0b", 
                "high": "#f97316",
                "critical": "#ef4444"
            }
            color = severity_colors.get(issue.severity, "#6b7280")
            severity_item.setForeground(QColor(color))
            self.issues_table.setItem(i, 1, severity_item)
            
            self.issues_table.setItem(i, 2, QTableWidgetItem(issue.description))
            self.issues_table.setItem(i, 3, QTableWidgetItem(str(len(issue.affected_rows))))
        
        self.issues_table.resizeColumnsToContents()
        
    def export_results(self):
        """导出结果"""
        if self.quality_report and hasattr(self.processor, 'processed_data'):
            # 这里可以添加导出功能
            print("Exporting results...")


if __name__ == "__main__":
    from PyQt6.QtWidgets import QApplication
    import sys
    
    app = QApplication(sys.argv)
    
    # 创建测试数据
    test_data = pd.DataFrame({
        'X': np.random.normal(1000, 100, 100),
        'Y': np.random.normal(2000, 150, 100),
        'Z': np.random.normal(500, 50, 100),
        'Formation': np.random.choice(['Formation A', 'formation a', 'Formation B', 'FORMATION C'], 100)
    })
    
    # 添加一些问题数据
    test_data.loc[5:10, 'X'] = np.nan  # 缺失值
    test_data = pd.concat([test_data, test_data.iloc[:5]])  # 重复数据
    test_data.loc[20:22, 'Z'] = [5000, -2000, 8000]  # 异常值
    
    widget = DataProcessorWidget()
    widget.set_data(test_data)
    widget.show()
    
    sys.exit(app.exec())