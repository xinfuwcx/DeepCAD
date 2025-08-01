/**
 * DXFImportView.tsx - DXF文件导入工具
 * 
 * 功能描述:
 * - CAD图纸导入和格式转换专用界面
 * - 支持DXF文件的解析、预览和几何提取
 * - 为几何建模提供CAD数据输入接口
 * - 集成专业的DXF文件处理组件
 * 
 * 导入能力:
 * 1. DXF文件解析 - 支持AutoCAD DXF格式文件
 * 2. 几何提取 - 提取点、线、面、圆弧等几何元素
 * 3. 图层管理 - 处理DXF文件中的图层信息
 * 4. 坐标转换 - CAD坐标系到系统坐标系的转换
 * 5. 预览功能 - 导入前的图形预览和验证
 * 
 * 工作流程:
 * - 文件选择和上传
 * - DXF解析和验证
 * - 几何元素提取
 * - 坐标转换和优化
 * - 导入到几何建模模块
 * 
 * 技术特点: 组件化设计、专业DXF处理、格式转换、数据验证
 */
import React from 'react';
import DXFImportManager from '../components/dxf-import/DXFImportManager';

const DXFImportView: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <DXFImportManager />
    </div>
  );
};

export default DXFImportView;