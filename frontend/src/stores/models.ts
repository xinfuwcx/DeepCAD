/**
 * This file contains all the TypeScript interfaces that correspond to the
 * Pydantic schemas in the backend. Keeping them in a separate file
 * allows for cleaner imports and better organization.
 */
import { AnyComponent } from './components';

export interface MaterialParameters {
  elasticModulus: number;
  poissonRatio: number;
  density: number;
  [key: string]: any; // Allow other parameters
}

export interface Material {
  id: string;
  name: string;
  type: 'concrete' | 'steel' | 'soil';
  parameters: MaterialParameters;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface Borehole {
  name: string;
  x: number;
  y: number;
  layers: Record<string, any>[];
}

export interface Stratum {
  name: string;
  material_id: string;
}

export interface ComputationalDomain {
  soil_layer_thickness: number;
  boreholes: Borehole[];
  stratums: Stratum[];
  bounding_box_min: Point3D | null;
  bounding_box_max: Point3D | null;
}

export interface Point2D {
  x: number;
  y: number;
}

export interface MeshingParameters {
  global_size: number;
}

export interface ProjectScene {
  id: string | null;
  name: string;
  domain: ComputationalDomain;
  components: AnyComponent[];
  materials: Material[];
  meshing: MeshingParameters;
} 