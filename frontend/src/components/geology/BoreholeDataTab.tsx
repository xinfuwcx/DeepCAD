import React, { useMemo, useState, useCallback, useRef } from 'react';
import { Card, Row, Col, Space, Typography, Alert, Upload, Slider, Table, Tag, Switch, Select, Button, Tooltip, Progress } from 'antd';
import type { UploadProps } from 'antd';
import { CloudUploadOutlined, DatabaseOutlined, SettingOutlined } from '@ant-design/icons';
import GeologyReconstructionViewport3D from '@/components/geology/GeologyReconstructionViewport3D';

const { Text } = Typography;
const { Dragger } = Upload;

// Types aligned with GeologyReconstructionViewport3D expectations
type ViewportBoreholeLayer = {
  id: string;
  name: string;
  topDepth: number;
  bottomDepth: number;
  soilType: string;
  color: string;
  opacity: number;
  visible: boolean;
};

type ViewportBorehole = {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number; // ground elevation
  depth: number;
  layers: ViewportBoreholeLayer[];
};

// Simple soil type color mapping
const SOIL_COLORS: Record<string, string> = {
  '填土': '#a97c50',
  '粘土': '#c97a7a',
  '粉质粘土': '#cc8e8e',
  '粉土': '#c4b08d',
  '粉砂': '#d1c089',
  '砂土': '#d4b483',
  '中砂': '#cc9a66',
  '粗砂': '#c68642',
  '砾砂': '#b97745',
  '卵石': '#8d8d8d',
  '碎石土': '#7a7a7a',
  '砂砾': '#9b8b6e',
  '岩层': '#666666',
};

const SOIL_SCHEMES: Record<string, Record<string,string>> = {
  '默认': SOIL_COLORS,
  '高对比': {
    '填土':'#8B4513','粘土':'#B22222','粉质粘土':'#CD5C5C','粉土':'#DAA520','粉砂':'#FF8C00','砂土':'#FF7F50','中砂':'#FF4500','粗砂':'#FF6347','砾砂':'#D2691E','卵石':'#696969','碎石土':'#505050','砂砾':'#8B7355','岩层':'#2F4F4F'
  },
  '清爽': {
    '填土':'#B09068','粘土':'#E7A1A1','粉质粘土':'#EFB7B7','粉土':'#E8D3A6','粉砂':'#F0DC96','砂土':'#EAC785','中砂':'#D9A066','粗砂':'#C49A6C','砾砂':'#B08868','卵石':'#A0A0A0','碎石土':'#808080','砂砾':'#A99B84','岩层':'#6B7280'
  }
};

const colorForSoil = (soil: string) => {
  if (!soil) return '#999999';
  // Direct map first
  if (SOIL_COLORS[soil]) return SOIL_COLORS[soil];
  // Fuzzy matching
  if (soil.includes('粘')) return SOIL_COLORS['粘土'];
  if (soil.includes('砂')) return SOIL_COLORS['砂土'];
  if (soil.includes('粉')) return SOIL_COLORS['粉土'];
  if (soil.includes('岩')) return SOIL_COLORS['岩层'];
  return '#999999';
};

function toViewportBoreholes(raw: any, exaggeration = 1.0): ViewportBorehole[] {
  const holes = raw?.holes ?? [];
  return holes.map((h: any) => {
    const elevation = h.elevation ?? h.z ?? 0;
  const rawLayers: any[] = (h.layers ?? []);
  const layers: ViewportBoreholeLayer[] = rawLayers.map((ly: any, idx: number): ViewportBoreholeLayer => {
      const top = Number(ly.topDepth ?? 0) * exaggeration;
      const bottom = Number(ly.bottomDepth ?? 0) * exaggeration;
      const soil = String(ly.soilType ?? ly.name ?? '未知');
      return {
        id: `${h.id || h.name || 'BH'}_L${idx + 1}`,
        name: String(ly.name ?? soil),
        topDepth: top,
        bottomDepth: bottom,
        soilType: soil,
        color: colorForSoil(soil),
        opacity: 0.85,
        visible: true,
      };
    });
  const maxDepth = layers.reduce((m: number, l: ViewportBoreholeLayer) => Math.max(m, l.bottomDepth), 0);
    return {
      id: String(h.id ?? h.name ?? Math.random().toString(36).slice(2)),
      name: String(h.id ?? h.name ?? 'BH'),
      x: Number(h.x ?? h.location?.x ?? 0),
      y: Number(h.y ?? h.location?.y ?? 0),
      z: Number(elevation),
      depth: maxDepth,
      layers,
    };
  });
}

