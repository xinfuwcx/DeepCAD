import { addons } from '@storybook/manager-api';
import { create } from '@storybook/theming';

const theme = create({
  base: 'light',
  brandTitle: 'DeepCAD Components',
  brandUrl: 'https://github.com/deepcad/deepcad',
  brandImage: '',
  brandTarget: '_self',

  colorPrimary: '#3b82f6',
  colorSecondary: '#6366f1',

  // UI
  appBg: '#f8fafc',
  appContentBg: '#ffffff',
  appBorderColor: '#e2e8f0',
  appBorderRadius: 8,

  // Typography
  fontBase: '"Inter", "Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
  fontCode: '"Fira Code", "SF Mono", Monaco, Inconsolata, "Roboto Mono", monospace',

  // Text colors
  textColor: '#1e293b',
  textInverseColor: '#ffffff',

  // Toolbar default and active colors
  barTextColor: '#64748b',
  barSelectedColor: '#3b82f6',
  barBg: '#ffffff',

  // Form colors
  inputBg: '#ffffff',
  inputBorder: '#d1d5db',
  inputTextColor: '#1e293b',
  inputBorderRadius: 6,
});

addons.setConfig({
  theme,
  panelPosition: 'bottom',
  showNav: true,
  showPanel: true,
  sidebarAnimations: true,
});