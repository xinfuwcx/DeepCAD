/**
 * DeepCAD UI组件系统故事展示
 * 1号架构师 - 完整的原子组件库演示
 */

import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { Button } from './Button';
import { Card } from './Card';
import { Modal } from './Modal';
import { Input } from './Input';
import { FunctionalIcons } from '../icons/FunctionalIcons';
import { StatusIcons } from '../icons/StatusIcons';
import { designTokens } from '../../design/tokens';

// ==================== UI组件集合展示 ====================

const UIShowcase: React.FC = () => {
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [progress, setProgress] = useState(45);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'default' | 'analysis' | 'settings'>('default');

  return (
    <div style={{
      padding: designTokens.spacing[8],
      background: designTokens.colors.background.primary,
      minHeight: '100vh'
    }}>
      {/* 标题区域 */}
      <div style={{
        textAlign: 'center',
        marginBottom: designTokens.spacing[12]
      }}>
        <h1 style={{
          color: designTokens.colors.neutral[100],
          fontSize: designTokens.typography.fontSize['4xl'],
          fontWeight: designTokens.typography.fontWeight.bold,
          marginBottom: designTokens.spacing[4],
          background: `linear-gradient(135deg, ${designTokens.colors.primary[400]}, ${designTokens.colors.accent[400]})`,
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          DeepCAD UI组件系统
        </h1>
        <p style={{
          color: designTokens.colors.neutral[400],
          fontSize: designTokens.typography.fontSize.xl,
          maxWidth: '800px',
          margin: '0 auto',
          lineHeight: designTokens.typography.lineHeight.relaxed
        }}>
          专业CAE平台的完整原子组件库，提供一致的视觉体验和交互标准
        </p>
      </div>

      {/* 按钮组件展示 */}
      <section style={{ marginBottom: designTokens.spacing[12] }}>
        <h2 style={{
          color: designTokens.colors.primary[400],
          fontSize: designTokens.typography.fontSize['2xl'],
          fontWeight: designTokens.typography.fontWeight.semibold,
          marginBottom: designTokens.spacing[6]
        }}>
          按钮组件 Button
        </h2>

        {/* 按钮变体 */}
        <div style={{
          background: designTokens.colors.background.glass,
          borderRadius: designTokens.borderRadius.xl,
          padding: designTokens.spacing[8],
          marginBottom: designTokens.spacing[6],
          border: `1px solid ${designTokens.colors.neutral[800]}`
        }}>
          <h3 style={{
            color: designTokens.colors.neutral[200],
            fontSize: designTokens.typography.fontSize.lg,
            fontWeight: designTokens.typography.fontWeight.medium,
            marginBottom: designTokens.spacing[4]
          }}>
            按钮变体
          </h3>
          
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: designTokens.spacing[4],
            alignItems: 'center'
          }}>
            <Button variant="primary">主要按钮</Button>
            <Button variant="secondary">次要按钮</Button>
            <Button variant="outline">轮廓按钮</Button>
            <Button variant="ghost">幽灵按钮</Button>
            <Button variant="success">成功按钮</Button>
            <Button variant="danger">危险按钮</Button>
          </div>
        </div>

        {/* 按钮尺寸 */}
        <div style={{
          background: designTokens.colors.background.glass,
          borderRadius: designTokens.borderRadius.xl,
          padding: designTokens.spacing[8],
          marginBottom: designTokens.spacing[6],
          border: `1px solid ${designTokens.colors.neutral[800]}`
        }}>
          <h3 style={{
            color: designTokens.colors.neutral[200],
            fontSize: designTokens.typography.fontSize.lg,
            fontWeight: designTokens.typography.fontWeight.medium,
            marginBottom: designTokens.spacing[4]
          }}>
            按钮尺寸
          </h3>
          
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: designTokens.spacing[4],
            alignItems: 'center'
          }}>
            <Button size="xs">超小</Button>
            <Button size="sm">小号</Button>
            <Button size="md">中号</Button>
            <Button size="lg">大号</Button>
            <Button size="xl">超大</Button>
          </div>
        </div>

        {/* CAE专用按钮 */}
        <div style={{
          background: designTokens.colors.background.glass,
          borderRadius: designTokens.borderRadius.xl,
          padding: designTokens.spacing[8],
          marginBottom: designTokens.spacing[6],
          border: `1px solid ${designTokens.colors.neutral[800]}`
        }}>
          <h3 style={{
            color: designTokens.colors.neutral[200],
            fontSize: designTokens.typography.fontSize.lg,
            fontWeight: designTokens.typography.fontWeight.medium,
            marginBottom: designTokens.spacing[4]
          }}>
            CAE专用按钮
          </h3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: designTokens.spacing[4]
          }}>
            <Button 
              caeType="geometry" 
              leftIcon={<FunctionalIcons.GeologyModeling size={16} />}
            >
              几何建模
            </Button>
            <Button 
              caeType="mesh" 
              leftIcon={<FunctionalIcons.MeshGeneration size={16} />}
            >
              网格生成
            </Button>
            <Button 
              caeType="computation" 
              leftIcon={<StatusIcons.Computing size={16} />}
              loading
            >
              正在计算
            </Button>
            <Button 
              caeType="results" 
              variant="success"
              leftIcon={<StatusIcons.Completed size={16} />}
            >
              查看结果
            </Button>
          </div>
        </div>

        {/* 特殊效果按钮 */}
        <div style={{
          background: designTokens.colors.background.glass,
          borderRadius: designTokens.borderRadius.xl,
          padding: designTokens.spacing[8],
          border: `1px solid ${designTokens.colors.neutral[800]}`
        }}>
          <h3 style={{
            color: designTokens.colors.neutral[200],
            fontSize: designTokens.typography.fontSize.lg,
            fontWeight: designTokens.typography.fontWeight.medium,
            marginBottom: designTokens.spacing[4]
          }}>
            特殊效果
          </h3>
          
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: designTokens.spacing[4],
            alignItems: 'center'
          }}>
            <Button glow>发光按钮</Button>
            <Button quantum>量子效果</Button>
            <Button rounded fluid style={{ maxWidth: '200px' }}>
              流体宽度
            </Button>
            <Button disabled>禁用状态</Button>
          </div>
        </div>
      </section>

      {/* 卡片组件展示 */}
      <section style={{ marginBottom: designTokens.spacing[12] }}>
        <h2 style={{
          color: designTokens.colors.primary[400],
          fontSize: designTokens.typography.fontSize['2xl'],
          fontWeight: designTokens.typography.fontWeight.semibold,
          marginBottom: designTokens.spacing[6]
        }}>
          卡片组件 Card
        </h2>

        {/* 卡片变体 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: designTokens.spacing[6],
          marginBottom: designTokens.spacing[8]
        }}>
          <Card variant="default">
            <h3 style={{
              color: designTokens.colors.neutral[100],
              fontSize: designTokens.typography.fontSize.lg,
              fontWeight: designTokens.typography.fontWeight.semibold,
              marginBottom: designTokens.spacing[3]
            }}>
              默认卡片
            </h3>
            <p style={{
              color: designTokens.colors.neutral[400],
              fontSize: designTokens.typography.fontSize.base,
              lineHeight: designTokens.typography.lineHeight.relaxed,
              margin: 0
            }}>
              基础的卡片样式，适用于大多数场景
            </p>
          </Card>

          <Card variant="elevated">
            <h3 style={{
              color: designTokens.colors.neutral[100],
              fontSize: designTokens.typography.fontSize.lg,
              fontWeight: designTokens.typography.fontWeight.semibold,
              marginBottom: designTokens.spacing[3]
            }}>
              悬浮卡片
            </h3>
            <p style={{
              color: designTokens.colors.neutral[400],
              fontSize: designTokens.typography.fontSize.base,
              lineHeight: designTokens.typography.lineHeight.relaxed,
              margin: 0
            }}>
              带有阴影的悬浮效果，突出重要内容
            </p>
          </Card>

          <Card variant="glass" blurred>
            <h3 style={{
              color: designTokens.colors.neutral[100],
              fontSize: designTokens.typography.fontSize.lg,
              fontWeight: designTokens.typography.fontWeight.semibold,
              marginBottom: designTokens.spacing[3]
            }}>
              玻璃卡片
            </h3>
            <p style={{
              color: designTokens.colors.neutral[400],
              fontSize: designTokens.typography.fontSize.base,
              lineHeight: designTokens.typography.lineHeight.relaxed,
              margin: 0
            }}>
              玻璃拟态效果，现代科技感
            </p>
          </Card>

          <Card variant="premium" gradient glowing>
            <h3 style={{
              color: designTokens.colors.neutral[100],
              fontSize: designTokens.typography.fontSize.lg,
              fontWeight: designTokens.typography.fontWeight.semibold,
              marginBottom: designTokens.spacing[3]
            }}>
              高级卡片
            </h3>
            <p style={{
              color: designTokens.colors.neutral[400],
              fontSize: designTokens.typography.fontSize.base,
              lineHeight: designTokens.typography.lineHeight.relaxed,
              margin: 0
            }}>
              高级效果组合，用于重要内容展示
            </p>
          </Card>
        </div>

        {/* CAE专用卡片 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: designTokens.spacing[6],
          marginBottom: designTokens.spacing[8]
        }}>
          <Card 
            caeType="geometry" 
            status="completed"
            clickable
            selected={selectedCard === 'geometry'}
            onSelect={() => setSelectedCard(selectedCard === 'geometry' ? null : 'geometry')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: designTokens.spacing[3], marginBottom: designTokens.spacing[3] }}>
              <FunctionalIcons.GeologyModeling size={24} color={designTokens.colors.semantic.geometry} />
              <h3 style={{
                color: designTokens.colors.neutral[100],
                fontSize: designTokens.typography.fontSize.lg,
                fontWeight: designTokens.typography.fontWeight.semibold,
                margin: 0
              }}>
                几何建模
              </h3>
            </div>
            <p style={{
              color: designTokens.colors.neutral[400],
              fontSize: designTokens.typography.fontSize.sm,
              margin: 0
            }}>
              基坑几何模型构建完成，包含围护结构和开挖轮廓
            </p>
          </Card>

          <Card 
            caeType="mesh" 
            status="processing"
            progress={progress}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: designTokens.spacing[3], marginBottom: designTokens.spacing[3] }}>
              <FunctionalIcons.MeshGeneration size={24} color={designTokens.colors.semantic.mesh} />
              <h3 style={{
                color: designTokens.colors.neutral[100],
                fontSize: designTokens.typography.fontSize.lg,
                fontWeight: designTokens.typography.fontWeight.semibold,
                margin: 0
              }}>
                网格生成
              </h3>
            </div>
            <p style={{
              color: designTokens.colors.neutral[400],
              fontSize: designTokens.typography.fontSize.sm,
              marginBottom: designTokens.spacing[3]
            }}>
              正在生成有限元网格，当前进度 {progress}%
            </p>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setProgress(prev => Math.min(100, prev + 10))}
            >
              模拟进度
            </Button>
          </Card>

          <Card 
            caeType="computation" 
            status="error"
            collapsible
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: designTokens.spacing[3], marginBottom: designTokens.spacing[3] }}>
              <StatusIcons.Error size={24} color={designTokens.colors.semantic.error} />
              <h3 style={{
                color: designTokens.colors.neutral[100],
                fontSize: designTokens.typography.fontSize.lg,
                fontWeight: designTokens.typography.fontWeight.semibold,
                margin: 0
              }}>
                计算分析
              </h3>
            </div>
            <p style={{
              color: designTokens.colors.neutral[400],
              fontSize: designTokens.typography.fontSize.sm,
              marginBottom: designTokens.spacing[3]
            }}>
              计算过程中出现错误，请检查边界条件设置
            </p>
            <div style={{
              background: designTokens.colors.semantic.error + '20',
              border: `1px solid ${designTokens.colors.semantic.error}40`,
              borderRadius: designTokens.borderRadius.md,
              padding: designTokens.spacing[3],
              fontSize: designTokens.typography.fontSize.xs,
              color: designTokens.colors.semantic.error,
              fontFamily: designTokens.typography.fontFamily.mono.join(', ')
            }}>
              Error: Singular matrix detected in solver
            </div>
          </Card>

          <Card 
            caeType="results" 
            status="completed"
            hover
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: designTokens.spacing[3], marginBottom: designTokens.spacing[3] }}>
              <StatusIcons.Completed size={24} color={designTokens.colors.semantic.success} />
              <h3 style={{
                color: designTokens.colors.neutral[100],
                fontSize: designTokens.typography.fontSize.lg,
                fontWeight: designTokens.typography.fontWeight.semibold,
                margin: 0
              }}>
                结果分析
              </h3>
            </div>
            <p style={{
              color: designTokens.colors.neutral[400],
              fontSize: designTokens.typography.fontSize.sm,
              marginBottom: designTokens.spacing[4]
            }}>
              计算完成，可查看位移、应力分布等结果
            </p>
            <div style={{
              display: 'flex',
              gap: designTokens.spacing[2]
            }}>
              <Button size="sm" variant="primary">查看结果</Button>
              <Button size="sm" variant="outline">下载报告</Button>
            </div>
          </Card>
        </div>
      </section>

      {/* 输入框组件展示 */}
      <section style={{ marginBottom: designTokens.spacing[12] }}>
        <h2 style={{
          color: designTokens.colors.primary[400],
          fontSize: designTokens.typography.fontSize['2xl'],
          fontWeight: designTokens.typography.fontWeight.semibold,
          marginBottom: designTokens.spacing[6]
        }}>
          输入框组件 Input
        </h2>

        {/* 输入框变体 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: designTokens.spacing[6],
          marginBottom: designTokens.spacing[8]
        }}>
          <Card variant="default">
            <h3 style={{
              color: designTokens.colors.neutral[100],
              fontSize: designTokens.typography.fontSize.lg,
              fontWeight: designTokens.typography.fontWeight.semibold,
              marginBottom: designTokens.spacing[4]
            }}>
              基础输入框
            </h3>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: designTokens.spacing[4]
            }}>
              <Input 
                placeholder="请输入文本"
                label="文本输入"
                helperText="这是一个基础文本输入框"
              />
              <Input 
                type="number"
                placeholder="0.00"
                label="数值输入"
                unit="mm"
                precision={2}
                helperText="支持数值精度和单位显示"
              />
              <Input 
                variant="outlined"
                placeholder="轮廓样式"
                label="轮廓输入框"
              />
            </div>
          </Card>

          <Card variant="glass">
            <h3 style={{
              color: designTokens.colors.neutral[100],
              fontSize: designTokens.typography.fontSize.lg,
              fontWeight: designTokens.typography.fontWeight.semibold,
              marginBottom: designTokens.spacing[4]
            }}>
              CAE专用输入框
            </h3>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: designTokens.spacing[4]
            }}>
              <Input 
                caeType="parameter"
                type="number"
                label="几何参数"
                placeholder="100.0"
                unit="m"
                precision={1}
                leftIcon="📐"
              />
              <Input 
                caeType="coordinate"
                type="number"
                label="坐标位置"
                placeholder="0.000"
                unit="mm"
                precision={3}
                leftIcon="🎯"
              />
              <Input 
                caeType="calculation"
                type="number"
                label="计算结果"
                value={15.247}
                unit="MPa"
                precision={3}
                readOnly={true}
                status="success"
                leftIcon="⚡"
              />
            </div>
          </Card>

          <Card variant="premium">
            <h3 style={{
              color: designTokens.colors.neutral[100],
              fontSize: designTokens.typography.fontSize.lg,
              fontWeight: designTokens.typography.fontWeight.semibold,
              marginBottom: designTokens.spacing[4]
            }}>
              状态演示
            </h3>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: designTokens.spacing[4]
            }}>
              <Input 
                label="成功状态"
                value="验证通过"
                status="success"
                helperText="输入数据验证成功"
                rightIcon="✓"
              />
              <Input 
                label="警告状态"
                value="检查数值"
                status="warning"
                helperText="请检查输入的数值范围"
                rightIcon="⚠"
              />
              <Input 
                label="错误状态"
                value="无效输入"
                status="error"
                errorMessage="输入格式不正确"
                rightIcon="✗"
              />
              <Input 
                label="加载状态"
                value="计算中..."
                loading={true}
                disabled={true}
                helperText="正在进行数值计算"
              />
            </div>
          </Card>
        </div>
      </section>

      {/* 模态框组件展示 */}
      <section style={{ marginBottom: designTokens.spacing[12] }}>
        <h2 style={{
          color: designTokens.colors.primary[400],
          fontSize: designTokens.typography.fontSize['2xl'],
          fontWeight: designTokens.typography.fontWeight.semibold,
          marginBottom: designTokens.spacing[6]
        }}>
          模态框组件 Modal
        </h2>

        {/* 模态框触发按钮 */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: designTokens.spacing[4],
          marginBottom: designTokens.spacing[6]
        }}>
          <Button 
            variant="primary"
            onClick={() => {
              setModalType('default');
              setShowModal(true);
            }}
          >
            🪟 基础模态框
          </Button>
          <Button 
            variant="secondary"
            onClick={() => {
              setModalType('analysis');
              setShowModal(true);
            }}
          >
            ⚡ 分析模态框
          </Button>
          <Button 
            variant="outline"
            onClick={() => {
              setModalType('settings');
              setShowModal(true);
            }}
          >
            ⚙️ 设置模态框
          </Button>
        </div>

        {/* 模态框说明 */}
        <Card variant="glass">
          <h3 style={{
            color: designTokens.colors.neutral[100],
            fontSize: designTokens.typography.fontSize.lg,
            fontWeight: designTokens.typography.fontWeight.semibold,
            marginBottom: designTokens.spacing[3]
          }}>
            模态框特性
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: designTokens.spacing[4],
            color: designTokens.colors.neutral[300],
            fontSize: designTokens.typography.fontSize.sm
          }}>
            <div>• 6种视觉变体</div>
            <div>• CAE专用类型</div>
            <div>• 响应式尺寸</div>
            <div>• 键盘导航支持</div>
            <div>• 焦点管理</div>
            <div>• 动画过渡</div>
          </div>
        </Card>

        {/* 模态框实例 */}
        <Modal
          open={showModal}
          onClose={() => setShowModal(false)}
          variant={modalType === 'default' ? 'glass' : 'premium'}
          caeType={modalType === 'analysis' ? 'analysis' : modalType === 'settings' ? 'settings' : undefined}
          title={
            modalType === 'analysis' ? '计算分析设置' :
            modalType === 'settings' ? '系统参数配置' :
            'DeepCAD 模态框演示'
          }
          description={
            modalType === 'analysis' ? '配置有限元分析参数和求解设置' :
            modalType === 'settings' ? '调整系统全局配置和用户偏好' :
            '这是一个功能完整的模态框组件演示'
          }
          size={modalType === 'settings' ? 'lg' : 'md'}
        >
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: designTokens.spacing[6]
          }}>
            {modalType === 'analysis' && (
              <>
                <Input 
                  label="网格密度"
                  type="number"
                  defaultValue={0.5}
                  unit="m"
                  precision={2}
                  helperText="控制有限元网格的密度"
                  fluid
                />
                <Input 
                  label="求解精度"
                  type="number"
                  defaultValue={1e-6}
                  precision={8}
                  helperText="数值求解的收敛精度"
                  fluid
                />
                <Card variant="filled" size="sm">
                  <p style={{
                    color: designTokens.colors.neutral[300],
                    fontSize: designTokens.typography.fontSize.sm,
                    margin: 0
                  }}>
                    预计计算时间：约 15 分钟
                  </p>
                </Card>
              </>
            )}

            {modalType === 'settings' && (
              <>
                <Input 
                  label="工作目录"
                  defaultValue="/workspace/projects"
                  helperText="设置项目文件的默认保存位置"
                  fluid
                />
                <Input 
                  label="自动保存间隔"
                  type="number"
                  defaultValue={300}
                  unit="秒"
                  helperText="设置项目自动保存的时间间隔"
                  fluid
                />
                <Input 
                  label="最大内存使用"
                  type="number"
                  defaultValue={8}
                  unit="GB"
                  helperText="限制计算过程的最大内存使用量"
                  fluid
                />
              </>
            )}

            {modalType === 'default' && (
              <>
                <p style={{
                  color: designTokens.colors.neutral[300],
                  fontSize: designTokens.typography.fontSize.base,
                  lineHeight: designTokens.typography.lineHeight.relaxed,
                  margin: 0
                }}>
                  这是一个完整的模态框组件演示，支持多种样式变体、CAE专用类型、响应式布局和无障碍访问。
                </p>
                
                <Card variant="outlined" size="sm">
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: designTokens.spacing[3]
                  }}>
                    <StatusIcons.Completed size={24} color={designTokens.colors.semantic.success} />
                    <div>
                      <h4 style={{
                        color: designTokens.colors.neutral[100],
                        fontSize: designTokens.typography.fontSize.base,
                        margin: 0,
                        marginBottom: designTokens.spacing[1]
                      }}>
                        组件特性
                      </h4>
                      <p style={{
                        color: designTokens.colors.neutral[400],
                        fontSize: designTokens.typography.fontSize.sm,
                        margin: 0
                      }}>
                        Portal渲染、焦点陷阱、键盘导航、遮罩关闭
                      </p>
                    </div>
                  </div>
                </Card>
              </>
            )}

            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: designTokens.spacing[3],
              marginTop: designTokens.spacing[4],
              paddingTop: designTokens.spacing[4],
              borderTop: `1px solid ${designTokens.colors.neutral[800]}`
            }}>
              <Button variant="outline" onClick={() => setShowModal(false)}>
                取消
              </Button>
              <Button variant="primary" onClick={() => setShowModal(false)}>
                {modalType === 'analysis' ? '开始分析' : modalType === 'settings' ? '保存设置' : '确定'}
              </Button>
            </div>
          </div>
        </Modal>
      </section>

      {/* 组件组合演示 */}
      <section>
        <h2 style={{
          color: designTokens.colors.primary[400],
          fontSize: designTokens.typography.fontSize['2xl'],
          fontWeight: designTokens.typography.fontWeight.semibold,
          marginBottom: designTokens.spacing[6]
        }}>
          组件组合应用
        </h2>

        <Card 
          variant="premium" 
          size="lg"
          style={{ maxWidth: '800px', margin: '0 auto' }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: designTokens.spacing[6]
          }}>
            <div>
              <h3 style={{
                color: designTokens.colors.neutral[100],
                fontSize: designTokens.typography.fontSize['2xl'],
                fontWeight: designTokens.typography.fontWeight.bold,
                marginBottom: designTokens.spacing[2]
              }}>
                深基坑CAE分析项目
              </h3>
              <p style={{
                color: designTokens.colors.neutral[400],
                fontSize: designTokens.typography.fontSize.base,
                margin: 0
              }}>
                上海中心大厦深基坑工程分析
              </p>
            </div>
            <StatusIcons.Realtime size={32} color={designTokens.colors.secondary[400]} active />
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: designTokens.spacing[4],
            marginBottom: designTokens.spacing[6]
          }}>
            {[
              { label: '网格单元', value: '127,543', unit: '个' },
              { label: '节点数量', value: '85,421', unit: '个' },
              { label: '计算时间', value: '2.3', unit: '小时' },
              { label: '最大位移', value: '15.2', unit: 'mm' }
            ].map((stat, i) => (
              <div
                key={i}
                style={{
                  background: designTokens.colors.background.tertiary,
                  borderRadius: designTokens.borderRadius.lg,
                  padding: designTokens.spacing[4],
                  textAlign: 'center',
                  border: `1px solid ${designTokens.colors.neutral[700]}`
                }}
              >
                <div style={{
                  color: designTokens.colors.primary[400],
                  fontSize: designTokens.typography.fontSize['2xl'],
                  fontWeight: designTokens.typography.fontWeight.bold,
                  fontFamily: designTokens.typography.fontFamily.mono.join(', '),
                  marginBottom: designTokens.spacing[1]
                }}>
                  {stat.value}
                  <span style={{
                    fontSize: designTokens.typography.fontSize.sm,
                    color: designTokens.colors.neutral[400],
                    marginLeft: designTokens.spacing[1]
                  }}>
                    {stat.unit}
                  </span>
                </div>
                <div style={{
                  color: designTokens.colors.neutral[300],
                  fontSize: designTokens.typography.fontSize.sm
                }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          <div style={{
            display: 'flex',
            gap: designTokens.spacing[3],
            justifyContent: 'center'
          }}>
            <Button variant="primary" size="lg">
              开始分析
            </Button>
            <Button variant="secondary" size="lg">
              保存项目
            </Button>
            <Button variant="outline" size="lg">
              导出数据
            </Button>
          </div>
        </Card>
      </section>
    </div>
  );
};

// ==================== Meta配置 ====================

const meta: Meta = {
  title: 'Design System/UI Components',
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: designTokens.colors.background.primary }
      ]
    },
    docs: {
      description: {
        component: `
# DeepCAD UI组件系统

完整的原子组件库，为专业CAE平台提供一致的视觉体验和交互标准。

## 特性
- 🎨 多种视觉变体和尺寸选择
- ⚡ 丰富的交互动画和视觉效果
- 🔧 CAE专用属性和状态指示
- 🎯 完整的可访问性支持
- 📱 响应式设计和触摸优化

## 组件列表
### Button 按钮组件
- 6种变体：primary, secondary, outline, ghost, danger, success
- 5种尺寸：xs, sm, md, lg, xl
- 特殊效果：loading, glow, quantum
- CAE专用类型标识

### Card 卡片组件
- 6种变体：default, elevated, outlined, filled, glass, premium
- 5种尺寸：xs, sm, md, lg, xl
- 状态管理：processing, completed, error, warning
- 交互功能：clickable, selectable, collapsible

### Input 输入框组件
- 5种变体：default, filled, outlined, ghost, premium
- 5种尺寸：xs, sm, md, lg, xl
- 状态管理：success, warning, error, loading
- CAE专用属性：parameter, coordinate, measurement等
- 数值精度控制和单位显示

### Modal 模态框组件
- 6种变体：default, glass, premium, fullscreen, drawer, popup
- 6种尺寸：xs, sm, md, lg, xl, full
- CAE专用类型：analysis, settings, results, export等
- 完整的键盘导航和焦点管理
- Portal渲染和无障碍访问支持
        `
      }
    }
  }
};

