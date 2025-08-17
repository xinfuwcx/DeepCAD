/**
 * GeologyReconstructionPanelV2 (Stage A)
 * 深基坑近场地层重建 - 面板骨架 & 计算域/分辨率/风险估算
 * 实现范围(本阶段):
 *  - 顶部固定操作区: 预览 / 确定 / 取消 + 实时 N / 内存估算 / 耗时预估 / 风险提示
 *  - 4 个 Tab 框架 (计算域 / 钻孔数据 / 参数配置 / 水头参数) — 后三者占位
 *  - 计算域 Tab: 自动域 vs 手动域, 外扩百分比(10-50%), ROI 细化开关, 分辨率预设(预览/标准/精细) + 自定义, N/风险色阶
 *  - 软/硬阈值: softLimit=300k, hardLimit=500k
 *  - 估算: memory≈ N * 32 bytes; time≈ 基础系数 0.00008 * N 秒 (经验值，可后续校准)
 * 后续阶段将补齐: 质量评估(RMSEz/H)、回退、缓存、水头参数细节、预览/commit API 对接、钻孔数据联动等。
 */
import React, { useState, useMemo, useEffect } from 'react';
import { Card, Tabs, Radio, Slider, InputNumber, Row, Col, Space, Switch, Tag, Button, Typography, Alert, Tooltip, Divider, Segmented, message, Upload, Table, Statistic, Popconfirm, Form, Input, Select } from 'antd';
import { ExperimentOutlined, DeploymentUnitOutlined, DatabaseOutlined, ThunderboltOutlined, AimOutlined, CheckCircleTwoTone, WarningTwoTone, CloseCircleTwoTone, CloudUploadOutlined, DeleteOutlined, DownloadOutlined } from '@ant-design/icons';
// Stage E: 3D 视口
import GeologyReconstructionViewport3D from './GeologyReconstructionViewport3D';
import { previewGeology, commitGeology } from '../../services/geologyReconstructionApi';
import { geologyReconCache } from '../../services/geologyReconCache';
import { eventBus } from '../../core/eventBus';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

const { Text, Title } = Typography;

// ---------- 常量配置 ----------
const RESOLUTION_PRESETS = {
  preview: { label: '预览', nx: 60, ny: 60, nz: 60 },
  standard: { label: '标准', nx: 80, ny: 80, nz: 80 },
  fine: { label: '精细', nx: 100, ny: 100, nz: 100 },
} as const;

const SOFT_LIMIT = 300_000;   // 软上限
const HARD_LIMIT = 500_000;   // 硬上限
const BYTES_PER_CELL = 32;    // 经验估算
const BASE_TIME_FACTOR = 0.00008; // 秒/格经验值 (可调)

// 三维重建算法参数预设
const ALGORITHM_PRESETS = {
  rbf: {
    fast: { radius: 100, smoothing: 0.1, kernelType: 'gaussian' },
    balanced: { radius: 200, smoothing: 0.5, kernelType: 'multiquadric' },
    accurate: { radius: 500, smoothing: 1.0, kernelType: 'thinplate' }
  },
  kriging: {
    fast: { range: 100, sill: 1.0, nugget: 0.1, model: 'exponential' },
    balanced: { range: 300, sill: 2.0, nugget: 0.3, model: 'gaussian' },
    accurate: { range: 800, sill: 5.0, nugget: 0.5, model: 'spherical' }
  },
  idw: {
    fast: { power: 1, searchRadius: 150, minPoints: 3 },
    balanced: { power: 2, searchRadius: 300, minPoints: 5 },
    accurate: { power: 3, searchRadius: 600, minPoints: 8 }
  }
} as const;

interface DomainState {
  mode: 'auto' | 'manual';
  autoExpansion: number; // %
  roiEnabled: boolean;
  xmin: number; xmax: number; ymin: number; ymax: number; zmin: number; zmax: number;
  preset: keyof typeof RESOLUTION_PRESETS | 'custom';
  nx: number; ny: number; nz: number;
}

const defaultDomain: DomainState = {
  mode: 'manual',
  autoExpansion: 30,
  roiEnabled: false,
  xmin: 0, xmax: 500, ymin: 0, ymax: 500, zmin: -100, zmax: 0,
  preset: 'preview',
  nx: RESOLUTION_PRESETS.preview.nx,
  ny: RESOLUTION_PRESETS.preview.ny,
  nz: RESOLUTION_PRESETS.preview.nz,
};

function classifyRisk(N: number) {
  if (N > HARD_LIMIT) return { level: 'hard', color: 'red', label: '超硬上限', icon: <CloseCircleTwoTone twoToneColor="#ff4d4f"/> };
  if (N > SOFT_LIMIT) return { level: 'soft', color: 'orange', label: '接近上限', icon: <WarningTwoTone twoToneColor="#faad14"/> };
  return { level: 'ok', color: 'green', label: '安全', icon: <CheckCircleTwoTone twoToneColor="#52c41a"/> };
}

function estimateMemoryMB(N: number) { return (N * BYTES_PER_CELL / (1024 * 1024)); }
function estimateTimeSec(N: number) { return N * BASE_TIME_FACTOR; }

