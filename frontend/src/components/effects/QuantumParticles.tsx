import React, { useRef, useEffect } from 'react';

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  color: string;
  opacity: number;
  life: number;
  maxLife: number;
}

const QuantumParticles: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const requestIdRef = useRef<number>(0);
  const mousePositionRef = useRef({ x: -100, y: -100 });

  // 创建粒子
  const createParticle = (x: number, y: number, isMouseParticle = false): Particle => {
    const colors = [
      'var(--particle-color-1)',
      'var(--particle-color-2)',
      'var(--particle-color-3)',
      'var(--particle-color-4)',
    ];
    
    const size = isMouseParticle 
      ? Math.random() * 3 + 2 
      : Math.random() * 
        (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--particle-size-max')) - 
         parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--particle-size-min'))) + 
         parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--particle-size-min'));
    
    const speed = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--particle-speed')) || 1;
    
    return {
      x,
      y,
      size,
      speedX: (Math.random() - 0.5) * speed * (isMouseParticle ? 3 : 0.5),
      speedY: (Math.random() - 0.5) * speed * (isMouseParticle ? 3 : 0.5),
      color: colors[Math.floor(Math.random() * colors.length)],
      opacity: isMouseParticle ? 0.8 : Math.random() * 0.5 + 0.2,
      life: 0,
      maxLife: isMouseParticle ? 30 : Math.random() * 300 + 100
    };
  };

  // 初始化粒子
  const initParticles = (canvas: HTMLCanvasElement) => {
    const particleCount = Math.min(
      Math.floor((canvas.width * canvas.height) / 10000), 
      150
    ); // 根据屏幕大小调整粒子数量，但最多150个
    
    particlesRef.current = [];
    for (let i = 0; i < particleCount; i++) {
      particlesRef.current.push(
        createParticle(
          Math.random() * canvas.width,
          Math.random() * canvas.height
        )
      );
    }
  };

  // 更新粒子
  const updateParticles = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    particlesRef.current = particlesRef.current.filter(p => p.life < p.maxLife);

    // 添加鼠标位置的粒子
    if (mousePositionRef.current.x > 0 && mousePositionRef.current.y > 0) {
      for (let i = 0; i < 2; i++) {
        particlesRef.current.push(
          createParticle(
            mousePositionRef.current.x, 
            mousePositionRef.current.y,
            true
          )
        );
      }
    }

    // 更新和绘制粒子
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particlesRef.current.forEach(p => {
      p.life++;
      p.x += p.speedX;
      p.y += p.speedY;
      
      // 边界检查
      if (p.x < 0 || p.x > canvas.width) p.speedX *= -1;
      if (p.y < 0 || p.y > canvas.height) p.speedY *= -1;
      
      // 绘制粒子
      const lifeRatio = 1 - p.life / p.maxLife;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * lifeRatio, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.opacity * lifeRatio;
      ctx.fill();
    });
  };

  // 动画循环
  const animate = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      updateParticles(canvas);
    }
    requestIdRef.current = requestAnimationFrame(animate);
  };

  // 处理鼠标移动
  const handleMouseMove = (event: MouseEvent) => {
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      mousePositionRef.current = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      };
    }
  };

  // 处理鼠标离开
  const handleMouseLeave = () => {
    mousePositionRef.current = { x: -100, y: -100 };
  };

  // 设置画布尺寸
  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
        initParticles(canvas);
      }
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      // 设置初始尺寸
      resizeCanvas();
      
      // 添加事件监听器
      window.addEventListener('resize', resizeCanvas);
      canvas.addEventListener('mousemove', handleMouseMove);
      canvas.addEventListener('mouseleave', handleMouseLeave);
      
      // 启动动画
      requestIdRef.current = requestAnimationFrame(animate);
    }
    
    // 清理
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (canvas) {
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('mouseleave', handleMouseLeave);
      }
      cancelAnimationFrame(requestIdRef.current);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="particle-container"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0
      }}
    />
  );
};

export default QuantumParticles; 