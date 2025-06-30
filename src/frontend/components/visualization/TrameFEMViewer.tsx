import React, { useEffect, useState, useRef } from 'react';
import { 
  Box, 
  Button, 
  CircularProgress, 
  Typography, 
  Paper, 
  Divider,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Snackbar,
  Alert
} from '@mui/material';
import { styled } from '@mui/material/styles';
import RefreshIcon from '@mui/icons-material/Refresh';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import SettingsIcon from '@mui/icons-material/Settings';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';

import { api } from '../../services/api';

// 样式化组件
const ViewerContainer = styled(Paper)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  overflow: 'hidden',
  background: theme.palette.background.default,
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[3]
}));

const ViewerHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(1, 2),
  borderBottom: `1px solid ${theme.palette.divider}`
}));

const ViewerContent = styled(Box)({
  flex: 1,
  position: 'relative',
  overflow: 'hidden'
});

const IframeContainer = styled('div')({
  width: '100%',
  height: '100%',
  border: 'none',
  overflow: 'hidden'
});

const LoadingOverlay = styled(Box)({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  zIndex: 10
});

interface TrameFEMViewerProps {
  meshFile?: string;
  resultFile?: string;
  resultData?: any;
  title?: string;
  showToolbar?: boolean;
  width?: string | number;
  height?: string | number;
  onError?: (error: string) => void;
  onReady?: () => void;
}

/**
 * trame FEM结果可视化组件
 */
