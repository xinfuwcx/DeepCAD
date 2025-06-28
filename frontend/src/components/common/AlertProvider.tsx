import React, { createContext, useContext, useState, ReactNode } from 'react';
import { 
  Snackbar, 
  Alert, 
  AlertColor,
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogContentText, 
  DialogActions, 
  Button,
  CircularProgress,
  Box,
  Typography
} from '@mui/material';

// 消息类型
interface AlertMessage {
  id: string;
  message: string;
  severity: AlertColor;
  autoHideDuration?: number;
}

// 确认对话框状态
interface ConfirmDialogState {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  severity?: AlertColor;
}

// 加载对话框状态
interface LoadingDialogState {
  open: boolean;
  message: string;
}

// 上下文接口
interface AlertContextType {
  showAlert: (message: string, severity?: AlertColor, autoHideDuration?: number) => void;
  showSuccess: (message: string, autoHideDuration?: number) => void;
  showError: (message: string, autoHideDuration?: number) => void;
  showWarning: (message: string, autoHideDuration?: number) => void;
  showInfo: (message: string, autoHideDuration?: number) => void;
  showConfirmDialog: (
    title: string,
    message: string,
    onConfirm?: () => void,
    onCancel?: () => void,
    options?: {
      confirmLabel?: string;
      cancelLabel?: string;
      severity?: AlertColor;
    }
  ) => void;
  showLoading: (message?: string) => void;
  hideLoading: () => void;
}

// 创建上下文
const AlertContext = createContext<AlertContextType>({
  showAlert: () => {},
  showSuccess: () => {},
  showError: () => {},
  showWarning: () => {},
  showInfo: () => {},
  showConfirmDialog: () => {},
  showLoading: () => {},
  hideLoading: () => {}
});

// Provider 组件属性
interface AlertProviderProps {
  children: ReactNode;
}

/**
 * 全局消息提示组件
 */
export const AlertProvider: React.FC<AlertProviderProps> = ({ children }) => {
  // 消息队列
  const [alerts, setAlerts] = useState<AlertMessage[]>([]);

  // 确认对话框状态
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    open: false,
    title: '',
    message: '',
    confirmLabel: '确认',
    cancelLabel: '取消'
  });

  // 加载对话框状态
  const [loadingDialog, setLoadingDialog] = useState<LoadingDialogState>({
    open: false,
    message: '加载中，请稍候...'
  });

  // 生成唯一ID
  const generateId = (): string => {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
  };

  // 显示消息
  const showAlert = (
    message: string,
    severity: AlertColor = 'info',
    autoHideDuration: number = 5000
  ) => {
    const id = generateId();
    const newAlert: AlertMessage = {
      id,
      message,
      severity,
      autoHideDuration
    };

    setAlerts(prevAlerts => [...prevAlerts, newAlert]);
  };

  // 显示成功消息
  const showSuccess = (message: string, autoHideDuration?: number) => {
    showAlert(message, 'success', autoHideDuration);
  };

  // 显示错误消息
  const showError = (message: string, autoHideDuration?: number) => {
    showAlert(message, 'error', autoHideDuration);
  };

  // 显示警告消息
  const showWarning = (message: string, autoHideDuration?: number) => {
    showAlert(message, 'warning', autoHideDuration);
  };

  // 显示信息消息
  const showInfo = (message: string, autoHideDuration?: number) => {
    showAlert(message, 'info', autoHideDuration);
  };

  // 关闭消息
  const handleCloseAlert = (id: string) => {
    setAlerts(prevAlerts => prevAlerts.filter(alert => alert.id !== id));
  };

  // 显示确认对话框
  const showConfirmDialog = (
    title: string,
    message: string,
    onConfirm?: () => void,
    onCancel?: () => void,
    options?: {
      confirmLabel?: string;
      cancelLabel?: string;
      severity?: AlertColor;
    }
  ) => {
    setConfirmDialog({
      open: true,
      title,
      message,
      confirmLabel: options?.confirmLabel || '确认',
      cancelLabel: options?.cancelLabel || '取消',
      onConfirm,
      onCancel,
      severity: options?.severity || 'warning'
    });
  };

  // 处理确认
  const handleConfirm = () => {
    if (confirmDialog.onConfirm) {
      confirmDialog.onConfirm();
    }
    setConfirmDialog(prev => ({ ...prev, open: false }));
  };

  // 处理取消
  const handleCancel = () => {
    if (confirmDialog.onCancel) {
      confirmDialog.onCancel();
    }
    setConfirmDialog(prev => ({ ...prev, open: false }));
  };

  // 显示加载对话框
  const showLoading = (message: string = '加载中，请稍候...') => {
    setLoadingDialog({
      open: true,
      message
    });
  };

  // 隐藏加载对话框
  const hideLoading = () => {
    setLoadingDialog(prev => ({ ...prev, open: false }));
  };

  return (
    <AlertContext.Provider
      value={{
        showAlert,
        showSuccess,
        showError,
        showWarning,
        showInfo,
        showConfirmDialog,
        showLoading,
        hideLoading
      }}
    >
      {children}

      {/* 消息提示 */}
      {alerts.map(alert => (
        <Snackbar
          key={alert.id}
          open={true}
          autoHideDuration={alert.autoHideDuration}
          onClose={() => handleCloseAlert(alert.id)}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          sx={{
            '& + &': {
              mt: '10px'
            }
          }}
        >
          <Alert
            onClose={() => handleCloseAlert(alert.id)}
            severity={alert.severity}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {alert.message}
          </Alert>
        </Snackbar>
      ))}

      {/* 确认对话框 */}
      <Dialog
        open={confirmDialog.open}
        onClose={handleCancel}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">{confirmDialog.title}</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            {confirmDialog.message}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancel} color="inherit">
            {confirmDialog.cancelLabel}
          </Button>
          <Button 
            onClick={handleConfirm} 
            color={confirmDialog.severity === 'error' ? 'error' : 'primary'} 
            variant="contained" 
            autoFocus
          >
            {confirmDialog.confirmLabel}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 加载对话框 */}
      <Dialog
        open={loadingDialog.open}
        PaperProps={{
          style: {
            backgroundColor: 'transparent',
            boxShadow: 'none',
            overflow: 'hidden'
          }
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            p: 3,
            bgcolor: 'background.paper',
            borderRadius: 2,
            boxShadow: 3
          }}
        >
          <CircularProgress color="primary" />
          <Typography variant="body2" sx={{ mt: 2 }}>
            {loadingDialog.message}
          </Typography>
        </Box>
      </Dialog>
    </AlertContext.Provider>
  );
};

/**
 * 使用消息提示钩子
 */
export const useAlert = () => {
  const context = useContext(AlertContext);

  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }

  return context;
};

export default AlertProvider; 