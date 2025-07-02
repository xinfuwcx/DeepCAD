import React, { useState } from 'react';
import { Box, Button, Typography, Paper, Grid, TextField, CircularProgress, Alert, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useTheme } from '@mui/material/styles';
import axios from 'axios';
import { API_BASE_URL } from '../../../src/config/config';

// 初始的V3数据模型，与后端Pydantic模型对应
const initialV3Model = {
  project_name: "V3参数化测试项目",
  profile: {
    width: 10.0,
    depth: 15.0,
    retained_height: 5.0,
  },
  soil_layers: [
    { name: "① 杂填土", height: 2.0, unit_weight: 18.0, elastic_modulus: 5000, poisson_ratio: 0.35 },
    { name: "② 粉质黏土", height: 8.0, unit_weight: 19.5, elastic_modulus: 12000, poisson_ratio: 0.3 },
    { name: "③ 砂卵石", height: 20.0, unit_weight: 20.5, elastic_modulus: 40000, poisson_ratio: 0.25 },
  ],
};

const V3ModelRunner: React.FC = () => {
  const theme = useTheme();
  const [model, setModel] = useState(initialV3Model);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<any>(null);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setModel(prev => ({
      ...prev,
      profile: {
        ...prev.profile,
        [e.target.name]: parseFloat(e.target.value) || 0,
      }
    }));
  };

  const handleLayerChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const newLayers = [...model.soil_layers];
    const field = e.target.name as keyof typeof newLayers[0];
    const value = e.target.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value;

    (newLayers[index] as any)[field] = value;
    setModel(prev => ({ ...prev, soil_layers: newLayers }));
  };
  
  const handleRunAnalysis = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);
    try {
      const res = await axios.post(`${API_BASE_URL}/compute/v3/run-analysis`, model);
      setResponse(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || '执行分析时发生未知错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 3, backgroundColor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}` }}>
      <Typography variant="h5" gutterBottom>V3 内存直通分析</Typography>
      <Typography variant="body2" sx={{ mb: 3 }}>
        在此处修改参数化模型，点击按钮后，前端会将完整的模型JSON对象发送到后端。后端将在内存中直接构建计算模型，无需任何文件交换。
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Typography variant="h6" sx={{ mb: 2 }}>基坑剖面</Typography>
          <TextField name="width" label="宽度 (m)" type="number" value={model.profile.width} onChange={handleProfileChange} fullWidth sx={{ mb: 2 }} />
          <TextField name="depth" label="深度 (m)" type="number" value={model.profile.depth} onChange={handleProfileChange} fullWidth />
        </Grid>
        <Grid item xs={12} md={6}>
          <Typography variant="h6" sx={{ mb: 2 }}>土层参数</Typography>
          {model.soil_layers.map((layer, index) => (
            <Accordion key={index} sx={{backgroundImage: 'none'}}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>{layer.name}</AccordionSummary>
              <AccordionDetails>
                <TextField name="height" label="厚度 (m)" type="number" size="small" value={layer.height} onChange={(e) => handleLayerChange(index, e)} fullWidth sx={{ mb: 1 }}/>
                <TextField name="unit_weight" label="重度 (kN/m³)" type="number" size="small" value={layer.unit_weight} onChange={(e) => handleLayerChange(index, e)} fullWidth />
              </AccordionDetails>
            </Accordion>
          ))}
        </Grid>
      </Grid>
      
      <Button
        variant="contained"
        color="primary"
        onClick={handleRunAnalysis}
        disabled={loading}
        startIcon={loading && <CircularProgress size={20} />}
        sx={{ mt: 3 }}
      >
        {loading ? '正在构建内存模型...' : '运行V3内存分析'}
      </Button>

      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      {response && (
        <Alert severity="success" sx={{ mt: 2 }}>
          <Typography variant="subtitle2">后端成功响应:</Typography>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: '12px' }}>
            {JSON.stringify(response, null, 2)}
          </pre>
        </Alert>
      )}
    </Paper>
  );
};

export default V3ModelRunner; 