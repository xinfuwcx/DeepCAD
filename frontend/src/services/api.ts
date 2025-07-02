import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/v4';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Define the complex types for our analysis models based on the backend
// This provides type safety for our frontend code.

// --- Seepage Analysis Types ---
interface SurfacePoint {
  [index: number]: number;
}

interface UndulatingSoilLayer {
  material_name: string;
  surface_points: SurfacePoint[];
  average_thickness: number;
}

interface ExcavationProfileFromDXF {
  dxf_file_content: string;
  layer_name: string;
  excavation_depth: number;
}

interface GeometryDefinition {
  project_name: string;
  soil_profile: UndulatingSoilLayer[];
  excavation: ExcavationProfileFromDXF;
}

interface SeepageMaterial {
  name: string;
  hydraulic_conductivity_x: number;
  hydraulic_conductivity_y: number;
  hydraulic_conductivity_z: number;
}

interface HydraulicBoundaryCondition {
  boundary_name: string;
  total_head: number;
}

export interface SeepageAnalysisPayload {
  project_name: string;
  geometry_definition: GeometryDefinition;
  materials: SeepageMaterial[];
  boundary_conditions: HydraulicBoundaryCondition[];
}


// --- API Service Functions ---

export const apiService = {
  runSeepageAnalysis: async (payload: SeepageAnalysisPayload) => {
    try {
      console.log("Sending payload to /run-seepage-analysis:", payload);
      const response = await apiClient.post('/run-seepage-analysis', payload);
      console.log("Received response:", response.data);
      return response.data;
    } catch (error) {
      console.error('Error running seepage analysis:', error);
      if (axios.isAxiosError(error) && error.response) {
        // Pass the detailed error from the backend to the UI
        throw new Error(error.response.data.detail || 'An unknown error occurred');
      }
      throw error;
    }
  },
  
  // Placeholder for structural analysis
  runStructuralAnalysis: async (payload: any) => {
     try {
      const response = await apiClient.post('/run-structural-analysis', payload);
      return response.data;
    } catch (error) {
      console.error('Error running structural analysis:', error);
      throw error;
    }
  }
};
