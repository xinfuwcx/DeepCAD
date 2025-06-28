/**
 * @file main.js
 * @description 深基坑CAE系统的主要JavaScript文件，负责界面交互和3D渲染
 * @author Deep Excavation Team
 * @version 1.0.0
 * @copyright 2025
 */

/**
 * @namespace App
 * @description 应用程序主命名空间
 */
const App = {
    /**
     * @property {Object} three - Three.js相关对象
     */
    three: {
        scene: null,
        camera: null,
        renderer: null,
        controls: null,
        viewcube: null,
        grid: null,
        lights: {},
        objects: {}
    },
    
    /**
     * @property {Object} ui - UI相关对象和状态
     */
    ui: {
        activeTab: 'modeling',
        isDragging: false,
        currentDialog: null,
        resizing: null
    },

    /**
     * @method init
     * @description 初始化应用程序
     */
    init() {
        this.initThree();
        this.initUI();
        this.animate();
        console.log('深基坑CAE系统初始化完成');
    },

    /**
     * @method initThree
     * @description 初始化Three.js场景
     */
    initThree() {
        const container = document.getElementById('3d-canvas');
        if (!container) return;
        
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        // 创建场景
        this.three.scene = new THREE.Scene();
        this.three.scene.background = new THREE.Color(0x111111);
        
        // 创建相机
        this.three.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
        this.three.camera.position.set(20, 20, 20);
        this.three.camera.lookAt(0, 0, 0);
        
        // 创建渲染器
        this.three.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.three.renderer.setSize(width, height);
        this.three.renderer.setPixelRatio(window.devicePixelRatio);
        this.three.renderer.shadowMap.enabled = true;
        container.appendChild(this.three.renderer.domElement);
        
        // 添加轨道控制器
        this.three.controls = new THREE.OrbitControls(this.three.camera, this.three.renderer.domElement);
        this.three.controls.enableDamping = true;
        this.three.controls.dampingFactor = 0.05;
        
        // 添加网格
        this.three.grid = new THREE.GridHelper(50, 50, 0x555555, 0x333333);
        this.three.scene.add(this.three.grid);
        
        // 添加坐标轴辅助
        const axesHelper = new THREE.AxesHelper(10);
        this.three.scene.add(axesHelper);
        
        // 添加灯光
        this.three.lights.ambient = new THREE.AmbientLight(0xffffff, 0.4);
        this.three.scene.add(this.three.lights.ambient);
        
        this.three.lights.directional1 = new THREE.DirectionalLight(0xffffff, 0.6);
        this.three.lights.directional1.position.set(1, 1, 1);
        this.three.scene.add(this.three.lights.directional1);
        
        this.three.lights.directional2 = new THREE.DirectionalLight(0xffffff, 0.4);
        this.three.lights.directional2.position.set(-1, 0.5, -1);
        this.three.scene.add(this.three.lights.directional2);
        
        // 创建简单的ViewCube
        this.createViewCube();
        
        // 添加窗口大小调整监听
        window.addEventListener('resize', () => this.onWindowResize());
        
        // 添加初始示例模型（后续可移除）
        this.createDemoModel();
    },
    
    /**
     * @method createViewCube
     * @description 创建视图方向立方体
     */
    createViewCube() {
        const viewcubeContainer = document.getElementById('viewcube');
        if (!viewcubeContainer) return;
        
        // ViewCube渲染器
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(100, 100);
        viewcubeContainer.appendChild(renderer.domElement);
        
        // ViewCube场景
        const scene = new THREE.Scene();
        
        // ViewCube相机
        const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
        camera.position.set(5, 5, 5);
        camera.lookAt(0, 0, 0);
        
        // 创建ViewCube几何体
        const cubeGeometry = new THREE.BoxGeometry(2, 2, 2);
        const cubeMaterials = [
            new THREE.MeshBasicMaterial({ color: 0x145DA0, transparent: true, opacity: 0.8 }), // Right - East
            new THREE.MeshBasicMaterial({ color: 0x145DA0, transparent: true, opacity: 0.8 }), // Left - West
            new THREE.MeshBasicMaterial({ color: 0x145DA0, transparent: true, opacity: 0.8 }), // Top - North
            new THREE.MeshBasicMaterial({ color: 0x145DA0, transparent: true, opacity: 0.8 }), // Bottom - South
            new THREE.MeshBasicMaterial({ color: 0x145DA0, transparent: true, opacity: 0.8 }), // Front - Up
            new THREE.MeshBasicMaterial({ color: 0x145DA0, transparent: true, opacity: 0.8 })  // Back - Down
        ];
        
        const cube = new THREE.Mesh(cubeGeometry, cubeMaterials);
        scene.add(cube);
        
        // 添加文字标签
        const labels = ['E', 'W', 'N', 'S', 'U', 'D'];
        const positions = [
            [1.01, 0, 0], [-1.01, 0, 0], [0, 1.01, 0],
            [0, -1.01, 0], [0, 0, 1.01], [0, 0, -1.01]
        ];
        
        // 线框
        const edgesGeometry = new THREE.EdgesGeometry(cubeGeometry);
        const edgesMaterial = new THREE.LineBasicMaterial({ color: 0xFFFFFF });
        const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
        cube.add(edges);
        
        // 将ViewCube存储在App中
        this.three.viewcube = {
            renderer,
            scene,
            camera,
            cube,
            render: function() {
                cube.rotation.copy(App.three.camera.rotation);
                cube.rotation.x *= -1;
                cube.rotation.z *= -1;
                renderer.render(scene, camera);
            }
        };
    },
    
    /**
     * @method createDemoModel
     * @description 创建演示模型
     */
    createDemoModel() {
        // 创建土体
        const soilGeometry = new THREE.BoxGeometry(100, 50, 100);
        const soilMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x8B4513,
            transparent: true,
            opacity: 0.7
        });
        this.three.objects.soil = new THREE.Mesh(soilGeometry, soilMaterial);
        this.three.objects.soil.position.y = -25;
        this.three.scene.add(this.three.objects.soil);
        
        // 创建基坑
        const pitGeometry = new THREE.BoxGeometry(50, 20, 50);
        const pitMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x6B8E23,
            transparent: true,
            opacity: 0.5
        });
        this.three.objects.pit = new THREE.Mesh(pitGeometry, pitMaterial);
        this.three.objects.pit.position.y = -10;
        this.three.scene.add(this.three.objects.pit);
        
        // 创建地连墙
        const wallGeometry = new THREE.BoxGeometry(52, 30, 1);
        const wallMaterial = new THREE.MeshLambertMaterial({ color: 0x708090 });
        
        // 前墙
        this.three.objects.frontWall = new THREE.Mesh(wallGeometry, wallMaterial);
        this.three.objects.frontWall.position.set(0, -15, 25.5);
        this.three.scene.add(this.three.objects.frontWall);
        
        // 后墙
        this.three.objects.backWall = new THREE.Mesh(wallGeometry, wallMaterial);
        this.three.objects.backWall.position.set(0, -15, -25.5);
        this.three.scene.add(this.three.objects.backWall);
        
        // 左墙
        const sideWallGeometry = new THREE.BoxGeometry(1, 30, 50);
        this.three.objects.leftWall = new THREE.Mesh(sideWallGeometry, wallMaterial);
        this.three.objects.leftWall.position.set(25.5, -15, 0);
        this.three.scene.add(this.three.objects.leftWall);
        
        // 右墙
        this.three.objects.rightWall = new THREE.Mesh(sideWallGeometry, wallMaterial);
        this.three.objects.rightWall.position.set(-25.5, -15, 0);
        this.three.scene.add(this.three.objects.rightWall);
        
        // 创建隧道
        const tunnelGeometry = new THREE.CylinderGeometry(5, 5, 120, 32);
        const tunnelMaterial = new THREE.MeshLambertMaterial({ color: 0x444444 });
        this.three.objects.tunnel = new THREE.Mesh(tunnelGeometry, tunnelMaterial);
        this.three.objects.tunnel.rotation.z = Math.PI / 2;
        this.three.objects.tunnel.position.set(0, -35, 0);
        this.three.scene.add(this.three.objects.tunnel);
    },

    /**
     * @method onWindowResize
     * @description 处理窗口大小变化
     */
    onWindowResize() {
        const container = document.getElementById('3d-canvas');
        if (!container) return;
        
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        this.three.camera.aspect = width / height;
        this.three.camera.updateProjectionMatrix();
        this.three.renderer.setSize(width, height);
    },

    /**
     * @method animate
     * @description 动画循环
     */
    animate() {
        requestAnimationFrame(() => this.animate());
        
        this.three.controls.update();
        this.three.renderer.render(this.three.scene, this.three.camera);
        
        if (this.three.viewcube) {
            this.three.viewcube.render();
        }
        
        this.updateCoordinateDisplay();
    },
    
    /**
     * @method updateCoordinateDisplay
     * @description 更新状态栏中的坐标显示
     */
    updateCoordinateDisplay() {
        const coordsDisplay = document.querySelector('.coordinates');
        if (coordsDisplay) {
            const mousePosition = this.ui.mousePosition || { x: 0, y: 0, z: 0 };
            coordsDisplay.textContent = `X: ${mousePosition.x.toFixed(3)} Y: ${mousePosition.y.toFixed(3)} Z: ${mousePosition.z.toFixed(3)}`;
        }
    },

    /**
     * @method initUI
     * @description 初始化用户界面事件监听
     */
    initUI() {
        // 标签切换
        document.querySelectorAll('.ribbon-tab').forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab.getAttribute('data-tab')));
        });
        
        // 对话框操作
        document.querySelectorAll('.dialog .close-btn, .dialog .btn-secondary').forEach(btn => {
            btn.addEventListener('click', () => this.closeCurrentDialog());
        });
        
        // 初始化模型创建按钮
        const createDomainBtn = document.querySelector('.ribbon-btn[title="Create Domain"]');
        if (createDomainBtn) {
            createDomainBtn.addEventListener('click', () => this.showDialog('domain-dialog'));
        }
        
        // 添加图层按钮
        const addLayerBtn = document.querySelector('.add-layer-btn');
        if (addLayerBtn) {
            addLayerBtn.addEventListener('click', () => this.addSoilLayer());
        }
        
        // 删除图层按钮
        document.querySelectorAll('.soil-layer .icon-delete').forEach(btn => {
            const layerElement = btn.closest('.soil-layer');
            btn.addEventListener('click', () => this.removeSoilLayer(layerElement));
        });
    },

    /**
     * @method switchTab
     * @param {string} tabId - 要切换到的标签ID
     * @description 切换Ribbon菜单标签
     */
    switchTab(tabId) {
        // 移除所有活动标签和面板类
        document.querySelectorAll('.ribbon-tab, .ribbon-panel').forEach(el => {
            el.classList.remove('active');
        });
        
        // 添加新的活动标签和面板
        document.querySelector(`.ribbon-tab[data-tab="${tabId}"]`)?.classList.add('active');
        document.querySelector(`.ribbon-panel[data-panel="${tabId}"]`)?.classList.add('active');
        
        this.ui.activeTab = tabId;
    },

    /**
     * @method showDialog
     * @param {string} dialogId - 要显示的对话框ID
     * @description 显示指定的对话框
     */
    showDialog(dialogId) {
        const dialog = document.getElementById(dialogId);
        if (dialog) {
            this.closeCurrentDialog();
            dialog.style.display = 'block';
            this.ui.currentDialog = dialog;
        }
    },

    /**
     * @method closeCurrentDialog
     * @description 关闭当前显示的对话框
     */
    closeCurrentDialog() {
        if (this.ui.currentDialog) {
            this.ui.currentDialog.style.display = 'none';
            this.ui.currentDialog = null;
        }
    },

    /**
     * @method addSoilLayer
     * @description 添加土层
     */
    addSoilLayer() {
        const soilLayers = document.querySelector('.soil-layers');
        const layerCount = document.querySelectorAll('.soil-layer').length;
        
        const newLayer = document.createElement('div');
        newLayer.className = 'soil-layer';
        newLayer.innerHTML = `
            <div class="layer-header">
                <span>Layer ${layerCount + 1}</span>
                <div class="layer-controls">
                    <button class="icon-btn" title="Delete layer"><i class="icon icon-delete"></i></button>
                </div>
            </div>
            <div class="layer-properties">
                <div class="form-group">
                    <label>Material:</label>
                    <select>
                        <option>Clay</option>
                        <option>Sand</option>
                        <option>Rock</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Thickness:</label>
                    <div class="input-group">
                        <input type="number" value="5">
                        <span class="unit">m</span>
                    </div>
                </div>
            </div>
        `;
        
        const addLayerBtn = document.querySelector('.add-layer-btn');
        soilLayers.insertBefore(newLayer, addLayerBtn);
        
        // 添加删除按钮事件监听
        newLayer.querySelector('.icon-delete').addEventListener('click', () => {
            this.removeSoilLayer(newLayer);
        });
    },

    /**
     * @method removeSoilLayer
     * @param {HTMLElement} layerElement - 要删除的土层元素
     * @description 移除指定的土层
     */
    removeSoilLayer(layerElement) {
        layerElement.parentNode.removeChild(layerElement);
        
        // 重新编号
        document.querySelectorAll('.soil-layer').forEach((layer, index) => {
            layer.querySelector('.layer-header span').textContent = `Layer ${index + 1}`;
        });
    }
};

// 当文档加载完成时初始化应用程序
document.addEventListener('DOMContentLoaded', () => App.init()); 