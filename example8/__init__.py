"""
SimPEG 专业地球物理界面包
"""

__version__ = "1.0.0"
__author__ = "DeepCAD Team"
__description__ = "专业地球物理正反演界面，基于SimPEG框架"

# 导入主要模块
from .modules.mesh_builder import MeshBuilder
from .modules.survey_designer import SurveyDesigner
from .modules.forward_solver import ForwardSolver
from .modules.inversion_engine import InversionEngine

# 导入地球物理方法
from .methods.gravity.gravity_module import GravityModule

__all__ = [
    'MeshBuilder',
    'SurveyDesigner', 
    'ForwardSolver',
    'InversionEngine',
    'GravityModule'
]
