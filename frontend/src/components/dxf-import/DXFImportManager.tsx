import React, { useState, useCallback, useRef } from 'react';
import { Upload, FileText, Settings, Download, Eye, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface LayerInfo {
  name: string;
  color?: number;
  linetype?: string;
  lineweight?: number;
  entity_count: number;
  is_frozen: boolean;
  is_locked: boolean;
  is_visible: boolean;
}

interface EntityInfo {
  handle: string;
  entity_type: string;
  layer: string;
  color?: number;
  linetype?: string;
  bounding_box?: number[];
  properties: Record<string, any>;
}

interface GeometryStatistics {
  total_entities: number;
  entities_by_type: Record<string, number>;
  layers_count: number;
  blocks_count: number;
  total_length: number;
  total_area: number;
  drawing_extents?: number[];
}

interface DXFValidationIssue {
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  entity_handle?: string;
  layer?: string;
  suggestion?: string;
}

interface DXFAnalysisResult {
  file_info: Record<string, any>;
  layers: LayerInfo[];
  entities: EntityInfo[];
  statistics: GeometryStatistics;
  validation_issues: DXFValidationIssue[];
  analysis_time: number;
}

interface DXFProcessingOptions {
  mode: 'strict' | 'tolerant' | 'repair' | 'preview';
  coordinate_system: 'wcs' | 'ucs' | 'custom';
  scale_factor: number;
  rotation_angle: number;
  translation: number[];
  layer_filter: string[];
  entity_type_filter: string[];
  exclude_frozen_layers: boolean;
  exclude_locked_layers: boolean;
  fix_duplicate_vertices: boolean;
  fix_zero_length_lines: boolean;
  fix_invalid_geometries: boolean;
  merge_collinear_segments: boolean;
  preserve_layers: boolean;
  preserve_colors: boolean;
  preserve_linetypes: boolean;
  generate_3d_from_2d: boolean;
  extrusion_height: number;
}

interface DXFImportStatus {
  import_id: string;
  status: 'uploading' | 'analyzing' | 'processing' | 'completed' | 'failed' | 'cancelled';
  analysis_result?: DXFAnalysisResult;
  processing_result?: any;
  created_at: string;
}

const DXFImportManager: React.FC = () => {
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [importStatus, setImportStatus] = useState<DXFImportStatus | null>(null);
  const [analysisResult, setAnalysisResult] = useState<DXFAnalysisResult | null>(null);
  const [processingOptions, setProcessingOptions] = useState<DXFProcessingOptions>({
    mode: 'tolerant',
    coordinate_system: 'wcs',
    scale_factor: 1.0,
    rotation_angle: 0.0,
    translation: [0.0, 0.0, 0.0],
    layer_filter: [],
    entity_type_filter: [],
    exclude_frozen_layers: true,
    exclude_locked_layers: false,
    fix_duplicate_vertices: true,
    fix_zero_length_lines: true,
    fix_invalid_geometries: true,
    merge_collinear_segments: false,
    preserve_layers: true,
    preserve_colors: true,
    preserve_linetypes: true,
    generate_3d_from_2d: false,
    extrusion_height: 1.0,
  });
  const [activeTab, setActiveTab] = useState<'upload' | 'analysis' | 'options' | 'results'>('upload');
  const [isUploading, setIsUploading] = useState(false);
  const [selectedLayers, setSelectedLayers] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.name.toLowerCase().endsWith('.dxf')) {
      setCurrentFile(file);
      setAnalysisResult(null);
      setImportStatus(null);
    } else {
      alert('请选择有效的DXF文件');
    }
  }, []);

  const handleFileDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.name.toLowerCase().endsWith('.dxf')) {
      setCurrentFile(file);
      setAnalysisResult(null);
      setImportStatus(null);
    }
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  const analyzeFile = async () => {
    if (!currentFile) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', currentFile);

    try {
      const response = await fetch('/api/dxf-import/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`分析失败: ${response.statusText}`);
      }

      const result = await response.json();
      setAnalysisResult(result);
      setActiveTab('analysis');
    } catch (error) {
      console.error('DXF分析失败:', error);
      alert('DXF文件分析失败，请检查文件格式');
    } finally {
      setIsUploading(false);
    }
  };

  const uploadAndProcess = async () => {
    if (!currentFile) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', currentFile);
    formData.append('project_id', 'default');
    formData.append('options', JSON.stringify(processingOptions));

    try {
      const response = await fetch('/api/dxf-import/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`上传失败: ${response.statusText}`);
      }

      const result = await response.json();
      setImportStatus(result);
      setActiveTab('results');

      // 开始轮询状态
      pollImportStatus(result.import_id);
    } catch (error) {
      console.error('DXF上传失败:', error);
      alert('DXF文件上传失败');
    } finally {
      setIsUploading(false);
    }
  };

  const pollImportStatus = async (importId: string) => {
    const maxAttempts = 60; // 最多轮询60次
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await fetch(`/api/dxf-import/status/${importId}`);
        if (response.ok) {
          const status = await response.json();
          setImportStatus(status);

          if (status.status === 'completed' || status.status === 'failed') {
            return; // 停止轮询
          }
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000); // 2秒后重试
        }
      } catch (error) {
        console.error('状态轮询失败:', error);
      }
    };

    poll();
  };

  const handleLayerSelection = (layerName: string, selected: boolean) => {
    if (selected) {
      setSelectedLayers(prev => [...prev, layerName]);
    } else {
      setSelectedLayers(prev => prev.filter(name => name !== layerName));
    }
  };

  const applyLayerFilter = () => {
    setProcessingOptions(prev => ({
      ...prev,
      layer_filter: selectedLayers,
    }));
  };

  const renderFileUpload = () => (
    <div className="space-y-6">
      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors"
        onDrop={handleFileDrop}
        onDragOver={handleDragOver}
      >
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-lg font-medium text-gray-700 mb-2">
          拖拽DXF文件到此处或点击选择
        </p>
        <p className="text-sm text-gray-500 mb-4">
          支持DXF格式文件，最大100MB
        </p>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          选择文件
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".dxf"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {currentFile && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileText className="h-8 w-8 text-blue-600" />
              <div>
                <p className="font-medium text-gray-900">{currentFile.name}</p>
                <p className="text-sm text-gray-500">
                  大小: {(currentFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={analyzeFile}
                disabled={isUploading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                <Eye className="h-4 w-4 inline mr-1" />
                仅分析
              </button>
              <button
                onClick={uploadAndProcess}
                disabled={isUploading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isUploading ? '处理中...' : '上传并处理'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderAnalysisResults = () => {
    if (!analysisResult) return <div>暂无分析结果</div>;

    const { file_info, layers, statistics, validation_issues } = analysisResult;

    return (
      <div className="space-y-6">
        {/* 文件信息 */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4">文件信息</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">文件名</p>
              <p className="font-medium">{file_info.filename}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">DXF版本</p>
              <p className="font-medium">{file_info.dxf_version}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">加载方式</p>
              <p className="font-medium">{file_info.load_method}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">单位</p>
              <p className="font-medium">{file_info.units}</p>
            </div>
          </div>
        </div>

        {/* 统计信息 */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4">几何统计</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{statistics.total_entities}</p>
              <p className="text-sm text-gray-600">总实体数</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{statistics.layers_count}</p>
              <p className="text-sm text-gray-600">图层数</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{statistics.blocks_count}</p>
              <p className="text-sm text-gray-600">块数量</p>
            </div>
          </div>
        </div>

        {/* 图层信息 */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4">图层信息</h3>
          <div className="max-h-60 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">选择</th>
                  <th className="text-left p-2">图层名</th>
                  <th className="text-left p-2">实体数</th>
                  <th className="text-left p-2">状态</th>
                </tr>
              </thead>
              <tbody>
                {layers.map((layer) => (
                  <tr key={layer.name} className="border-b">
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={selectedLayers.includes(layer.name)}
                        onChange={(e) => handleLayerSelection(layer.name, e.target.checked)}
                      />
                    </td>
                    <td className="p-2 font-medium">{layer.name}</td>
                    <td className="p-2">{layer.entity_count}</td>
                    <td className="p-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                        layer.is_visible ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {layer.is_visible ? '可见' : '隐藏'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {selectedLayers.length > 0 && (
            <div className="mt-4">
              <button
                onClick={applyLayerFilter}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                应用图层过滤 ({selectedLayers.length} 个图层)
              </button>
            </div>
          )}
        </div>

        {/* 验证问题 */}
        {validation_issues.length > 0 && (
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold mb-4">验证问题</h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {validation_issues.map((issue, index) => (
                <div
                  key={index}
                  className={`flex items-start space-x-2 p-3 rounded-lg ${
                    issue.severity === 'error' ? 'bg-red-50' :
                    issue.severity === 'warning' ? 'bg-yellow-50' : 'bg-blue-50'
                  }`}
                >
                  {issue.severity === 'error' ? (
                    <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                  ) : issue.severity === 'warning' ? (
                    <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                  ) : (
                    <CheckCircle className="h-5 w-5 text-blue-500 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{issue.message}</p>
                    {issue.suggestion && (
                      <p className="text-sm text-gray-600 mt-1">{issue.suggestion}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderProcessingOptions = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4">基本选项</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              处理模式
            </label>
            <select
              value={processingOptions.mode}
              onChange={(e) => setProcessingOptions(prev => ({ 
                ...prev, 
                mode: e.target.value as any 
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="strict">严格模式</option>
              <option value="tolerant">容错模式</option>
              <option value="repair">修复模式</option>
              <option value="preview">预览模式</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              坐标系统
            </label>
            <select
              value={processingOptions.coordinate_system}
              onChange={(e) => setProcessingOptions(prev => ({ 
                ...prev, 
                coordinate_system: e.target.value as any 
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="wcs">世界坐标系</option>
              <option value="ucs">用户坐标系</option>
              <option value="custom">自定义坐标系</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4">变换选项</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              缩放因子
            </label>
            <input
              type="number"
              step="0.1"
              value={processingOptions.scale_factor}
              onChange={(e) => setProcessingOptions(prev => ({ 
                ...prev, 
                scale_factor: parseFloat(e.target.value) || 1.0 
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              旋转角度(度)
            </label>
            <input
              type="number"
              value={processingOptions.rotation_angle}
              onChange={(e) => setProcessingOptions(prev => ({ 
                ...prev, 
                rotation_angle: parseFloat(e.target.value) || 0.0 
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4">修复选项</h3>
        <div className="space-y-3">
          {[
            { key: 'fix_duplicate_vertices', label: '修复重复顶点' },
            { key: 'fix_zero_length_lines', label: '修复零长度线' },
            { key: 'fix_invalid_geometries', label: '修复无效几何' },
            { key: 'merge_collinear_segments', label: '合并共线段' },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center">
              <input
                type="checkbox"
                checked={processingOptions[key as keyof DXFProcessingOptions] as boolean}
                onChange={(e) => setProcessingOptions(prev => ({ 
                  ...prev, 
                  [key]: e.target.checked 
                }))}
                className="mr-2"
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4">输出选项</h3>
        <div className="space-y-3">
          {[
            { key: 'preserve_layers', label: '保留图层信息' },
            { key: 'preserve_colors', label: '保留颜色信息' },
            { key: 'preserve_linetypes', label: '保留线型信息' },
            { key: 'generate_3d_from_2d', label: '从2D生成3D几何' },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center">
              <input
                type="checkbox"
                checked={processingOptions[key as keyof DXFProcessingOptions] as boolean}
                onChange={(e) => setProcessingOptions(prev => ({ 
                  ...prev, 
                  [key]: e.target.checked 
                }))}
                className="mr-2"
              />
              {label}
            </label>
          ))}
        </div>
        
        {processingOptions.generate_3d_from_2d && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              挤出高度
            </label>
            <input
              type="number"
              step="0.1"
              value={processingOptions.extrusion_height}
              onChange={(e) => setProcessingOptions(prev => ({ 
                ...prev, 
                extrusion_height: parseFloat(e.target.value) || 1.0 
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}
      </div>
    </div>
  );

  const renderResults = () => {
    if (!importStatus) return <div>暂无处理结果</div>;

    const getStatusIcon = (status: string) => {
      switch (status) {
        case 'completed':
          return <CheckCircle className="h-6 w-6 text-green-500" />;
        case 'failed':
          return <XCircle className="h-6 w-6 text-red-500" />;
        case 'processing':
        case 'analyzing':
          return <div className="h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
        default:
          return <div className="h-6 w-6 bg-gray-300 rounded-full" />;
      }
    };

    const getStatusText = (status: string) => {
      switch (status) {
        case 'uploading':
          return '上传中';
        case 'analyzing':
          return '分析中';
        case 'processing':
          return '处理中';
        case 'completed':
          return '已完成';
        case 'failed':
          return '失败';
        case 'cancelled':
          return '已取消';
        default:
          return '未知状态';
      }
    };

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4">处理状态</h3>
          <div className="flex items-center space-x-3">
            {getStatusIcon(importStatus.status)}
            <div>
              <p className="font-medium">{getStatusText(importStatus.status)}</p>
              <p className="text-sm text-gray-500">任务ID: {importStatus.import_id}</p>
            </div>
          </div>
        </div>

        {importStatus.analysis_result && (
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold mb-4">分析结果</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {importStatus.analysis_result.statistics.total_entities}
                </p>
                <p className="text-sm text-gray-600">总实体数</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {importStatus.analysis_result.statistics.layers_count}
                </p>
                <p className="text-sm text-gray-600">图层数</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">
                  {importStatus.analysis_result.validation_issues.filter(i => i.severity === 'error').length}
                </p>
                <p className="text-sm text-gray-600">错误数</p>
              </div>
            </div>
          </div>
        )}

        {importStatus.processing_result && (
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold mb-4">处理结果</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>处理状态:</span>
                <span className={`font-medium ${
                  importStatus.processing_result.success ? 'text-green-600' : 'text-red-600'
                }`}>
                  {importStatus.processing_result.success ? '成功' : '失败'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>已处理实体:</span>
                <span>{importStatus.processing_result.processed_entities}</span>
              </div>
              <div className="flex justify-between">
                <span>跳过实体:</span>
                <span>{importStatus.processing_result.skipped_entities}</span>
              </div>
              <div className="flex justify-between">
                <span>修复实体:</span>
                <span>{importStatus.processing_result.repaired_entities}</span>
              </div>
              <div className="flex justify-between">
                <span>处理时间:</span>
                <span>{importStatus.processing_result.processing_time.toFixed(2)}秒</span>
              </div>
            </div>

            {importStatus.processing_result.output_files && 
             importStatus.processing_result.output_files.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium mb-2">输出文件:</h4>
                <div className="space-y-2">
                  {importStatus.processing_result.output_files.map((file: string, index: number) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <span className="text-sm">{file.split('/').pop()}</span>
                      <button className="text-blue-600 hover:text-blue-800">
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">DXF文件导入</h1>
        <p className="text-gray-600">
          导入和处理DXF文件，支持分析、修复和格式转换
        </p>
      </div>

      {/* 选项卡导航 */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'upload', label: '文件上传', icon: Upload },
            { key: 'analysis', label: '分析结果', icon: Eye },
            { key: 'options', label: '处理选项', icon: Settings },
            { key: 'results', label: '处理结果', icon: CheckCircle },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center space-x-2 ${
                activeTab === key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* 选项卡内容 */}
      <div className="min-h-96">
        {activeTab === 'upload' && renderFileUpload()}
        {activeTab === 'analysis' && renderAnalysisResults()}
        {activeTab === 'options' && renderProcessingOptions()}
        {activeTab === 'results' && renderResults()}
      </div>
    </div>
  );
};

export default DXFImportManager;