/** 结果可视化工具栏 */
import React from 'react';
import { Button, Tooltip, Space } from 'antd';
import { BarChartOutlined, TableOutlined, ApiOutlined, CameraOutlined, ExportOutlined, AimOutlined, EyeOutlined, FileImageOutlined } from '@ant-design/icons';
import { dispatchCommand } from '../../core/eventBus';

export interface ResultsToolbarProps {
  visualizationMode?: '3D' | 'chart' | 'table';
  resultsAvailable?: boolean;
  onVisualizationChange?: (mode: '3D' | 'chart' | 'table') => void;
  onExportResults?: (format: string) => void;
  onShowAnimation?: () => void;
  onToggle3DView?: () => void;
}

const ResultsToolbar: React.FC<ResultsToolbarProps> = ({
  visualizationMode='3D',
  resultsAvailable=false,
  onVisualizationChange,
  onExportResults,
  onShowAnimation,
  onToggle3DView
}) => {
  const disabled = !resultsAvailable;
  return (
    <div className="results-toolbar">
      <style>{`
        .results-toolbar { background:rgba(255,255,255,0.05); border:1px solid rgba(24,144,255,0.35); border-radius:8px; padding:8px; backdrop-filter:blur(10px); display:flex; flex-direction:column; gap:8px; }
        .results-toolbar .ant-btn { background:rgba(24,144,255,0.15)!important; border:1px solid rgba(24,144,255,0.4)!important; color:#1890ff!important; }
        .results-toolbar .ant-btn:hover:not(:disabled){ background:rgba(24,144,255,0.3)!important; border-color:#1890ff!important; box-shadow:0 0 10px rgba(24,144,255,0.4);}        
        .results-toolbar .ant-btn:disabled { background:rgba(255,255,255,0.05)!important; border-color:rgba(255,255,255,0.12)!important; color:rgba(255,255,255,0.35)!important; }
      `}</style>
      <Space direction="vertical" size={6} style={{ width:'100%' }}>
        <Tooltip title="3D 模式">
          <Button size="small" type={visualizationMode==='3D'?'primary':undefined} icon={<AimOutlined />} onClick={()=>{dispatchCommand('results:view3d'); onVisualizationChange?.('3D');}} disabled={disabled} />
        </Tooltip>
        <Tooltip title="图表模式">
          <Button size="small" type={visualizationMode==='chart'?'primary':undefined} icon={<BarChartOutlined />} onClick={()=>{dispatchCommand('results:viewChart'); onVisualizationChange?.('chart');}} disabled={disabled} />
        </Tooltip>
        <Tooltip title="表格模式">
          <Button size="small" type={visualizationMode==='table'?'primary':undefined} icon={<TableOutlined />} onClick={()=>{dispatchCommand('results:viewTable'); onVisualizationChange?.('table');}} disabled={disabled} />
        </Tooltip>
        <Tooltip title="动画播放">
          <Button size="small" icon={<CameraOutlined />} onClick={()=>{dispatchCommand('results:animation'); onShowAnimation?.();}} disabled={disabled} />
        </Tooltip>
        <Tooltip title="切换3D视图">
          <Button size="small" icon={<EyeOutlined />} onClick={()=>{dispatchCommand('results:toggle3d'); onToggle3DView?.();}} disabled={!resultsAvailable} />
        </Tooltip>
        <Tooltip title="导出 CSV">
          <Button size="small" icon={<ExportOutlined />} onClick={()=>{dispatchCommand('results:export'); onExportResults?.('csv');}} disabled={disabled} />
        </Tooltip>
        <Tooltip title="导出 VTK">
          <Button size="small" icon={<ApiOutlined />} onClick={()=>{dispatchCommand('results:export:vtk'); onExportResults?.('vtk');}} disabled={disabled} />
        </Tooltip>
        <Tooltip title="导出 JSON">
          <Button size="small" icon={<ApiOutlined />} onClick={()=>{dispatchCommand('results:export:json'); onExportResults?.('json');}} disabled={disabled} />
        </Tooltip>
        <Tooltip title="导出 PNG 截图">
          <Button size="small" icon={<FileImageOutlined />} onClick={()=>{dispatchCommand('results:export:png'); onExportResults?.('png');}} disabled={disabled} />
        </Tooltip>
      </Space>
    </div>
  );
};

export default ResultsToolbar;
