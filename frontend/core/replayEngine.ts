import * as THREE from 'three';
import { BufferGeometryUtils } from 'three-addons';
import { AnyFeature, CreateGeologicalModelFeature } from '../services/parametricAnalysisService';
import { GemPyInspiredColorSystem } from './gempyInspiredColorSystem';
import { createDataDrivenGeologicalModel, GemPyMesh } from '../services/geologyService';

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
 * @description Creates a THREE.Group containing meshes from pre-computed geological surface data.
 * This function is designed to work with the output of the backend's GeologyModeler.
 */
function createGeologicalSurfaces(previewData: any): THREE.Group | null {
  console.log('🏔️ 开始根据后端预览数据创建地质表面');
  
  const { meshes, preview_image } = previewData;
  if (!meshes || !Array.isArray(meshes) || meshes.length === 0) {
    console.error('❌ 预览数据中缺少有效的地质表面(meshes)。');
    return null;
  }

  const group = new THREE.Group();
  group.name = 'GeologicalVolumes_FromPreview';
  
  // Store preview image in group userData if available
  if (preview_image) {
    group.userData.preview_image = preview_image;
  }
  
  // Process each mesh from GemPy
  meshes.forEach((mesh: GemPyMesh, index: number) => {
    try {
      // Handle different mesh types
      if (mesh.type === 'surface' && mesh.vertices && mesh.faces) {
        // Create a surface mesh
        const geometry = new THREE.BufferGeometry();
        
        // Convert vertices to Float32Array for Three.js
        let verticesArray: number[] = [];
        
        // Handle different vertex formats safely
        if (mesh.vertices.length > 0 && Array.isArray(mesh.vertices[0])) {
          // If vertices are in format [[x,y,z], [x,y,z], ...]
          verticesArray = mesh.vertices.flat().map(v => Number(v));
        } else {
          // If vertices are already flattened [x,y,z,x,y,z,...]
          verticesArray = mesh.vertices as unknown as number[];
        }
        
        geometry.setAttribute(
          'position', 
          new THREE.Float32BufferAttribute(verticesArray, 3)
        );
        
        // Convert faces to Uint32Array for Three.js
        let indicesArray: number[] = [];
        
        // Handle different face formats safely
        if (mesh.faces.length > 0 && Array.isArray(mesh.faces[0])) {
          // If faces are in format [[a,b,c], [a,b,c], ...]
          indicesArray = mesh.faces.flat().map(f => Number(f));
        } else {
          // If faces are already flattened [a,b,c,a,b,c,...]
          indicesArray = mesh.faces as unknown as number[];
        }
        
        geometry.setIndex(indicesArray);
        
        // Compute normals for proper lighting
        geometry.computeVertexNormals();
        
        // Create material with the color from the mesh data or use default color
        const color = mesh.color || '#AAAAAA';
        const material = new THREE.MeshPhongMaterial({
          color: new THREE.Color(color),
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.8,
          shininess: 30
        });
        
        // Create mesh and add to group
        const threeMesh = new THREE.Mesh(geometry, material);
        threeMesh.name = mesh.name || `Surface_${index}`;
        threeMesh.userData.type = 'surface';
        
        group.add(threeMesh);
        console.log(`✅ 成功创建地质表面: ${threeMesh.name}`);
      } 
      else if (mesh.type === 'volume' && mesh.volume_data) {
        // For volume data, create a box representation as a placeholder
        // In a real application, you might use volume rendering techniques
        const { extent } = mesh.volume_data;
        if (extent && extent.length >= 6) {
          const [xmin, xmax, ymin, ymax, zmin, zmax] = extent;
          const width = xmax - xmin;
          const height = zmax - zmin;
          const depth = ymax - ymin;
          
          const geometry = new THREE.BoxGeometry(width, height, depth);
          const color = mesh.color || '#AAAAAA';
          const material = new THREE.MeshPhongMaterial({
            color: new THREE.Color(color),
            transparent: true,
            opacity: 0.5,
            wireframe: true
          });
          
          const box = new THREE.Mesh(geometry, material);
          box.position.set(
            xmin + width / 2,
            zmin + height / 2,
            ymin + depth / 2
          );
          box.name = mesh.name || `Volume_${index}`;
          box.userData.type = 'volume';
          box.userData.lith_id = mesh.lith_id;
          
          group.add(box);
          console.log(`✅ 成功创建地质体积: ${box.name}`);
        }
      }
    } catch (error) {
      console.error(`❌ 处理地质数据 ${index} 时出错:`, error);
    }
  });
  
  if (group.children.length === 0) {
    console.error('❌ 没有成功创建任何地质表面或体积。');
    return null;
  }
  
  console.log(`✅ 成功创建 ${group.children.length} 个地质对象。`);
  return group;
}

/**
 * Client-side replay engine (stub)
 * Creates realistic 3D visualization from parametric features
 */
export async function replayFeatures(features: AnyFeature[]): Promise<THREE.Group> {
  console.log('Client-side replayFeatures - 开始处理特征...');
  console.log(`输入特征数量: ${features.length}`);
  const sceneGroup = new THREE.Group();
  sceneGroup.name = "ParametricScene";

  for (let i = 0; i < features.length; i++) {
    const feature = features[i];
    console.log(`处理特征 ${i + 1}/${features.length}: ${feature.type}`);
    let generatedObject: THREE.Object3D | null = null;
    
    try {
      switch (feature.type) {
        case 'CreateGeologicalModel': {
          console.log('⏳ 开始处理 CreateGeologicalModel 特征...');
          const modelFeature = feature as CreateGeologicalModelFeature;
          
          // Step 1: Call the backend API
          console.log('📡 调用后端API以生成地质模型...');
          const response = await createDataDrivenGeologicalModel(modelFeature.parameters);
          console.log('✅ 后端API调用成功, 收到预览数据。');

          // Step 2: Use the response data to create the 3D object
          generatedObject = createGeologicalSurfaces(response.previewData);
          
          if (generatedObject) {
            console.log('✅ 地质模型3D对象创建成功。');
          } else {
            console.error('❌ 根据后端数据创建地质模型失败。');
          }
          break;
        }
        
        default:
          console.warn(`❓ 未知的特征类型: ${feature.type}`);
          break;
      }

      if (generatedObject) {
        generatedObject.name = feature.name || feature.type;
        generatedObject.userData.featureId = feature.id;
        sceneGroup.add(generatedObject);
      }
    } catch (error) {
      console.error(`❌ 处理特征 ${feature.type} (${feature.id}) 失败:`, error);
    }
  }

  return sceneGroup;
} 