import React, { useRef, useEffect } from 'react';
import { Box, Typography, Paper, useTheme } from '@mui/material';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

/**
 * 统一的3D有限元模型和结果查看器
 * @description 使用Three.js在前端进行高性能渲染
 */
const TrameFEMViewer: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();

  useEffect(() => {
    if (!mountRef.current) return;

    // -- Scene Setup --
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(theme.palette.background.default);
    
    // -- Camera Setup --
    const camera = new THREE.PerspectiveCamera(75, mountRef.current.clientWidth / mountRef.current.clientHeight, 0.1, 1000);
    camera.position.z = 5;

    // -- Renderer Setup --
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    mountRef.current.appendChild(renderer.domElement);

    // -- Controls --
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // -- Lighting --
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // -- Placeholder Geometry (e.g., a simple cube) --
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: theme.palette.primary.main });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);
    
    // -- Axes Helper --
    const axesHelper = new THREE.AxesHelper(2);
    scene.add(axesHelper);

    // -- Animation Loop --
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // -- Handle Resize --
    const handleResize = () => {
        if (mountRef.current) {
            const width = mountRef.current.clientWidth;
            const height = mountRef.current.clientHeight;
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
        }
    };
    window.addEventListener('resize', handleResize);
    
    // -- Cleanup --
    return () => {
      window.removeEventListener('resize', handleResize);
      if (mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, [theme]);

  return (
    <Paper 
      elevation={3} 
      ref={mountRef} 
      sx={{ 
        width: '100%', 
        height: '100%', 
        minHeight: '600px', // Ensure it has a good default size
        position: 'relative',
        overflow: 'hidden'
      }}
    >
       <Typography 
            variant="caption" 
            sx={{ position: 'absolute', top: 8, left: 8, color: 'text.secondary' }}
        >
            3D Viewer
        </Typography>
    </Paper>
  );
};

export default TrameFEMViewer; 