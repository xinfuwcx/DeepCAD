/**
 * DeepCAD 深基坑CAE系统主应用
 * 1号架构师 - 专业深基坑计算分析平台
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ==================== 主应用界面 ====================

export const DeepCADMainApp: React.FC = () => {
  const [currentModule, setCurrentModule] = useState<string>('welcome');
  const [projectData, setProjectData] = useState<any>(null);

  const modules = [
    { id: 'welcome', name: '欢迎', icon: '🏠' },
    { id: 'gis', name: 'GIS地质', icon: '🌍' },
    { id: 'physics_ai', name: '物理AI', icon: '🤖' },
    { id: 'preprocess', name: '前处理', icon: '⚙️' },
    { id: 'solver', name: '求解器', icon: '🔧' },
    { id: 'postprocess', name: '后处理', icon: '📊' },
    { id: 'project', name: '项目管理', icon: '📁' }
  ];

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      backgroundColor: '#f5f5f5',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* 左侧导航 */}
      <div style={{
        width: '250px',
        backgroundColor: '#2c3e50',
        color: 'white',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Logo区域 */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #34495e',
          textAlign: 'center'
        }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem' }}>DeepCAD</h2>
          <p style={{ margin: '5px 0 0 0', fontSize: '0.9rem', opacity: 0.8 }}>
            深基坑CAE分析系统
          </p>
        </div>

        {/* 导航菜单 */}
        <nav style={{ flex: 1, padding: '20px 0' }}>
          {modules.map(module => (
            <button
              key={module.id}
              onClick={() => setCurrentModule(module.id)}
              style={{
                width: '100%',
                padding: '15px 20px',
                border: 'none',
                backgroundColor: currentModule === module.id ? '#3498db' : 'transparent',
                color: 'white',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '1rem',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => {
                if (currentModule !== module.id) {
                  e.currentTarget.style.backgroundColor = '#34495e';
                }
              }}
              onMouseLeave={(e) => {
                if (currentModule !== module.id) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <span style={{ marginRight: '10px' }}>{module.icon}</span>
              {module.name}
            </button>
          ))}
        </nav>

        {/* 底部信息 */}
        <div style={{
          padding: '20px',
          borderTop: '1px solid #34495e',
          fontSize: '0.8rem',
          opacity: 0.7
        }}>
          <div>版本: v2.1.0</div>
          <div>© 2024 DeepCAD</div>
        </div>
      </div>

      {/* 主内容区域 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* 顶部工具栏 */}
        <div style={{
          height: '60px',
          backgroundColor: 'white',
          borderBottom: '1px solid #ddd',
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ margin: 0, color: '#2c3e50' }}>
            {modules.find(m => m.id === currentModule)?.name || '深基坑CAE系统'}
          </h3>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px' }}>
            <button style={{
              padding: '8px 16px',
              border: '1px solid #ddd',
              backgroundColor: 'white',
              cursor: 'pointer',
              borderRadius: '4px'
            }}>
              新建项目
            </button>
            <button style={{
              padding: '8px 16px',
              border: '1px solid #ddd',
              backgroundColor: 'white',
              cursor: 'pointer',
              borderRadius: '4px'
            }}>
              打开项目
            </button>
            <button style={{
              padding: '8px 16px',
              border: '1px solid #ddd',
              backgroundColor: 'white',
              cursor: 'pointer',
              borderRadius: '4px'
            }}>
              保存
            </button>
          </div>
        </div>

        {/* 内容区域 */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          <AnimatePresence mode="wait">
            {currentModule === 'welcome' && <WelcomeModule key="welcome" />}
            {currentModule === 'gis' && <GISModule key="gis" />}
            {currentModule === 'physics_ai' && <PhysicsAIModule key="physics_ai" />}
            {currentModule === 'preprocess' && <PreprocessModule key="preprocess" />}
            {currentModule === 'solver' && <SolverModule key="solver" />}
            {currentModule === 'postprocess' && <PostprocessModule key="postprocess" />}
            {currentModule === 'project' && <ProjectModule key="project" />}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

// ==================== 欢迎模块 ====================

const WelcomeModule: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    style={{ padding: '40px', textAlign: 'center' }}
  >
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      backgroundColor: 'white',
      padding: '40px',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
    }}>
      <h1 style={{ color: '#2c3e50', marginBottom: '20px' }}>
        欢迎使用 DeepCAD 深基坑CAE分析系统
      </h1>
      
      <p style={{ fontSize: '1.1rem', color: '#666', lineHeight: 1.6, marginBottom: '30px' }}>
        专业的深基坑工程计算机辅助工程软件，提供完整的前处理、求解计算和后处理功能。
        支持复杂的深基坑稳定性分析、变形计算和支护结构设计。
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        marginTop: '40px'
      }}>
        {[
          {
            title: '几何建模',
            desc: '创建复杂的深基坑几何模型，包括土层、围护结构、支撑系统等',
            icon: '🏗️'
          },
          {
            title: '网格生成', 
            desc: '高质量有限元网格自动生成，支持四面体和六面体网格',
            icon: '🔷'
          },
          {
            title: '材料定义',
            desc: '完整的岩土材料库，支持线性/非线性本构模型',
            icon: '⚛️'
          },
          {
            title: '边界条件',
            desc: '灵活的载荷和约束定义，支持施工阶段模拟',
            icon: '🔗'
          },
          {
            title: '求解计算',
            desc: '高性能有限元求解器，支持静力、动力和耦合分析',
            icon: '⚡'
          },
          {
            title: '结果分析',
            desc: '专业的后处理功能，包括应力、位移、安全系数等',
            icon: '📈'
          }
        ].map((feature, index) => (
          <div
            key={index}
            style={{
              padding: '20px',
              border: '1px solid #eee',
              borderRadius: '8px',
              textAlign: 'center',
              backgroundColor: '#fafafa'
            }}
          >
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>
              {feature.icon}
            </div>
            <h4 style={{ color: '#2c3e50', marginBottom: '10px' }}>
              {feature.title}
            </h4>
            <p style={{ color: '#666', fontSize: '0.9rem', margin: 0 }}>
              {feature.desc}
            </p>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '40px' }}>
        <button style={{
          padding: '12px 30px',
          backgroundColor: '#3498db',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontSize: '1.1rem',
          cursor: 'pointer',
          marginRight: '15px'
        }}>
          开始新项目
        </button>
        <button style={{
          padding: '12px 30px',
          backgroundColor: 'white',
          color: '#3498db',
          border: '2px solid #3498db',
          borderRadius: '6px',
          fontSize: '1.1rem',
          cursor: 'pointer'
        }}>
          查看示例
        </button>
      </div>
    </div>
  </motion.div>
);

// ==================== 前处理模块 ====================

const PreprocessModule: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -20 }}
    style={{ padding: '20px', height: '100%' }}
  >
    <div style={{ display: 'flex', height: '100%', gap: '20px' }}>
      {/* 左侧工具面板 */}
      <div style={{
        width: '300px',
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ marginTop: 0, color: '#2c3e50' }}>几何建模</h3>
        
        <div style={{ marginBottom: '20px' }}>
          <h4>基坑参数</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label>
              开挖深度 (m):
              <input type="number" defaultValue="15" style={{
                width: '100%', padding: '5px', marginTop: '5px',
                border: '1px solid #ddd', borderRadius: '4px'
              }} />
            </label>
            <label>
              开挖宽度 (m):
              <input type="number" defaultValue="50" style={{
                width: '100%', padding: '5px', marginTop: '5px',
                border: '1px solid #ddd', borderRadius: '4px'
              }} />
            </label>
            <label>
              开挖长度 (m):
              <input type="number" defaultValue="80" style={{
                width: '100%', padding: '5px', marginTop: '5px',
                border: '1px solid #ddd', borderRadius: '4px'
              }} />
            </label>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h4>围护结构</h4>
          <select style={{
            width: '100%', padding: '8px',
            border: '1px solid #ddd', borderRadius: '4px'
          }}>
            <option>地下连续墙</option>
            <option>钻孔灌注桩</option>
            <option>SMW工法桩</option>
          </select>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h4>支撑系统</h4>
          <label>
            <input type="checkbox" /> 钢支撑
          </label><br />
          <label>
            <input type="checkbox" /> 混凝土支撑
          </label><br />
          <label>
            <input type="checkbox" /> 土锚
          </label>
        </div>

        <button style={{
          width: '100%',
          padding: '10px',
          backgroundColor: '#27ae60',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}>
          生成几何模型
        </button>
      </div>

      {/* 右侧3D视图 */}
      <div style={{
        flex: 1,
        backgroundColor: 'white',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        background: 'linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f0f0f0 75%), linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)',
        backgroundSize: '20px 20px',
        backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
      }}>
        <div style={{
          textAlign: 'center',
          color: '#666',
          backgroundColor: 'white',
          padding: '40px',
          borderRadius: '8px',
          border: '2px dashed #ddd'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🏗️</div>
          <h3>3D 几何视图</h3>
          <p>在此处显示深基坑三维模型</p>
          <button style={{
            padding: '10px 20px',
            backgroundColor: '#3498db',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}>
            加载示例模型
          </button>
        </div>
      </div>
    </div>
  </motion.div>
);

// ==================== 求解器模块 ====================

const SolverModule: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -20 }}
    style={{ padding: '20px' }}
  >
    <div style={{
      backgroundColor: 'white',
      borderRadius: '8px',
      padding: '30px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    }}>
      <h2 style={{ color: '#2c3e50', marginBottom: '30px' }}>有限元求解器</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        <div>
          <h3>分析类型</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label>
              <input type="radio" name="analysis" defaultChecked /> 静力分析
            </label>
            <label>
              <input type="radio" name="analysis" /> 动力分析
            </label>
            <label>
              <input type="radio" name="analysis" /> 流固耦合分析
            </label>
            <label>
              <input type="radio" name="analysis" /> 施工阶段分析
            </label>
          </div>
        </div>

        <div>
          <h3>求解参数</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <label>
              收敛容差:
              <input type="number" defaultValue="1e-6" step="1e-6" style={{
                width: '100%', padding: '5px', marginTop: '5px',
                border: '1px solid #ddd', borderRadius: '4px'
              }} />
            </label>
            <label>
              最大迭代次数:
              <input type="number" defaultValue="100" style={{
                width: '100%', padding: '5px', marginTop: '5px',
                border: '1px solid #ddd', borderRadius: '4px'
              }} />
            </label>
            <label>
              求解器类型:
              <select style={{
                width: '100%', padding: '8px', marginTop: '5px',
                border: '1px solid #ddd', borderRadius: '4px'
              }}>
                <option>直接求解器 (PARDISO)</option>
                <option>迭代求解器 (PCG)</option>
                <option>多重网格求解器</option>
              </select>
            </label>
          </div>
        </div>
      </div>

      <div style={{
        marginTop: '40px',
        padding: '20px',
        backgroundColor: '#f8f9fa',
        borderRadius: '6px',
        border: '1px solid #e9ecef'
      }}>
        <h4>计算状态</h4>
        <div style={{ marginBottom: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>网格节点数: 45,678</span>
            <span>单元数: 234,567</span>
          </div>
        </div>
        <div style={{
          width: '100%',
          height: '20px',
          backgroundColor: '#e9ecef',
          borderRadius: '10px',
          marginBottom: '10px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: '0%',
            height: '100%',
            backgroundColor: '#28a745',
            transition: 'width 0.3s'
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
          <span>准备开始计算...</span>
          <span>0%</span>
        </div>
      </div>

      <div style={{ marginTop: '30px', textAlign: 'center' }}>
        <button style={{
          padding: '15px 40px',
          backgroundColor: '#e74c3c',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontSize: '1.1rem',
          cursor: 'pointer',
          marginRight: '15px'
        }}>
          开始计算
        </button>
        <button style={{
          padding: '15px 40px',
          backgroundColor: '#95a5a6',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontSize: '1.1rem',
          cursor: 'pointer'
        }}>
          停止计算
        </button>
      </div>
    </div>
  </motion.div>
);

// ==================== 后处理模块 ====================

const PostprocessModule: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -20 }}
    style={{ padding: '20px', height: '100%' }}
  >
    <div style={{ display: 'flex', height: '100%', gap: '20px' }}>
      {/* 左侧结果选择 */}
      <div style={{
        width: '250px',
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ marginTop: 0, color: '#2c3e50' }}>结果分析</h3>
        
        <div style={{ marginBottom: '20px' }}>
          <h4>结果类型</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label>
              <input type="radio" name="result" defaultChecked /> 位移
            </label>
            <label>
              <input type="radio" name="result" /> 应力
            </label>
            <label>
              <input type="radio" name="result" /> 应变
            </label>
            <label>
              <input type="radio" name="result" /> 安全系数
            </label>
            <label>
              <input type="radio" name="result" /> 孔隙水压力
            </label>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h4>显示选项</h4>
          <label>
            <input type="checkbox" defaultChecked /> 等值线
          </label><br />
          <label>
            <input type="checkbox" /> 等值面
          </label><br />
          <label>
            <input type="checkbox" defaultChecked /> 变形图
          </label><br />
          <label>
            <input type="checkbox" /> 矢量图
          </label>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h4>颜色映射</h4>
          <select style={{
            width: '100%', padding: '8px',
            border: '1px solid #ddd', borderRadius: '4px'
          }}>
            <option>彩虹色</option>
            <option>蓝-红</option>
            <option>灰度</option>
            <option>热力图</option>
          </select>
        </div>

        <button style={{
          width: '100%',
          padding: '10px',
          backgroundColor: '#9b59b6',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}>
          更新显示
        </button>
      </div>

      {/* 右侧结果显示 */}
      <div style={{
        flex: 1,
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          textAlign: 'center',
          color: '#666'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '20px' }}>📊</div>
          <h3>计算结果可视化</h3>
          <p>在此处显示位移、应力等计算结果</p>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '20px',
            marginTop: '30px'
          }}>
            <div style={{
              padding: '15px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              minWidth: '120px'
            }}>
              <div style={{ fontSize: '1.5rem', color: '#e74c3c' }}>
                12.5 mm
              </div>
              <div style={{ fontSize: '0.9rem', color: '#666' }}>
                最大位移
              </div>
            </div>
            <div style={{
              padding: '15px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              minWidth: '120px'
            }}>
              <div style={{ fontSize: '1.5rem', color: '#f39c12' }}>
                245 kPa
              </div>
              <div style={{ fontSize: '0.9rem', color: '#666' }}>
                最大应力
              </div>
            </div>
            <div style={{
              padding: '15px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              minWidth: '120px'
            }}>
              <div style={{ fontSize: '1.5rem', color: '#27ae60' }}>
                1.35
              </div>
              <div style={{ fontSize: '0.9rem', color: '#666' }}>
                安全系数
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </motion.div>
);

// ==================== GIS地质模块 ====================

const GISModule: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -20 }}
    style={{ padding: '20px' }}
  >
    <div style={{
      backgroundColor: 'white',
      borderRadius: '8px',
      padding: '30px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    }}>
      <h2 style={{ color: '#2c3e50', marginBottom: '30px' }}>GIS地质信息系统</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        <div>
          <h3>地质勘察数据</h3>
          <div style={{
            padding: '20px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            minHeight: '200px',
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div>
              <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🌍</div>
              <p>导入钻孔数据</p>
              <button style={{
                padding: '10px 20px',
                backgroundColor: '#27ae60',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}>
                选择文件
              </button>
            </div>
          </div>
        </div>

        <div>
          <h3>地层分析</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '6px' }}>
              <strong>第1层：填土</strong><br />
              厚度: 2.5m | 重度: 18kN/m³ | 粘聚力: 15kPa
            </div>
            <div style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '6px' }}>
              <strong>第2层：粉质粘土</strong><br />
              厚度: 8.0m | 重度: 19.5kN/m³ | 粘聚力: 25kPa
            </div>
            <div style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '6px' }}>
              <strong>第3层：中砂</strong><br />
              厚度: 12.0m | 重度: 20kN/m³ | 内摩擦角: 30°
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '30px', textAlign: 'center' }}>
        <button style={{
          padding: '15px 40px',
          backgroundColor: '#27ae60',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontSize: '1.1rem',
          cursor: 'pointer',
          marginRight: '15px'
        }}>
          生成地质模型
        </button>
        <button style={{
          padding: '15px 40px',
          backgroundColor: '#3498db',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontSize: '1.1rem',
          cursor: 'pointer'
        }}>
          导出报告
        </button>
      </div>
    </div>
  </motion.div>
);

