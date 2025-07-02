import React, { useState } from 'react';
import { useStore } from '../../core/store';
import { CreateBuildingFeature } from '../../services/parametricAnalysisService';
import { v4 as uuidv4 } from 'uuid';

const BuildingCreator = () => {
  const [width, setWidth] = useState(20);
  const [height, setHeight] = useState(30);
  const [depth, setDepth] = useState(20);
  const [positionX, setPositionX] = useState(50);
  const [positionZ, setPositionZ] = useState(-30);
  const addFeature = useStore(state => state.addFeature);

  const handleCreateBuilding = () => {
    // For buildings, Y position is usually calculated to sit on top of the terrain.
    // For now, we'll use a fixed Y value, assuming ground is at Y=0.
    const positionY = height / 2;

    const newFeature: CreateBuildingFeature = {
      id: uuidv4(),
      name: '建筑物',
      type: 'CreateBuilding',
      parameters: {
        width,
        height,
        depth,
        position: { x: positionX, y: positionY, z: positionZ },
      },
    };
    addFeature(newFeature);
  };

  return (
    <div className="p-4 border rounded-lg mt-4">
      <h3 className="text-lg font-bold mb-4">临近建筑物</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="text-md font-semibold mb-2">参数输入</h4>
          <p className="text-sm text-gray-500 mb-2">
            定义建筑物的尺寸和平面位置。
          </p>
          <div className="flex flex-col gap-2">
            <label>宽度 (X): <input type="number" value={width} onChange={e => setWidth(parseFloat(e.target.value) || 0)} className="p-1 border rounded bg-gray-600 ml-2" /></label>
            <label>高度 (Y): <input type="number" value={height} onChange={e => setHeight(parseFloat(e.target.value) || 0)} className="p-1 border rounded bg-ray-600 ml-2" /></label>
            <label>深度 (Z): <input type="number" value={depth} onChange={e => setDepth(parseFloat(e.target.value) || 0)} className="p-1 border rounded bg-gray-600 ml-2" /></label>
            <label>位置 X: <input type="number" value={positionX} onChange={e => setPositionX(parseFloat(e.target.value) || 0)} className="p-1 border rounded bg-gray-600 ml-2" /></label>
            <label>位置 Z: <input type="number" value={positionZ} onChange={e => setPositionZ(parseFloat(e.target.value) || 0)} className="p-1 border rounded bg-gray-600 ml-2" /></label>
            
            <button onClick={handleCreateBuilding} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mt-2">
              生成建筑物
            </button>
          </div>
        </div>
        
        <div>
          <h4 className="text-md font-semibold mb-2">示意图</h4>
          <div className="w-full h-48 bg-gray-200 border rounded flex items-center justify-center">
            <p className="text-gray-500">建筑物位置示意图</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuildingCreator; 