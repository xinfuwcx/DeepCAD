import React, { useState } from 'react';
import { useStore } from '../../core/store';
import { CreateAnchorSystemFeature, AnyFeature } from '../../services/parametricAnalysisService';
import { v4 as uuidv4 } from 'uuid';

const AnchorSchematic = (props: {
    anchorLength: number;
    angle: number;
    walerWidth: number;
    walerHeight: number;
    wallThickness: number; // Assuming a typical thickness for schematic
}) => {
    const { anchorLength, angle, walerWidth, walerHeight, wallThickness } = props;

    const angleRad = (angle * Math.PI) / 180;
    const anchorEndX = anchorLength * Math.cos(angleRad);
    const anchorEndY = anchorLength * Math.sin(angleRad);
    
    // Determine viewBox to fit everything
    const padding = 20;
    const minX = -wallThickness - walerWidth - padding;
    const maxX = anchorEndX + padding;
    const minY = -walerHeight / 2 - padding;
    const maxY = anchorEndY + padding;
    
    const width = maxX - minX;
    const height = maxY - minY;
    
    const viewBox = `${minX} ${minY} ${width} ${height}`;

    return (
        <div className="w-full h-48 bg-gray-800 border border-gray-600 rounded overflow-hidden">
            <svg width="100%" height="100%" viewBox={viewBox} preserveAspectRatio="xMidYMid meet" style={{ transform: 'scale(1, -1)' }}>
                {/* Wall */}
                <rect x={-wallThickness} y={-1000} width={wallThickness} height={2000} fill="#6B7280" />
                <text x={-wallThickness/2} y={-maxY + 15} style={{transform: 'scale(1, -1)'}} fill="white" fontSize="10" textAnchor="middle">Wall</text>
                
                {/* Waler */}
                <rect x={-walerWidth} y={-walerHeight / 2} width={walerWidth} height={walerHeight} fill="#F59E0B" />
                
                {/* Anchor */}
                <line x1={0} y1={0} x2={anchorEndX} y2={anchorEndY} stroke="#3B82F6" strokeWidth={2} vectorEffect="non-scaling-stroke" />
                
                {/* Angle Arc */}
                <path d={`M 20 0 A 20 20 0 0 1 ${20 * Math.cos(angleRad)} ${20 * Math.sin(angleRad)}`} stroke="white" strokeWidth={1} fill="none" vectorEffect="non-scaling-stroke" />
                <text x={25} y={15} style={{transform: 'scale(1, -1)'}} fill="white" fontSize="8">{`${angle}°`}</text>
            </svg>
        </div>
    );
};

