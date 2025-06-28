import React, { useState } from 'react';
import { 
  Box, 
  AppBar, 
  Toolbar, 
  Drawer, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText, 
  ListItemButton,
  Divider, 
  IconButton, 
  Typography, 
  useTheme, 
  CssBaseline,
  Tooltip,
  Avatar,
  Menu,
  MenuItem,
  ListSubheader
} from '@mui/material';
import { 
  MenuOutlined, 
  ChevronLeft, 
  Dashboard, 
  Terrain,
  AccountTree,
  Science,
  BarChart,
  Settings,
  Help,
  AccountCircle,
  Notifications,
  Construction,
  StraightenOutlined
} from '@mui/icons-material';
import { styled } from '@mui/system';
import Logo from './Logo';

// 侧边栏宽度
const drawerWidth = 260;

// 自定义应用栏样式
const StyledAppBar = styled(AppBar, {
  shouldForwardProp: (prop) => prop !== 'open',
})<{ open?: boolean }>(({ theme, open }) => ({
  zIndex: theme.zIndex.drawer + 1,
  transition: theme.transitions.create(['width', 'margin'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(open && {
    marginLeft: drawerWidth,
    width: `calc(100% - ${drawerWidth}px)`,
    transition: theme.transitions.create(['width', 'margin'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
}));

// 自定义抽屉样式
const StyledDrawer = styled(Drawer, {
  shouldForwardProp: (prop) => prop !== 'open',
})(({ theme, open }) => ({
  '& .MuiDrawer-paper': {
    position: 'relative',
    whiteSpace: 'nowrap',
    width: drawerWidth,
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
    boxSizing: 'border-box',
    ...(!open && {
      overflowX: 'hidden',
      transition: theme.transitions.create('width', {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.leavingScreen,
      }),
      width: theme.spacing(7),
      [theme.breakpoints.up('sm')]: {
        width: theme.spacing(9),
      },
    }),
  },
}));

// 导航菜单项
interface NavMenuItem {
  id: string;
  text: string;
  icon: React.ReactNode;
  section?: string;
}

// 主要导航菜单
const mainNavItems: NavMenuItem[] = [
  { id: 'dashboard', text: '首页', icon: <Dashboard />, section: '主要功能' },
  { id: 'terrain', text: '土体建模', icon: <Terrain />, section: '主要功能' },
  { id: 'excavation', text: '基坑建模', icon: <Construction />, section: '主要功能' },
  { id: 'tunnel', text: '隧道建模', icon: <StraightenOutlined />, section: '主要功能' },
  { id: 'mesh', text: '网格划分', icon: <AccountTree />, section: '分析工具' },
  { id: 'compute', text: '计算分析', icon: <Science />, section: '分析工具' },
  { id: 'results', text: '结果可视化', icon: <BarChart />, section: '分析工具' },
];

// 辅助导航菜单
const secondaryNavItems: NavMenuItem[] = [
  { id: 'settings', text: '设置', icon: <Settings /> },
  { id: 'help', text: '帮助', icon: <Help /> },
];

// 分组菜单项
const groupMenuItems = (items: NavMenuItem[]): Record<string, NavMenuItem[]> => {
  return items.reduce((acc, item) => {
    const section = item.section || '其他';
    if (!acc[section]) {
      acc[section] = [];
    }
    acc[section].push(item);
    return acc;
  }, {} as Record<string, NavMenuItem[]>);
};

interface MainLayoutProps {
  children: React.ReactNode;
  title?: string;
  currentModule?: string;
  onModuleChange?: (moduleId: string) => void;
  projectName?: string;
}

const MainLayout: React.FC<MainLayoutProps> = ({ 
  children, 
  title = "深基坑CAE系统", 
  currentModule = 'dashboard',
  onModuleChange,
  projectName
}) => {
  const theme = useTheme();
  const [open, setOpen] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // 分组菜单
  const groupedMainNavItems = groupMenuItems(mainNavItems);

  const toggleDrawer = () => {
    setOpen(!open);
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleNavItemClick = (itemId: string) => {
    if (onModuleChange) {
      onModuleChange(itemId);
    }
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <CssBaseline />
      
      {/* 顶部应用栏 */}
      <StyledAppBar position="fixed" open={open} color="default" elevation={1}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="open drawer"
            onClick={toggleDrawer}
            sx={{ marginRight: '36px', ...(open && { display: 'none' }) }}
          >
            <MenuOutlined />
          </IconButton>
          
          <Typography variant="h6" component="div" noWrap sx={{ flexGrow: 1 }}>
            {title} {projectName && <span style={{ fontWeight: 'normal', fontSize: '0.9em' }}>- {projectName}</span>}
          </Typography>
          
          {/* 通知图标 */}
          <Tooltip title="通知">
            <IconButton color="inherit">
              <Notifications />
            </IconButton>
          </Tooltip>
          
          {/* 用户菜单 */}
          <Box sx={{ ml: 2 }}>
            <Tooltip title="账户设置">
              <IconButton 
                onClick={handleProfileMenuOpen}
                color="inherit"
                size="small"
                sx={{ ml: 2 }}
              >
                <Avatar sx={{ width: 32, height: 32, bgcolor: theme.palette.primary.main }}>
                  <AccountCircle />
                </Avatar>
              </IconButton>
            </Tooltip>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleProfileMenuClose}
              onClick={handleProfileMenuClose}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <MenuItem>
                个人资料
              </MenuItem>
              <MenuItem>
                设置
              </MenuItem>
              <Divider />
              <MenuItem>
                退出登录
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </StyledAppBar>
      
      {/* 侧边导航抽屉 */}
      <StyledDrawer variant="permanent" open={open}>
        <Toolbar
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: [1],
          }}
        >
          {open && <Box sx={{ ml: 1 }}><Logo size="small" /></Box>}
          <IconButton onClick={toggleDrawer}>
            <ChevronLeft />
          </IconButton>
        </Toolbar>
        <Divider />
        
        {/* 主导航菜单 */}
        <List component="nav" sx={{ px: 1 }}>
          {Object.entries(groupedMainNavItems).map(([section, items]) => (
            <React.Fragment key={section}>
              {open && (
                <ListSubheader component="div" sx={{ backgroundColor: 'transparent', lineHeight: '30px', pl: 2 }}>
                  {section}
                </ListSubheader>
              )}
              {items.map((item) => (
                <ListItem key={item.id} disablePadding sx={{ display: 'block' }}>
                  <ListItemButton
                    selected={currentModule === item.id}
                    onClick={() => handleNavItemClick(item.id)}
                    sx={{
                      minHeight: 48,
                      justifyContent: open ? 'initial' : 'center',
                      px: 2.5,
                      borderRadius: 1,
                      mb: 0.5,
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 0,
                        mr: open ? 3 : 'auto',
                        justifyContent: 'center',
                      }}
                    >
                      <Tooltip title={open ? '' : item.text} placement="right">
                        {item.icon}
                      </Tooltip>
                    </ListItemIcon>
                    {open && <ListItemText primary={item.text} />}
                  </ListItemButton>
                </ListItem>
              ))}
              <Divider sx={{ my: 1 }} />
            </React.Fragment>
          ))}
          
          {/* 辅助导航菜单 */}
          {secondaryNavItems.map((item) => (
            <ListItem key={item.id} disablePadding sx={{ display: 'block' }}>
              <ListItemButton
                onClick={() => handleNavItemClick(item.id)}
                sx={{
                  minHeight: 48,
                  justifyContent: open ? 'initial' : 'center',
                  px: 2.5,
                  borderRadius: 1,
                  mb: 0.5,
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: open ? 3 : 'auto',
                    justifyContent: 'center',
                  }}
                >
                  <Tooltip title={open ? '' : item.text} placement="right">
                    {item.icon}
                  </Tooltip>
                </ListItemIcon>
                {open && <ListItemText primary={item.text} />}
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </StyledDrawer>
      
      {/* 主内容区 */}
      <Box
        component="main"
        sx={{
          backgroundColor: (theme) =>
            theme.palette.mode === 'light'
              ? theme.palette.grey[100]
              : theme.palette.grey[900],
          flexGrow: 1,
          height: '100vh',
          overflow: 'auto',
          display: 'flex', 
          flexDirection: 'column'
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
};

export default MainLayout; 