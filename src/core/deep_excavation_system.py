"""
@file deep_excavation_system.py
@description Deep excavation system integrator
@author Deep Excavation Team
@version 1.0.0
@copyright 2025
"""

import os
import sys
import json
import logging
import tempfile
from typing import Dict, Any, List, Optional, Tuple, Union
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("DeepExcavationSystem")

# Import system components
try:
    from src.core.modeling.occ_wrapper import OCCWrapper, OCCToIGAConverter
    from src.core.simulation.kratos_iga_solver import KratosIgaSolver
    from src.core.visualization.trame_vis_server import TrameVisServer
except ImportError as e:
    logger.error(f"Failed to import required modules: {e}")
    logger.info("Trying relative imports...")
    try:
        from .modeling.occ_wrapper import OCCWrapper, OCCToIGAConverter
        from .simulation.kratos_iga_solver import KratosIgaSolver
        from .visualization.trame_vis_server import TrameVisServer
    except ImportError as e:
        logger.error(f"Failed to import required modules: {e}")
        

class DeepExcavationSystem:
    """Deep excavation system integrator"""
    
    def __init__(self, working_dir: str = "./workspace"):
        """
        Initialize the deep excavation system
        
        Args:
            working_dir: Working directory for input/output files
        """
        self.working_dir = working_dir
        
        # Create working directory if it doesn't exist
        os.makedirs(working_dir, exist_ok=True)
        
        # Initialize components
        self.geometry_engine = OCCWrapper()
        self.iga_converter = OCCToIGAConverter(self.geometry_engine)
        self.solver = KratosIgaSolver(os.path.join(working_dir, "results"))
        self.vis_server = TrameVisServer()
        
        # Project info
        self.project_name = "DeepExcavation"
        self.project_data = {}
        
        # Flags
        self.is_geometry_ready = False
        self.is_analysis_ready = False
        self.is_results_ready = False
        
        logger.info("Deep Excavation System initialized")
    
    def set_project_name(self, name: str) -> None:
        """Set project name"""
        self.project_name = name
        logger.info(f"Project name set to: {name}")
    
    def create_domain(self, width: float, length: float, depth: float) -> int:
        """
        Create computational domain
        
        Args:
            width: Width in X direction
            length: Length in Y direction
            depth: Depth in Z direction
            
        Returns:
            int: Shape ID of the domain
        """
        try:
            domain_id = self.geometry_engine.create_box(
                width, length, depth, 
                center_x=width/2, 
                center_y=length/2, 
                center_z=-depth/2
            )
            
            self.project_data["domain"] = {
                "id": domain_id,
                "width": width,
                "length": length,
                "depth": depth
            }
            
            self.is_geometry_ready = True
            logger.info(f"Domain created with ID {domain_id}")
            return domain_id
        except Exception as e:
            logger.error(f"Failed to create domain: {e}")
            return -1
    
    def create_excavation(self, width: float, length: float, depth: float,
                         offset_x: float = 0, offset_y: float = 0) -> int:
        """
        Create excavation geometry
        
        Args:
            width: Width in X direction
            length: Length in Y direction
            depth: Depth in Z direction
            offset_x: X offset from domain center
            offset_y: Y offset from domain center
            
        Returns:
            int: Shape ID of the excavation
        """
        try:
            if "domain" not in self.project_data:
                logger.error("Domain not created yet")
                return -1
                
            domain = self.project_data["domain"]
            
            # Create excavation box
            excavation_id = self.geometry_engine.create_box(
                width, length, depth,
                center_x=domain["width"]/2 + offset_x,
                center_y=domain["length"]/2 + offset_y, 
                center_z=-depth/2
            )
            
            # Cut excavation from domain
            result_id = self.geometry_engine.boolean_cut(
                domain["id"], excavation_id
            )
            
            self.project_data["excavation"] = {
                "id": result_id,
                "width": width,
                "length": length,
                "depth": depth,
                "offset_x": offset_x,
                "offset_y": offset_y
            }
            
            logger.info(f"Excavation created with resulting ID {result_id}")
            return result_id
        except Exception as e:
            logger.error(f"Failed to create excavation: {e}")
            return -1
    
    def create_support_wall(self, thickness: float, depth: float) -> int:
        """
        Create support wall for excavation
        
        Args:
            thickness: Wall thickness
            depth: Wall depth
            
        Returns:
            int: Shape ID of the wall
        """
        # Implementation depends on specific wall design
        pass
    
    def set_soil_layers(self, layers: List[Dict[str, Any]]) -> bool:
        """
        Set soil layers with properties
        
        Args:
            layers: List of soil layers with properties
            
        Returns:
            bool: Success or failure
        """
        try:
            self.project_data["soil_layers"] = layers
            logger.info(f"Set {len(layers)} soil layers")
            return True
        except Exception as e:
            logger.error(f"Failed to set soil layers: {e}")
            return False
    
    def generate_mesh(self) -> bool:
        """
        Generate mesh for analysis
        
        Returns:
            bool: Success or failure
        """
        try:
            # For IGA, we don't need traditional mesh
            # Just export geometry to IGA format
            
            if "excavation" not in self.project_data:
                logger.error("Excavation not created yet")
                return False
                
            excavation_id = self.project_data["excavation"]["id"]
            
            # Export IGA model
            iga_data = self.iga_converter.convert_surface_to_iga(excavation_id)
            iga_file = os.path.join(self.working_dir, f"{self.project_name}_iga_model.txt")
            self.iga_converter.export_iga_input_file(excavation_id, iga_file)
            
            self.project_data["iga_model"] = {
                "file": iga_file,
                "data": iga_data
            }
            
            self.is_analysis_ready = True
            logger.info(f"IGA model generated and saved to {iga_file}")
            return True
        except Exception as e:
            logger.error(f"Failed to generate mesh: {e}")
            return False
    
    def set_analysis_parameters(self, params: Dict[str, Any]) -> bool:
        """
        Set analysis parameters
        
        Args:
            params: Analysis parameters
            
        Returns:
            bool: Success or failure
        """
        try:
            # Set solver parameters
            success = self.solver.set_parameters(params)
            
            if success:
                self.project_data["analysis_params"] = params
                logger.info("Analysis parameters set successfully")
            
            return success
        except Exception as e:
            logger.error(f"Failed to set analysis parameters: {e}")
            return False
    
    def run_analysis(self) -> bool:
        """
        Run the analysis
        
        Returns:
            bool: Success or failure
        """
        try:
            if not self.is_analysis_ready:
                logger.error("Analysis is not ready. Generate mesh first.")
                return False
                
            # Import IGA model
            iga_file = self.project_data["iga_model"]["file"]
            self.solver.import_iga_model(iga_file)
            
            # Set material properties
            if "soil_layers" in self.project_data:
                material_props = {
                    "YOUNG_MODULUS": self.project_data["soil_layers"][0].get("young_modulus", 30000),
                    "POISSON_RATIO": self.project_data["soil_layers"][0].get("poisson_ratio", 0.3),
                    "DENSITY": self.project_data["soil_layers"][0].get("density", 2000)
                }
                self.solver.set_material_properties(material_props)
            
            # Run analysis
            success = self.solver.solve()
            
            if success:
                self.is_results_ready = True
                logger.info("Analysis completed successfully")
            
            return success
        except Exception as e:
            logger.error(f"Failed to run analysis: {e}")
            return False
    
    def export_results(self, output_file: str, format: str = "vtk") -> bool:
        """
        Export analysis results
        
        Args:
            output_file: Output file path
            format: Output format (e.g., "vtk", "json")
            
        Returns:
            bool: Success or failure
        """
        try:
            if not self.is_results_ready:
                logger.error("No results available. Run analysis first.")
                return False
                
            # Export results
            success = self.solver.export_results(output_file, format)
            
            if success:
                self.project_data["results_file"] = output_file
                logger.info(f"Results exported to {output_file}")
            
            return success
        except Exception as e:
            logger.error(f"Failed to export results: {e}")
            return False
    
    def visualize_results(self) -> bool:
        """
        Visualize results using Trame server
        
        Returns:
            bool: Success or failure
        """
        try:
            if not self.is_results_ready or "results_file" not in self.project_data:
                logger.error("No results available. Run analysis and export results first.")
                return False
                
            # Load results in visualization server
            results_file = self.project_data["results_file"]
            self.vis_server.load_result_file(results_file)
            
            # Start server
            self.vis_server.start_server()
            
            logger.info("Visualization server started")
            return True
        except Exception as e:
            logger.error(f"Failed to visualize results: {e}")
            return False
    
    def save_project(self, project_file: str = None) -> bool:
        """
        Save project data to file
        
        Args:
            project_file: Project file path
            
        Returns:
            bool: Success or failure
        """
        try:
            if project_file is None:
                project_file = os.path.join(self.working_dir, f"{self.project_name}.json")
                
            # Save project data
            save_data = {
                "project_name": self.project_name,
                "working_dir": self.working_dir,
                "data": {}
            }
            
            # Filter out non-serializable objects
            for key, value in self.project_data.items():
                if isinstance(value, dict):
                    save_data["data"][key] = {
                        k: v for k, v in value.items() 
                        if isinstance(v, (str, int, float, list, dict, bool)) 
                        or v is None
                    }
                else:
                    if isinstance(value, (str, int, float, list, dict, bool)) or value is None:
                        save_data["data"][key] = value
            
            with open(project_file, 'w') as f:
                json.dump(save_data, f, indent=4)
                
            logger.info(f"Project saved to {project_file}")
            return True
        except Exception as e:
            logger.error(f"Failed to save project: {e}")
            return False
    
    def load_project(self, project_file: str) -> bool:
        """
        Load project data from file
        
        Args:
            project_file: Project file path
            
        Returns:
            bool: Success or failure
        """
        try:
            with open(project_file, 'r') as f:
                load_data = json.load(f)
                
            self.project_name = load_data["project_name"]
            self.working_dir = load_data["working_dir"]
            self.project_data = load_data["data"]
            
            # Check if key components exist
            self.is_geometry_ready = "domain" in self.project_data and "excavation" in self.project_data
            self.is_analysis_ready = "iga_model" in self.project_data
            self.is_results_ready = "results_file" in self.project_data
            
            logger.info(f"Project loaded from {project_file}")
            return True
        except Exception as e:
            logger.error(f"Failed to load project: {e}")
            return False
