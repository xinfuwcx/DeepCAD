import React, { useState, useCallback, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertTriangle, Download } from 'lucide-react';

interface DXFQuickImportProps {
  onImportComplete?: (result: any) => void;
  className?: string;
}

const DXFQuickImport: React.FC<DXFQuickImportProps> = ({ 
  onImportComplete, 
  className = "" 
}) => {
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.name.toLowerCase().endsWith('.dxf')) {
      setCurrentFile(file);
      setResult(null);
      setError(null);
    } else {
      setError('请选择有效的DXF文件');
    }
  }, []);

  const handleFileDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.name.toLowerCase().endsWith('.dxf')) {
      setCurrentFile(file);
      setResult(null);
      setError(null);
    } else {
      setError('请选择有效的DXF文件');
    }
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  const processFile = async () => {
    if (!currentFile) return;

    setIsProcessing(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', currentFile);
    
    // 使用默认的处理选项
    const defaultOptions = {
      mode: 'tolerant',
      coordinate_system: 'wcs',
      scale_factor: 1.0,
      fix_duplicate_vertices: true,
      fix_zero_length_lines: true,
      fix_invalid_geometries: true,
      preserve_layers: true,
      preserve_colors: true,
    };
    
    formData.append('options', JSON.stringify(defaultOptions));

    try {
      // 首先尝试快速分析
      const analysisResponse = await fetch('/api/dxf-import/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!analysisResponse.ok) {
        throw new Error(`分析失败: ${analysisResponse.statusText}`);
      }

      const analysisResult = await analysisResponse.json();
      
      // 如果分析成功，进行处理
      const processResponse = await fetch('/api/dxf-import/process', {
        method: 'POST',
        body: formData,
      });

      if (!processResponse.ok) {
        throw new Error(`处理失败: ${processResponse.statusText}`);
      }

      const processResult = await processResponse.json();
      
      const finalResult = {
        analysis: analysisResult,
        processing: processResult,
        success: processResult.success,
      };
      
      setResult(finalResult);
      
      if (onImportComplete) {
        onImportComplete(finalResult);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '处理失败';
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setCurrentFile(null);
    setResult(null);
    setError(null);
    setIsProcessing(false);
  };

  const getSummaryStats = () => {
    if (!result?.analysis) return null;
    
    const { statistics, validation_issues } = result.analysis;
    const errors = validation_issues.filter((issue: any) => issue.severity === 'error').length;
    const warnings = validation_issues.filter((issue: any) => issue.severity === 'warning').length;
    
    return {
      entities: statistics.total_entities,
      layers: statistics.layers_count,
      errors,
      warnings,
    };
  };

  const stats = getSummaryStats();

  return (
    <div className={`bg-white rounded-lg border p-6 ${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">DXF文件导入</h3>
        <p className="text-sm text-gray-600">快速导入DXF文件并转换为几何模型</p>
      </div>

      {!result && (
        <>
          {/* 文件选择区域 */}
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              error ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-blue-400'
            }`}
            onDrop={handleFileDrop}
            onDragOver={handleDragOver}
          >
            <Upload className={`mx-auto h-8 w-8 mb-3 ${error ? 'text-red-400' : 'text-gray-400'}`} />
            
            {error ? (
              <>
                <p className="text-red-600 font-medium mb-2">导入失败</p>
                <p className="text-sm text-red-500 mb-3">{error}</p>
                <button
                  onClick={reset}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  重新选择
                </button>
              </>
            ) : currentFile ? (
              <>
                <div className="flex items-center justify-center space-x-2 mb-3">
                  <FileText className="h-6 w-6 text-blue-600" />
                  <span className="font-medium text-gray-900">{currentFile.name}</span>
                </div>
                <p className="text-sm text-gray-500 mb-3">
                  大小: {(currentFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <div className="flex justify-center space-x-2">
                  <button
                    onClick={processFile}
                    disabled={isProcessing}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {isProcessing ? (
                      <div className="flex items-center space-x-2">
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>处理中...</span>
                      </div>
                    ) : (
                      '开始处理'
                    )}
                  </button>
                  <button
                    onClick={reset}
                    disabled={isProcessing}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    重新选择
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-gray-700 font-medium mb-2">拖拽DXF文件到此处</p>
                <p className="text-sm text-gray-500 mb-3">或点击选择文件</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  选择文件
                </button>
              </>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".dxf"
            onChange={handleFileSelect}
            className="hidden"
          />
        </>
      )}

      {/* 处理结果 */}
      {result && (
        <div className="space-y-4">
          {/* 状态指示器 */}
          <div className="flex items-center space-x-3">
            {result.success ? (
              <CheckCircle className="h-6 w-6 text-green-500" />
            ) : (
              <AlertTriangle className="h-6 w-6 text-yellow-500" />
            )}
            <div>
              <p className={`font-medium ${result.success ? 'text-green-700' : 'text-yellow-700'}`}>
                {result.success ? 'DXF导入成功' : 'DXF导入完成(有警告)'}
              </p>
              <p className="text-sm text-gray-500">
                文件: {currentFile?.name}
              </p>
            </div>
          </div>

          {/* 统计信息 */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center bg-blue-50 rounded-lg p-3">
                <p className="text-lg font-bold text-blue-600">{stats.entities}</p>
                <p className="text-sm text-gray-600">实体数</p>
              </div>
              <div className="text-center bg-green-50 rounded-lg p-3">
                <p className="text-lg font-bold text-green-600">{stats.layers}</p>
                <p className="text-sm text-gray-600">图层数</p>
              </div>
              <div className="text-center bg-yellow-50 rounded-lg p-3">
                <p className="text-lg font-bold text-yellow-600">{stats.warnings}</p>
                <p className="text-sm text-gray-600">警告</p>
              </div>
              <div className="text-center bg-red-50 rounded-lg p-3">
                <p className="text-lg font-bold text-red-600">{stats.errors}</p>
                <p className="text-sm text-gray-600">错误</p>
              </div>
            </div>
          )}

          {/* 输出文件 */}
          {result.processing?.output_files && result.processing.output_files.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">输出文件</h4>
              <div className="space-y-2">
                {result.processing.output_files.map((file: string, index: number) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{file.split('/').pop()}</span>
                    <button className="text-blue-600 hover:text-blue-800 p-1">
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex justify-between">
            <button
              onClick={reset}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              导入新文件
            </button>
            <div className="flex space-x-2">
              <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                生成网格
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                查看详情
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DXFQuickImport;