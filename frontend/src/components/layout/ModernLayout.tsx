/**
 * @file ModernLayout.tsx
 * @description 现代化主布局组件
 * @author GitHub Copilot - 设计大咖
 */

import React, { useState } from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Typography,
  Divider,
  Avatar,
  Chip,
  useTheme,
  useMediaQuery,
  Badge,
  Tooltip,
  Menu,
  MenuItem,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  Engineering,
  Timeline,
  ViewInAr,
  Analytics,
  Settings,
  Notifications,
  AccountCircle,
  Brightness4,
  Brightness7,
  ChevronLeft,
  Home,
  Build,
  BarChart,
  Memory,
  Science,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { defaultTokens } from '../../styles/tokens/defaultTokens';

interface ModernLayoutProps {
  children: React.ReactNode;
  darkMode: boolean;
  onThemeToggle: () => void;
}

const drawerWidth = 280;

// 导航菜单配置
const navigationItems = [
  {
    text: '工作台',
    icon: <Dashboard />,
    path: '/dashboard',
    description: '项目概览与快速访问',
  },
  {
    text: '几何建模',
    icon: <ViewInAr />,
    path: '/modeling',
    description: '3D几何设计与编辑',
    badge: 'Pro',
  },
  {
    text: '网格生成',
    icon: <Engineering />,
    path: '/meshing',
    description: 'Netgen高质量网格',
  },
  {
    text: 'FEM分析',
    icon: <Build />,
    path: '/fem-analysis',
    description: 'Kratos有限元分析',
    badge: 'Hot',
  },
  {
    text: '物理AI',
    icon: <Science />,
    path: '/physics-ai',
    description: 'PINN智能分析',
    badge: 'Beta',
  },
  {
    text: '结果可视化',
    icon: <BarChart />,
    path: '/visualization',
    description: '交互式结果展示',
  },
  {
    text: '项目管理',
    icon: <Memory />,
    path: '/projects',
    description: '项目文件管理',
  },
];

