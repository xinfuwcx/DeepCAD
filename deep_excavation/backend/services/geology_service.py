import logging
from typing import List, Dict, Any

from deep_excavation.backend.core.geology_modeler import GeologyModeler
# from deep_excavation.backend.core.pyvista_web_bridge import gempy_mesh_to_json

logger = logging.getLogger(__name__)


class GeologyService:
    """
    The service layer for geological operations. It acts as a bridge between the
    API layer (router) and the core logic (modeler), decoupling them.
    """
    def __init__(self, modeler: GeologyModeler = GeologyModeler()):
        """
        Initializes the geology service.
        It can be injected with a modeler, or creates its own instance.
        """
        self._modeler = modeler

    async def create_geological_model(
        self,
        surface_points: List[List[float]],
        borehole_data: List[Dict[str, Any]],
        formations: Dict[str, str],
        options: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Orchestrates the creation of a geological model by calling the core modeler.

        This method receives primitive data types from the API layer, ensuring
        that the service layer is not dependent on Pydantic models.
        """
        logger.info("GeologyService: Delegating model creation to GeologyModeler.")
        try:
            # The core modeler runs synchronously for now, but the service is async
            # to accommodate future non-blocking operations.
            # GeologyModeler expects the keyword argument "series_mapping" instead of
            # "formations". Pass it explicitly to avoid a TypeError when invoking
            # the core method.
            model_data = self._modeler.create_model_in_memory(
                surface_points=surface_points,
                borehole_data=borehole_data,
                series_mapping=formations,
                options=options,
            )
            
            # The model_data is already serialized by the modeler.
            # No need to convert it again.
            
            logger.info("GeologyService: Model created successfully by modeler.")
            return model_data
        except Exception as e:
            logger.error(f"An error occurred in GeologyService: {e}", exc_info=True)
            # Re-raise the exception to be handled by the API layer (router)
            raise

    async def process_frontend_request(
        self, request_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Process the request coming from the frontend, which may have a different
        structure.
        
        The frontend sends a feature-like structure with parameters nested inside.
        This method extracts the actual parameters needed by the modeler.
        """
        logger.info(
            f"Processing frontend request: {request_data.get('name', 'unnamed')}"
        )
        
        # Extract parameters from the feature-like structure
        parameters = request_data.get('parameters', {})

        # Helper to fetch a value using multiple possible keys (camelCase / snake_case)
        def _pick(keys, default):
            """Return the first non-empty value found for the given keys list."""
            for k in keys:
                if k in parameters and parameters[k] not in (None, [], {}):
                    return parameters[k]
            return default

        # Accept both camelCase 和 snake_case 命名，以及历史字段别名
        surface_points = _pick(['surfacePoints', 'surface_points'], [])
        borehole_data = _pick(['boreholeData', 'borehole_data'], [])
        # formations 历史上也叫 seriesMapping / series_mapping
        formations = _pick(['formations', 'seriesMapping', 'series_mapping'], {})
        options = parameters.get('options', {})
        
        # Call the core method with extracted parameters
        return await self.create_geological_model(
            surface_points=surface_points,
            borehole_data=borehole_data,
            formations=formations,
            options=options
        )


# --- FastAPI Dependency Injection ---

# This singleton instance can be used for dependency injection in the router.
# It ensures that the same GeologyService instance is used across the application,
# which can be useful for caching or managing state if needed in the future.
_geology_service_instance = None


def get_geology_service() -> GeologyService:
    """
    FastAPI dependency that provides a singleton instance of the GeologyService.
    """
    global _geology_service_instance
    if _geology_service_instance is None:
        _geology_service_instance = GeologyService()
    return _geology_service_instance 