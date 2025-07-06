/**
 * 基坑创建器组件 - 上中下布局重构版
 * @description 严格遵循上部参数、中部示意图、下部按钮的垂直布局。
 * @author Deep Excavation Team
 * @date 2025-01-28
 */
import React, { useState, useRef } from 'react';
import {
    Box, Button, Typography, Stack, TextField, Paper, Divider, InputAdornment, FormLabel, LinearProgress, Tabs, Tab, Alert
} from '@mui/material';
import ConstructionIcon from '@mui/icons-material/Construction';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { v4 as uuidv4 } from 'uuid';
import { useStore } from '../../core/store';
import { CreateExcavationFeature, CreateExcavationFromDXFFeature, Point2D } from '../../services/parametricAnalysisService';

// --- 类型定义 ---
interface ExcavationParams {
    name: string;
    depth: number;
    planLengthX: number;
    planLengthY: number;
}
interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

// --- 辅助组件 ---
function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;
    return <div role="tabpanel" hidden={value !== index} {...other}><Box sx={{ pt: 2 }}>{children}</Box></div>;
}

const Excavation2DPreview: React.FC<{ params: ExcavationParams }> = ({ params }) => {
    const { depth, planLengthX, planLengthY } = params;
    const containerSize = 200;
    const scale = containerSize / Math.max(planLengthX, planLengthY, 1);
    const planWidth = planLengthX * scale * 0.9;
    const planHeight = planLengthY * scale * 0.9;

    return (
        <Stack spacing={1} sx={{ width: '100%', alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary">二维示意图</Typography>
            <Paper variant="outlined" sx={{ p: 1, bgcolor: 'rgba(0,0,0,0.1)', width: '100%', display: 'flex', gap: 2, justifyContent: 'space-around' }}>
                <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" display="block" align="center">平面</Typography>
                    <Box sx={{ height: 120, border: '1px dashed grey', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', mt: 0.5 }}>
                        <Box sx={{ width: planWidth, height: planHeight, bgcolor: 'rgba(0,150,255,0.3)', border: '1px solid #0096FF' }} />
                        <Typography variant="caption" sx={{ position: 'absolute', bottom: -18, color: 'text.secondary' }}>{planLengthX}m</Typography>
                        <Typography variant="caption" sx={{ position: 'absolute', right: -25, top: '50%', transform: 'translateY(-50%) rotate(90deg)', color: 'text.secondary' }}>{planLengthY}m</Typography>
                    </Box>
                </Box>
                <Box sx={{ flex: 1 }}>
                     <Typography variant="caption" display="block" align="center">剖面</Typography>
                     <Box sx={{ height: 120, border: '1px solid grey', bgcolor: 'rgba(100,80,70,0.2)', position: 'relative', mt: 0.5 }}>
                        <Box sx={{ position: 'absolute', bottom: 0, left: '10%', width: '80%', height: `${Math.min((depth / 20) * 100, 100)}%`, bgcolor: 'rgba(125,107,100,0.5)', borderTop: '2px solid #8D6E63' }} />
                        <Typography variant="caption" sx={{ position: 'absolute', top: 2, right: 2, color: 'text.secondary' }}>地面</Typography>
                        <Typography variant="caption" sx={{ position: 'absolute', bottom: 2, right: 2, color: 'text.secondary' }}>{depth}m</Typography>
                    </Box>
                </Box>
            </Paper>
        </Stack>
    );
};


// --- 主组件 ---
const ExcavationCreator: React.FC = () => {
    const addFeature = useStore(state => state.addFeature);
    const [params, setParams] = useState<ExcavationParams>({ name: '第一步开挖', depth: 5, planLengthX: 50, planLengthY: 30 });
    const [dxfFile, setDxfFile] = useState<File | null>(null);
    const [dxfExcavationDepth, setDxfExcavationDepth] = useState<number>(5);
    const [isCreating, setIsCreating] = useState(false);
    const [activeTab, setActiveTab] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [error, setError] = useState<string | null>(null);

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => setActiveTab(newValue);
    const handleParamChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.target;
        setParams(p => ({ ...p, [name]: name === 'name' ? value : Number(value) }));
    };
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            setDxfFile(event.target.files[0]);
            setError(null);
        }
    };

    const handleCreateFromParams = () => {
        const { depth, planLengthX, planLengthY, name } = params;
        const newFeature: CreateExcavationFeature = {
            id: uuidv4(), name, type: 'CreateExcavation',
            parameters: { depth, length: planLengthX, width: planLengthY, position: [0, -depth / 2, 0] },
        };
        addFeature(newFeature);
        setIsCreating(true);
        setTimeout(() => {
            setIsCreating(false);
            setParams(p => ({ ...p, name: `开挖至 ${p.depth + 5}m`, depth: p.depth + 5 }));
        }, 1500);
    };

    const handleCreateFromDxf = async () => {
        if (!dxfFile) return;
        setIsCreating(true);
        setError(null);
        const formData = new FormData();
        formData.append("file", dxfFile);
        try {
            const response = await fetch('/api/geometry/upload-dxf-for-excavation', { method: 'POST', body: formData });
            if (!response.ok) throw new Error((await response.json()).detail || 'DXF文件处理失败');
            const result = await response.json();
            const vertices2D: Point2D[] = result.vertices.map((v: number[]) => ({ x: v[0], y: v[1] }));
            const newFeature: CreateExcavationFromDXFFeature = {
                id: uuidv4(), name: `基坑 (来自 ${dxfFile.name})`, type: 'CreateExcavationFromDXF',
                parameters: { points: vertices2D, depth: dxfExcavationDepth },
            };
            addFeature(newFeature);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <Box sx={{ p: 1, height: '100%' }}>
            <Paper elevation={0} sx={{ p: 2, pb: 0, bgcolor: 'transparent' }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><ConstructionIcon />基坑开挖</Typography>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs value={activeTab} onChange={handleTabChange} variant="fullWidth">
                        <Tab label="参数化创建" /><Tab label="从DXF导入" />
                    </Tabs>
                </Box>
            </Paper>

            {/* --- 参数化创建 Tab --- */}
            <TabPanel value={activeTab} index={0}>
                <Stack spacing={3}>
                    {/* 上：参数输入 */}
                    <Paper variant="outlined" sx={{ p: 2 }}>
                        <Stack spacing={2}>
                            <TextField label="开挖步骤名称" name="name" value={params.name} onChange={handleParamChange} fullWidth size="small" />
                            <TextField label="开挖深度" name="depth" type="number" value={params.depth} onChange={handleParamChange} size="small" InputProps={{ endAdornment: <InputAdornment position="end">m</InputAdornment> }} />
                            <Divider>矩形尺寸</Divider>
                            <TextField label="平面长度 (X)" name="planLengthX" type="number" value={params.planLengthX} onChange={handleParamChange} size="small" InputProps={{ endAdornment: <InputAdornment position="end">m</InputAdornment> }} />
                            <TextField label="平面宽度 (Y)" name="planLengthY" type="number" value={params.planLengthY} onChange={handleParamChange} size="small" InputProps={{ endAdornment: <InputAdornment position="end">m</InputAdornment> }} />
                        </Stack>
                    </Paper>
                    {/* 中：示意图 */}
                    <Excavation2DPreview params={params} />
                    {/* 下：操作按钮 */}
                    <Box>
                        <Button variant="contained" color="primary" onClick={handleCreateFromParams} disabled={isCreating} fullWidth>
                            {isCreating ? '正在创建...' : '应用开挖'}
                        </Button>
                        {isCreating && <LinearProgress sx={{ mt: 1 }} />}
                    </Box>
                </Stack>
            </TabPanel>

            {/* --- DXF导入 Tab --- */}
            <TabPanel value={activeTab} index={1}>
                 <Stack spacing={3}>
                    {/* 上：参数输入 */}
                    <Paper variant="outlined" sx={{ p: 2 }}>
                        <Stack spacing={2}>
                            <Typography variant="body2">从DXF文件导入基坑的平面轮廓线 (需为闭合的 `LWPOLYLINE`)。</Typography>
                            <TextField label="开挖深度" type="number" value={dxfExcavationDepth} onChange={(e) => setDxfExcavationDepth(Number(e.target.value))} size="small" InputProps={{ endAdornment: <InputAdornment position="end">m</InputAdornment> }} />
                            <Button variant="outlined" component="label" startIcon={<UploadFileIcon />}>
                                选择DXF文件 <input type="file" hidden accept=".dxf" ref={fileInputRef} onChange={handleFileChange} />
                            </Button>
                            {dxfFile && <Typography variant="caption">已选择: {dxfFile.name}</Typography>}
                        </Stack>
                    </Paper>
                    {/* 中：示意图 (占位) */}
                    <Paper variant="outlined" sx={{ p: 1, bgcolor: 'rgba(0,0,0,0.1)', height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Typography variant="caption" color="text.secondary" align="center">
                            导入后将在主视口中显示基坑轮廓
                        </Typography>
                    </Paper>
                    {/* 下：操作按钮 */}
                    <Box>
                        <Button variant="contained" color="primary" onClick={handleCreateFromDxf} disabled={!dxfFile || isCreating} fullWidth>
                            {isCreating ? '正在导入...' : '从DXF创建'}
                        </Button>
                        {isCreating && <LinearProgress sx={{ mt: 1 }} />}
                        {error && <Alert severity="error" sx={{mt: 2}}>{error}</Alert>}
                    </Box>
                </Stack>
            </TabPanel>
        </Box>
    );
};

export default ExcavationCreator; 