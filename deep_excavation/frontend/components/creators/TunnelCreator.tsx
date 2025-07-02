import React, { useState, useMemo } from 'react';
import { useStore } from '../../core/store';
import { CreateTunnelFeature, Point3D } from '../../services/parametricAnalysisService';
import { v4 as uuidv4 } from 'uuid';

const TunnelPathSchematic = ({ path }: { path: Point3D[] }) => {
    if (path.length < 2) {
        return (
            <div className="w-full h-32 bg-gray-700 border border-gray-600 rounded flex items-center justify-center">
                <p className="text-gray-400">请输入至少两个点以预览路径</p>
            </div>
        );
    }
    const points2D = path.map(p => ({ x: p.x, y: p.z }));
    // ... (Same SVG logic as DiaphragmWallSchematic but for a polyline)
    const svgPath = points2D.map(p => `${p.x},${p.y}`).join(' ');

    return (
        <div className="w-full h-32 bg-gray-800 border border-gray-600 rounded overflow-hidden">
            <svg /* ... viewBox etc ... */ >
                {/* ... axes ... */}
                <polyline 
                    points={svgPath} 
                    fill="none" 
                    stroke="#3B82F6" 
                    strokeWidth={3} 
                    vectorEffect="non-scaling-stroke" 
                />
            </svg>
        </div>
    );
};

const TunnelSectionSchematic = ({ width, height }: { width: number, height: number}) => {
    const radius = width / 2;
    const sideHeight = height - radius;
    const padding = 10;
    const viewBox = `${-width/2 - padding} ${-padding} ${width + padding*2} ${height + padding*2}`;

    const pathData = `
        M ${-radius},0 
        L ${-radius},${sideHeight} 
        A ${radius},${radius} 0 0 1 ${radius},${sideHeight} 
        L ${radius},0
    `;

    return (
         <div className="w-full h-32 mt-2 bg-gray-800 border border-gray-600 rounded overflow-hidden">
            <svg width="100%" height="100%" viewBox={viewBox} preserveAspectRatio="xMidYMid meet">
                <path d={pathData} fill="rgba(59, 130, 246, 0.3)" stroke="#3B82F6" strokeWidth={2} vectorEffect="non-scaling-stroke" />
                {/* Dimensions */}
                <line x1={-radius} y1={-5} x2={radius} y2={-5} stroke="white" strokeWidth={1} vectorEffect="non-scaling-stroke" />
                <text x={0} y={-8} fill="white" fontSize="8" textAnchor="middle">{`W: ${width}m`}</text>
                <line x1={radius+5} y1={0} x2={radius+5} y2={height} stroke="white" strokeWidth={1} vectorEffect="non-scaling-stroke" />
                <text x={radius + 8} y={height/2} fill="white" fontSize="8" textAnchor="start">{`H: ${height}m`}</text>
            </svg>
        </div>
    )
}

const TunnelCreator = () => {
  const [width, setWidth] = useState(10);
  const [height, setHeight] = useState(8);
  const [pathText, setPathText] = useState('10, 5, 0\n90, 5, 0');
  const { addFeature, startPicking, stopPicking, pickingState } = useStore(state => ({
    addFeature: state.addFeature,
    startPicking: state.startPicking,
    stopPicking: state.stopPicking,
    pickingState: state.pickingState,
  }));

  const handlePickPath = () => {
    if (pickingState.isActive) {
      stopPicking();
      return;
    }
    setPathText(''); // Clear on new pick
    startPicking((point) => {
      const newPointStr = `${point.x},${point.y},${point.z}`;
      setPathText(prev => prev ? `${prev}\n${newPointStr}` : newPointStr);
    });
  };

  const parsedPath = useMemo(() => {
    const pathPoints: Point3D[] = pathText.split('\n')
      .map(line => {
        const parts = line.split(',').map(s => parseFloat(s.trim()));
        return parts.length === 3 && !parts.some(isNaN) ? { x: parts[0], y: parts[1], z: parts[2] } : null;
      })
      .filter((p): p is Point3D => p !== null);

    return pathPoints;
  }, [pathText]);

  const handleCreateTunnel = () => {
    if (parsedPath.length < 2) {
        alert("请输入至少两个有效的路径点 (格式: x, y, z) 来定义隧道中心线。");
        return;
    }

    const features = useStore.getState().features;
    const parentFeature = features.slice().reverse().find(f => f.type === 'CreateTerrain' || f.type === 'CreateBox');
    
    if (!parentFeature) {
        alert("请先创建一个土体计算域，然后再生成隧道。");
        return;
    }

    const newFeature: CreateTunnelFeature = {
      id: uuidv4(),
      name: '隧道',
      type: 'CreateTunnel',
      parentId: parentFeature.id,
      parameters: {
        pathPoints: parsedPath,
        width: width,
        height: height,
      },
    };

    addFeature(newFeature);
  };

  return (
    <div className="p-4 border rounded-lg mt-4">
      <h3 className="text-lg font-bold mb-4">隧道生成</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="text-md font-semibold mb-2">参数输入</h4>
          <p className="text-sm text-gray-500 mb-2">
            定义隧道的截面尺寸和中心线路径。
          </p>
          <div className="flex flex-col gap-2">
            <input type="number" value={width} onChange={e => setWidth(parseFloat(e.target.value) || 0)} placeholder="隧道宽度 (m)" className="p-2 border rounded bg-gray-700 text-white" />
            <input type="number" value={height} onChange={e => setHeight(parseFloat(e.target.value) || 0)} placeholder="隧道高度 (m)" className="p-2 border rounded bg-gray-700 text-white" />
            <div className="flex items-center gap-2 mt-2">
              <textarea 
                className="flex-grow h-24 p-2 border rounded bg-gray-700"
                value={pathText}
                onChange={(e) => setPathText(e.target.value)}
                placeholder="隧道中心线路径点, e.g.&#10;0,5,0&#10;100,5,0"
              />
              <button 
                onClick={handlePickPath}
                className={`p-2 rounded ${pickingState.isActive ? 'bg-red-500 hover:bg-red-700' : 'bg-green-500 hover:bg-green-700'}`}
                title={pickingState.isActive ? "停止拾取 (ESC)" : "在视图中拾取路径点"}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.042 21.672L13.684 16.6m0 0l-2.51-2.22m2.51 2.22l-2.22 2.51m2.22-2.51L12.07 14.5m2.614-2.128a3 3 0 10-4.242-4.242 3 3 0 004.242 4.242zM12 12a2 2 0 100-4 2 2 0 000 4z" />
                </svg>
              </button>
            </div>
            <button onClick={handleCreateTunnel} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mt-2">
              生成隧道
            </button>
          </div>
        </div>
        
        <div>
          <h4 className="text-md font-semibold mb-2">路径示意图 (俯视图)</h4>
          <TunnelPathSchematic path={parsedPath} />
          <h4 className="text-md font-semibold mb-2 mt-4">截面示意图</h4>
          <TunnelSectionSchematic width={width} height={height} />
        </div>
      </div>
    </div>
  );
};

export default TunnelCreator; 