import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Button,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  LinearProgress,
  Snackbar,
  Alert
} from '@mui/material';
import { ModelTraining, PlayCircleFilled, AddCircle, Storage, Refresh } from '@mui/icons-material';
import { physicsAIService, SurrogateModel } from '../../services/physicsAIService';

/**
 * 代理模型管理器UI组件
 */
const SurrogateModelManager: React.FC = () => {
  const [models, setModels] = useState<SurrogateModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchModels = useCallback(async () => {
    try {
      setLoading(true);
      const fetchedModels = await physicsAIService.getSurrogateModels();
      setModels(fetchedModels);
    } catch (e: any) {
      setError(e.message || '获取模型列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  const handleTrainModel = async (modelId: string) => {
    try {
        const result = await physicsAIService.startModelTraining(modelId);
        // 更新模型状态为 'training' 并关联jobId，以便轮询
        setModels(prev => prev.map(m => m.id === modelId ? { ...m, status: 'training', trainingJobId: result.jobId } : m));
        // 这里可以启动一个全局的Job Poller，或者在模型行内显示进度
        // 为简化，我们暂时只更新状态，并假定后端会更新它
    } catch (e: any) {
        setError(e.message || '启动训练失败');
    }
  };
  
  const handleAddNewModel = () => {
    // TODO: 实现一个创建新模型的对话框
    alert('此功能将打开一个对话框来创建新的代理模型。');
  };
  
  // 简化的轮询逻辑：每10秒刷新一次列表来获取最新状态
  useEffect(() => {
    const interval = setInterval(() => {
        const isTraining = models.some(m => m.status === 'training');
        if (isTraining) {
            fetchModels();
        }
    }, 10000);
    return () => clearInterval(interval);
  }, [models, fetchModels]);

  return (
    <Card>
      <CardHeader
        title="代理模型管理器"
        subheader="训练和管理用于快速预测的AI代理模型"
        avatar={<Storage fontSize="large" color="secondary" />}
        action={
          <Box>
            <Tooltip title="刷新模型列表">
              <IconButton onClick={fetchModels} disabled={loading}>
                <Refresh />
              </IconButton>
            </Tooltip>
            <Button
              variant="contained"
              color="secondary"
              startIcon={<AddCircle />}
              onClick={handleAddNewModel}
              sx={{ ml: 1 }}
            >
              新建模型
            </Button>
          </Box>
        }
      />
      <CardContent>
        {loading && <LinearProgress />}
        <TableContainer component={Paper} sx={{ mt: loading ? 1 : 0 }}>
          <Table sx={{ minWidth: 650 }} aria-label="代理模型列表">
            <TableHead>
              <TableRow>
                <TableCell>模型名称</TableCell>
                <TableCell>模型类型</TableCell>
                <TableCell>状态</TableCell>
                <TableCell>精度</TableCell>
                <TableCell>训练时间</TableCell>
                <TableCell align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {models.map((model) => (
                <TableRow key={model.id}>
                  <TableCell component="th" scope="row">
                    {model.name}
                  </TableCell>
                  <TableCell>{model.type}</TableCell>
                  <TableCell>
                    <Chip 
                      label={model.status} 
                      color={
                        model.status === 'trained' ? 'success' :
                        model.status === 'training' ? 'primary' :
                        model.status === 'failed' ? 'error' :
                        'default'
                      }
                      size="small"
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </TableCell>
                  <TableCell>{model.accuracy ? model.accuracy.toFixed(2) : 'N/A'}</TableCell>
                  <TableCell>{model.trainingTime || 'N/A'}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="训练模型">
                      <span>
                        <IconButton 
                          onClick={() => handleTrainModel(model.id)} 
                          disabled={model.status === 'training' || model.status === 'trained'}
                          color="primary"
                        >
                          <ModelTraining />
                        </IconButton>
                      </span>
                    </Tooltip>
                     <Tooltip title="使用模型">
                      <span>
                        <IconButton 
                          disabled={model.status !== 'trained'} 
                          color="secondary"
                        >
                          <PlayCircleFilled />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError(null)}>
            <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>
                {error}
            </Alert>
        </Snackbar>
      </CardContent>
    </Card>
  );
};

export default SurrogateModelManager; 