import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Spin, Typography } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface PageTransitionProps {
  children: React.ReactNode;
  pageKey: string;
  loading?: boolean;
  title?: string;
}

const loadingMessages = [
  '正在启动量子计算核心...',
  '初始化AI神经网络...',
  '加载三维渲染引擎...',
  '连接云端数据库...',
  '优化系统性能...',
  '准备用户界面...'
];

export const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  pageKey,
  loading = false,
  title
}) => {
  const [loadingMessage, setLoadingMessage] = useState(loadingMessages[0]);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        setMessageIndex(prev => {
          const next = (prev + 1) % loadingMessages.length;
          setLoadingMessage(loadingMessages[next]);
          return next;
        });
      }, 800);

      return () => clearInterval(interval);
    }
  }, [loading]);

  const pageVariants = {
    initial: { 
      opacity: 0, 
      x: 50,
      scale: 0.95,
      filter: 'blur(10px)'
    },
    in: { 
      opacity: 1, 
      x: 0,
      scale: 1,
      filter: 'blur(0px)'
    },
    out: { 
      opacity: 0, 
      x: -50,
      scale: 1.05,
      filter: 'blur(10px)'
    }
  };

  const pageTransition = {
    type: 'spring',
    stiffness: 300,
    damping: 30,
    duration: 0.4
  };

  const loadingVariants = {
    hidden: { 
      opacity: 0, 
      scale: 0.8,
      rotate: -180 
    },
    visible: { 
      opacity: 1, 
      scale: 1,
      rotate: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    },
    exit: { 
      opacity: 0, 
      scale: 1.2,
      rotate: 180,
      transition: {
        duration: 0.4
      }
    }
  };

  if (loading) {
    return (
      <motion.div
        variants={loadingVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #16213e 100%)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* 动态背景粒子 */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            radial-gradient(circle at 20% 20%, rgba(0, 217, 255, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(139, 92, 246, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 40% 60%, rgba(16, 185, 129, 0.05) 0%, transparent 50%)
          `,
          animation: 'pulse 4s ease-in-out infinite'
        }} />

        {/* 扫描线效果 */}
        <motion.div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '2px',
            height: '100%',
            background: 'linear-gradient(to bottom, transparent, #00d9ff, transparent)',
            zIndex: 1
          }}
          animate={{ x: ['0vw', '100vw'] }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'linear'
          }}
        />

        {/* 主加载内容 */}
        <motion.div
          style={{ textAlign: 'center', zIndex: 2 }}
          animate={{ 
            y: [0, -10, 0],
            scale: [1, 1.02, 1]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        >
          {/* 自定义加载图标 */}
          <motion.div
            style={{
              width: '80px',
              height: '80px',
              border: '3px solid transparent',
              borderTop: '3px solid #00d9ff',
              borderRadius: '50%',
              margin: '0 auto 30px auto',
              position: 'relative'
            }}
            animate={{ rotate: 360 }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'linear'
            }}
          >
            <motion.div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '50px',
                height: '50px',
                border: '2px solid transparent',
                borderBottom: '2px solid #8b5cf6',
                borderRadius: '50%'
              }}
              animate={{ rotate: -360 }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: 'linear'
              }}
            />
          </motion.div>

          {/* 加载标题 */}
          {title && (
            <motion.h2
              style={{
                color: '#00d9ff',
                fontSize: '2rem',
                fontWeight: 'bold',
                margin: '20px 0',
                fontFamily: 'JetBrains Mono',
                textShadow: '0 0 20px rgba(0, 217, 255, 0.5)'
              }}
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
            >
              {title}
            </motion.h2>
          )}

          {/* 动态加载消息 */}
          <motion.div
            key={loadingMessage}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            <Text style={{
              color: '#a0a0a0',
              fontSize: '1rem',
              fontFamily: 'JetBrains Mono',
              letterSpacing: '1px'
            }}>
              {loadingMessage}
            </Text>
          </motion.div>

          {/* 进度指示器 */}
          <motion.div
            style={{
              width: '300px',
              height: '4px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '2px',
              margin: '30px auto',
              overflow: 'hidden'
            }}
          >
            <motion.div
              style={{
                height: '100%',
                background: 'linear-gradient(90deg, #00d9ff, #8b5cf6)',
                borderRadius: '2px'
              }}
              animate={{ x: ['-100%', '100%'] }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
            />
          </motion.div>

          {/* 系统状态 */}
          <Text style={{
            color: '#666666',
            fontSize: '0.8rem',
            fontFamily: 'JetBrains Mono',
            display: 'block',
            marginTop: '20px'
          }}>
            [ DEEPCAD v3.0.1 - QUANTUM ENHANCED ]
          </Text>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pageKey}
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
        style={{ 
          width: '100%', 
          height: '100%',
          position: 'relative'
        }}
      >
        {/* 页面进入光效 */}
        <motion.div
          initial={{ opacity: 1, x: '-100%' }}
          animate={{ opacity: 0, x: '100%' }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'linear-gradient(90deg, transparent, rgba(0, 217, 255, 0.2), transparent)',
            pointerEvents: 'none',
            zIndex: 1000
          }}
        />

        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export default PageTransition;