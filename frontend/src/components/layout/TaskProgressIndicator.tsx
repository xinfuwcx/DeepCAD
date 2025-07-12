import React from 'react';
import { useUIStore } from '../../stores/useUIStore';
import { Progress, Alert, Button } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, InfoCircleOutlined, RocketOutlined } from '@ant-design/icons';

const TaskProgressIndicator: React.FC = () => {
  const taskProgress = useUIStore((state) => state.taskProgress);
  const resetTaskProgress = useUIStore((state) => state.resetTaskProgress);

  if (!taskProgress || taskProgress.status === 'idle' || taskProgress.status === 'completed') {
    return null;
  }

  const isProcessing = taskProgress.status === 'starting' || taskProgress.status === 'processing';
  const isFinished = taskProgress.status === 'error';

  const getIcon = () => {
    if (taskProgress.status === 'completed') return <CheckCircleOutlined />;
    if (taskProgress.status === 'error') return <CloseCircleOutlined />;
    return taskProgress.message.toLowerCase().includes('computation') ? <RocketOutlined /> : <InfoCircleOutlined />;
  }

  const getType = () => {
    if (taskProgress.status === 'completed') return 'success';
    if (taskProgress.status === 'error') return 'error';
    return 'info';
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      width: '350px',
      zIndex: 1000,
      background: '#2c2c2c',
      padding: '16px',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
    }}>
      <Alert
        message={
          <div style={{display: 'flex', alignItems: 'center', gap: '8px', color: 'white'}}>
            {getIcon()}
            <span>{isProcessing ? 'Processing Task...' : 'Task Finished'}</span>
          </div>
        }
        description={<span style={{color: 'rgba(255,255,255,0.8)'}}>{taskProgress.message}</span>}
        type={getType()}
        style={{ background: 'transparent', border: 'none' }}
        showIcon={false}
      />
      {isProcessing && <Progress percent={taskProgress.progress} status="active" strokeColor={{ from: '#108ee9', to: '#87d068' }} />}
      {isFinished && (
        <Button
          type="primary"
          onClick={resetTaskProgress}
          style={{marginTop: '10px'}}
          ghost
        >
          Dismiss
        </Button>
      )}
    </div>
  );
};

export default TaskProgressIndicator; 