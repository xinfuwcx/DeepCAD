/**
 * DXF导入对话框组件
 * 支持DXF文件导入、预览和参数配置
 */

import React, { useState, useCallback, useRef } from 'react';
import { Upload, FileText, Settings, AlertCircle, CheckCircle, X } from 'lucide-react';
import { 
  dxfService, 
  DXFImportRequest, 
  DXFImportResponse, 
  DXFImportOptions,
  CoordinateSystem,
  DXFData 
} from '../../services/dxfService';

interface DXFImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (data: DXFData) => void;
  onImportError?: (error: string) => void;
}

export const DXFImportDialog: React.FC<DXFImportDialogProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
  onImportError
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [importing, setImporting] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [importConfig, setImportConfig] = useState<DXFImportOptions>({
    coordinateSystem: 'local',
    boundaryTolerance: 1.0,
    autoCloseContours: true
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 文件拖拽处理
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      await handleFileSelect(files[0]);
    }
  }, []);

  const handleFileSelect = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.dxf')) {
      alert('请选择DXF文件');
      return;
    }

    setSelectedFile(file);
    
    // 验证文件
    try {
      const validation = await dxfService.validateDXFFile(file);
      setValidationResult(validation);
    } catch (error) {
      console.error('文件验证失败:', error);
      setValidationResult({
        isValid: false,
        errors: ['文件验证失败'],
        warnings: []
      });
    }
  };

  const handleFileInputClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleImport = async () => {
    if (!selectedFile || !validationResult?.isValid) {
      return;
    }

    setImporting(true);
    
    try {
      const request: DXFImportRequest = {
        file: selectedFile,
        options: importConfig
      };
      
      const response: DXFImportResponse = await dxfService.importDXF(request);
      
      if (response.success && response.data) {
        onImportSuccess(response.data);
        onClose();
      } else {
        throw new Error(response.error || '导入失败');
      }
    } catch (error) {
      console.error('DXF导入失败:', error);
      const errorMessage = error instanceof Error ? error.message : '导入失败';
      onImportError?.(errorMessage);
    } finally {
      setImporting(false);
    }
  };

  const resetDialog = () => {
    setSelectedFile(null);
    setValidationResult(null);
    setImportConfig({
      coordinateSystem: 'local',
      boundaryTolerance: 1.0,
      autoCloseContours: true
    });
  };

  const handleClose = () => {
    resetDialog();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-xl border border-gray-700 w-[600px] max-h-[80vh] overflow-y-auto">
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-semibold text-white">DXF文件导入</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* 文件选择区域 */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white">选择DXF文件</h3>
            
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? 'border-blue-400 bg-blue-400/10'
                  : 'border-gray-600 hover:border-gray-500'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={handleFileInputClick}
            >
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-300 mb-2">
                {selectedFile ? selectedFile.name : '拖拽DXF文件到此处或点击选择文件'}
              </p>
              <p className="text-sm text-gray-500">
                支持AutoCAD 2010-2026版本的DXF格式
              </p>
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".dxf"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>
          </div>

          {/* 文件验证结果 */}
          {validationResult && (
            <div className="space-y-3">
              <h3 className="text-lg font-medium text-white">文件验证</h3>
              
              {validationResult.isValid ? (
                <div className="flex items-center gap-2 text-green-400">
                  <CheckCircle className="w-5 h-5" />
                  <span>文件验证通过</span>
                  {validationResult.version && (
                    <span className="text-gray-400">
                      (版本: {validationResult.version})
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-400">
                  <AlertCircle className="w-5 h-5" />
                  <span>文件验证失败</span>
                </div>
              )}

              {/* 错误信息 */}
              {validationResult.errors?.length > 0 && (
                <div className="bg-red-900/20 border border-red-800 rounded-lg p-3">
                  <p className="text-red-400 font-medium mb-2">错误:</p>
                  <ul className="text-red-300 text-sm space-y-1">
                    {validationResult.errors.map((error: string, index: number) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 警告信息 */}
              {validationResult.warnings?.length > 0 && (
                <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-3">
                  <p className="text-yellow-400 font-medium mb-2">警告:</p>
                  <ul className="text-yellow-300 text-sm space-y-1">
                    {validationResult.warnings.map((warning: string, index: number) => (
                      <li key={index}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* 导入配置 */}
          {selectedFile && validationResult?.isValid && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-gray-400" />
                <h3 className="text-lg font-medium text-white">导入设置</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* 坐标系选择 */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    坐标系
                  </label>
                  <select
                    value={importConfig.coordinateSystem}
                    onChange={(e) => setImportConfig({
                      ...importConfig,
                      coordinateSystem: e.target.value as CoordinateSystem
                    })}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="LOCAL">本地坐标系</option>
                    <option value="WGS84">WGS84</option>
                    <option value="CGCS2000">CGCS2000</option>
                    <option value="Beijing54">北京54</option>
                    <option value="Xian80">西安80</option>
                    <option value="UTM">UTM投影</option>
                  </select>
                </div>

                {/* 边界容差 */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    边界容差 (mm)
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    max="100"
                    step="0.1"
                    value={importConfig.boundaryTolerance}
                    onChange={(e) => setImportConfig({
                      ...importConfig,
                      boundaryTolerance: parseFloat(e.target.value)
                    })}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* 自动边界识别 */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="autoDetectBoundary"
                  checked={importConfig.autoDetectBoundary}
                  onChange={(e) => setImportConfig({
                    ...importConfig,
                    autoDetectBoundary: e.target.checked
                  })}
                  className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="autoDetectBoundary" className="text-sm text-gray-300">
                  自动识别边界轮廓
                </label>
              </div>
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-700">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleImport}
            disabled={!selectedFile || !validationResult?.isValid || importing}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {importing ? '导入中...' : '导入'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DXFImportDialog;