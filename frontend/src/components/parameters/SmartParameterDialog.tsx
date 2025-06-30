/**
 * @file SmartParameterDialog.tsx
 * @description 智能参数弹窗 - AI助手与3D参数球的深度集成
 * @features AI建议-参数弹窗-一键应用完整闭环
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Grid,
  TextField,
  Button,
  Typography,
  Slider,
  Card,
  CardContent,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  LinearProgress,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Collapse,
  Avatar,
  Paper
} from '@mui/material';
import { styled, alpha } from '@mui/material/styles';
import {
  Close,
  SmartToy,
  AutoAwesome,
  CheckCircle,
  Warning,
  TipsAndUpdates,
  Science,
  Engineering,
  Calculate,
  Timeline,
  Tune,
  PlayArrow,
  Pause,
  Refresh,
  ExpandMore,
  ExpandLess,
  Visibility,
  VisibilityOff,
  Psychology,
  Speed
} from '@mui/icons-material';
// import { motion, AnimatePresence } from 'framer-motion'; // TODO: Install framer-motion

// 参数类型定义
interface Parameter {
  id: string;
  name: string;
  displayName: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  step: number;
  category: 'soil' | 'structure' | 'loading' | 'boundary';
  description: string;
  isAIRecommended?: boolean;
  confidence?: number;
  impact?: 'low' | 'medium' | 'high';
  validation?: {
    isValid: boolean;
    message?: string;
  };
}

interface AIRecommendation {
  id: string;
  type: 'optimization' | 'warning' | 'suggestion';
  title: string;
  description: string;
  parameters: Parameter[];
  confidence: number;
  reasoning: string;
  impact: string;
  timeStamp: Date;
}

interface SmartParameterDialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  parameters: Parameter[];
  onParametersChange: (parameters: Parameter[]) => void;
  onApply: (parameters: Parameter[]) => Promise<void>;
  aiRecommendations?: AIRecommendation[];
  isLoading?: boolean;
  show3DPreview?: boolean;
}

// 样式定义
const StyledDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    background: `linear-gradient(135deg, 
      ${alpha(theme.palette.primary.dark, 0.95)} 0%, 
      ${alpha(theme.palette.secondary.dark, 0.95)} 100%)`,
    backdropFilter: 'blur(20px)',
    border: `1px solid ${alpha(theme.palette.primary.light, 0.2)}`,
    borderRadius: 20,
    maxWidth: 1200,
    maxHeight: '90vh',
    boxShadow: `0 25px 50px -12px ${alpha(theme.palette.primary.main, 0.4)}`,
  }
}));

const GlassCard = styled(Card)(({ theme }) => ({
  background: `linear-gradient(135deg, 
    ${alpha(theme.palette.background.paper, 0.1)} 0%, 
    ${alpha(theme.palette.background.paper, 0.05)} 100%)`,
  backdropFilter: 'blur(10px)',
  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  borderRadius: 16,
}));

const QuantumSlider = styled(Slider)(({ theme }) => ({
  '& .MuiSlider-rail': {
    background: `linear-gradient(90deg, 
      ${theme.palette.primary.dark} 0%, 
      ${theme.palette.secondary.main} 100%)`,
    opacity: 0.3,
  },
  '& .MuiSlider-track': {
    background: `linear-gradient(90deg, 
      ${theme.palette.primary.main} 0%, 
      ${theme.palette.secondary.light} 100%)`,
    boxShadow: `0 0 10px ${alpha(theme.palette.primary.main, 0.5)}`,
  },
  '& .MuiSlider-thumb': {
    background: `linear-gradient(45deg, 
      ${theme.palette.primary.light} 0%, 
      ${theme.palette.secondary.main} 100%)`,
    boxShadow: `0 0 20px ${alpha(theme.palette.primary.main, 0.8)}`,
    '&:hover': {
      boxShadow: `0 0 30px ${alpha(theme.palette.primary.main, 1)}`,
    }
  }
}));

const AIChip = styled(Chip)(({ theme }) => ({
  background: `linear-gradient(45deg, 
    ${theme.palette.primary.main} 0%, 
    ${theme.palette.secondary.main} 100%)`,
  color: theme.palette.primary.contrastText,
  fontWeight: 600,
  '& .MuiChip-icon': {
    color: 'inherit',
  }
}));

export const SmartParameterDialog: React.FC<SmartParameterDialogProps> = ({
  open,
  onClose,
  title = "智能参数设置",
  parameters: initialParameters,
  onParametersChange,
  onApply,
  aiRecommendations = [],
  isLoading = false,
  show3DPreview = true
}) => {
  const [parameters, setParameters] = useState<Parameter[]>(initialParameters);
  const [activeTab, setActiveTab] = useState(0);
  const [isApplying, setIsApplying] = useState(false);
  const [expandedRecommendations, setExpandedRecommendations] = useState<Set<string>>(new Set());
  const [previewMode, setPreviewMode] = useState<'2d' | '3d'>('3d');
  const [autoValidation, setAutoValidation] = useState(true);
  const [showAIInsights, setShowAIInsights] = useState(true);

  // 参数分类
  const categorizedParameters = useMemo(() => {
    const categories = {
      soil: parameters.filter(p => p.category === 'soil'),
      structure: parameters.filter(p => p.category === 'structure'), 
      loading: parameters.filter(p => p.category === 'loading'),
      boundary: parameters.filter(p => p.category === 'boundary')
    };
    return categories;
  }, [parameters]);

  // 参数验证
  const validateParameter = useCallback((param: Parameter): Parameter => {
    const validated = { ...param };
    
    if (param.value < param.min || param.value > param.max) {
      validated.validation = {
        isValid: false,
        message: `值应在 ${param.min} - ${param.max} ${param.unit} 范围内`
      };
    } else {
      validated.validation = { isValid: true };
    }
    
    return validated;
  }, []);

  // 参数变更处理
  const handleParameterChange = useCallback((paramId: string, value: number) => {
    setParameters(prev => {
      const updated = prev.map(p => {
        if (p.id === paramId) {
          const newParam = { ...p, value };
          return autoValidation ? validateParameter(newParam) : newParam;
        }
        return p;
      });
      onParametersChange(updated);
      return updated;
    });
  }, [autoValidation, validateParameter, onParametersChange]);

  // 应用AI建议
  const applyAIRecommendation = useCallback((recommendation: AIRecommendation) => {
    setParameters(prev => {
      const updated = prev.map(p => {
        const aiParam = recommendation.parameters.find(ap => ap.id === p.id);
        if (aiParam) {
          return {
            ...p,
            value: aiParam.value,
            isAIRecommended: true,
            confidence: recommendation.confidence
          };
        }
        return p;
      });
      onParametersChange(updated);
      return updated;
    });
  }, [onParametersChange]);

  // 应用所有参数
  const handleApply = useCallback(async () => {
    setIsApplying(true);
    try {
      await onApply(parameters);
    } finally {
      setIsApplying(false);
    }
  }, [parameters, onApply]);

  // 重置参数
  const handleReset = useCallback(() => {
    setParameters(initialParameters);
    onParametersChange(initialParameters);
  }, [initialParameters, onParametersChange]);

  // 切换推荐展开状态
  const toggleRecommendation = useCallback((id: string) => {
    setExpandedRecommendations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  // 渲染参数控制器
  const renderParameterControl = (param: Parameter) => (
    <GlassCard key={param.id} sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ flex: 1, color: 'primary.light' }}>
            {param.displayName}
          </Typography>
          {param.isAIRecommended && (
            <AIChip
              icon={<AutoAwesome />}
              label={`AI推荐 ${Math.round((param.confidence || 0) * 100)}%`}
              size="small"
            />
          )}
        </Box>
        
        <Box sx={{ px: 2, pb: 2 }}>
          <QuantumSlider
            value={param.value}
            min={param.min}
            max={param.max}
            step={param.step}
            onChange={(_, value) => handleParameterChange(param.id, value as number)}
            valueLabelDisplay="auto"
            valueLabelFormat={(value) => `${value} ${param.unit}`}
          />
        </Box>

        <Grid container spacing={2} alignItems="center">
          <Grid item xs={4}>
            <TextField
              fullWidth
              size="small"
              label="当前值"
              value={param.value}
              onChange={(e) => handleParameterChange(param.id, Number(e.target.value))}
              InputProps={{
                endAdornment: <Typography variant="body2">{param.unit}</Typography>
              }}
              error={!param.validation?.isValid}
              helperText={param.validation?.message}
            />
          </Grid>
          
          <Grid item xs={8}>
            <Typography variant="body2" color="text.secondary">
              {param.description}
            </Typography>
            
            {param.impact && (
              <Chip
                size="small"
                label={`影响: ${param.impact}`}
                color={param.impact === 'high' ? 'error' : param.impact === 'medium' ? 'warning' : 'success'}
                sx={{ mt: 1 }}
              />
            )}
          </Grid>
        </Grid>
      </CardContent>
    </GlassCard>
  );

  // 渲染AI建议
  const renderAIRecommendations = () => (
    <Box>
      {aiRecommendations.map((rec) => (
        <GlassCard key={rec.id} sx={{ mb: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Avatar sx={{ 
                bgcolor: rec.type === 'warning' ? 'warning.main' : 'primary.main',
                mr: 2,
                width: 32,
                height: 32
              }}>
                {rec.type === 'warning' ? <Warning /> : <TipsAndUpdates />}
              </Avatar>
              
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" color="primary.light">
                  {rec.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  置信度: {Math.round(rec.confidence * 100)}% | {rec.timeStamp.toLocaleTimeString()}
                </Typography>
              </Box>
              
              <IconButton
                onClick={() => toggleRecommendation(rec.id)}
                sx={{ color: 'primary.light' }}
              >
                {expandedRecommendations.has(rec.id) ? <ExpandLess /> : <ExpandMore />}
              </IconButton>
            </Box>

            <Typography variant="body2" color="text.primary" sx={{ mb: 2 }}>
              {rec.description}
            </Typography>

            <Collapse in={expandedRecommendations.has(rec.id)}>
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" color="primary.light" gutterBottom>
                  推理过程:
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {rec.reasoning}
                </Typography>

                <Typography variant="subtitle2" color="primary.light" gutterBottom>
                  影响评估:
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {rec.impact}
                </Typography>

                <Button
                  variant="contained"
                  startIcon={<AutoAwesome />}
                  onClick={() => applyAIRecommendation(rec)}
                  sx={{ 
                    background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                    '&:hover': {
                      background: 'linear-gradient(45deg, #1976D2 30%, #0288D1 90%)',
                    }
                  }}
                >
                  应用此建议
                </Button>
              </Box>
            </Collapse>
          </CardContent>
        </GlassCard>
      ))}
    </Box>
  );

  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
              <Tune />
            </Avatar>
            <Typography variant="h5" color="primary.light">
              {title}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={showAIInsights}
                  onChange={(e) => setShowAIInsights(e.target.checked)}
                  color="primary"
                />
              }
              label="AI洞察"
            />
            
            <IconButton onClick={onClose} sx={{ color: 'text.secondary' }}>
              <Close />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Tabs 
          value={activeTab} 
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{ mb: 3 }}
        >
          <Tab label="土体参数" icon={<Engineering />} />
          <Tab label="结构参数" icon={<Science />} />
          <Tab label="荷载边界" icon={<Calculate />} />
          {showAIInsights && <Tab label="AI建议" icon={<Psychology />} />}
        </Tabs>

        <Box key={activeTab} sx={{ opacity: 1, transition: 'opacity 0.3s ease' }}>
            {activeTab === 0 && (
              <Box>
                {categorizedParameters.soil.map(renderParameterControl)}
              </Box>
            )}
            
            {activeTab === 1 && (
              <Box>
                {categorizedParameters.structure.map(renderParameterControl)}
              </Box>
            )}
            
            {activeTab === 2 && (
              <Box>
                {[...categorizedParameters.loading, ...categorizedParameters.boundary].map(renderParameterControl)}
              </Box>
            )}
            
            {activeTab === 3 && showAIInsights && (
              <Box>
                {aiRecommendations.length > 0 ? (
                  renderAIRecommendations()
                ) : (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <SmartToy sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">
                      AI正在分析参数配置...
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </Box>

        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress />
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, gap: 2 }}>
        <Button
          variant="outlined"
          onClick={handleReset}
          startIcon={<Refresh />}
        >
          重置
        </Button>
        
        <Button
          variant="outlined"
          onClick={onClose}
        >
          取消
        </Button>
        
        <Button
          variant="contained"
          onClick={handleApply}
          disabled={isApplying || parameters.some(p => !p.validation?.isValid)}
          startIcon={isApplying ? <CircularProgress size={20} /> : <PlayArrow />}
          sx={{
            background: 'linear-gradient(45deg, #4CAF50 30%, #8BC34A 90%)',
            '&:hover': {
              background: 'linear-gradient(45deg, #388E3C 30%, #689F38 90%)',
            }
          }}
        >
          {isApplying ? '应用中...' : '应用参数'}
        </Button>
      </DialogActions>
    </StyledDialog>
  );
};

export default SmartParameterDialog;