export interface BoreholeDataTabProps {
  boreholeData: any | null;
  uploadProps: UploadProps;
  onChange?: (data: any)=> void;
}

const BoreholeDataTab: React.FC<BoreholeDataTabProps> = ({ boreholeData, uploadProps, onChange }) => {
  const [exaggeration, setExaggeration] = useState<number>(1.0);
  const [paletteName, setPaletteName] = useState<string>('默认');
  const [globalVisible, setGlobalVisible] = useState<boolean>(true);
  // 剖面/外部联动控制
  const [sectionEnabled, setSectionEnabled] = useState<boolean>(false);
  const [sectionAxis, setSectionAxis] = useState<'x' | 'y' | 'z'>('x');
  const [sectionPosition, setSectionPosition] = useState<number>(0);
  const [externalTool, setExternalTool] = useState<'select' | 'section' | 'wireframe' | 'explode' | 'reset' | 'pan' | 'zoom' | 'distance' | 'angle' | 'annotation' | 'undo' | 'redo'>('select');
  const [screenshotNonce, setScreenshotNonce] = useState<number>(0);

  // 滚动至数据表
  const tableCardRef = useRef<HTMLDivElement | null>(null);

  const holes = useMemo(() => (boreholeData?.holes ?? []), [boreholeData]);
  const viewportBoreholes = useMemo(() => {
    const palette = SOIL_SCHEMES[paletteName] || SOIL_COLORS;
    const v = toViewportBoreholes(boreholeData, exaggeration).map(h=> ({
      ...h,
      layers: h.layers.map(ly=> ({ ...ly, color: (palette[ly.soilType]||ly.color), visible: globalVisible }))
    }));
    return v;
  }, [boreholeData, exaggeration, paletteName, globalVisible]);

  const totalLayers = useMemo(() => holes.reduce((sum: number, h: any) => sum + (h.layers?.length || 0), 0), [holes]);

  const columns = [
    { title: '钻孔ID', dataIndex: 'id', key: 'id', width: 120 },
    { title: 'X', dataIndex: 'x', key: 'x', width: 90, render: (v: any) => Number(v).toFixed(2) },
    { title: 'Y', dataIndex: 'y', key: 'y', width: 90, render: (v: any) => Number(v).toFixed(2) },
    { title: '地面标高', dataIndex: 'elevation', key: 'elevation', width: 110, render: (v: any) => (v ?? 0).toFixed?.(2) ?? String(v) },
    { title: '土层数', key: 'layers', width: 90, render: (_: any, rec: any) => rec.layers?.length ?? 0 },
  ];

  const expandedRowRender = useCallback((rec: any) => {
    const data = (rec.layers ?? []).map((ly: any, idx: number) => ({
      key: `${rec.id}_L${idx + 1}`,
      name: ly.name ?? ly.soilType ?? `层位${idx + 1}`,
      top: ly.topDepth ?? 0,
      bottom: ly.bottomDepth ?? 0,
      soil: ly.soilType ?? ly.name ?? '未知',
      color: (SOIL_SCHEMES[paletteName]?.[ly.soilType]) || colorForSoil(ly.soilType ?? ly.name ?? ''),
    }));
    return (
      <Table
        size="small"
        columns={[
          { title: '层位', dataIndex: 'name', key: 'name' },
          { title: '土类', dataIndex: 'soil', key: 'soil', render: (soil: string) => <Tag color={(SOIL_SCHEMES[paletteName]?.[soil]) || colorForSoil(soil)}>{soil}</Tag> },
          { title: '上深(m)', dataIndex: 'top', key: 'top', render: (v: number) => v.toFixed?.(2) ?? v },
          { title: '下深(m)', dataIndex: 'bottom', key: 'bottom', render: (v: number) => v.toFixed?.(2) ?? v },
          { title: '可见', key: 'visible', render: (_:any, _row:any, i:number)=> <Switch size="small" defaultChecked={true} onChange={(checked)=>{
            if(!onChange) return;
            const next = { ...(boreholeData||{}), holes: (boreholeData?.holes||[]).map((h:any)=> h.id===rec.id? { ...h, layers: (h.layers||[]).map((ly:any, j:number)=> j===i? { ...ly, visible: checked }: ly) } : h) };
            onChange(next);
          }} /> }
        ]}
        dataSource={data}
        pagination={false}
      />
    );
  }, [boreholeData, onChange, paletteName]);

  // —— 统计与质量评估（轻量推断） ——
  const stats = useMemo(() => {
    const count = holes.length;
    const valid = holes.filter((h: any) => h && typeof h.x === 'number' && typeof h.y === 'number').length;
    const allLayers = holes.flatMap((h: any) => (h.layers || []));
    const depths = allLayers.map((ly: any) => Number(ly.bottomDepth ?? ly.bottom ?? 0));
    const minDepth = depths.length ? Math.min(...depths) : 0;
    const maxDepth = depths.length ? Math.max(...depths) : 0;
    // 简易“完整度”：填充字段比例
    const filled = holes.reduce((acc: number, h: any) => acc + ['id','x','y','elevation'].reduce((s, k) => s + (h?.[k] !== undefined ? 1 : 0), 0), 0);
    const possible = holes.length * 4;
    const quality = possible ? Math.round((filled / possible) * 100) : 0;
    const avgLayers = count ? (allLayers.length / count) : 0;
    return { count, valid, minDepth, maxDepth, quality, avgLayers };
  }, [holes]);

  // —— 快捷操作 ——
  const handleToggleSection = useCallback(() => {
    setSectionEnabled(prev => {
      const next = !prev;
      setExternalTool(next ? 'section' : 'select');
      return next;
    });
  }, []);

  const handleJumpToTable = useCallback(() => {
    tableCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const handleScreenshot = useCallback(() => setScreenshotNonce(Date.now()), []);

  return (
    <div style={{ height: '100%', overflow: 'hidden' }}>
      <Row gutter={16} style={{ height: '100%' }}>
        <Col span={10} style={{ height: '100%', display: 'flex', flexDirection: 'column', minWidth: 360 }}>
          {/* 可视化总览与快捷操作（合并自“钻孔数据可视化”） */}
          <Card size="small" style={{ marginBottom: 16, flex: 'none', borderColor: '#1890ff55' }} bodyStyle={{ paddingBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontWeight: 600 }}>🗺️ 钻孔数据可视化</div>
              <div style={{ fontSize: 12, color: '#999' }}>ACTIVE</div>
            </div>
            <Row gutter={8}>
              <Col span={12}>
                <div style={{ padding: 8, borderRadius: 6, border: '1px solid #1890ff55', background: 'rgba(24,144,255,0.05)' }}>
                  <div style={{ color: '#1890ff', fontWeight: 600, marginBottom: 6 }}>数据状态</div>
                  <div style={{ fontSize: 12, color: '#555' }}>已加载钻孔: {stats.count} 个 | 有效: {stats.valid} 个</div>
                  <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>深度范围: {stats.minDepth.toFixed(1)} - {stats.maxDepth.toFixed(1)} m</div>
                  <div style={{ marginTop: 6 }}>
                    <Progress percent={stats.quality} size="small" strokeColor="#1890ff" format={(p)=>`数据质量 ${p}%`} />
                  </div>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ padding: 8, borderRadius: 6, border: '1px solid #52c41a55', background: 'rgba(82,196,26,0.05)', height: '100%' }}>
                  <div style={{ color: '#52c41a', fontWeight: 600, marginBottom: 6 }}>可视化控制</div>
                  <Space wrap>
                    <Tooltip title="切换所有层可见性">
                      <Button size="small" type="primary" onClick={()=> setGlobalVisible(v=>!v)}>{globalVisible? '隐藏' : '显示'}3D钻孔</Button>
                    </Tooltip>
                    <Tooltip title="开启/关闭剖面模式">
                      <Button size="small" onClick={handleToggleSection} style={{ borderColor: '#52c41a', color: '#52c41a' }}>地层剖面{sectionEnabled?'(开)':'(关)'}</Button>
                    </Tooltip>
                    <Tooltip title="查看数据表与统计">
                      <Button size="small" onClick={handleJumpToTable} style={{ borderColor: '#1890ff', color: '#1890ff' }}>数据统计</Button>
                    </Tooltip>
                    <Tooltip title="导出当前视图PNG">
                      <Button size="small" onClick={handleScreenshot}>截图PNG</Button>
                    </Tooltip>
                  </Space>
                  <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>平均层数/孔: {stats.avgLayers.toFixed(1)}</div>
                </div>
              </Col>
            </Row>
          </Card>

          <Card title="数据上传与统计" size="small" style={{ marginBottom: 16, flex: 'none' }}>
            <Dragger {...uploadProps} style={{ marginBottom: 12 }}>
              <p style={{ margin: 0, fontSize: 24, color: '#1890ff' }}>
                <CloudUploadOutlined />
              </p>
              <p style={{ fontSize: 14, margin: '6px 0' }}>点击或拖拽上传钻孔数据文件</p>
              <p style={{ color: '#666', fontSize: 12, margin: 0 }}>支持 JSON、CSV、Excel 格式</p>
            </Dragger>

            {holes.length > 0 ? (
              <Alert
                message={`成功加载 ${holes.length} 个钻孔数据`}
                description={`包含 ${totalLayers} 个土层`}
                type="success"
                showIcon
              />
            ) : (
              <Alert message="尚未加载钻孔数据" type="info" showIcon />
            )}
          </Card>

          <Card ref={tableCardRef as any} size="small" title={<Space><DatabaseOutlined /><span>钻孔列表</span></Space>} style={{ flex: 1, minHeight: 0 }} bodyStyle={{ padding: 0 }}>
            <Table
              size="small"
              columns={columns as any}
              dataSource={holes}
              rowKey={(r: any) => r.id ?? r.name}
              expandable={{ expandedRowRender }}
              pagination={{ pageSize: 8, size: 'small' }}
              scroll={{ y: 360, x: 600 }}
            />
          </Card>

          <Card size="small" title={<Space><SettingOutlined /><span>可视化设置</span></Space>} style={{ marginTop: 16 }}>
            <Row gutter={12}>
              <Col span={24}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <Text>垂向夸张</Text>
                  <div style={{ flex: 1 }}>
                    <Slider min={0.5} max={3} step={0.1} value={exaggeration} onChange={setExaggeration} />
                  </div>
                  <Text type="secondary">×{exaggeration.toFixed(1)}</Text>
                </div>
              </Col>
              <Col span={24} style={{ marginTop: 8 }}>
                <Space size={8}>
                  <span>颜色方案</span>
                  <Select size="small" value={paletteName} style={{ width: 140 }} onChange={setPaletteName} options={Object.keys(SOIL_SCHEMES).map(k=> ({ label:k, value:k }))} />
                  <span>全局可见</span>
                  <Switch size="small" checked={globalVisible} onChange={setGlobalVisible} />
                </Space>
              </Col>
              <Col span={24} style={{ marginTop: 8 }}>
                <Space size={8} wrap>
                  <span>剖面</span>
                  <Switch size="small" checked={sectionEnabled} onChange={handleToggleSection} />
                  <span>轴</span>
                  <Select size="small" value={sectionAxis} style={{ width: 72 }} onChange={(v)=> setSectionAxis(v)} options={[{label:'X', value:'x'},{label:'Y', value:'y'},{label:'Z', value:'z'}]} />
                  <span>位置</span>
                  <div style={{ width: 160 }}>
                    <Slider min={-50} max={50} step={1} value={sectionPosition} onChange={setSectionPosition} disabled={!sectionEnabled} />
                  </div>
                </Space>
              </Col>
            </Row>
          </Card>
        </Col>

        <Col span={14} style={{ height: '100%' }}>
          <Card size="small" title="三维预览" style={{ height: '100%' }} bodyStyle={{ height: '100%', padding: 0 }}>
            <div style={{ height: '100%', minHeight: 480 }}>
              <GeologyReconstructionViewport3D 
                boreholeData={viewportBoreholes as any}
                showToolbar={false}
                showLayerControls={false}
                externalTool={externalTool as any}
                externalSectionAxis={sectionAxis}
                externalSectionPosition={sectionEnabled ? sectionPosition : undefined}
                externalScreenshotNonce={screenshotNonce}
              />
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default BoreholeDataTab;
