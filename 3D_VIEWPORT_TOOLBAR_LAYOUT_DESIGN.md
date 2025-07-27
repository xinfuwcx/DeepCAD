# 🎯 3D视口工具栏布局设计方案

**为0号架构师提供的3D视口UI布局技术文档**

## 📋 现有工具栏组件清单

### 🔧 已发现的工具栏组件

#### 1. **统一工具栏 (UnifiedToolbar)**
- **文件**: `E:\DeepCAD\frontend\src\components\layout\UnifiedToolbar.tsx`
- **布局**: 水平工具栏
- **主要功能**:
  - 视图控制: 旋转、平移、缩放、重置视图
  - 选择工具: 单选、框选、多选
  - 测量工具: 距离测量、角度测量
  - 标注工具: 文本标注、尺寸标注
  - 高级工具: 剖切、爆炸视图、线框模式
  - 几何工具: 立方体、圆柱体、球体创建
  - 系统工具: 撤销、重做、保存、导出

#### 2. **3D交互工具栏 (InteractionToolbar)**
- **文件**: `E:\DeepCAD\frontend\src\components\3d\tools\InteractionToolbar.tsx`
- **布局**: 垂直工具栏
- **专业功能**:
  - 测量结果管理（列表、显示/隐藏、删除）
  - 标注管理（编辑、可见性控制）
  - 爆炸视图滑块控制
  - 工具使用提示和帮助

#### 3. **立方体导航控件 (CubeViewNavigationControl)**
- **文件**: `E:\DeepCAD\frontend\src\components\3d\navigation\CubeViewNavigationControl.tsx`
- **布局**: 独立3D控件
- **功能**: 7种预设视角切换（前、后、左、右、上、下、等轴测）

#### 4. **CAD专业工具栏 (CADToolbar)**
- **文件**: `E:\DeepCAD\frontend\src\components\geometry\CADToolbar.tsx`
- **布局**: 分组工具栏
- **功能**:
  - 基础几何: 立方体、圆柱体、球体、圆锥
  - 布尔运算: 合并、切割、相交、分割
  - 变换操作: 移动、旋转、复制、镜像、缩放

#### 5. **网格工具栏 (MeshingVerticalToolbar)**
- **文件**: `E:\DeepCAD\frontend\src\components\meshing\MeshingVerticalToolbar.tsx`
- **布局**: 垂直专用工具栏
- **功能**: 网格生成、网格分析、质量检测

## 🎨 3D视口布局设计方案

### 布局区域划分

```
┌─────────────────────────────────────────────────────────────┐
│  顶部主工具栏 (Top Main Toolbar)                              │
├─────────────────────────────────────────────────────────────┤
│ L │                                                     │ R │
│ e │                                                     │ i │  
│ f │               3D Viewport                           │ g │
│ t │             主要显示区域                              │ h │
│   │                                                     │ t │
│ S │                                                     │   │
│ i │                                                     │ P │
│ d │                                                     │ a │
│ e │                                                     │ n │
│ b │                                                     │ e │
│ a │                                                     │ l │
│ r │                                                     │   │
├───┼─────────────────────────────────────────────────────┼───┤
│   │              底部状态栏 (Bottom Status Bar)            │   │
└───┴─────────────────────────────────────────────────────┴───┘
```

### 详细布局规划

#### 🔝 **顶部区域 (Top Zone)**
**位置**: 3D视口顶部，固定停靠
**推荐组件**: UnifiedToolbar (统一工具栏)
**布局特性**:
```css
.top-toolbar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 48px;
  background: rgba(30, 30, 30, 0.95);
  backdrop-filter: blur(10px);
  z-index: 100;
}
```

