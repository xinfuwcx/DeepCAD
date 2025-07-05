import React, { useState } from 'react';
import { 
    Box, 
    Typography, 
    Button, 
    Paper, 
    Stack, 
    Divider, 
    CircularProgress,
    Alert,
    LinearProgress
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import StyleIcon from '@mui/icons-material/Style';
import LockIcon from '@mui/icons-material/Lock';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

import { useStore } from '../../core/store';
import { runParametricAnalysis, ParametricScene, AnalysisResult } from '../../services/parametricAnalysisService';

const AnalysisPanel: React.FC = () => {
    const openModal = useStore(state => state.openModal);
    const features = useStore(state => state.features);
    const [isLoading, setIsLoading] = useState(false);
    const [analysisStatus, setAnalysisStatus] = useState<AnalysisResult | null>(null);
    const [progress, setProgress] = useState(0);

    const handleRunAnalysis = async () => {
        setIsLoading(true);
        setAnalysisStatus(null);
        setProgress(0);
        
        const scene: ParametricScene = {
            version: "2.0-parametric",
            features: features,
        };

        // 模拟进度更新
        const progressInterval = setInterval(() => {
            setProgress(oldProgress => {
                const newProgress = Math.min(oldProgress + Math.random() * 10, 95);
                return newProgress;
            });
        }, 500);

        try {
            const result = await runParametricAnalysis(scene);
            setAnalysisStatus(result);
            setProgress(100);
        } catch (error) {
            setAnalysisStatus({
                status: 'Error',
                message: error instanceof Error ? error.message : '发生未知错误',
                mesh_statistics: {},
            });
        } finally {
            clearInterval(progressInterval);
            setIsLoading(false);
        }
    };

    return (
        <Paper elevation={0} sx={{ p: 0, bgcolor: 'transparent' }}>
            <Stack spacing={2}>
                <Typography variant="h6" sx={{ fontWeight: 'medium', mb: 1 }}>
                    分析设置
                </Typography>
                
                <Paper 
                    elevation={0} 
                    sx={{ 
                        p: 2, 
                        bgcolor: 'background.paper', 
                        borderRadius: 2,
                        transition: 'all 0.3s ease',
                        '&:hover': {
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }
                    }}
                >
                    <Stack direction="row" alignItems="center" spacing={2}>
                        <SettingsIcon color="primary" />
                        <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="subtitle1">网格设置</Typography>
                            <Typography variant="body2" color="text.secondary">配置计算网格参数</Typography>
                        </Box>
                        <Button 
                            variant="outlined" 
                            onClick={() => openModal('MeshSettings')}
                            size="small"
                        >
                            设置
                        </Button>
                    </Stack>
                </Paper>
                
                <Paper 
                    elevation={0} 
                    sx={{ 
                        p: 2, 
                        bgcolor: 'background.paper', 
                        borderRadius: 2,
                        transition: 'all 0.3s ease',
                        '&:hover': {
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }
                    }}
                >
                    <Stack direction="row" alignItems="center" spacing={2}>
                        <StyleIcon color="secondary" />
                        <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="subtitle1">材料管理器</Typography>
                            <Typography variant="body2" color="text.secondary">定义材料属性和参数</Typography>
                        </Box>
                        <Button 
                            variant="outlined" 
                            onClick={() => openModal('MaterialManager')}
                            size="small"
                            disabled
                        >
                            设置
                        </Button>
                    </Stack>
                </Paper>
                
                <Paper 
                    elevation={0} 
                    sx={{ 
                        p: 2, 
                        bgcolor: 'background.paper', 
                        borderRadius: 2,
                        transition: 'all 0.3s ease',
                        '&:hover': {
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }
                    }}
                >
                    <Stack direction="row" alignItems="center" spacing={2}>
                        <LockIcon sx={{ color: 'warning.main' }} />
                        <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="subtitle1">约束条件</Typography>
                            <Typography variant="body2" color="text.secondary">定义边界条件和约束</Typography>
                        </Box>
                        <Button 
                            variant="outlined" 
                            onClick={() => openModal('ConstraintEditor')}
                            size="small"
                            disabled
                        >
                            设置
                        </Button>
                    </Stack>
                </Paper>
                
                <Paper 
                    elevation={0} 
                    sx={{ 
                        p: 2, 
                        bgcolor: 'background.paper', 
                        borderRadius: 2,
                        transition: 'all 0.3s ease',
                        '&:hover': {
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }
                    }}
                >
                    <Stack direction="row" alignItems="center" spacing={2}>
                        <LocalShippingIcon sx={{ color: 'secondary.dark' }} />
                        <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="subtitle1">荷载定义</Typography>
                            <Typography variant="body2" color="text.secondary">添加荷载和外部作用力</Typography>
                        </Box>
                        <Button 
                            variant="outlined" 
                            onClick={() => openModal('LoadEditor')}
                            size="small"
                            disabled
                        >
                            设置
                        </Button>
                    </Stack>
                </Paper>

                <Divider sx={{ my: 1 }} />
                
                <Box sx={{ mt: 2 }}>
                    <Button
                        variant="contained"
                        color="primary"
                        fullWidth
                        size="large"
                        startIcon={<PlayArrowIcon />}
                        onClick={handleRunAnalysis}
                        disabled={isLoading || features.length === 0}
                        sx={{ 
                            py: 1.5,
                            borderRadius: 2,
                            fontWeight: 'bold',
                            boxShadow: 4,
                            '&:hover': {
                                boxShadow: 6
                            }
                        }}
                    >
                        {isLoading ? '分析中...' : '运行参数化分析'}
                    </Button>
                    
                    {isLoading && (
                        <Box sx={{ width: '100%', mt: 2 }}>
                            <LinearProgress variant="determinate" value={progress} sx={{ height: 6, borderRadius: 3 }} />
                            <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
                                {`${Math.round(progress)}%`} 计算中...
                            </Typography>
                        </Box>
                    )}
                </Box>
                
                {analysisStatus && (
                    <Paper 
                        elevation={0}
                        sx={{ 
                            mt: 2, 
                            p: 2, 
                            bgcolor: analysisStatus.status === 'Success' ? 'success.dark' : 'error.dark',
                            borderRadius: 2,
                            animation: 'fade-in 0.5s ease-in-out'
                        }}
                    >
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#fff' }}>
                            {analysisStatus.status}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                            {analysisStatus.message}
                        </Typography>
                    </Paper>
                )}
                
                <Box sx={{ mt: 4, p: 2, textAlign: 'center', color: 'text.secondary' }}>
                    <Typography variant="body2">
                        选择设置任务开始配置您的分析研究
                    </Typography>
                </Box>
            </Stack>
        </Paper>
    );
};

export default AnalysisPanel; 