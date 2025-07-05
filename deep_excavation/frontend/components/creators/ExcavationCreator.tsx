import React, { useState, useMemo } from 'react';
import { useStore } from '../../core/store';
import { CreateExcavationFeature, Point2D } from '../../services/parametricAnalysisService';
import { v4 as uuidv4 } from 'uuid';
import {
    Box,
    TextField,
    Button,
    Typography,
    Stack,
    Alert
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

const ExcavationCreator: React.FC = () => {
    const [pointsText, setPointsText] = useState('10,10\n90,10\n90,90\n10,90');
    const [depth, setDepth] = useState(15);
    const addFeature = useStore(state => state.addFeature);
    const features = useStore(state => state.features);

    const parsedPoints = useMemo((): Point2D[] => {
        return pointsText.split('\n')
            .map(line => {
                const parts = line.split(',').map(s => parseFloat(s.trim()));
                return parts.length === 2 && !parts.some(isNaN) ? { x: parts[0], y: parts[1] } : null;
            })
            .filter((p): p is Point2D => p !== null);
    }, [pointsText]);

    const handleCreateExcavation = () => {
        if (parsedPoints.length < 3) {
            alert("请输入至少三个有效的二维坐标点 (格式: x,y) 来定义基坑轮廓。");
            return;
        }

        // Find the latest geological model feature to serve as the parent.
        const parentFeature = features.slice().reverse().find(f => f.type === 'CreateGeologicalModel');

        if (!parentFeature) {
            alert("请先创建一个地质模型，然后再进行开挖。");
            return;
        }

        const newFeature: CreateExcavationFeature = {
            id: uuidv4(),
            name: `开挖 (深度: ${depth}m)`,
            type: 'CreateExcavation',
            parentId: parentFeature.id,
            parameters: {
                points: parsedPoints,
                depth: depth,
            },
        };

        addFeature(newFeature);
    };

    return (
        <Box className="fade-in-up">
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium' }}>
                创建开挖
            </Typography>
            <Stack spacing={2}>
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
                <TextField
                    label="开挖深度 (m)"
                    type="number"
                    value={depth}
                    onChange={e => setDepth(parseFloat(e.target.value) || 0)}
                    variant="outlined"
                />
                <Button
                    variant="contained"
                    color="primary"
                    onClick={handleCreateExcavation}
                    startIcon={<AddIcon />}
                >
                    创建开挖特征
                </Button>
            </Stack>
        </Box>
    );
};

export default ExcavationCreator; 