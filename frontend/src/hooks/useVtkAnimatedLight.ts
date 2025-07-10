import { useEffect, useRef } from 'react';
import vtkLight from '@kitware/vtk.js/Rendering/Core/Light';
import vtkRenderer from '@kitware/vtk.js/Rendering/Core/Renderer';
import vtkRenderWindow from '@kitware/vtk.js/Rendering/Core/RenderWindow';

type VTKRenderer = ReturnType<typeof vtkRenderer.newInstance>;
type VTKRenderWindow = ReturnType<typeof vtkRenderWindow.newInstance>;

export function useVtkAnimatedLight(renderer: VTKRenderer | null, renderWindow: VTKRenderWindow | null) {
  const animationIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!renderer || !renderWindow) {
      return;
    }

    // Add dynamic rotating light
    const light = vtkLight.newInstance({
      positional: true,
      coneAngle: 45,
      intensity: 0.8,
      color: [1.0, 0.95, 0.9],
    });
    (light as any).setLightTypeToSceneLight?.();
    renderer.addLight(light);

    const animateLight = () => {
      const activeCamera = renderer.getActiveCamera();
      if (!activeCamera) {
          animationIdRef.current = requestAnimationFrame(animateLight);
          return;
      }
      const radius = activeCamera.getDistance() * 2;
      const time = Date.now() * 0.0005;
      const x = radius * Math.cos(time);
      const y = radius * Math.sin(time);
      const z = activeCamera.getPosition()[2] + radius * 0.2; // Keep light somewhat above camera
      light.setPosition(x, y, z);
      light.setFocalPoint(...activeCamera.getFocalPoint());
      
      renderWindow.render();
      
      animationIdRef.current = requestAnimationFrame(animateLight);
    };

    animationIdRef.current = requestAnimationFrame(animateLight);

    // Cleanup function
    return () => {
      if (animationIdRef.current !== null) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
      if (light) {
        renderer.removeLight(light);
        light.delete();
      }
    };
  }, [renderer, renderWindow]);
} 