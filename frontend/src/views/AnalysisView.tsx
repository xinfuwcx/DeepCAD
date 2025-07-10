import React from 'react';
import { Button, Card, Typography, Row, Col } from 'antd';
import { RocketOutlined } from '@ant-design/icons';
import { useSceneStore } from '../stores/useSceneStore';
import PostProcessingControls from '../components/PostProcessingControls';

const { Title, Paragraph } = Typography;

const AnalysisView: React.FC = () => {
    
    const { startComputation, computationResultUrl } = useSceneStore(state => ({
        startComputation: state.startComputation,
        computationResultUrl: state.computationResultUrl,
    }));

    return (
        <div>
            <Title level={2} style={{ color: 'white' }}>Analysis & Computation</Title>
            <Paragraph style={{ color: 'rgba(255,255,255,0.7)' }}>
                Configure and run the numerical analysis, then visualize the results.
            </Paragraph>
            <Row gutter={24}>
                <Col span={12}>
                    <Card style={{ background: '#2c2c2c', borderColor: '#424242', height: '100%' }}>
                        <Title level={4} style={{ color: 'white' }}>Start New Computation</Title>
                        <Paragraph  style={{ color: 'rgba(255,255,255,0.7)' }}>
                            Click the button below to start the solver. Progress will be displayed
                            in the task indicator.
                        </Paragraph>
                        <Button 
                            type="primary" 
                            icon={<RocketOutlined />} 
                            size="large"
                            onClick={startComputation}
                        >
                            Run Solver
                        </Button>
                    </Card>
                </Col>
                <Col span={12}>
                    {computationResultUrl && <PostProcessingControls />}
                </Col>
            </Row>
        </div>
    );
};

export default AnalysisView; 