// ==================== 物理AI模块 ====================

const PhysicsAIModule: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -20 }}
    style={{ padding: '20px' }}
  >
    <div style={{
      backgroundColor: 'white',
      borderRadius: '8px',
      padding: '30px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    }}>
      <h2 style={{ color: '#2c3e50', marginBottom: '30px' }}>物理AI智能分析</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        <div>
          <h3>AI模型预测</h3>
          <div style={{
            padding: '20px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            border: '1px solid #e9ecef'
          }}>
            <div style={{ marginBottom: '15px' }}>
              <label>预测类型:</label>
              <select style={{
                width: '100%', padding: '8px', marginTop: '5px',
                border: '1px solid #ddd', borderRadius: '4px'
              }}>
                <option>变形预测</option>
                <option>稳定性评估</option>
                <option>支护优化</option>
                <option>风险评估</option>
              </select>
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <label>可信度阈值:</label>
              <input type="range" min="0.5" max="0.99" step="0.01" defaultValue="0.85" style={{
                width: '100%', marginTop: '5px'
              }} />
              <div style={{ textAlign: 'center', fontSize: '0.9rem', color: '#666' }}>85%</div>
            </div>

            <button style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#9b59b6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}>
              开始AI分析
            </button>
          </div>
        </div>

        <div>
          <h3>分析结果</h3>
          <div style={{
            padding: '20px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            minHeight: '200px'
          }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '15px'
            }}>
              <div style={{ padding: '15px', backgroundColor: '#d4edda', borderRadius: '6px', border: '1px solid #c3e6cb' }}>
                <strong style={{ color: '#155724' }}>稳定性评估: 良好</strong><br />
                <span style={{ fontSize: '0.9rem', color: '#155724' }}>预测置信度: 92%</span>
              </div>
              
              <div style={{ padding: '15px', backgroundColor: '#fff3cd', borderRadius: '6px', border: '1px solid #ffeaa7' }}>
                <strong style={{ color: '#856404' }}>最大变形: 15.2mm</strong><br />
                <span style={{ fontSize: '0.9rem', color: '#856404' }}>预测位置: 墙顶中部</span>
              </div>
              
              <div style={{ padding: '15px', backgroundColor: '#cce5ff', borderRadius: '6px', border: '1px solid #99d6ff' }}>
                <strong style={{ color: '#004085' }}>支护建议</strong><br />
                <span style={{ fontSize: '0.9rem', color: '#004085' }}>建议增加第2道支撑</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </motion.div>
);

