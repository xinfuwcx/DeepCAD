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

# Add core directory to Python path for Kratos integration
sys.path.append(str(Path(__file__).parent.parent.parent.parent / "core"))

# 添加Kratos路径
KRATOS_BUILD_PATH = "/mnt/e/DeepCAD/core/kratos_source/kratos/build/Release"
sys.path.append(KRATOS_BUILD_PATH)
sys.path.append(os.path.join(KRATOS_BUILD_PATH, "kratos"))

try:
    # We import get_kratos_integration for side effects (initialization)
    from kratos_integration import get_kratos_integration  # noqa
    from kratos_solver import StructuralSolver
    
    # 尝试导入Kratos核心模块
    import KratosMultiphysics
    import KratosMultiphysics.StructuralMechanicsApplication
    import KratosMultiphysics.GeoMechanicsApplication
    import KratosMultiphysics.LinearSolversApplication
    KRATOS_AVAILABLE = True
    print(f"Kratos Multiphysics 可用，版本: {KratosMultiphysics.GetVersionString()}")
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
    STRUCTURAL = "structural"
    GEOMECHANICS = "geomechanics" 
    SEEPAGE = "seepage"
    THERMAL = "thermal"

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
        self.solver = StructuralSolver() if KRATOS_AVAILABLE else None
        self.model = None
        self.analysis = None
        self.work_dir = None
        self.pyvista_bridge = PyVistaWebBridge() if PYVISTA_AVAILABLE else None
        
    def is_available(self):
        """检查Kratos和PyVista是否可用"""
        return KRATOS_AVAILABLE and (self.solver and self.solver.is_available())
    
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