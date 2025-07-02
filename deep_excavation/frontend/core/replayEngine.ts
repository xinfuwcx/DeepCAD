import * as THREE from 'three';
import { AnyFeature } from '../services/parametricAnalysisService';
import { Brush, Evaluator, SUBTRACTION } from 'three-bvh-csg';

const materials = {
    default: new THREE.MeshStandardMaterial({
        color: 0xcccccc,
        roughness: 0.5,
        metalness: 0.1,
    }),
    building: new THREE.MeshStandardMaterial({
        color: 0xff8c00, // DarkOrange
        roughness: 0.7,
        metalness: 0.2,
    }),
    pile: new THREE.MeshStandardMaterial({
        color: 0x808080, // Gray
        roughness: 0.6,
        metalness: 0.4,
    }),
    wall: new THREE.MeshStandardMaterial({
        color: 0xc4a484, // Light brown/beige
        roughness: 0.8,
        metalness: 0.1,
    }),
    soil: new THREE.MeshStandardMaterial({
        color: 0x8B4513, // SaddleBrown
        roughness: 0.9,
        metalness: 0.0,
        transparent: true,
        opacity: 0.8,
    }),
    tunnel: new THREE.MeshStandardMaterial({
        color: 0x696969, // DimGray
        roughness: 0.7,
        metalness: 0.3,
    }),
};

/**
 * Replays a list of parametric features and generates a THREE.js Group.
 * @param features - The array of features to replay.
 * @returns A THREE.Group containing the generated meshes, or null if no features.
 */
