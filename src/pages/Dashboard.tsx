/**
 * 仪表盘页面
 * 
 * 显示项目概览、最近文件和系统状态
 */

import React from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  CardHeader, 
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import BarChartIcon from '@mui/icons-material/BarChart';
import TerrainIcon from '@mui/icons-material/Terrain';
import WallIcon from '@mui/icons-material/Wall';
import SettingsIcon from '@mui/icons-material/Settings';

const Dashboard: React.FC = () => {
  // 模拟最近项目数据
  const recentProjects = [
    { id: 1, name: '北京地铁10号线深基坑工程', date: '2023-10-15' },
    { id: 2, name: '上海某商业中心地下室基坑', date: '2023-09-28' },
    { id: 3, name: '广州某超高层建筑基础工程', date: '2023-08-12' }
  ];
  
  // 模拟系统状态数据
  const systemStatus = {
    cpuUsage: '32%',
    memoryUsage: '1.8GB / 8GB',
    diskSpace: '120GB / 500GB',
    lastBackup: '2023-10-20 08:30'
  };
  
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        欢迎使用深基坑CAE系统
      </Typography>
      
      <Typography variant="body1" color="text.secondary" paragraph>
        基于FreeCAD架构设计的专业深基坑分析软件，集成了地质建模、支护结构设计、有限元分析和结果可视化功能。
      </Typography>
      
      <Grid container spacing={3} sx={{ mt: 2 }}>
        {/* 快速操作卡片 */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="快速操作" />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Button 
                    variant="outlined" 
                    startIcon={<FolderIcon />} 
                    fullWidth
                    sx={{ justifyContent: 'flex-start', mb: 2 }}
                  >
                    新建项目
                  </Button>
                  
                  <Button 
                    variant="outlined" 
                    startIcon={<InsertDriveFileIcon />} 
                    fullWidth
                    sx={{ justifyContent: 'flex-start', mb: 2 }}
                  >
                    打开项目
                  </Button>
                  
                  <Button 
                    variant="outlined" 
                    startIcon={<BarChartIcon />} 
                    fullWidth
                    sx={{ justifyContent: 'flex-start' }}
                  >
                    查看示例
                  </Button>
                </Grid>
                
                <Grid item xs={6}>
                  <Button 
                    variant="outlined" 
                    startIcon={<TerrainIcon />} 
                    fullWidth
                    sx={{ justifyContent: 'flex-start', mb: 2 }}
                  >
                    地质建模
                  </Button>
                  
                  <Button 
                    variant="outlined" 
                    startIcon={<WallIcon />} 
                    fullWidth
                    sx={{ justifyContent: 'flex-start', mb: 2 }}
                  >
                    支护设计
                  </Button>
                  
                  <Button 
                    variant="outlined" 
                    startIcon={<SettingsIcon />} 
                    fullWidth
                    sx={{ justifyContent: 'flex-start' }}
                  >
                    系统设置
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
        
        {/* 最近项目卡片 */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardHeader 
              title="最近项目" 
              action={
                <Button size="small" color="primary">
                  查看全部
                </Button>
              }
            />
            <CardContent>
              <List>
                {recentProjects.map((project, index) => (
                  <React.Fragment key={project.id}>
                    {index > 0 && <Divider />}
                    <ListItem button>
                      <ListItemIcon>
                        <InsertDriveFileIcon />
                      </ListItemIcon>
                      <ListItemText 
                        primary={project.name} 
                        secondary={`上次修改: ${project.date}`} 
                      />
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
        
        {/* 系统状态卡片 */}
        <Grid item xs={12}>
          <Card>
            <CardHeader title="系统状态" />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="subtitle2" color="text.secondary">
                    CPU使用率
                  </Typography>
                  <Typography variant="h6">
                    {systemStatus.cpuUsage}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="subtitle2" color="text.secondary">
                    内存使用
                  </Typography>
                  <Typography variant="h6">
                    {systemStatus.memoryUsage}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="subtitle2" color="text.secondary">
                    磁盘空间
                  </Typography>
                  <Typography variant="h6">
                    {systemStatus.diskSpace}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="subtitle2" color="text.secondary">
                    上次备份
                  </Typography>
                  <Typography variant="h6">
                    {systemStatus.lastBackup}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard; 