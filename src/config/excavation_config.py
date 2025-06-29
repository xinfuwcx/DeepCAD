"""
@file excavation_config.py
@description 深基坑系统配置
@author Deep Excavation Team
@version 1.0.5
@copyright 2025
"""

import os
from pathlib import Path
import json
import logging
from typing import Dict, Any, List, Optional

# 项目根目录
ROOT_DIR = Path(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# 数据目录
DATA_DIR = ROOT_DIR / "data"
MESH_DIR = DATA_DIR / "mesh"
MODELS_DIR = DATA_DIR / "models"
RESULTS_DIR = DATA_DIR / "results"
PINN_MODELS_DIR = MODELS_DIR / "pinn"
INVERSE_RESULTS_DIR = RESULTS_DIR / "inverse_analysis"
VISUALIZATION_DIR = DATA_DIR / "visualization"

# 日志目录
LOGS_DIR = ROOT_DIR / "logs"

# 确保目录存在
for directory in [DATA_DIR, MESH_DIR, MODELS_DIR, RESULTS_DIR, PINN_MODELS_DIR, 
                 INVERSE_RESULTS_DIR, VISUALIZATION_DIR, LOGS_DIR]:
    os.makedirs(directory, exist_ok=True)

# 系统配置
SYSTEM_CONFIG = {
    "version": "1.0.5",
    "name": "深基坑工程分析系统",
    "description": "基于OCC-Three、Kratos-IGA和Trame的深基坑工程分析系统",
    "max_threads": 8,
    "default_mesh_size": 2.0,
    "default_mesh_algorithm": 6,
    "default_analysis_type": "static",
    "enable_gpu": True,
    "enable_kratos": True,
    "enable_pinn": True,
    "enable_iot": True,
    "api_version": "v1",
    "log_level": "INFO",
    "data_dir": str(DATA_DIR),
    "mesh_dir": str(MESH_DIR),
    "models_dir": str(MODELS_DIR),
    "results_dir": str(RESULTS_DIR),
    "logs_dir": str(LOGS_DIR),
    "debug": True,
}

# 数据库配置
DATABASE_CONFIG = {
    "engine": "sqlite",
    "path": os.path.join(DATA_DIR, "excavation.db"),
    "backup_enabled": True,
    "backup_interval": 86400,  # 每天备份一次
    "backup_path": os.path.join(DATA_DIR, "backup"),
    "echo": False,
    "pool_size": 5,
    "max_overflow": 10,
    "pool_timeout": 30,
    "pool_recycle": 3600
}

# API配置
API_CONFIG = {
    "host": "0.0.0.0",
    "port": 8000,
    "debug": False,
    "reload": True,
    "workers": 4,
    "cors_origins": ["http://localhost:3000"],
    "allowed_hosts": ["*"]
}

# 前端配置
FRONTEND_CONFIG = {
    "url": "http://localhost:3000",
    "api_url": "http://localhost:8000/api",
    "docs_url": "http://localhost:8000/docs",
    "visualization_url": "http://localhost:8765"
}

# Terra计算引擎配置
TERRA_CONFIG = {
    "terra_path": None,  # 自动查找
    "default_solver": "direct",
    "max_iterations": 1000,
    "convergence_tolerance": 1e-6,
    "output_interval": 10
}

# Gmsh网格配置
GMSH_CONFIG = {
    "gmsh_path": None,  # 自动查找
    "default_mesh_size": 2.0,
    "default_algorithm": 6,
    "default_order": 2,
    "default_dimension": 3
}

# PINN模型配置
PINN_CONFIG = {
    "default_layers": [20, 20, 20],
    "default_iterations": 10000,
    "default_learning_rate": 0.001,
    "default_activation": "tanh",
    "default_optimizer": "adam",
    "default_loss": "mse",
    "checkpoint_interval": 1000,
    "early_stopping_patience": 50,
    "batch_size": 1024,
    "use_gpu": True
}

# IoT数据配置
IOT_CONFIG = {
    "data_interval": 3600,  # 默认数据采集间隔（秒）
    "default_sensor_types": ["displacement", "stress", "strain", "water_level"],
    "anomaly_threshold": 3.0,  # 异常值检测阈值（标准差）
    "moving_average_window": 24,  # 移动平均窗口大小
    "data_fusion_methods": ["weighted_average", "kalman", "pca"],
    "default_fusion_method": "weighted_average"
}

# 材料模型配置
MATERIAL_MODELS = {
    "linear_elastic": {
        "name": "线性弹性",
        "parameters": ["young_modulus", "poisson_ratio", "density"]
    },
    "mohr_coulomb": {
        "name": "莫尔库仑",
        "parameters": ["young_modulus", "poisson_ratio", "cohesion", "friction_angle", "density"]
    },
    "drucker_prager": {
        "name": "Drucker-Prager",
        "parameters": ["young_modulus", "poisson_ratio", "cohesion", "friction_angle", "density", "dilatancy_angle"]
    },
    "cam_clay": {
        "name": "Cam-Clay",
        "parameters": ["lambda", "kappa", "M", "e0", "p0", "poisson_ratio", "density"]
    },
    "modified_cam_clay": {
        "name": "修正Cam-Clay",
        "parameters": ["lambda", "kappa", "M", "e0", "p0", "poisson_ratio", "density"]
    },
    "hypoplastic": {
        "name": "超塑性",
        "parameters": ["phi_c", "hs", "n", "ed0", "ec0", "ei0", "alpha", "beta", "density"]
    },
    "soft_soil": {
        "name": "软土",
        "parameters": ["lambda", "kappa", "cohesion", "friction_angle", "OCR", "K0nc", "M", "density"]
    },
    "hardening_soil": {
        "name": "硬化土",
        "parameters": ["E50", "Eoed", "Eur", "cohesion", "friction_angle", "dilatancy_angle", "power", "K0nc", "density"]
    }
}

# 几何建模配置
GEOMETRY_CONFIG = {
    "engine": "OCC",  # OpenCascade Core
    "export_formats": ["STEP", "BREP", "IGES", "STL"],
    "default_tolerance": 1.0e-6,
    "mesh_algorithm": "netgen",
    "threejs_export": True,
}

# 网格生成配置
MESH_CONFIG = {
    "engine": "gmsh",
    "element_size_factor": 0.05,
    "min_element_size": 0.01,
    "max_element_size": 2.0,
    "mesh_order": 2,
    "mesh_algorithm": 6,  # Frontal Delaunay
    "export_formats": ["msh", "vtk", "json"],
}

# IGA分析配置
IGA_CONFIG = {
    "engine": "Kratos", 
    "applications": [
        "IgaApplication",
        "StructuralMechanicsApplication",
        "LinearSolversApplication"
    ],
    "nurbs_degree": 3,
    "integration_points": 5,
    "solver_type": "direct",
    "linear_solver": "skyline_lu_factorization",
    "compute_reactions": True,
    "rotation_dofs": False,
    "reform_dofs_at_each_step": True,
    "line_search": False,
    "compute_contact_forces": False,
    "move_mesh_flag": True,
    "convergence_criterion": "displacement_criterion",
    "displacement_relative_tolerance": 1.0e-4,
    "displacement_absolute_tolerance": 1.0e-9,
    "residual_relative_tolerance": 1.0e-4,
    "residual_absolute_tolerance": 1.0e-9,
    "max_iteration": 50
}

# 材料属性配置
MATERIAL_PROPERTIES = {
    "soil": {
        "type": "MohrCoulombPlasticity",
        "young_modulus": 30000000.0,
        "poisson_ratio": 0.3,
        "density": 1900.0,
        "friction_angle": 30.0,
        "cohesion": 20000.0,
        "dilatancy_angle": 0.0,
    },
    "concrete": {
        "type": "LinearElastic",
        "young_modulus": 32000000000.0,
        "poisson_ratio": 0.2,
        "density": 2400.0,
    },
    "steel": {
        "type": "LinearElastic",
        "young_modulus": 210000000000.0,
        "poisson_ratio": 0.3,
        "density": 7850.0,
    }
}

# 物理AI系统配置
PHYSICS_AI_CONFIG = {
    "enabled": True,
    "pinn_models": {
        "displacement": {
            "hidden_layers": [20, 20, 20, 20],
            "activation": "tanh",
            "optimizer": "adam",
            "learning_rate": 0.001,
            "epochs": 20000,
            "batch_size": 5000
        },
        "seepage": {
            "hidden_layers": [20, 20, 20],
            "activation": "tanh",
            "optimizer": "adam",
            "learning_rate": 0.001,
            "epochs": 10000,
            "batch_size": 2000
        }
    },
    "iot_sensors": {
        "displacement": {
            "count": 10,
            "sampling_rate": 60,  # 每分钟一次
            "noise_level": 0.001
        },
        "pressure": {
            "count": 5,
            "sampling_rate": 60,
            "noise_level": 0.005
        },
        "strain": {
            "count": 8,
            "sampling_rate": 60,
            "noise_level": 0.002
        }
    },
    "data_fusion": {
        "method": "weighted_average",
        "time_window": 3600,  # 1小时
        "outlier_detection": True
    }
}

# 可视化配置
VISUALIZATION_CONFIG = {
    "engine": "trame",
    "vtk_enabled": True,
    "threejs_enabled": True,
    "color_map": "rainbow",
    "show_wireframe": True,
    "show_axes": True,
    "show_legend": True,
    "background_color": [0.9, 0.9, 0.9]
}

# 服务器配置
SERVER_CONFIG = {
    "host": "127.0.0.1",
    "port": 5000,
    "debug": True,
    "workers": 4,
    "timeout": 120,
    "allow_cors": True
}

# 加载用户配置（如果存在）
USER_CONFIG_FILE = ROOT_DIR / "user_config.json"
if USER_CONFIG_FILE.exists():
    try:
        with open(USER_CONFIG_FILE, "r", encoding="utf-8") as f:
            user_config = json.load(f)
            
        # 更新系统配置
        if "system" in user_config:
            SYSTEM_CONFIG.update(user_config["system"])
        
        # 更新数据库配置
        if "database" in user_config:
            DATABASE_CONFIG.update(user_config["database"])
        
        # 更新API配置
        if "api" in user_config:
            API_CONFIG.update(user_config["api"])
        
        # 更新前端配置
        if "frontend" in user_config:
            FRONTEND_CONFIG.update(user_config["frontend"])
        
        # 更新Terra配置
        if "terra" in user_config:
            TERRA_CONFIG.update(user_config["terra"])
        
        # 更新Gmsh配置
        if "gmsh" in user_config:
            GMSH_CONFIG.update(user_config["gmsh"])
        
        # 更新PINN配置
        if "pinn" in user_config:
            PINN_CONFIG.update(user_config["pinn"])
        
        # 更新IoT配置
        if "iot" in user_config:
            IOT_CONFIG.update(user_config["iot"])
            
    except Exception as e:
        logging.error(f"加载用户配置失败: {str(e)}")

# 配置日志
LOG_FILE = LOGS_DIR / "excavation_system.log"
logging.basicConfig(
    level=getattr(logging, SYSTEM_CONFIG["log_level"]),
    format="%(asctime)s - %(levelname)s - %(name)s - %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(LOG_FILE, mode="a", encoding="utf-8")
    ]
)

