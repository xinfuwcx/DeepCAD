#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
@file excavation_case.py
@description Deep excavation case study using IGA analysis and Physics AI
@author Deep Excavation Team
@version 1.5.0
@copyright 2025
"""

import os
import sys
import json
import argparse
import time
import logging
import numpy as np
from pathlib import Path

# Add project root to path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("ExcavationCase")

# Import the deep excavation system
try:
    from src.core.deep_excavation_system import DeepExcavationSystem
except ImportError as e:
    logger.error(f"Failed to import required modules: {e}")
    sys.exit(1)


def load_config(config_file):
    """Load configuration from file"""
    try:
        with open(config_file, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        logger.error(f"Configuration file not found: {config_file}")
        # Create default configuration
        default_config = {
            "project": {
                "name": "ExcavationCase",
                "working_dir": os.path.join(project_root, "workspace"),
                "project_id": 1
            },
            "geometry": {
                "domain": {
                    "width": 100.0,
                    "length": 100.0,
                    "depth": 30.0
                },
                "excavation": {
                    "width": 20.0,
                    "length": 30.0,
                    "depth": 10.0,
                    "offset_x": 0.0,
                    "offset_y": 0.0
                },
                "support_wall": {
                    "thickness": 0.5,
                    "depth": 15.0,
                    "distance": 0.5
                }
            },
            "materials": [
                {
                    "name": "Soil",
                    "type": "MohrCoulomb",
                    "young_modulus": 30000000.0,
                    "poisson_ratio": 0.3,
                    "density": 1900.0,
                    "friction_angle": 30.0,
                    "cohesion": 20000.0,
                    "thickness": 5.0
                },
                {
                    "name": "Rock",
                    "type": "LinearElastic",
                    "young_modulus": 50000000.0,
                    "poisson_ratio": 0.25,
                    "density": 2500.0,
                    "thickness": 25.0
                }
            ],
            "analysis": {
                "type": "structural",
                "solver": "direct",
                "linear_solver": "skyline_lu_factorization",
                "compute_reactions": True,
                "reform_dofs_at_each_step": True,
                "move_mesh_flag": True,
                "convergence_criterion": "displacement_criterion",
                "displacement_relative_tolerance": 1.0e-4,
                "displacement_absolute_tolerance": 1.0e-9,
                "residual_relative_tolerance": 1.0e-4,
                "residual_absolute_tolerance": 1.0e-9,
                "max_iteration": 10
            },
            "iga": {
                "enabled": True,
                "nurbs_degree": 3,
                "integration_points": 5
            },
            "physics_ai": {
                "enabled": True,
                "pinn": {
                    "model_name": "excavation_pinn",
                    "model_type": "elasticity",
                    "config": {
                        "hidden_layers": [20, 20, 20, 20],
                        "activation": "tanh",
                        "learning_rate": 0.001
                    }
                },
                "sensor_data": {
                    "sensors": [
                        {
                            "coordinates": [40, 40, -5],
                            "values": [0.001, 0.002, 0.0]
                        },
                        {
                            "coordinates": [50, 40, -5],
                            "values": [0.002, 0.001, 0.0]
                        },
                        {
                            "coordinates": [60, 40, -5],
                            "values": [0.003, 0.0, 0.0]
                        }
                    ]
                },
                "training_config": {
                    "epochs": 5000,
                    "pde_weight": 1.0,
                    "data_weight": 0.5,
                    "batch_size": 10,
                    "save_interval": 1000
                }
            }
        }
        # Save default configuration
        os.makedirs(os.path.dirname(config_file), exist_ok=True)
        with open(config_file, 'w') as f:
            json.dump(default_config, f, indent=2)
        logger.info(f"Created default configuration file: {config_file}")
        return default_config
    except json.JSONDecodeError:
        logger.error(f"Invalid JSON in configuration file: {config_file}")
        sys.exit(1)


def run_excavation_case(config, use_iga=False, with_physics_ai=False,
                       export_file=None, physics_ai_only=False):
    """Run the excavation case study"""
    
    # Initialize the deep excavation system
    project_config = config["project"]
    working_dir = project_config["working_dir"]
    os.makedirs(working_dir, exist_ok=True)
    
    logger.info(f"Initializing deep excavation system in {working_dir}")
    system = DeepExcavationSystem(
        working_dir=working_dir,
        project_id=project_config.get("project_id", 1)
    )
    system.set_project_name(project_config["name"])
    
    # Skip geometry creation if only running physics AI
    if not physics_ai_only:
        # Create computational domain
        geometry_config = config["geometry"]
        domain_config = geometry_config["domain"]
        
        logger.info("Creating computational domain")
        domain_id = system.create_domain(
            width=domain_config["width"],
            length=domain_config["length"],
            depth=domain_config["depth"]
        )
        
        if domain_id < 0:
            logger.error("Failed to create domain")
            return False
        
        # Create excavation
        excavation_config = geometry_config["excavation"]
        
        logger.info("Creating excavation")
        excavation_id = system.create_excavation(
            width=excavation_config["width"],
            length=excavation_config["length"],
            depth=excavation_config["depth"],
            offset_x=excavation_config.get("offset_x", 0.0),
            offset_y=excavation_config.get("offset_y", 0.0)
        )
        
        if excavation_id < 0:
            logger.error("Failed to create excavation")
            return False
        
        # Create support wall
        wall_config = geometry_config.get("support_wall")
        if wall_config:
            logger.info("Creating support wall")
            wall_id = system.create_support_wall(
                thickness=wall_config["thickness"],
                depth=wall_config["depth"],
                distance=wall_config.get("distance", 0.0)
            )
            
            if wall_id < 0:
                logger.error("Failed to create support wall")
                logger.warning("Continuing without support wall")
        
        # Set soil layers
        logger.info("Setting soil layers")
        system.set_soil_layers(config["materials"])
        
        # Generate mesh
        logger.info("Generating mesh/IGA model")
        if not system.generate_mesh():
            logger.error("Failed to generate mesh/IGA model")
            return False
        
        # Set analysis parameters
        analysis_config = config["analysis"]
        
        # Add IGA specific parameters if enabled
        if use_iga and "iga" in config:
            iga_config = config["iga"]
            analysis_config.update({
                "iga_enabled": True,
                "nurbs_degree": iga_config.get("nurbs_degree", 3),
                "integration_points": iga_config.get("integration_points", 5)
            })
        
        logger.info("Setting analysis parameters")
        if not system.set_analysis_parameters(analysis_config):
            logger.error("Failed to set analysis parameters")
            return False
        
        # Run analysis
        logger.info("Running analysis")
        start_time = time.time()
        if not system.run_analysis():
            logger.error("Analysis failed")
            return False
        analysis_time = time.time() - start_time
        logger.info(f"Analysis completed in {analysis_time:.2f} seconds")
        
        # Export results if requested
        if export_file:
            logger.info(f"Exporting results to {export_file}")
            if not system.export_results(export_file):
                logger.error("Failed to export results")
                return False
        
        # Save results to default location for later use
        default_results_file = os.path.join(working_dir, "results", "latest_results.vtk")
        if not os.path.exists(default_results_file):
            os.makedirs(os.path.dirname(default_results_file), exist_ok=True)
            system.export_results(default_results_file)
    
    # Run Physics AI if requested
    if with_physics_ai or physics_ai_only:
        if "physics_ai" not in config or not config["physics_ai"].get("enabled", False):
            logger.warning("Physics AI not enabled in configuration")
            return True
        
        physics_ai_config = config["physics_ai"]
        
        # Initialize Physics AI system
        logger.info("Initializing Physics AI system")
        if not system.initialize_physics_ai():
            logger.error("Failed to initialize Physics AI system")
            return False
        
        # Create PINN model
        pinn_config = physics_ai_config["pinn"]
        logger.info(f"Creating PINN model: {pinn_config['model_name']}")
        pinn_result = system.create_pinn_model(
            model_name=pinn_config["model_name"],
            model_type=pinn_config["model_type"],
            config=pinn_config["config"]
        )
        
        if not pinn_result["success"]:
            logger.error(f"Failed to create PINN model: {pinn_result.get('error', 'Unknown error')}")
            return False
        
        # Train PINN model with sensor data
        sensor_data = physics_ai_config.get("sensor_data", {})
        training_config = physics_ai_config.get("training_config", {})
        
        logger.info(f"Training PINN model: {pinn_config['model_name']}")
        train_result = system.train_pinn_with_sensor_data(
            model_name=pinn_config["model_name"],
            sensor_data=sensor_data,
            training_config=training_config
        )
        
        if not train_result["success"]:
            logger.error(f"Failed to train PINN model: {train_result.get('error', 'Unknown error')}")
            return False
        
        logger.info(f"PINN model trained successfully: {pinn_config['model_name']}")
        
        # Integrate IGA with PINN if both are available
        if not physics_ai_only and system.is_results_ready:
            logger.info("Integrating IGA results with PINN model")
            
            # Define output file for integrated results
            integrated_results_file = os.path.join(
                working_dir, "results", f"{pinn_config['model_name']}_integrated.vtk"
            )
            
            # Define IGA results file
            iga_results_file = os.path.join(working_dir, "results", "latest_results.vtk")
            
            # Integration configuration
            integration_config = {
                "grid_resolution": [50, 50],
                "integration_type": "boundary_condition",
                "weight_factors": {
                    "iga_weight": 0.7,
                    "pinn_weight": 0.3
                }
            }
            
            # Perform integration
            integrate_result = system.integrate_iga_with_pinn(
                iga_results_file=iga_results_file,
                pinn_model_name=pinn_config["model_name"],
                output_file=integrated_results_file,
                integration_config=integration_config
            )
            
            if not integrate_result["success"]:
                logger.error(f"Failed to integrate IGA with PINN: {integrate_result.get('error', 'Unknown error')}")
            else:
                logger.info(f"Integration successful. Results saved to: {integrated_results_file}")
    
    # Save project
    project_file = os.path.join(working_dir, f"{project_config['name']}_project.json")
    logger.info(f"Saving project to {project_file}")
    system.save_project(project_file)
    
    return True


def main():
    """Main function"""
    # Parse command line arguments
    parser = argparse.ArgumentParser(description="Deep Excavation Case Study")
    parser.add_argument("--config", type=str, default="excavation_config.json",
                        help="Path to configuration file")
    parser.add_argument("--use_iga", action="store_true",
                        help="Use IGA for analysis")
    parser.add_argument("--with_physics_ai", action="store_true",
                        help="Use Physics AI system")
    parser.add_argument("--export", type=str,
                        help="Export results to file")
    parser.add_argument("--physics_ai", action="store_true",
                        help="Run only Physics AI analysis")
    args = parser.parse_args()
    
    # Load configuration
    config_file = args.config
    config = load_config(config_file)
    
    # Run excavation case
    if run_excavation_case(
        config=config,
        use_iga=args.use_iga,
        with_physics_ai=args.with_physics_ai,
        export_file=args.export,
        physics_ai_only=args.physics_ai
    ):
        logger.info("Excavation case completed successfully")
    else:
        logger.error("Excavation case failed")
        sys.exit(1)


if __name__ == "__main__":
    main()




