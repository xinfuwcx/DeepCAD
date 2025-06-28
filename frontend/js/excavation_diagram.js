/**
 * @file excavation_diagram.js
 * @description 二维深基坑示意图组件
 * @author Deep Excavation Team
 * @version 1.0.0
 * @copyright 2025
 */

/**
 * 深基坑二维示意图
 * 使用Three.js的CSS 3D渲染
 */
class ExcavationDiagram {
  /**
   * 创建深基坑二维示意图
   * @param {HTMLElement} container - 容器元素
   * @param {Object} options - 配置选项
   */
  constructor(container, options = {}) {
    this.container = container;
    this.options = Object.assign({
      width: container.clientWidth,
      height: container.clientHeight,
      scale: 1,
      soilLayers: [
        { depth: 0, thickness: 50, color: '#d9c8b4', name: '填土层' },
        { depth: 50, thickness: 50, color: '#c2a887', name: '粉质粘土' },
        { depth: 100, thickness: 50, color: '#a88c6d', name: '砂层' },
        { depth: 150, thickness: 50, color: '#8d7558', name: '粘土' },
        { depth: 200, thickness: 50, color: '#6e5a42', name: '基岩' }
      ],
      excavation: {
        width: 300,
        depth: 150,
        x: 0,
        y: 0
      },
      waterLevel: 80,
      showAnnotations: true,
      showControls: true
    }, options);

    // 初始化场景
    this.init();
  }

