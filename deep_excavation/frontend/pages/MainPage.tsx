import React, { useState } from 'react';
import { 
  Box, 
  AppBar, 
  Toolbar, 
  Typography, 
  IconButton, 
  Drawer, 
  Button,
  Tooltip,
  Badge,
  Paper,
  Stack,
  Divider
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ModelIcon from '@mui/icons-material/Architecture';
import AnalysisIcon from '@mui/icons-material/Science';
import ResultsIcon from '@mui/icons-material/Assessment';
import SettingsIcon from '@mui/icons-material/Settings';
import HelpIcon from '@mui/icons-material/Help';
import NotificationsIcon from '@mui/icons-material/Notifications';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import SaveIcon from '@mui/icons-material/Save';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import TerrainIcon from '@mui/icons-material/Terrain';
import GavelIcon from '@mui/icons-material/Gavel';
import LooksOneIcon from '@mui/icons-material/LooksOne';

import { useStore } from '../core/store';
import { AnyFeature } from '../services/parametricAnalysisService';

import Viewport from '../components/viewport/Viewport';
import HistoryTree from '../components/layout/HistoryTree';
import PropertyPanel from '../components/layout/PropertyPanel';
import AnalysisPanel from '../components/layout/AnalysisPanel'; 
import MeshSettingsModal from '../components/modals/MeshSettingsModal';
import GeologicalModelCreator from '../components/creators/GeologicalModelCreator';
import ExcavationCreator from '../components/creators/ExcavationCreator';
import DiaphragmWallCreator from '../components/creators/DiaphragmWallCreator';
import VtkResultsViewer from '../components/VtkResultsViewer';

const DRAWER_WIDTH = 320;

type CreatorType = AnyFeature['type'] | null;

const MainPage: React.FC = () => {
    const [leftDrawerOpen, setLeftDrawerOpen] = useState(true);
    const [rightDrawerOpen, setRightDrawerOpen] = useState(true);
    const [activeCreator, setActiveCreator] = useState<CreatorType>(null);
    
    const activeWorkbench = useStore(state => state.activeWorkbench);
    const setActiveWorkbench = useStore(state => state.setActiveWorkbench);
    const activeModal = useStore(state => state.activeModal);
    const closeModal = useStore(state => state.closeModal);
    
    const toggleLeftDrawer = () => setLeftDrawerOpen(!leftDrawerOpen);
    const toggleRightDrawer = () => setRightDrawerOpen(!rightDrawerOpen);

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

    const ModelingTools = () => (
      <Stack spacing={2} sx={{ p: 2, height: '100%', overflowY: 'auto' }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>建模工具</Typography>
        
        <Paper elevation={1} sx={{p: 1}}>
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

        <Divider />

        <Box>
          {renderCreator()}
        </Box>
        
        <Divider sx={{ my: 2 }} />
        
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>属性编辑器</Typography>
        <PropertyPanel />
      </Stack>
    );

    const renderRightPanel = () => {
        switch (activeWorkbench) {
            case 'Modeling':
                return <ModelingTools />;
            case 'Analysis':
                return (
                    <Box sx={{ p: 2 }}>
                        <AnalysisPanel />
                    </Box>
                );
            case 'Results':
                 return <VtkResultsViewer resultsUrl={undefined} />;
            default:
                return null;
        }
    };

    return (
        <Box sx={{ display: 'flex', height: '100vh', bgcolor: 'background.dark' }}>
            <AppBar 
                position="fixed" 
                sx={{ 
                    zIndex: (theme) => theme.zIndex.drawer + 1,
                    bgcolor: 'rgba(38, 50, 56, 0.6)', // glassmorphism
                    backdropFilter: 'blur(10px)',
                    boxShadow: 'none',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                }}
            >
                 <Toolbar>
                    <IconButton
                        color="inherit"
                        aria-label="open drawer"
                        onClick={toggleLeftDrawer}
                        edge="start"
                        sx={{ mr: 2 }}
                    >
                        <MenuIcon />
                    </IconButton>
                    <img src="/logo.svg" alt="Logo" style={{ height: '40px', marginRight: '16px' }} />
                    <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 0, mr: 4 }}>
                        深基坑V5引擎
                    </Typography>
                    <Box sx={{ flexGrow: 0, display: 'flex', mr: 4 }}>
                        <Button
                            startIcon={<ModelIcon />}
                            onClick={() => setActiveWorkbench('Modeling')}
                            variant={activeWorkbench === 'Modeling' ? 'contained' : 'text'}
                            color={'primary'}
                            sx={{ mr: 1 }}
                        >
                            建模
                        </Button>
                        <Button
                            startIcon={<AnalysisIcon />}
                            onClick={() => setActiveWorkbench('Analysis')}
                            variant={activeWorkbench === 'Analysis' ? 'contained' : 'text'}
                            color={'secondary'}
                            sx={{ mr: 1 }}
                        >
                            分析
                        </Button>
                        <Button
                            startIcon={<ResultsIcon />}
                            onClick={() => setActiveWorkbench('Results')}
                            variant={activeWorkbench === 'Results' ? 'contained' : 'text'}
                            color="inherit"
                            sx={{ mr: 1 }}
                        >
                            结果
                        </Button>
                    </Box>
                    <Box sx={{ flexGrow: 0, display: 'flex', mr: 2 }}>
                        <Tooltip title="保存项目">
                            <IconButton color="inherit">
                                <SaveIcon />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="撤销">
                            <IconButton color="inherit">
                                <UndoIcon />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="重做">
                            <IconButton color="inherit">
                                <RedoIcon />
                            </IconButton>
                        </Tooltip>
                    </Box>
                    <Box sx={{ flexGrow: 1 }} />
                    <Box sx={{ display: 'flex' }}>
                        <Tooltip title="帮助">
                            <IconButton color="inherit">
                                <HelpIcon />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="设置">
                            <IconButton color="inherit">
                                <SettingsIcon />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="通知">
                            <IconButton color="inherit">
                                <Badge badgeContent={4} color="error">
                                    <NotificationsIcon />
                                </Badge>
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="用户">
                            <IconButton color="inherit">
                                <AccountCircleIcon />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Toolbar>
            </AppBar>
            
            <Drawer
                variant="persistent"
                anchor="left"
                open={leftDrawerOpen}
                sx={{
                    width: DRAWER_WIDTH,
                    flexShrink: 0,
                    '& .MuiDrawer-paper': {
                        width: DRAWER_WIDTH,
                        boxSizing: 'border-box',
                        bgcolor: 'rgba(38, 50, 56, 0.6)',
                        backdropFilter: 'blur(10px)',
                        borderRight: '1px solid rgba(255, 255, 255, 0.1)',
                        mt: '64px',
                        height: 'calc(100% - 64px)',
                        boxShadow: 'none',
                    },
                }}
            >
                 <Box sx={{ p: 2, mt: 2 }}>
                    <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold' }}>项目结构</Typography>
                    <HistoryTree />
                </Box>
            </Drawer>
            
            <Box
                component="main"
                 sx={{
                    flexGrow: 1,
                    p: 0,
                    mt: '64px', // AppBar高度
                    height: 'calc(100vh - 64px)',
                    position: 'relative',
                    transition: theme => theme.transitions.create('margin', {
                        easing: theme.transitions.easing.sharp,
                        duration: theme.transitions.duration.leavingScreen,
                    }),
                    marginLeft: `-${DRAWER_WIDTH}px`,
                    ...(leftDrawerOpen && {
                        marginLeft: 0,
                        transition: theme => theme.transitions.create('margin', {
                            easing: theme.transitions.easing.easeOut,
                            duration: theme.transitions.duration.enteringScreen,
                        }),
                    }),
                }}
            >
                 <Viewport />
                 <Box sx={{
                     position: 'absolute',
                     bottom: 0,
                     left: 0,
                     right: 0,
                     p: 1,
                     bgcolor: 'rgba(38, 50, 56, 0.6)',
                     backdropFilter: 'blur(10px)',
                     borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                     display: 'flex',
                     justifyContent: 'space-between',
                     fontSize: '0.8rem',
                     color: 'text.secondary'
                 }}>
                    <span>坐标: X: 12.34 Y: 56.78 Z: 9.10</span>
                    <span>网格单元: 12,458</span>
                    <span>状态: 就绪</span>
                 </Box>
            </Box>
            
            <Drawer
                variant="persistent"
                anchor="right"
                open={rightDrawerOpen}
                sx={{
                    width: DRAWER_WIDTH,
                    flexShrink: 0,
                    '& .MuiDrawer-paper': {
                        width: DRAWER_WIDTH,
                        boxSizing: 'border-box',
                        bgcolor: 'rgba(38, 50, 56, 0.6)',
                        backdropFilter: 'blur(10px)',
                        borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
                        mt: '64px',
                        height: 'calc(100% - 64px)',
                        boxShadow: 'none',
                        overflowX: 'hidden'
                    },
                }}
            >
                <Box sx={{ overflowY: 'auto', height: '100%' }}>
                    {renderRightPanel()}
                </Box>
            </Drawer>
            
            <MeshSettingsModal 
                isVisible={activeModal === 'MeshSettings'} 
                onClose={closeModal} 
            />
        </Box>
    );
};

export default MainPage; 