**功能分组**:
```jsx
<div className="top-toolbar">
  {/* 文件操作组 */}
  <div className="toolbar-group file-ops">
    <button title="新建">📄</button>
    <button title="打开">📁</button>
    <button title="保存">💾</button>
    <button title="导出">📤</button>
  </div>
  
  {/* 编辑操作组 */}
  <div className="toolbar-group edit-ops">
    <button title="撤销">↶</button>
    <button title="重做">↷</button>
    <button title="复制">📋</button>
    <button title="粘贴">📄</button>
  </div>
  
  {/* 视图控制组 */}
  <div className="toolbar-group view-ops">
    <button title="适合窗口">🔍</button>
    <button title="重置视图">🏠</button>
    <button title="线框模式">📐</button>
    <button title="实体模式">🔳</button>
  </div>
  
  {/* 选择工具组 */}
  <div className="toolbar-group select-ops">
    <button title="单选">👆</button>
    <button title="框选">▢</button>
    <button title="套索选择">🕸️</button>
  </div>
  
  {/* 测量工具组 */}
  <div className="toolbar-group measure-ops">
    <button title="距离测量">📏</button>
    <button title="角度测量">📐</button>
    <button title="面积测量">📐</button>
  </div>
</div>
```

#### ◀️ **左侧区域 (Left Zone)**
**位置**: 3D视口左侧，可折叠
**推荐组件**: 模块化垂直工具栏
**布局特性**:
```css
.left-sidebar {
  position: absolute;
  left: 0;
  top: 48px; /* 顶部工具栏高度 */
  bottom: 24px; /* 底部状态栏高度 */
  width: 280px;
  background: rgba(20, 20, 20, 0.92);
  backdrop-filter: blur(8px);
  transform: translateX(-240px); /* 默认折叠 */
  transition: transform 0.3s ease;
  z-index: 90;
}

.left-sidebar:hover,
.left-sidebar.expanded {
  transform: translateX(0);
}
```

**功能模块**:
```jsx
<div className="left-sidebar">
  {/* 折叠/展开按钮 */}
  <div className="sidebar-toggle">
    <button title="展开工具面板">▶️</button>
  </div>
  
  {/* 几何建模工具 */}
  <div className="tool-section geometry-tools">
    <h3>🔧 几何建模</h3>
    <div className="tool-grid">
      <button title="立方体">🔳</button>
      <button title="圆柱体">🔘</button>
      <button title="球体">⚪</button>
      <button title="圆锥">🔺</button>
    </div>
    
    <h4>布尔运算</h4>
    <div className="tool-grid">
      <button title="合并">⊕</button>
      <button title="切割">⊖</button>
      <button title="相交">⊗</button>
      <button title="分割">⊘</button>
    </div>
  </div>
  
  {/* 网格工具 */}
  <div className="tool-section meshing-tools">
    <h3>🔬 网格分析</h3>
    <button className="tool-button">生成网格</button>
    <button className="tool-button">质量检测</button>
    <button className="tool-button">网格优化</button>
  </div>
  
  {/* 计算工具 */}
  <div className="tool-section computation-tools">
    <h3>⚡ 计算分析</h3>
    <button className="tool-button">深基坑分析</button>
    <button className="tool-button">土结耦合</button>
    <button className="tool-button">施工阶段</button>
  </div>
</div>
```

#### ▶️ **右侧区域 (Right Zone)**
**位置**: 3D视口右侧，智能显示
**推荐组件**: InteractionToolbar + 属性面板
**布局特性**:
```css
.right-panel {
  position: absolute;
  right: 0;
  top: 48px;
  bottom: 24px;
  width: 320px;
  background: rgba(25, 25, 25, 0.95);
  backdrop-filter: blur(12px);
  transform: translateX(320px); /* 按需显示 */
  transition: transform 0.3s ease;
  z-index: 85;
}

.right-panel.active {
  transform: translateX(0);
}
```

**智能内容面板**:
```jsx
<div className="right-panel">
  {/* 工具交互面板 */}
  <div className="interaction-panel">
    <h3>🎯 当前工具: 距离测量</h3>
    
    {/* 测量结果列表 */}
    <div className="measurement-results">
      <h4>📏 测量结果</h4>
      <div className="measurement-item">
        <span>距离1: 125.6mm</span>
        <button title="删除">🗑️</button>
      </div>
      <div className="measurement-item">
        <span>角度1: 45.2°</span>
        <button title="删除">🗑️</button>
      </div>
    </div>
    
    {/* 爆炸视图控制 */}
    <div className="explode-control">
      <h4>💥 爆炸视图</h4>
      <input type="range" min="0" max="100" className="explode-slider" />
      <span>分离度: 50%</span>
    </div>
    
    {/* 剖切控制 */}
    <div className="section-control">
      <h4>✂️ 剖切视图</h4>
      <button className="tool-button">添加剖切面</button>
      <button className="tool-button">移除剖切</button>
    </div>
  </div>
  
  {/* 属性面板 */}
  <div className="properties-panel">
    <h3>⚙️ 对象属性</h3>
    <div className="property-group">
      <label>材料:</label>
      <select>
        <option>混凝土</option>
        <option>钢材</option>
        <option>土体</option>
      </select>
    </div>
    <div className="property-group">
      <label>尺寸:</label>
      <input type="number" placeholder="长度" />
      <input type="number" placeholder="宽度" />
      <input type="number" placeholder="高度" />
    </div>
  </div>
</div>
```

