import { useState, useEffect, useRef } from 'react';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkXMLPolyDataReader from '@kitware/vtk.js/IO/XML/XMLPolyDataReader';
import vtkGlyph3DMapper from '@kitware/vtk.js/Rendering/Core/Glyph3DMapper';
import vtkArrowSource from '@kitware/vtk.js/Filters/Sources/ArrowSource';
import vtkSphereSource from '@kitware/vtk.js/Filters/Sources/SphereSource';

import { Layer } from '../stores/useSceneStore';

type VTKActor = ReturnType<typeof vtkActor.newInstance>;

export interface VtkLayerOptions {
  type: 'mesh' | 'constraints' | 'loads';
  loadsScale?: number;
  color: [number, number, number];
}

export function useVtkLayer(layer: Layer, layerKey: string, options: VtkLayerOptions) {
  const [actor, setActor] = useState<VTKActor | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const readerRef = useRef<any>(null);

  useEffect(() => {
    if (!layer.url || !layer.isVisible) {
      setActor(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const newActor = vtkActor.newInstance();
    const reader = vtkXMLPolyDataReader.newInstance();
    readerRef.current = reader;

    reader
      .setUrl(layer.url)
      .then(() => {
        const polydata = reader.getOutputData(0);
        let mapper;

        if (options.type === 'mesh') {
          mapper = vtkMapper.newInstance();
          mapper.setInputData(polydata);
        } else {
          mapper = vtkGlyph3DMapper.newInstance();
          mapper.setInputData(polydata, 0);

          const source =
            options.type === 'loads'
              ? vtkArrowSource.newInstance()
              : vtkSphereSource.newInstance();
          
          mapper.setInputData(source.getOutputData(), 1);

          mapper.setOrientationArray('vectors');
          mapper.setScaleArray('scalars');
          mapper.setScaleFactor(options.loadsScale ?? 1.0);
          mapper.setScaleMode(vtkGlyph3DMapper.ScaleModes.SCALE_BY_MAGNITUDE);
        }

        newActor.setMapper(mapper);
        newActor.getProperty().setColor(options.color[0], options.color[1], options.color[2]);
        setActor(newActor);
      })
      .catch((err) => {
        console.error(err);
        setError(`Failed to load layer: ${layerKey}`);
      })
      .finally(() => {
        setIsLoading(false);
      });

    return () => {
      if (readerRef.current) {
        readerRef.current.delete();
        readerRef.current = null;
      }
      if (newActor) {
        newActor.delete();
      }
      setActor(null);
    };
  }, [layer.url, layer.isVisible, layerKey, options.type, options.color, options.loadsScale]);

  return { actor, isLoading, error };
} 