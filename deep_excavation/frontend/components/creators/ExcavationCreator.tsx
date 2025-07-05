import React, { useState, useMemo } from 'react';
import { useStore } from '../../core/store';
import { 
    CreateExcavationFeature, 
    CreateExcavationFromDXFFeature, 
    Point2D 
} from '../../services/parametricAnalysisService';
import { v4 as uuidv4 } from 'uuid';
import {
    Box,
    TextField,
    Button,
    Typography,
    Stack,
    Alert,
    ToggleButtonGroup,
    ToggleButton,
    Divider
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import UploadFileIcon from '@mui/icons-material/UploadFile';

type Mode = 'manual' | 'dxf';

const ExcavationCreator: React.FC = () => {
    const [mode, setMode] = useState<Mode>('manual');
    const [pointsText, setPointsText] = useState('10,10\n90,10\n90,90\n10,90');
    const [depth, setDepth] = useState(15);
    const [dxfContent, setDxfContent] = useState<string | null>(null);
    const [dxfFileName, setDxfFileName] = useState<string>('');
    const [layerName, setLayerName] = useState('EXCAVATION_OUTLINE');

    const addFeature = useStore(state => state.addFeature);

    const handleModeChange = (
        event: React.MouseEvent<HTMLElement>,
        newMode: Mode | null,
    ) => {
        if (newMode !== null) {
            setMode(newMode);
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                setDxfContent(e.target?.result as string);
                setDxfFileName(file.name);
            };
            reader.readAsText(file);
        }
    };

    const parsedPoints = useMemo((): Point2D[] => {
        if (mode !== 'manual') return [];
        return pointsText.split('\n')
            .map(line => {
                const parts = line.split(',').map(s => parseFloat(s.trim()));
                return parts.length === 2 && !parts.some(isNaN) ? { x: parts[0], y: parts[1] } : null;
            })
            .filter((p): p is Point2D => p !== null);
    }, [pointsText, mode]);

    const handleCreate = () => {
        if (mode === 'manual') {
            if (parsedPoints.length < 3) {
                alert("请输入至少三个有效的二维坐标点。");
                return;
            }
            const newFeature: CreateExcavationFeature = {
                id: uuidv4(),
                name: `手动开挖 (深度: ${depth}m)`,
                type: 'CreateExcavation',
                parameters: { points: parsedPoints, depth },
            };
            addFeature(newFeature);
        } else { // DXF mode
            if (!dxfContent) {
                alert("请先上传一个DXF文件。");
                return;
            }
            const newFeature: CreateExcavationFromDXFFeature = {
                id: uuidv4(),
                name: `DXF开挖 (${dxfFileName})`,
                type: 'CreateExcavationFromDXF',
                parameters: {
                    dxfFileContent: dxfContent,
                    layerName: layerName,
                    depth: depth,
                },
            };
            addFeature(newFeature);
        }
    };

    return (
        <Stack spacing={2}>
            <Typography variant="h6" gutterBottom>创建开挖</Typography>
            <ToggleButtonGroup
                value={mode}
                exclusive
                onChange={handleModeChange}
                aria-label="创建模式"
                fullWidth
            >
                <ToggleButton value="manual" aria-label="手动输入">
                    手动输入坐标
                </ToggleButton>
                <ToggleButton value="dxf" aria-label="dxf导入">
                    从DXF导入
                </ToggleButton>
            </ToggleButtonGroup>

            <Divider />

            {mode === 'manual' && (
                <Stack spacing={2} className="fade-in">
                    <Alert severity="info" variant="outlined">
                        在下方文本框中输入基坑的平面坐标点 (X,Y)。每行一个点，用逗号分隔。
                    </Alert>
                    <TextField
                        label="轮廓点 (X,Y)"
                        multiline
                        rows={4}
                        value={pointsText}
                        onChange={e => setPointsText(e.target.value)}
                        variant="outlined"
                        placeholder="e.g.&#10;0,0&#10;100,0&#10;100,100&#10;0,100"
                    />
                </Stack>
            )}

            {mode === 'dxf' && (
                <Stack spacing={2} className="fade-in">
                    <Alert severity="info" variant="outlined">
                        上传包含闭合多段线 (LWPOLYLINE) 的DXF文件，并指定其所在的图层名称。
                    </Alert>
                    <Button
                        variant="outlined"
                        component="label"
                        startIcon={<UploadFileIcon />}
                    >
                        {dxfFileName || "上传DXF文件"}
                        <input
                            type="file"
                            hidden
                            onChange={handleFileChange}
                            accept=".dxf"
                        />
                    </Button>
                    <TextField
                        label="轮廓所在图层"
                        value={layerName}
                        onChange={e => setLayerName(e.target.value)}
                        variant="outlined"
                    />
                </Stack>
            )}
            
            <TextField
                label="开挖深度 (m)"
                type="number"
                value={depth}
                onChange={e => setDepth(parseFloat(e.target.value) || 0)}
                variant="outlined"
                sx={{ mt: 2 }}
            />

            <Box sx={{ pt: 2 }}>
                <Button onClick={handleCreate} variant="contained" startIcon={<AddIcon />}>
                    创建开挖特征
                </Button>
            </Box>
        </Stack>
    );
};

export default ExcavationCreator; 