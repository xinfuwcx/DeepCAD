import React, { useState, useMemo } from 'react';
import { useStore } from '../../core/store';
import { CreatePileRaftFeature, Point3D } from '../../services/parametricAnalysisService';
import { v4 as uuidv4 } from 'uuid';
import * as THREE from 'three';

const PileRaftSchematic = ({ 
    path, 
    pileDiameter, 
    pileSpacing, 
    capBeamWidth 
}: { 
    path: Point3D[], 
    pileDiameter: number, 
    pileSpacing: number,
    capBeamWidth: number
}) => {
  if (path.length < 2) {
    return (
      <div className="w-full h-48 bg-gray-700 border border-gray-600 rounded flex items-center justify-center">
        <p className="text-gray-400">请输入起点和终点以预览路径</p>
      </div>
    );
  }

  const points2D = path.map(p => ({ x: p.x, y: p.z }));
  const start = new THREE.Vector2(points2D[0].x, points2D[0].y);
  const end = new THREE.Vector2(points2D[1].x, points2D[1].y);
  const length = start.distanceTo(end);
  const direction = new THREE.Vector2().subVectors(end, start).normalize();

  // Calculate pile positions
  const numPiles = pileSpacing > 0 ? Math.floor(length / pileSpacing) + 1 : 1;
  const pilePositions: {x: number, y: number}[] = [];
  for (let i = 0; i < numPiles; i++) {
    const posVec = new THREE.Vector2().copy(start).addScaledVector(direction, i * pileSpacing);
    pilePositions.push({x: posVec.x, y: posVec.y});
  }

  // Calculate viewBox
  const allPoints = [...points2D, ...pilePositions];
  const padding = 20;
  const minX = Math.min(...allPoints.map(p => p.x));
  const maxX = Math.max(...allPoints.map(p => p.x));
  const minY = Math.min(...allPoints.map(p => p.y));
  const maxY = Math.max(...allPoints.map(p => p.y));
  const width = Math.max(maxX - minX, capBeamWidth, 1);
  const height = Math.max(maxY - minY, capBeamWidth, 1);
  const viewBox = `${minX - padding} ${minY - padding} ${width + padding * 2} ${height + padding * 2}`;
  
  return (
    <div className="w-full h-48 bg-gray-800 border border-gray-600 rounded overflow-hidden">
      <svg width="100%" height="100%" viewBox={viewBox} preserveAspectRatio="xMidYMid meet">
        {/* Draw axes */}
        <line x1={minX - padding} y1={0} x2={maxX + padding} y2={0} stroke="#555" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        <line x1={0} y1={minY - padding} x2={0} y2={maxY + padding} stroke="#555" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        <text x={maxX + padding / 2} y={-5} fill="#777" fontSize="8" textAnchor="middle">X</text>
        <text x={5} y={minY - padding / 2} fill="#777" fontSize="8" textAnchor="start">Z</text>
        
        {/* Draw Cap Beam (as a thick line) */}
        <line 
            x1={start.x} y1={start.y}
            x2={end.x} y2={end.y}
            stroke="#6B7280" // gray-500
            strokeWidth={capBeamWidth} 
            strokeLinecap="round" 
            vectorEffect="non-scaling-stroke" 
        />

        {/* Draw Piles */}
        {pilePositions.map((pos, i) => (
            <circle
                key={i}
                cx={pos.x}
                cy={pos.y}
                r={pileDiameter / 2}
                fill="#3B82F6"
                stroke="#FFFFFF"
                strokeWidth={0.5}
                vectorEffect="non-scaling-stroke"
            />
        ))}
      </svg>
    </div>
  );
};

