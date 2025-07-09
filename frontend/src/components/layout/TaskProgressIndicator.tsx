import React from 'react';
import { Badge, Popover, List, Progress, Button, Empty } from 'antd';
import { SyncOutlined } from '@ant-design/icons';
import { useDomainStore, Task } from '../../stores/useDomainStore';
import TimeAgo from 'react-timeago';

const TaskItem: React.FC<{ task: Task }> = ({ task }) => {
  const { removeTask } = useDomainStore();

  return (
    <List.Item
      actions={[
        task.status !== 'running' && <Button type="link" size="small" onClick={() => removeTask(task.id)}>Clear</Button>
      ]}
    >
      <List.Item.Meta
        title={task.name}
        description={<TimeAgo date={task.createdAt} />}
      />
      <div style={{ width: '150px' }}>
        <Progress percent={task.progress} size="small" status={task.status === 'failed' ? 'exception' : 'active'} />
      </div>
    </List.Item>
  );
};

const TaskProgressIndicator: React.FC = () => {
  const tasks = useDomainStore((state) => state.tasks);
  const { clearCompletedTasks } = useDomainStore();
  const runningTasks = tasks.filter(task => task.status === 'running');

  const content = (
    <div style={{ width: 350 }}>
      <List
        header={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong>Task Queue</strong>
            <Button size="small" onClick={clearCompletedTasks} disabled={tasks.length === runningTasks.length}>Clear Completed</Button>
          </div>
        }
        dataSource={tasks}
        renderItem={(task) => <TaskItem task={task} />}
        locale={{
          emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No tasks" />
        }}
      />
    </div>
  );

  return (
    <Popover content={content} placement="bottomRight" trigger="click">
      <Badge count={runningTasks.length} size="small">
        <SyncOutlined spin={runningTasks.length > 0} style={{ fontSize: '18px', color: '#fff', cursor: 'pointer' }} />
      </Badge>
    </Popover>
  );
};

export default TaskProgressIndicator; 