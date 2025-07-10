import { useState, useEffect, useRef, useCallback } from 'react';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkXMLPolyDataReader from '@kitware/vtk.js/IO/XML/XMLPolyDataReader';
import vtkGlyph3DMapper from '@kitware/vtk.js/Rendering/Core/Glyph3DMapper';
import vtkArrowSource from '@kitware/vtk.js/Filters/Sources/ArrowSource';
import vtkSphereSource from '@kitware/vtk.js/Filters/Sources/SphereSource';
import vtkRenderer from '@kitware/vtk.js/Rendering/Core/Renderer';
import vtkRenderWindow from '@kitware/vtk.js/Rendering/Core/RenderWindow';
import vtkRenderWindowInteractor from '@kitware/vtk.js/Rendering/Core/RenderWindowInteractor';
import vtkInteractorStyleTrackballCamera from '@kitware/vtk.js/Interaction/Style/InteractorStyleTrackballCamera';
import vtkAxesActor from '@kitware/vtk.js/Rendering/Core/AxesActor';
import vtkOrientationMarkerWidget from '@kitware/vtk.js/Interaction/Widgets/OrientationMarkerWidget';
import { Layers, ViewSettings } from '../stores/useSceneStore';

type VTKActor = ReturnType<typeof vtkActor.newInstance>;
type VTKRenderer = ReturnType<typeof vtkRenderer.newInstance>;
type VTKRenderWindow = ReturnType<typeof vtkRenderWindow.newInstance>;
type VTKRenderWindowInteractor = ReturnType<typeof vtkRenderWindowInteractor.newInstance>;

interface VtkLayerActors {
  mesh: VTKActor | null;
  result: VTKActor | null;
  constraints: VTKActor | null;
  loads: VTKActor | null;
}