const AnchorCreator = () => {
  const [rowCount, setRowCount] = useState(2);
  const [horizontalSpacing, setHorizontalSpacing] = useState(2.5);
  const [verticalSpacing, setVerticalSpacing] = useState(2);
  const [startHeight, setStartHeight] = useState(-1);
  const [anchorLength, setAnchorLength] = useState(15);
  const [angle, setAngle] = useState(15);
  const [prestress, setPrestress] = useState(500);
  const [walerWidth, setWalerWidth] = useState(0.5);
  const [walerHeight, setWalerHeight] = useState(0.5);
  const [anchorAnalysisModel, setAnchorAnalysisModel] = useState<'beam' | 'truss'>('beam');
  const [walerAnalysisModel, setWalerAnalysisModel] = useState<'beam' | 'solid'>('beam');

  const addFeature = useStore(state => state.addFeature);

  const handleCreate = () => {
    const features = useStore.getState().features;
    const parentWall = features.slice().reverse().find(f => f.type === 'CreateDiaphragmWall') as AnyFeature | undefined;

    if (!parentWall) {
      alert("请先创建一面地连墙，然后再添加锚杆系统。");
      return;
    }

    const newFeature: CreateAnchorSystemFeature = {
      id: uuidv4(),
      name: '锚杆系统',
      type: 'CreateAnchorSystem',
      parameters: {
        parentId: parentWall.id,
        rowCount,
        horizontalSpacing,
        verticalSpacing,
        startHeight,
        anchorLength,
        angle,
        prestress,
        walerWidth,
        walerHeight,
        anchorAnalysisModel,
        walerAnalysisModel,
      },
    };

    addFeature(newFeature);
  };

  return (
    <div className="p-4 border rounded-lg mt-4">
      <h3 className="text-lg font-bold mb-4">预应力锚杆生成</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="text-md font-semibold mb-2">参数输入</h4>
          <p className="text-sm text-gray-500 mb-2">
            定义多排锚杆的布局、属性和腰梁。
          </p>
          <div className="flex flex-col gap-2">
            <label>锚杆排数: <input type="number" value={rowCount} onChange={e => setRowCount(parseInt(e.target.value, 10) || 1)} className="p-1 border rounded bg-gray-600 ml-2" /></label>
            <label>水平间距 (m): <input type="number" value={horizontalSpacing} onChange={e => setHorizontalSpacing(parseFloat(e.target.value) || 0)} className="p-1 border rounded bg-gray-600 ml-2" /></label>
            <label>垂直间距 (m): <input type="number" value={verticalSpacing} onChange={e => setVerticalSpacing(parseFloat(e.target.value) || 0)} className="p-1 border rounded bg-gray-600 ml-2" /></label>
            <label>首排高度 (Y): <input type="number" value={startHeight} onChange={e => setStartHeight(parseFloat(e.target.value) || 0)} className="p-1 border rounded bg-gray-600 ml-2" /></label>
            <hr className="my-2 border-gray-600"/>
            <label>锚杆长度 (m): <input type="number" value={anchorLength} onChange={e => setAnchorLength(parseFloat(e.target.value) || 0)} className="p-1 border rounded bg-gray-600 ml-2" /></label>
            <label>倾角 (度): <input type="number" value={angle} onChange={e => setAngle(parseFloat(e.target.value) || 0)} className="p-1 border rounded bg-gray-600 ml-2" /></label>
            <label>预应力 (kN): <input type="number" value={prestress} onChange={e => setPrestress(parseFloat(e.target.value) || 0)} className="p-1 border rounded bg-gray-600 ml-2" /></label>
            <hr className="my-2 border-gray-600"/>
            <label>腰梁宽度 (m): <input type="number" value={walerWidth} onChange={e => setWalerWidth(parseFloat(e.target.value) || 0)} className="p-1 border rounded bg-gray-600 ml-2" /></label>
            <label>腰梁高度 (m): <input type="number" value={walerHeight} onChange={e => setWalerHeight(parseFloat(e.target.value) || 0)} className="p-1 border rounded bg-gray-600 ml-2" /></label>
            
            <hr className="my-2 border-gray-600"/>
            <label>
              锚杆分析模型:
              <select
                value={anchorAnalysisModel}
                onChange={e => setAnchorAnalysisModel(e.target.value as 'beam' | 'truss')}
                className="p-1 border rounded bg-gray-600 ml-2"
              >
                <option value="beam">梁单元</option>
                <option value="truss">桁架单元</option>
              </select>
            </label>
            <label>
              腰梁分析模型:
              <select
                value={walerAnalysisModel}
                onChange={e => setWalerAnalysisModel(e.target.value as 'beam' | 'solid')}
                className="p-1 border rounded bg-gray-600 ml-2"
              >
                <option value="beam">梁单元</option>
                <option value="solid">实体单元</option>
              </select>
            </label>

            <button onClick={handleCreate} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mt-2">
              生成锚杆
            </button>
          </div>
        </div>
        
        <div>
          <h4 className="text-md font-semibold mb-2">截面示意图</h4>
          <AnchorSchematic 
            anchorLength={anchorLength}
            angle={angle}
            walerWidth={walerWidth}
            walerHeight={walerHeight}
            wallThickness={1.0} // Pass a typical wall thickness for visualization
          />
        </div>
      </div>
    </div>
  );
};

export default AnchorCreator; 