#### 🎯 **右上角固定区域 (Top-Right Fixed)**
**位置**: 3D视口右上角
**推荐组件**: CubeViewNavigationControl (立方体导航)
**布局特性**:
```css
.view-navigation-cube {
  position: absolute;
  top: 60px; /* 避开顶部工具栏 */
  right: 20px;
  width: 100px;
  height: 100px;
  z-index: 110;
}
```

**3D导航立方体**:
```jsx
<div className="view-navigation-cube">
  <CubeViewNavigationControl 
    onViewChange={(view) => handleViewChange(view)}
    currentView="isometric"
    showLabels={true}
    enableAnimation={true}
  />
</div>
```

#### 🔄 **右下角浮动区域 (Bottom-Right Float)**
**位置**: 3D视口右下角
**推荐组件**: 快速操作工具
**布局特性**:
```css
.quick-actions {
  position: absolute;
  bottom: 40px;
  right: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 105;
}
```

**快速操作按钮**:
```jsx
<div className="quick-actions">
  <button className="quick-btn" title="全屏">🔍</button>
  <button className="quick-btn" title="截图">📷</button>
  <button className="quick-btn" title="录像">🎥</button>
  <button className="quick-btn" title="设置">⚙️</button>
</div>
```

#### 🔽 **底部状态栏 (Bottom Status Bar)**
**位置**: 3D视口底部
**功能**: 状态显示和快速信息
**布局特性**:
```css
.bottom-status-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 24px;
  background: rgba(15, 15, 15, 0.98);
  backdrop-filter: blur(6px);
  z-index: 95;
}
```

**状态信息显示**:
```jsx
<div className="bottom-status-bar">
  <span className="status-item">坐标: X:125.6 Y:78.2 Z:45.1</span>
  <span className="status-item">选中: 3个对象</span>
  <span className="status-item">渲染: 60 FPS</span>
  <span className="status-item">内存: 2.1GB / 8GB</span>
  <span className="status-item">工具: 距离测量</span>
</div>
```

## 🎨 交互式工具布局策略

### 智能显示逻辑

#### 1. **上下文感知显示**
```typescript
interface ToolbarDisplayLogic {
  // 根据当前模式显示相应工具
  displayMode: 'geometry' | 'meshing' | 'analysis' | 'results';
  
  // 工具栏自动切换
  autoSwitchToolbar: (mode: string) => {
    switch(mode) {
      case 'geometry':
        showLeftPanel('geometry-tools');
        showRightPanel('properties');
        break;
      case 'meshing':
        showLeftPanel('meshing-tools');
        showRightPanel('mesh-quality');
        break;
      case 'analysis':
        showLeftPanel('computation-tools');
        showRightPanel('analysis-settings');
        break;
      case 'results':
        showLeftPanel('visualization-tools');
        showRightPanel('results-data');
        break;
    }
  };
}
```

#### 2. **响应式布局适配**
```css
/* 大屏幕 (>1400px) */
@media (min-width: 1400px) {
  .left-sidebar { width: 320px; }
  .right-panel { width: 360px; }
  .view-navigation-cube { width: 120px; height: 120px; }
}

/* 中屏幕 (1024px-1400px) */
@media (min-width: 1024px) and (max-width: 1400px) {
  .left-sidebar { width: 280px; }
  .right-panel { width: 320px; }
  .view-navigation-cube { width: 100px; height: 100px; }
}

/* 小屏幕 (<1024px) */
@media (max-width: 1024px) {
  .left-sidebar, .right-panel {
    width: 100%;
    height: 50%;
    transform: translateY(100%);
  }
  
  .top-toolbar {
    height: 40px;
    font-size: 14px;
  }
  
  .view-navigation-cube {
    width: 80px;
    height: 80px;
  }
}
```

