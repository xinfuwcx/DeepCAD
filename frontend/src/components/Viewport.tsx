import React, { useRef, useEffect, useState, useCallback } from 'react';
import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkScalarBarActor from '@kitware/vtk.js/Rendering/Core/ScalarBarActor';
import vtkColorMaps from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction/ColorMaps';
import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction';
import vtkRenderer from '@kitware/vtk.js/Rendering/Core/Renderer';
import vtkRenderWindow from '@kitware/vtk.js/Rendering/Core/RenderWindow';
import { Spin, Alert } from 'antd';
import { useShallow } from 'zustand/react/shallow';

import { useSceneStore } from '../stores/useSceneStore';
import { useVtkLayer } from '../hooks/useVtkLayer';
import { useVtkAnimatedLight } from '../hooks/useVtkAnimatedLight';

// Define VTK object types for clarity
type VTKRenderer = ReturnType<typeof vtkRenderer.newInstance>;
type VTKRenderWindow = ReturnType<typeof vtkRenderWindow.newInstance>;
type VTKActor = ReturnType<typeof vtkActor.newInstance>;
type VTKScalarBarActor = ReturnType<typeof vtkScalarBarActor.newInstance>;
type VTKColorTransferFunction = ReturnType<typeof vtkColorTransferFunction.newInstance>;