const TrameFEMViewer: React.FC<TrameFEMViewerProps> = ({
  meshFile,
  resultFile,
  resultData,
  title = "FEM分析结果可视化",
  showToolbar = true,
  width = '100%',
  height = '100%',
  onError,
  onReady
}) => {
  // 状态
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isStarting, setIsStarting] = useState<boolean>(false);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [serverUrl, setServerUrl] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [availableResults, setAvailableResults] = useState<any[]>([]);
  const [selectedTab, setSelectedTab] = useState<number>(0);
  const [showSnackbar, setShowSnackbar] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info' | 'warning'>('info');
  
  // 引用
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  // 启动可视化服务器
  const startVisualizer = async () => {
    try {
      setIsStarting(true);
      setErrorMessage('');
      
      // 检查服务状态
      const statusResponse = await api.get('/api/visualization/status');
      
      if (!statusResponse.data.trame_available) {
        throw new Error('trame可视化库不可用，请联系系统管理员');
      }
      
      // 启动服务器
      const launchResponse = await api.post('/api/visualization/launch', { port: 8080 });
      
      if (launchResponse.data.status === 'started' || launchResponse.data.status === 'already_running') {
        setServerUrl(launchResponse.data.url);
        setIsRunning(true);
        
        // 如果提供了网格文件，加载它
        if (meshFile) {
          loadMeshAndResults();
        }
        
        // 通知就绪
        if (onReady) {
          onReady();
        }
      } else {
        throw new Error('启动可视化服务器失败');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '启动可视化服务器时发生未知错误';
      setErrorMessage(errorMsg);
      if (onError) {
        onError(errorMsg);
      }
      showNotification(errorMsg, 'error');
    } finally {
      setIsStarting(false);
      setIsLoading(false);
    }
  };
  
  // 停止可视化服务器
  const stopVisualizer = async () => {
    try {
      await api.get('/api/visualization/stop');
      setIsRunning(false);
      setServerUrl('');
      showNotification('可视化服务已停止', 'info');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '停止可视化服务器时发生未知错误';
      showNotification(errorMsg, 'error');
    }
  };
  
  // 加载网格和结果
  const loadMeshAndResults = async () => {
    try {
      if (!meshFile) {
        throw new Error('未提供网格文件');
      }
      
      setIsLoading(true);
      
      // 准备结果数据
      const formData = new FormData();
      formData.append('mesh_file', meshFile);
      formData.append('auto_visualize', 'true');
      
      if (resultFile) {
        formData.append('result_file', resultFile);
      }
      
      if (resultData) {
        formData.append('result_data', JSON.stringify(resultData));
      }
      
      // 加载结果
      await api.post('/api/visualization/load-results', formData);
      
      // 获取可用结果
      const resultsResponse = await api.get('/api/visualization/available-results');
      setAvailableResults(resultsResponse.data.results || []);
      
      showNotification('已成功加载FEM分析结果', 'success');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '加载网格和结果时发生未知错误';
      setErrorMessage(errorMsg);
      if (onError) {
        onError(errorMsg);
      }
      showNotification(errorMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  };
  
  // 拍摄截图
  const takeScreenshot = async () => {
    try {
      const response = await api.get('/api/visualization/screenshot', {
        params: { width: 1920, height: 1080 }
      });
      
      if (response.data.status === 'success') {
        showNotification(`截图已保存至: ${response.data.filename}`, 'success');
      }
    } catch (error) {
      showNotification('截图失败', 'error');
    }
  };
  
  // 显示通知
  const showNotification = (message: string, severity: 'success' | 'error' | 'info' | 'warning') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setShowSnackbar(true);
  };
  
  // 关闭通知
  const handleCloseSnackbar = () => {
    setShowSnackbar(false);
  };
  
  // 处理Tab切换
  const handleTabChange = (event: React.ChangeEvent<{}>, newValue: number) => {
    setSelectedTab(newValue);
  };
  
  // 刷新iframe
  const refreshViewer = () => {
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
  };
  
  // 全屏显示
  const toggleFullscreen = () => {
    if (iframeRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        iframeRef.current.requestFullscreen();
      }
    }
  };
  
  // 组件挂载时启动可视化器
  useEffect(() => {
    startVisualizer();
    
    // 组件卸载时停止服务器
    return () => {
      if (isRunning) {
        stopVisualizer();
      }
    };
  }, []);
  
  // 当网格文件或结果文件变化时重新加载
  useEffect(() => {
    if (isRunning && meshFile) {
      loadMeshAndResults();
    }
  }, [meshFile, resultFile, resultData]);
  
  return (
    <ViewerContainer sx={{ width, height }}>
      {showToolbar && (
        <ViewerHeader>
          <Typography variant="subtitle1" fontWeight="bold">
            {title}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {isRunning ? (
              <>
                <Tooltip title="刷新视图">
                  <IconButton size="small" onClick={refreshViewer}>
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
                
                <Tooltip title="全屏显示">
                  <IconButton size="small" onClick={toggleFullscreen}>
                    <FullscreenIcon />
                  </IconButton>
                </Tooltip>
                
                <Tooltip title="拍摄截图">
                  <IconButton size="small" onClick={takeScreenshot}>
                    <CameraAltIcon />
                  </IconButton>
                </Tooltip>
                
                <Tooltip title="停止服务">
                  <IconButton size="small" onClick={stopVisualizer} color="error">
                    <StopIcon />
                  </IconButton>
                </Tooltip>
              </>
            ) : (
              <Button
                variant="contained"
                color="primary"
                size="small"
                startIcon={<PlayArrowIcon />}
                onClick={startVisualizer}
                disabled={isStarting}
              >
                {isStarting ? '启动中...' : '启动服务'}
              </Button>
            )}
          </Box>
        </ViewerHeader>
      )}
      
      <Divider />
      
      {showToolbar && availableResults.length > 0 && (
        <Tabs
          value={selectedTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider', minHeight: 36 }}
        >
          {availableResults.map((result, index) => (
            <Tab 
              key={index} 
              label={result.text} 
              sx={{ minHeight: 36, py: 0 }}
            />
          ))}
        </Tabs>
      )}
      
      <ViewerContent>
        {isRunning && serverUrl ? (
          <IframeContainer>
            <iframe
              ref={iframeRef}
              src={serverUrl}
              width="100%"
              height="100%"
              style={{ border: 'none' }}
              title="Trame FEM Viewer"
            />
          </IframeContainer>
        ) : (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              p: 3
            }}
          >
            {isStarting ? (
              <>
                <CircularProgress size={40} />
                <Typography variant="body2" sx={{ mt: 2 }}>
                  正在启动可视化服务...
                </Typography>
              </>
            ) : errorMessage ? (
              <>
                <Typography variant="body1" color="error" align="center">
                  {errorMessage}
                </Typography>
                <Button
                  variant="outlined"
                  color="primary"
                  sx={{ mt: 2 }}
                  onClick={startVisualizer}
                >
                  重试
                </Button>
              </>
            ) : (
              <Typography variant="body1" align="center">
                可视化服务未运行，请点击"启动服务"按钮开始
              </Typography>
            )}
          </Box>
        )}
        
        {isLoading && (
          <LoadingOverlay>
            <CircularProgress color="primary" />
            <Typography variant="body2" color="white" sx={{ mt: 2 }}>
              加载中...
            </Typography>
          </LoadingOverlay>
        )}
      </ViewerContent>
      
      <Snackbar
        open={showSnackbar}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} variant="filled">
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </ViewerContainer>
  );
};

export default TrameFEMViewer; 