const PileRaftCreator = () => {
  const [pathText, setPathText] = useState('10,0,10\n90,0,10'); // Start and end points
  const [pileDiameter, setPileDiameter] = useState(0.8);
  const [pileSpacing, setPileSpacing] = useState(2);
  const [pileLength, setPileLength] = useState(20);
  const [capBeamWidth, setCapBeamWidth] = useState(1);
  const [capBeamHeight, setCapBeamHeight] = useState(1);
  const [pileAnalysisModel, setPileAnalysisModel] = useState<'beam' | 'solid'>('beam');
  const [capBeamAnalysisModel, setCapBeamAnalysisModel] = useState<'beam' | 'solid'>('beam');
  const addFeature = useStore(state => state.addFeature);

  const parsedPath = useMemo(() => {
    return pathText.split('\n')
      .map(line => {
        const parts = line.split(',').map(s => parseFloat(s.trim()));
        return parts.length === 3 && !parts.some(isNaN) ? { x: parts[0], y: parts[1], z: parts[2] } : null;
      })
      .filter((p): p is Point3D => p !== null);
  }, [pathText]);

  const handleCreate = () => {
    if (parsedPath.length !== 2) {
      alert("请输入且仅输入两个路径点 (起点和终点) 来定义排桩。");
      return;
    }

    // 2. Create the feature
    const newFeature: CreatePileRaftFeature = {
      id: uuidv4(),
      name: '排桩',
      type: 'CreatePileRaft',
      parameters: {
        path: [parsedPath[0], parsedPath[1]],
        pileDiameter,
        pileSpacing,
        pileLength,
        capBeamWidth,
        capBeamHeight,
        pileAnalysisModel,
        capBeamAnalysisModel,
      },
    };

    // 3. Add to store
    addFeature(newFeature);
  };

  return (
    <div className="p-4 border rounded-lg mt-4">
      <h3 className="text-lg font-bold mb-4">排桩生成</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="text-md font-semibold mb-2">参数输入</h4>
          <p className="text-sm text-gray-500 mb-2">
            定义排桩的路径、桩参数和冠梁尺寸。
          </p>
          <div className="flex flex-col gap-2">
            <label>路径 (起点, 终点):</label>
            <textarea
              className="w-full h-16 p-2 border rounded bg-gray-700"
              value={pathText}
              onChange={e => setPathText(e.target.value)}
              placeholder="10,0,10&#10;90,0,10"
            />
            <label>桩径 (m): <input type="number" value={pileDiameter} onChange={e => setPileDiameter(parseFloat(e.target.value) || 0)} className="p-1 border rounded bg-gray-600 ml-2" /></label>
            <label>桩间距 (m): <input type="number" value={pileSpacing} onChange={e => setPileSpacing(parseFloat(e.target.value) || 0)} className="p-1 border rounded bg-gray-600 ml-2" /></label>
            <label>桩长 (m): <input type="number" value={pileLength} onChange={e => setPileLength(parseFloat(e.target.value) || 0)} className="p-1 border rounded bg-gray-600 ml-2" /></label>
            <label>冠梁宽度 (m): <input type="number" value={capBeamWidth} onChange={e => setCapBeamWidth(parseFloat(e.target.value) || 0)} className="p-1 border rounded bg-gray-600 ml-2" /></label>
            <label>冠梁高度 (m): <input type="number" value={capBeamHeight} onChange={e => setCapBeamHeight(parseFloat(e.target.value) || 0)} className="p-1 border rounded bg-gray-600 ml-2" /></label>
            <label>
              桩分析模型:
              <select
                value={pileAnalysisModel}
                onChange={e => setPileAnalysisModel(e.target.value as 'beam' | 'solid')}
                className="p-1 border rounded bg-gray-600 ml-2"
              >
                <option value="beam">梁单元</option>
                <option value="solid">实体单元</option>
              </select>
            </label>
            <label>
              冠梁分析模型:
              <select
                value={capBeamAnalysisModel}
                onChange={e => setCapBeamAnalysisModel(e.target.value as 'beam' | 'solid')}
                className="p-1 border rounded bg-gray-600 ml-2"
              >
                <option value="beam">梁单元</option>
                <option value="solid">实体单元</option>
              </select>
            </label>
            <button onClick={handleCreate} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mt-2">
              生成排桩
            </button>
          </div>
        </div>
        
        <div>
          <h4 className="text-md font-semibold mb-2">平面示意图</h4>
          <PileRaftSchematic 
            path={parsedPath} 
            pileDiameter={pileDiameter}
            pileSpacing={pileSpacing}
            capBeamWidth={capBeamWidth}
          />
        </div>
      </div>
    </div>
  );
};

export default PileRaftCreator; 