export default meta;
type Story = StoryObj;

// ==================== 故事定义 ====================

export const CompleteShowcase: Story = {
  render: () => <UIShowcase />
};

export const ButtonsOnly: Story = {
  render: () => (
    <div style={{
      padding: designTokens.spacing[6],
      background: designTokens.colors.background.primary,
      minHeight: '100vh'
    }}>
      <h1 style={{
        color: designTokens.colors.neutral[100],
        fontSize: designTokens.typography.fontSize['3xl'],
        fontWeight: designTokens.typography.fontWeight.bold,
        marginBottom: designTokens.spacing[8],
        textAlign: 'center'
      }}>
        Button 组件展示
      </h1>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: designTokens.spacing[6]
      }}>
        {/* 所有变体 */}
        <Card>
          <h3 style={{
            color: designTokens.colors.neutral[100],
            marginBottom: designTokens.spacing[4]
          }}>
            按钮变体
          </h3>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: designTokens.spacing[3]
          }}>
            <Button variant="primary">Primary Button</Button>
            <Button variant="secondary">Secondary Button</Button>
            <Button variant="outline">Outline Button</Button>
            <Button variant="ghost">Ghost Button</Button>
            <Button variant="success">Success Button</Button>
            <Button variant="danger">Danger Button</Button>
          </div>
        </Card>

        {/* 所有尺寸 */}
        <Card>
          <h3 style={{
            color: designTokens.colors.neutral[100],
            marginBottom: designTokens.spacing[4]
          }}>
            按钮尺寸
          </h3>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: designTokens.spacing[3],
            alignItems: 'flex-start'
          }}>
            <Button size="xs">Extra Small</Button>
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
            <Button size="xl">Extra Large</Button>
          </div>
        </Card>

        {/* 特殊状态 */}
        <Card>
          <h3 style={{
            color: designTokens.colors.neutral[100],
            marginBottom: designTokens.spacing[4]
          }}>
            特殊状态
          </h3>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: designTokens.spacing[3]
          }}>
            <Button loading>Loading Button</Button>
            <Button disabled>Disabled Button</Button>
            <Button glow>Glowing Button</Button>
            <Button quantum>Quantum Button</Button>
          </div>
        </Card>
      </div>
    </div>
  )
};

