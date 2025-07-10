"""
Kratos integration handler for computation module
"""
import sys
import json
import logging
import asyncio
from pathlib import Path

# Add core directory to Python path for Kratos integration
sys.path.append(str(Path(__file__).parent.parent.parent.parent / "core"))

try:
    # We import get_kratos_integration for side effects (initialization)
    from kratos_integration import get_kratos_integration  # noqa
    from kratos_solver import StructuralSolver
    KRATOS_AVAILABLE = True
except ImportError as e:
    print(f"Failed to import Kratos integration: {e}")
    KRATOS_AVAILABLE = False

# Configure logging
logger = logging.getLogger(__name__)


class KratosHandler:
    """Handler for Kratos-based structural analysis"""
    
    def __init__(self):
        self.solver = StructuralSolver() if KRATOS_AVAILABLE else None
        
    def is_available(self):
        """Check if Kratos is available"""
        return KRATOS_AVAILABLE and (self.solver and self.solver.is_available())
    
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