const GeologyReconstructionPanelV2: React.FC = () => {
  const [domain, setDomain] = useState<DomainState>(defaultDomain);
  const [submitting, setSubmitting] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [quality, setQuality] = useState<{ rmseZ:number; rmseH:number; grade:string }|null>(null);
  // 算法参数
  const [algorithm, setAlgorithm] = useState<'rbf'|'kriging'|'idw'>('rbf');
  const [preset, setPreset] = useState<'fast'|'balanced'|'accurate'>('balanced');
  const [customParams, setCustomParams] = useState<any>({});
  // legacy 本地 cache 已废弃，统一使用 geologyReconCache；使用 cacheVersion 触发重渲染
  const [cacheVersion, setCacheVersion] = useState(0);
  const [cacheHit, setCacheHit] = useState(false);
  const [fallbackUsed, setFallbackUsed] = useState(false);
  // Stage B: 钻孔数据状态
  const [boreholeFileName, setBoreholeFileName] = useState<string | null>(null);
  const [boreholes, setBoreholes] = useState<any[]>([]); // {id,x,y,elevation?,layers:[{name,topDepth,bottomDepth,soilType?}]}[]
  const [parsing, setParsing] = useState(false);
  // Stage E: 3D 预览开关
  const [show3D, setShow3D] = useState(false);
  const [roiAdjusted, setRoiAdjusted] = useState(false);
  const [showDomainBox, setShowDomainBox] = useState(true);
  const [show3DBoreholes, setShow3DBoreholes] = useState(true);
  const [boreholeOpacity3D, setBoreholeOpacity3D] = useState(0.85);
  // 质量历史 (E3.1)
  interface QualityHistItem { ts:number; hash:string; N:number; rmseZ:number; rmseH:number; grade:string; fallback:boolean; roiAdjusted:boolean }
  const [qualityHistory, setQualityHistory] = useState<QualityHistItem[]>([]);
  // 回退策略
  const [fallbackPolicy, setFallbackPolicy] = useState<'allow'|'deny'>('allow');
  const [baselineHash, setBaselineHash] = useState<string | null>(geologyReconCache.getBaseline());
  const [cacheFilter, setCacheFilter] = useState('');
  const [showHotkeyHelp, setShowHotkeyHelp] = useState(false);

  // Mini sparkline component (inline to avoid external deps)
  const MiniQualityChart: React.FC<{ data: QualityHistItem[]; metric: 'rmseZ'|'rmseH'; title: string }> = ({ data, metric, title }) => {
    const series = data.slice(0,30).reverse(); // chronological left->right
    const values = series.map(d=> metric==='rmseZ'? d.rmseZ : d.rmseH);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max-min || 1;
    const points = values.map((v,i)=> {
      const x = (i/(values.length-1||1))*120;
      const y = 40 - ((v-min)/span)*36 - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    return (
      <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
        <span style={{ fontSize:12, color:'#ccc' }}>{title}</span>
        <svg width={120} height={42} style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:4 }}>
          <polyline points={points} fill="none" stroke="#52c41a" strokeWidth={1.5} />
          <text x={2} y={12} fontSize={9} fill="#888">{min.toFixed(3)}</text>
          <text x={2} y={40} fontSize={9} fill="#888">{max.toFixed(3)}</text>
        </svg>
      </div>
    );
  };
  // 预计算 3D 视口需要的数据结构
  const borehole3DData = useMemo(()=> boreholes.map((h:any)=> ({
    id: h.id,
    name: h.id,
    x: h.x,
    y: h.y,
    z: h.elevation ?? 0,
    depth: (h.layers||[]).reduce((mx:number,l:any)=> Math.max(mx, l.bottomDepth||0), 0),
    layers: (h.layers||[]).map((l:any,idx:number)=> ({
      id: `${h.id}_${idx}`,
      name: l.name || `Layer${idx+1}`,
      topDepth: l.topDepth ?? 0,
      bottomDepth: l.bottomDepth ?? ((l.topDepth||0)+1),
      soilType: l.soilType || l.name || 'unknown',
      color: hashColor(l.name || `L${idx}`),
      visible: true,
      opacity: 0.85
    }))
  })), [boreholes]);

  // Esc 关闭 3D 预览
  React.useEffect(()=>{
    if (!show3D) return;
    const onKey = (e: KeyboardEvent)=> { if (e.key === 'Escape') setShow3D(false); };
    window.addEventListener('keydown', onKey);
    return ()=> window.removeEventListener('keydown', onKey);
  }, [show3D]);

  // 初次加载尝试恢复缓存 (仅一次)
  React.useEffect(()=>{ try { geologyReconCache.loadFromStorage(); setCacheVersion(v=>v+1);} catch {} },[]);
  // baseline 持久化同步
  React.useEffect(()=>{ geologyReconCache.setBaseline(baselineHash||null); },[baselineHash]);
  // 快捷键: a 设为 A, b 设为 B, p pin, r 回放, k 基线
  React.useEffect(()=>{
    const onKey=(e:KeyboardEvent)=>{
      if (!e.altKey) return; // Alt 修饰避免冲突
  if (e.key==='h'){ setShowHotkeyHelp(v=>!v); return; }
      const sel = geologyReconCache.list()[0]; if(!sel) return;
      if (e.key==='a'){ setDiffA(sel.hash); message.info('A <- 最新缓存'); }
      else if(e.key==='b'){ setDiffB(sel.hash); message.info('B <- 最新缓存'); }
      else if(e.key==='p'){ geologyReconCache.togglePin(sel.hash); setCacheVersion(v=>v+1); message.success('切换Pin'); }
      else if(e.key==='r'){ const it=sel; if (it.domainSnapshot) setDomain(it.domainSnapshot); if (it.waterHeadSnapshot) setWaterParams(it.waterHeadSnapshot); const q=geologyReconCache.get(it.hash); if(q){ setQuality(q.quality); setFallbackUsed(q.fallback); setRoiAdjusted(!!q.roiAdjusted); setCacheHit(true);} message.success('回放最新缓存'); }
      else if(e.key==='k'){ setBaselineHash(baselineHash===sel.hash? null: sel.hash); message.success('切换基线'); }
    }; window.addEventListener('keydown', onKey); return ()=> window.removeEventListener('keydown', onKey);
  },[baselineHash]);

  const applyPreset = (preset: keyof typeof RESOLUTION_PRESETS) => {
    const p = RESOLUTION_PRESETS[preset];
    setDomain(d => ({ ...d, preset, nx: p.nx, ny: p.ny, nz: p.nz }));
  };

  const N = useMemo(() => domain.nx * domain.ny * domain.nz, [domain.nx, domain.ny, domain.nz]);
  const memoryMB = estimateMemoryMB(N);
  const timeSec = estimateTimeSec(N);
  const risk = classifyRisk(N);
  // domainVolume/avgCellVol 将在 autoBounds 计算后定义 (避免引用顺序问题)
  let domainVolume: number | null = null; let avgCellVol: number | null = null;

  // 当前算法参数（预设 + 自定义合并）
  const currentParams = useMemo(() => ({
    ...(ALGORITHM_PRESETS as any)[algorithm][preset],
    ...customParams
  }), [algorithm, preset, customParams]);

  // ---- Stage C: 水头参数 ----
  interface WaterHeadParams { z_water: number; gamma_w: number; delta_h: number; gradient: number; alpha_u: number; note: string }
  const deriveSuggestedZWater = () => {
    if (boreholes.length) {
      const elevations = boreholes.map(b=> b.elevation ?? 0);
      return Math.max(...elevations) - 1; // 略低于最高地面
    }
    return domain.zmax ?? 0; // 若后续 domain 加入 zmax
  };
  const [waterParams, setWaterParams] = useState<WaterHeadParams>({
    z_water: deriveSuggestedZWater(), // 地下水位 Z (自由面)
    gamma_w: 9.81,                   // kN/m3
    delta_h: 0.5,                    // 水位波动幅值 (m)
    gradient: 0.002,                 // 水力坡降 i
    alpha_u: 0.7,                    // 超静孔压系数
    note: ''
  });
  const [headPreviewing, setHeadPreviewing] = useState(false);
  const numberSetter = (key: keyof WaterHeadParams, v: number | null) => setWaterParams(p=> ({ ...p, [key]: v ?? p[key] }));
  const strSetter = (key: keyof WaterHeadParams, v: string) => setWaterParams(p=> ({ ...p, [key]: v }));
  const paramHash = useMemo(()=>{ const raw = JSON.stringify(waterParams); let h=0; for (let i=0;i<raw.length;i++){ h=(h*31+raw.charCodeAt(i))>>>0;} return h.toString(16).padStart(8,'0'); },[waterParams]);
  const exportHeadConfig = () => { try { const cfg={...waterParams,generated_at:new Date().toISOString(),hash:paramHash}; const blob=new Blob([JSON.stringify(cfg,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='head_config.json'; a.click(); URL.revokeObjectURL(a.href); message.success('已导出 head_config.json'); } catch(err:any){ message.error('导出失败: '+err.message);} };
  const handleHeadPreview = () => { setHeadPreviewing(true); setTimeout(()=>{ setHeadPreviewing(false); message.success('水头参数预览完成 (占位)'); },700); };

  // synthQuality (旧本地模拟质量函数) 已废弃，真实质量来源于 preview API 响应
  const handlePreview = async (): Promise<{ rmseZ:number; rmseH:number; grade:string } | null> => {
    if (risk.level === 'hard') { message.error('分辨率超硬上限，请降低后再预览'); return null; }
    setPreviewing(true); setCacheHit(false); setFallbackUsed(false); setRoiAdjusted(false);
    const cacheEntry = geologyReconCache.get(globalHash);
    if (cacheEntry){
      setQuality(cacheEntry.quality); setFallbackUsed(cacheEntry.fallback); setCacheHit(true); setRoiAdjusted(!!cacheEntry.roiAdjusted);
      setPreviewing(false); message.success('缓存命中');
      return cacheEntry.quality;
    }
    try {
      const resp = await previewGeology({ hash: globalHash, domain, boreholes, waterHead: waterParams, options:{ roiEnabled: domain.roiEnabled, fallbackPolicy } });
      setQuality(resp.quality); setFallbackUsed(resp.fallback); setRoiAdjusted(!!resp.roiAdjusted);
      geologyReconCache.set({
        hash: globalHash,
        quality: resp.quality,
        fallback: resp.fallback,
        ts: Date.now(),
        roiAdjusted: !!resp.roiAdjusted,
        source: resp.source,
        memMB: memoryMB,
        sec: timeSec,
        fallbackPolicy,
        domainSnapshot: domain,
        waterHeadSnapshot: waterParams,
        N,
        domainVolume: domainVolume ?? undefined,
        avgCellVol: avgCellVol ?? undefined
      });
      setCacheVersion(v=>v+1);
      setQualityHistory(h=>{
        const next = [{ ts: Date.now(), hash: globalHash, N, rmseZ: resp.quality.rmseZ, rmseH: resp.quality.rmseH, grade: resp.quality.grade, fallback: resp.fallback, roiAdjusted: !!resp.roiAdjusted }, ...h];
        return next.slice(0,50);
      });
      if (!baselineHash && resp.quality.grade==='A') { setBaselineHash(globalHash); message.success('已自动设为基线 (首个A级)'); }
      message.success(resp.fallback? '预览完成 (服务器回退)':'预览完成');
      return resp.quality;
    } catch (e:any){
      message.error('预览失败: '+ e.message);
      return null;
    } finally { setPreviewing(false); }
  };
  const handleCommit = async () => {
    if (risk.level === 'hard') { message.error('当前配置超硬上限，无法确定'); return; }
    if (!quality) {
      message.info('未预览，正在自动预览...');
      const q = await handlePreview();
      if (!q) return; // 预览失败或被取消
    }
    setSubmitting(true);
    try {
      const resp = await commitGeology({ hash: globalHash, domain, boreholes, waterHead: waterParams, options:{ roiEnabled: domain.roiEnabled, fallbackPolicy } });
      message.success(`提交完成 任务ID=${resp.taskId}`);
    } catch(e:any){ message.error('提交失败: '+e.message);} finally { setSubmitting(false); }
  };
  const handleCancel = () => { setDomain(defaultDomain); setQuality(null); setCacheHit(false); setFallbackUsed(false); setRoiAdjusted(false); };

  const globalHash = useMemo(()=>{
    const sig = JSON.stringify({v:4,domain,algo:algorithm,preset,params:currentParams,holes:boreholes.length,layers:boreholes.reduce((s,h)=>s+(h.layers?.length||0),0),water:waterParams});
    let h=0; for (let i=0;i<sig.length;i++){ h = (h*131 + sig.charCodeAt(i))>>>0; }
    return h.toString(16).padStart(8,'0');
  },[domain,algorithm,preset,currentParams,boreholes,waterParams]);

  // ---- Stage B: 解析函数 ----
  const HOLE_SOFT_LIMIT = 300;
  const LAYER_SOFT_LIMIT = 4000; // 估值

  function parseJson(text: string) {
    const data = JSON.parse(text);
    if (Array.isArray(data.holes)) return data.holes;
    if (Array.isArray(data)) return data; // 直接数组
    throw new Error('JSON 不包含 holes 数组');
  }
  function normalizeHoles(raw: any[]): any[] {
    return raw.map((h, i) => ({
      id: h.id || h.name || `BH${i + 1}`,
      x: h.x ?? h.X ?? h.longitude ?? 0,
      y: h.y ?? h.Y ?? h.latitude ?? 0,
      elevation: h.elevation ?? h.z ?? h.Z ?? 0,
      layers: Array.isArray(h.layers) ? h.layers : (Array.isArray(h.strata) ? h.strata : [])
    }));
  }
  function parseCsv(text: string) {
    // 期望列: id,x,y,elevation,layer,top,bottom 或 formation,z
  const { data } = Papa.parse(text, { header: true, skipEmptyLines: true });
    const rows: any[] = data as any[];
    // 按 id 分组
    const holeMap: Record<string, any> = {};
    rows.forEach((r, idx) => {
      const hid = r.id || r.hole || r.Hole || `BH${idx + 1}`;
      if (!holeMap[hid]) holeMap[hid] = { id: hid, x: Number(r.x ?? r.X) || 0, y: Number(r.y ?? r.Y) || 0, elevation: Number(r.elevation ?? r.z ?? r.Z) || 0, layers: [] };
      const layerName = r.layer || r.Layer || r.formation || r.Formation;
      const top = Number(r.top ?? r.topDepth ?? r.top_depth ?? r.TD) || Number(r.top_z) || Number(r.topZ) || Number(r.z_top) || undefined;
      const bottom = Number(r.bottom ?? r.bottomDepth ?? r.bottom_depth ?? r.BD) || Number(r.bottom_z) || Number(r.bottomZ) || Number(r.z_bottom) || undefined;
      if (layerName) {
        holeMap[hid].layers.push({ name: layerName, topDepth: top ?? 0, bottomDepth: bottom ?? (top ? top + 1 : 1) });
      }
    });
    return Object.values(holeMap);
  }

  function parseExcel(file: File): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // 获取第一个工作表
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          // 转换为JSON数据，跳过空行
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          // 过滤空行
          const filteredData = jsonData.filter((row: any) => row && row.length > 0 && row.some((cell: any) => cell !== null && cell !== undefined && cell !== ''));
          
          if (filteredData.length === 0) {
            throw new Error('Excel文件中没有有效数据');
          }
          
          // 假设第一行是表头
          const headers = filteredData[0] as string[];
          const rows = filteredData.slice(1) as any[][];
          
          // 转换为对象数组
          const objects = rows.map(row => {
            const obj: any = {};
            headers.forEach((header, index) => {
              if (header && index < row.length) {
                obj[header] = row[index];
              }
            });
            return obj;
          }).filter(obj => Object.keys(obj).length > 0);
          
          // 按 id 分组处理（与CSV处理逻辑相同）
          const holeMap: Record<string, any> = {};
          objects.forEach((r, idx) => {
            const hid = r.id || r.hole || r.Hole || r['钻孔编号'] || r['孔号'] || `BH${idx + 1}`;
            if (!holeMap[hid]) {
              holeMap[hid] = { 
                id: hid, 
                x: Number(r.x ?? r.X ?? r['X坐标'] ?? r['x坐标']) || 0, 
                y: Number(r.y ?? r.Y ?? r['Y坐标'] ?? r['y坐标']) || 0, 
                elevation: Number(r.elevation ?? r.z ?? r.Z ?? r.Z坐标 ?? r.z坐标 ?? r['Z坐标'] ?? r['z坐标'] ?? r['地面标高'] ?? r['标高']) || 0, 
                layers: [] 
              };
            }
            const layerName = r.layer || r.Layer || r.formation || r.Formation || r['地层名称'] || r['岩性'] || r['土层'];
            const top = Number(r.top ?? r.topDepth ?? r.top_depth ?? r.TD ?? r['顶深度'] ?? r['顶深'] ?? r.top_z ?? r.topZ ?? r.z_top) || undefined;
            const bottom = Number(r.bottom ?? r.bottomDepth ?? r.bottom_depth ?? r.BD ?? r['底深度'] ?? r['底深'] ?? r.bottom_z ?? r.bottomZ ?? r.z_bottom) || undefined;
            if (layerName) {
              holeMap[hid].layers.push({ 
                name: layerName, 
                topDepth: top ?? 0, 
                bottomDepth: bottom ?? (top ? top + 1 : 1) 
              });
            }
          });
          
          resolve(Object.values(holeMap));
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsArrayBuffer(file);
    });
  }

  const handleBoreholeBeforeUpload = async (file: File) => {
    setParsing(true);
    try {
      let raw: any[] = [];
      const fileName = file.name.toLowerCase();
      
      if (fileName.endsWith('.json')) {
        const text = await file.text();
        raw = parseJson(text);
      } else if (fileName.endsWith('.csv')) {
        const text = await file.text();
        raw = parseCsv(text);
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        raw = await parseExcel(file);
      } else {
        message.error('仅支持 .json / .csv / .xlsx / .xls 格式');
        setParsing(false);
        return false;
      }
      
      const normalized = normalizeHoles(raw);
      setBoreholes(normalized);
      setBoreholeFileName(file.name);
      message.success(`已加载钻孔 ${normalized.length} 个 (layers=${normalized.reduce((s,h)=>s+(h.layers?.length||0),0)})`);
      // 新增：通知 3D 引擎更新钻孔，显示在当前计算域内
      try { eventBus.emit('geology:boreholes:update', { holes: normalized, options: { show: true, opacity: boreholeOpacity3D } }); } catch {}
    } catch (err:any) {
      console.error(err);
      message.error('解析失败: ' + err.message);
    } finally { 
      setParsing(false); 
    }
    return false; // 阻止自动上传
  };

  // 当钻孔集合或透明度开关变化时，通知 3D 引擎刷新
  useEffect(()=>{
    try { eventBus.emit('geology:boreholes:update', { holes: boreholes, options: { show: show3DBoreholes, opacity: boreholeOpacity3D } }); } catch {}
  }, [boreholes, show3DBoreholes, boreholeOpacity3D]);

  const holeCount = boreholes.length;
  const layerCount = useMemo(()=> boreholes.reduce((s,h)=> s + (h.layers?.length||0), 0), [boreholes]);
  const holeLimitWarn = holeCount > HOLE_SOFT_LIMIT;
  const layerLimitWarn = layerCount > LAYER_SOFT_LIMIT;

  const boreholeColumns = [
    { title: '孔ID', dataIndex: 'id', key: 'id', width: 110, fixed: 'left' as const },
  { title: 'X', dataIndex: 'x', width: 90, render:(v: any)=> v?.toFixed? v.toFixed(2): v },
  { title: 'Y', dataIndex: 'y', width: 90, render:(v: any)=> v?.toFixed? v.toFixed(2): v },
  { title: '地面标高', dataIndex: 'elevation', width: 110, render:(v: any)=> v?.toFixed? v.toFixed(2): v },
    { title: '层数', width: 80, render: (_:any, r:any)=> r.layers?.length || 0 },
  ];

  const expandedRowRender = (record: any) => {
    const cols = [
      { title: '层名称', dataIndex: 'name', key: 'name', width: 140 },
  { title: '顶深', dataIndex: 'topDepth', width: 80, render:(v: any)=> v?.toFixed? v.toFixed(2): v },
  { title: '底深', dataIndex: 'bottomDepth', width: 80, render:(v: any)=> v?.toFixed? v.toFixed(2): v },
      { title: '厚度', key: 'thk', width: 80, render: (_:any, l:any)=> ((l.bottomDepth??0)-(l.topDepth??0)).toFixed(2) },
    ];
    return <Table size="small" columns={cols} dataSource={record.layers?.map((l:any,i:number)=>({...l,key:i}))} pagination={false} rowKey="key" />;
  };

  // 计算域自动模式下显示推荐范围 (基于钻孔 bounding box + 扩展)
  const autoBounds = useMemo(()=>{
    if (!boreholes.length) return null;
    const xs = boreholes.map(h=>h.x); const ys = boreholes.map(h=>h.y); const zs = boreholes.map(h=>h.elevation ?? 0);
    const min = (a:number[]) => Math.min(...a); const max = (a:number[]) => Math.max(...a);
    const base = { xmin:min(xs), xmax:max(xs), ymin:min(ys), ymax:max(ys), zmin:min(zs)-(Math.max(...zs)-Math.min(...zs))*0.6, zmax:max(zs) };
    const expand = domain.autoExpansion/100;
    const expandRange = (lo:number, hi:number)=> { const r = hi-lo; return { lo: lo - r*expand, hi: hi + r*expand }; };
    return {
      x: expandRange(base.xmin, base.xmax),
      y: expandRange(base.ymin, base.ymax),
      z: expandRange(base.zmin, base.zmax),
      raw: base
    };
  },[boreholes, domain.autoExpansion]);
  // 计算域总体积与平均单元体积
  if (domain.mode==='manual'){
    const dx = domain.xmax-domain.xmin; const dy = domain.ymax-domain.ymin; const dz = domain.zmax-domain.zmin; if (dx>0&&dy>0&&dz>0) domainVolume = dx*dy*dz;
  } else if (domain.mode==='auto' && autoBounds){
    const dx = autoBounds.x.hi-autoBounds.x.lo; const dy = autoBounds.y.hi-autoBounds.y.lo; const dz = autoBounds.z.hi-autoBounds.z.lo; if (dx>0&&dy>0&&dz>0) domainVolume = dx*dy*dz;
  }
  if (domainVolume!=null && N>0) avgCellVol = domainVolume / N;

  // 向右侧主3D视口广播当前计算域范围，驱动线框盒实时更新
  React.useEffect(() => {
    try {
      let bounds: null | { xmin:number; xmax:number; ymin:number; ymax:number; zmin:number; zmax:number } = null;
      if (domain.mode === 'manual') {
        const { xmin, xmax, ymin, ymax, zmin, zmax } = domain as any;
        if ([xmin, xmax, ymin, ymax, zmin, zmax].every((v:any)=> typeof v === 'number' && isFinite(v))) {
          bounds = { xmin, xmax, ymin, ymax, zmin, zmax };
        }
      } else if (autoBounds) {
        bounds = {
          xmin: autoBounds.x.lo,
          xmax: autoBounds.x.hi,
          ymin: autoBounds.y.lo,
          ymax: autoBounds.y.hi,
          zmin: autoBounds.z.lo,
          zmax: autoBounds.z.hi,
        };
      }
      if (!bounds) return;
      eventBus.emit('geology:domain:update', { bounds });
    } catch {}
  }, [domain, autoBounds]);

  const domainTab = (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <Card size="small" title={<Space><DeploymentUnitOutlined />域模式</Space>}>
        <Radio.Group
          value={domain.mode}
          onChange={e => setDomain(d => ({ ...d, mode: e.target.value }))}
          optionType="button"
          buttonStyle="solid"
        >
          <Radio.Button value="auto">自动域</Radio.Button>
          <Radio.Button value="manual">手动域</Radio.Button>
        </Radio.Group>
        {domain.mode === 'auto' && (
          <div style={{ marginTop: 16 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>外扩百分比 ({domain.autoExpansion}%)</Text>
                <Slider
                  min={10}
                  max={50}
                  value={domain.autoExpansion}
                  onChange={(val) => setDomain(d => ({ ...d, autoExpansion: val }))}
                />
              </div>
              <div>
                <Space>
                  <Switch checked={domain.roiEnabled} onChange={checked => setDomain(d => ({ ...d, roiEnabled: checked }))} />
                  <Text>启用 ROI 细化 (后端自适应)</Text>
                </Space>
              </div>
            </Space>
          </div>
        )}
        {domain.mode === 'manual' && (
          <div style={{ marginTop: 16 }}>
            <Row gutter={12}>
              {(['xmin','xmax','ymin','ymax','zmin','zmax'] as const).map(key => (
                <Col span={8} key={key} style={{ marginBottom: 8 }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>{key}</Text>
                  <InputNumber
                    value={domain[key]}
                    onChange={(val) => setDomain(d => ({ ...d, [key]: val ?? d[key] }))}
                    size="small"
                    style={{ width: '100%' }}
                  />
                </Col>
              ))}
            </Row>
            {domain.mode === 'manual' && (
              <Alert type="success" showIcon style={{ marginTop: 12 }} message={
                <span>手动域范围: X [{domain.xmin}, {domain.xmax}] · Y [{domain.ymin}, {domain.ymax}] · Z [{domain.zmin}, {domain.zmax}] · 体积: {domainVolume ? (domainVolume/1000000).toFixed(2) + ' 百万m³' : '计算中...'}</span>
              } />
            )}
          </div>
        )}
      </Card>

      <Card size="small" title={<Space><DatabaseOutlined />分辨率与资源</Space>} extra={<Tag color={risk.color}>{risk.icon}&nbsp;{risk.label}</Tag>}>
        <Space direction="vertical" style={{ width: '100%' }} size="small">
          <Segmented
            size="small"
            value={domain.preset !== 'custom' ? domain.preset : undefined}
            onChange={(val) => applyPreset(val as keyof typeof RESOLUTION_PRESETS)}
            options={Object.entries(RESOLUTION_PRESETS).map(([k,v]) => ({ label: v.label, value: k }))}
          />
          <Space wrap>
            <Tooltip title="自定义分辨率 (覆盖预设)">
              <Button size="small" type={domain.preset==='custom' ? 'primary':'default'} onClick={() => setDomain(d => ({ ...d, preset: 'custom' }))}>自定义</Button>
            </Tooltip>
          </Space>
          <Row gutter={12} style={{ marginTop: 8 }}>
            {(['nx','ny','nz'] as const).map(axis => (
              <Col span={8} key={axis}>
                <Text type="secondary" style={{ fontSize: 11 }}>{axis}</Text>
                <InputNumber
                  min={8}
                  max={400}
                  disabled={domain.preset !== 'custom'}
                  value={domain[axis]}
                  onChange={(val) => setDomain(d => ({ ...d, [axis]: val ?? d[axis] }))}
                  size="small"
                  style={{ width: '100%' }}
                />
              </Col>
            ))}
          </Row>
          <Divider style={{ margin: '8px 0' }} />
          <Row gutter={12}>
            <Col span={6}><Text>N</Text><div style={{ fontWeight: 600 }}>{N.toLocaleString()}</div></Col>
            <Col span={6}><Text>内存估算</Text><div>{memoryMB.toFixed(1)} MB</div></Col>
            <Col span={6}><Text>耗时估算</Text><div>{timeSec.toFixed(1)} s</div></Col>
            <Col span={6}><Text>风险</Text><div style={{ color: risk.color, fontWeight: 600 }}>{risk.label}</div></Col>
          </Row>
          {risk.level === 'soft' && <Alert type="warning" showIcon message="接近资源上限，建议降档或启用 ROI" style={{ marginTop: 8 }} />}
          {risk.level === 'hard' && <Alert type="error" showIcon message="超过硬上限，禁止提交 (请降低分辨率)" style={{ marginTop: 8 }} />}
        </Space>
      </Card>

      <Alert type="info" showIcon style={{ marginTop: 4 }} message={
        <Space><AimOutlined />后续将加入 RMSEz/H 质量评估与回退标识。</Space>
      } />
    </Space>
  );

  const boreholeTab = (
    <Space direction="vertical" style={{ width:'100%' }} size="middle">
      <Card size="small" title={<Space><ExperimentOutlined />钻孔数据导入</Space>} extra={boreholeFileName && <Tag color="blue">{boreholeFileName}</Tag>}>
        <Upload.Dragger
          multiple={false}
          accept=".json,.csv,.xlsx,.xls"
          showUploadList={false}
          beforeUpload={handleBoreholeBeforeUpload}
          disabled={parsing || submitting || previewing}
        >
          <p style={{ fontSize:32 }}><CloudUploadOutlined /></p>
          <p style={{ marginBottom:4 }}>点击或拖拽上传钻孔数据</p>
          <p style={{ fontSize:12, color:'#999' }}>支持格式: JSON / CSV / Excel (.xlsx/.xls)</p>
          <p style={{ fontSize:11, color:'#888' }}>表头示例: id/钻孔编号, x/X坐标, y/Y坐标, elevation/地面标高, layer/地层名称, top/顶深度, bottom/底深度</p>
        </Upload.Dragger>
        <Space wrap style={{ marginTop:8 }}>
          {boreholes.length>0 && <Popconfirm title="清除已加载数据?" onConfirm={()=>{setBoreholes([]); setBoreholeFileName(null);}}><Button size="small" icon={<DeleteOutlined />}>清除</Button></Popconfirm>}
          {boreholes.length>0 && <Button size="small" icon={<DownloadOutlined />} onClick={()=>{ try { const blob=new Blob([JSON.stringify({holes:boreholes},null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='boreholes_export.json'; a.click(); URL.revokeObjectURL(a.href);} catch(e){ message.error('导出失败'); } }}>导出JSON</Button>}
        </Space>
        {parsing && <Alert type="info" showIcon style={{ marginTop:8 }} message="解析中..." />}
        {holeLimitWarn && <Alert type="warning" showIcon style={{ marginTop:8 }} message={`钻孔数量 ${holeCount} 接近或超过软上限 ${HOLE_SOFT_LIMIT}`} />}
        {layerLimitWarn && <Alert type="warning" showIcon style={{ marginTop:8 }} message={`总层数 ${layerCount} 接近上限 (${LAYER_SOFT_LIMIT})`} />}
        {boreholes.length>0 && (
          <div style={{ marginTop:8 }}>
            <Button size="small" type="primary" onClick={()=> setShow3D(true)}>打开 3D 预览</Button>
          </div>
        )}
      </Card>

      <Row gutter={12}>
        <Col xs={12} sm={6}><Statistic title="钻孔数" value={holeCount} valueStyle={{ color: holeLimitWarn? '#fa8c16':'#52c41a' }} /></Col>
        <Col xs={12} sm={6}><Statistic title="总层数" value={layerCount} valueStyle={{ color: layerLimitWarn? '#fa8c16':'#1890ff' }} /></Col>
        <Col xs={12} sm={6}><Statistic title="平均层/孔" value={holeCount? (layerCount/holeCount).toFixed(1):'0.0'} /></Col>
        <Col xs={12} sm={6}><Statistic title="ROI推荐" value={domain.roiEnabled? '已启用':'未启用'} valueStyle={{ color: domain.roiEnabled? '#722ed1':'#999' }} /></Col>
      </Row>

      {autoBounds && domain.mode==='auto' && (
        <Alert type="info" showIcon style={{ marginTop:4 }} message={
          <span>自动域建议: X [{autoBounds.x.lo.toFixed(1)}, {autoBounds.x.hi.toFixed(1)}] · Y [{autoBounds.y.lo.toFixed(1)}, {autoBounds.y.hi.toFixed(1)}] · Z [{autoBounds.z.lo.toFixed(1)}, {autoBounds.z.hi.toFixed(1)}]</span>
        } />
      )}


      <Card size="small" title={<Space><DatabaseOutlined />钻孔表</Space>} bodyStyle={{ padding: 0 }}>
        <Table
          size="small"
          dataSource={boreholes.map((h,i)=> ({ key:h.id || i, ...h }))}
          columns={boreholeColumns}
          expandable={{ expandedRowRender }}
          pagination={{ pageSize: 8, size:'small' }}
          scroll={{ x: 520, y: 300 }}
          locale={{ emptyText: '暂无数据' }}
        />
      </Card>

      <Alert type="info" showIcon message="后续: 3D视口同步、图表(深度-层序)、质量指标(RMSEz/H) 与 回退标识" />
    </Space>
  );

  // Hash 差异分析状态
  const [diffA, setDiffA] = useState<string | null>(null);
  const [diffB, setDiffB] = useState<string | null>(null);
  const cacheEntriesRaw = geologyReconCache.list(); // 读取一次 (依赖 cacheVersion 触发)
  const cacheEntries = cacheEntriesRaw.map(e=> ({
    ...e,
    isBaseline: baselineHash === e.hash,
    isCurrent: globalHash === e.hash
  }));
  void cacheVersion; // 仅用于触发重新渲染引用 (避免 eslint 未使用警告)
  const entryA = cacheEntries.find(e=>e.hash===diffA) || null;
  const entryB = cacheEntries.find(e=>e.hash===diffB) || null;
  const qualityDiff = useMemo(()=>{
    if (!entryA || !entryB) return null;
    const qA = entryA.quality, qB = entryB.quality;
    return {
      rmseZ: (qB.rmseZ - qA.rmseZ).toFixed(4),
      rmseH: (qB.rmseH - qA.rmseH).toFixed(4),
      grade: qA.grade === qB.grade ? '相同' : `${qA.grade} → ${qB.grade}`,
      fallback: entryA.fallback === entryB.fallback ? '-' : `${entryA.fallback?'Y':'N'}→${entryB.fallback?'Y':'N'}`,
      roi: entryA.roiAdjusted === entryB.roiAdjusted ? '-' : `${entryA.roiAdjusted?'Y':'N'}→${entryB.roiAdjusted?'Y':'N'}`
    };
  },[entryA, entryB]);

  const HashDiffCard = (
    <Card size="small" title={<Space><ThunderboltOutlined />配置差异 (Hash Diff)</Space>} bodyStyle={{ padding:12 }}>
      <Space direction="vertical" style={{ width:'100%' }} size={8}>
        <Space wrap>
          <Select
            size="small"
            placeholder="选择 A"
            style={{ minWidth:140 }}
            value={diffA as any}
            onChange={v=> setDiffA(v)}
            options={cacheEntries.map(e=> ({ label:`A|${new Date(e.ts).toLocaleTimeString()}|${e.hash}`, value:e.hash }))}
          />
          <Select
            size="small"
            placeholder="选择 B"
            style={{ minWidth:140 }}
            value={diffB as any}
            onChange={v=> setDiffB(v)}
            options={cacheEntries.map(e=> ({ label:`B|${new Date(e.ts).toLocaleTimeString()}|${e.hash}`, value:e.hash }))}
          />
          <Button size="small" onClick={()=>{ if (geologyReconCache.get(globalHash)) { if (!diffA) setDiffA(globalHash); else setDiffB(globalHash); } else message.warning('当前 hash 不在缓存'); }}>填入当前</Button>
          <Button size="small" disabled={!baselineHash} onClick={()=> baselineHash && setDiffA(baselineHash)}>基线→A</Button>
      <Button size="small" disabled={!entryA || !entryB} onClick={()=>{
            if (!entryA || !entryB) return;
            const lines = [
              '# 地质配置差异报告',
              `生成时间: ${new Date().toLocaleString()}`,
              `A: ${entryA.hash}  时间:${new Date(entryA.ts).toLocaleTimeString()}`,
              `B: ${entryB.hash}  时间:${new Date(entryB.ts).toLocaleTimeString()}`,
              '',
              '## 指标比较',
              `| 指标 | A | B | Δ |`,
              '|------|----|----|----|',
              `| N | ${entryA.N||'-'} | ${entryB.N||'-'} | ${(entryA.N&&entryB.N)? (entryB.N-entryA.N):'-'} |`,
              `| 内存(MB) | ${entryA.memMB?.toFixed(1)||'-'} | ${entryB.memMB?.toFixed(1)||'-'} | ${(entryA.memMB&&entryB.memMB)? (entryB.memMB-entryA.memMB).toFixed(1):'-'} |`,
              `| 耗时(s) | ${entryA.sec?.toFixed(2)||'-'} | ${entryB.sec?.toFixed(2)||'-'} | ${(entryA.sec&&entryB.sec)? (entryB.sec-entryA.sec).toFixed(2):'-'} |`,
        `| 域体积(m³) | ${entryA.domainVolume?.toFixed?.(1)||'-'} | ${entryB.domainVolume?.toFixed?.(1)||'-'} | ${(entryA.domainVolume&&entryB.domainVolume)? (entryB.domainVolume-entryA.domainVolume).toFixed(1):'-'} |`,
        `| 平均单元体积 | ${entryA.avgCellVol? entryA.avgCellVol.toExponential(2):'-'} | ${entryB.avgCellVol? entryB.avgCellVol.toExponential(2):'-'} | ${(entryA.avgCellVol&&entryB.avgCellVol)? (entryB.avgCellVol-entryA.avgCellVol).toExponential(2):'-'} |`,
              `| rmseZ | ${entryA.quality.rmseZ} | ${entryB.quality.rmseZ} | ${(entryB.quality.rmseZ-entryA.quality.rmseZ).toFixed(4)} |`,
              `| rmseH | ${entryA.quality.rmseH} | ${entryB.quality.rmseH} | ${(entryB.quality.rmseH-entryA.quality.rmseH).toFixed(4)} |`,
              `| Grade | ${entryA.quality.grade} | ${entryB.quality.grade} | ${entryA.quality.grade===entryB.quality.grade?'相同':entryA.quality.grade+'→'+entryB.quality.grade} |`,
              `| Fallback | ${entryA.fallback?'Y':'-'} | ${entryB.fallback?'Y':'-'} | ${entryA.fallback===entryB.fallback?'-':(entryA.fallback?'Y':'-')+'→'+(entryB.fallback?'Y':'-')} |`,
              `| ROI | ${entryA.roiAdjusted?'Y':'-'} | ${entryB.roiAdjusted?'Y':'-'} | ${entryA.roiAdjusted===entryB.roiAdjusted?'-':(entryA.roiAdjusted?'Y':'-')+'→'+(entryB.roiAdjusted?'Y':'-')} |`,
              '',
              '## 分辨率',
              `A: ${entryA.domainSnapshot? `${entryA.domainSnapshot.nx},${entryA.domainSnapshot.ny},${entryA.domainSnapshot.nz}`:'-'}`,
              `B: ${entryB.domainSnapshot? `${entryB.domainSnapshot.nx},${entryB.domainSnapshot.ny},${entryB.domainSnapshot.nz}`:'-'}`,
              '',
              '---'
            ].join('\n');
            const blob = new Blob([lines], { type:'text/markdown' });
            const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='diff_report.md'; a.click(); URL.revokeObjectURL(a.href);
            message.success('已导出差异报告 diff_report.md');
          }}>导出报告</Button>
      <Button size="small" disabled={!entryA || !entryB} onClick={()=>{
            if (!entryA || !entryB) return;
            const json = {
              generatedAt: new Date().toISOString(),
        A: { hash: entryA.hash, ts: entryA.ts, quality: entryA.quality, N: entryA.N, memMB: entryA.memMB, sec: entryA.sec, fallback: entryA.fallback, roiAdjusted: entryA.roiAdjusted, resolution: entryA.domainSnapshot? { nx: entryA.domainSnapshot.nx, ny: entryA.domainSnapshot.ny, nz: entryA.domainSnapshot.nz }: null, domainVolume: entryA.domainVolume??null, avgCellVol: entryA.avgCellVol??null },
        B: { hash: entryB.hash, ts: entryB.ts, quality: entryB.quality, N: entryB.N, memMB: entryB.memMB, sec: entryB.sec, fallback: entryB.fallback, roiAdjusted: entryB.roiAdjusted, resolution: entryB.domainSnapshot? { nx: entryB.domainSnapshot.nx, ny: entryB.domainSnapshot.ny, nz: entryB.domainSnapshot.nz }: null, domainVolume: entryB.domainVolume??null, avgCellVol: entryB.avgCellVol??null },
              diff: {
                N: (entryA.N&&entryB.N)? entryB.N-entryA.N : null,
                memMB: (entryA.memMB&&entryB.memMB)? +(entryB.memMB-entryA.memMB).toFixed(3): null,
                sec: (entryA.sec&&entryB.sec)? +(entryB.sec-entryA.sec).toFixed(4): null,
        domainVolume: (entryA.domainVolume && entryB.domainVolume)? +(entryB.domainVolume-entryA.domainVolume).toFixed(3): null,
        avgCellVol: (entryA.avgCellVol && entryB.avgCellVol)? +(entryB.avgCellVol-entryA.avgCellVol): null,
                rmseZ: +(entryB.quality.rmseZ-entryA.quality.rmseZ).toFixed(4),
                rmseH: +(entryB.quality.rmseH-entryA.quality.rmseH).toFixed(4),
                gradeChanged: entryA.quality.grade===entryB.quality.grade? null: { from: entryA.quality.grade, to: entryB.quality.grade },
                fallbackChanged: entryA.fallback===entryB.fallback? null: { from: entryA.fallback, to: entryB.fallback },
                roiChanged: entryA.roiAdjusted===entryB.roiAdjusted? null: { from: entryA.roiAdjusted, to: entryB.roiAdjusted },
                resolutionDelta: (entryA.domainSnapshot && entryB.domainSnapshot)? {
                  nx: entryB.domainSnapshot.nx-entryA.domainSnapshot.nx,
                  ny: entryB.domainSnapshot.ny-entryA.domainSnapshot.ny,
                  nz: entryB.domainSnapshot.nz-entryA.domainSnapshot.nz
                }: null,
                domainBoundsDelta: (entryA.domainSnapshot && entryB.domainSnapshot && entryA.domainSnapshot.mode==='manual' && entryB.domainSnapshot.mode==='manual')? {
                  xmin: entryB.domainSnapshot.xmin - entryA.domainSnapshot.xmin,
                  xmax: entryB.domainSnapshot.xmax - entryA.domainSnapshot.xmax,
                  ymin: entryB.domainSnapshot.ymin - entryA.domainSnapshot.ymin,
                  ymax: entryB.domainSnapshot.ymax - entryA.domainSnapshot.ymax,
                  zmin: entryB.domainSnapshot.zmin - entryA.domainSnapshot.zmin,
                  zmax: entryB.domainSnapshot.zmax - entryA.domainSnapshot.zmax
                }: null,
                waterHeadDelta: (entryA.waterHeadSnapshot && entryB.waterHeadSnapshot)? Object.fromEntries(Object.keys(entryA.waterHeadSnapshot).map(k=> [k, (entryB.waterHeadSnapshot as any)[k] - (entryA.waterHeadSnapshot as any)[k]])): null
              }
            };
            const blob = new Blob([JSON.stringify(json,null,2)], { type:'application/json' });
            const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='diff_report.json'; a.click(); URL.revokeObjectURL(a.href);
            message.success('已导出 JSON 差异 diff_report.json');
          }}>导出JSON</Button>
          <Button size="small" disabled={!diffA && !diffB} onClick={()=>{ setDiffA(null); setDiffB(null); }}>清空选择</Button>
        </Space>
    {qualityDiff? (
          <table style={{ width:'100%', fontSize:12, borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ textAlign:'left' }}>
                <th style={{ padding:'4px 6px' }}></th>
                <th style={{ padding:'4px 6px' }}>A</th>
                <th style={{ padding:'4px 6px' }}>B</th>
                <th style={{ padding:'4px 6px' }}>Δ / 变化</th>
              </tr>
            </thead>
            <tbody>
      <tr><td style={{ padding:'3px 6px' }}>N</td><td style={{ padding:'3px 6px' }}>{entryA?.N?.toLocaleString?.()||'-'}</td><td style={{ padding:'3px 6px' }}>{entryB?.N?.toLocaleString?.()||'-'}</td><td style={{ padding:'3px 6px' }}>{(entryA?.N&&entryB?.N)? (entryB!.N!-entryA!.N!).toLocaleString(): '-'}</td></tr>
      <tr><td style={{ padding:'3px 6px' }}>内存(MB)</td><td style={{ padding:'3px 6px' }}>{entryA?.memMB?.toFixed?.(1) || '-'}</td><td style={{ padding:'3px 6px' }}>{entryB?.memMB?.toFixed?.(1) || '-'}</td><td style={{ padding:'3px 6px' }}>{(entryA?.memMB && entryB?.memMB)? (entryB.memMB-entryA.memMB).toFixed(1): '-'}</td></tr>
      <tr><td style={{ padding:'3px 6px' }}>耗时(s)</td><td style={{ padding:'3px 6px' }}>{entryA?.sec?.toFixed?.(2) || '-'}</td><td style={{ padding:'3px 6px' }}>{entryB?.sec?.toFixed?.(2) || '-'}</td><td style={{ padding:'3px 6px' }}>{(entryA?.sec && entryB?.sec)? (entryB.sec-entryA.sec).toFixed(2): '-'}</td></tr>
              <tr><td style={{ padding:'3px 6px' }}>分辨率(nx,ny,nz)</td><td style={{ padding:'3px 6px' }}>{entryA?.domainSnapshot? `${entryA.domainSnapshot.nx},${entryA.domainSnapshot.ny},${entryA.domainSnapshot.nz}`:'-'}</td><td style={{ padding:'3px 6px' }}>{entryB?.domainSnapshot? `${entryB.domainSnapshot.nx},${entryB.domainSnapshot.ny},${entryB.domainSnapshot.nz}`:'-'}</td><td style={{ padding:'3px 6px' }}>{(entryA?.domainSnapshot && entryB?.domainSnapshot)? `${entryB.domainSnapshot.nx-entryA.domainSnapshot.nx}/${entryB.domainSnapshot.ny-entryA.domainSnapshot.ny}/${entryB.domainSnapshot.nz-entryA.domainSnapshot.nz}`:'-'}</td></tr>
              <tr><td style={{ padding:'3px 6px' }}>ROI开关</td><td style={{ padding:'3px 6px' }}>{entryA?.domainSnapshot? (entryA.domainSnapshot.roiEnabled? 'Y':'-'):'-'}</td><td style={{ padding:'3px 6px' }}>{entryB?.domainSnapshot? (entryB.domainSnapshot.roiEnabled? 'Y':'-'):'-'}</td><td style={{ padding:'3px 6px' }}>{(entryA?.domainSnapshot && entryB?.domainSnapshot && (entryA.domainSnapshot.roiEnabled!==entryB.domainSnapshot.roiEnabled))? '变化':'-'}</td></tr>
              <tr><td style={{ padding:'3px 6px' }}>rmseZ</td><td style={{ padding:'3px 6px' }}>{entryA?.quality.rmseZ}</td><td style={{ padding:'3px 6px' }}>{entryB?.quality.rmseZ}</td><td style={{ padding:'3px 6px' }}>{qualityDiff.rmseZ}</td></tr>
              <tr><td style={{ padding:'3px 6px' }}>rmseH</td><td style={{ padding:'3px 6px' }}>{entryA?.quality.rmseH}</td><td style={{ padding:'3px 6px' }}>{entryB?.quality.rmseH}</td><td style={{ padding:'3px 6px' }}>{qualityDiff.rmseH}</td></tr>
              <tr><td style={{ padding:'3px 6px' }}>Grade</td><td style={{ padding:'3px 6px' }}>{entryA?.quality.grade}</td><td style={{ padding:'3px 6px' }}>{entryB?.quality.grade}</td><td style={{ padding:'3px 6px' }}>{qualityDiff.grade}</td></tr>
              <tr><td style={{ padding:'3px 6px' }}>Fallback</td><td style={{ padding:'3px 6px' }}>{entryA?.fallback? 'Y':'-'}</td><td style={{ padding:'3px 6px' }}>{entryB?.fallback? 'Y':'-'}</td><td style={{ padding:'3px 6px' }}>{qualityDiff.fallback}</td></tr>
              <tr><td style={{ padding:'3px 6px' }}>ROI</td><td style={{ padding:'3px 6px' }}>{entryA?.roiAdjusted? 'Y':'-'}</td><td style={{ padding:'3px 6px' }}>{entryB?.roiAdjusted? 'Y':'-'}</td><td style={{ padding:'3px 6px' }}>{qualityDiff.roi}</td></tr>
            </tbody>
          </table>
        ) : <Alert type="info" showIcon message="选择两个缓存条目以查看差异" />}
      </Space>
    </Card>
  );

  // ---- 缓存表排序状态 ----
  const [cacheSorter, setCacheSorter] = useState<{ key:string; dir:'asc'|'desc' }|null>(null);
  const toggleCacheSort = (key:string) => {
    setCacheSorter(s=>{
      if(!s || s.key!==key) return { key, dir:'asc' };
      if(s.dir==='asc') return { key, dir:'desc' };
      return null; // 第三次点击清除排序
    });
  };
  const applyCacheSort = (list:any[]) => {
    if(!cacheSorter) return list;
    const { key, dir } = cacheSorter; const mul = dir==='asc'?1:-1;
    return [...list].sort((a,b)=>{
      let av:any; let bv:any;
      if(key==='grade'){ av=a.quality.grade; bv=b.quality.grade; }
      else if(key==='domainVolume'){ av=a.domainVolume??-Infinity; bv=b.domainVolume??-Infinity; }
      else { av=a[key]; bv=b[key]; }
      if(av==null && bv==null) return 0; if(av==null) return -1*mul; if(bv==null) return 1*mul;
      if(av===bv) return 0; return av>bv? mul : -mul;
    });
  };

  // --- 内联虚拟化缓存列表组件 (通过回调传递 A/B 选择) ---
  const VirtualizedCacheTable: React.FC<{ entries:any[]; filter:string; onSelectA:(h:string)=>void; onSelectB:(h:string)=>void; }> = ({ entries, filter, onSelectA, onSelectB }) => {
    const filteredBase = entries.filter(it=>{
      if (!filter) return true; const f = filter.trim().toLowerCase();
      return it.hash.toLowerCase().includes(f) || it.quality.grade.toLowerCase().includes(f) || (f==='pin' && it.pinned) || (f==='base' && baselineHash===it.hash);
    });
    const filtered = applyCacheSort(filteredBase);
    const rowHeight = 28; const headerHeight = 28; const maxHeight = 220; const bodyHeight = maxHeight - headerHeight;
    const needVirtual = filtered.length >= 80;
    const [scrollTop, setScrollTop] = React.useState(0);
    const start = needVirtual? Math.max(0, Math.floor(scrollTop / rowHeight)-2):0;
    const viewportCount = needVirtual? Math.ceil(bodyHeight / rowHeight)+4: filtered.length;
    const end = needVirtual? Math.min(filtered.length, start + viewportCount): filtered.length;
    const visible = needVirtual? filtered.slice(start, end): filtered;
    return (
      <div style={{ maxHeight, overflow:'auto', border:'1px solid rgba(255,255,255,0.08)', borderRadius:4 }} onScroll={e=> needVirtual && setScrollTop((e.target as HTMLDivElement).scrollTop)}>
        <table style={{ width:'100%', fontSize:12, borderCollapse:'collapse', position:'relative' }}>
          <thead style={{ position:'sticky', top:0, background:'rgba(0,0,0,0.5)' }}>
            <tr style={{ textAlign:'left' }}>
              <th style={{ padding:'4px 6px', cursor:'pointer' }} onClick={()=>toggleCacheSort('ts')}>时间{cacheSorter?.key==='ts'? (cacheSorter.dir==='asc'?'↑':'↓'):''}</th>
              <th style={{ padding:'4px 6px', cursor:'pointer' }} onClick={()=>toggleCacheSort('hash')}>Hash{cacheSorter?.key==='hash'? (cacheSorter.dir==='asc'?'↑':'↓'):''}</th>
              <th style={{ padding:'4px 6px', cursor:'pointer' }} onClick={()=>toggleCacheSort('N')}>N{cacheSorter?.key==='N'? (cacheSorter.dir==='asc'?'↑':'↓'):''}</th>
              <th style={{ padding:'4px 6px', cursor:'pointer' }} onClick={()=>toggleCacheSort('grade')}>Grade{cacheSorter?.key==='grade'? (cacheSorter.dir==='asc'?'↑':'↓'):''}</th>
              <th style={{ padding:'4px 6px' }}>F</th>
              <th style={{ padding:'4px 6px' }}>ROI</th>
              <th style={{ padding:'4px 6px' }}>cellV(e2)</th>
              <th style={{ padding:'4px 6px', cursor:'pointer' }} onClick={()=>toggleCacheSort('domainVolume')}>Vol(m³){cacheSorter?.key==='domainVolume'? (cacheSorter.dir==='asc'?'↑':'↓'):''}</th>
              <th style={{ padding:'4px 6px' }}>操作</th>
            </tr>
          </thead>
          <tbody style={needVirtual? { display:'block', position:'relative', height: filtered.length*rowHeight } as any: {}}>
            {needVirtual? visible.map((it, idx)=>{
              const i = start + idx; return renderCacheRow(it, onSelectA, onSelectB, { transform:`translateY(${i*rowHeight}px)` });
            }): filtered.map(it=> renderCacheRow(it, onSelectA, onSelectB))}
          </tbody>
        </table>
      </div>
    );
  };

  const advancedTab = (
    <div style={{ maxHeight: '70vh', overflowY: 'scroll', padding: '0 4px', paddingBottom: 140 }}>
      <Space direction="vertical" style={{ width:'100%' }} size="middle">
      {/* 重建算法与参数 */}
      <Card size="small" title={<Space><ExperimentOutlined />重建算法与参数</Space>} bodyStyle={{ padding: 12 }}>
        <Space direction="vertical" style={{ width: '100%' }} size={8}>
          {/* 算法选择 */}
          <div>
            <Text strong>重建算法</Text>
            <Radio.Group
              value={algorithm}
              onChange={(e) => setAlgorithm(e.target.value)}
              style={{ marginTop: 8, display: 'block' }}
            >
              <Space direction="vertical">
                <Radio value="rbf">RBF 径向基函数</Radio>
                <Radio value="kriging">Kriging 克里金</Radio>
                <Radio value="idw">IDW 反距离权重</Radio>
              </Space>
            </Radio.Group>
          </div>

          <Divider style={{ margin: '8px 0' }} />

          {/* 预设 */}
          <div>
            <Text strong>参数预设</Text>
            <Segmented
              value={preset}
              onChange={(val) => { setPreset(val as any); setCustomParams({}); }}
              options={[
                { label: '快速', value: 'fast' },
                { label: '平衡', value: 'balanced' },
                { label: '精确', value: 'accurate' }
              ]}
              style={{ marginTop: 8 }}
            />
          </div>

          <Divider style={{ margin: '8px 0' }} />

          {/* 算法参数表单 */}
          <div>
            <Text strong>算法参数</Text>
            <div style={{ marginTop: 12 }}>
              {algorithm === 'rbf' && (
                <Row gutter={12}>
                  <Col xs={24} md={12}>
                    <Text>影响半径</Text>
                    <Tooltip title="控制每个点影响范围，越大越平滑">
                      <Slider min={50} max={1000} value={currentParams.radius}
                        onChange={(v: number)=> setCustomParams((p: any)=> ({...p, radius: v}))}
                        marks={{ 100:'100', 500:'500', 1000:'1000' }} />
                    </Tooltip>
                  </Col>
                  <Col xs={24} md={12}>
                    <Text>平滑因子</Text>
                    <Tooltip title="0 为严格插值，值越大越平滑">
                      <Slider min={0} max={2} step={0.1} value={currentParams.smoothing}
                        onChange={(v: number)=> setCustomParams((p: any)=> ({...p, smoothing: v}))}
                        marks={{ 0:'0', 1:'1', 2:'2' }} />
                    </Tooltip>
                  </Col>
                  <Col span={24}>
                    <Text>核函数</Text>
                    <Select style={{ width:'100%' }} value={currentParams.kernelType}
                      onChange={(v)=> setCustomParams((p:any)=> ({...p, kernelType: v}))}
                      options={[
                        { value:'gaussian', label:'gaussian 高斯' },
                        { value:'multiquadric', label:'multiquadric 多二次' },
                        { value:'thinplate', label:'thinplate 薄板样条' },
                      ]} />
                  </Col>
                </Row>
              )}

              {algorithm === 'kriging' && (
                <Row gutter={12}>
                  <Col xs={12} md={6}>
                    <Text>Range</Text>
                    <InputNumber style={{ width:'100%' }} min={50} max={2000}
                      value={currentParams.range}
                      onChange={(v)=> setCustomParams((p:any)=> ({...p, range: v ?? p.range}))} />
                  </Col>
                  <Col xs={12} md={6}>
                    <Text>Sill</Text>
                    <InputNumber style={{ width:'100%' }} min={0.5} max={10} step={0.5}
                      value={currentParams.sill}
                      onChange={(v)=> setCustomParams((p:any)=> ({...p, sill: v ?? p.sill}))} />
                  </Col>
                  <Col xs={12} md={6}>
                    <Text>Nugget</Text>
                    <InputNumber style={{ width:'100%' }} min={0} max={2} step={0.1}
                      value={currentParams.nugget}
                      onChange={(v)=> setCustomParams((p:any)=> ({...p, nugget: v ?? p.nugget}))} />
                  </Col>
                  <Col xs={12} md={6}>
                    <Text>模型</Text>
                    <Select style={{ width:'100%' }} value={currentParams.model}
                      onChange={(v)=> setCustomParams((p:any)=> ({...p, model: v}))}
                      options={[
                        { value:'spherical', label:'球状' },
                        { value:'exponential', label:'指数' },
                        { value:'gaussian', label:'高斯' }
                      ]} />
                  </Col>
                </Row>
              )}

              {algorithm === 'idw' && (
                <Row gutter={12}>
                  <Col xs={12} md={8}>
                    <Text>权重指数</Text>
                    <InputNumber style={{ width:'100%' }} min={0.5} max={5} step={0.5}
                      value={currentParams.power}
                      onChange={(v)=> setCustomParams((p:any)=> ({...p, power: v ?? p.power}))} />
                  </Col>
                  <Col xs={12} md={8}>
                    <Text>搜索半径</Text>
                    <InputNumber style={{ width:'100%' }} min={100} max={2000} step={10}
                      value={currentParams.searchRadius}
                      onChange={(v)=> setCustomParams((p:any)=> ({...p, searchRadius: v ?? p.searchRadius}))} />
                  </Col>
                  <Col xs={12} md={8}>
                    <Text>最少点数</Text>
                    <InputNumber style={{ width:'100%' }} min={2} max={20} step={1}
                      value={currentParams.minPoints}
                      onChange={(v)=> setCustomParams((p:any)=> ({...p, minPoints: v ?? p.minPoints}))} />
                  </Col>
                </Row>
              )}
            </div>
          </div>
        </Space>
      </Card>

      <Card size="small" title={<Space><ThunderboltOutlined />缓存管理</Space>} bodyStyle={{ padding: 12 }}>
        <Space wrap style={{ marginBottom:8 }}>
          <Button size="small" onClick={()=>{
            const txt = geologyReconCache.exportJson();
            const blob = new Blob([txt], { type:'application/json' });
            const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='geology_cache.json'; a.click(); URL.revokeObjectURL(a.href);
          }}>导出缓存</Button>
          <Button size="small" onClick={()=>{ const inp=document.createElement('input'); inp.type='file'; inp.accept='.json'; inp.onchange=e=>{ const f=(e.target as HTMLInputElement).files?.[0]; if(!f)return; const r=new FileReader(); r.onload=()=>{ const res=geologyReconCache.importJson(String(r.result)); if((res as any).error) message.error('导入失败:'+ (res as any).error); else { message.success('导入完成'); setCacheVersion(v=>v+1);} }; r.readAsText(f); }; inp.click(); }}>导入缓存</Button>
          <Button size="small" danger onClick={()=>{ geologyReconCache.clear(); setCacheVersion(v=>v+1); message.success('缓存已清空'); }}>清空缓存</Button>
          <Button size="small" danger onClick={()=>{ const all=geologyReconCache.list(); let removed=0; all.forEach(e=>{ if(!e.pinned) { geologyReconCache.remove(e.hash); removed++; }}); if(removed){ setCacheVersion(v=>v+1); message.success(`已删除非Pinned ${removed} 条`);} else message.info('无可删除条目'); }}>删未Pin</Button>
          <Input size="small" placeholder="过滤 hash / grade" value={cacheFilter} onChange={e=> setCacheFilter(e.target.value)} style={{ width:160 }} />
          <Button size="small" onClick={()=>{ if(cacheEntries[0]) setDiffA(cacheEntries[0].hash); }} disabled={!cacheEntries.length}>最新→A</Button>
          <Button size="small" onClick={()=>{ if(cacheEntries[0]) setDiffB(cacheEntries[0].hash); }} disabled={!cacheEntries.length}>最新→B</Button>
          <Button size="small" onClick={()=>{ if(baselineHash) setDiffA(baselineHash); }} disabled={!baselineHash}>基线→A</Button>
        </Space>
  <VirtualizedCacheTable entries={cacheEntries} filter={cacheFilter} onSelectA={h=> setDiffA(h)} onSelectB={h=> setDiffB(h)} />
      </Card>
      <Card size="small" title={<Space><ThunderboltOutlined />回退策略</Space>} bodyStyle={{ padding:12 }}>
        <Space direction="vertical" style={{ width:'100%' }}>
          <Alert type="info" showIcon message="当分辨率接近软上限服务器可能触发降级；禁止回退将导致请求失败提示" />
          <Radio.Group size="small" value={fallbackPolicy} onChange={e=> setFallbackPolicy(e.target.value)}>
            <Radio.Button value="allow">允许回退</Radio.Button>
            <Radio.Button value="deny">禁止回退</Radio.Button>
          </Radio.Group>
        </Space>
      </Card>
      {HashDiffCard}
      </Space>
    </div>
  );

  const waterHeadTab = (
    <Space direction="vertical" style={{ width:'100%' }} size="middle">
      <Card size="small" title={<Space><DeploymentUnitOutlined />水头参数配置</Space>} extra={<Tag color="geekblue">hash:{paramHash}</Tag>}>
        <Form layout="vertical" size="small">
          <Row gutter={12}>
            <Col xs={12} md={6}>
              <Form.Item label={<Tooltip title="自由水位标高 (m)"><span>z_water</span></Tooltip>}>
                <InputNumber min={-1000} max={1000} step={0.1} style={{ width:'100%' }} value={waterParams.z_water} onChange={v=>numberSetter('z_water', v)} />
              </Form.Item>
            </Col>
            <Col xs={12} md={6}>
              <Form.Item label={<Tooltip title="水的单位重 γw (kN/m³)"><span>gamma_w</span></Tooltip>}>
                <InputNumber min={5} max={12} step={0.01} style={{ width:'100%' }} value={waterParams.gamma_w} onChange={v=>numberSetter('gamma_w', v)} />
              </Form.Item>
            </Col>
            <Col xs={12} md={6}>
              <Form.Item label={<Tooltip title="水位波动幅值 Δh (m)"><span>delta_h</span></Tooltip>}>
                <InputNumber min={0} max={20} step={0.1} style={{ width:'100%' }} value={waterParams.delta_h} onChange={v=>numberSetter('delta_h', v)} />
              </Form.Item>
            </Col>
            <Col xs={12} md={6}>
              <Form.Item label={<Tooltip title="水力坡降 i"><span>gradient</span></Tooltip>}>
                <InputNumber min={0} max={0.5} step={0.0005} style={{ width:'100%' }} value={waterParams.gradient} onChange={v=>numberSetter('gradient', v)} />
              </Form.Item>
            </Col>
            <Col xs={12} md={6}>
              <Form.Item label={<Tooltip title="超静孔压系数 αu"><span>alpha_u</span></Tooltip>}>
                <InputNumber min={0} max={1.5} step={0.01} style={{ width:'100%' }} value={waterParams.alpha_u} onChange={v=>numberSetter('alpha_u', v)} />
              </Form.Item>
            </Col>
            <Col xs={24} md={18}>
              <Form.Item label="备注">
                <Input placeholder="参数说明 / 数据来源" value={waterParams.note} onChange={e=>strSetter('note', e.target.value)} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
        <Space wrap>
          <Button size="small" onClick={handleHeadPreview} loading={headPreviewing}>预览</Button>
          <Button size="small" type="primary" onClick={exportHeadConfig} icon={<DownloadOutlined />}>导出 head_config.json</Button>
          <Button size="small" onClick={()=> setWaterParams(p=> ({ ...p, z_water: deriveSuggestedZWater() }))}>重置水位</Button>
        </Space>
        <Divider style={{ margin:'8px 0' }} />
        <Alert type="info" showIcon message="当前仅做前端参数管理; 后续接入后端预览/校验接口 & 动态水位曲线" style={{ marginBottom:0 }} />
      </Card>
    </Space>
  );

  return (
    <>
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)', padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <Row align="middle" gutter={12}>
          <Col flex="auto">
            <Space size={12} wrap>
              <Title level={5} style={{ color: '#fff', margin: 0 }}>地质三维重建 V2</Title>
              <Tag color={risk.color}>{risk.label}</Tag>
              <Tag color="blue">{algorithm.toUpperCase()}</Tag>
              <Tag color="green">{preset}</Tag>
              <Tag icon={<DatabaseOutlined />} color="blue">N={N.toLocaleString()}</Tag>
              <Tag color="geekblue">{memoryMB.toFixed(1)} MB</Tag>
              <Tag color="purple">{timeSec.toFixed(1)} s</Tag>
              {avgCellVol && <Tag color="magenta">cellV:{avgCellVol.toExponential(2)}</Tag>}
              <Tag>hash:{globalHash}</Tag>
              {cacheHit && <Tag color="green">Cache</Tag>}
              {fallbackUsed && <Tag color="orange">Fallback(Server)</Tag>}
              {roiAdjusted && <Tag color="gold">ROI Adjusted</Tag>}
              {quality && <Tag color={quality.grade==='A'?'green':quality.grade==='B'?'blue':quality.grade==='C'?'orange':'red'}>Q:{quality.grade} z:{quality.rmseZ}</Tag>}
              {previewing && <Tag color="gold">预览中...</Tag>}
              {submitting && <Tag color="cyan">提交中...</Tag>}
            </Space>
          </Col>
          <Col>
            <Space>
              <Button size="small" onClick={handleCancel}>重置</Button>
              <Button size="small" loading={previewing} type="default" onClick={handlePreview} disabled={risk.level==='hard'}>预览</Button>
              <Button size="small" loading={submitting} type="primary" onClick={handleCommit} disabled={risk.level==='hard'}>确定</Button>
            </Space>
          </Col>
        </Row>
      </div>
  <div style={{ flex: 1, overflowY: 'scroll', padding: 12, paddingBottom: 140 }}>
        <Tabs
          size="small"
          tabPosition="top"
          items={[
            { key: 'domain', label: '土体计算域', children: domainTab },
            { key: 'boreholes', label: '钻孔数据', children: boreholeTab },
            { key: 'advanced', label: '参数配置', children: advancedTab },
            { key: 'water', label: '水头参数', children: waterHeadTab },
          ]}
        />
        {quality && (
          <Card size="small" style={{ marginTop:12 }} title={<Space><AimOutlined />质量指标</Space>}>
            <Row gutter={12}>
              <Col span={6}><Statistic title="RMSE Z" value={quality.rmseZ} precision={4} /></Col>
              <Col span={6}><Statistic title="RMSE H" value={quality.rmseH} precision={4} /></Col>
              <Col span={6}><Statistic title="Grade" value={quality.grade} valueStyle={{ color: quality.grade==='A'?'#52c41a': quality.grade==='B'?'#1890ff': quality.grade==='C'? '#fa8c16':'#ff4d4f' }} /></Col>
              <Col span={6}><Statistic title="回退" value={fallbackUsed? '是':'否'} valueStyle={{ color: fallbackUsed? '#fa8c16':'#52c41a' }} /></Col>
            </Row>
            <Divider style={{ margin:'8px 0' }} />
            <Alert type="info" showIcon message="当前质量为合成占位值，待接入后端真实 RMSEz/H" />
          </Card>
        )}
        {qualityHistory.length>0 && (
          <Card size="small" style={{ marginTop:12 }} title={<Space><AimOutlined />质量历史 ({qualityHistory.length})</Space>} extra={<Space size={6}><Button size="small" onClick={()=> setQualityHistory([])}>清空</Button></Space>}>
            <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
              <MiniQualityChart data={qualityHistory} metric="rmseZ" title="RMSE Z" />
              <MiniQualityChart data={qualityHistory} metric="rmseH" title="RMSE H" />
            </div>
            <Divider style={{ margin:'8px 0' }} />
            <div style={{ maxHeight:160, overflow:'auto', fontSize:12 }}>
              {qualityHistory.map(item => (
                <div key={item.ts} style={{ display:'flex', gap:8, alignItems:'center', padding:'2px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                  <Tag color={item.grade==='A'?'green':item.grade==='B'?'blue':item.grade==='C'?'orange':'red'} style={{ marginRight:0 }}>{item.grade}</Tag>
                  <span style={{ color:'#999' }}>{new Date(item.ts).toLocaleTimeString()}</span>
                  <span>N={item.N.toLocaleString()}</span>
                  <span>z:{item.rmseZ}</span>
                  <span>h:{item.rmseH}</span>
                  {item.fallback && <Tag color="orange" style={{ marginRight:0 }}>F</Tag>}
                  {item.roiAdjusted && <Tag color="gold" style={{ marginRight:0 }}>ROI</Tag>}
                  <span style={{ color:'#666' }}>#{item.hash.slice(0,6)}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
  </div>
  {show3D && (
      <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex: 9999, display:'flex', flexDirection:'column' }}>
        <div style={{ padding:'6px 12px', display:'flex', alignItems:'center', borderBottom:'1px solid #222', background:'#0d1117' }}>
          <Space wrap>
            <Title level={5} style={{ color:'#fff', margin:0 }}>钻孔 3D 预览</Title>
            <Tag color="blue">{boreholes.length} 孔</Tag>
            <Button size="small" onClick={()=> setShow3D(false)}>关闭 (Esc)</Button>
          </Space>
        </div>
        <div style={{ flex:1, position:'relative' }}>
          <div style={{ position:'absolute', top:8, left:8, zIndex:10, background:'rgba(0,0,0,0.55)', padding:8, border:'1px solid #333', borderRadius:4, display:'flex', gap:8, alignItems:'center' }}>
            <Space size={4} wrap>
              <Switch size="small" checked={showDomainBox} onChange={v=>setShowDomainBox(v)} />
              <span style={{ color:'#ddd', fontSize:12 }}>域盒</span>
              <Switch size="small" checked={show3DBoreholes} onChange={v=>setShow3DBoreholes(v)} />
              <span style={{ color:'#ddd', fontSize:12 }}>钻孔</span>
              <span style={{ color:'#999', fontSize:12 }}>不透明度</span>
              <InputNumber size="small" min={0.1} max={1} step={0.05} value={boreholeOpacity3D} onChange={v=> setBoreholeOpacity3D(v||0.85)} style={{ width:70 }} />
            </Space>
          </div>
          <GeologyReconstructionViewport3D
            boreholeData={borehole3DData}
            style={{ width:'100%', height:'100%' }}
          />
        </div>
      </div>
    )}
    {showHotkeyHelp && (
      <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.55)', zIndex:10000, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={()=> setShowHotkeyHelp(false)}>
        <div style={{ background:'#0d1117', padding:24, border:'1px solid #222', borderRadius:8, width:420 }} onClick={e=> e.stopPropagation()}>
          <Title level={5} style={{ color:'#fff', marginTop:0 }}>快捷键帮助 (Alt+H 关闭)</Title>
          <table style={{ width:'100%', fontSize:12, borderCollapse:'collapse' }}>
            <tbody>
              <tr><td style={{padding:'4px 6px'}}>Alt+A</td><td style={{padding:'4px 6px'}}>最新缓存设为 A</td></tr>
              <tr><td style={{padding:'4px 6px'}}>Alt+B</td><td style={{padding:'4px 6px'}}>最新缓存设为 B</td></tr>
              <tr><td style={{padding:'4px 6px'}}>Alt+P</td><td style={{padding:'4px 6px'}}>切换最新缓存 Pin</td></tr>
              <tr><td style={{padding:'4px 6px'}}>Alt+R</td><td style={{padding:'4px 6px'}}>回放最新缓存配置</td></tr>
              <tr><td style={{padding:'4px 6px'}}>Alt+K</td><td style={{padding:'4px 6px'}}>切换最新缓存基线</td></tr>
              <tr><td style={{padding:'4px 6px'}}>Alt+H</td><td style={{padding:'4px 6px'}}>显示/隐藏此帮助</td></tr>
              <tr><td style={{padding:'4px 6px'}}>Esc (3D)</td><td style={{padding:'4px 6px'}}>关闭 3D 预览</td></tr>
            </tbody>
          </table>
          <Divider style={{ margin:'8px 0' }} />
          <Alert type="info" showIcon message="点击空白区域或按 Alt+H 关闭" />
        </div>
      </div>
    )}
    </>
  );
};

// --- 轻量行渲染函数（支持虚拟化 transform 注入）---
function renderCacheRow(it:any, onSelectA:(h:string)=>void, onSelectB:(h:string)=>void, styleOverride:React.CSSProperties = {}){
  return (
    <tr key={it.hash} style={{ borderBottom:'1px solid rgba(255,255,255,0.06)', height:28, ...styleOverride, position: styleOverride.transform? 'absolute':'static', left:0, right:0 }}>
      <td style={{ padding:'3px 6px', whiteSpace:'nowrap' }}>{new Date(it.ts).toLocaleTimeString()}</td>
      <td style={{ padding:'3px 6px', fontWeight: it.isCurrent? 600: undefined, color: it.isCurrent? '#1890ff': undefined }}>
        {it.hash}{it.pinned && <Tag color="purple" style={{ marginLeft:4 }}>PIN</Tag>}{it.isBaseline && <Tag color="gold" style={{ marginLeft:4 }}>BASE</Tag>}
      </td>
      <td style={{ padding:'3px 6px' }}>{it.N?.toLocaleString?.() || '-'}</td>
      <td style={{ padding:'3px 6px' }}><Tag color={it.quality.grade==='A'?'green':it.quality.grade==='B'?'blue':it.quality.grade==='C'?'orange':'red'}>{it.quality.grade}</Tag></td>
      <td style={{ padding:'3px 6px' }}>{it.fallback? 'Y':'-'}</td>
      <td style={{ padding:'3px 6px' }}>{it.roiAdjusted? 'Y':'-'}</td>
  <td style={{ padding:'3px 6px' }}>{it.avgCellVol? it.avgCellVol.toExponential(2): '-'}</td>
  <td style={{ padding:'3px 6px' }}>{it.domainVolume? it.domainVolume.toFixed(1): '-'}</td>
      <td style={{ padding:'3px 6px' }}>
        <Space size={4}>
          <Button size="small" onClick={()=> onSelectA(it.hash)} style={{ padding:'0 4px' }}>A</Button>
          <Button size="small" onClick={()=> onSelectB(it.hash)} style={{ padding:'0 4px' }}>B</Button>
        </Space>
      </td>
    </tr>
  );
}

// 简易稳定颜色哈希 (0xRRGGBB)
function hashColor(key: string): number {
  let h=0; for (let i=0;i<key.length;i++){ h=(h*131 + key.charCodeAt(i))>>>0; }
  // 取中间 24bit。
  const color = (h & 0x00ffffff) | 0x303030; // 加一点亮度基底
  return color & 0xffffff;
}

export default GeologyReconstructionPanelV2;
