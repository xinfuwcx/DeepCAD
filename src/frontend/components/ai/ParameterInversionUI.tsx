import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Slider,
  TextField,
  Button,
  Chip,
  CircularProgress,
  Stack,
  Divider,
  IconButton,
  Tooltip,
  styled,
  LinearProgress,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Science as ScienceIcon,
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  AutoGraph as AutoGraphIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Download as DownloadIcon,
  BarChart as BarChartIcon,
  Tune as TuneIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import { quantumTokens } from '../../styles/tokens/quantumTokens';

/**
 * 参数反演UI组件
 * 实现AI参数反演的用户交互界面
 */

// 参数类型
export type ParameterType = 'soil' | 'structure' | 'flow' | 'boundary';

// 参数范围
interface ParameterRange {
  min: number;
  max: number;
  step: number;
  unit: string;
}

// 参数定义
export interface InversionParameter {
  id: string;
  name: string;
  description: string;
  type: ParameterType;
  value: number;
  range: ParameterRange;
  confidence: number; // 0-100, 反演结果的置信度
  isReversing: boolean; // 是否参与反演
  history?: number[]; // 历史值
  defaultValue: number;
}

// 反演状态
export type InversionStatus = 'idle' | 'running' | 'paused' | 'completed' | 'error';

// 置信度指示器样式
const ConfidenceIndicator = styled(Box)<{ confidence: number }>(({ confidence }) => {
  // 根据置信度选择颜色
  const getColor = () => {
    if (confidence >= 90) return quantumTokens.colors.neonFlow;
    if (confidence >= 70) return quantumTokens.colors.neonDisplacement;
    if (confidence >= 50) return quantumTokens.colors.neonWarning;
    return quantumTokens.colors.neonStress;
  };

  return {
    width: '8px',
    height: '100%',
    position: 'absolute',
    left: 0,
    top: 0,
    backgroundColor: getColor(),
    borderTopLeftRadius: quantumTokens.borderRadius.md,
    borderBottomLeftRadius: quantumTokens.borderRadius.md,
    transition: quantumTokens.animation.transitions.normal,
    '&::after': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      opacity: 0.5,
      animation: 'pulse 2s infinite',
      backgroundColor: 'inherit',
      borderTopLeftRadius: 'inherit',
      borderBottomLeftRadius: 'inherit',
    },
  };
});

// 参数卡片样式
const ParameterCard = styled(Paper)(({ theme }) => ({
  position: 'relative',
  padding: quantumTokens.spacing.md,
  paddingLeft: quantumTokens.spacing.lg,
  backgroundColor: 'rgba(26, 26, 46, 0.6)',
  backdropFilter: 'blur(10px)',
  borderRadius: quantumTokens.borderRadius.md,
  overflow: 'hidden',
  transition: quantumTokens.animation.transitions.normal,
  border: '1px solid rgba(255, 255, 255, 0.05)',
  '&:hover': {
    backgroundColor: 'rgba(26, 26, 46, 0.8)',
    boxShadow: quantumTokens.shadows.glass.md,
  },
}));

// 反演控制面板样式
const ControlPanel = styled(Paper)(({ theme }) => ({
  padding: quantumTokens.spacing.md,
  backgroundColor: 'rgba(10, 14, 39, 0.6)',
  backdropFilter: 'blur(10px)',
  borderRadius: quantumTokens.borderRadius.md,
  display: 'flex',
  flexDirection: 'column',
  gap: quantumTokens.spacing.md,
  border: '1px solid rgba(255, 255, 255, 0.1)',
}));

// 状态指示器样式
const StatusIndicator = styled(Box)<{ status: InversionStatus }>(({ status }) => {
  // 根据状态选择颜色
  const getColor = () => {
    switch (status) {
      case 'running':
        return quantumTokens.colors.neonFlow;
      case 'paused':
        return quantumTokens.colors.neonDisplacement;
      case 'completed':
        return quantumTokens.colors.neonFlow;
      case 'error':
        return quantumTokens.colors.neonStress;
      default:
        return 'rgba(255, 255, 255, 0.5)';
    }
  };

  return {
    display: 'flex',
    alignItems: 'center',
    gap: quantumTokens.spacing.xs,
    padding: `${quantumTokens.spacing.xs} ${quantumTokens.spacing.sm}`,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: quantumTokens.borderRadius.full,
    color: getColor(),
    '& svg': {
      fontSize: '1rem',
    },
  };
});

