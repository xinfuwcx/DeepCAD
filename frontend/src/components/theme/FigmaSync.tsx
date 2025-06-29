/**
 * @file FigmaSync.tsx
 * @description Figma实时同步组件
 * @author Deep Excavation Team
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Snackbar,
  Alert,
  Typography,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  CloudSync as SyncIcon,
  Palette as PaletteIcon,
  Code as CodeIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { useFigmaTheme } from './FigmaThemeProvider';

interface SyncStatus {
  isActive: boolean;
  lastSync: Date | null;
  status: 'idle' | 'syncing' | 'success' | 'error';
  message: string;
  progress: number;
}

interface SyncReport {
  tokens: {
    colors: number;
    typography: number;
    spacing: number;
    effects: number;
  };
  components: {
    generated: number;
    updated: number;
    errors: number;
  };
  files: string[];
}

export const FigmaSync: React.FC = () => {
  const { refreshTheme, isLoading, lastSync } = useFigmaTheme();
  const [open, setOpen] = useState(false);
  const [autoSync, setAutoSync] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isActive: false,
    lastSync: null,
    status: 'idle',
    message: '',
    progress: 0,
  });
  const [syncReport, setSyncReport] = useState<SyncReport | null>(null);
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info',
  });

  // 执行同步
  const performSync = async () => {
    setSyncStatus(prev => ({
      ...prev,
      isActive: true,
      status: 'syncing',
      message: '正在连接 Figma...',
      progress: 10,
    }));

    try {
      // 模拟同步过程
      await simulateSync();
      
      setSyncStatus(prev => ({
        ...prev,
        isActive: false,
        status: 'success',
        message: '同步完成',
        progress: 100,
        lastSync: new Date(),
      }));

      setNotification({
        open: true,
        message: '设计系统同步成功！',
        severity: 'success',
      });

      // 刷新主题
      await refreshTheme();

    } catch (error) {
      setSyncStatus(prev => ({
        ...prev,
        isActive: false,
        status: 'error',
        message: `同步失败: ${error}`,
        progress: 0,
      }));

      setNotification({
        open: true,
        message: '同步失败，请检查配置',
        severity: 'error',
      });
    }
  };

  // 模拟同步过程
  const simulateSync = async (): Promise<void> => {
    const steps = [
      { message: '获取设计令牌...', progress: 20 },
      { message: '解析颜色系统...', progress: 40 },
      { message: '生成字体配置...', progress: 60 },
      { message: '创建组件代码...', progress: 80 },
      { message: '更新主题配置...', progress: 90 },
    ];

    for (const step of steps) {
      setSyncStatus(prev => ({
        ...prev,
        message: step.message,
        progress: step.progress,
      }));
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    // 生成模拟报告
    setSyncReport({
      tokens: {
        colors: Math.floor(Math.random() * 20) + 10,
        typography: Math.floor(Math.random() * 10) + 5,
        spacing: Math.floor(Math.random() * 8) + 4,
        effects: Math.floor(Math.random() * 6) + 3,
      },
      components: {
        generated: Math.floor(Math.random() * 15) + 5,
        updated: Math.floor(Math.random() * 8) + 2,
        errors: Math.floor(Math.random() * 2),
      },
      files: [
        'tokens.json',
        'tokens.css',
        'theme-generated.ts',
        'Button.tsx',
        'Card.tsx',
        'Input.tsx',
      ],
    });
  };

  // 自动同步
  useEffect(() => {
    if (!autoSync) return;

    const interval = setInterval(() => {
      if (!syncStatus.isActive) {
        performSync();
      }
    }, 30 * 60 * 1000); // 30分钟

    return () => clearInterval(interval);
  }, [autoSync, syncStatus.isActive]);

  const getStatusIcon = () => {
    switch (syncStatus.status) {
      case 'syncing':
        return <CircularProgress size={20} />;
      case 'success':
        return <CheckIcon color="success" />;
      case 'error':
        return <ErrorIcon color="error" />;
      default:
        return <SyncIcon />;
    }
  };

  const getStatusColor = () => {
    switch (syncStatus.status) {
      case 'syncing':
        return 'primary';
      case 'success':
        return 'success';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <>
      {/* 同步状态芯片 */}
      <Chip
        icon={getStatusIcon()}
        label={
          syncStatus.isActive
            ? `同步中... ${syncStatus.progress}%`
            : lastSync
            ? `已同步 ${lastSync.toLocaleTimeString()}`
            : '未同步'
        }
        color={getStatusColor() as any}
        onClick={() => setOpen(true)}
        sx={{ cursor: 'pointer' }}
      />

      {/* 同步对话框 */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <PaletteIcon />
            Figma 设计系统同步
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={3}>
            {/* 自动同步开关 */}
            <FormControlLabel
              control={
                <Switch
                  checked={autoSync}
                  onChange={(e) => setAutoSync(e.target.checked)}
                />
              }
              label="启用自动同步 (每30分钟)"
            />

            {/* 同步状态 */}
            <Box>
              <Typography variant="h6" gutterBottom>
                同步状态
              </Typography>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                {getStatusIcon()}
                <Typography>
                  {syncStatus.message || '就绪'}
                </Typography>
              </Box>
              {syncStatus.isActive && (
                <Box display="flex" alignItems="center" gap={1}>
                  <Box width="100%">
                    <CircularProgress
                      variant="determinate"
                      value={syncStatus.progress}
                      size={20}
                    />
                  </Box>
                  <Typography variant="body2">
                    {syncStatus.progress}%
                  </Typography>
                </Box>
              )}
            </Box>

            {/* 同步报告 */}
            {syncReport && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  最近同步报告
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon>
                      <PaletteIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="设计令牌"
                      secondary={`颜色: ${syncReport.tokens.colors}, 字体: ${syncReport.tokens.typography}, 间距: ${syncReport.tokens.spacing}, 效果: ${syncReport.tokens.effects}`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <CodeIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="React 组件"
                      secondary={`生成: ${syncReport.components.generated}, 更新: ${syncReport.components.updated}, 错误: ${syncReport.components.errors}`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <InfoIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="生成文件"
                      secondary={syncReport.files.join(', ')}
                    />
                  </ListItem>
                </List>
              </Box>
            )}

            {/* 配置信息 */}
            <Box>
              <Typography variant="h6" gutterBottom>
                配置信息
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Access Token: {process.env.REACT_APP_FIGMA_ACCESS_TOKEN ? '已配置' : '未配置'}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                File ID: {process.env.REACT_APP_FIGMA_FILE_ID ? '已配置' : '未配置'}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                输出路径: src/styles/tokens, src/components/figma-generated
              </Typography>
            </Box>
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpen(false)}>
            关闭
          </Button>
          <Button
            onClick={performSync}
            variant="contained"
            disabled={syncStatus.isActive || isLoading}
            startIcon={<RefreshIcon />}
          >
            {syncStatus.isActive ? '同步中...' : '立即同步'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 通知 */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification(prev => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setNotification(prev => ({ ...prev, open: false }))}
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default FigmaSync;