// ==================== 项目管理模块 ====================

const ProjectModule: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -20 }}
    style={{ padding: '20px' }}
  >
    <div style={{
      backgroundColor: 'white',
      borderRadius: '8px',
      padding: '30px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    }}>
      <h2 style={{ color: '#2c3e50', marginBottom: '30px' }}>项目管理</h2>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '20px'
      }}>
        {[
          { name: '上海地铁深基坑工程', date: '2024-01-15', status: '计算中' },
          { name: '北京CBD商业楼基坑', date: '2024-01-10', status: '已完成' },
          { name: '深圳前海基坑支护', date: '2024-01-08', status: '建模中' },
          { name: '广州地下空间开发', date: '2024-01-05', status: '已完成' }
        ].map((project, index) => (
          <div
            key={index}
            style={{
              border: '1px solid #ddd',
              borderRadius: '8px',
              padding: '20px',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
              e.currentTarget.style.borderColor = '#3498db';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.borderColor = '#ddd';
            }}
          >
            <h4 style={{ margin: '0 0 10px 0', color: '#2c3e50' }}>
              {project.name}
            </h4>
            <p style={{ margin: '5px 0', color: '#666', fontSize: '0.9rem' }}>
              创建时间: {project.date}
            </p>
            <p style={{ margin: '5px 0', fontSize: '0.9rem' }}>
              状态: <span style={{
                color: project.status === '已完成' ? '#27ae60' : 
                       project.status === '计算中' ? '#f39c12' : '#3498db'
              }}>
                {project.status}
              </span>
            </p>
            <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
              <button style={{
                padding: '5px 15px',
                backgroundColor: '#3498db',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}>
                打开
              </button>
              <button style={{
                padding: '5px 15px',
                backgroundColor: '#95a5a6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}>
                删除
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  </motion.div>
);

export default DeepCADMainApp;