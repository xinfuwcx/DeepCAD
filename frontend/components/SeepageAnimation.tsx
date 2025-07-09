import React, { useEffect, useRef, useState } from 'react';
import { Box, Slider, IconButton, Typography } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import ReplayIcon from '@mui/icons-material/Replay';

interface SeepageAnimationProps {
  frames: number[]; // 动画帧数据数组
  frameRate?: number; // 帧率（每秒播放帧数）
  onFrameChange?: (frameIndex: number) => void; // 帧变化回调
  title?: string; // 动画标题
}

/**
 * 渗流动画控制组件
 * 提供动画播放、暂停、重播和帧滑动控制功能
 */
const SeepageAnimation: React.FC<SeepageAnimationProps> = ({
  frames,
  frameRate = 2,
  onFrameChange,
  title = '渗流时间序列动画'
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const animationRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number | null>(null);
  
  // 播放/暂停切换
  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };
  
  // 重置动画
  const resetAnimation = () => {
    setIsPlaying(false);
    setCurrentFrame(0);
    if (onFrameChange) {
      onFrameChange(0);
    }
  };
  
  // 处理帧滑动变化
  const handleFrameChange = (_event: Event, value: number | number[]) => {
    const frameIndex = typeof value === 'number' ? value : value[0];
    setCurrentFrame(frameIndex);
    if (onFrameChange) {
      onFrameChange(frameIndex);
    }
  };
  
  // 动画循环
  const animationLoop = (timestamp: number) => {
    if (!lastFrameTimeRef.current) {
      lastFrameTimeRef.current = timestamp;
    }
    
    const elapsed = timestamp - lastFrameTimeRef.current;
    const frameInterval = 1000 / frameRate; // 帧间隔时间（毫秒）
    
    if (elapsed >= frameInterval) {
      // 更新到下一帧
      const nextFrame = (currentFrame + 1) % frames.length;
      setCurrentFrame(nextFrame);
      if (onFrameChange) {
        onFrameChange(nextFrame);
      }
      
      lastFrameTimeRef.current = timestamp;
    }
    
    animationRef.current = requestAnimationFrame(animationLoop);
  };
  
  // 播放状态变化时处理动画循环
  useEffect(() => {
    if (isPlaying) {
      lastFrameTimeRef.current = null;
      animationRef.current = requestAnimationFrame(animationLoop);
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, currentFrame]);
  
  return (
    <Box
      sx={{
        position: 'absolute',
        bottom: 20,
        left: 20,
        width: 400,
        p: 2,
        backgroundColor: 'rgba(255,255,255,0.85)',
        borderRadius: 2,
        boxShadow: 3
      }}
    >
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        {title} ({currentFrame + 1}/{frames.length})
      </Typography>
      
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <IconButton onClick={togglePlay} size="small" color="primary">
          {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
        </IconButton>
        
        <IconButton onClick={resetAnimation} size="small" color="primary">
          <ReplayIcon />
        </IconButton>
        
        <Slider
          value={currentFrame}
          onChange={handleFrameChange}
          min={0}
          max={frames.length - 1}
          step={1}
          sx={{ ml: 2, flex: 1 }}
        />
      </Box>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="caption">0秒</Typography>
        <Typography variant="caption">
          {((frames.length - 1) / frameRate).toFixed(1)}秒
        </Typography>
      </Box>
    </Box>
  );
};

export default SeepageAnimation; 