import React, { useRef, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { VTKLoader } from 'three/examples/jsm/loaders/VTKLoader';
import { Raycaster, Vector2 } from 'three';
import { replayFeatures } from '../../core/replayEngine';
import { useStore } from '../../core/store';
import { createAxesGizmo } from './AxesGizmo';

export interface ViewportHandles {
  addAnalysisMesh: (mesh: THREE.Object3D) => void;
  clearAnalysisMeshes: () => void;
  loadVtkResults: (url: string) => void;
}

const Viewport = forwardRef<ViewportHandles, {}>((props, ref) => {
  const mountRef = useRef<HTMLDivElement>(null);
  
  // --- Main Scene Refs ---
  const sceneRef = useRef(new THREE.Scene());
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const controlsRef = useRef<OrbitControls>(); // Ref to access controls
  
  // --- Axes Gizmo Refs ---
  const axesSceneRef = useRef(new THREE.Scene());
  const axesCameraRef = useRef<THREE.OrthographicCamera>();
  
  const analysisMeshesRef = useRef<THREE.Object3D[]>([]);

  // FEABench Fusion: Ref for results mesh
  const resultsMeshRef = useRef<THREE.Object3D | null>(null);

  // --- Picker helper ---
  const pickingPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);

  // --- Subscribe to global state ---
  const features = useStore(state => state.features);
  const selectedFeatureId = useStore(state => state.selectedFeatureId);
  const { pickingState, executePick, stopPicking } = useStore(state => ({
    pickingState: state.pickingState,
    executePick: state.executePick,
    stopPicking: state.stopPicking,
  }));

  // --- Replay engine generates the main model ---
  const parametricModel = useMemo(() => replayFeatures(features), [features]);

  // --- Imperative handles for parent component control ---
  useImperativeHandle(ref, () => ({
    addAnalysisMesh: (mesh) => {
      const scene = sceneRef.current;
      mesh.userData.isAnalysisMesh = true;
      scene.add(mesh);
      analysisMeshesRef.current.push(mesh);
    },
    clearAnalysisMeshes: () => {
      const scene = sceneRef.current;
      analysisMeshesRef.current.forEach(mesh => scene.remove(mesh));
      analysisMeshesRef.current = [];
    },
    // FEABench Fusion: Implement VTK loader logic
    loadVtkResults: (url: string) => {
        const scene = sceneRef.current;
        if (resultsMeshRef.current) {
            scene.remove(resultsMeshRef.current);
        }

        const loader = new VTKLoader();
        loader.load(url, (geometry) => {
            geometry.computeVertexNormals();
            const material = new THREE.MeshLambertMaterial({ 
                vertexColors: true,
                side: THREE.DoubleSide 
            });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.name = "vtk_results_mesh";
            
            // Optional: Scale or position the mesh if needed
            // mesh.scale.set(1, 1, 1);
            
            resultsMeshRef.current = mesh;
            scene.add(mesh);
        });
    }
  }));

  useEffect(() => {
    const mountNode = mountRef.current;
    if (!mountNode || rendererRef.current) return;
        
    // === Main Scene Setup ===
    const scene = sceneRef.current;
    scene.background = new THREE.Color(0x29303d); // A slightly lighter, more neutral dark blue
    const camera = new THREE.PerspectiveCamera(75, mountNode.clientWidth / mountNode.clientHeight, 0.1, 2000);
    camera.position.set(50, 50, 150);
    cameraRef.current = camera;
    
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(mountNode.clientWidth, mountNode.clientHeight);
    rendererRef.current = renderer;
    mountNode.appendChild(renderer.domElement);
    
    // === Axes Gizmo Setup ===
    const axesScene = axesSceneRef.current;
    const axesCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
    axesCamera.position.set(0, 0, 10);
    axesCameraRef.current = axesCamera;
    
    const axesGizmo = createAxesGizmo();
    axesScene.add(axesGizmo);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controlsRef.current = controls; // Store controls in ref
    
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
    directionalLight.position.set(100, 100, 50);
    scene.add(directionalLight);

    // Add a grid helper for better spatial orientation
    const gridHelper = new THREE.GridHelper(500, 50, '#5A6373', '#424955'); // Brighter, more visible grid lines
    gridHelper.position.y = -0.1; // Place it slightly below the main plane
    scene.add(gridHelper);

    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();

      // Main scene render
      renderer.render(scene, camera);
      
      // Axes Gizmo render (as an overlay)
      const gizmoSize = 80; // Size of the gizmo in pixels
      renderer.clearDepth(); // Render gizmo on top
      
      // Position the gizmo in the bottom left corner
      renderer.setScissorTest(true);
      renderer.setScissor(0, 0, gizmoSize, gizmoSize);
      renderer.setViewport(0, 0, gizmoSize, gizmoSize);
      
      axesGizmo.quaternion.copy(camera.quaternion).invert();
      axesGizmo.scale.set(40,40,40); // Adjust scale for ortho camera
      
      renderer.render(axesScene, axesCamera);
      renderer.setScissorTest(false);
    };
    animate();

    const resizeObserver = new ResizeObserver(() => {
        if (!camera || !renderer || !mountNode) return;
        camera.aspect = mountNode.clientWidth / mountNode.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(mountNode.clientWidth, mountNode.clientHeight);
    });
    resizeObserver.observe(mountNode);

    return () => {
      resizeObserver.disconnect();
      if (mountNode && renderer.domElement) {
        mountNode.removeChild(renderer.domElement);
        rendererRef.current = undefined;
      }
    };
    
  }, []);

  // --- Scene Update Logic ---
  useEffect(() => {
    const scene = sceneRef.current;
    
    // Clear previous models
    const objectsToRemove = scene.children.filter(child => child.userData.isParametricModel);
    scene.remove(...objectsToRemove);

    // Add new parametric model
    if (parametricModel) {
      parametricModel.userData.isParametricModel = true;

      // Apply selection highlight
      parametricModel.traverse(child => {
          if (child instanceof THREE.Mesh && child.userData.featureId === selectedFeatureId) {
              // TODO: Use a better highlighting material or outline effect
              const highlightMaterial = (child.material as THREE.MeshStandardMaterial).clone();
              highlightMaterial.color.set(0x007bff);
              highlightMaterial.emissive.set(0x007bff);
              highlightMaterial.emissiveIntensity = 0.3;
              child.material = highlightMaterial;
          }
      });

      scene.add(parametricModel);
    }

  }, [parametricModel, selectedFeatureId]);

  // Effect for handling picking mode
  useEffect(() => {
    const mountNode = mountRef.current;
    const controls = controlsRef.current;
    if (!mountNode || !controls) return;

    const handleMouseClick = (event: MouseEvent) => {
      if (!pickingState.isActive) return;
      
      const rect = mountNode.getBoundingClientRect();
      const mouse = new Vector2();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      
      const raycaster = new Raycaster();
      const camera = cameraRef.current;
      if (!camera) return;

      raycaster.setFromCamera(mouse, camera);
      
      const intersectionPoint = new THREE.Vector3();
      raycaster.ray.intersectPlane(pickingPlane, intersectionPoint);

      if (intersectionPoint) {
        // Round to a reasonable precision
        const roundedPoint = {
          x: parseFloat(intersectionPoint.x.toFixed(2)),
          y: parseFloat(intersectionPoint.y.toFixed(2)),
          z: parseFloat(intersectionPoint.z.toFixed(2)),
        };
        executePick(roundedPoint);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (pickingState.isActive && event.key === 'Escape') {
        stopPicking();
      }
    };

    if (pickingState.isActive) {
      mountNode.style.cursor = 'crosshair';
      controls.enabled = false; // Disable camera controls while picking
      mountNode.addEventListener('click', handleMouseClick);
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      mountNode.style.cursor = 'auto';
      controls.enabled = true;
      mountNode.removeEventListener('click', handleMouseClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [pickingState.isActive, executePick, stopPicking, pickingPlane]);

  return <div ref={mountRef} className="w-full h-full relative" />;
});

export default Viewport; 