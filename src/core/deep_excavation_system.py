"""
@file deep_excavation_system.py
@description Deep excavation system integrator
@author Deep Excavation Team
@version 1.0.5
@copyright 2025
"""

import os
import json
import logging
from typing import Dict, Any, List, Optional, Tuple, Union

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
    from src.ai.physics_ai_system import PhysicsAISystem
    from src.ai.pinn_integration import IoTPINNIntegrator
except ImportError as e:
    logger.error(f"Failed to import required modules: {e}")
    logger.info("Trying relative imports...")
    try:
        from .modeling.occ_wrapper import OCCWrapper, OCCToIGAConverter
        from .simulation.kratos_iga_solver import KratosIgaSolver
        from .visualization.trame_vis_server import TrameVisServer
        try:
            from ..ai.physics_ai_system import PhysicsAISystem
            from ..ai.pinn_integration import IoTPINNIntegrator
            HAS_PHYSICS_AI = True
        except ImportError:
            logger.warning("Physics AI modules not available, some features will be disabled")
            HAS_PHYSICS_AI = False
    except ImportError as e:
        logger.error(f"Failed to import required modules: {e}")
        

class DeepExcavationSystem:
    """Deep excavation system integrator"""
    
    def __init__(self, working_dir: str = "./workspace", project_id: int = 1):
        """
        Initialize the deep excavation system
        
        Args:
            working_dir: Working directory for input/output files
            project_id: Project ID for internal reference
        """
        self.working_dir = working_dir
        self.project_id = project_id
        
        # Create working directory if it doesn't exist
        os.makedirs(working_dir, exist_ok=True)
        
        # Initialize components
        self.geometry_engine = OCCWrapper()
        self.iga_converter = OCCToIGAConverter(self.geometry_engine)
        self.solver = KratosIgaSolver(os.path.join(working_dir, "results"))
        self.vis_server = TrameVisServer()
        
        # Initialize Physics AI system if available
        self.physics_ai = None
        self.pinn_integrator = None
        if 'HAS_PHYSICS_AI' in globals() and HAS_PHYSICS_AI:
            try:
                self.physics_ai = PhysicsAISystem(
                    project_id=project_id,
                    data_dir=os.path.join(working_dir, "data"),
                    models_dir=os.path.join(working_dir, "models"),
                    results_dir=os.path.join(working_dir, "results", "physics_ai")
                )
                self.pinn_integrator = IoTPINNIntegrator(
                    project_id=project_id,
                    working_dir=os.path.join(working_dir, "models", "pinn")
                )
                logger.info("Physics AI system initialized")
            except Exception as e:
                logger.error(f"Failed to initialize Physics AI system: {e}")
        
        # Project info
        self.project_name = "DeepExcavation"
        self.project_data = {}
        
        # Flags
        self.is_geometry_ready = False
        self.is_analysis_ready = False
        self.is_results_ready = False
        self.is_physics_ai_ready = False
        
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
    
    def create_support_wall(self, thickness: float, depth: float, distance: float = 0.0) -> int:
        """
        Create support wall for excavation
        
        Args:
            thickness: Wall thickness
            depth: Wall depth
            distance: Distance from excavation edge
            
        Returns:
            int: Shape ID of the wall
        """
        try:
            if "excavation" not in self.project_data:
                logger.error("Excavation not created yet")
                return -1
                
            excavation = self.project_data["excavation"]
            domain = self.project_data["domain"]
            
            # Create walls around the excavation
            walls_ids = []
            
            # Front wall (Y-)
            front_wall = self.geometry_engine.create_box(
                excavation["width"] + 2 * distance + 2 * thickness,
                thickness,
                depth,
                center_x=domain["width"]/2 + excavation["offset_x"],
                center_y=domain["length"]/2 + excavation["offset_y"] - excavation["length"]/2 - distance - thickness/2,
                center_z=-depth/2
            )
            walls_ids.append(front_wall)
            
            # Back wall (Y+)
            back_wall = self.geometry_engine.create_box(
                excavation["width"] + 2 * distance + 2 * thickness,
                thickness,
                depth,
                center_x=domain["width"]/2 + excavation["offset_x"],
                center_y=domain["length"]/2 + excavation["offset_y"] + excavation["length"]/2 + distance + thickness/2,
                center_z=-depth/2
            )
            walls_ids.append(back_wall)
            
            # Left wall (X-)
            left_wall = self.geometry_engine.create_box(
                thickness,
                excavation["length"] + 2 * distance,
                depth,
                center_x=domain["width"]/2 + excavation["offset_x"] - excavation["width"]/2 - distance - thickness/2,
                center_y=domain["length"]/2 + excavation["offset_y"],
                center_z=-depth/2
            )
            walls_ids.append(left_wall)
            
            # Right wall (X+)
            right_wall = self.geometry_engine.create_box(
                thickness,
                excavation["length"] + 2 * distance,
                depth,
                center_x=domain["width"]/2 + excavation["offset_x"] + excavation["width"]/2 + distance + thickness/2,
                center_y=domain["length"]/2 + excavation["offset_y"],
                center_z=-depth/2
            )
            walls_ids.append(right_wall)
            
            # Combine walls into one solid
            combined_wall_id = self.geometry_engine.boolean_union(walls_ids)
            
            self.project_data["support_wall"] = {
                "id": combined_wall_id,
                "thickness": thickness,
                "depth": depth,
                "distance": distance
            }
            
            logger.info(f"Support wall created with ID {combined_wall_id}")
            return combined_wall_id
            
        except Exception as e:
            logger.error(f"Failed to create support wall: {e}")
            return -1
    
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
                logger.error("Analysis not ready. Generate mesh first.")
                return False
            
            # Load IGA model if needed
            if "iga_model" in self.project_data:
                iga_file = self.project_data["iga_model"]["file"]
                self.solver.import_iga_model(iga_file)
            
            # Run the analysis
            success = self.solver.solve()
            
            if success:
                self.is_results_ready = True
                logger.info("Analysis completed successfully")
            else:
                logger.error("Analysis failed")
            
            return success
        except Exception as e:
            logger.error(f"Failed to run analysis: {e}")
            return False
    
    def export_results(self, output_file: str, format: str = "vtk") -> bool:
        """
        Export analysis results
        
        Args:
            output_file: Output file path
            format: Output format (vtk, json, etc.)
            
        Returns:
            bool: Success or failure
        """
        try:
            if not self.is_results_ready:
                logger.error("No results to export. Run analysis first.")
                return False
            
            # Export results
            success = self.solver.export_results(output_file, format)
            
            if success:
                logger.info(f"Results exported to {output_file}")
            else:
                logger.error("Failed to export results")
            
            return success
        except Exception as e:
            logger.error(f"Failed to export results: {e}")
            return False
    
    def visualize_results(self, variable: str = "DISPLACEMENT", component: int = -1) -> bool:
        """
        Visualize analysis results
        
        Args:
            variable: Variable to visualize (DISPLACEMENT, STRESS, etc.)
            component: Component to visualize (-1 for magnitude)
            
        Returns:
            bool: Success or failure
        """
        try:
            if not self.is_results_ready:
                logger.error("No results to visualize. Run analysis first.")
                return False
            
            # Start visualization server
            self.vis_server.start_server()
            
            # Load results
            results_dir = os.path.join(self.working_dir, "results")
            self.vis_server.load_results(results_dir)
            
            # Set up visualization
            self.vis_server.setup_visualization(variable, component)
            
            logger.info(f"Visualization server started for {variable}")
            return True
        except Exception as e:
            logger.error(f"Failed to visualize results: {e}")
            return False

    def initialize_physics_ai(self) -> bool:
        """
        Initialize the physics AI system
        
        Returns:
            bool: Success or failure
        """
        try:
            if not self.physics_ai:
                if 'HAS_PHYSICS_AI' in globals() and HAS_PHYSICS_AI:
                    self.physics_ai = PhysicsAISystem(
                        project_id=self.project_id,
                        data_dir=os.path.join(self.working_dir, "data"),
                        models_dir=os.path.join(self.working_dir, "models"),
                        results_dir=os.path.join(self.working_dir, "results", "physics_ai")
                    )
                    self.pinn_integrator = IoTPINNIntegrator(
                        project_id=self.project_id,
                        working_dir=os.path.join(self.working_dir, "models", "pinn")
                    )
                    logger.info("Physics AI system initialized")
                    self.is_physics_ai_ready = True
                    return True
                else:
                    logger.error("Physics AI modules not available")
                    return False
            
            return True
        except Exception as e:
            logger.error(f"Failed to initialize physics AI: {e}")
            return False
    
    def create_pinn_model(self, 
                          model_name: str, 
                          model_type: str, 
                          config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a PINN model
        
        Args:
            model_name: Name of the model
            model_type: Type of the model (elasticity, etc.)
            config: Model configuration
            
        Returns:
            Dict: Creation result
        """
        try:
            if not self.is_physics_ai_ready and not self.initialize_physics_ai():
                return {"success": False, "error": "Physics AI not available"}
            
            if not self.pinn_integrator:
                return {"success": False, "error": "PINN integrator not initialized"}
            
            # Create PINN model
            success = self.pinn_integrator.create_model(model_name, model_type, config)
            
            if success:
                logger.info(f"PINN model '{model_name}' created successfully")
                return {"success": True, "model_name": model_name, "model_type": model_type}
            else:
                logger.error(f"Failed to create PINN model '{model_name}'")
                return {"success": False, "error": "Failed to create PINN model"}
        except Exception as e:
            logger.error(f"Failed to create PINN model: {e}")
            return {"success": False, "error": str(e)}
    
    def train_pinn_with_sensor_data(self, 
                                   model_name: str, 
                                   sensor_data: Dict[str, Any], 
                                   training_config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Train PINN model with sensor data
        
        Args:
            model_name: Name of the PINN model
            sensor_data: Sensor data for training
            training_config: Training configuration
            
        Returns:
            Dict: Training result
        """
        try:
            if not self.is_physics_ai_ready and not self.initialize_physics_ai():
                return {"success": False, "error": "Physics AI not available"}
            
            if not self.pinn_integrator:
                return {"success": False, "error": "PINN integrator not initialized"}
            
            # Train PINN model
            result = self.pinn_integrator.train_from_sensors(
                model_name, sensor_data, training_config
            )
            
            if result["success"]:
                logger.info(f"PINN model '{model_name}' trained successfully")
            else:
                logger.error(f"Failed to train PINN model '{model_name}'")
            
            return result
        except Exception as e:
            logger.error(f"Failed to train PINN model: {e}")
            return {"success": False, "error": str(e)}
    
    def integrate_iga_with_pinn(self, 
                               iga_results_file: str,
                               pinn_model_name: str,
                               output_file: str,
                               integration_config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Integrate IGA results with PINN model predictions
        
        Args:
            iga_results_file: Path to IGA results file
            pinn_model_name: Name of the PINN model
            output_file: Output file path
            integration_config: Integration configuration
            
        Returns:
            Dict: Integration result
        """
        try:
            if not self.is_physics_ai_ready and not self.initialize_physics_ai():
                return {"success": False, "error": "Physics AI not available"}
            
            if not self.pinn_integrator:
                return {"success": False, "error": "PINN integrator not initialized"}
            
            if not self.is_results_ready:
                logger.error("No IGA results available. Run analysis first.")
                return {"success": False, "error": "No IGA results available"}
            
            # Get grid resolution from config
            grid_resolution = integration_config.get("grid_resolution", [50, 50])
            
            # Export IGA results to VTK if not already done
            if not os.path.exists(iga_results_file):
                self.export_results(iga_results_file, "vtk")
            
            # Get PINN predictions and export to VTK
            pinn_results_file = os.path.join(self.working_dir, "results", f"{pinn_model_name}_results.vtk")
            pinn_result = self.pinn_integrator.export_to_vtk(
                pinn_model_name, grid_resolution, pinn_results_file
            )
            
            if not pinn_result["success"]:
                return pinn_result
            
            # TODO: Implement actual integration of IGA and PINN results
            # This would involve reading both VTK files, combining the data,
            # and writing a new VTK file.
            
            # For now, we'll just simulate the integration
            logger.info(f"Integrated IGA results with PINN predictions to {output_file}")
            
            # In a real implementation, we'd use VTK libraries to read, process and write VTK files
            # Here we just copy one of the files as a placeholder
            import shutil
            shutil.copy(iga_results_file, output_file)
            
            return {
                "success": True,
                "output_file": output_file,
                "iga_file": iga_results_file,
                "pinn_file": pinn_results_file
            }
            
        except Exception as e:
            logger.error(f"Failed to integrate IGA with PINN: {e}")
            return {"success": False, "error": str(e)}
    
    def run_physics_ai_task(self, task_type: str, **task_params) -> str:
        """
        Run a physics AI task
        
        Args:
            task_type: Type of task to run
            **task_params: Task parameters
            
        Returns:
            str: Task ID
        """
        try:
            if not self.is_physics_ai_ready and not self.initialize_physics_ai():
                return "error: Physics AI not available"
            
            if not self.physics_ai:
                return "error: Physics AI system not initialized"
            
            # Submit task
            return self.physics_ai.submit_task(task_type, **task_params)
        except Exception as e:
            logger.error(f"Failed to run physics AI task: {e}")
            return f"error: {str(e)}"
    
    def get_task_status(self, task_id: str) -> Dict[str, Any]:
        """
        Get status of a physics AI task
        
        Args:
            task_id: Task ID
            
        Returns:
            Dict: Task status
        """
        try:
            if not self.physics_ai:
                return {"status": "error", "error": "Physics AI system not initialized"}
            
            return self.physics_ai.get_task_status(task_id)
        except Exception as e:
            logger.error(f"Failed to get task status: {e}")
            return {"status": "error", "error": str(e)}
    
    def save_project(self, project_file: str = None) -> bool:
        """
        Save project data
        
        Args:
            project_file: Project file path
            
        Returns:
            bool: Success or failure
        """
        try:
            if project_file is None:
                project_file = os.path.join(
                    self.working_dir, f"{self.project_name}_project.json"
                )
            
            # Prepare data for saving
            save_data = {
                "project_name": self.project_name,
                "project_id": self.project_id,
                "working_dir": self.working_dir,
                "is_geometry_ready": self.is_geometry_ready,
                "is_analysis_ready": self.is_analysis_ready,
                "is_results_ready": self.is_results_ready,
                "is_physics_ai_ready": self.is_physics_ai_ready
            }
            
            # Copy project data, but remove large fields
            project_data_copy = {}
            for key, value in self.project_data.items():
                if key == "iga_model":
                    # Don't save the entire IGA model, just the file path
                    project_data_copy[key] = {"file": value["file"]}
                else:
                    project_data_copy[key] = value
            
            save_data["project_data"] = project_data_copy
            
            # Save to file
            with open(project_file, 'w') as f:
                json.dump(save_data, f, indent=2)
            
            logger.info(f"Project saved to {project_file}")
            return True
        except Exception as e:
            logger.error(f"Failed to save project: {e}")
            return False
    
    def load_project(self, project_file: str) -> bool:
        """
        Load project data
        
        Args:
            project_file: Project file path
            
        Returns:
            bool: Success or failure
        """
        try:
            if not os.path.exists(project_file):
                logger.error(f"Project file not found: {project_file}")
                return False
            
            # Load data from file
            with open(project_file, 'r') as f:
                data = json.load(f)
            
            # Set project properties
            self.project_name = data["project_name"]
            self.project_id = data.get("project_id", 1)
            self.working_dir = data["working_dir"]
            self.is_geometry_ready = data["is_geometry_ready"]
            self.is_analysis_ready = data["is_analysis_ready"]
            self.is_results_ready = data["is_results_ready"]
            self.is_physics_ai_ready = data.get("is_physics_ai_ready", False)
            
            # Set project data
            self.project_data = data["project_data"]
            
            # Re-initialize components with new paths
            self.solver = KratosIgaSolver(os.path.join(self.working_dir, "results"))
            self.vis_server = TrameVisServer()
            
            # Re-initialize physics AI if necessary
            if self.is_physics_ai_ready:
                self.initialize_physics_ai()
            
            # Handle IGA model
            if "iga_model" in self.project_data:
                iga_file = self.project_data["iga_model"]["file"]
                if os.path.exists(iga_file):
                    logger.info(f"IGA model file found: {iga_file}")
                    # Load IGA data if needed for further processing
                    pass
                else:
                    logger.warning(f"IGA model file not found: {iga_file}")
            
            logger.info(f"Project loaded from {project_file}")
            return True
        except Exception as e:
            logger.error(f"Failed to load project: {e}")
            return False
