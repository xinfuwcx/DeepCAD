import React, { useState } from 'react';
import { Row, Col, Select, Card, InputNumber, Divider, Tabs, Form, Table, Checkbox, Button, message } from 'antd';
import { SafetyOutlined, AimOutlined } from '@ant-design/icons';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { SupportParamsSchema, type SupportParams } from '../../schemas';
// 移除未使用的 UI 组件导入，保持文件精简

const { Option } = Select;
const { TabPane } = Tabs;

interface SupportModuleProps {
  params: SupportParams;
  onParamsChange: (category: string, key: string, value: any) => void;
  onGenerate: (validatedData: SupportParams) => void;
  status: 'wait' | 'process' | 'finish' | 'error';
  disabled: boolean;
}

const SupportModule: React.FC<SupportModuleProps> = ({ 
  params, 
  onParamsChange, 
  // onGenerate,
  // status, disabled 目前未使用（保留 props 以兼容上层）
}) => {
  // const [activePanel, setActivePanel] = useState<string | string[]>(['diaphragm']); // 预留折叠面板状态
  const [anchorCount, setAnchorCount] = useState(10);
  const [beamEnabled, setBeamEnabled] = useState(false);
  // 地连墙参数（受控）
  const [wallThicknessMm, setWallThicknessMm] = useState<number>(1200);
  const [wallDepthM, setWallDepthM] = useState<number>(25);

  // 统一的内容容器样式，避免被底部操作区遮挡
  const contentContainerStyle: React.CSSProperties = {
    padding: '16px',
    paddingBottom: '96px', // 预留底部空间给固定操作条
    overflow: 'auto'
  };

  // 生成锚杆表格数据
  const generateAnchorTableData = (count: number) => {
    return Array.from({ length: count }, (_, index) => ({
      key: index + 1,
      number: index + 1,
      angle: 15,
      freeLength: 6.0,
      freeSection: 25,
      topDistance: (index + 1) * 2.0, // 默认每根锚杆间隔2米
      freeMaterial: 'HRB400',
      anchorLength: 4.0,
      anchorSection: 32,
      anchorMaterial: 'HRB500',
      prestress: 150
    }));
  };

  const [anchorTableData, setAnchorTableData] = useState(generateAnchorTableData(anchorCount));

  // 当锚杆数量改变时更新表格数据
  React.useEffect(() => {
    setAnchorTableData(generateAnchorTableData(anchorCount));
  }, [anchorCount]);

  // === 基于基坑周长的锚杆布置 ===
  const ensureWallFromExcavation = () => {
    try {
      const eng = (window as any).__CAE_ENGINE__;
      if (!eng) { message.error('引擎未就绪'); return false; }
      if (eng?.hasDiaphragmWall?.()) return true;
      const hasOutline = eng?.hasLastExcavationOutline?.();
      if (!hasOutline) { message.warning('未检测到开挖轮廓，无法生成周边锚杆'); return false; }
      message.info('已使用最近一次开挖轮廓生成地连墙');
      // 直接用默认参数生成地连墙（厚0.8m，深20m）
      eng?.addDiaphragmWall?.([], { thickness: 0.8, depth: 20, rotationAngleDeg: 0 }, { autoFit: true });
      return true;
    } catch { return false; }
  };

  const handleGenerateAnchorsAroundPit = () => {
    const okWall = ensureWallFromExcavation();
    if (!okWall) return;
    try {
      const eng = (window as any).__CAE_ENGINE__;
      // 计算周长以推导沿墙间距
      const segs = eng?.getWallSegmentsMeta?.() || [];
      const perimeter = Array.isArray(segs) ? segs.reduce((s:number, seg:any)=> s + (Number(seg.length)||0), 0) : 0;
      const count = Math.max(1, Number(anchorCount) || 10);
      const spacing = perimeter > 0 ? Math.max(0.5, perimeter / count) : 2.0;
      // 取表第一行做角度/长度等默认值
      const first = anchorTableData[0] || {} as any;
      const params = {
        length: Number(first.anchorLength ?? 8),
        diameter: 0.15,
        pitchDeg: Number(first.angle ?? 10),
        rows: 1,
        startOffset: 1.5,
        rowSpacing: 2.5,
        spacing
      };
      const ok = eng?.addAnchorsOnWall?.(params, { showHead: true, plateSize: 0.4, plateThickness: 0.05, headSize: 0.12 });
      if (ok) {
        message.success(`已沿基坑周边生成锚杆，共约 ${count} 根 (间距≈${spacing.toFixed(2)}m)`);
        try { eng.focusAnchors?.(); eng.setAnchorsHighlight?.(true); setTimeout(()=> eng.setAnchorsHighlight?.(false), 2000); } catch {}
      } else {
        message.warning('生成失败，请确认已存在地连墙');
      }
    } catch (e:any) {
      message.error('生成失败: ' + (e?.message || '未知错误'));
    }
  };

  const handleClearAnchors = () => {
    try { (window as any).__CAE_ENGINE__?.removeAnchors?.(); message.success('已清除锚杆'); } catch {}
  };

  // 表格列配置
  const anchorColumns = [
    {
      title: '编号',
      dataIndex: 'number',
      key: 'number',
      width: 60,
      fixed: 'left' as const,
    },
    {
      title: '距顶部距离(m)',
      dataIndex: 'topDistance',
      key: 'topDistance',
      width: 130,
      render: (value: number, record: any) => (
          <InputNumber
              value={value}
              min={0}
              max={50}
              step={0.1}
              precision={1}
              size="small"
              style={{ width: '100%' }}
              onChange={(newValue) => {
                const newData = [...anchorTableData];
                newData[record.key - 1].topDistance = newValue || 0;
                setAnchorTableData(newData);
              }}
          />
      ),
    },
    {
      title: '角度(°)',
      dataIndex: 'angle',
      key: 'angle',
      width: 100,
      render: (value: number, record: any) => (
        <InputNumber
          value={value}
          min={0}
          max={90}
          step={1}
          size="small"
          style={{ width: '100%' }}
          onChange={(newValue) => {
            const newData = [...anchorTableData];
            newData[record.key - 1].angle = newValue || 0;
            setAnchorTableData(newData);
          }}
        />
      ),
    },
    {
      title: '自由端长度(m)',
      dataIndex: 'freeLength',
      key: 'freeLength',
      width: 120,
      render: (value: number, record: any) => (
        <InputNumber
          value={value}
          min={1}
          max={20}
          step={0.1}
          precision={1}
          size="small"
          style={{ width: '100%' }}
          onChange={(newValue) => {
            const newData = [...anchorTableData];
            newData[record.key - 1].freeLength = newValue || 0;
            setAnchorTableData(newData);
          }}
        />
      ),
    },
    {
      title: '自由端截面(mm)',
      dataIndex: 'freeSection',
      key: 'freeSection',
      width: 130,
      render: (value: number, record: any) => (
        <InputNumber
          value={value}
          min={16}
          max={50}
          step={1}
          size="small"
          style={{ width: '100%' }}
          onChange={(newValue) => {
            const newData = [...anchorTableData];
            newData[record.key - 1].freeSection = newValue || 0;
            setAnchorTableData(newData);
          }}
        />
      ),
    },

    {
      title: '自由端材料',
      dataIndex: 'freeMaterial',
      key: 'freeMaterial',
      width: 120,
      render: (value: string, record: any) => (
        <Select
          value={value}
          size="small"
          style={{ width: '100%' }}
          onChange={(newValue) => {
            const newData = [...anchorTableData];
            newData[record.key - 1].freeMaterial = newValue;
            setAnchorTableData(newData);
          }}
        >
          <Option value="HRB335">HRB335</Option>
          <Option value="HRB400">HRB400</Option>
          <Option value="HRB500">HRB500</Option>
        </Select>
      ),
    },
    {
      title: '锚固端长度(m)',
      dataIndex: 'anchorLength',
      key: 'anchorLength',
      width: 130,
      render: (value: number, record: any) => (
        <InputNumber
          value={value}
          min={1}
          max={15}
          step={0.1}
          precision={1}
          size="small"
          style={{ width: '100%' }}
          onChange={(newValue) => {
            const newData = [...anchorTableData];
            newData[record.key - 1].anchorLength = newValue || 0;
            setAnchorTableData(newData);
          }}
        />
      ),
    },
    {
      title: '锚固端截面(mm)',
      dataIndex: 'anchorSection',
      key: 'anchorSection',
      width: 130,
      render: (value: number, record: any) => (
        <InputNumber
          value={value}
          min={20}
          max={60}
          step={1}
          size="small"
          style={{ width: '100%' }}
          onChange={(newValue) => {
            const newData = [...anchorTableData];
            newData[record.key - 1].anchorSection = newValue || 0;
            setAnchorTableData(newData);
          }}
        />
      ),
    },
    {
      title: '锚固端材料',
      dataIndex: 'anchorMaterial',
      key: 'anchorMaterial',
      width: 120,
      render: (value: string, record: any) => (
        <Select
          value={value}
          size="small"
          style={{ width: '100%' }}
          onChange={(newValue) => {
            const newData = [...anchorTableData];
            newData[record.key - 1].anchorMaterial = newValue;
            setAnchorTableData(newData);
          }}
        >
          <Option value="HRB400">HRB400</Option>
          <Option value="HRB500">HRB500</Option>
          <Option value="HRB600">HRB600</Option>
        </Select>
      ),
    },
    {
      title: '预应力(kN)',
      dataIndex: 'prestress',
      key: 'prestress',
      width: 120,
      render: (value: number, record: any) => (
        <InputNumber
          value={value}
          min={50}
          max={500}
          step={10}
          size="small"
          style={{ width: '100%' }}
          onChange={(newValue) => {
            const newData = [...anchorTableData];
            newData[record.key - 1].prestress = newValue || 0;
            setAnchorTableData(newData);
          }}
        />
      ),
    },
  ];

  // React Hook Form with Zod validation
  const {
  // formState: { errors },
    watch,
  // setValue
  } = useForm<SupportParams>({
    resolver: zodResolver(SupportParamsSchema),
    defaultValues: params,
    mode: 'onChange'
  });

  // Watch form values to sync with parent component
  const watchedValues = watch();
  React.useEffect(() => {
    Object.entries(watchedValues).forEach(([category, categoryValues]) => {
      if (typeof categoryValues === 'object' && categoryValues !== null) {
        Object.entries(categoryValues).forEach(([key, value]) => {
          const cat = params[category as keyof SupportParams] as any;
          if (value !== undefined && cat && value !== cat[key]) {
            onParamsChange(category, key, value);
          }
        });
      }
    });
  }, [watchedValues, onParamsChange, params]);

  // Form submission handler
  // onSubmit / getFieldError 暂未使用，移除以减小噪声

  // 统计函数暂未使用已移除

  // === 地连墙：生成/清除/定位 ===
  const handleGenerateWall = () => {
    try {
      const eng = (window as any).__CAE_ENGINE__;
      if (!eng) { message.error('引擎未就绪'); return; }
      const hasOutline = eng?.hasLastExcavationOutline?.();
      if (!hasOutline) { message.warning('未检测到开挖轮廓，请先完成开挖轮廓导入/生成'); return; }
      const thicknessM = Math.max(0.1, Number(wallThicknessMm || 1200) / 1000);
      const depthM = Math.max(0.5, Number(wallDepthM || 25));
      eng?.addDiaphragmWall?.([], { thickness: thicknessM, depth: depthM, rotationAngleDeg: 0 }, { autoFit: true });
      message.success(`已生成地连墙（厚度 ${thicknessM.toFixed(2)}m，深度 ${depthM.toFixed(1)}m）`);
      try { eng.focusDiaphragmWall?.(); } catch {}
    } catch (e:any) {
      message.error('生成失败: ' + (e?.message || '未知错误'));
    }
  };
  const handleClearWall = () => { try { (window as any).__CAE_ENGINE__?.removeDiaphragmWall?.(); message.success('已清除地连墙'); } catch {} };
  const handleFocusWall = () => { const eng=(window as any).__CAE_ENGINE__; if (eng?.hasDiaphragmWall?.()) eng.focusDiaphragmWall?.(); else message.warning('未检测到地连墙'); };

  return (
    <div className="p-4">
      <Tabs defaultActiveKey="wall_anchor" type="card">
                <TabPane 
          tab={<span><SafetyOutlined /> 墙参数</span>}
          key="wall_anchor"
        >
          <div style={contentContainerStyle}>
            {/* 地连墙参数 */}
            <Card
              title="地连墙参数"
              size="small"
              style={{ marginBottom: '16px', borderRadius: '8px' }}
            >
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Form.Item
                    label="材料"
                  >
                    <Select
                      defaultValue="C30"
                      size="large"
                      style={{ width: '100%' }}
                    >
                      <Option value="C20">C20</Option>
                      <Option value="C25">C25</Option>
                      <Option value="C30">C30</Option>
                      <Option value="C35">C35</Option>
                      <Option value="C40">C40</Option>
                      <Option value="C45">C45</Option>
                      <Option value="C50">C50</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="厚度 (mm)"
                  >
                    <InputNumber
                      value={wallThicknessMm}
                      min={600}
                      max={2000}
                      step={50}
                      size="large"
                      style={{ width: '100%' }}
                      onChange={(v)=> setWallThicknessMm(Number(v)||1200)}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="深度 (m)"
                  >
                    <InputNumber
                      value={wallDepthM}
                      min={5}
                      max={80}
                      step={0.5}
                      size="large"
                      style={{ width: '100%' }}
                      onChange={(v)=> setWallDepthM(Number(v)||25)}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="网格密度"
                  >
                    <Select
                      defaultValue="medium"
                      size="large"
                      style={{ width: '100%' }}
                    >
                      <Option value="coarse">粗糙</Option>
                      <Option value="medium">中等</Option>
                      <Option value="fine">精细</Option>
                      <Option value="very_fine">非常精细</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              <div style={{ display:'flex', gap:8, marginTop:8 }}>
                <Button type="primary" onClick={handleGenerateWall}>生成地连墙</Button>
                <Button onClick={handleClearWall}>清除</Button>
                <Button onClick={handleFocusWall} icon={<AimOutlined />}>定位地连墙</Button>
              </div>
            </Card>

            <Card
              title="摩擦参数"
              size="small"
              style={{ marginBottom: '16px', borderRadius: '8px' }}
            >
              <Row gutter={[16, 16]}>
                <Col span={24}>
                  <Form.Item
                    label="是否考虑摩擦"
                  >
                    <Select
                      defaultValue="yes"
                      size="large"
                      style={{ width: '100%' }}
                    >
                      <Option value="yes">是</Option>
                      <Option value="no">否</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="摩擦系数"
                  >
                    <InputNumber
                      defaultValue={0.35}
                      min={0.1}
                      max={1.0}
                      step={0.05}
                      precision={2}
                      size="large"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="粘聚力 (kPa)"
                  >
                    <InputNumber
                      defaultValue={20}
                      min={0}
                      max={100}
                      step={5}
                      size="large"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            <Divider />


          </div>
        </TabPane>

        <TabPane 
          tab={<span>桩参数</span>}
          key="pile_anchor"
        >
          <div style={contentContainerStyle}>
            {/* 桩参数配置 */}
            <Card
              title="桩参数"
              size="small"
              style={{ marginBottom: '16px', borderRadius: '8px' }}
            >
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Form.Item
                    label="桩类型"
                  >
                    <Select
                      defaultValue="drill_pile"
                                            size="large"
                      style={{ width: '100%' }}
                    >
                      <Option value="drill_pile">钻孔灌注桩</Option>
                      <Option value="precast_pile">预制桩</Option>
                      <Option value="steel_pipe">钢管桩</Option>
                      <Option value="mixing_pile">搅拌桩</Option>
                      <Option value="cast_in_place">现浇桩</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="桩径 (mm)"
                  >
                    <InputNumber
                      min={400}
                      max={2000}
                      defaultValue={800}
                      step={50}
                                            size="large"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="桩长 (m)"
                  >
                    <InputNumber
                      min={10}
                      max={50}
                      defaultValue={25}
                      step={1}
                                            size="large"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="桩距 (m)"
                  >
                    <InputNumber
                      min={1.0}
                      max={5.0}
                      defaultValue={2.5}
                      step={0.1}
                                            size="large"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Card>



            <Card
              title="冠梁参数"
              size="small"
              style={{ marginBottom: '16px', borderRadius: '8px' }}
            >
              <Row gutter={[16, 16]}>
                <Col span={24}>
                  <Form.Item
                      label="混凝土等级"
                  >
                    <Select
                        defaultValue="C30"
                        size="large"
                        style={{ width: '100%' }}
                    >
                      <Option value="C25">C25</Option>
                      <Option value="C30">C30</Option>
                      <Option value="C35">C35</Option>
                      <Option value="C40">C40</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="冠梁宽度 (mm)"
                  >
                    <InputNumber
                      min={800}
                      max={1500}
                      defaultValue={1000}
                      step={50}
                                            size="large"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="冠梁高度 (mm)"
                  >
                    <InputNumber
                      min={600}
                      max={1200}
                      defaultValue={800}
                      step={50}
                                            size="large"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>

              </Row>
            </Card>

            <Card
              title="摩擦参数"
              size="small"
              style={{ marginBottom: '16px', borderRadius: '8px' }}
            >
              <Row gutter={[16, 16]}>
                <Col span={24}>
                  <Form.Item
                    label="是否考虑摩擦"
                  >
                    <Select
                      defaultValue="yes"
                      size="large"
                      style={{ width: '100%' }}
                    >
                      <Option value="yes">是</Option>
                      <Option value="no">否</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="摩擦系数"
                  >
                    <InputNumber
                      defaultValue={0.35}
                      min={0.1}
                      max={1.0}
                      step={0.05}
                      precision={2}
                      size="large"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="粘聚力 (kPa)"
                  >
                    <InputNumber
                      defaultValue={20}
                      min={0}
                      max={100}
                      step={5}
                      size="large"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            <Divider />

          </div>
        </TabPane>

        {/* 锚杆参数标签页 */}
        <TabPane 
          tab={<span><AimOutlined /> 锚杆参数</span>}
          key="anchor"
        >
          {/* 锚杆参数整体滚动容器 */}
          <div style={{ display:'flex', flexDirection:'column', gap:16, maxHeight:'calc(100vh - 240px)', overflowY:'auto', padding:'16px', paddingBottom:64 }}>
            {/* 锚杆参数 */}
            <Card
              title="锚杆参数"
              size="small"
              style={{ marginBottom: '16px', borderRadius: '8px' }}
            >
              <Row gutter={[16, 16]}>
                <Col span={24}>
                  <Form.Item
                    label="锚杆数量"
                  >
                    <InputNumber
                      value={anchorCount}
                      min={1}
                      max={200}
                      step={1}
                      size="large"
                      style={{ width: '100%' }}
                      onChange={(value) => setAnchorCount(value || 10)}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            {/* 锚杆详细参数表格 */}
            <Card
              title="锚杆详细参数"
              size="small"
              style={{ marginBottom: '16px', borderRadius: '8px' }}
              bodyStyle={{ padding:12 }}
            >
              <Table
                dataSource={anchorTableData}
                columns={anchorColumns}
                pagination={false}
                size="small"
                scroll={{ x: 1200 }}
                rowKey="key"
                sticky
              />
            </Card>

            <div style={{ display:'flex', gap:12 }}>
              <Button type="primary" onClick={handleGenerateAnchorsAroundPit}>沿基坑周边生成锚杆</Button>
              <Button onClick={handleClearAnchors}>清除锚杆</Button>
            </div>



            {/* 腰梁参数 */}
            <Card
              title={
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <Checkbox 
                    checked={beamEnabled}
                    onChange={(e) => setBeamEnabled(e.target.checked)}
                    style={{ marginRight: '8px' }}
                  />
                  <span>腰梁参数</span>
                </div>
              }
              size="small"
              style={{ 
                marginBottom: '8px', 
                borderRadius: '8px',
                opacity: beamEnabled ? 1 : 0.6
              }}
            >
              <Row gutter={[8, 8]}>
                <Col span={24}>
                  <Form.Item
                      label="钢材材料"
                  >
                    <Select
                        defaultValue="Q235"
                        size="large"
                        disabled={!beamEnabled}
                        style={{ width: '100%' }}
                    >
                      <Option value="Q235">Q235</Option>
                      <Option value="Q345">Q345</Option>
                      <Option value="Q390">Q390</Option>
                      <Option value="Q420">Q420</Option>
                      <Option value="Q460">Q460</Option>
                      <Option value="Q500">Q500</Option>
                      <Option value="Q550">Q550</Option>
                      <Option value="Q620">Q620</Option>
                      <Option value="Q690">Q690</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Form.Item
                    label="腰梁截面宽度(mm)"
                  >
                    <InputNumber
                      defaultValue={300}
                      min={200}
                      max={600}
                      step={10}
                      size="large"
                      disabled={!beamEnabled}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Form.Item
                    label="腰梁截面高度(mm)"
                  >
                    <InputNumber
                      defaultValue={400}
                      min={300}
                      max={800}
                      step={10}
                      size="large"
                      disabled={!beamEnabled}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>

              </Row>
            </Card>

            <Divider />

            <div style={{height:4}} />
          </div>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default SupportModule;