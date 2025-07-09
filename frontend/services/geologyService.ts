/**
 * @file 地质建模服务接口
 * @description 整合GemPy, Gmsh, Kratos的地质建模全流程服务
 */

import axios from 'axios';
import { API_BASE_URL } from './config';
import { GeologicalLayer } from '../core/store'; // Import from central store

// --- Interfaces for the new data-driven approach ---
// Local interfaces removed, using definitions from store.ts as single source of truth.

// FIX: Redefined to exactly match the backend Pydantic model.
export interface GeologyOptions {
  resolutionX: number;
  resolutionY: number;
  alpha: number;
  kernel_radius?: number;
  clip_to_bounds?: boolean;
}

export interface GeologyModelRequest {
  borehole_data: {
    x: number;
    y: number;
    z: number;
    formation: string;
  }[];
  formations: Record<string, string>; //  <-- 添加这个缺失的字段
  options: GeologyOptions;
}

/**
 * Creates a geological model by sending borehole data to the backend.
 * The backend returns geometry data optimized for three.js.
 * @param {GeologyModelRequest} payload - The data required for model generation, matching the backend API.
 * @returns {Promise<GeologicalLayer[]>} A promise that resolves to the geological model data.
 */
export const createDataDrivenGeologicalModel = async (
  payload: GeologyModelRequest
): Promise<GeologicalLayer[]> => {
  try {
    const response = await axios.post<GeologicalLayer[]>(
      `${API_BASE_URL}/geology/create-geological-model`,
      payload
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