export function useVtkLayer(viewportRef: React.RefObject<HTMLDivElement>) {
  const rendererRef = useRef<VTKRenderer | null>(null);
  const renderWindowRef = useRef<VTKRenderWindow | null>(null);
  const interactorRef = useRef<VTKRenderWindowInteractor | null>(null);
  const axesWidgetRef = useRef<any | null>(null);
  const actorsRef = useRef<VtkLayerActors>({
    mesh: null,
    result: null,
    constraints: null,
    loads: null,
  });

  // 初始化渲染器
  const initializeRenderer = useCallback(() => {
    if (!viewportRef.current) return;

    // 创建渲染器
    const renderer = vtkRenderer.newInstance();
    renderer.setBackground(0.1, 0.1, 0.2);

    // 创建渲染窗口
    const renderWindow = vtkRenderWindow.newInstance();
    renderWindow.addRenderer(renderer);

    // 创建交互器
    const interactor = vtkRenderWindowInteractor.newInstance();
    interactor.setView(renderWindow.newAPISpecificView());
    interactor.initialize();
    interactor.setContainer(viewportRef.current);

    // 设置交互样式
    const interactorStyle = vtkInteractorStyleTrackballCamera.newInstance();
    interactor.setInteractorStyle(interactorStyle);

    // 创建坐标轴
    const axesActor = vtkAxesActor.newInstance();
    const axesWidget = vtkOrientationMarkerWidget.newInstance({
      actor: axesActor,
      interactor: interactor,
    });
    axesWidget.setEnabled(true);
    axesWidget.setViewportCorner(
      vtkOrientationMarkerWidget.Corners.BOTTOM_RIGHT
    );
    axesWidget.setViewportSize(0.15);
    axesWidget.setMinPixelSize(100);
    axesWidget.setMaxPixelSize(300);

    // 保存引用
    rendererRef.current = renderer;
    renderWindowRef.current = renderWindow;
    interactorRef.current = interactor;
    axesWidgetRef.current = axesWidget;

    // 自适应视口大小
    const resizeObserver = new ResizeObserver(() => {
      if (interactorRef.current && viewportRef.current) {
        const { width, height } = viewportRef.current.getBoundingClientRect();
        interactorRef.current.setSize(width, height);
        interactorRef.current.render();
      }
    });

    if (viewportRef.current) {
      resizeObserver.observe(viewportRef.current);
    }

    // 重置相机并渲染
    renderer.resetCamera();
    renderWindow.render();

    // 清理函数
    return () => {
      resizeObserver.disconnect();
      if (interactorRef.current) {
        interactorRef.current.delete();
        interactorRef.current = null;
      }
      if (renderWindowRef.current) {
        renderWindowRef.current.delete();
        renderWindowRef.current = null;
      }
      if (rendererRef.current) {
        rendererRef.current.delete();
        rendererRef.current = null;
      }
      if (axesWidgetRef.current) {
        axesWidgetRef.current.delete();
        axesWidgetRef.current = null;
      }
    };
  }, [viewportRef]);

  // 加载单个图层
  const loadLayer = useCallback(async (url: string, layerType: keyof VtkLayerActors, loadsScale: number = 1.0) => {
    if (!url || !rendererRef.current) return null;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
      }

      const data = await response.text();
      const reader = vtkXMLPolyDataReader.newInstance();
      reader.parseAsText(data);
      const polydata = reader.getOutputData();

      let mapper;
      let actor;

      if (layerType === 'loads') {
        // 对于载荷，使用箭头表示
        const arrowSource = vtkArrowSource.newInstance();
        mapper = vtkGlyph3DMapper.newInstance({
          scaleMode: 0, // SCALE_BY_MAGNITUDE
          scaleArray: 'scale',
          orientationArray: 'orientation'
        });
        
        mapper.setInputData(polydata);
        mapper.setSourceConnection(arrowSource.getOutputPort());
        mapper.setScaleFactor(loadsScale);
      } else if (layerType === 'constraints') {
        // 对于约束，使用球体表示
        const sphereSource = vtkSphereSource.newInstance({
          radius: 0.05,
          phiResolution: 16,
          thetaResolution: 16,
        });
        
        mapper = vtkGlyph3DMapper.newInstance({
          scaleMode: 0, // SCALE_BY_MAGNITUDE
          scaleArray: 'scale',
        });
        
        mapper.setInputData(polydata);
        mapper.setSourceConnection(sphereSource.getOutputPort());
      } else {
        // 对于常规网格，使用标准映射器
        mapper = vtkMapper.newInstance();
        mapper.setInputData(polydata);
      }

      actor = vtkActor.newInstance();
      actor.setMapper(mapper);

      // 设置颜色
      const colors: Record<keyof VtkLayerActors, [number, number, number]> = {
        mesh: [0.8, 0.8, 0.8],
        result: [0.8, 0.2, 0.2],
        constraints: [0.2, 0.8, 0.2],
        loads: [0.2, 0.2, 0.8],
      };
      actor.getProperty().setColor(...colors[layerType]);

      // 如果已有旧的Actor，先移除
      if (actorsRef.current[layerType]) {
        rendererRef.current.removeActor(actorsRef.current[layerType]!);
        actorsRef.current[layerType]!.delete();
      }

      // 添加新Actor到渲染器
      rendererRef.current.addActor(actor);
      actorsRef.current[layerType] = actor;

      // 渲染更新
      if (renderWindowRef.current) {
        renderWindowRef.current.render();
      }

      return actor;
    } catch (error) {
      console.error(`Error loading layer ${layerType}:`, error);
      return null;
    }
  }, []);

  // 更新所有图层
  const updateLayers = useCallback((layers: Layers) => {
    if (!rendererRef.current) return;

    // 更新网格图层
    if (layers.mesh.url && layers.mesh.isVisible) {
      loadLayer(layers.mesh.url, 'mesh');
    } else if (actorsRef.current.mesh) {
      actorsRef.current.mesh.setVisibility(layers.mesh.isVisible);
    }

    // 更新结果图层
    if (layers.result.url && layers.result.isVisible) {
      loadLayer(layers.result.url, 'result');
    } else if (actorsRef.current.result) {
      actorsRef.current.result.setVisibility(layers.result.isVisible);
    }

    // 更新约束图层
    if (layers.constraints.url && layers.constraints.isVisible) {
      loadLayer(layers.constraints.url, 'constraints');
    } else if (actorsRef.current.constraints) {
      actorsRef.current.constraints.setVisibility(layers.constraints.isVisible);
    }

    // 更新载荷图层
    if (layers.loads.url && layers.loads.isVisible) {
      loadLayer(layers.loads.url, 'loads', layers.loadsScale);
    } else if (actorsRef.current.loads) {
      actorsRef.current.loads.setVisibility(layers.loads.isVisible);
      // 更新载荷比例
      if (actorsRef.current.loads.getMapper().setScaleFactor) {
        actorsRef.current.loads.getMapper().setScaleFactor(layers.loadsScale);
      }
    }

    // 渲染更新
    if (renderWindowRef.current) {
      renderWindowRef.current.render();
    }
  }, [loadLayer]);

  // 更新视图设置
  const updateViewSettings = useCallback((settings: ViewSettings) => {
    if (!rendererRef.current || !renderWindowRef.current) return;

    // 更新背景颜色
    if (settings.backgroundColor === 'dark') {
      rendererRef.current.setBackground(0.1, 0.1, 0.2);
    } else if (settings.backgroundColor === 'light') {
      rendererRef.current.setBackground(0.9, 0.9, 0.9);
    } else if (settings.backgroundColor === 'gradient') {
      rendererRef.current.setBackground(0.1, 0.1, 0.2);
      rendererRef.current.setBackground2(0.3, 0.3, 0.5);
      rendererRef.current.setGradientBackground(true);
    } else if (settings.backgroundColor === 'transparent') {
      rendererRef.current.setBackground(0, 0, 0, 0);
    }

    // 更新渲染模式
    Object.values(actorsRef.current).forEach(actor => {
      if (!actor) return;
      
      if (settings.renderMode === 'wireframe') {
        actor.getProperty().setRepresentation(1); // wireframe
      } else if (settings.renderMode === 'points') {
        actor.getProperty().setRepresentation(0); // points
      } else {
        actor.getProperty().setRepresentation(2); // surface
      }
    });

    // 更新环境光强度
    Object.values(actorsRef.current).forEach(actor => {
      if (!actor) return;
      actor.getProperty().setAmbient(settings.ambientIntensity);
    });

    // 更新坐标轴可见性
    if (axesWidgetRef.current) {
      axesWidgetRef.current.setEnabled(settings.showAxes);
    }

    // 更新抗锯齿
    if (renderWindowRef.current) {
      // VTK.js 中没有直接设置抗锯齿的方法，这里可能需要更高级的设置
    }

    // 更新阴影
    Object.values(actorsRef.current).forEach(actor => {
      if (!actor) return;
      actor.getProperty().setLighting(settings.shadows);
    });

    // 渲染更新
    renderWindowRef.current.render();
  }, []);

  return {
    initializeRenderer,
    updateLayers,
    updateViewSettings,
  };
}

