/* eslint-disable react/jsx-no-inline-styles */
import React from 'react';
import { useNavigate } from 'react-router-dom';

// Option A: 中心星环 + 卫星模块 欢迎页（宽屏友好）
const WelcomeLanding: React.FC = () => {
  const navigate = useNavigate();

  // 模块配置（环形分布）
  const modules = [
    { key: 'opt', title: '智能优化', desc: 'AI驱动的参数优化/求解', route: '/workspace/physics-ai', hue: 185 },
    { key: 'param', title: '参数化建模', desc: '约束驱动的参数化几何/流程', route: '/workspace/geology-reconstruction', hue: 250 },
    { key: 'multi', title: '多物理耦合', desc: '高性能多物理耦合仿真', route: '/workspace/analysis', hue: 135 },
    { key: 'knowledge', title: '专业知识图谱', desc: '工程计算知识库与标准数据', route: '/workspace/results', hue: 285 },
    { key: 'materials', title: '数据/材料库', desc: '材料/土样/库表一体化', route: '/workspace/materials', hue: 205 }
  ];

  // 计算环上坐标（响应宽屏）
  const ringRadiusVW = 24; // 以视口宽度为单位的半径，宽屏更舒展
  const centerOffsetTop = 6; // 中心略上移，避免压底部CTA

  return (
    <div style={{
      width: '100%',
      height: '100%',
      position: 'relative',
      overflow: 'hidden',
      background: `
        radial-gradient(circle at 20% 80%, rgba(0, 100, 200, 0.25) 0%, transparent 50%),
        radial-gradient(circle at 80% 20%, rgba(0, 160, 255, 0.18) 0%, transparent 52%),
        radial-gradient(circle at 50% 50%, rgba(0, 170, 255, 0.22) 0%, transparent 60%),
        linear-gradient(135deg, #060812 0%, #0a1433 35%, #0d2555 70%, #0e2f6a 100%)
      `,
      fontFamily: 'Inter, Segoe UI, -apple-system, Roboto, sans-serif'
    }}>
      {/* 赛博网格 */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)
        `,
        backgroundSize: '64px 64px, 64px 64px',
        maskImage: 'radial-gradient(circle at 50% 50%, black 50%, transparent 90%)',
        pointerEvents: 'none'
      }} />

      {/* 顶部标题区 */}
      <div style={{
        position: 'absolute', top: '36px', left: '6%', right: '6%',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, #5ce1ff, #7a5cff)',
            boxShadow: '0 0 16px rgba(124, 200, 255, 0.6)'
          }} />
          <div>
            <div style={{
              fontSize: 18, letterSpacing: 1,
              background: 'linear-gradient(90deg,#9ae6ff,#a48bff)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
            }}>DeepCAD</div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
              智能深基坑分析设计系统 · WebGPU + Three.js + 专业CAE
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          {[
            {label: '控制中心', to: '/workspace/control-center'},
            {label: '设置', to: '/workspace/settings'},
            {label: '素材库', to: '/workspace/materials'},
          ].map(btn => (
            <button key={btn.label}
              onClick={() => navigate(btn.to)}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(124,200,255,0.3)',
                color: '#e8f7ff', borderRadius: 10,
                padding: '8px 14px', fontSize: 12, cursor: 'pointer'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
              }}
            >{btn.label}</button>
          ))}
        </div>
      </div>

      {/* 中央主卡片 */}
      <div style={{
        position: 'absolute',
        top: `calc(50% - ${centerOffsetTop}vh)`, left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 460, maxWidth: '80vw', height: 280,
        background: 'linear-gradient(135deg, rgba(8,20,48,0.75), rgba(12,24,66,0.75))',
        border: '1px solid rgba(124,200,255,0.35)',
        boxShadow: '0 20px 100px rgba(0,0,0,0.4), 0 0 60px rgba(60,180,255,0.25)',
        borderRadius: 18, backdropFilter: 'blur(16px)',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'
      }}>
        <div style={{
          fontSize: 22, marginBottom: 8,
          color: '#bfe9ff', textShadow: '0 0 18px rgba(124,200,255,0.6)'
        }}>核心模块</div>
        <div style={{
          fontSize: 26, fontWeight: 700, marginBottom: 10,
          background: 'linear-gradient(90deg,#a7f3ff,#c8b7ff)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
        }}>炫酷项目管理中心</div>
        <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, textAlign: 'center', maxWidth: 380 }}>
          高德地图 · Deck.gl 炫酷图层 · OpenMeteo天气 · 基坑项目管理
        </div>
        <div style={{ marginTop: 16 }}>
          <button
            onClick={() => navigate('/workspace/control-center')}
            style={{
              padding: '10px 18px', fontSize: 14, cursor: 'pointer',
              borderRadius: 12, color: '#001018',
              background: 'linear-gradient(90deg,#7ee8ff,#a48bff)',
              border: 'none', boxShadow: '0 12px 40px rgba(126,232,255,0.35)'
            }}
          >进入控制中心</button>
        </div>
      </div>

      {/* 扩散能量环 */}
      <div style={{
        position: 'absolute', top: `calc(50% - ${centerOffsetTop}vh)`, left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '40vw', height: '40vw', maxWidth: 880, maxHeight: 880,
        borderRadius: '50%',
        border: '1px solid rgba(124,200,255,0.25)',
        boxShadow: '0 0 60px rgba(124,200,255,0.22) inset',
        pointerEvents: 'none'
      }} />

      {/* 卫星模块卡（环形分布） */}
      {modules.map((m, idx) => {
        const angle = (idx / modules.length) * Math.PI * 2 - Math.PI / 2; // 从上方向起点
        const x = 50 + Math.cos(angle) * ringRadiusVW;
        const y = 50 - centerOffsetTop + Math.sin(angle) * (ringRadiusVW * 0.58);
        return (
          <div key={m.key}
            onClick={() => navigate(m.route)}
            style={{
              position: 'absolute',
              left: `${x}vw`, top: `${y}vh`, transform: 'translate(-50%, -50%)',
              width: 360, maxWidth: '38vw', height: 220,
              background: 'linear-gradient(135deg, rgba(10,24,58,0.7), rgba(14,30,74,0.7))',
              border: `1px solid hsla(${m.hue}, 100%, 70%, 0.45)`,
              borderRadius: 16, backdropFilter: 'blur(14px)',
              boxShadow: `0 20px 80px hsla(${m.hue}, 100%, 60%, 0.18)`,
              cursor: 'pointer', transition: 'transform .2s ease, box-shadow .2s ease'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.02)';
              e.currentTarget.style.boxShadow = `0 26px 100px hsla(${m.hue},100%,60%,0.28)`;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translate(-50%, -50%)';
              e.currentTarget.style.boxShadow = `0 20px 80px hsla(${m.hue},100%,60%,0.18)`;
            }}
          >
            <div style={{ padding: 18, display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: `hsl(${m.hue}, 100%, 75%)`, marginBottom: 6 }}>{m.title}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>{m.desc}</div>
              <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-end' }}>
                <span style={{
                  padding: '6px 10px', fontSize: 12,
                  borderRadius: 10, color: `hsl(${m.hue}, 100%, 15%)`,
                  background: `linear-gradient(90deg, hsla(${m.hue},100%,72%,0.95), hsla(${m.hue+20},100%,75%,0.95))`,
                  boxShadow: `0 8px 26px hsla(${m.hue},100%,60%,0.28)`
                }}>进入</span>
              </div>
            </div>
          </div>
        );
      })}

      {/* 底部主CTA */}
      <div style={{ position: 'absolute', bottom: '48px', left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
        <button
          onClick={() => navigate('/workspace/geology-reconstruction')}
          style={{
            padding: '12px 20px', fontSize: 14, cursor: 'pointer',
            borderRadius: 14, color: '#001018',
            background: 'linear-gradient(90deg,#7ee8ff,#a48bff)',
            border: 'none', boxShadow: '0 18px 60px rgba(126,232,255,0.3)'
          }}
        >🚀 进入主界面</button>
      </div>
    </div>
  );
};

export default WelcomeLanding;
