import React, { useEffect, useRef } from 'react';
import { useVtkContext } from './VtkProvider';
import { GridSettings } from '../../hooks/useGridSettings';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkPolyData from '@kitware/vtk.js/Common/DataModel/PolyData';
import vtkCellArray from '@kitware/vtk.js/Common/Core/CellArray';
import vtkPoints from '@kitware/vtk.js/Common/Core/Points';

interface GridRendererProps {
  gridSettings: GridSettings;
}

/**
 * 网格渲染组件，用于在 3D 视图中显示网格
 */
const GridRenderer: React.FC<GridRendererProps> = ({ gridSettings }) => {
  const { getRenderer, renderWindow } = useVtkContext();
  const gridActorRef = useRef<vtkActor | null>(null);
  
  // 创建网格
  useEffect(() => {
    const renderer = getRenderer();
    if (!renderer || !renderWindow) return;
    
    // 如果已经有网格，先移除
    if (gridActorRef.current) {
      renderer.removeActor(gridActorRef.current);
      gridActorRef.current = null;
    }
    
    // 如果网格未启用或不可见，则不创建
    if (!gridSettings.enabled || !gridSettings.visible) {
      renderWindow.render();
      return;
    }
    
    // 创建网格数据
    const gridSize = gridSettings.gridSize;
    const halfSize = gridSize * 50; // 网格大小的一半，扩展到足够大
    const subdivisions = gridSettings.subdivisions;
    const cellSize = gridSize / subdivisions;
    
    // 创建点和线
    const points = vtkPoints.newInstance();
    const lines = vtkCellArray.newInstance();
    
    // 创建 X 方向的线
    for (let i = -halfSize; i <= halfSize; i += cellSize) {
      // 主网格线（粗线）
      if (Math.abs(i) % gridSize < 0.001 || Math.abs(i) < 0.001) {
        points.insertNextPoint(-halfSize, i, 0);
        points.insertNextPoint(halfSize, i, 0);
        const line = [2, points.getNumberOfPoints() - 2, points.getNumberOfPoints() - 1];
        lines.insertNextCell(line);
      } 
      // 细分线（细线）
      else {
        points.insertNextPoint(-halfSize, i, 0);
        points.insertNextPoint(halfSize, i, 0);
        const line = [2, points.getNumberOfPoints() - 2, points.getNumberOfPoints() - 1];
        lines.insertNextCell(line);
      }
    }
    
    // 创建 Y 方向的线
    for (let i = -halfSize; i <= halfSize; i += cellSize) {
      // 主网格线（粗线）
      if (Math.abs(i) % gridSize < 0.001 || Math.abs(i) < 0.001) {
        points.insertNextPoint(i, -halfSize, 0);
        points.insertNextPoint(i, halfSize, 0);
        const line = [2, points.getNumberOfPoints() - 2, points.getNumberOfPoints() - 1];
        lines.insertNextCell(line);
      } 
      // 细分线（细线）
      else {
        points.insertNextPoint(i, -halfSize, 0);
        points.insertNextPoint(i, halfSize, 0);
        const line = [2, points.getNumberOfPoints() - 2, points.getNumberOfPoints() - 1];
        lines.insertNextCell(line);
      }
    }
    
    // 创建多边形数据
    const polyData = vtkPolyData.newInstance();
    polyData.setPoints(points);
    polyData.setLines(lines);
    
    // 创建映射器和演员
    const mapper = vtkMapper.newInstance();
    mapper.setInputData(polyData);
    
    const actor = vtkActor.newInstance();
    actor.setMapper(mapper);
    
    // 设置网格颜色和透明度
    actor.getProperty().setColor(0.7, 0.7, 0.7);
    actor.getProperty().setOpacity(0.5);
    
    // 将网格添加到渲染器
    renderer.addActor(actor);
    gridActorRef.current = actor;
    
    // 渲染场景
    renderWindow.render();
    
    // 清理函数
    return () => {
      if (gridActorRef.current && renderer) {
        renderer.removeActor(gridActorRef.current);
        renderWindow.render();
      }
    };
  }, [gridSettings, getRenderer, renderWindow]);
  
  return null;
};

export default GridRenderer; 