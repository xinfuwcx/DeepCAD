import React, { useState } from 'react';
import { Box, Typography, Paper, Stack, Tooltip, IconButton, Divider } from '@mui/material';

// Import icons for the toolbar
import TerrainIcon from '@mui/icons-material/Terrain';
import GavelIcon from '@mui/icons-material/Gavel';
import LooksOneIcon from '@mui/icons-material/LooksOne';

// Import creator components
import GeologicalModelCreator from '../creators/GeologicalModelCreator';
import ExcavationCreator from '../creators/ExcavationCreator';
import DiaphragmWallCreator from '../creators/DiaphragmWallCreator';
import PropertyPanel from './PropertyPanel';
import { AnyFeature } from '../../services/parametricAnalysisService';

type CreatorType = AnyFeature['type'] | 'CreateGeologicalModel' | 'CreateDiaphragmWall' | null;

const TaskPanel: React.FC = () => {
    const [activeCreator, setActiveCreator] = useState<CreatorType>(null);

    const renderCreator = () => {
        switch (activeCreator) {
            case 'CreateGeologicalModel':
                return <GeologicalModelCreator />;
            case 'CreateExcavation':
                return <ExcavationCreator />;
            case 'CreateDiaphragmWall':
                return <DiaphragmWallCreator />;
            default:
                return (
                    <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
                        <Typography>请从上方工具栏选择一项任务开始建模。</Typography>
                    </Box>
                );
        }
    };

    return (
        <Stack spacing={2} sx={{ p: 2, height: '100%'}}>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>建模工具</Typography>
            
            <Paper elevation={1} sx={{ p: 1, bgcolor: 'rgba(255,255,255,0.05)' }}>
                <Stack direction="row" spacing={1} justifyContent="center">
                    <Tooltip title="创建地质模型">
                        <IconButton onClick={() => setActiveCreator('CreateGeologicalModel')} color={activeCreator === 'CreateGeologicalModel' ? 'primary' : 'default'}>
                            <TerrainIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="创建开挖">
                        <IconButton onClick={() => setActiveCreator('CreateExcavation')} color={activeCreator === 'CreateExcavation' ? 'primary' : 'default'}>
                            <GavelIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="创建地连墙">
                        <IconButton onClick={() => setActiveCreator('CreateDiaphragmWall')} color={activeCreator === 'CreateDiaphragmWall' ? 'primary' : 'default'}>
                            <LooksOneIcon />
                        </IconButton>
                    </Tooltip>
                </Stack>
            </Paper>

            <Divider flexItem sx={{ borderColor: 'rgba(255,255,255,0.2)' }} />

            <Box>
                {renderCreator()}
            </Box>
            
            <Divider flexItem sx={{ my: 2, borderColor: 'rgba(255,255,255,0.2)' }} />
            
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>属性编辑器</Typography>
            <PropertyPanel />
        </Stack>
    );
};

export default TaskPanel; 