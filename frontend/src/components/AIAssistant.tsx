import React, { useState } from 'react';
import { Input, Button, List, Avatar, Card } from 'antd';
import { UserOutlined, RobotOutlined, SendOutlined } from '@ant-design/icons';

interface Message {
  text: string;
  sender: 'user' | 'bot';
}

const AIAssistant: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { text: 'Hello! How can I help you with your geological model today?', sender: 'bot' },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = { text: inputValue, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setLoading(true);

    // Simulate bot response
    setTimeout(() => {
      const botMessage: Message = { text: `I have received your request: "${inputValue}". I am processing it now.`, sender: 'bot' };
      setMessages(prev => [...prev, botMessage]);
      setLoading(false);
    }, 1500);
  };

  return (
    <Card title="AI Assistant" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <List
        itemLayout="horizontal"
        dataSource={messages}
        style={{ flex: 1, overflowY: 'auto', padding: '16px' }}
        renderItem={item => (
          <List.Item style={{ borderBottom: 'none' }}>
            <List.Item.Meta
              avatar={item.sender === 'user' ? <Avatar icon={<UserOutlined />} /> : <Avatar icon={<RobotOutlined />} />}
              title={item.sender === 'user' ? 'You' : 'Assistant'}
              description={<p style={{color: 'white', fontSize: '14px'}}>{item.text}</p>}
            />
          </List.Item>
        )}
      />
      <div style={{ padding: '16px', borderTop: '1px solid #303030' }}>
        <Input.Group compact>
          <Input
            style={{ width: 'calc(100% - 50px)' }}
            placeholder="e.g., 'Create a 50m deep excavation...'"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onPressEnter={handleSendMessage}
            disabled={loading}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSendMessage}
            loading={loading}
          />
        </Input.Group>
      </div>
    </Card>
  );
};

export default AIAssistant; 