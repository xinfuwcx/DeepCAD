import React, { useState, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Tooltip,
  Chip
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  CloudDownload as CloudDownloadIcon,
  Delete as DeleteIcon,
  FilePresent as FilePresentIcon,
  Description as DescriptionIcon,
  InsertDriveFile as InsertDriveFileIcon,
  Folder as FolderIcon,
  Check as CheckIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

// 导入文件类型
type ImportFileType = 'MESH' | 'MODEL' | 'RESULT' | 'PROJECT';

// 导入文件接口
interface ImportFile {
  id: string;
  name: string;
  type: ImportFileType;
  size: number;
  uploadedAt: Date;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'ERROR';
  error?: string;
}

// 导出文件接口
interface ExportFile {
  id: string;
  name: string;
  type: ImportFileType;
  size: number;
  createdAt: Date;
  url: string;
}

/**
 * 数据导入导出组件
 * 用于导入导出项目数据
 */
const DataImportExport: React.FC = () => {
  // 文件输入引用
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 状态
  const [importFiles, setImportFiles] = useState<ImportFile[]>([]);
  const [exportFiles, setExportFiles] = useState<ExportFile[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // 导出对话框
  const [exportDialogOpen, setExportDialogOpen] = useState<boolean>(false);
  const [exportName, setExportName] = useState<string>('');
  const [exportType, setExportType] = useState<ImportFileType>('PROJECT');
  
  // 处理文件选择
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    setLoading(true);
    setError(null);
    
    // 处理选择的文件
    const newFiles: ImportFile[] = Array.from(files).map(file => {
      // 根据文件扩展名确定类型
      let type: ImportFileType = 'PROJECT';
      const extension = file.name.split('.').pop()?.toLowerCase();
      
      if (extension === 'msh' || extension === 'vtk') {
        type = 'MESH';
      } else if (extension === 'json' || extension === 'xml') {
        type = 'MODEL';
      } else if (extension === 'csv' || extension === 'dat') {
        type = 'RESULT';
      }
      
      return {
        id: `import-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        type,
        size: file.size,
        uploadedAt: new Date(),
        status: 'PENDING'
      };
    });
    
    // 添加新文件到列表
    setImportFiles(prev => [...prev, ...newFiles]);
    
    // 模拟上传过程
    simulateFileProcessing(newFiles);
    
    // 重置文件输入
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // 模拟文件处理过程
  const simulateFileProcessing = (files: ImportFile[]) => {
    // 将文件状态更新为处理中
    setTimeout(() => {
      setImportFiles(prev => 
        prev.map(file => 
          files.some(f => f.id === file.id)
            ? { ...file, status: 'PROCESSING' }
            : file
        )
      );
      
      // 模拟处理完成
      setTimeout(() => {
        setImportFiles(prev => 
          prev.map(file => {
            if (files.some(f => f.id === file.id)) {
              // 随机决定是否成功
              const success = Math.random() > 0.2;
              return {
                ...file,
                status: success ? 'COMPLETED' : 'ERROR',
                error: success ? undefined : '文件格式不支持或数据错误'
              };
            }
            return file;
          })
        );
        
        setLoading(false);
      }, 2000);
    }, 1000);
  };
  
  // 处理删除导入文件
  const handleDeleteImportFile = (id: string) => {
    setImportFiles(prev => prev.filter(file => file.id !== id));
  };
  
  // 处理删除导出文件
  const handleDeleteExportFile = (id: string) => {
    setExportFiles(prev => prev.filter(file => file.id !== id));
  };
  
  // 处理打开导出对话框
  const handleOpenExportDialog = () => {
    setExportDialogOpen(true);
    setExportName(`project-export-${new Date().toISOString().split('T')[0]}`);
    setExportType('PROJECT');
  };
  
  // 处理关闭导出对话框
  const handleCloseExportDialog = () => {
    setExportDialogOpen(false);
  };
  
  // 处理导出
  const handleExport = () => {
    if (!exportName.trim()) return;
    
    setLoading(true);
    
    // 模拟导出过程
    setTimeout(() => {
      const newExportFile: ExportFile = {
        id: `export-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: exportName,
        type: exportType,
        size: Math.floor(Math.random() * 10000000), // 随机文件大小
        createdAt: new Date(),
        url: '#'
      };
      
      setExportFiles(prev => [...prev, newExportFile]);
      setExportDialogOpen(false);
      setLoading(false);
    }, 1500);
  };
  
  // 获取文件大小显示
  const getFileSizeDisplay = (size: number): string => {
    if (size < 1024) {
      return `${size} B`;
    } else if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(2)} KB`;
    } else {
      return `${(size / (1024 * 1024)).toFixed(2)} MB`;
    }
  };
  
  // 获取文件类型显示
  const getFileTypeDisplay = (type: ImportFileType): string => {
    switch (type) {
      case 'MESH':
        return '网格文件';
      case 'MODEL':
        return '模型文件';
      case 'RESULT':
        return '结果文件';
      case 'PROJECT':
        return '项目文件';
      default:
        return '未知类型';
    }
  };
  
  // 获取文件类型图标
  const getFileTypeIcon = (type: ImportFileType) => {
    switch (type) {
      case 'MESH':
        return <InsertDriveFileIcon color="primary" />;
      case 'MODEL':
        return <DescriptionIcon color="secondary" />;
      case 'RESULT':
        return <FilePresentIcon color="success" />;
      case 'PROJECT':
        return <FolderIcon color="warning" />;
      default:
        return <FilePresentIcon />;
    }
  };
  
  // 获取文件状态显示
  const getFileStatusDisplay = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Chip size="small" label="等待处理" color="default" />;
      case 'PROCESSING':
        return <Chip size="small" label="处理中" color="primary" icon={<CircularProgress size={12} />} />;
      case 'COMPLETED':
        return <Chip size="small" label="已完成" color="success" icon={<CheckIcon />} />;
      case 'ERROR':
        return <Chip size="small" label="错误" color="error" icon={<ErrorIcon />} />;
      default:
        return <Chip size="small" label={status} />;
    }
  };
  
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        数据导入导出
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Paper sx={{ mb: 4, p: 2 }}>
        <Typography variant="h6" gutterBottom>
          导入数据
        </Typography>
        
        <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<CloudUploadIcon />}
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
          >
            选择文件
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => setImportFiles([])}
            disabled={importFiles.length === 0 || loading}
          >
            清除列表
          </Button>
        </Box>
        
        {importFiles.length > 0 ? (
          <List>
            {importFiles.map((file) => (
              <ListItem key={file.id} divider>
                <ListItemIcon>
                  {getFileTypeIcon(file.type)}
                </ListItemIcon>
                <ListItemText
                  primary={file.name}
                  secondary={
                    <>
                      {getFileTypeDisplay(file.type)} · {getFileSizeDisplay(file.size)} · {file.uploadedAt.toLocaleString()}
                      {file.error && (
                        <Typography color="error" variant="caption" display="block">
                          错误: {file.error}
                        </Typography>
                      )}
                    </>
                  }
                />
                <ListItemSecondaryAction>
                  {getFileStatusDisplay(file.status)}
                  <Tooltip title="删除">
                    <IconButton
                      edge="end"
                      onClick={() => handleDeleteImportFile(file.id)}
                      disabled={file.status === 'PROCESSING'}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary">
              没有导入的文件
            </Typography>
          </Box>
        )}
      </Paper>
      
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          导出数据
        </Typography>
        
        <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<CloudDownloadIcon />}
            onClick={handleOpenExportDialog}
            disabled={loading}
          >
            导出数据
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => setExportFiles([])}
            disabled={exportFiles.length === 0 || loading}
          >
            清除列表
          </Button>
        </Box>
        
        {exportFiles.length > 0 ? (
          <List>
            {exportFiles.map((file) => (
              <ListItem key={file.id} divider>
                <ListItemIcon>
                  {getFileTypeIcon(file.type)}
                </ListItemIcon>
                <ListItemText
                  primary={file.name}
                  secondary={
                    <>
                      {getFileTypeDisplay(file.type)} · {getFileSizeDisplay(file.size)} · {file.createdAt.toLocaleString()}
                    </>
                  }
                />
                <ListItemSecondaryAction>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<CloudDownloadIcon />}
                    onClick={() => window.open(file.url, '_blank')}
                    sx={{ mr: 1 }}
                  >
                    下载
                  </Button>
                  <Tooltip title="删除">
                    <IconButton
                      edge="end"
                      onClick={() => handleDeleteExportFile(file.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary">
              没有导出的文件
            </Typography>
          </Box>
        )}
      </Paper>
      
      {/* 导出对话框 */}
      <Dialog open={exportDialogOpen} onClose={handleCloseExportDialog}>
        <DialogTitle>导出数据</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            请选择要导出的数据类型并设置文件名
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="文件名"
            fullWidth
            variant="outlined"
            value={exportName}
            onChange={(e) => setExportName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth>
            <InputLabel>导出类型</InputLabel>
            <Select
              value={exportType}
              label="导出类型"
              onChange={(e) => setExportType(e.target.value as ImportFileType)}
            >
              <MenuItem value="PROJECT">完整项目</MenuItem>
              <MenuItem value="MODEL">模型数据</MenuItem>
              <MenuItem value="MESH">网格数据</MenuItem>
              <MenuItem value="RESULT">计算结果</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseExportDialog}>取消</Button>
          <Button
            onClick={handleExport}
            variant="contained"
            disabled={!exportName.trim() || loading}
          >
            {loading ? <CircularProgress size={24} /> : '导出'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DataImportExport; 