  /**
   * 初始化场景
   */
  init() {
    // 清空容器
    this.container.innerHTML = '';
    this.container.classList.add('excavation-diagram-container');

    // 创建主容器
    this.diagramContainer = document.createElement('div');
    this.diagramContainer.className = 'excavation-diagram-3d';
    this.container.appendChild(this.diagramContainer);

    // 创建土层
    this.createSoilLayers();

    // 创建基坑
    this.createExcavationPit();

    // 创建支护结构
    this.createRetainingStructure();

    // 创建水位线
    if (this.options.waterLevel !== null && this.options.waterLevel !== undefined) {
      this.createWaterLevel();
    }

    // 创建标注
    if (this.options.showAnnotations) {
      this.createAnnotations();
    }

    // 创建控制面板
    if (this.options.showControls) {
      this.createControls();
    }

    // 添加窗口大小变化监听
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  /**
   * 创建土层
   */
  createSoilLayers() {
    this.soilLayerElements = [];

    this.options.soilLayers.forEach((layer, index) => {
      // 创建土层DOM元素
      const soilElement = document.createElement('div');
      soilElement.className = `soil-layer layer-${index + 1}`;
      soilElement.style.height = `${layer.thickness}px`;
      soilElement.style.top = `${layer.depth}px`;
      soilElement.style.backgroundColor = layer.color;
      
      this.diagramContainer.appendChild(soilElement);

      this.soilLayerElements.push({
        element: soilElement,
        data: layer
      });
    });
  }

  /**
   * 创建基坑
   */
  createExcavationPit() {
    const { width, depth, x, y } = this.options.excavation;

    // 创建基坑DOM元素
    const pitElement = document.createElement('div');
    pitElement.className = 'excavation-pit';
    pitElement.style.width = `${width}px`;
    pitElement.style.height = `${depth}px`;
    pitElement.style.left = `${this.options.width / 2 - width / 2 + x}px`;
    pitElement.style.top = `${y}px`;

    this.diagramContainer.appendChild(pitElement);

    this.excavationPitElement = pitElement;
  }

  /**
   * 创建支护结构
   */
  createRetainingStructure() {
    const retainingStructure = document.createElement('div');
    retainingStructure.className = 'retaining-structure';
    this.diagramContainer.appendChild(retainingStructure);
    
    this.retainingStructureElement = retainingStructure;
    
    this.createRetainingPiles();
    this.createStruts();
  }

  /**
   * 创建围护桩
   */
  createRetainingPiles() {
    const { width, depth, x, y } = this.options.excavation;
    const pileHeight = 250;
    const pileCount = 20;
    const pileSpacing = width / (pileCount / 2 - 1);

    this.pileElements = [];

    // 创建左侧围护桩
    for (let i = 0; i < pileCount / 2; i++) {
      const pileElement = document.createElement('div');
      pileElement.className = 'retaining-pile';
      pileElement.style.height = `${pileHeight}px`;
      pileElement.style.left = `${this.options.width / 2 - width / 2 + x - 5 + i * pileSpacing}px`;
      pileElement.style.top = `${y}px`;
      
      this.retainingStructureElement.appendChild(pileElement);
      this.pileElements.push(pileElement);
    }

    // 创建右侧围护桩
    for (let i = 0; i < pileCount / 2; i++) {
      const pileElement = document.createElement('div');
      pileElement.className = 'retaining-pile';
      pileElement.style.height = `${pileHeight}px`;
      pileElement.style.left = `${this.options.width / 2 + width / 2 + x - 5 + i * pileSpacing}px`;
      pileElement.style.top = `${y}px`;
      
      this.retainingStructureElement.appendChild(pileElement);
      this.pileElements.push(pileElement);
    }
  }

  /**
   * 创建支撑
   */
  createStruts() {
    const { width, depth, x, y } = this.options.excavation;
    const strutDepth = 30;
    const strutCount = 3;
    const strutSpacing = depth / (strutCount + 1);

    this.strutElements = [];

    // 创建水平支撑
    for (let i = 1; i <= strutCount; i++) {
      const strutElement = document.createElement('div');
      strutElement.className = 'strut';
      strutElement.style.width = `${width}px`;
      strutElement.style.left = `${this.options.width / 2 - width / 2 + x}px`;
      strutElement.style.top = `${y + i * strutSpacing}px`;
      
      this.retainingStructureElement.appendChild(strutElement);
      this.strutElements.push(strutElement);
    }
  }

  /**
   * 创建水位线
   */
  createWaterLevel() {
    const waterLevel = this.options.waterLevel;

    // 创建水位线DOM元素
    const waterElement = document.createElement('div');
    waterElement.className = 'water-level';
    waterElement.style.top = `${waterLevel}px`;

    this.diagramContainer.appendChild(waterElement);
    this.waterLevelElement = waterElement;
  }

  /**
   * 创建标注
   */
  createAnnotations() {
    this.annotationElements = [];

    // 创建深度标注
    const depthMarkers = [0, 50, 100, 150, 200, 250];
    depthMarkers.forEach(depth => {
      const markerElement = document.createElement('div');
      markerElement.className = 'annotation depth-marker';
      markerElement.style.top = `${depth}px`;
      markerElement.textContent = `${depth} m`;

      this.diagramContainer.appendChild(markerElement);
      this.annotationElements.push(markerElement);
    });

    // 创建土层名称标注
    this.options.soilLayers.forEach(layer => {
      const nameElement = document.createElement('div');
      nameElement.className = 'annotation layer-name';
      nameElement.style.top = `${layer.depth + layer.thickness / 2}px`;
      nameElement.textContent = layer.name;

      this.diagramContainer.appendChild(nameElement);
      this.annotationElements.push(nameElement);
    });

    // 创建水位线标注
    if (this.options.waterLevel !== null && this.options.waterLevel !== undefined) {
      const waterElement = document.createElement('div');
      waterElement.className = 'annotation depth-marker';
      waterElement.style.top = `${this.options.waterLevel}px`;
      waterElement.textContent = `水位线 ${this.options.waterLevel} m`;
      waterElement.style.color = '#0088ff';

      this.diagramContainer.appendChild(waterElement);
      this.annotationElements.push(waterElement);
    }
  }

  /**
   * 创建控制面板
   */
  createControls() {
    const controlsElement = document.createElement('div');
    controlsElement.className = 'excavation-controls';

    // 创建基坑深度控制
    const depthLabel = document.createElement('label');
    depthLabel.textContent = '基坑深度 (m)';
    controlsElement.appendChild(depthLabel);

    const depthInput = document.createElement('input');
    depthInput.type = 'range';
    depthInput.min = '50';
    depthInput.max = '200';
    depthInput.step = '10';
    depthInput.value = this.options.excavation.depth;
    depthInput.addEventListener('input', () => {
      this.updateExcavationDepth(parseInt(depthInput.value));
    });
    controlsElement.appendChild(depthInput);

    // 创建水位深度控制
    const waterLabel = document.createElement('label');
    waterLabel.textContent = '水位深度 (m)';
    controlsElement.appendChild(waterLabel);

    const waterInput = document.createElement('input');
    waterInput.type = 'range';
    waterInput.min = '0';
    waterInput.max = '200';
    waterInput.step = '10';
    waterInput.value = this.options.waterLevel || 0;
    waterInput.addEventListener('input', () => {
      this.updateWaterLevel(parseInt(waterInput.value));
    });
    controlsElement.appendChild(waterInput);

    // 添加控制面板到容器
    this.container.appendChild(controlsElement);
    this.controlsElement = controlsElement;
  }

  /**
   * 更新基坑深度
   * @param {number} depth - 基坑深度
   */
  updateExcavationDepth(depth) {
    const { width, x, y } = this.options.excavation;
    this.options.excavation.depth = depth;

    // 更新基坑元素
    this.excavationPitElement.style.height = `${depth}px`;

    // 更新支撑
    this.updateStruts();
  }

  /**
   * 更新支撑
   */
  updateStruts() {
    // 移除现有支撑
    this.strutElements.forEach(strut => {
      this.retainingStructureElement.removeChild(strut);
    });
    this.strutElements = [];

    // 重新创建支撑
    this.createStruts();
  }

  /**
   * 更新水位深度
   * @param {number} depth - 水位深度
   */
  updateWaterLevel(depth) {
    this.options.waterLevel = depth;

    // 移除现有水位线
    if (this.waterLevelElement) {
      this.diagramContainer.removeChild(this.waterLevelElement);
    }

    // 创建新水位线
    this.createWaterLevel();

    // 更新水位线标注
    this.updateWaterLevelAnnotation();
  }

  /**
   * 更新水位线标注
   */
  updateWaterLevelAnnotation() {
    // 找到水位线标注
    const waterAnnotation = this.annotationElements.find(annotation => 
      annotation.textContent && annotation.textContent.includes('水位线')
    );

    // 如果找到，更新它
    if (waterAnnotation) {
      this.diagramContainer.removeChild(waterAnnotation);
      
      const waterElement = document.createElement('div');
      waterElement.className = 'annotation depth-marker';
      waterElement.style.top = `${this.options.waterLevel}px`;
      waterElement.textContent = `水位线 ${this.options.waterLevel} m`;
      waterElement.style.color = '#0088ff';

      this.diagramContainer.appendChild(waterElement);

      // 更新引用
      const index = this.annotationElements.indexOf(waterAnnotation);
      this.annotationElements[index] = waterElement;
    }
  }

  /**
   * 窗口大小变化处理
   */
  onWindowResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.options.width = width;
    this.options.height = height;

    // 重新定位基坑
    this.updateExcavationPosition();
  }

