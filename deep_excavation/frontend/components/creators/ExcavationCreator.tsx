/**
 * 基坑创建器组件
 * 集成专业配色方案和现代化UI设计
 * @author Deep Excavation Team
 * @date 2025-01-27
 */

import React, { useState, useRef } from 'react';
import { useStore } from '../../core/store';
import { v4 as uuidv4 } from 'uuid';
import {
    Box,
    Button,
    Typography,
    Stack,
    TextField,
    Paper,
    Grid,
    Divider,
    InputAdornment,
    FormLabel,
    LinearProgress,
    Tabs,
    Tab,
    Alert,
} from '@mui/material';
import ConstructionIcon from '@mui/icons-material/Construction';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { CreateExcavationFeature, CreateExcavationFromDXFFeature, Point2D } from '../../services/parametricAnalysisService';

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

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`excavation-tabpanel-${index}`}
            aria-labelledby={`excavation-tab-${index}`}
            style={{ paddingTop: '16px' }}
            {...other}
        >
            {value === index && <Box>{children}</Box>}
        </div>
    );
}

// A 2D schematic preview for the excavation
const Excavation2DPreview: React.FC<{ params: ExcavationParams }> = ({ params }) => {
    const { depth, planLengthX, planLengthY } = params;

    const containerSize = 240;
    const scale = containerSize / Math.max(planLengthX, planLengthY, 1);

    const planWidth = planLengthX * scale;
    const planHeight = planLengthY * scale;

    return (
        <Stack spacing={2} sx={{ width: '100%', alignItems: 'center', p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
            <Box>
                <Typography variant="caption" display="block" align="center">平面图</Typography>
                <Box sx={{
                    width: containerSize,
                    height: containerSize,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px dashed #aaa',
                    bgcolor: 'grey.200',
                    mt: 1,
                }}>
                    <Box sx={{
                        width: planWidth,
                        height: planHeight,
                        bgcolor: '#ffcdd2',
                        border: '2px solid #e57373',
                        position: 'relative',
                    }}>
                        <Typography variant="caption" sx={{ position: 'absolute', top: -20, left: 0, width: '100%', textAlign: 'center' }}>{planLengthX}m</Typography>
                        <Typography variant="caption" sx={{ position: 'absolute', top: '50%', right: -30, transform: 'translateY(-50%)' }}>{planLengthY}m</Typography>
                    </Box>
                </Box>
            </Box>
            <Divider sx={{ width: '80%' }} />
            <Box sx={{ width: '100%', alignItems: 'center', display: 'flex', flexDirection: 'column' }}>
                <Typography variant="caption" display="block" align="center">剖面图</Typography>
                <Box sx={{
                    width: containerSize,
                    height: 100,
                    border: '1px solid #ddd',
                    bgcolor: '#efebe9',
                    position: 'relative',
                    mt: 1,
                }}>
                    <Box sx={{
                        position: 'absolute',
                        bottom: 0,
                        left: '10%',
                        width: '80%',
                        height: (depth / 10) * 80, // Scale depth against max expected depth (e.g. 10m)
                        maxHeight: '100%',
                        bgcolor: '#d7ccc8',
                        borderTop: '2px solid #8d6e63',
                    }} />
                    <Typography variant="caption" sx={{ position: 'absolute', top: 5, right: 5 }}>地面</Typography>
                    <Typography variant="caption" sx={{ position: 'absolute', bottom: 5, right: 5 }}>深度: {depth}m</Typography>
                </Box>
            </Box>
        </Stack>
    );
};

const ExcavationCreator: React.FC = () => {
    const addFeature = useStore(state => state.addFeature);
    const [params, setParams] = useState<ExcavationParams>({
        name: '第一步开挖',
        depth: 5,
        planLengthX: 50,
        planLengthY: 30,
    });
    const [dxfFile, setDxfFile] = useState<File | null>(null);
    const [dxfExcavationDepth, setDxfExcavationDepth] = useState<number>(5);
    const [isCreating, setIsCreating] = useState(false);
    const [activeTab, setActiveTab] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [error, setError] = useState<string | null>(null);

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setActiveTab(newValue);
    };

    const handleParamChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.target;
        setParams(p => ({ ...p, [name]: name === 'name' ? value : Number(value) }));
    };
    
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            setDxfFile(event.target.files[0]);
        }
    };
    
    const handleCreateFromParams = () => {
        const { depth, planLengthX, planLengthY, name } = params;

        const newFeature: CreateExcavationFeature = {
            id: uuidv4(),
            name,
            type: 'CreateExcavation',
            parameters: {
                depth: depth,
                length: planLengthX,
                width: planLengthY,
                position: [0, -depth / 2, 0],
            },
        };

        addFeature(newFeature);
        setIsCreating(true);
        setTimeout(() => {
            setIsCreating(false);
             setParams(p => ({...p, name: `开挖至 ${p.depth + 5}m` , depth: p.depth + 5}))
        }, 1500);
    };

    const handleCreateFromDxf = async () => {
        if (!dxfFile) return;

        setIsCreating(true);
        setError(null);
        
        const formData = new FormData();
        formData.append("file", dxfFile);

        try {
            const response = await fetch('/api/geology/upload-dxf', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || 'DXF file processing failed.');
            }

            const result = await response.json();
            const vertices2D: Point2D[] = result.vertices.map((v: number[]) => ({ x: v[0], y: v[1] }));

            const newFeature: CreateExcavationFromDXFFeature = {
                id: uuidv4(),
                name: `基坑 (来自 ${dxfFile.name})`,
                type: 'CreateExcavationFromDXF',
                parameters: {
                    points: vertices2D,
                    depth: dxfExcavationDepth,
                },
            };
            addFeature(newFeature);
            
        } catch (err: any) {
            console.error(err);
            setError(err.message);
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ConstructionIcon />
                基坑开挖创建器
            </Typography>
            <Divider sx={{ my: 1 }} />
            
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={activeTab} onChange={handleTabChange} aria-label="Excavation creation tabs">
                    <Tab label="快速创建" id="excavation-tab-0" />
                    <Tab label="从DXF导入" id="excavation-tab-1" />
                </Tabs>
            </Box>

            <TabPanel value={activeTab} index={0}>
                <Grid container spacing={4}>
                    <Grid item xs={12} md={6}>
                        <Stack spacing={3}>
                            <TextField
                                label="开挖步骤名称"
                                name="name"
                                value={params.name}
                                onChange={handleParamChange}
                                fullWidth
                                size="small"
                            />
                            
                            <Box>
                                <FormLabel>开挖参数</FormLabel>
                                 <Stack spacing={2} sx={{ mt: 1, p: 2, border: '1px solid #eee', borderRadius: 1 }}>
                                    <TextField
                                        label="开挖深度"
                                        name="depth"
                                        type="number"
                                        value={params.depth}
                                        onChange={handleParamChange}
                                        size="small"
                                        InputProps={{ endAdornment: <InputAdornment position="end">m</InputAdornment> }}
                                    />
                                    <TextField
                                        label="X方向长度"
                                        name="planLengthX"
                                        type="number"
                                        value={params.planLengthX}
                                        onChange={handleParamChange}
                                        size="small"
                                        helperText="与围护结构尺寸保持一致"
                                        InputProps={{ endAdornment: <InputAdornment position="end">m</InputAdornment> }}
                                    />
                                    <TextField
                                        label="Y方向长度"
                                        name="planLengthY"
                                        type="number"
                                        value={params.planLengthY}
                                        onChange={handleParamChange}
                                        size="small"
                                        helperText="与围护结构尺寸保持一致"
                                        InputProps={{ endAdornment: <InputAdornment position="end">m</InputAdornment> }}
                                    />
                                </Stack>
                            </Box>

                            <Box sx={{ pt: 2 }}>
                                <Button variant="contained" color="primary" onClick={handleCreateFromParams} disabled={isCreating} fullWidth>
                                    {isCreating ? '执行开挖...' : '创建开挖步骤'}
                                </Button>
                                {isCreating && <LinearProgress sx={{ mt: 1 }} />}
                            </Box>
                        </Stack>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Stack spacing={1}>
                             <FormLabel>二维示意图</FormLabel>
                            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 320 }}>
                                <Excavation2DPreview params={params} />
                            </Box>
                        </Stack>
                    </Grid>
                </Grid>
            </TabPanel>

            <TabPanel value={activeTab} index={1}>
                <Stack spacing={2}>
                    <Alert severity="info">从DXF文件导入闭合的多段线作为基坑开挖边界。</Alert>
                    {error && <Alert severity="error">{error}</Alert>}
                    <Button
                        variant="outlined"
                        component="label"
                        startIcon={<UploadFileIcon />}
                    >
                        上传DXF文件
                        <input
                            type="file"
                            hidden
                            accept=".dxf"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                        />
                    </Button>
                    {dxfFile && <Typography>已选择: {dxfFile.name}</Typography>}
                    <TextField 
                        label="开挖深度 (m)" 
                        type="number" 
                        size="small" 
                        value={dxfExcavationDepth}
                        onChange={(e) => setDxfExcavationDepth(Number(e.target.value))}
                        InputProps={{ endAdornment: <InputAdornment position="end">m</InputAdornment> }}
                    />
                    <Box sx={{ pt: 2 }}>
                        <Button 
                            variant="contained" 
                            color="primary" 
                            onClick={handleCreateFromDxf} 
                            disabled={isCreating || !dxfFile} 
                            fullWidth
                        >
                            {isCreating ? '创建中...' : '从DXF创建基坑'}
                        </Button>
                        {isCreating && <LinearProgress sx={{ mt: 1 }} />}
                    </Box>
                </Stack>
            </TabPanel>
        </Paper>
    );
};

export default ExcavationCreator; 