const Viewport: React.FC = () => {
    // --- Refs for core VTK objects ---
    const vtkContainerRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<VTKRenderer | null>(null);
    const renderWindowRef = useRef<VTKRenderWindow | null>(null);
    const fullScreenRendererRef = useRef<any | null>(null);

    // --- Refs for accessory VTK objects managed here ---
    const scalarBarActorRef = useRef<VTKScalarBarActor | null>(null);
    const colorFunctionRef = useRef<VTKColorTransferFunction | null>(null);

    // --- State from Zustand store ---
    const { layers, postProcessing, updatePostProcessing } = useSceneStore(
        useShallow(state => ({
            layers: state.layers,
            postProcessing: state.postProcessing,
            updatePostProcessing: state.updatePostProcessing,
        }))
    );
    
    // Determine which layer to treat as the main visualization layer
    const mainLayer = layers.result.url ? layers.result : layers.mesh;

    // --- Custom hooks for managing VTK layers ---
    const { actor: mainActor, isLoading: isMainLoading, error: mainError } = useVtkLayer(mainLayer, 'main', {
        type: 'mesh', // 'mesh' type is for standard surface rendering
        color: [0.9, 0.9, 0.9], // Default color, will be overridden by scalar data if available
    });

    const { actor: constraintsActor } = useVtkLayer(layers.constraints, 'constraints', {
        type: 'constraints',
        color: [0.1, 0.4, 0.8], // Blue for constraints
    });

    const { actor: loadsActor } = useVtkLayer(layers.loads, 'loads', {
        type: 'loads',
        color: [0.8, 0.2, 0.2], // Red for loads
        loadsScale: layers.loadsScale,
    });

    // --- Custom hook for animated light ---
    useVtkAnimatedLight(rendererRef.current, renderWindowRef.current);
    
    // Schedule a render call
    const scheduleRender = useCallback(() => {
        if (renderWindowRef.current) {
            renderWindowRef.current.render();
        }
    }, []);

    // --- Core VTK setup effect ---
    useEffect(() => {
        if (!vtkContainerRef.current) return;

        const fsm = vtkFullScreenRenderWindow.newInstance({
            container: vtkContainerRef.current,
        });
        fullScreenRendererRef.current = fsm;

        const ren = fsm.getRenderer();
        (ren as any).setUseGradientBackground(true);
        ren.setBackground([0.06, 0.06, 0.09]);
        ren.setBackground2([0.15, 0.15, 0.22]);

        rendererRef.current = ren;
        renderWindowRef.current = fsm.getRenderWindow();

        // Cleanup on unmount
        return () => {
            if (fullScreenRendererRef.current) {
                fullScreenRendererRef.current.delete();
                fullScreenRendererRef.current = null;
            }
            rendererRef.current = null;
            renderWindowRef.current = null;
        };
    }, []);
    
    // --- Effect to manage actors in the renderer ---
    useEffect(() => {
        const renderer = rendererRef.current;
        if (!renderer) return;

        const actors = [mainActor, constraintsActor, loadsActor];
        const currentActors = renderer.getActors();

        // Add new actors
        actors.forEach(actor => {
            if (actor && !currentActors.includes(actor)) {
                renderer.addActor(actor);
            }
        });

        // Remove old actors
        currentActors.forEach(actor => {
            if (!actors.includes(actor as VTKActor)) {
                // Don't remove the scalar bar, it's managed separately
                if (actor !== scalarBarActorRef.current) {
                    renderer.removeActor(actor);
                }
            }
        });

        scheduleRender();

    }, [mainActor, constraintsActor, loadsActor, scheduleRender]);

    // --- Effect for post-processing ---
    useEffect(() => {
        if (!mainActor || !rendererRef.current) return;
        
        const renderer = rendererRef.current;
        const mapper = mainActor.getMapper() as ReturnType<typeof vtkMapper.newInstance>;
        if (!mapper) return;

        const isResultData = !!layers.result.url;

        if (isResultData) {
            const inputData = mapper.getInputData();
            if (!inputData) return;

            const pointData = inputData.getPointData();
            const dataArray = pointData.getArrayByName(postProcessing.resultType);

            if (dataArray) {
                pointData.setActiveScalars(dataArray.getName());
                
                let cfun = colorFunctionRef.current;
                if (!cfun) {
                    cfun = vtkColorTransferFunction.newInstance();
                    colorFunctionRef.current = cfun;
                }

                const preset = vtkColorMaps.getPresetByName(postProcessing.colorMap);
                cfun.applyColorMap(preset);

                let dataRange;
                if (postProcessing.useCustomRange) {
                    dataRange = postProcessing.customRange;
                } else {
                    dataRange = dataArray.getRange();
                    // Update store if auto-ranging
                    if (postProcessing.customRange[0] !== dataRange[0] || postProcessing.customRange[1] !== dataRange[1]) {
                         updatePostProcessing({ customRange: [dataRange[0], dataRange[1]] });
                    }
                }
                cfun.setMappingRange(dataRange[0], dataRange[1]);
                cfun.updateRange();
                
                mapper.setLookupTable(cfun);
                mapper.setColorByArrayName(dataArray.getName());
                mapper.setScalarModeToUsePointData();
                mapper.setScalarVisibility(true);

                // Setup PBR material properties for metallic look
                const prop = mainActor.getProperty();
                (prop as any).setInterpolationToPBR?.();
                (prop as any).setMetallic?.(0.1);
                (prop as any).setRoughness?.(0.2);

                // --- Scalar Bar ---
                let sbar = scalarBarActorRef.current;
                if (!sbar) {
                    sbar = vtkScalarBarActor.newInstance();
                    scalarBarActorRef.current = sbar;
                    renderer.addActor(sbar);
                }
                sbar.setScalarsToColors(cfun);
                sbar.setAxisLabel(postProcessing.resultType);
                sbar.setVisibility(postProcessing.showScalarBar);

            } else {
                console.warn(`Result type "${postProcessing.resultType}" not found.`);
                mapper.setScalarVisibility(false);
                if (scalarBarActorRef.current) scalarBarActorRef.current.setVisibility(false);
            }
        } else {
            // Not result data, just show mesh
            mapper.setScalarVisibility(false);
            if (scalarBarActorRef.current) scalarBarActorRef.current.setVisibility(false);
        }

        // --- Wireframe ---
        const prop = mainActor.getProperty();
        if (postProcessing.showWireframe) {
            prop.setRepresentation(1); // Wireframe
        } else {
            prop.setRepresentation(2); // Surface
        }

        scheduleRender();

    }, [mainActor, layers.result.url, postProcessing, scheduleRender, updatePostProcessing]);


    // --- Render logic ---
    if (isMainLoading) {
        return (
            <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a1a' }}>
                <Spin size="large" tip="Loading Model..." />
            </div>
        );
    }

    if (mainError) {
        return (
            <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
                <Alert message="Error Loading Model" description={mainError} type="error" showIcon />
            </div>
        );
    }
    
    if (!mainLayer.url) {
         return (
            <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a1a' }}>
                <p style={{color: 'white', fontSize: '1.2em'}}>No model loaded. Please run meshing or analysis.</p>
            </div>
        );
    }
    
    return <div ref={vtkContainerRef} style={{ width: '100%', height: '100%' }} />;
};

export default Viewport; 