import React, { useState } from 'react';
import * as THREE from 'three';
import { useStore } from '../../core/store';
import { CreateTerrainFeature, Point3D } from '../../services/parametricAnalysisService';
import { v4 as uuidv4 } from 'uuid';

const SoilDomainCreator = () => {
  const [pointsText, setPointsText] = useState('0, 10, 0\n100, 12, 0\n100, 9, 100\n0, 11, 100');
  const [depth, setDepth] = useState(20);
  const addFeature = useStore(state => state.addFeature);

  const handleCreateSoilDomain = () => {
    // 1. Parse points from textarea
    const points: Point3D[] = pointsText.split('\n')
      .map(line => {
        const parts = line.split(',').map(s => parseFloat(s.trim()));
        return parts.length === 3 && !parts.some(isNaN) ? { x: parts[0], y: parts[1], z: parts[2] } : null;
      })
      .filter((p): p is Point3D => p !== null);

    if (points.length < 3) {
      alert("请输入至少三个有效的勘测点 (格式: x, y, z) 以形成一个表面。");
      return;
    }

    // 2. Create a CreateTerrainFeature
    const newFeature: CreateTerrainFeature = {
      id: uuidv4(),
      name: '起伏地形土体',
      type: 'CreateTerrain',
      parameters: {
        points: points,
        depth: depth,
      },
    };

    // 3. Add the feature to the global store
    addFeature(newFeature);
  };

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-bold mb-4">土体计算域生成</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="text-md font-semibold mb-2">勘测点与深度</h4>
          <p className="text-sm text-gray-500 mb-2">
            每行输入一个勘测点 (X, Y, Z)，并指定土体厚度。
          </p>
          <div className="flex flex-col gap-2">
            <textarea 
              className="w-full h-32 p-2 border rounded bg-gray-700 text-white"
              value={pointsText}
              onChange={(e) => setPointsText(e.target.value)}
              placeholder="例如:&#10;0, 0, 10&#10;100, 0, 12&#10;0, 100, 9"
            />
            <input 
              type="number"
              value={depth}
              onChange={(e) => setDepth(parseFloat(e.target.value) || 0)}
              placeholder="土体厚度 (m)" 
              className="p-2 border rounded bg-gray-700 text-white" 
            />
            <button 
              onClick={handleCreateSoilDomain}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              生成土体
            </button>
          </div>
        </div>
        
        <div>
          <h4 className="text-md font-semibold mb-2">示意图</h4>
          <div className="w-full h-48 bg-gray-200 border rounded flex items-center justify-center">
            <p className="text-gray-500">平面/侧面示意图</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SoilDomainCreator; 