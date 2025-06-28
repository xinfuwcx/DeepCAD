"""
@file test_deep_excavation_system.py
@description Test script for deep excavation system
@author Deep Excavation Team
@version 1.0.0
@copyright 2025
"""

import os
import sys
import logging
import time
from typing import Dict, Any, List

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("deep_excavation_test.log")
    ]
)
logger = logging.getLogger("DeepExcavationTest")

# Add src to path
sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))

# Import system
from src.core.deep_excavation_system import DeepExcavationSystem


def main():
    """Main function to test deep excavation system"""
    logger.info("Starting Deep Excavation System test")
    
    # Create test workspace
    workspace_dir = "./test_workspace"
    os.makedirs(workspace_dir, exist_ok=True)
    
    # Initialize system
    system = DeepExcavationSystem(workspace_dir)
    system.set_project_name("TestProject")
    
    # Create domain and excavation
    logger.info("Creating domain and excavation geometries")
    domain_id = system.create_domain(width=100.0, length=100.0, depth=50.0)
    
    if domain_id < 0:
        logger.error("Failed to create domain")
        return
    
    excavation_id = system.create_excavation(width=30.0, length=20.0, depth=15.0)
    
    if excavation_id < 0:
        logger.error("Failed to create excavation")
        return
    
    # Set soil layers
    logger.info("Setting soil layers")
    soil_layers = [
        {
            "name": "Layer 1",
            "thickness": 10.0,
            "young_modulus": 30000,  # Pa
            "poisson_ratio": 0.3,
            "density": 2000,  # kg/m3
            "friction_angle": 30,  # degrees
            "cohesion": 10000  # Pa
        },
        {
            "name": "Layer 2",
            "thickness": 15.0,
            "young_modulus": 50000,  # Pa
            "poisson_ratio": 0.25,
            "density": 2200,  # kg/m3
            "friction_angle": 35,  # degrees
            "cohesion": 15000  # Pa
        },
        {
            "name": "Layer 3",
            "thickness": 25.0,
            "young_modulus": 80000,  # Pa
            "poisson_ratio": 0.2,
            "density": 2500,  # kg/m3
            "friction_angle": 40,  # degrees
            "cohesion": 20000  # Pa
        }
    ]
    
    system.set_soil_layers(soil_layers)
    
    # Generate mesh
    logger.info("Generating mesh for analysis")
    if not system.generate_mesh():
        logger.error("Failed to generate mesh")
        return
        
    # Set analysis parameters
    logger.info("Setting analysis parameters")
    params = system.solver.generate_default_parameters()
    
    # Set problem data
    params["problem_data"]["problem_name"] = "excavation_test"
    params["problem_data"]["start_time"] = 0.0
    params["problem_data"]["end_time"] = 1.0
    
    # Set solver settings
    params["solver_settings"]["solver_type"] = "static"
    params["solver_settings"]["model_part_name"] = "IgaModelPart"
    params["solver_settings"]["domain_size"] = 3
    
    system.set_analysis_parameters(params)
    
    # Run analysis
    logger.info("Running analysis")
    success = system.run_analysis()
    
    if not success:
        logger.error("Analysis failed")
        return
        
    # Export results
    logger.info("Exporting results")
    result_file = os.path.join(workspace_dir, "results/excavation_results.vtk")
    system.export_results(result_file)
    
    # Save project
    logger.info("Saving project")
    system.save_project()
    
    # Try visualization
    logger.info("Starting visualization server (press Ctrl+C to exit)")
    try:
        system.visualize_results()
        
        # Keep server running for 60 seconds
        for i in range(60):
            time.sleep(1)
            if i % 10 == 0:
                logger.info(f"Visualization server running... {i}/60 seconds")
                
    except KeyboardInterrupt:
        logger.info("Test interrupted by user")
    except Exception as e:
        logger.error(f"Visualization error: {e}")
    finally:
        logger.info("Test completed")


if __name__ == "__main__":
    main()
