import { Point2D, Point3D, Material } from './models';

// Base interface for all components, matching Pydantic's ComponentBase
export interface ComponentBase {
  id: string; // UUIDs are strings in TypeScript
  name: string;
  type: string; // This will be the discriminator field
  material_id: string | null; // UUID is a string
}

// --- Specific Component Interfaces ---

export interface DiaphragmWall extends ComponentBase {
  type: 'diaphragm_wall';
  path: Point2D[];
  thickness: number;
  depth: number;
  construction_method?: string;
  panel_length?: number;
  joint_type?: string;
  system_type?: string;
}

export interface PileArrangement extends ComponentBase {
  type: 'pile_arrangement';
  path: Point2D[];
  pile_diameter: number;
  pile_depth: number;
  pile_spacing: number;
  arrangement_type?: string;
  rows?: number;
  row_spacing?: number;
  system_type?: string;
}

export interface AnchorRod extends ComponentBase {
  type: 'anchor_rod';
  location: Point3D;
  direction: Point3D;
  free_length: number;
  bonded_length: number;
  pre_stress: number;
  diameter?: number;
  angle?: number;
}

// A simple excavation, for now it can be one of our components
export interface Excavation extends ComponentBase {
  type: 'excavation';
  depth: number;
  profile_points: Point2D[];
  material_id: string | null;
}

export interface TunnelProfile {
  type: 'circular'; // Or other types later
  radius: number;
}

export interface Tunnel extends ComponentBase {
  type: 'tunnel';
  path: Point3D[];
  profile: TunnelProfile;
  length?: number;
  lining_thickness?: number;
  support_type?: string;
  overburden?: number;
  system_type?: string;
}


// --- Union Type ---

export type AnyComponent = DiaphragmWall | PileArrangement | AnchorRod | Excavation | Tunnel; 