// 保留旧的单层API以兼容现有代码
export function useSingleVtkLayer(layer: any, layerKey: string, options: any) {
  const [actor, setActor] = useState<VTKActor | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const actorRef = useRef<VTKActor | null>(null);

  useEffect(() => {
    if (!layer.url) {
      console.warn(`Layer ${layerKey} has no URL`);
      return;
    }

    const fetchData = async () => {
      try {
        const response = await fetch(layer.url!);
        if (!response.ok) {
          throw new Error(`Failed to fetch ${layer.url}: ${response.statusText}`);
        }

        const data = await response.text();
        const reader = vtkXMLPolyDataReader.newInstance();
        reader.parseAsText(data);
        const polydata = reader.getOutputData();

        let mapper;
        let actor;

        if (options.type === 'loads') {
          // For loads, use Glyph3DMapper with arrow source
          const arrowSource = vtkArrowSource.newInstance();
          mapper = vtkGlyph3DMapper.newInstance({
            scaleMode: 0, // SCALE_BY_MAGNITUDE
            scaleArray: 'scale',
            orientationArray: 'orientation'
          });
          
          mapper.setInputData(polydata);
          mapper.setSourceConnection(arrowSource.getOutputPort());
          
          // Apply scaling if provided
          if (options.loadsScale) {
            mapper.setScaleFactor(options.loadsScale);
          }
        } else if (options.type === 'constraints') {
          // For constraints, use Glyph3DMapper with sphere source
          const sphereSource = vtkSphereSource.newInstance({
            radius: 0.05,
            phiResolution: 16,
            thetaResolution: 16,
          });
          
          mapper = vtkGlyph3DMapper.newInstance({
            scaleMode: 0, // SCALE_BY_MAGNITUDE
            scaleArray: 'scale',
          });
          
          mapper.setInputData(polydata);
          mapper.setSourceConnection(sphereSource.getOutputPort());
        } else {
          // For regular mesh, use standard mapper
          mapper = vtkMapper.newInstance();
          mapper.setInputData(polydata);
        }

        actor = vtkActor.newInstance();
        actor.setMapper(mapper);
        actor.getProperty().setColor(...options.color);

        setActor(actor);
        actorRef.current = actor;
      } catch (error) {
        console.error(`Error loading layer ${layerKey}:`, error);
      }
    };

    fetchData();

    return () => {
      if (actorRef.current) {
        actorRef.current.delete();
        actorRef.current = null;
      }
    };
  }, [layer.url, layerKey, options]);

  useEffect(() => {
    if (actorRef.current) {
      actorRef.current.setVisibility(isVisible);
    }
  }, [isVisible]);

  const toggleVisibility = () => {
    setIsVisible(!isVisible);
  };

  return {
    actor,
    isVisible,
    toggleVisibility,
  };
} 