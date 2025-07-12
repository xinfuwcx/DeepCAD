import React, { createContext, useContext, useRef, useEffect, ReactNode, useState } from 'react';
import * as THREE from 'three';

interface ThreeContextType {
  scene: THREE.Scene | null;
  camera: THREE.PerspectiveCamera | null;
  renderer: THREE.WebGLRenderer | null;
  controls: any | null; // OrbitControls type would be imported separately
  addObject: (object: THREE.Object3D) => void;
  removeObject: (object: THREE.Object3D) => void;
  loadGLTF: (url: string) => Promise<THREE.Group>;
  updateCamera: (position?: THREE.Vector3, target?: THREE.Vector3) => void;
  takeScreenshot: () => string;
  isReady: boolean;
}

const ThreeContext = createContext<ThreeContextType | null>(null);

export const useThree = () => {
  const context = useContext(ThreeContext);
  if (!context) {
    throw new Error('useThree must be used within a ThreeProvider');
  }
  return context;
};

interface ThreeProviderProps {
  children: ReactNode;
  viewportRef: React.RefObject<HTMLDivElement>;
}

export const ThreeProvider: React.FC<ThreeProviderProps> = ({ children, viewportRef }) => {
  const [isReady, setIsReady] = useState(false);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<any | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const gltfLoaderRef = useRef<any | null>(null);

  useEffect(() => {
    if (!viewportRef.current) return;

    // Initialize Three.js scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    sceneRef.current = scene;

    // Initialize camera
    const camera = new THREE.PerspectiveCamera(
      75,
      viewportRef.current.clientWidth / viewportRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(10, 10, 10);
    cameraRef.current = camera;

    // Initialize renderer
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(viewportRef.current.clientWidth, viewportRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    rendererRef.current = renderer;

    // Append renderer to viewport
    viewportRef.current.appendChild(renderer.domElement);

    // Initialize basic lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Initialize controls (OrbitControls would be imported dynamically)
    const initializeControls = async () => {
      try {
        // Dynamic import to avoid bundling issues
        const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.1;
        controls.screenSpacePanning = false;
        controls.minDistance = 1;
        controls.maxDistance = 100;
        controlsRef.current = controls;
      } catch (error) {
        console.warn('Failed to load OrbitControls:', error);
      }
    };

    // Initialize GLTF loader
    const initializeGLTFLoader = async () => {
      try {
        const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
        gltfLoaderRef.current = new GLTFLoader();
      } catch (error) {
        console.warn('Failed to load GLTFLoader:', error);
      }
    };

    // Initialize controls and loader
    Promise.all([initializeControls(), initializeGLTFLoader()]).then(() => {
      setIsReady(true);
    });

    // Animation loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      
      if (controlsRef.current) {
        controlsRef.current.update();
      }
      
      renderer.render(scene, camera);
    };
    animate();

    // Handle window resize
    const handleResize = () => {
      if (!viewportRef.current || !camera || !renderer) return;
      
      const width = viewportRef.current.clientWidth;
      const height = viewportRef.current.clientHeight;
      
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      if (rendererRef.current && viewportRef.current) {
        viewportRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
      
      if (controlsRef.current) {
        controlsRef.current.dispose();
      }
    };
  }, [viewportRef]);

  const addObject = (object: THREE.Object3D) => {
    if (sceneRef.current) {
      sceneRef.current.add(object);
    }
  };

  const removeObject = (object: THREE.Object3D) => {
    if (sceneRef.current) {
      sceneRef.current.remove(object);
    }
  };

  const loadGLTF = async (url: string): Promise<THREE.Group> => {
    if (!gltfLoaderRef.current) {
      throw new Error('GLTF Loader not initialized');
    }

    return new Promise((resolve, reject) => {
      gltfLoaderRef.current.load(
        url,
        (gltf: any) => {
          // Enable shadows for all meshes
          gltf.scene.traverse((child: any) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          resolve(gltf.scene);
        },
        (progress: any) => {
          console.log('Loading progress:', (progress.loaded / progress.total * 100) + '%');
        },
        (error: any) => {
          console.error('GLTF loading error:', error);
          reject(error);
        }
      );
    });
  };

  const updateCamera = (position?: THREE.Vector3, target?: THREE.Vector3) => {
    if (!cameraRef.current || !controlsRef.current) return;
    
    if (position) {
      cameraRef.current.position.copy(position);
    }
    
    if (target) {
      controlsRef.current.target.copy(target);
    }
    
    controlsRef.current.update();
  };

  const takeScreenshot = (): string => {
    if (!rendererRef.current) return '';
    return rendererRef.current.domElement.toDataURL('image/png');
  };

  const contextValue: ThreeContextType = {
    scene: sceneRef.current,
    camera: cameraRef.current,
    renderer: rendererRef.current,
    controls: controlsRef.current,
    addObject,
    removeObject,
    loadGLTF,
    updateCamera,
    takeScreenshot,
    isReady
  };

  return (
    <ThreeContext.Provider value={contextValue}>
      {children}
    </ThreeContext.Provider>
  );
};