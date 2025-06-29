#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
@file visualize_results.py
@description Visualize excavation analysis results with Trame server
@author Deep Excavation Team
@version 1.5.0
@copyright 2025
"""

import os
import sys
import json
import argparse
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
logger = logging.getLogger("ResultVisualizer")

# Try to import visualization modules
try:
    from src.core.visualization.trame_vis_server import TrameVisServer
    from src.core.deep_excavation_system import DeepExcavationSystem
    
    # Check if VTK is available
    try:
        import vtk
        from vtkmodules.vtkIOLegacy import vtkUnstructuredGridReader
        from vtkmodules.vtkRenderingCore import vtkActor
        HAS_VTK = True
    except ImportError:
        HAS_VTK = False
        logger.warning("VTK not available, using simpler visualization methods")
    
except ImportError as e:
    logger.error(f"Failed to import visualization modules: {e}")
    sys.exit(1)


class ResultVisualizer:
    """Visualize excavation analysis results"""
    
    def __init__(self, working_dir="./workspace"):
        """
        Initialize the result visualizer
        
        Args:
            working_dir: Working directory for input/output files
        """
        self.working_dir = working_dir
        self.vis_server = TrameVisServer()
        
    def load_results(self, results_file):
        """
        Load results from file
        
        Args:
            results_file: Path to results file
            
        Returns:
            bool: Success or failure
        """
        try:
            if not os.path.exists(results_file):
                logger.error(f"Results file not found: {results_file}")
                return False
            
            logger.info(f"Loading results from {results_file}")
            self.vis_server.load_results(os.path.dirname(results_file))
            return True
        except Exception as e:
            logger.error(f"Failed to load results: {e}")
            return False
    
    def visualize(self, variable="DISPLACEMENT", component=-1, interactive=True):
        """
        Visualize results
        
        Args:
            variable: Variable to visualize
            component: Component to visualize (-1 for magnitude)
            interactive: Enable interactive visualization
            
        Returns:
            bool: Success or failure
        """
        try:
            # Setup visualization
            self.vis_server.setup_visualization(variable, component)
            
            # Start server
            port = self.vis_server.start_server(interactive=interactive)
            
            logger.info(f"Visualization server started on port {port}")
            logger.info(f"Visualizing {variable}")
            
            if interactive:
                logger.info("Press Ctrl+C to stop the server")
                try:
                    self.vis_server.server.start()
                except KeyboardInterrupt:
                    logger.info("Server stopped by user")
            
            return True
        except Exception as e:
            logger.error(f"Failed to visualize results: {e}")
            return False
    
    def compare_results(self, results_files, variables=None, interactive=True):
        """
        Compare multiple results
        
        Args:
            results_files: List of result files
            variables: List of variables to compare
            interactive: Enable interactive visualization
            
        Returns:
            bool: Success or failure
        """
        try:
            if not results_files:
                logger.error("No result files provided")
                return False
            
            if not variables:
                variables = ["DISPLACEMENT"]
            
            logger.info(f"Comparing results from {len(results_files)} files")
            
            # Setup comparison visualization
            self.vis_server.setup_comparison(results_files, variables)
            
            # Start server
            port = self.vis_server.start_server(interactive=interactive)
            
            logger.info(f"Comparison server started on port {port}")
            
            if interactive:
                logger.info("Press Ctrl+C to stop the server")
                try:
                    self.vis_server.server.start()
                except KeyboardInterrupt:
                    logger.info("Server stopped by user")
            
            return True
        except Exception as e:
            logger.error(f"Failed to compare results: {e}")
            return False


def visualize_from_project(project_file, variable="DISPLACEMENT", component=-1, interactive=True):
    """
    Visualize results from project file
    
    Args:
        project_file: Path to project file
        variable: Variable to visualize
        component: Component to visualize (-1 for magnitude)
        interactive: Enable interactive visualization
        
    Returns:
        bool: Success or failure
    """
    try:
        # Create excavation system
        system = DeepExcavationSystem()
        
        # Load project
        if not system.load_project(project_file):
            logger.error(f"Failed to load project from {project_file}")
            return False
        
        # Visualize results
        success = system.visualize_results(variable, component)
        
        if not success:
            logger.error("Failed to visualize results")
            return False
        
        if interactive:
            logger.info("Press Ctrl+C to stop the server")
            try:
                while True:
                    import time
                    time.sleep(1)
            except KeyboardInterrupt:
                logger.info("Server stopped by user")
        
        return True
    except Exception as e:
        logger.error(f"Failed to visualize from project: {e}")
        return False


def main():
    """Main function"""
    # Parse command line arguments
    parser = argparse.ArgumentParser(description="Visualize excavation analysis results")
    parser.add_argument("--results", type=str, default=None,
                        help="Path to results file")
    parser.add_argument("--project", type=str, default=None,
                        help="Path to project file")
    parser.add_argument("--compare", type=str, nargs='+', default=None,
                        help="Paths to result files to compare")
    parser.add_argument("--variable", type=str, default="DISPLACEMENT",
                        help="Variable to visualize")
    parser.add_argument("--component", type=int, default=-1,
                        help="Component to visualize (-1 for magnitude)")
    parser.add_argument("--working_dir", type=str, default="./workspace",
                        help="Working directory")
    parser.add_argument("--non-interactive", action="store_true",
                        help="Disable interactive mode")
    args = parser.parse_args()
    
    # Determine visualization method
    if args.project:
        # Visualize from project
        logger.info(f"Visualizing from project: {args.project}")
        if not visualize_from_project(
            args.project, 
            args.variable, 
            args.component,
            not args.non_interactive
        ):
            logger.error("Failed to visualize from project")
            sys.exit(1)
    elif args.compare:
        # Compare multiple results
        logger.info(f"Comparing results: {args.compare}")
        visualizer = ResultVisualizer(args.working_dir)
        if not visualizer.compare_results(
            args.compare,
            [args.variable],
            not args.non_interactive
        ):
            logger.error("Failed to compare results")
            sys.exit(1)
    elif args.results:
        # Visualize single result file
        logger.info(f"Visualizing results: {args.results}")
        visualizer = ResultVisualizer(args.working_dir)
        if not visualizer.load_results(args.results):
            logger.error("Failed to load results")
            sys.exit(1)
        if not visualizer.visualize(
            args.variable,
            args.component,
            not args.non_interactive
        ):
            logger.error("Failed to visualize results")
            sys.exit(1)
    else:
        # Look for default results
        default_results = os.path.join(args.working_dir, "results", "latest_results.vtk")
        default_project = os.path.join(args.working_dir, "ExcavationCase_project.json")
        
        if os.path.exists(default_project):
            logger.info(f"Using default project: {default_project}")
            if not visualize_from_project(
                default_project, 
                args.variable, 
                args.component,
                not args.non_interactive
            ):
                logger.error("Failed to visualize from default project")
                sys.exit(1)
        elif os.path.exists(default_results):
            logger.info(f"Using default results: {default_results}")
            visualizer = ResultVisualizer(args.working_dir)
            if not visualizer.load_results(default_results):
                logger.error("Failed to load default results")
                sys.exit(1)
            if not visualizer.visualize(
                args.variable,
                args.component,
                not args.non_interactive
            ):
                logger.error("Failed to visualize default results")
                sys.exit(1)
        else:
            logger.error("No results or project specified and no default found")
            sys.exit(1)
    
    logger.info("Visualization completed successfully")


if __name__ == "__main__":
    main()




