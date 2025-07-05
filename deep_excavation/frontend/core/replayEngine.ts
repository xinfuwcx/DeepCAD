import * as THREE from 'three';
import { AnyFeature } from '../services/parametricAnalysisService';

/**
 * @file Replay engine for parametric features. (Client-side stub)
 * @author GeoStruct-5 Team
 * @date 2025-07-06
 * @description This is a client-side stub. The actual geometry generation
 *              is handled by the backend replay engine (e.g., in v5_runner.py).
 *              This function exists to provide a basic scene structure and
 *              to avoid breaking the viewport rendering logic which expects
 *              a parametric model object.
 */

/**
 * A client-side stub that creates an empty group.
 * The real feature replay and geometry generation happens on the backend.
 * 
 * @param features - An array of parametric features.
 * @returns An empty THREE.Group.
 */
export function replayFeatures(features: AnyFeature[]): THREE.Group {
  // In a more advanced client-side preview scenario, this function could
  // generate lightweight placeholders for features (e.g., bounding boxes).
  // For now, we return an empty group as the backend handles all geometry.
  console.log("Client-side replayFeatures (stub) called. Backend handles geometry.");
  const group = new THREE.Group();
  group.name = 'ParametricModel';
  return group;
} 