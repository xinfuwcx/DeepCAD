import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  FormLabel,
  RadioGroup,
  Radio,
  FormControlLabel,
  Typography,
  Snackbar,
  Alert
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import ShareIcon from '@mui/icons-material/Share';
import ImageIcon from '@mui/icons-material/Image';
import TableChartIcon from '@mui/icons-material/TableChart';

interface ExportPanelProps {
  onExportImage: () => Promise<string>;
  onExportData: () => Promise<Blob>;
  modelName?: string;
}

/**
 * 渗流分析结果导出面板
 * 提供图像和数据导出功能
 */
const ExportPanel: React.FC<ExportPanelProps> = ({
  onExportImage,
  onExportData,
  modelName = '渗流分析模型'
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [exportType, setExportType] = useState<'image' | 'data'>('image');
  const [filename, setFilename] = useState(`${modelName}_${new Date().toISOString().split('T')[0]}`);
  const [resolution, setResolution] = useState<'high' | 'medium' | 'low'>('high');
  const [format, setFormat] = useState<'png' | 'jpg' | 'csv' | 'xlsx'>('png');
  const [loading, setLoading] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  // 打开导出对话框
  const handleOpenDialog = (type: 'image' | 'data') => {
    setExportType(type);
    setFormat(type === 'image' ? 'png' : 'csv');
    setDialogOpen(true);
  };

  // 处理导出操作
  const handleExport = async () => {
    setLoading(true);
    try {
      if (exportType === 'image') {
        const imageUrl = await onExportImage();
        
        // 创建临时链接并下载
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = `${filename}.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setSnackbarMessage('图像已成功导出');
        setSnackbarSeverity('success');
      } else {
        const data = await onExportData();
        
        // 创建数据URL并下载
        const url = URL.createObjectURL(data);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        setSnackbarMessage('数据已成功导出');
        setSnackbarSeverity('success');
      }
    } catch (error) {
      console.error('导出失败:', error);
      setSnackbarMessage('导出失败，请重试');
      setSnackbarSeverity('error');
    } finally {
      setLoading(false);
      setDialogOpen(false);
      setSnackbarOpen(true);
    }
  };

  return (
    <>
      <Box
        sx={{
          position: 'absolute',
          top: 20,
          right: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 1
        }}
      >
        <Button
          variant="contained"
          color="primary"
          startIcon={<ImageIcon />}
          onClick={() => handleOpenDialog('image')}
          size="small"
        >
          导出图像
        </Button>
        
        <Button
          variant="contained"
          color="primary"
          startIcon={<TableChartIcon />}
          onClick={() => handleOpenDialog('data')}
          size="small"
        >
          导出数据
        </Button>
      </Box>
      
      {/* 导出设置对话框 */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>
          {exportType === 'image' ? '导出渗流分析图像' : '导出渗流分析数据'}
        </DialogTitle>
        
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <TextField
              label="文件名"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              fullWidth
              margin="dense"
            />
            
            {exportType === 'image' && (
              <FormControl component="fieldset" sx={{ mt: 2 }}>
                <FormLabel component="legend">图像质量</FormLabel>
                <RadioGroup
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value as 'high' | 'medium' | 'low')}
                >
                  <FormControlLabel value="high" control={<Radio />} label="高 (2400×1600)" />
                  <FormControlLabel value="medium" control={<Radio />} label="中 (1200×800)" />
                  <FormControlLabel value="low" control={<Radio />} label="低 (600×400)" />
                </RadioGroup>
              </FormControl>
            )}
            
            <FormControl component="fieldset" sx={{ mt: 2 }}>
              <FormLabel component="legend">文件格式</FormLabel>
              <RadioGroup
                value={format}
                onChange={(e) => setFormat(e.target.value as any)}
              >
                {exportType === 'image' ? (
                  <>
                    <FormControlLabel value="png" control={<Radio />} label="PNG (推荐)" />
                    <FormControlLabel value="jpg" control={<Radio />} label="JPG" />
                  </>
                ) : (
                  <>
                    <FormControlLabel value="csv" control={<Radio />} label="CSV (通用)" />
                    <FormControlLabel value="xlsx" control={<Radio />} label="Excel (XLSX)" />
                  </>
                )}
              </RadioGroup>
            </FormControl>
            
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
              注意：导出的{exportType === 'image' ? '图像' : '数据'}将包含当前视图中的所有可见信息
            </Typography>
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>取消</Button>
          <Button 
            onClick={handleExport}
            color="primary"
            variant="contained"
            startIcon={<DownloadIcon />}
            disabled={loading}
          >
            {loading ? '处理中...' : '导出'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* 结果提示 */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity={snackbarSeverity}
          variant="filled"
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  );
};

export default ExportPanel; 