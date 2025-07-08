/**
 * @file 地质建模服务接口
 * @description 整合GemPy, Gmsh, Kratos的地质建模全流程服务
 */

import axios from 'axios';
import { API_BASE_URL } from './config';

// --- Interfaces for the new data-driven approach ---

export interface ThreeJsGeometry {
  vertices: number[];
  normals: number[];
  faces: number[];
}

export interface GeologicalLayer {
  name: string;
  color: string;
  opacity: number;
  geometry: ThreeJsGeometry;
}

export interface GeologyModelRequest {
  boreholeData: {
    x: number;
    y: number;
    z: number;
    formation: string;
  }[];
  formations: { [key: string]: string };
  options?: { [key: string]: any };
}

/**
 * Creates a geological model by sending borehole data to the backend.
 * The backend returns geometry data optimized for three.js.
 * @param {GeologyModelRequest} data - The data required for model generation.
 * @returns {Promise<GeologicalLayer[]>} A promise that resolves to the geological model data.
 */
export const createDataDrivenGeologicalModel = async (
  data: GeologyModelRequest
): Promise<GeologicalLayer[]> => {
  try {
    const response = await axios.post<GeologicalLayer[]>(
      `${API_BASE_URL}/geology/create-geological-model`,
      data
    );
    return response.data;
  } catch (error) {
    console.error("Error creating geological model:", error);
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(`An internal server error occurred: ${error.response.data.detail || error.message}`);
    }
    throw new Error("An unknown error occurred while creating the geological model.");
  }
}; 