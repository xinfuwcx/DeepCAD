"""
Kratos Multiphysics Integration Module for DeepCAD

This module provides the necessary utilities to integrate Kratos Multiphysics
into the DeepCAD application for structural analysis and simulation.
"""

import os
import sys
import logging
from pathlib import Path
from .kratos_utils import safe_get_kratos_version, safe_get_kratos_path, safe_check_kratos_application

# Configure logging
logger = logging.getLogger(__name__)

class KratosIntegration:
    """Main class for Kratos integration with DeepCAD"""
    
    def __init__(self):
        self.kratos_path = self._find_kratos_path()
        self.initialized = False
        
        if self.kratos_path:
            self._initialize_kratos()
        else:
            logger.error("Kratos path not found. Please ensure Kratos is properly installed.")
    
    def _find_kratos_path(self):
        """Find the Kratos installation path"""
        # Try to find Kratos in the project directory
        base_dir = Path(__file__).parent.parent
        possible_paths = [
            base_dir / "core" / "kratos_source" / "kratos" / "bin" / "Release",
            base_dir / "core" / "kratos_source" / "kratos" / "bin" / "Debug",
        ]
        
        for path in possible_paths:
            kratos_init = path / "KratosMultiphysics" / "__init__.py"
            if kratos_init.exists():
                logger.info(f"Found Kratos at: {path}")
                return path
                
        # If not found in project directory, check if it's in the Python path
        try:
            import KratosMultiphysics
            # 使用安全工具获取Kratos路径
            kratos_path_str = safe_get_kratos_path(KratosMultiphysics)
            if kratos_path_str:
                kratos_path = Path(kratos_path_str).parent if Path(kratos_path_str).is_file() else Path(kratos_path_str)
                logger.info(f"Found Kratos in Python path: {kratos_path}")
                return kratos_path
            else:
                logger.warning("Kratos found but path could not be determined")
                return None
        except ImportError:
            logger.warning("KratosMultiphysics not found in Python path")
            return None
    
    def _initialize_kratos(self):
        """Initialize Kratos by adding it to the Python path"""
        if self.kratos_path:
            # Add Kratos to Python path if not already there
            kratos_path_str = str(self.kratos_path)
            if kratos_path_str not in sys.path:
                sys.path.append(kratos_path_str)
                logger.info(f"Added Kratos to Python path: {kratos_path_str}")
            
            # Try to import Kratos to verify it works
            try:
                import KratosMultiphysics
                self.initialized = True
                
                # 使用安全工具获取Kratos版本信息
                version_info = safe_get_kratos_version(KratosMultiphysics)
                logger.info(f"Successfully initialized Kratos Multiphysics v{version_info}")
            except ImportError as e:
                logger.error(f"Failed to import KratosMultiphysics: {e}")
                self.initialized = False
    
    def is_available(self):
        """Check if Kratos is available and initialized"""
        return self.initialized
    
    def get_available_applications(self):
        """Get a list of available Kratos applications"""
        if not self.initialized:
            logger.error("Kratos not initialized")
            return []
        
        try:
            import KratosMultiphysics
            applications = []
            
            # 使用安全工具检查常见应用
            common_apps = [
                "StructuralMechanicsApplication",
                "FluidDynamicsApplication", 
                "GeoMechanicsApplication",
                "LinearSolversApplication",
                "FSIApplication",
                "OptimizationApplication"
            ]
            
            for app in common_apps:
                if safe_check_kratos_application(KratosMultiphysics, app):
                    applications.append(app)
                    if app == "GeoMechanicsApplication":
                        logger.info("GeoMechanicsApplication is available")
            
            if "GeoMechanicsApplication" not in applications:
                logger.warning("GeoMechanicsApplication not found or not properly installed")
            
            return applications
        except ImportError:
            logger.error("Failed to import KratosMultiphysics")
            return []
    
    def create_structural_solver(self, model_part_file, parameters):
        """Create a structural solver for the given model part and parameters"""
        if not self.initialized:
            logger.error("Kratos not initialized")
            return None
        
        try:
            import KratosMultiphysics
            import KratosMultiphysics.StructuralMechanicsApplication
            
            # Create a Kratos Model
            model = KratosMultiphysics.Model()
            
            # Create solver instance
            solver_settings = KratosMultiphysics.Parameters(parameters)
            solver = KratosMultiphysics.StructuralMechanicsApplication.StructuralMechanicsAnalysis(model, solver_settings)
            
            return solver
        except ImportError as e:
            logger.error(f"Failed to create structural solver: {e}")
            return None
        except Exception as e:
            logger.error(f"Error creating structural solver: {e}")
            return None

# Create a singleton instance
kratos_integration = KratosIntegration()

def get_kratos_integration():
    """Get the KratosIntegration singleton instance"""
    return kratos_integration 