// 参数类型标签样式
const TypeChip = styled(Chip)<{ parametertype: ParameterType }>(({ parametertype }) => {
  // 根据参数类型选择颜色
  const getColor = () => {
    switch (parametertype) {
      case 'soil':
        return quantumTokens.colors.engineeringSoil;
      case 'structure':
        return quantumTokens.colors.engineeringConcrete;
      case 'flow':
        return quantumTokens.colors.engineeringWater;
      case 'boundary':
        return quantumTokens.colors.neonDisplacement;
      default:
        return quantumTokens.colors.quantumBrightEnd;
    }
  };

  return {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    color: getColor(),
    border: `1px solid ${getColor()}`,
    height: '20px',
    fontSize: '0.7rem',
  };
});

// 获取状态图标
const getStatusIcon = (status: InversionStatus) => {
  switch (status) {
    case 'running':
      return <PlayArrowIcon />;
    case 'paused':
      return <InfoIcon />;
    case 'completed':
      return <CheckCircleIcon />;
    case 'error':
      return <ErrorIcon />;
    default:
      return <ScienceIcon />;
  }
};

// 示例参数
const exampleParameters: InversionParameter[] = [
  {
    id: 'elastic-modulus',
    name: '弹性模量',
    description: '土体的弹性模量参数',
    type: 'soil',
    value: 20000,
    defaultValue: 20000,
    range: {
      min: 5000,
      max: 100000,
      step: 1000,
      unit: 'kPa',
    },
    confidence: 85,
    isReversing: true,
    history: [15000, 17000, 18500, 19200, 20000],
  },
  {
    id: 'cohesion',
    name: '粘聚力',
    description: '土体的粘聚力参数',
    type: 'soil',
    value: 15,
    defaultValue: 10,
    range: {
      min: 0,
      max: 50,
      step: 1,
      unit: 'kPa',
    },
    confidence: 72,
    isReversing: true,
    history: [8, 10, 12, 13.5, 15],
  },
  {
    id: 'friction-angle',
    name: '内摩擦角',
    description: '土体的内摩擦角参数',
    type: 'soil',
    value: 30,
    defaultValue: 25,
    range: {
      min: 15,
      max: 45,
      step: 0.5,
      unit: '°',
    },
    confidence: 90,
    isReversing: true,
    history: [25, 27, 28.5, 29.2, 30],
  },
  {
    id: 'wall-stiffness',
    name: '墙体刚度',
    description: '支护结构的刚度参数',
    type: 'structure',
    value: 3.5e7,
    defaultValue: 3.0e7,
    range: {
      min: 1.0e7,
      max: 5.0e7,
      step: 1.0e6,
      unit: 'kPa',
    },
    confidence: 65,
    isReversing: false,
    history: [3.0e7, 3.2e7, 3.4e7, 3.5e7],
  },
  {
    id: 'permeability',
    name: '渗透系数',
    description: '土体的渗透系数',
    type: 'flow',
    value: 1e-5,
    defaultValue: 1e-6,
    range: {
      min: 1e-8,
      max: 1e-3,
      step: 1e-9,
      unit: 'm/s',
    },
    confidence: 78,
    isReversing: true,
    history: [1e-6, 5e-6, 8e-6, 1e-5],
  },
];

export interface ParameterInversionUIProps {
  parameters?: InversionParameter[];
  onStartInversion?: () => void;
  onStopInversion?: () => void;
  onResetParameters?: () => void;
  onParameterChange?: (id: string, value: number) => void;
  onToggleParameterInversion?: (id: string, isReversing: boolean) => void;
  onApplyParameters?: (parameters: InversionParameter[]) => void;
  status?: InversionStatus;
  progress?: number;
  errorMessage?: string;
  iteration?: number;
  maxIterations?: number;
  convergenceThreshold?: number;
  convergenceRate?: number;
}

