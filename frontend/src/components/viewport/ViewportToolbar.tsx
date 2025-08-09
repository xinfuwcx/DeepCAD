import React from 'react';
import { Tooltip, Switch } from 'antd';
import {
  AimOutlined,
  CameraOutlined,
  EditOutlined,
  CompassOutlined,
  BorderOutlined,
  UndoOutlined,
  RedoOutlined,
  ClusterOutlined,
  PushpinOutlined,
} from '@ant-design/icons';

export interface ViewportToolbarProps {
  activeTool: string;
  setActiveTool: (tool: string | ((prev: string) => string)) => void;
  enableSnapping: boolean;
  toggleSnapping: () => void;
  undo: () => void;
  redo: () => void;
  booleanMode: 'local' | 'backend';
  toggleBooleanMode: () => void;
  preserveOriginal: boolean;
  setPreserveOriginal: (v: boolean) => void;
  lastSnapType: string;
  onResetCamera: () => void;
  onScreenshot?: () => void;
  style?: React.CSSProperties;
}

// 统一按钮样式
const btnBase: React.CSSProperties = {
  width: 34,
  height: 34,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 16,
  userSelect: 'none',
  border: '1px solid rgba(0,217,255,0.25)',
  background: 'linear-gradient(145deg,#1d2535,#161b25)',
  color: '#cfd8dc',
  transition: 'all .18s',
};

const activeStyle: React.CSSProperties = {
  background: 'linear-gradient(145deg,#00bcd4,#008399)',
  color: '#fff',
  border: '1px solid #00bcd4'
};

const ViewportToolbar: React.FC<ViewportToolbarProps> = ({
  activeTool,
  setActiveTool,
  enableSnapping,
  toggleSnapping,
  undo,
  redo,
  booleanMode,
  toggleBooleanMode,
  preserveOriginal,
  setPreserveOriginal,
  lastSnapType,
  onResetCamera,
  onScreenshot,
  style
}) => {
  const makeBtn = (opts: {key: string; icon: React.ReactNode; tip: string; active?: boolean; onClick: () => void; extraStyle?: React.CSSProperties}) => (
    <Tooltip placement="right" title={opts.tip} mouseEnterDelay={0.4}>
      <div
        onClick={opts.onClick}
        style={{...btnBase, ...(opts.active? activeStyle:{}), ...opts.extraStyle}}
      >
        {opts.icon}
      </div>
    </Tooltip>
  );

  return (
    <div style={{position:'absolute', right:12, top:60, display:'flex', flexDirection:'column', gap:8, zIndex:210, ...style}}>
      {makeBtn({ key:'reset', icon:<AimOutlined />, tip:'重置视图 (R)', onClick:onResetCamera })}
      {makeBtn({ key:'shot', icon:<CameraOutlined />, tip:'截图', onClick:()=> onScreenshot?.() })}
      {makeBtn({ key:'snap', icon:<PushpinOutlined />, tip:`捕捉 ${enableSnapping?'开':'关'} (G)`, active:enableSnapping, onClick:toggleSnapping })}
      {makeBtn({ key:'sketch', icon:<EditOutlined />, tip:'草图模式 (K)', active:activeTool==='sketch', onClick:()=> setActiveTool(t=> t==='sketch'?'select':'sketch') })}
      {makeBtn({ key:'measure', icon:<CompassOutlined />, tip:'测量模式 (M)', active:activeTool==='measure', onClick:()=> setActiveTool(t=> t==='measure'?'select':'measure') })}
      {makeBtn({ key:'face', icon:<BorderOutlined />, tip:'选面模式 (F)', active:activeTool==='faceSelect', onClick:()=> setActiveTool('faceSelect') })}
      <div style={{height:1, background:'rgba(255,255,255,0.06)', margin:'4px 6px'}} />
      {makeBtn({ key:'undo', icon:<UndoOutlined />, tip:'撤销 (Ctrl+Z)', onClick:undo })}
      {makeBtn({ key:'redo', icon:<RedoOutlined />, tip:'重做 (Ctrl+Y / Ctrl+Shift+Z)', onClick:redo })}
      {makeBtn({ key:'boolean', icon:<ClusterOutlined />, tip:`布尔模式: ${booleanMode==='backend'?'后端':'本地'} (B)`, active:booleanMode==='backend', onClick:toggleBooleanMode })}
      <div style={{padding:'4px 6px', background:'rgba(0,0,0,0.35)', border:'1px solid rgba(0,217,255,0.15)', borderRadius:6, display:'flex', flexDirection:'column', gap:6, width:130}}>
        <div style={{fontSize:11, color:'#90a4ae', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
          <span>保留原件</span>
          <Switch size="small" checked={preserveOriginal} onChange={setPreserveOriginal} />
        </div>
        <div style={{fontSize:10, color:'#00d9ff'}}>SNAP: {lastSnapType||'-'}</div>
      </div>
    </div>
  );
};

export default ViewportToolbar;
