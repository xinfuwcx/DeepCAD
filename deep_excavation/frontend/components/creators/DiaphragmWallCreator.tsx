import React, { useState, useMemo } from 'react';
import { useStore } from '../../core/store';
import { CreateDiaphragmWallFeature, Point3D } from '../../services/parametricAnalysisService';
import { v4 as uuidv4 } from 'uuid';

const DiaphragmWallSchematic = ({ path }: { path: Point3D[] }) => {
  if (path.length < 2) {
    return (
      <div className="w-full h-48 bg-gray-700 border border-gray-600 rounded flex items-center justify-center">
        <p className="text-gray-400">请输入起点和终点以预览</p>
      </div>
    );
  }

  const points2D = path.map(p => ({ x: p.x, y: p.z }));

  const padding = 20;
  const minX = Math.min(...points2D.map(p => p.x));
  const maxX = Math.max(...points2D.map(p => p.x));
  const minY = Math.min(...points2D.map(p => p.y));
  const maxY = Math.max(...points2D.map(p => p.y));

  // Handle case where wall is a point or a perfectly vertical/horizontal line
  const width = Math.max(maxX - minX, 1);
  const height = Math.max(maxY - minY, 1);
  
  const viewBox = `${minX - padding} ${minY - padding} ${width + padding * 2} ${height + padding * 2}`;

  return (
    <div className="w-full h-48 bg-gray-800 border border-gray-600 rounded overflow-hidden">
      <svg width="100%" height="100%" viewBox={viewBox} preserveAspectRatio="xMidYMid meet">
        {/* Draw axes */}
        <line x1={minX - padding} y1={0} x2={maxX + padding} y2={0} stroke="#555" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        <line x1={0} y1={minY - padding} x2={0} y2={maxY + padding} stroke="#555" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        <text x={maxX + padding / 2} y={-5} fill="#777" fontSize="8" textAnchor="middle">X</text>
        <text x={5} y={minY - padding / 2} fill="#777" fontSize="8" textAnchor="start">Z</text>
        
        {/* Draw wall path */}
        <line 
            x1={points2D[0].x} y1={points2D[0].y}
            x2={points2D[1].x} y2={points2D[1].y}
            stroke="#3B82F6" strokeWidth={4} strokeLinecap="round" vectorEffect="non-scaling-stroke" 
        />
      </svg>
    </div>
  );
};

const DiaphragmWallCreator = () => {
  const [pathText, setPathText] = useState('10,0,10\n90,0,10');
  const [thickness, setThickness] = useState(1);
  const [height, setHeight] = useState(25);
  const [analysisModel, setAnalysisModel] = useState<'shell' | 'solid'>('shell');
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
      alert("请输入且仅输入两个路径点 (起点和终点) 来定义地连墙。");
      return;
    }

    const newFeature: CreateDiaphragmWallFeature = {
      id: uuidv4(),
      name: '地连墙',
      type: 'CreateDiaphragmWall',
      parameters: {
        path: [parsedPath[0], parsedPath[1]],
        thickness,
        height,
        analysisModel,
      },
    };

    addFeature(newFeature);
  };

  return (
    <div className="p-4 border rounded-lg mt-4">
      <h3 className="text-lg font-bold mb-4">地连墙生成</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="text-md font-semibold mb-2">参数输入</h4>
          <p className="text-sm text-gray-500 mb-2">
            定义地连墙的路径、厚度和高度。
          </p>
          <div className="flex flex-col gap-2">
            <label>路径 (起点, 终点):</label>
            <textarea
              className="w-full h-16 p-2 border rounded bg-gray-700"
              value={pathText}
              onChange={e => setPathText(e.target.value)}
              placeholder="10,0,10&#10;90,0,10"
            />
            <label>墙体厚度 (m): <input type="number" value={thickness} onChange={e => setThickness(parseFloat(e.target.value) || 0)} className="p-1 border rounded bg-gray-600 ml-2" /></label>
            <label>墙体高度 (m): <input type="number" value={height} onChange={e => setHeight(parseFloat(e.target.value) || 0)} className="p-1 border rounded bg-gray-600 ml-2" /></label>
            <label>
              分析模型:
              <select
                value={analysisModel}
                onChange={e => setAnalysisModel(e.target.value as 'shell' | 'solid')}
                className="p-1 border rounded bg-gray-600 ml-2"
              >
                <option value="shell">壳单元</option>
                <option value="solid">实体单元</option>
              </select>
            </label>
            <button onClick={handleCreate} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mt-2">
              生成地连墙
            </button>
          </div>
        </div>
        
        <div>
          <h4 className="text-md font-semibold mb-2">示意图</h4>
          <DiaphragmWallSchematic path={parsedPath} />
        </div>
      </div>
    </div>
  );
};

export default DiaphragmWallCreator; 