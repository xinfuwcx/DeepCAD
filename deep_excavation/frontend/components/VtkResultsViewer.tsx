import React, { useRef, useEffect } from 'react';

// VTK.js imports
// We will uncomment and use these when we have a real data pipeline
// import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';
// import vtkHttpDataSetReader from '@kitware/vtk.js/IO/Core/HttpDataSetReader';
// import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';
// import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';

interface VtkResultsViewerProps {
  resultsUrl?: string; // URL to the .vtu file
}

const VtkResultsViewer: React.FC<VtkResultsViewerProps> = ({ resultsUrl }) => {
  const vtkContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!resultsUrl || !vtkContainerRef.current) {
      return;
    }

    // This is where the VTK pipeline would be set up.
    // The code is commented out for now as it requires a valid results file and a running backend.

    /*
    const fullScreenRenderer = vtkFullScreenRenderWindow.newInstance({
      rootContainer: vtkContainerRef.current,
    });
    
    const renderer = fullScreenRenderer.getRenderer();
    const renderWindow = fullScreenRenderer.getRenderWindow();

    // 1. Create a reader
    const reader = vtkHttpDataSetReader.newInstance({ fetchGzip: true });
    
    // 2. Create a mapper and actor
    const mapper = vtkMapper.newInstance();
    const actor = vtkActor.newInstance();
    
    actor.setMapper(mapper);
    mapper.setInputConnection(reader.getOutputPort());
    
    // 3. Add actor to renderer
    renderer.addActor(actor);
    
    // 4. Fetch the data from the backend
    reader.setUrl(resultsUrl).then(() => {
        // Reset camera to see the object
        renderer.resetCamera();
        renderWindow.render();
    });

    */
    
    console.log("VTK Viewer would be initialized here with URL:", resultsUrl);
    
    // Cleanup function
    return () => {
      console.log("VTK Viewer cleanup");
      // Clean up VTK objects here to prevent memory leaks
    };
  }, [resultsUrl]);

  return (
    <div className="p-4 border rounded-lg mt-4">
      <h3 className="text-lg font-bold mb-4">分析结果可视化 (VTK)</h3>
      <div 
        ref={vtkContainerRef} 
        className="w-full h-96 bg-gray-900 border-2 border-dashed border-gray-500 flex items-center justify-center"
      >
        {resultsUrl ? (
          <p className="text-gray-400">VTK渲染区域</p>
        ) : (
          <p className="text-gray-500">等待分析结果...</p>
        )}
      </div>
    </div>
  );
};

export default VtkResultsViewer; 