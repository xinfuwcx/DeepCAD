/**
 * ProjectManagement3DScreen (Deprecated Stub)
 * 已整合进新版 DeepCADControlCenter (AMap + Deck.gl + Layer 架构)。
 * 仅保留用于兼容旧路由；未来可删除此文件与相关路由。
 */
import React from 'react';
import { DeepCADControlCenter } from '../components/control/DeepCADControlCenter';

const ProjectManagement3DScreen: React.FC = () => (
  <DeepCADControlCenter onExit={() => { /* legacy route exit noop */ }} />
);

export default ProjectManagement3DScreen;