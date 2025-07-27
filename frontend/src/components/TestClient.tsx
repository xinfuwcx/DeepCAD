import React, { useState, useEffect, useRef } from 'react';

// 定义从后端接收到的消息格式
interface TaskUpdate {
  task_id: string;
  status: string;
  progress: number;
  data: {
    message?: string;
    mesh?: any;
    error?: string;
  };
}

const API_URL = 'http://localhost:8000';
const WS_URL = 'ws://localhost:8000';

export const TestClient: React.FC = () => {
  // 状态管理
  const [clientId] = useState(`client_${Math.random().toString(36).substring(2, 9)}`);
  const [isConnected, setIsConnected] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [lastTask, setLastTask] = useState<TaskUpdate | null>(null);

  const ws = useRef<WebSocket | null>(null);

  const addLog = (message: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${message}`, ...prev]);
  };

  // WebSocket连接处理
  useEffect(() => {
    addLog(`客户端ID: ${clientId}`);
    
    const connect = () => {
      ws.current = new WebSocket(`${WS_URL}/ws/${clientId}`);

      ws.current.onopen = () => {
        setIsConnected(true);
        addLog('✅ WebSocket 连接成功');
      };

      ws.current.onmessage = (event) => {
        const message: TaskUpdate = JSON.parse(event.data);
        addLog(`📩 收到更新: ${message.status} (${message.progress}%)`);
        setLastTask(message);
      };

      ws.current.onerror = (event) => {
        addLog(`❌ WebSocket 发生错误`);
        console.error("WebSocket Error:", event);
      };

      ws.current.onclose = () => {
        setIsConnected(false);
        addLog('🔌 WebSocket 连接关闭. 3秒后尝试重连...');
        setTimeout(() => connect(), 3000);
      };
    };

    connect();

    return () => {
      ws.current?.close();
    };
  }, [clientId]);

  // 发送任务请求
  const handleCreateTask = async () => {
    if (!isConnected) {
      addLog("无法创建任务：WebSocket未连接。");
      return;
    }
    addLog("🚀 发送创建立方体任务...");
    setLastTask(null); // 重置上一个任务的状态

    try {
      const response = await fetch(`${API_URL}/tasks/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          task_type: 'geometry_create_box',
          parameters: {
            dimensions: [2, 3, 4],
          },
        }),
      });

      if (response.status === 202) {
        const data = await response.json();
        addLog(`✅ 任务已成功受理，任务ID: ${data.task_id}`);
        // 初始化任务状态
        setLastTask({
          task_id: data.task_id,
          status: 'accepted',
          progress: 0,
          data: { message: '任务已受理，等待worker响应...' }
        });
      } else {
        const errorText = await response.text();
        addLog(`🔥 创建任务失败: ${response.status} ${errorText}`);
      }
    } catch (error) {
      addLog(`🔥 创建任务时发生网络错误: ${error}`);
    }
  };
  
  // UI渲染
  return (
    <div className="bg-gray-900 text-white min-h-screen p-4 font-sans">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold text-cyan-400">DeepCAD E2E Test Client</h1>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm">{isConnected ? '已连接' : '未连接'}</span>
          </div>
        </div>
        
        <div className="mb-4">
          <button
            onClick={handleCreateTask}
            disabled={!isConnected}
            className="bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-500 text-white font-bold py-2 px-4 rounded transition-colors"
          >
            发送 "创建立方体" 任务
          </button>
        </div>

        {lastTask && (
          <div className="bg-gray-800 p-4 rounded-lg mb-4">
            <h2 className="text-xl font-bold mb-2">最新任务状态</h2>
            <p><strong>任务 ID:</strong> {lastTask.task_id}</p>
            <p><strong>状态:</strong> <span className="font-semibold text-yellow-400">{lastTask.status}</span></p>
            <div className="w-full bg-gray-700 rounded-full h-2.5 my-2">
              <div
                className="bg-green-500 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${lastTask.progress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-400">{lastTask.data.message || (lastTask.data.error && `错误: ${lastTask.data.error}`) || '等待消息...'}</p>
          </div>
        )}

        <div>
          <h2 className="text-xl font-bold mb-2">实时日志</h2>
          <div className="bg-black p-4 rounded-lg h-80 overflow-y-auto font-mono text-sm">
            {logs.map((log, i) => (
              <p key={i} className={log.includes('✅') ? 'text-green-400' : log.includes('🔥') ? 'text-red-400' : ''}>
                {log}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}; 