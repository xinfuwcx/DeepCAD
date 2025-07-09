import React from 'react';
import { Typography } from 'antd';

const { Title } = Typography;

const AnalysisView: React.FC = () => {
  return (
    <div>
      <Title level={2} style={{ color: 'white' }}>Analysis & Results</Title>
      <p style={{ color: 'white' }}>This is where the analysis configuration and results visualization will be.</p>
    </div>
  );
};

export default AnalysisView; 