export function replayFeatures(features: AnyFeature[]): THREE.Group | null {
    if (features.length === 0) {
        return null;
    }

    const group = new THREE.Group();
    const featureMeshes = new Map<string, THREE.Mesh | THREE.Group>();
    const evaluator = new Evaluator();

    for (const feature of features) {
        let mesh: THREE.Mesh | THREE.Group | undefined;

        switch (feature.type) {
            case 'CreateBox': {
                const params = feature.parameters;
                const geometry = new THREE.BoxGeometry(params.width, params.height, params.depth);
                mesh = new THREE.Mesh(geometry, materials.default.clone());
                mesh.position.set(params.position.x, params.position.y, params.position.z);
                break;
            }
            
            case 'CreateBuilding': {
                const params = feature.parameters;
                const geometry = new THREE.BoxGeometry(params.width, params.height, params.depth);
                mesh = new THREE.Mesh(geometry, materials.building.clone());
                mesh.position.set(params.position.x, params.position.y, params.position.z);
                break;
            }

            case 'CreateDiaphragmWall': {
                const params = feature.parameters;
                const start = new THREE.Vector3(params.path[0].x, params.path[0].y, params.path[0].z);
                const end = new THREE.Vector3(params.path[1].x, params.path[1].y, params.path[1].z);
                const path = new THREE.Line3(start, end);

                const length = path.distance();
                const geometry = new THREE.BoxGeometry(length, params.height, params.thickness);
                mesh = new THREE.Mesh(geometry, materials.wall.clone());

                const midPoint = new THREE.Vector3();
                path.getCenter(midPoint);
                mesh.position.copy(midPoint);
                
                const direction = new THREE.Vector3().subVectors(end, start).normalize();
                mesh.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), direction);
                break;
            }

            case 'CreatePileRaft': {
                // ... (implementation for Pile Raft)
                break;
            }

            case 'CreateAnchorSystem': {
                const params = feature.parameters;
                const parentWall = featureMeshes.get(params.parentId);

                if (parentWall && parentWall instanceof THREE.Mesh) {
                    const wallMesh = parentWall as THREE.Mesh;
                    const anchorSystemGroup = new THREE.Group();
                    
                    const wallDir = new THREE.Vector3(1,0,0).applyQuaternion(wallMesh.quaternion);
                    const wallNormal = new THREE.Vector3(0,0,1).applyQuaternion(wallMesh.quaternion);

                    for (let i = 0; i < params.rowCount; i++) {
                        const vSpacing = i * params.verticalSpacing;
                        
                        const wallLength = (wallMesh.geometry as THREE.BoxGeometry).parameters.width;
                        const numAnchors = Math.floor(wallLength / params.horizontalSpacing) + 1;

                        const walerGeom = new THREE.BoxGeometry(wallLength, params.walerHeight, params.walerWidth);
                        const walerMesh = new THREE.Mesh(walerGeom, materials.pile.clone());
                        
                        const walerPos = wallMesh.position.clone();
                        walerPos.addScaledVector(wallNormal, 0.3);
                        walerPos.y = params.startHeight - vSpacing;
                        
                        walerMesh.position.copy(walerPos);
                        walerMesh.quaternion.copy(wallMesh.quaternion);
                        anchorSystemGroup.add(walerMesh);
                        
                        for (let j = 0; j < numAnchors; j++) {
                            const hOffset = (j - (numAnchors - 1) / 2) * params.horizontalSpacing;
                            
                            const anchorGeom = new THREE.CylinderGeometry(0.1, 0.1, params.anchorLength, 8);
                            const anchorMesh = new THREE.Mesh(anchorGeom, materials.pile.clone());
                            
                            const anchorPos = walerPos.clone();
                            anchorPos.addScaledVector(wallDir, hOffset);
                            anchorPos.addScaledVector(wallNormal, -params.anchorLength / 2);
    
                            anchorMesh.position.copy(anchorPos);
                            anchorMesh.quaternion.copy(wallMesh.quaternion);
                            anchorMesh.rotateOnAxis(new THREE.Vector3(1,0,0).applyQuaternion(wallMesh.quaternion), THREE.MathUtils.degToRad(-params.angle));
    
                            anchorSystemGroup.add(anchorMesh);
                        }
                    }
                    mesh = anchorSystemGroup;

                } else {
                     console.warn(`Could not find a valid DiaphragmWall parent for anchor system: ${feature.id}`);
                }
                break;
            }
            
            case 'CreateTerrain': {
                const params = feature.parameters;
                // Create a box representing the soil domain
                const minX = Math.min(...params.points.map(p => p.x));
                const maxX = Math.max(...params.points.map(p => p.x));
                const minZ = Math.min(...params.points.map(p => p.z));
                const maxZ = Math.max(...params.points.map(p => p.z));
                const width = maxX - minX;
                const depth = maxZ - minZ;
                
                // Assuming flat terrain for simplicity
                const avgY = params.points.reduce((sum, p) => sum + p.y, 0) / params.points.length;
                
                const geometry = new THREE.BoxGeometry(width, params.depth, depth);
                mesh = new THREE.Mesh(geometry, materials.soil.clone());
                mesh.position.set(
                    minX + width / 2,
                    avgY - params.depth / 2,
                    minZ + depth / 2
                );
                break;
            }
            
            case 'CreateTunnel': {
                const params = feature.parameters;
                
                if (params.pathPoints.length < 2) {
                    console.warn("Tunnel path must have at least 2 points");
                    break;
                }
                
                // Find parent terrain mesh
                const parentTerrain = feature.parentId ? featureMeshes.get(feature.parentId) : null;
                if (!parentTerrain || !(parentTerrain instanceof THREE.Mesh)) {
                    console.warn("Tunnel requires a valid terrain parent");
                    break;
                }
                
                // Create tunnel geometry
                const tunnelGroup = new THREE.Group();
                
                // Create a path from the points
                const path = new THREE.CurvePath<THREE.Vector3>();
                for (let i = 0; i < params.pathPoints.length - 1; i++) {
                    const start = new THREE.Vector3(
                        params.pathPoints[i].x,
                        params.pathPoints[i].y,
                        params.pathPoints[i].z
                    );
                    const end = new THREE.Vector3(
                        params.pathPoints[i+1].x,
                        params.pathPoints[i+1].y,
                        params.pathPoints[i+1].z
                    );
                    path.add(new THREE.LineCurve3(start, end));
                }
                
                // Create tunnel geometry
                const tunnelShape = new THREE.Shape();
                tunnelShape.absellipse(0, 0, params.width / 2, params.height / 2, 0, Math.PI * 2);
                
                const extrudeSettings = {
                    steps: Math.max(20, params.pathPoints.length * 10),
                    bevelEnabled: false,
                    extrudePath: path
                };
                
                const tunnelGeometry = new THREE.ExtrudeGeometry(tunnelShape, extrudeSettings);
                const tunnelMesh = new THREE.Mesh(tunnelGeometry, materials.tunnel.clone());
                
                try {
                    // Create brushes for CSG operation
                    const terrainBrush = new Brush(parentTerrain.geometry.clone());
                    terrainBrush.position.copy(parentTerrain.position);
                    terrainBrush.updateMatrixWorld();
                    
                    const tunnelBrush = new Brush(tunnelGeometry);
                    tunnelBrush.updateMatrixWorld();
                    
                    // Perform CSG subtraction
                    const resultBrush = evaluator.evaluate(terrainBrush, tunnelBrush, SUBTRACTION);
                    
                    // Replace the terrain mesh with the result
                    const resultMesh = new THREE.Mesh(resultBrush.geometry, materials.soil.clone());
                    resultMesh.position.copy(parentTerrain.position);
                    
                    // Update the feature meshes map
                    featureMeshes.set(feature.parentId as string, resultMesh);
                    
                    // Remove the old terrain mesh from the group and add the new one
                    group.remove(parentTerrain);
                    group.add(resultMesh);
                    
                    // Also add the tunnel mesh for visualization
                    tunnelMesh.material.transparent = true;
                    tunnelMesh.material.opacity = 0.5;
                    tunnelGroup.add(tunnelMesh);
                    
                    mesh = tunnelGroup;
                } catch (error) {
                    console.error("Error performing CSG operation for tunnel:", error);
                    mesh = tunnelMesh; // Fallback to just showing the tunnel
                }
                break;
            }

            case 'CreateExcavation': {
                const params = feature.parameters;
                
                // Find parent terrain mesh
                const parentTerrain = feature.parentId ? featureMeshes.get(feature.parentId) : null;
                if (!parentTerrain || !(parentTerrain instanceof THREE.Mesh)) {
                    console.warn("Excavation requires a valid terrain parent");
                    break;
                }
                
                // Create excavation geometry from 2D points
                const shape = new THREE.Shape();
                if (params.points.length < 3) {
                    console.warn("Excavation requires at least 3 points");
                    break;
                }
                
                shape.moveTo(params.points[0].x, params.points[0].y);
                for (let i = 1; i < params.points.length; i++) {
                    shape.lineTo(params.points[i].x, params.points[i].y);
                }
                shape.closePath();
                
                // Extrude the shape to create a 3D geometry
                const extrudeSettings = {
                    depth: params.depth,
                    bevelEnabled: false
                };
                
                const excavationGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
                
                // Position the excavation at the terrain surface
                const excavationMesh = new THREE.Mesh(excavationGeometry, materials.default.clone());
                excavationMesh.position.y = parentTerrain.position.y + (parentTerrain.geometry as THREE.BoxGeometry).parameters.height / 2;
                excavationMesh.rotation.x = Math.PI / 2; // Rotate to make the extrusion go downward
                
                try {
                    // Create brushes for CSG operation
                    const terrainBrush = new Brush(parentTerrain.geometry.clone());
                    terrainBrush.position.copy(parentTerrain.position);
                    terrainBrush.updateMatrixWorld();
                    
                    const excavationBrush = new Brush(excavationGeometry);
                    excavationBrush.position.copy(excavationMesh.position);
                    excavationBrush.rotation.copy(excavationMesh.rotation);
                    excavationBrush.updateMatrixWorld();
                    
                    // Perform CSG subtraction
                    const resultBrush = evaluator.evaluate(terrainBrush, excavationBrush, SUBTRACTION);
                    
                    // Replace the terrain mesh with the result
                    const resultMesh = new THREE.Mesh(resultBrush.geometry, materials.soil.clone());
                    resultMesh.position.copy(parentTerrain.position);
                    
                    // Update the feature meshes map
                    featureMeshes.set(feature.parentId as string, resultMesh);
                    
                    // Remove the old terrain mesh from the group and add the new one
                    group.remove(parentTerrain);
                    group.add(resultMesh);
                    
                    // No need to add excavation mesh as it's just for cutting
                    mesh = undefined;
                } catch (error) {
                    console.error("Error performing CSG operation for excavation:", error);
                    // Show a wireframe of the excavation as fallback
                    excavationMesh.material.wireframe = true;
                    mesh = excavationMesh;
                }
                break;
            }

            case 'Extrude':
                console.warn("Replay for Extrude not yet implemented.");
                break;

            case 'CreateSketch':
                console.log("Skipping replay for CreateSketch feature.");
                break;

            default:
                console.warn(`Unknown feature type: ${(feature as AnyFeature).type}`);
        }

        if (mesh) {
            mesh.userData = { featureId: feature.id };
            featureMeshes.set(feature.id, mesh);
            group.add(mesh);
        }
    }

    return group;
} 