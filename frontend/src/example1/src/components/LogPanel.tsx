import React, { useRef, useEffect, useState } from 'react'
import { usePythonLogs, useFEAStore } from '../stores/feaStore'
import { Terminal, Trash2, ChevronUp, ChevronDown } from 'lucide-react'

export const LogPanel: React.FC = () => {
  const logs = usePythonLogs()
  const { clearLogs } = useFEAStore()
  const [isExpanded, setIsExpanded] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)
  const logContainerRef = useRef<HTMLDivElement>(null)

  // 自动滚动到底部
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [logs, autoScroll])

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  const getLogTypeClass = (type: string) => {
    switch (type) {
      case 'stderr':
        return 'text-red-600'
      case 'error':
        return 'text-red-700 font-medium'
      case 'info':
        return 'text-blue-600'
      default:
        return 'text-gray-700'
    }
  }

  const getLogTypeIcon = (type: string) => {
    switch (type) {
      case 'stderr':
      case 'error':
        return '❌'
      case 'info':
        return 'ℹ️'
      default:
        return '📝'
    }
  }

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
  }

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement
    const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 10
    setAutoScroll(isAtBottom)
  }

  const recentLogs = logs.slice(-5) // 显示最近5条日志

  return (
    <div className="bg-gray-900 text-gray-100">
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
        <div className="flex items-center">
          <Terminal className="w-4 h-4 mr-2" />
          <span className="text-sm font-medium">系统日志</span>
          {logs.length > 0 && (
            <span className="ml-2 text-xs text-gray-400">
              ({logs.length})
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`text-xs px-2 py-1 rounded ${
              autoScroll ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'
            }`}
            title="自动滚动"
          >
            Auto
          </button>
          
          <button
            onClick={clearLogs}
            className="text-gray-400 hover:text-white p-1"
            title="清空日志"
          >
            <Trash2 className="w-3 h-3" />
          </button>
          
          <button
            onClick={toggleExpanded}
            className="text-gray-400 hover:text-white p-1"
            title={isExpanded ? '收起' : '展开'}
          >
            {isExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronUp className="w-3 h-3" />
            )}
          </button>
        </div>
      </div>

      {/* 日志内容 */}
      <div 
        ref={logContainerRef}
        onScroll={handleScroll}
        className={`overflow-y-auto font-mono text-xs transition-all duration-200 ${
          isExpanded ? 'h-64' : 'h-32'
        }`}
      >
        {logs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <Terminal className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <div>暂无日志信息</div>
            </div>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {(isExpanded ? logs : recentLogs).map((log, index) => (
              <div 
                key={`${log.timestamp}-${index}`}
                className="flex items-start space-x-2 hover:bg-gray-800 px-1 py-0.5 rounded"
              >
                <span className="text-gray-500 text-xs flex-shrink-0 mt-0.5">
                  {formatTimestamp(log.timestamp)}
                </span>
                <span className="flex-shrink-0 mt-0.5">
                  {getLogTypeIcon(log.type)}
                </span>
                <div className={`flex-1 break-words ${getLogTypeClass(log.type)}`}>
                  {log.message.split('\n').map((line, lineIndex) => (
                    <div key={lineIndex}>
                      {line || '\u00A0'} {/* 空行显示为非断行空格 */}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            
            {!isExpanded && logs.length > 5 && (
              <div className="text-center py-2">
                <button
                  onClick={toggleExpanded}
                  className="text-gray-400 hover:text-white text-xs underline"
                >
                  显示全部 {logs.length} 条日志
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 状态栏 */}
      {logs.length > 0 && (
        <div className="px-3 py-1 border-t border-gray-700 flex items-center justify-between text-xs text-gray-400">
          <div>
            最新: {logs.length > 0 ? formatTimestamp(logs[logs.length - 1].timestamp) : ''}
          </div>
          <div className="flex items-center space-x-2">
            {!autoScroll && (
              <div className="flex items-center text-yellow-400">
                <span className="w-2 h-2 bg-yellow-400 rounded-full mr-1"></span>
                滚动已暂停
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}