export const ParameterInversionUI: React.FC<ParameterInversionUIProps> = ({
  parameters = exampleParameters,
  onStartInversion,
  onStopInversion,
  onResetParameters,
  onParameterChange,
  onToggleParameterInversion,
  onApplyParameters,
  status = 'idle',
  progress = 0,
  errorMessage = '',
  iteration = 0,
  maxIterations = 100,
  convergenceThreshold = 1e-5,
  convergenceRate = 0.001,
}) => {
  const [localParameters, setLocalParameters] = useState<InversionParameter[]>(parameters);
  const [selectedType, setSelectedType] = useState<ParameterType | 'all'>('all');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const convergenceChart = useRef<HTMLCanvasElement>(null);

  // 当外部参数变化时更新本地参数
  useEffect(() => {
    setLocalParameters(parameters);
  }, [parameters]);

  // 处理参数值变化
  const handleParameterChange = (id: string, value: number) => {
    setLocalParameters((prev) =>
      prev.map((param) => (param.id === id ? { ...param, value } : param))
    );

    if (onParameterChange) {
      onParameterChange(id, value);
    }
  };

  // 处理参数反演开关
  const handleToggleParameterInversion = (id: string) => {
    setLocalParameters((prev) =>
      prev.map((param) =>
        param.id === id ? { ...param, isReversing: !param.isReversing } : param
      )
    );

    if (onToggleParameterInversion) {
      const parameter = localParameters.find((p) => p.id === id);
      if (parameter) {
        onToggleParameterInversion(id, !parameter.isReversing);
      }
    }
  };

  // 处理开始反演
  const handleStartInversion = () => {
    if (onStartInversion) {
      onStartInversion();
    }
  };

  // 处理停止反演
  const handleStopInversion = () => {
    if (onStopInversion) {
      onStopInversion();
    }
  };

  // 处理重置参数
  const handleResetParameters = () => {
    setLocalParameters((prev) =>
      prev.map((param) => ({ ...param, value: param.defaultValue }))
    );

    if (onResetParameters) {
      onResetParameters();
    }
  };

  // 处理应用参数
  const handleApplyParameters = () => {
    if (onApplyParameters) {
      onApplyParameters(localParameters);
    }
  };

  // 根据类型过滤参数
  const filteredParameters = localParameters.filter(
    (param) => selectedType === 'all' || param.type === selectedType
  );

  // 数值格式化
  const formatValue = (value: number, unit: string) => {
    if (value >= 1e6) {
      return `${(value / 1e6).toFixed(2)}×10⁶ ${unit}`;
    } else if (value <= 1e-3) {
      return `${(value * 1e3).toFixed(3)}×10⁻³ ${unit}`;
    } else {
      return `${value.toFixed(2)} ${unit}`;
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Grid container spacing={3}>
        {/* 左侧：参数列表 */}
        <Grid item xs={12} md={8}>
          <Box sx={{ mb: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="h6" sx={{ color: '#fff', fontWeight: 'bold' }}>
                参数反演面板
              </Typography>
              <StatusIndicator status={status}>
                {getStatusIcon(status)}
                <Typography variant="caption">
                  {status === 'idle' && '就绪'}
                  {status === 'running' && '反演中'}
                  {status === 'paused' && '已暂停'}
                  {status === 'completed' && '已完成'}
                  {status === 'error' && '错误'}
                </Typography>
              </StatusIndicator>
            </Stack>

            {/* 参数类型选择器 */}
            <Stack direction="row" spacing={1} sx={{ mt: 1, mb: 2 }}>
              <Chip
                label="全部"
                variant={selectedType === 'all' ? 'filled' : 'outlined'}
                onClick={() => setSelectedType('all')}
                sx={{
                  backgroundColor: selectedType === 'all' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                  color: '#fff',
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                }}
              />
              <TypeChip
                label="土体"
                parametertype="soil"
                variant={selectedType === 'soil' ? 'filled' : 'outlined'}
                onClick={() => setSelectedType('soil')}
              />
              <TypeChip
                label="结构"
                parametertype="structure"
                variant={selectedType === 'structure' ? 'filled' : 'outlined'}
                onClick={() => setSelectedType('structure')}
              />
              <TypeChip
                label="渗流"
                parametertype="flow"
                variant={selectedType === 'flow' ? 'filled' : 'outlined'}
                onClick={() => setSelectedType('flow')}
              />
              <TypeChip
                label="边界"
                parametertype="boundary"
                variant={selectedType === 'boundary' ? 'filled' : 'outlined'}
                onClick={() => setSelectedType('boundary')}
              />
            </Stack>
          </Box>

          {/* 参数列表 */}
          <Grid container spacing={2}>
            {filteredParameters.map((param) => (
              <Grid item xs={12} key={param.id}>
                <ParameterCard>
                  <ConfidenceIndicator confidence={param.confidence} />
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={4}>
                      <Stack spacing={0.5}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Typography variant="subtitle1" sx={{ color: '#fff', fontWeight: 'medium' }}>
                            {param.name}
                          </Typography>
                          <TypeChip
                            label={
                              param.type === 'soil'
                                ? '土体'
                                : param.type === 'structure'
                                ? '结构'
                                : param.type === 'flow'
                                ? '渗流'
                                : '边界'
                            }
                            parametertype={param.type}
                            size="small"
                          />
                        </Box>
                        <Typography
                          variant="caption"
                          sx={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.75rem' }}
                        >
                          {param.description}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                          <Typography
                            variant="body2"
                            sx={{ color: param.isReversing ? quantumTokens.colors.quantumBrightEnd : 'rgba(255, 255, 255, 0.4)' }}
                          >
                            {formatValue(param.value, param.range.unit)}
                          </Typography>
                          <Tooltip title={`置信度: ${param.confidence}%`}>
                            <Box
                              sx={{
                                width: 60,
                                height: 4,
                                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                                borderRadius: 1,
                                overflow: 'hidden',
                              }}
                            >
                              <Box
                                sx={{
                                  width: `${param.confidence}%`,
                                  height: '100%',
                                  backgroundColor:
                                    param.confidence >= 90
                                      ? quantumTokens.colors.neonFlow
                                      : param.confidence >= 70
                                      ? quantumTokens.colors.neonDisplacement
                                      : param.confidence >= 50
                                      ? quantumTokens.colors.neonWarning
                                      : quantumTokens.colors.neonStress,
                                }}
                              />
                            </Box>
                          </Tooltip>
                        </Box>
                      </Stack>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Slider
                        value={param.value}
                        min={param.range.min}
                        max={param.range.max}
                        step={param.range.step}
                        onChange={(_, value) => handleParameterChange(param.id, value as number)}
                        disabled={status === 'running'}
                        sx={{
                          '& .MuiSlider-thumb': {
                            boxShadow: param.isReversing
                              ? `0 0 0 8px ${quantumTokens.colors.glassSurface}`
                              : 'none',
                          },
                          '& .MuiSlider-track': {
                            backgroundColor: param.isReversing
                              ? quantumTokens.colors.quantumBrightEnd
                              : 'rgba(255, 255, 255, 0.3)',
                          },
                        }}
                      />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 1 }}>
                        <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                          {formatValue(param.range.min, param.range.unit)}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                          {formatValue(param.range.max, param.range.unit)}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={2}>
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                        <Tooltip title={param.isReversing ? '参与反演' : '不参与反演'}>
                          <IconButton
                            color={param.isReversing ? 'primary' : 'default'}
                            onClick={() => handleToggleParameterInversion(param.id)}
                            disabled={status === 'running'}
                            size="small"
                          >
                            {param.isReversing ? (
                              <VisibilityIcon
                                sx={{ color: quantumTokens.colors.quantumBrightEnd }}
                              />
                            ) : (
                              <VisibilityOffIcon sx={{ color: 'rgba(255, 255, 255, 0.3)' }} />
                            )}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="重置为默认值">
                          <IconButton
                            onClick={() => handleParameterChange(param.id, param.defaultValue)}
                            disabled={status === 'running' || param.value === param.defaultValue}
                            size="small"
                            sx={{ color: 'rgba(255, 255, 255, 0.5)' }}
                          >
                            <RefreshIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Grid>
                  </Grid>
                </ParameterCard>
              </Grid>
            ))}
          </Grid>
        </Grid>

        {/* 右侧：控制面板 */}
        <Grid item xs={12} md={4}>
          <ControlPanel>
            {/* 反演控制 */}
            <Box>
              <Typography variant="subtitle1" sx={{ color: '#fff', mb: 1 }}>
                反演控制
              </Typography>

              <Grid container spacing={1}>
                <Grid item xs={12}>
                  {status === 'running' ? (
                    <Button
                      variant="outlined"
                      color="error"
                      fullWidth
                      startIcon={<StopIcon />}
                      onClick={handleStopInversion}
                    >
                      停止反演
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      color="primary"
                      fullWidth
                      startIcon={<ScienceIcon />}
                      onClick={handleStartInversion}
                      disabled={status === 'running' || !localParameters.some((p) => p.isReversing)}
                      sx={{
                        backgroundImage: quantumTokens.colors.quantumBright,
                      }}
                    >
                      开始参数反演
                    </Button>
                  )}
                </Grid>

                <Grid item xs={6}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<RefreshIcon />}
                    onClick={handleResetParameters}
                    disabled={status === 'running'}
                    sx={{ borderColor: 'rgba(255, 255, 255, 0.23)', color: '#fff' }}
                  >
                    重置参数
                  </Button>
                </Grid>

                <Grid item xs={6}>
                  <Button
                    variant="outlined"
                    color="success"
                    fullWidth
                    startIcon={<CheckCircleIcon />}
                    onClick={handleApplyParameters}
                    disabled={status === 'running'}
                    sx={{
                      borderColor: quantumTokens.colors.neonFlow,
                      color: quantumTokens.colors.neonFlow,
                    }}
                  >
                    应用参数
                  </Button>
                </Grid>
              </Grid>
            </Box>

            {/* 反演进度 */}
            <Box>
              <Typography variant="subtitle1" sx={{ color: '#fff', mb: 1 }}>
                反演进度
              </Typography>

              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    进度: {Math.round(progress)}%
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    迭代: {iteration}/{maxIterations}
                  </Typography>
                </Box>

                <LinearProgress
                  variant="determinate"
                  value={progress}
                  sx={{
                    height: 8,
                    borderRadius: 1,
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    '& .MuiLinearProgress-bar': {
                      backgroundImage: quantumTokens.colors.quantumBright,
                      borderRadius: 1,
                    },
                  }}
                />
              </Box>

              {/* 收敛曲线占位符 */}
              <Box
                sx={{
                  width: '100%',
                  height: 120,
                  backgroundColor: 'rgba(0, 0, 0, 0.2)',
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 1,
                }}
              >
                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                  收敛曲线
                </Typography>
                <canvas ref={convergenceChart} style={{ display: 'none' }} />
              </Box>

              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Box
                    sx={{
                      p: 1,
                      backgroundColor: 'rgba(0, 0, 0, 0.2)',
                      borderRadius: 1,
                      textAlign: 'center',
                    }}
                  >
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                      收敛阈值
                    </Typography>
                    <Typography variant="subtitle2" sx={{ color: '#fff' }}>
                      {convergenceThreshold.toExponential(3)}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box
                    sx={{
                      p: 1,
                      backgroundColor: 'rgba(0, 0, 0, 0.2)',
                      borderRadius: 1,
                      textAlign: 'center',
                    }}
                  >
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                      收敛速率
                    </Typography>
                    <Typography variant="subtitle2" sx={{ color: '#fff' }}>
                      {convergenceRate.toExponential(3)}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>

            {/* 高级设置 */}
            <Box>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                }}
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                <Typography variant="subtitle1" sx={{ color: '#fff' }}>
                  高级设置
                </Typography>
                <IconButton size="small" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                  {showAdvanced ? <VisibilityOffIcon /> : <TuneIcon />}
                </IconButton>
              </Box>

              {showAdvanced && (
                <Box sx={{ mt: 1 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={true}
                            size="small"
                            sx={{
                              '& .MuiSwitch-switchBase.Mui-checked': {
                                color: quantumTokens.colors.quantumBrightEnd,
                              },
                              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                backgroundColor: quantumTokens.colors.quantumBrightStart,
                              },
                            }}
                          />
                        }
                        label={
                          <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                            自动优化权重
                          </Typography>
                        }
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={true}
                            size="small"
                            sx={{
                              '& .MuiSwitch-switchBase.Mui-checked': {
                                color: quantumTokens.colors.quantumBrightEnd,
                              },
                              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                backgroundColor: quantumTokens.colors.quantumBrightStart,
                              },
                            }}
                          />
                        }
                        label={
                          <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                            实时更新模型
                          </Typography>
                        }
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={false}
                            size="small"
                            sx={{
                              '& .MuiSwitch-switchBase.Mui-checked': {
                                color: quantumTokens.colors.quantumBrightEnd,
                              },
                              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                backgroundColor: quantumTokens.colors.quantumBrightStart,
                              },
                            }}
                          />
                        }
                        label={
                          <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                            包含参数不确定性
                          </Typography>
                        }
                      />
                    </Grid>
                  </Grid>
                </Box>
              )}
            </Box>

            {/* 错误消息 */}
            {errorMessage && (
              <Box
                sx={{
                  p: 1.5,
                  backgroundColor: 'rgba(255, 0, 128, 0.1)',
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 1,
                }}
              >
                <ErrorIcon
                  fontSize="small"
                  sx={{ color: quantumTokens.colors.neonStress, mt: 0.3 }}
                />
                <Typography variant="caption" sx={{ color: quantumTokens.colors.neonStress }}>
                  {errorMessage}
                </Typography>
              </Box>
            )}
          </ControlPanel>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ParameterInversionUI;