const ModernLayout: React.FC<ModernLayoutProps> = ({
  children,
  darkMode,
  onThemeToggle,
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [drawerOpen, setDrawerOpen] = useState(!isMobile);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [notificationCount] = useState(3);

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const isActivePath = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path);
  };

  const getBadgeColor = (badge: string) => {
    switch (badge) {
      case 'Pro': return 'primary';
      case 'Hot': return 'error';
      case 'Beta': return 'warning';
      default: return 'default';
    }
  };

  const DrawerContent = () => (
    <Box sx={{ width: drawerWidth, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Logo区域 */}
      <Box
        sx={{
          p: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          background: darkMode 
            ? defaultTokens.colors.gradient.dark 
            : defaultTokens.colors.gradient.primary,
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.1"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E") repeat',
            opacity: 0.1,
          },
        }}
      >
        <Avatar
          sx={{
            width: 40,
            height: 40,
            background: 'rgba(255,255,255,0.2)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <Engineering />
        </Avatar>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
            深基坑CAE
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.9 }}>
            专业工程分析平台
          </Typography>
        </Box>
      </Box>

      {/* 导航菜单 */}
      <Box sx={{ flex: 1, px: 1, py: 2 }}>
        <List>
          {navigationItems.map((item) => {
            const isActive = isActivePath(item.path);
            return (
              <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
                <Tooltip
                  title={item.description}
                  placement="right"
                  arrow
                  enterDelay={500}
                >
                  <ListItemButton
                    onClick={() => navigate(item.path)}
                    sx={{
                      borderRadius: defaultTokens.borderRadius.lg,
                      mx: 1,
                      minHeight: 48,
                      background: isActive 
                        ? `linear-gradient(90deg, ${theme.palette.primary.main}20, ${theme.palette.primary.main}10)`
                        : 'transparent',
                      border: isActive ? `1px solid ${theme.palette.primary.main}40` : '1px solid transparent',
                      transition: defaultTokens.transitions.smooth,
                      '&:hover': {
                        background: isActive 
                          ? `linear-gradient(90deg, ${theme.palette.primary.main}30, ${theme.palette.primary.main}15)`
                          : `${theme.palette.action.hover}`,
                        transform: 'translateX(4px)',
                      },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        color: isActive ? theme.palette.primary.main : 'inherit',
                        minWidth: 40,
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.text}
                      sx={{
                        '& .MuiListItemText-primary': {
                          fontWeight: isActive ? 600 : 400,
                          color: isActive ? theme.palette.primary.main : 'inherit',
                        },
                      }}
                    />
                    {item.badge && (
                      <Chip
                        label={item.badge}
                        size="small"
                        color={getBadgeColor(item.badge) as any}
                        sx={{
                          height: 20,
                          fontSize: '0.7rem',
                          fontWeight: 600,
                        }}
                      />
                    )}
                  </ListItemButton>
                </Tooltip>
              </ListItem>
            );
          })}
        </List>

        <Divider sx={{ my: 2, mx: 2 }} />

        {/* 快速设置 */}
        <Box sx={{ px: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            快速设置
          </Typography>
          <FormControlLabel
            control={<Switch checked={darkMode} onChange={onThemeToggle} size="small" />}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {darkMode ? <Brightness4 fontSize="small" /> : <Brightness7 fontSize="small" />}
                <Typography variant="body2">深色模式</Typography>
              </Box>
            }
            sx={{ mb: 1 }}
          />
        </Box>
      </Box>

      {/* 用户信息 */}
      <Box
        sx={{
          p: 2,
          borderTop: `1px solid ${theme.palette.divider}`,
          background: theme.palette.background.paper,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ width: 36, height: 36, background: defaultTokens.colors.gradient.primary }}>
            <AccountCircle />
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle2" noWrap>
              工程师
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              admin@example.com
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* 顶部应用栏 */}
      <AppBar
        position="fixed"
        sx={{
          zIndex: theme.zIndex.drawer + 1,
          background: darkMode 
            ? `${defaultTokens.colors.dark.surface}F0` 
            : `${defaultTokens.colors.light.surface}F0`,
          backdropFilter: `blur(${defaultTokens.blur.backdrop})`,
          borderBottom: `1px solid ${theme.palette.divider}`,
          color: theme.palette.text.primary,
        }}
      >
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={handleDrawerToggle}
            sx={{ mr: 2 }}
          >
            {drawerOpen ? <ChevronLeft /> : <MenuIcon />}
          </IconButton>

          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600 }}>
            {navigationItems.find(item => isActivePath(item.path))?.text || '深基坑分析系统'}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title="通知">
              <IconButton color="inherit">
                <Badge badgeContent={notificationCount} color="error">
                  <Notifications />
                </Badge>
              </IconButton>
            </Tooltip>

            <Tooltip title="设置">
              <IconButton color="inherit">
                <Settings />
              </IconButton>
            </Tooltip>

            <Tooltip title="用户菜单">
              <IconButton color="inherit" onClick={handleUserMenuOpen}>
                <AccountCircle />
              </IconButton>
            </Tooltip>

            <Menu
              anchorEl={userMenuAnchor}
              open={Boolean(userMenuAnchor)}
              onClose={handleUserMenuClose}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <MenuItem onClick={handleUserMenuClose}>个人资料</MenuItem>
              <MenuItem onClick={handleUserMenuClose}>账户设置</MenuItem>
              <Divider />
              <MenuItem onClick={handleUserMenuClose}>退出登录</MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* 侧边抽屉 */}
      <Drawer
        variant={isMobile ? 'temporary' : 'persistent'}
        open={drawerOpen}
        onClose={handleDrawerToggle}
        sx={{
          width: drawerOpen ? drawerWidth : 0,
          flexShrink: 0,
          transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.standard,
          }),
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            borderRight: `1px solid ${theme.palette.divider}`,
            background: darkMode 
              ? `${defaultTokens.colors.dark.surface}F8`
              : `${defaultTokens.colors.light.surface}F8`,
            backdropFilter: `blur(${defaultTokens.blur.backdrop})`,
          },
        }}
      >
        <Toolbar /> {/* 为顶部栏留出空间 */}
        <DrawerContent />
      </Drawer>

      {/* 主内容区域 */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: theme.transitions.create('margin', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.standard,
          }),
        }}
      >
        <Toolbar /> {/* 为顶部栏留出空间 */}
        <Box
          sx={{
            flex: 1,
            overflow: 'auto',
            p: 3,
            background: darkMode 
              ? defaultTokens.colors.dark.background
              : `linear-gradient(135deg, ${defaultTokens.colors.light.background} 0%, ${defaultTokens.colors.light.backgroundSecondary} 100%)`,
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default ModernLayout;
