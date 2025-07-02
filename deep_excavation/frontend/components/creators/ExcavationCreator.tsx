import React, { useState, useMemo } from 'react';
import { useStore } from '../../core/store';
import { CreateExcavationFeature, Point2D } from '../../services/parametricAnalysisService';
import { v4 as uuidv4 } from 'uuid';

const ExcavationSchematic = ({ points }: { points: Point2D[] }) => {
  if (points.length < 2) {
    return (
      <div className="w-full h-48 bg-gray-700 border border-gray-600 rounded flex items-center justify-center">
        <p className="text-gray-400">请输入至少两个点以预览形状</p>
      </div>
    );
  }

  const padding = 20;
  const minX = Math.min(...points.map(p => p.x));
  const maxX = Math.max(...points.map(p => p.x));
  const minY = Math.min(...points.map(p => p.y));
  const maxY = Math.max(...points.map(p => p.y));

  const width = maxX - minX;
  const height = maxY - minY;
  
  const viewBox = `${minX - padding} ${minY - padding} ${width + padding * 2} ${height + padding * 2}`;

  const svgPoints = points.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <div className="w-full h-48 bg-gray-800 border border-gray-600 rounded overflow-hidden">
      <svg width="100%" height="100%" viewBox={viewBox} preserveAspectRatio="xMidYMid meet">
        {/* Draw axes */}
        <line x1={minX - padding} y1={0} x2={maxX + padding} y2={0} stroke="#555" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        <line x1={0} y1={minY - padding} x2={0} y2={maxY + padding} stroke="#555" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        <text x={maxX} y={-5} fill="#777" fontSize="8" textAnchor="middle">X</text>
        <text x={5} y={maxY} fill="#777" fontSize="8" textAnchor="start">Y</text>
        
        {/* Draw shape */}
        <polygon points={svgPoints} fill="rgba(59, 130, 246, 0.3)" stroke="#3B82F6" strokeWidth={2} vectorEffect="non-scaling-stroke" />

        {/* Draw points */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3} fill="#FFFFFF" vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
    </div>
  );
};

const ExcavationCreator = () => {
  const [pointsText, setPointsText] = useState('10,10\n90,10\n90,90\n10,90');
  const [depth, setDepth] = useState(15);
  const addFeature = useStore(state => state.addFeature);

  const parsedPoints = useMemo(() => {
    return pointsText.split('\n')
      .map(line => {
        const parts = line.split(',').map(s => parseFloat(s.trim()));
        return parts.length === 2 && !parts.some(isNaN) ? { x: parts[0], y: parts[1] } : null;
      })
      .filter((p): p is Point2D => p !== null);
  }, [pointsText]);

  const handleCreateExcavation = () => {
    if (parsedPoints.length < 3) {
      alert("请输入至少三个有效的二维坐标点 (格式: x,y) 来定义基坑轮廓。");
      return;
    }

    // 2. Find the latest terrain/soil feature to cut from.
    const features = useStore.getState().features;
    const parentFeature = features.slice().reverse().find(f => f.type === 'CreateTerrain' || f.type === 'CreateBox');
    
    if (!parentFeature) {
        alert("请先创建一个土体计算域，然后再生成基坑。");
        return;
    }

    // 3. Create the feature
    const newFeature: CreateExcavationFeature = {
      id: uuidv4(),
      name: '基坑',
      type: 'CreateExcavation',
      parentId: parentFeature.id,
      parameters: {
        points: parsedPoints,
        depth: depth,
      },
    };

    // 4. Add the feature to the global store
    addFeature(newFeature);
  };

  return (
    <div className="p-4 border rounded-lg mt-4">
      <h3 className="text-lg font-bold mb-4">基坑生成</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="text-md font-semibold mb-2">参数输入</h4>
          <p className="text-sm text-gray-500 mb-2">
            输入基坑的平面坐标点 (X,Y) 和深度。
          </p>
          <div className="flex flex-col gap-2">
            <button className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded" disabled>
              导入DXF文件 (未实现)
            </button>
            <textarea 
              className="w-full h-24 p-2 border rounded bg-gray-700 mt-2"
              value={pointsText}
              onChange={e => setPointsText(e.target.value)}
              placeholder="每行一个坐标点, e.g.&#10;0,0&#10;10,0&#10;10,10&#10;0,10"
            />
            <input 
              type="number" 
              value={depth}
              onChange={e => setDepth(parseFloat(e.target.value) || 0)}
              placeholder="基坑深度 (m)" 
              className="p-2 border rounded bg-gray-700 text-white mt-2" 
            />
             <button onClick={handleCreateExcavation} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mt-2">
              生成基坑
            </button>
          </div>
        </div>
        
        <div>
          <h4 className="text-md font-semibold mb-2">示意图</h4>
          <ExcavationSchematic points={parsedPoints} />
        </div>
      </div>
    </div>
  );
};

export default ExcavationCreator; 