  /**
   * 更新基坑位置
   */
  updateExcavationPosition() {
    const { width, depth, x, y } = this.options.excavation;
    this.excavationPitElement.style.left = `${this.options.width / 2 - width / 2 + x}px`;
  }

  /**
   * 更新土层数据
   * @param {Array} soilLayers - 土层数据
   */
  updateSoilLayers(soilLayers) {
    this.options.soilLayers = soilLayers;

    // 移除现有土层
    this.soilLayerElements.forEach(layer => {
      this.diagramContainer.removeChild(layer.element);
    });
    this.soilLayerElements = [];

    // 重新创建土层
    this.createSoilLayers();

    // 更新标注
    if (this.options.showAnnotations) {
      this.annotationElements.forEach(annotation => {
        this.diagramContainer.removeChild(annotation);
      });
      this.annotationElements = [];
      this.createAnnotations();
    }
  }

  /**
   * 更新基坑数据
   * @param {Object} excavation - 基坑数据
   */
  updateExcavation(excavation) {
    this.options.excavation = { ...this.options.excavation, ...excavation };

    // 移除现有基坑
    this.diagramContainer.removeChild(this.excavationPitElement);

    // 移除现有支护结构
    this.diagramContainer.removeChild(this.retainingStructureElement);

    // 重新创建基坑
    this.createExcavationPit();

    // 重新创建支护结构
    this.createRetainingStructure();
  }

  /**
   * 销毁实例，释放资源
   */
  destroy() {
    // 移除窗口大小变化监听
    window.removeEventListener('resize', this.onWindowResize.bind(this));

    // 清空容器
    this.container.innerHTML = '';
  }
}

// 导出类
export default ExcavationDiagram;