"""
Test script for checking the availability of Kratos GeoMechanicsApplication
and testing the GeoMechanicsSolver.
"""

import sys
import os
import logging
from pathlib import Path

# Add the parent directory to the Python path
sys.path.append(str(Path(__file__).parent.parent))

# Import the modules to test
from core.kratos_integration import get_kratos_integration
from core.geomechanics_solver import GeoMechanicsSolver

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def test_geomechanics_application_availability():
    """Test if the GeoMechanicsApplication is available"""
    kratos = get_kratos_integration()
    
    # Check if Kratos is available
    if not kratos.is_available():
        logger.error("Kratos is not available")
        return False
    
    # Get available applications
    apps = kratos.get_available_applications()
    logger.info(f"Available Kratos applications: {apps}")
    
    # Check if GeoMechanicsApplication is available
    if "GeoMechanicsApplication" in apps:
        logger.info("GeoMechanicsApplication is available")
        return True
    else:
        logger.warning("GeoMechanicsApplication is NOT available")
        return False

def test_geomechanics_solver():
    """Test the GeoMechanicsSolver"""
    solver = GeoMechanicsSolver()
    
    # Check if the solver is available
    if not solver.is_available():
        logger.error("GeoMechanicsSolver is not available")
        return False
    
    logger.info("GeoMechanicsSolver is available")
    return True

if __name__ == "__main__":
    logger.info("Testing Kratos GeoMechanicsApplication availability...")
    app_available = test_geomechanics_application_availability()
    
    logger.info("Testing GeoMechanicsSolver...")
    solver_available = test_geomechanics_solver()
    
    if app_available and solver_available:
        logger.info("All tests passed. GeoMechanicsApplication is properly configured.")
        sys.exit(0)
    else:
        logger.error("Tests failed. GeoMechanicsApplication is not properly configured.")
        sys.exit(1) 