import React, { useState, RefObject } from 'react';
import { 
    Box, 
    Typography, 
    Button, 
    Paper, 
    Stack, 
    Stepper,
    Step,
    StepLabel,
    StepContent,
    CircularProgress,
    Alert
} from '@mui/material';
import Check from '@mui/icons-material/Check';
import SettingsIcon from '@mui/icons-material/Settings';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ScienceIcon from '@mui/icons-material/Science';

import { useStore } from '../../core/store';
import { runParametricAnalysis, ParametricScene, AnalysisResult } from '../../services/parametricAnalysisService';
import { ViewportHandles } from '../viewport/Viewport';
import MeshSettingsForm from '../forms/MeshSettingsForm';

const steps = [
  {
    label: '网格划分设置',
    description: `定义计算网格的精细度。`,
    icon: SettingsIcon,
  },
  {
    label: '分析工况定义',
    description: '选择分析类型，例如静力分析或分步施工。',
    icon: ScienceIcon,
  },
  {
    label: '运行求解',
    description: `执行计算并等待结果。`,
    icon: PlayArrowIcon,
  },
];

interface AnalysisPanelProps {
    viewportRef: RefObject<ViewportHandles>;
}

const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ viewportRef }) => {
    const { features, meshSettings, analysisSettings } = useStore(state => ({
        features: state.features,
        meshSettings: state.meshSettings,
        analysisSettings: state.analysisSettings
    }));
    
    const [activeStep, setActiveStep] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

    const handleRunAnalysis = async () => {
        setIsLoading(true);
        setAnalysisResult(null);
        
        const scenePayload = {
            version: "2.0-parametric" as const,
            features: features,
            mesh_settings: meshSettings,
            analysis_settings: analysisSettings
        };

        try {
            const result = await runParametricAnalysis(scenePayload);
            setAnalysisResult(result);

            if (result.status.startsWith('completed') && result.mesh_filename) {
                const resultsUrl = `/api/analysis/results/${result.mesh_filename}`;
                viewportRef.current?.loadVtkResults(resultsUrl);
            }

        } catch (error) {
            setAnalysisResult({
                status: 'Error',
                message: error instanceof Error ? error.message : '发生未知错误',
                mesh_statistics: {},
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleNext = () => {
        if (activeStep === steps.length - 1) {
            handleRunAnalysis();
        } else {
            setActiveStep((prevActiveStep) => prevActiveStep + 1);
        }
    };

    const handleBack = () => {
        setActiveStep((prevActiveStep) => prevActiveStep - 1);
    };

    const getStepContent = (step: number) => {
        switch (step) {
            case 0:
                return <MeshSettingsForm />;
            case 1:
                return (
                    <Box sx={{ p: 2 }}>
                        <Typography>分析工况定义功能正在开发中...</Typography>
                    </Box>
                );
            case 2:
                return (
                    <Box sx={{ p: 2 }}>
                       <Typography>准备就绪。点击"运行分析"开始计算。</Typography>
                       {analysisResult && (
                            <Alert 
                                severity={analysisResult.status.startsWith('completed') ? 'success' : 'error'} 
                                sx={{ mt: 2 }}
                            >
                                {analysisResult.message}
                            </Alert>
                        )}
                    </Box>
                );
            default:
                return '未知步骤';
        }
    }

    return (
        <Paper elevation={0} sx={{ p: 2, bgcolor: 'transparent' }}>
            <Typography variant="h6" sx={{ fontWeight: 'medium', mb: 2 }}>
                分析工作流
            </Typography>
            <Stepper activeStep={activeStep} orientation="vertical">
                {steps.map((step, index) => (
                <Step key={step.label}>
                    <StepLabel
                        StepIconComponent={(props) => {
                            const { active, completed, icon } = props;
                            const Icon = steps[icon as number - 1].icon;
                            return (
                                <Box sx={{
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center',
                                    width: 24, 
                                    height: 24, 
                                    borderRadius: '50%', 
                                    bgcolor: active ? 'primary.main' : (completed ? 'success.main' : 'grey.700'),
                                    color: 'white',
                                    transition: 'all 0.3s'
                                }}>
                                    {completed ? <Check sx={{fontSize: 16}} /> : <Icon sx={{fontSize: 16}} />}
                                </Box>
                            );
                        }}
                    >
                       <Typography sx={{fontWeight: activeStep === index ? 'bold' : 'normal'}}>
                           {step.label}
                       </Typography>
                    </StepLabel>
                    <StepContent>
                        <Paper sx={{p: 2, bgcolor: 'background.paper', borderRadius: 2, my: 1}}>
                            {getStepContent(index)}
                        </Paper>
                        <Box sx={{ mb: 2 }}>
                            <div>
                                <Button
                                    variant="contained"
                                    onClick={handleNext}
                                    sx={{ mt: 1, mr: 1 }}
                                    disabled={isLoading}
                                >
                                    {isLoading && index === steps.length -1 ? <CircularProgress size={24} /> : (activeStep === steps.length - 1 ? '运行分析' : '继续')}
                                </Button>
                                <Button
                                    disabled={index === 0 || isLoading}
                                    onClick={handleBack}
                                    sx={{ mt: 1, mr: 1 }}
                                >
                                    返回
                                </Button>
                            </div>
                        </Box>
                    </StepContent>
                </Step>
                ))}
            </Stepper>
        </Paper>
    );
};

export default AnalysisPanel; 