export const CardsOnly: Story = {
  render: () => (
    <div style={{
      padding: designTokens.spacing[6],
      background: designTokens.colors.background.primary,
      minHeight: '100vh'
    }}>
      <h1 style={{
        color: designTokens.colors.neutral[100],
        fontSize: designTokens.typography.fontSize['3xl'],
        fontWeight: designTokens.typography.fontWeight.bold,
        marginBottom: designTokens.spacing[8],
        textAlign: 'center'
      }}>
        Card 组件展示
      </h1>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: designTokens.spacing[6]
      }}>
        <Card variant="default">
          <h3 style={{ color: designTokens.colors.neutral[100], marginBottom: designTokens.spacing[3] }}>
            Default Card
          </h3>
          <p style={{ color: designTokens.colors.neutral[400], margin: 0 }}>
            基础卡片样式，适用于大多数内容展示场景
          </p>
        </Card>

        <Card variant="elevated">
          <h3 style={{ color: designTokens.colors.neutral[100], marginBottom: designTokens.spacing[3] }}>
            Elevated Card
          </h3>
          <p style={{ color: designTokens.colors.neutral[400], margin: 0 }}>
            带有阴影的悬浮卡片，突出重要内容
          </p>
        </Card>

        <Card variant="glass" blurred>
          <h3 style={{ color: designTokens.colors.neutral[100], marginBottom: designTokens.spacing[3] }}>
            Glass Card
          </h3>
          <p style={{ color: designTokens.colors.neutral[400], margin: 0 }}>
            玻璃拟态效果，现代科技感设计
          </p>
        </Card>

        <Card variant="premium" gradient>
          <h3 style={{ color: designTokens.colors.neutral[100], marginBottom: designTokens.spacing[3] }}>
            Premium Card
          </h3>
          <p style={{ color: designTokens.colors.neutral[400], margin: 0 }}>
            高级效果组合，用于重要功能模块
          </p>
        </Card>

        <Card caeType="geometry" status="completed" progress={100}>
          <h3 style={{ color: designTokens.colors.neutral[100], marginBottom: designTokens.spacing[3] }}>
            Geometry Module
          </h3>
          <p style={{ color: designTokens.colors.neutral[400], margin: 0 }}>
            几何建模模块，状态：已完成
          </p>
        </Card>

        <Card caeType="computation" status="processing" progress={65} collapsible>
          <h3 style={{ color: designTokens.colors.neutral[100], marginBottom: designTokens.spacing[3] }}>
            Computation Module
          </h3>
          <p style={{ color: designTokens.colors.neutral[400], marginBottom: designTokens.spacing[3] }}>
            计算分析模块，状态：进行中 (65%)
          </p>
          <div style={{
            background: designTokens.colors.background.tertiary,
            borderRadius: designTokens.borderRadius.md,
            padding: designTokens.spacing[3],
            fontSize: designTokens.typography.fontSize.sm,
            color: designTokens.colors.neutral[300],
            fontFamily: designTokens.typography.fontFamily.mono.join(', ')
          }}>
            正在求解线性方程组...
          </div>
        </Card>
      </div>
    </div>
  )
};