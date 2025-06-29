/**
 * @file ModelingDemo.tsx
 * @description 建模工作台演示页面
 */

import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Stack,
  Card,
  CardContent,
  Chip,
  Alert,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  PlayArrow as DemoIcon,
  Architecture as ModelingIcon,
} from '@mui/icons-material';
import ModelingWorkbenchSimplified from '../components/modeling/ModelingWorkbenchSimplified';

interface ModelingDemoProps {
  onBack?: () => void;
}

const ModelingDemo: React.FC<ModelingDemoProps> = ({ onBack }) => {
  const [showWorkbench, setShowWorkbench] = useState(false);

  if (showWorkbench) {
    return <ModelingWorkbenchSimplified />;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack direction="row" alignItems="center" spacing={2} mb={4}>
        {onBack && (
          <Button startIcon={<BackIcon />} onClick={onBack}>
            返回
          </Button>
        )}
        <Typography variant="h4" component="h1">
          建模工作台演示
        </Typography>
      </Stack>

      <Alert severity="info" sx={{ mb: 4 }}>
        这是新开发的建模工作台功能演示，集成了属性编辑器和对象管理功能。
      </Alert>

      <Paper elevation={2} sx={{ p: 4, mb: 4 }}>
        <Stack direction="row" alignItems="center" spacing={2} mb={3}>
          <ModelingIcon color="primary" sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h5" gutterBottom>
              专业建模工作台
            </Typography>
            <Typography variant="body1" color="text.secondary">
              支持土体、隧道、临近建筑、基坑、地连墙、桩、锚栓等建模对象
            </Typography>
          </Box>
        </Stack>

        <Stack spacing={2} mb={4}>
          <Typography variant="h6">主要功能：</Typography>
          
          <Box component="ul" sx={{ pl: 2 }}>
            <Typography component="li" gutterBottom>
              🎯 <strong>多对象建模</strong> - 支持7种主要建模对象类型
            </Typography>
            <Typography component="li" gutterBottom>
              ⚙️ <strong>智能属性编辑器</strong> - 根据对象类型自动切换编辑界面
            </Typography>
            <Typography component="li" gutterBottom>
              📋 <strong>对象管理</strong> - 可视化对象列表，支持选择、删除、显示/隐藏
            </Typography>
            <Typography component="li" gutterBottom>
              🎨 <strong>Figma设计系统</strong> - 专业美观的UI界面
            </Typography>
            <Typography component="li" gutterBottom>
              📂 <strong>文件导入</strong> - 支持DXF、STEP、IGES等格式
            </Typography>
            <Typography component="li" gutterBottom>
              🔧 <strong>实时预览</strong> - 3D建模画布（后续将集成Three.js）
            </Typography>
          </Box>
        </Stack>

        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              支持的建模对象：
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
              <Chip label="地形域" color="default" variant="outlined" />
              <Chip label="基坑开挖" color="warning" variant="outlined" />
              <Chip label="地连墙" color="default" variant="outlined" />
              <Chip label="桩基础" color="info" variant="outlined" />
              <Chip label="锚栓系统" color="default" variant="outlined" />
              <Chip label="临近建筑" color="default" variant="outlined" />
              <Chip label="隧道建模" color="warning" variant="outlined" />
            </Stack>
          </CardContent>
        </Card>

        <Button
          variant="contained"
          size="large"
          startIcon={<DemoIcon />}
          onClick={() => setShowWorkbench(true)}
          sx={{ 
            background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
            px: 4,
            py: 1.5,
          }}
        >
          启动建模工作台
        </Button>
      </Paper>

      <Paper elevation={1} sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          使用说明：
        </Typography>
        <Stack spacing={1}>
          <Typography variant="body2">
            1. 点击"启动建模工作台"进入主界面
          </Typography>
          <Typography variant="body2">
            2. 在左侧工具面板选择建模工具（如地形域、基坑开挖等）
          </Typography>
          <Typography variant="body2">
            3. 点击"添加对象"创建新的建模对象
          </Typography>
          <Typography variant="body2">
            4. 在对象列表中选择对象，右侧属性面板将显示对应的编辑器
          </Typography>
          <Typography variant="body2">
            5. 修改属性参数，实时更新对象状态
          </Typography>
          <Typography variant="body2">
            6. 使用顶部工具栏保存、打开或导入模型文件
          </Typography>
        </Stack>
      </Paper>
    </Container>
  );
};

export default ModelingDemo;