#### 3. **动态工具组合**
```typescript
class DynamicToolbarManager {
  // 根据选中对象动态显示工具
  updateToolsForSelection(selectedObjects: Object3D[]) {
    if (selectedObjects.length === 0) {
      this.showDefaultTools();
    } else if (selectedObjects.length === 1) {
      this.showSingleObjectTools(selectedObjects[0]);
    } else {
      this.showMultiObjectTools(selectedObjects);
    }
  }
  
  // 根据当前操作显示相关工具
  updateToolsForOperation(operation: string) {
    const toolMappings = {
      'measurement': ['distance', 'angle', 'area', 'results-panel'],
      'annotation': ['text', 'dimension', 'leader', 'properties'],
      'sectioning': ['plane', 'box', 'sphere', 'preview'],
      'explode': ['slider', 'reset', 'animate', 'capture']
    };
    
    this.showSpecificTools(toolMappings[operation]);
  }
}
```

### 快捷键集成方案

```typescript
const keyboardShortcuts = {
  // 视图控制
  'F': 'fit-to-window',        // 适合窗口
  'H': 'reset-view',           // 重置视图
  'W': 'wireframe-toggle',     // 线框切换
  'S': 'shaded-toggle',        // 实体切换
  
  // 工具切换
  'Q': 'select-tool',          // 选择工具
  'M': 'measure-tool',         // 测量工具
  'A': 'annotation-tool',      // 标注工具
  'X': 'section-tool',         // 剖切工具
  
  // 面板控制
  'Ctrl+1': 'toggle-left-panel',   // 切换左面板
  'Ctrl+2': 'toggle-right-panel',  // 切换右面板
  'Ctrl+3': 'toggle-properties',   // 切换属性面板
  
  // 视角切换
  '1': 'front-view',           // 前视图
  '2': 'back-view',            // 后视图
  '3': 'right-view',           // 右视图
  '4': 'left-view',            // 左视图
  '5': 'top-view',             // 俯视图
  '6': 'bottom-view',          // 仰视图
  '7': 'isometric-view',       // 等轴测视图
};
```

## 📱 移动端适配策略

### 触控优化布局
```jsx
const MobileViewportLayout = () => (
  <div className="mobile-viewport">
    {/* 顶部简化工具栏 */}
    <div className="mobile-top-bar">
      <button className="menu-toggle">☰</button>
      <span className="title">DeepCAD</span>
      <button className="view-toggle">👁️</button>
    </div>
    
    {/* 3D视口 */}
    <div className="mobile-3d-viewport">
      {/* 浮动导航球 */}
      <div className="floating-nav-ball">
        <button>🧭</button>
      </div>
      
      {/* 底部工具抽屉 */}
      <div className="bottom-drawer">
        <div className="drawer-handle"></div>
        <div className="drawer-content">
          {/* 常用工具 */}
        </div>
      </div>
    </div>
  </div>
);
```

## 🔌 集成实现代码

