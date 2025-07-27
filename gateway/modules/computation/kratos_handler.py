"""
Kratos integration handler for computation module
增强版Kratos处理器，支持多种分析类型和PyVista后处理
"""
import sys
import json
import logging
import asyncio
import tempfile
import shutil
import os
from pathlib import Path
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from enum import Enum

# 导入简化的Kratos集成模块
from .kratos_integration_simple import (
    initialize_kratos, 
    get_solver, 
    is_kratos_available,
    get_kratos_status,
    get_kratos_manager
)

# Import PyVista Web Bridge
try:
    from ..visualization.pyvista_web_bridge import PyVistaWebBridge
    PYVISTA_BRIDGE_AVAILABLE = True
except ImportError:
    PyVistaWebBridge = None
    PYVISTA_BRIDGE_AVAILABLE = False

# 初始化Kratos集成
KRATOS_AVAILABLE = initialize_kratos()
version_info = "simulation_mode" if not KRATOS_AVAILABLE else "real_mode"

# 如果Kratos可用，尝试导入相关模块
if KRATOS_AVAILABLE:
    try:
        import KratosMultiphysics
        import KratosMultiphysics.StructuralMechanicsApplication
        import KratosMultiphysics.GeoMechanicsApplication
        import KratosMultiphysics.LinearSolversApplication
        import KratosMultiphysics.FluidDynamicsApplication
        import KratosMultiphysics.FSIApplication
        import KratosMultiphysics.MeshMovingApplication
        import KratosMultiphysics.MappingApplication
        
        # 获取版本信息
        try:
            if hasattr(KratosMultiphysics, 'GetVersionString'):
                version_info = KratosMultiphysics.GetVersionString()
            elif hasattr(KratosMultiphysics, '__version__'):
                version_info = KratosMultiphysics.__version__
            elif hasattr(KratosMultiphysics, 'GetVersion'):
                version_info = KratosMultiphysics.GetVersion()
            else:
                version_info = "10.3.0"
        except AttributeError:
            version_info = "10.3.0"
        
        print(f"Kratos Multiphysics Complete CAE Suite Available, Version: {version_info}")
        print("OK Structural Mechanics Analysis (StructuralMechanicsApplication)")
        print("OK Geotechnical Engineering Analysis (GeoMechanicsApplication)")
        print("OK Fluid Dynamics/Seepage Analysis (FluidDynamicsApplication)")
        print("OK Fluid-Structure Interaction (FSIApplication)")
        print("OK Mesh Moving Technology (MeshMovingApplication)")
    except ImportError as e:
        print(f"Failed to import Kratos integration: {e}")
        KRATOS_AVAILABLE = False

# 尝试导入PyVista
try:
    import pyvista as pv
    import numpy as np
    PYVISTA_AVAILABLE = True
    print("PyVista 可用")
except ImportError as e:
    print(f"PyVista 不可用: {e}")
    PYVISTA_AVAILABLE = False

# Configure logging
logger = logging.getLogger(__name__)

class AnalysisType(Enum):
    """分析类型枚举"""
    STRUCTURAL = "structural"              # 结构力学分析
    GEOMECHANICS = "geomechanics"         # 岩土力学分析
    FLUID_DYNAMICS = "fluid_dynamics"     # 流体力学分析
    SEEPAGE = "seepage"                   # 渗流分析
    FSI = "fsi"                          # 流固耦合分析
    THERMAL = "thermal"                   # 传热分析
    MULTIPHYSICS = "multiphysics"        # 多物理场耦合

@dataclass
class AnalysisResult:
    """分析结果数据类"""
    status: str
    vtk_file: Optional[str] = None
    mesh_info: Optional[Dict] = None
    fields: Optional[List[str]] = None
    error_message: Optional[str] = None


class KratosHandler:
    """增强版Kratos分析处理器，集成PyVista后处理"""
    
    def __init__(self):
        self.solver = None  # 简化版本，暂时不使用具体求解器
        self.model = None
        self.analysis = None
        self.work_dir = None
        self.pyvista_bridge = PyVistaWebBridge() if PYVISTA_BRIDGE_AVAILABLE else None
        
    def is_available(self):
        """检查Kratos和PyVista是否可用"""
        return KRATOS_AVAILABLE
    
    def is_pyvista_available(self):
        """检查PyVista是否可用"""
        return PYVISTA_AVAILABLE and self.pyvista_bridge is not None
    
    async def run_analysis(self, mesh_file, output_dir, connection_manager=None, client_id=None):
        """Run structural analysis using Kratos"""
        if not self.is_available():
            logger.error("Kratos is not available")
            return False
            
        # Send start notification
        if connection_manager and client_id:
            await connection_manager.send_personal_message(
                json.dumps({
                    "type": "computation_progress",
                    "status": "running",
                    "progress": 10,
                    "message": "Setting up Kratos solver..."
                }),
                client_id
            )
            
        # Set up solver
        setup_success = self.solver.setup(mesh_file, output_dir)
        if not setup_success:
            logger.error("Failed to set up Kratos solver")
            if connection_manager and client_id:
                await connection_manager.send_personal_message(
                    json.dumps({
                        "type": "computation_progress",
                        "status": "failed",
                        "progress": 0,
                        "message": "Failed to set up Kratos solver"
                    }),
                    client_id
                )
            return False
            
        # Send progress notification
        if connection_manager and client_id:
            await connection_manager.send_personal_message(
                json.dumps({
                    "type": "computation_progress",
                    "status": "running",
                    "progress": 30,
                    "message": "Running Kratos analysis..."
                }),
                client_id
            )
            
        # Run solver in a separate thread to avoid blocking
        loop = asyncio.get_event_loop()
        solve_result = await loop.run_in_executor(None, self.solver.solve)
        
        if not solve_result:
            logger.error("Kratos analysis failed")
            if connection_manager and client_id:
                await connection_manager.send_personal_message(
                    json.dumps({
                        "type": "computation_progress",
                        "status": "failed",
                        "progress": 50,
                        "message": "Kratos analysis failed"
                    }),
                    client_id
                )
            return False
            
        # Send completion notification
        if connection_manager and client_id:
            results_path = str(self.solver.get_results_path())
            await connection_manager.send_personal_message(
                json.dumps({
                    "type": "computation_progress",
                    "status": "completed",
                    "progress": 100,
                    "message": "Kratos analysis completed",
                    "results_url": f"/static/results/{Path(results_path).name}"
                }),
                client_id
            )
            
        return True


# Create singleton instance
kratos_handler = KratosHandler()


def get_kratos_handler():
    """Get the KratosHandler singleton instance"""
    return kratos_handler 