# 获取配置
def get_system_config() -> Dict[str, Any]:
    """获取系统配置"""
    return SYSTEM_CONFIG

def get_database_config() -> Dict[str, Any]:
    """获取数据库配置"""
    return DATABASE_CONFIG

def get_api_config() -> Dict[str, Any]:
    """获取API配置"""
    return API_CONFIG

def get_frontend_config() -> Dict[str, Any]:
    """获取前端配置"""
    return FRONTEND_CONFIG

def get_terra_config() -> Dict[str, Any]:
    """获取Terra配置"""
    return TERRA_CONFIG

def get_gmsh_config() -> Dict[str, Any]:
    """获取Gmsh配置"""
    return GMSH_CONFIG

def get_pinn_config() -> Dict[str, Any]:
    """获取PINN配置"""
    return PINN_CONFIG

def get_iot_config() -> Dict[str, Any]:
    """获取IoT配置"""
    return IOT_CONFIG

def get_material_models() -> Dict[str, Dict[str, Any]]:
    """获取材料模型配置"""
    return MATERIAL_MODELS

def get_project_dir(project_id: int) -> Path:
    """获取项目目录"""
    project_dir = DATA_DIR / "projects" / f"project_{project_id}"
    os.makedirs(project_dir, exist_ok=True)
    return project_dir

def save_user_config(config: Dict[str, Any]) -> bool:
    """保存用户配置"""
    try:
        with open(USER_CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(config, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        logging.error(f"保存用户配置失败: {str(e)}")
        return False