### 主布局容器组件
```typescript
interface Viewport3DLayoutProps {
  scene: THREE.Scene;
  currentMode: 'geometry' | 'meshing' | 'analysis' | 'results';
  onModeChange: (mode: string) => void;
  enableResponsive?: boolean;
  customToolbarConfig?: ToolbarConfig;
}

const Viewport3DLayout: React.FC<Viewport3DLayoutProps> = ({
  scene,
  currentMode,
  onModeChange,
  enableResponsive = true,
  customToolbarConfig
}) => {
  const [leftPanelVisible, setLeftPanelVisible] = useState(false);
  const [rightPanelVisible, setRightPanelVisible] = useState(false);
  const [selectedTool, setSelectedTool] = useState<string>('select');
  
  return (
    <div className="viewport-3d-layout">
      {/* 顶部主工具栏 */}
      <UnifiedToolbar 
        className="top-toolbar"
        onToolSelect={setSelectedTool}
        selectedTool={selectedTool}
        currentMode={currentMode}
      />
      
      {/* 左侧工具面板 */}
      <div className={`left-sidebar ${leftPanelVisible ? 'expanded' : ''}`}>
        <button 
          className="sidebar-toggle"
          onClick={() => setLeftPanelVisible(!leftPanelVisible)}
        >
          {leftPanelVisible ? '◀' : '▶'}
        </button>
        
        {/* 根据模式显示不同工具栏 */}
        {currentMode === 'geometry' && <CADToolbar />}
        {currentMode === 'meshing' && <MeshingVerticalToolbar />}
        {currentMode === 'analysis' && <ComputationControlPanel />}
      </div>
      
      {/* 主3D视口 */}
      <div className="main-3d-viewport">
        <Canvas scene={scene} />
        
        {/* 右上角导航立方体 */}
        <div className="view-navigation-cube">
          <CubeViewNavigationControl 
            onViewChange={(view) => console.log('视图切换:', view)}
          />
        </div>
        
        {/* 右下角快速操作 */}
        <div className="quick-actions">
          <button title="全屏">🔍</button>
          <button title="截图">📷</button>
          <button title="设置">⚙️</button>
        </div>
      </div>
      
      {/* 右侧交互面板 */}
      <div className={`right-panel ${rightPanelVisible ? 'active' : ''}`}>
        <InteractionToolbar 
          selectedTool={selectedTool}
          onPanelToggle={setRightPanelVisible}
        />
      </div>
      
      {/* 底部状态栏 */}
      <div className="bottom-status-bar">
        <StatusBar currentMode={currentMode} selectedTool={selectedTool} />
      </div>
    </div>
  );
};

export default Viewport3DLayout;
```

### 工具栏状态管理
```typescript
// 集成现有的状态管理系统
const useViewportLayout = () => {
  const viewportStore = useViewportStore();
  const toolbarState = useUnifiedToolbar();
  
  const showPanel = (panel: 'left' | 'right', content?: string) => {
    viewportStore.setToolbarConfig({
      ...viewportStore.toolbarConfig,
      [`${panel}PanelVisible`]: true,
      [`${panel}PanelContent`]: content
    });
  };
  
  const hidePanel = (panel: 'left' | 'right') => {
    viewportStore.setToolbarConfig({
      ...viewportStore.toolbarConfig,
      [`${panel}PanelVisible`]: false
    });
  };
  
  return {
    showPanel,
    hidePanel,
    toolbarState,
    viewportConfig: viewportStore.viewportConfig
  };
};
```

## 📋 实施建议

### 第一阶段：基础布局
1. ✅ 实现主布局容器组件
2. ✅ 集成现有UnifiedToolbar到顶部
3. ✅ 设置左右面板基本框架
4. ✅ 集成CubeViewNavigationControl到右上角

### 第二阶段：工具集成
1. ✅ 将现有垂直工具栏集成到左面板
2. ✅ 将InteractionToolbar集成到右面板
3. ✅ 实现工具栏的智能显示/隐藏逻辑
4. ✅ 添加快捷键支持

### 第三阶段：交互优化
1. ✅ 实现响应式布局适配
2. ✅ 添加动画过渡效果
3. ✅ 优化移动端体验
4. ✅ 性能优化和测试

### 第四阶段：高级功能
1. ✅ 实现上下文感知工具切换
2. ✅ 添加自定义工具栏配置
3. ✅ 集成主题系统
4. ✅ 添加工具使用统计和优化

## 🎯 关键优势

### 🚀 **性能优势**
- **模块化加载**: 按需加载工具栏组件
- **GPU优化**: 所有动画使用GPU加速
- **内存管理**: 智能工具栏内容缓存

### 🎨 **用户体验优势**
- **直观布局**: 符合CAD软件使用习惯
- **智能适配**: 自动调整工具栏内容
- **快捷操作**: 丰富的快捷键支持

### 🔧 **开发优势**
- **组件复用**: 最大化利用现有组件
- **扩展性**: 易于添加新工具和功能
- **维护性**: 清晰的组件结构和状态管理

---

**🎯 3号计算专家**  
*基于现有优秀组件，为0号架构师提供最佳的3D视口布局方案！*

**文件位置**: `E:\DeepCAD\3D_VIEWPORT_TOOLBAR_LAYOUT_DESIGN.md`