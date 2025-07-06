import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Typography,
  Box,
  Tabs,
  Tab,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import MeshSettingsForm, { MeshSettings } from '../forms/MeshSettingsForm';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`mesh-settings-tabpanel-${index}`}
      aria-labelledby={`mesh-settings-tab-${index}`}
      {...other}
      style={{ height: '100%', overflow: 'auto' }}
    >
      {value === index && (
        <Box sx={{ p: 1, height: '100%' }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `mesh-settings-tab-${index}`,
    'aria-controls': `mesh-settings-tabpanel-${index}`,
  };
}

interface MeshSettingsModalProps {
  open: boolean;
  onClose: () => void;
  initialSettings?: Partial<MeshSettings>;
  onApply: (settings: MeshSettings) => void;
}

const MeshSettingsModal: React.FC<MeshSettingsModalProps> = ({
  open,
  onClose,
  initialSettings,
  onApply,
}) => {
  const [tabValue, setTabValue] = useState(0);
  const [settings, setSettings] = useState<MeshSettings | null>(null);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleSettingsChange = (newSettings: MeshSettings) => {
    setSettings(newSettings);
  };

  const handleApply = () => {
    if (settings) {
      onApply(settings);
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          height: '80vh',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6">网格设置</Typography>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="mesh settings tabs">
          <Tab label="基本参数" {...a11yProps(0)} />
          <Tab label="高级设置" {...a11yProps(1)} />
          <Tab label="预设方案" {...a11yProps(2)} />
        </Tabs>
      </Box>

      <DialogContent sx={{ p: 0, flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TabPanel value={tabValue} index={0}>
          <MeshSettingsForm
            initialSettings={initialSettings}
            onSettingsChange={handleSettingsChange}
            onApply={handleApply}
          />
        </TabPanel>
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ p: 2 }}>
            <Typography variant="body1">
              高级网格设置选项，包括自适应网格细化、边界层网格和特殊区域处理等。
            </Typography>
            {/* 这里可以添加更多高级设置选项 */}
          </Box>
        </TabPanel>
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ p: 2 }}>
            <Typography variant="body1">
              预设网格方案，适用于不同类型的深基坑工程：
            </Typography>
            <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <Button variant="outlined">标准深基坑</Button>
              <Button variant="outlined">高精度模型</Button>
              <Button variant="outlined">快速计算</Button>
              <Button variant="outlined">大型工程</Button>
              <Button variant="outlined">复杂地质条件</Button>
            </Box>
          </Box>
        </TabPanel>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" color="primary" onClick={handleApply}>
          应用
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MeshSettingsModal; 