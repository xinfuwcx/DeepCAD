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
}

export interface PileArrangement extends ComponentBase {
  type: 'pile_arrangement';
  path: Point2D[];
  pile_diameter: number;
  pile_depth: number;
  pile_spacing: number;
}

export interface AnchorRod extends ComponentBase {
  type: 'anchor_rod';
  location: Point3D;
  direction: Point3D;
  free_length: number;
  bonded_length: number;
  pre_stress: number;
}

// A simple excavation, for now it can be one of our components
export interface Excavation extends ComponentBase {
  type: 'excavation';
  depth: number;
  profile_points: Point2D[];
}

export interface TunnelProfile {
  type: 'circular'; // Or other types later
  radius: number;
}

export interface Tunnel extends ComponentBase {
  type: 'tunnel';
  path: Point3D[];
  profile: TunnelProfile;
}


// --- Union Type ---

export type AnyComponent = DiaphragmWall | PileArrangement | AnchorRod | Excavation | Tunnel; 