import React, { useState } from 'react';
import { Box, Typography, Paper, Stack, Tooltip, IconButton, Divider } from '@mui/material';

// Import icons for the toolbar
import TerrainIcon from '@mui/icons-material/Terrain';
import GavelIcon from '@mui/icons-material/Gavel';
import LooksOneIcon from '@mui/icons-material/LooksOne';
import AnchorIcon from '@mui/icons-material/Anchor';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import SubwayIcon from '@mui/icons-material/Subway';
import ApartmentIcon from '@mui/icons-material/Apartment';

// Import creator components
import GeologicalModelCreator from '../creators/GeologicalModelCreator';
import ExcavationCreator from '../creators/ExcavationCreator';
import DiaphragmWallCreator from '../creators/DiaphragmWallCreator';
import AnchorCreator from '../creators/AnchorCreator';
import PileRaftCreator from '../creators/PileRaftCreator';
import TunnelCreator from '../creators/TunnelCreator';
import BuildingCreator from '../creators/BuildingCreator';
import PropertyPanel from './PropertyPanel';
import { AnyFeature } from '../../services/parametricAnalysisService';

type CreatorType = AnyFeature['type'] | 'CreateGeologicalModel' | 'CreateDiaphragmWall' | 'CreateAnchor' | 'CreatePileRaft' | 'CreateTunnel' | 'CreateBuilding' | null;

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
            case 'CreateAnchor':
                return <AnchorCreator />;
            case 'CreatePileRaft':
                return <PileRaftCreator />;
            case 'CreateTunnel':
                return <TunnelCreator />;
            case 'CreateBuilding':
                return <BuildingCreator />;
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
                <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap">
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
                    <Tooltip title="创建锚杆">
                        <IconButton onClick={() => setActiveCreator('CreateAnchor')} color={activeCreator === 'CreateAnchor' ? 'primary' : 'default'}>
                            <AnchorIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="创建桩筏">
                        <IconButton onClick={() => setActiveCreator('CreatePileRaft')} color={activeCreator === 'CreatePileRaft' ? 'primary' : 'default'}>
                            <ViewInArIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="创建隧道">
                        <IconButton onClick={() => setActiveCreator('CreateTunnel')} color={activeCreator === 'CreateTunnel' ? 'primary' : 'default'}>
                            <SubwayIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="创建建筑">
                        <IconButton onClick={() => setActiveCreator('CreateBuilding')} color={activeCreator === 'CreateBuilding' ? 'primary' : 'default'}>
                            <ApartmentIcon />
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