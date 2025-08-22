"""
DeepCAD桥墩冲刷分析模块
Bridge Pier Scour Analysis Module

集成经验公式计算和FEniCS CFD数值模拟的专业桥墩冲刷分析系统
"""

from .routes import router
from .services import BridgeScourService
from .fenics_solver import FEniCSFlowSolver
from .empirical_solver import EmpiricalScourSolver

__all__ = ['router', 'BridgeScourService', 'FEniCSFlowSolver', 'EmpiricalScourSolver']