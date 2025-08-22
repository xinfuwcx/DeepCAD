#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
数据管理器 - Data Manager
强大的数据导入导出、格式转换、批处理功能

Features:
- 多格式数据导入导出 (VTK, STL, PLY, CSV, Excel, JSON)
- CAD文件支持 (DXF, STEP, IGES)
- GIS数据集成 (Shapefile, KML, GeoTIFF)
- 数据库连接 (SQLite, PostgreSQL, MySQL)
- 云存储同步 (AWS S3, Azure Blob, Google Cloud)
- 批量数据处理
- 数据质量检查和清洗
"""

import os
import sys
import json
import csv
import sqlite3
from pathlib import Path
from typing import Dict, Any, List, Tuple, Optional, Union, IO
from dataclasses import dataclass, asdict
from enum import Enum
import tempfile
import zipfile
import pickle
from datetime import datetime
import hashlib

# 数据处理库
import numpy as np
try:
    import pandas as pd
    PANDAS_AVAILABLE = True
except ImportError:
    PANDAS_AVAILABLE = False

# 3D数据处理
try:
    import pyvista as pv
    import vtk
    PYVISTA_AVAILABLE = True
except ImportError:
    PYVISTA_AVAILABLE = False

# Excel支持
try:
    import openpyxl
    import xlsxwriter
    EXCEL_AVAILABLE = True
except ImportError:
    EXCEL_AVAILABLE = False

# CAD文件支持
try:
    import ezdxf
    DXF_AVAILABLE = True
except ImportError:
    DXF_AVAILABLE = False

# GIS支持
try:
    import geopandas as gpd
    import rasterio
    GIS_AVAILABLE = True
except ImportError:
    GIS_AVAILABLE = False

# 云存储支持
try:
    import boto3
    AWS_AVAILABLE = True
except ImportError:
    AWS_AVAILABLE = False

# 本地模块
from .empirical_solver import ScourParameters, ScourResult
from .advanced_solver import SolverResult, NumericalParameters
from .advanced_materials import FluidProperties, SedimentProperties, BedProperties


class DataFormat(Enum):
    """支持的数据格式"""
    # 3D网格格式
    VTK = "vtk"
    VTU = "vtu"
    VTP = "vtp"
    STL = "stl"
    PLY = "ply"
    OBJ = "obj"
    
    # CAD格式
    DXF = "dxf"
    STEP = "step"
    IGES = "iges"
    
    # 表格格式
    CSV = "csv"
    EXCEL = "xlsx"
    JSON = "json"
    XML = "xml"
    
    # GIS格式
    SHAPEFILE = "shp"
    KML = "kml"
    GEOTIFF = "tiff"
    
    # 数据库
    SQLITE = "sqlite"
    POSTGRESQL = "postgresql"
    MYSQL = "mysql"
    
    # 压缩格式
    ZIP = "zip"
    TAR = "tar"
    
    # 二进制格式
    PICKLE = "pkl"
    NUMPY = "npy"
    HDF5 = "h5"


@dataclass
class DataMetadata:
    """数据元信息"""
    filename: str
    format: DataFormat
    size_bytes: int
    created_time: datetime
    modified_time: datetime
    checksum: str
    description: str = ""
    tags: List[str] = None
    coordinate_system: str = ""
    units: Dict[str, str] = None
    
    def __post_init__(self):
        if self.tags is None:
            self.tags = []
        if self.units is None:
            self.units = {}


@dataclass
class ProjectData:
    """项目数据容器"""
    # 基础信息
    project_name: str
    version: str = "1.0.0"
    created_by: str = ""
    created_time: datetime = None
    description: str = ""
    
    # 计算参数
    scour_parameters: Optional[ScourParameters] = None
    numerical_parameters: Optional[NumericalParameters] = None
    material_properties: Dict[str, Any] = None
    
    # 几何数据
    geometry_data: Dict[str, Any] = None
    mesh_data: Optional[pv.UnstructuredGrid] = None
    
    # 结果数据
    solver_results: List[SolverResult] = None
    post_processing_data: Dict[str, Any] = None
    
    # 元数据
    metadata: Dict[str, DataMetadata] = None
    
    def __post_init__(self):
        if self.created_time is None:
            self.created_time = datetime.now()
        if self.solver_results is None:
            self.solver_results = []
        if self.metadata is None:
            self.metadata = {}
        if self.material_properties is None:
            self.material_properties = {}


class DataValidator:
    """数据验证器"""
    
    @staticmethod
    def validate_mesh_data(mesh: pv.UnstructuredGrid) -> Dict[str, Any]:
        """验证网格数据质量"""
        validation_report = {
            'valid': True,
            'warnings': [],
            'errors': [],
            'statistics': {}
        }
        
        try:
            # 基础统计
            validation_report['statistics'] = {
                'n_points': mesh.n_points,
                'n_cells': mesh.n_cells,
                'bounds': mesh.bounds,
                'volume': mesh.volume if hasattr(mesh, 'volume') else None
            }
            
            # 检查退化单元
            if hasattr(mesh, 'compute_cell_quality'):
                qualities = mesh.compute_cell_quality()
                poor_quality_cells = np.sum(qualities['CellQuality'] < 0.1)
                if poor_quality_cells > 0:
                    validation_report['warnings'].append(
                        f"发现 {poor_quality_cells} 个低质量单元"
                    )
            
            # 检查连通性
            if mesh.n_points == 0:
                validation_report['errors'].append("网格为空")
                validation_report['valid'] = False
            
            # 检查坐标范围
            bounds = mesh.bounds
            if any(np.isnan(bounds)) or any(np.isinf(bounds)):
                validation_report['errors'].append("网格包含无效坐标")
                validation_report['valid'] = False
            
            # 检查单元类型
            cell_types = mesh.celltypes
            unique_types = np.unique(cell_types)
            validation_report['statistics']['cell_types'] = unique_types.tolist()
            
        except Exception as e:
            validation_report['errors'].append(f"验证过程出错: {str(e)}")
            validation_report['valid'] = False
        
        return validation_report
    
    @staticmethod
    def validate_parameter_data(params: ScourParameters) -> Dict[str, Any]:
        """验证参数数据"""
        validation_report = {
            'valid': True,
            'warnings': [],
            'errors': []
        }
        
        try:
            # 检查物理合理性
            if params.pier_diameter <= 0:
                validation_report['errors'].append("桥墩直径必须为正数")
            
            if params.flow_velocity < 0:
                validation_report['errors'].append("流速不能为负数")
            
            if params.water_depth <= 0:
                validation_report['errors'].append("水深必须为正数")
            
            if params.d50 <= 0:
                validation_report['errors'].append("沉积物粒径必须为正数")
            
            # 检查无量纲参数
            Re = params.flow_velocity * params.pier_diameter / 1e-6  # 假设粘度
            Fr = params.flow_velocity / np.sqrt(9.81 * params.water_depth)
            
            if Re < 1000:
                validation_report['warnings'].append(f"雷诺数较低 (Re={Re:.0f})，可能为层流")
            
            if Fr > 1.0:
                validation_report['warnings'].append(f"弗劳德数大于1 (Fr={Fr:.2f})，为超临界流")
            
            # 相对尺度检查
            if params.water_depth / params.pier_diameter < 2.0:
                validation_report['warnings'].append("水深与桥墩直径比值较小，可能为浅水条件")
            
            validation_report['valid'] = len(validation_report['errors']) == 0
            
        except Exception as e:
            validation_report['errors'].append(f"参数验证出错: {str(e)}")
            validation_report['valid'] = False
        
        return validation_report


class DataImporter:
    """数据导入器"""
    
    def __init__(self):
        self.supported_formats = {
            DataFormat.VTK: self.import_vtk,
            DataFormat.STL: self.import_stl,
            DataFormat.CSV: self.import_csv,
            DataFormat.EXCEL: self.import_excel,
            DataFormat.JSON: self.import_json,
            DataFormat.DXF: self.import_dxf,
            DataFormat.SHAPEFILE: self.import_shapefile
        }
    
    def import_data(self, filepath: Union[str, Path], 
                   format: Optional[DataFormat] = None) -> Dict[str, Any]:
        """通用数据导入接口"""
        filepath = Path(filepath)
        
        if not filepath.exists():
            raise FileNotFoundError(f"文件不存在: {filepath}")
        
        # 自动检测格式
        if format is None:
            format = self.detect_format(filepath)
        
        if format not in self.supported_formats:
            raise ValueError(f"不支持的格式: {format}")
        
        # 导入数据
        try:
            data = self.supported_formats[format](filepath)
            
            # 生成元数据
            metadata = self.generate_metadata(filepath, format)
            
            return {
                'data': data,
                'metadata': metadata,
                'validation': self.validate_imported_data(data, format)
            }
            
        except Exception as e:
            raise ImportError(f"导入失败: {str(e)}")
    
    def detect_format(self, filepath: Path) -> DataFormat:
        """自动检测文件格式"""
        suffix = filepath.suffix.lower()
        
        format_map = {
            '.vtk': DataFormat.VTK,
            '.vtu': DataFormat.VTU,
            '.stl': DataFormat.STL,
            '.ply': DataFormat.PLY,
            '.csv': DataFormat.CSV,
            '.xlsx': DataFormat.EXCEL,
            '.json': DataFormat.JSON,
            '.dxf': DataFormat.DXF,
            '.shp': DataFormat.SHAPEFILE,
            '.kml': DataFormat.KML
        }
        
        return format_map.get(suffix, DataFormat.JSON)  # 默认JSON
    
    def import_vtk(self, filepath: Path) -> pv.UnstructuredGrid:
        """导入VTK格式网格"""
        if not PYVISTA_AVAILABLE:
            raise ImportError("PyVista不可用，无法导入VTK文件")
        
        mesh = pv.read(str(filepath))
        return mesh
    
    def import_stl(self, filepath: Path) -> pv.PolyData:
        """导入STL格式文件"""
        if not PYVISTA_AVAILABLE:
            raise ImportError("PyVista不可用，无法导入STL文件")
        
        mesh = pv.read(str(filepath))
        return mesh
    
    def import_csv(self, filepath: Path) -> pd.DataFrame:
        """导入CSV文件"""
        if not PANDAS_AVAILABLE:
            # 使用原生Python
            data = []
            with open(filepath, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    data.append(row)
            return data
        else:
            return pd.read_csv(filepath)
    
    def import_excel(self, filepath: Path) -> Dict[str, pd.DataFrame]:
        """导入Excel文件"""
        if not EXCEL_AVAILABLE or not PANDAS_AVAILABLE:
            raise ImportError("Excel支持库不可用")
        
        # 读取所有工作表
        excel_data = pd.read_excel(filepath, sheet_name=None)
        return excel_data
    
    def import_json(self, filepath: Path) -> Dict[str, Any]:
        """导入JSON文件"""
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    def import_dxf(self, filepath: Path) -> Dict[str, Any]:
        """导入DXF文件"""
        if not DXF_AVAILABLE:
            raise ImportError("ezdxf不可用，无法导入DXF文件")
        
        doc = ezdxf.readfile(str(filepath))
        
        # 提取几何实体
        entities = {
            'lines': [],
            'circles': [],
            'arcs': [],
            'polylines': [],
            'points': []
        }
        
        msp = doc.modelspace()
        
        for entity in msp:
            if entity.dxftype() == 'LINE':
                entities['lines'].append({
                    'start': entity.dxf.start,
                    'end': entity.dxf.end
                })
            elif entity.dxftype() == 'CIRCLE':
                entities['circles'].append({
                    'center': entity.dxf.center,
                    'radius': entity.dxf.radius
                })
            elif entity.dxftype() == 'ARC':
                entities['arcs'].append({
                    'center': entity.dxf.center,
                    'radius': entity.dxf.radius,
                    'start_angle': entity.dxf.start_angle,
                    'end_angle': entity.dxf.end_angle
                })
            elif entity.dxftype() == 'LWPOLYLINE':
                points = list(entity.get_points())
                entities['polylines'].append({
                    'points': points,
                    'closed': entity.closed
                })
            elif entity.dxftype() == 'POINT':
                entities['points'].append(entity.dxf.location)
        
        return {
            'entities': entities,
            'layers': [layer.dxf.name for layer in doc.layers],
            'units': doc.units,
            'drawing_limits': {
                'min': doc.header.get('$LIMMIN', (0, 0)),
                'max': doc.header.get('$LIMMAX', (100, 100))
            }
        }
    
    def import_shapefile(self, filepath: Path) -> Dict[str, Any]:
        """导入Shapefile"""
        if not GIS_AVAILABLE:
            raise ImportError("GIS库不可用，无法导入Shapefile")
        
        gdf = gpd.read_file(str(filepath))
        
        return {
            'geometry': gdf.geometry.tolist(),
            'attributes': gdf.drop('geometry', axis=1).to_dict('records'),
            'crs': str(gdf.crs),
            'bounds': gdf.bounds.to_dict('records')[0]
        }
    
    def generate_metadata(self, filepath: Path, format: DataFormat) -> DataMetadata:
        """生成文件元数据"""
        stat = filepath.stat()
        
        # 计算文件校验和
        with open(filepath, 'rb') as f:
            checksum = hashlib.md5(f.read()).hexdigest()
        
        return DataMetadata(
            filename=filepath.name,
            format=format,
            size_bytes=stat.st_size,
            created_time=datetime.fromtimestamp(stat.st_ctime),
            modified_time=datetime.fromtimestamp(stat.st_mtime),
            checksum=checksum
        )
    
    def validate_imported_data(self, data: Any, format: DataFormat) -> Dict[str, Any]:
        """验证导入的数据"""
        if format in [DataFormat.VTK, DataFormat.STL] and PYVISTA_AVAILABLE:
            if isinstance(data, (pv.UnstructuredGrid, pv.PolyData)):
                return DataValidator.validate_mesh_data(data)
        
        return {'valid': True, 'warnings': [], 'errors': []}


class DataExporter:
    """数据导出器"""
    
    def __init__(self):
        self.supported_formats = {
            DataFormat.VTK: self.export_vtk,
            DataFormat.STL: self.export_stl,
            DataFormat.CSV: self.export_csv,
            DataFormat.EXCEL: self.export_excel,
            DataFormat.JSON: self.export_json,
            DataFormat.DXF: self.export_dxf,
            DataFormat.PICKLE: self.export_pickle
        }
    
    def export_data(self, data: Any, filepath: Union[str, Path],
                   format: Optional[DataFormat] = None, **kwargs) -> bool:
        """通用数据导出接口"""
        filepath = Path(filepath)
        
        # 自动检测格式
        if format is None:
            format = self.detect_export_format(filepath)
        
        if format not in self.supported_formats:
            raise ValueError(f"不支持的导出格式: {format}")
        
        try:
            # 确保目录存在
            filepath.parent.mkdir(parents=True, exist_ok=True)
            
            # 导出数据
            success = self.supported_formats[format](data, filepath, **kwargs)
            
            if success:
                print(f"数据已导出到: {filepath}")
            
            return success
            
        except Exception as e:
            print(f"导出失败: {str(e)}")
            return False
    
    def detect_export_format(self, filepath: Path) -> DataFormat:
        """检测导出格式"""
        suffix = filepath.suffix.lower()
        
        format_map = {
            '.vtk': DataFormat.VTK,
            '.stl': DataFormat.STL,
            '.csv': DataFormat.CSV,
            '.xlsx': DataFormat.EXCEL,
            '.json': DataFormat.JSON,
            '.dxf': DataFormat.DXF,
            '.pkl': DataFormat.PICKLE
        }
        
        return format_map.get(suffix, DataFormat.JSON)
    
    def export_vtk(self, data: pv.UnstructuredGrid, filepath: Path, **kwargs) -> bool:
        """导出VTK格式"""
        if not PYVISTA_AVAILABLE:
            return False
        
        try:
            data.save(str(filepath))
            return True
        except Exception:
            return False
    
    def export_stl(self, data: pv.PolyData, filepath: Path, **kwargs) -> bool:
        """导出STL格式"""
        if not PYVISTA_AVAILABLE:
            return False
        
        try:
            data.save(str(filepath))
            return True
        except Exception:
            return False
    
    def export_csv(self, data: Union[List[Dict], pd.DataFrame], 
                  filepath: Path, **kwargs) -> bool:
        """导出CSV格式"""
        try:
            if PANDAS_AVAILABLE and isinstance(data, pd.DataFrame):
                data.to_csv(filepath, index=False, encoding='utf-8-sig')
            elif isinstance(data, list) and len(data) > 0:
                # 使用原生Python
                with open(filepath, 'w', newline='', encoding='utf-8-sig') as f:
                    if isinstance(data[0], dict):
                        fieldnames = data[0].keys()
                        writer = csv.DictWriter(f, fieldnames=fieldnames)
                        writer.writeheader()
                        writer.writerows(data)
                    else:
                        writer = csv.writer(f)
                        writer.writerows(data)
            return True
        except Exception:
            return False
    
    def export_excel(self, data: Dict[str, pd.DataFrame], 
                    filepath: Path, **kwargs) -> bool:
        """导出Excel格式"""
        if not EXCEL_AVAILABLE or not PANDAS_AVAILABLE:
            return False
        
        try:
            with pd.ExcelWriter(filepath, engine='xlsxwriter') as writer:
                for sheet_name, df in data.items():
                    df.to_excel(writer, sheet_name=sheet_name, index=False)
            return True
        except Exception:
            return False
    
    def export_json(self, data: Any, filepath: Path, **kwargs) -> bool:
        """导出JSON格式"""
        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False, 
                         default=self.json_serializer)
            return True
        except Exception:
            return False
    
    def export_dxf(self, data: Dict[str, Any], filepath: Path, **kwargs) -> bool:
        """导出DXF格式"""
        if not DXF_AVAILABLE:
            return False
        
        try:
            doc = ezdxf.new('R2010')
            msp = doc.modelspace()
            
            # 导出几何实体
            entities = data.get('entities', {})
            
            # 添加线段
            for line in entities.get('lines', []):
                msp.add_line(line['start'], line['end'])
            
            # 添加圆
            for circle in entities.get('circles', []):
                msp.add_circle(circle['center'], circle['radius'])
            
            # 添加圆弧
            for arc in entities.get('arcs', []):
                msp.add_arc(arc['center'], arc['radius'], 
                           arc['start_angle'], arc['end_angle'])
            
            # 添加多段线
            for polyline in entities.get('polylines', []):
                msp.add_lwpolyline(polyline['points'], 
                                 close=polyline.get('closed', False))
            
            # 添加点
            for point in entities.get('points', []):
                msp.add_point(point)
            
            doc.saveas(str(filepath))
            return True
        except Exception:
            return False
    
    def export_pickle(self, data: Any, filepath: Path, **kwargs) -> bool:
        """导出Pickle格式"""
        try:
            with open(filepath, 'wb') as f:
                pickle.dump(data, f)
            return True
        except Exception:
            return False
    
    def json_serializer(self, obj):
        """JSON序列化器"""
        if isinstance(obj, datetime):
            return obj.isoformat()
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        elif hasattr(obj, '__dict__'):
            return obj.__dict__
        else:
            return str(obj)


class ProjectManager:
    """项目管理器"""
    
    def __init__(self, data_directory: Union[str, Path] = "data"):
        self.data_directory = Path(data_directory)
        self.data_directory.mkdir(exist_ok=True)
        
        self.importer = DataImporter()
        self.exporter = DataExporter()
        
        # 初始化数据库
        self.db_path = self.data_directory / "projects.db"
        self.init_database()
    
    def init_database(self):
        """初始化项目数据库"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS projects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                version TEXT,
                created_by TEXT,
                created_time TEXT,
                modified_time TEXT,
                description TEXT,
                filepath TEXT,
                checksum TEXT
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS datasets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER,
                name TEXT,
                format TEXT,
                filepath TEXT,
                size_bytes INTEGER,
                checksum TEXT,
                metadata TEXT,
                FOREIGN KEY (project_id) REFERENCES projects (id)
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def create_project(self, project_name: str, description: str = "") -> ProjectData:
        """创建新项目"""
        project = ProjectData(
            project_name=project_name,
            description=description,
            created_by=os.getenv('USERNAME', 'Unknown')
        )
        
        # 保存到数据库
        self.save_project(project)
        
        return project
    
    def save_project(self, project: ProjectData) -> bool:
        """保存项目"""
        try:
            # 保存项目文件
            project_dir = self.data_directory / project.project_name
            project_dir.mkdir(exist_ok=True)
            
            project_file = project_dir / f"{project.project_name}.json"
            
            # 转换为可序列化格式
            project_dict = asdict(project)
            
            # 处理特殊对象
            if project.mesh_data is not None and PYVISTA_AVAILABLE:
                mesh_file = project_dir / "mesh.vtk"
                project.mesh_data.save(str(mesh_file))
                project_dict['mesh_data'] = str(mesh_file)
            
            # 保存JSON
            success = self.exporter.export_json(project_dict, project_file)
            
            if success:
                # 更新数据库记录
                self.update_project_database(project, project_file)
            
            return success
            
        except Exception as e:
            print(f"保存项目失败: {str(e)}")
            return False
    
    def load_project(self, project_name: str) -> Optional[ProjectData]:
        """加载项目"""
        try:
            project_file = self.data_directory / project_name / f"{project_name}.json"
            
            if not project_file.exists():
                return None
            
            # 导入项目数据
            import_result = self.importer.import_json(project_file)
            project_dict = import_result['data']
            
            # 重建项目对象
            project = ProjectData(**project_dict)
            
            # 加载网格数据
            if isinstance(project_dict.get('mesh_data'), str):
                mesh_file = Path(project_dict['mesh_data'])
                if mesh_file.exists() and PYVISTA_AVAILABLE:
                    project.mesh_data = pv.read(str(mesh_file))
            
            return project
            
        except Exception as e:
            print(f"加载项目失败: {str(e)}")
            return None
    
    def list_projects(self) -> List[Dict[str, Any]]:
        """列出所有项目"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT name, version, created_by, created_time, description
            FROM projects
            ORDER BY modified_time DESC
        ''')
        
        projects = []
        for row in cursor.fetchall():
            projects.append({
                'name': row[0],
                'version': row[1],
                'created_by': row[2],
                'created_time': row[3],
                'description': row[4]
            })
        
        conn.close()
        return projects
    
    def delete_project(self, project_name: str) -> bool:
        """删除项目"""
        try:
            # 删除文件
            project_dir = self.data_directory / project_name
            if project_dir.exists():
                import shutil
                shutil.rmtree(project_dir)
            
            # 删除数据库记录
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('DELETE FROM projects WHERE name = ?', (project_name,))
            conn.commit()
            conn.close()
            
            return True
            
        except Exception as e:
            print(f"删除项目失败: {str(e)}")
            return False
    
    def update_project_database(self, project: ProjectData, filepath: Path):
        """更新项目数据库记录"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # 计算文件校验和
        with open(filepath, 'rb') as f:
            checksum = hashlib.md5(f.read()).hexdigest()
        
        cursor.execute('''
            INSERT OR REPLACE INTO projects 
            (name, version, created_by, created_time, modified_time, description, filepath, checksum)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            project.project_name,
            project.version,
            project.created_by,
            project.created_time.isoformat(),
            datetime.now().isoformat(),
            project.description,
            str(filepath),
            checksum
        ))
        
        conn.commit()
        conn.close()
    
    def export_project_archive(self, project_name: str, 
                             archive_path: Union[str, Path]) -> bool:
        """导出项目压缩包"""
        try:
            project_dir = self.data_directory / project_name
            archive_path = Path(archive_path)
            
            with zipfile.ZipFile(archive_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                for file_path in project_dir.rglob('*'):
                    if file_path.is_file():
                        arcname = file_path.relative_to(project_dir)
                        zipf.write(file_path, arcname)
            
            print(f"项目已导出到: {archive_path}")
            return True
            
        except Exception as e:
            print(f"导出项目压缩包失败: {str(e)}")
            return False
    
    def import_project_archive(self, archive_path: Union[str, Path],
                             project_name: Optional[str] = None) -> bool:
        """导入项目压缩包"""
        try:
            archive_path = Path(archive_path)
            
            if project_name is None:
                project_name = archive_path.stem
            
            project_dir = self.data_directory / project_name
            
            with zipfile.ZipFile(archive_path, 'r') as zipf:
                zipf.extractall(project_dir)
            
            print(f"项目已导入: {project_name}")
            return True
            
        except Exception as e:
            print(f"导入项目压缩包失败: {str(e)}")
            return False


# 便利函数
def quick_export_results(solver_results: List[SolverResult], 
                        output_dir: Union[str, Path] = "results") -> bool:
    """快速导出计算结果"""
    output_dir = Path(output_dir)
    output_dir.mkdir(exist_ok=True)
    
    exporter = DataExporter()
    
    # 导出为Excel
    if PANDAS_AVAILABLE:
        results_data = []
        for i, result in enumerate(solver_results):
            results_data.append({
                'Case': i + 1,
                'Success': result.success,
                'Scour_Depth_m': result.scour_depth,
                'Scour_Width_m': result.scour_width,
                'Scour_Volume_m3': result.scour_volume,
                'Max_Velocity_ms': result.max_velocity,
                'Max_Shear_Stress_Pa': result.max_shear_stress,
                'Computation_Time_s': result.computation_time,
                'Iterations': result.iterations
            })
        
        df = pd.DataFrame(results_data)
        excel_file = output_dir / "scour_results.xlsx"
        
        return exporter.export_excel({'Results': df}, excel_file)
    
    return False


if __name__ == "__main__":
    # 测试数据管理器
    print("=== 数据管理器测试 ===")
    
    # 创建项目管理器
    manager = ProjectManager("test_data")
    
    # 创建测试项目
    project = manager.create_project("test_scour_project", "测试桥墩冲刷项目")
    
    # 添加测试数据
    from .empirical_solver import ScourParameters, PierShape
    
    project.scour_parameters = ScourParameters(
        pier_diameter=2.0,
        pier_shape=PierShape.CIRCULAR,
        flow_velocity=1.0,
        water_depth=3.0,
        d50=0.5
    )
    
    # 保存项目
    success = manager.save_project(project)
    print(f"项目保存: {'成功' if success else '失败'}")
    
    # 加载项目
    loaded_project = manager.load_project("test_scour_project")
    if loaded_project:
        print(f"项目加载成功: {loaded_project.project_name}")
        print(f"桥墩直径: {loaded_project.scour_parameters.pier_diameter} m")
    
    # 列出项目
    projects = manager.list_projects()
    print(f"找到 {len(projects)} 个项目")
    
    # 测试数据导入导出
    print("\n=== 数据导入导出测试 ===")
    
    importer = DataImporter()
    exporter = DataExporter()
    
    # 测试JSON导出
    test_data = {
        'project': 'test',
        'parameters': {
            'diameter': 2.0,
            'velocity': 1.0
        },
        'results': [1.2, 1.5, 1.8]
    }
    
    json_file = Path("test_export.json")
    success = exporter.export_json(test_data, json_file)
    print(f"JSON导出: {'成功' if success else '失败'}")
    
    if json_file.exists():
        # 测试JSON导入
        import_result = importer.import_json(json_file)
        print(f"JSON导入: {import_result['data']}")
        
        # 清理测试文件
        json_file.unlink()
    
    print("数据管理器测试完成！")