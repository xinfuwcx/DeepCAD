/**
 * 结果可视化器
 * 用于显示深基坑分析结果，包括云图和网格
 * 使用Trame作为显示平台
 */

class ResultVisualizer {
    /**
     * 创建结果可视化器
     * @param {HTMLElement} container - 容器元素
     * @param {Object} options - 配置选项
     */
    constructor(container, options = {}) {
        this.container = container;
        this.options = Object.assign({
            serverUrl: '/api/visualization',
            autoConnect: true,
            showControls: true
        }, options);

        this.trameClient = null;
        this.connected = false;
        this.resultData = null;

        // 初始化UI
        this.initUI();

        // 如果设置了自动连接，则连接到Trame服务器
        if (this.options.autoConnect) {
            this.connectToTrameServer();
        }
    }

    /**
     * 初始化UI
     */
    initUI() {
        // 清空容器
        this.container.innerHTML = '';
        
        // 创建Trame视图容器
        this.viewContainer = document.createElement('div');
        this.viewContainer.className = 'trame-view-container';
        this.viewContainer.style.width = '100%';
        this.viewContainer.style.height = '100%';
        this.container.appendChild(this.viewContainer);

        // 如果显示控制面板，创建控制面板
        if (this.options.showControls) {
            this.createControlPanel();
        }

        // 创建加载指示器
        this.loadingIndicator = document.createElement('div');
        this.loadingIndicator.className = 'loading-indicator';
        this.loadingIndicator.innerHTML = '<div class="spinner"></div><div class="loading-text">连接到Trame服务器...</div>';
        this.loadingIndicator.style.position = 'absolute';
        this.loadingIndicator.style.top = '0';
        this.loadingIndicator.style.left = '0';
        this.loadingIndicator.style.width = '100%';
        this.loadingIndicator.style.height = '100%';
        this.loadingIndicator.style.display = 'flex';
        this.loadingIndicator.style.flexDirection = 'column';
        this.loadingIndicator.style.alignItems = 'center';
        this.loadingIndicator.style.justifyContent = 'center';
        this.loadingIndicator.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
        this.loadingIndicator.style.zIndex = '100';
        this.container.appendChild(this.loadingIndicator);
    }

    /**
     * 创建控制面板
     */
    createControlPanel() {
        this.controlPanel = document.createElement('div');
        this.controlPanel.className = 'control-panel';
        this.controlPanel.style.position = 'absolute';
        this.controlPanel.style.top = '10px';
        this.controlPanel.style.right = '10px';
        this.controlPanel.style.background = 'rgba(255, 255, 255, 0.8)';
        this.controlPanel.style.padding = '10px';
        this.controlPanel.style.borderRadius = '5px';
        this.controlPanel.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.1)';
        this.controlPanel.style.zIndex = '100';
        this.controlPanel.style.display = 'none'; // 初始隐藏，连接后显示

        // 创建结果类型选择器
        const resultTypeSelector = document.createElement('select');
        resultTypeSelector.id = 'result-type-selector';
        resultTypeSelector.style.marginBottom = '10px';
        resultTypeSelector.style.width = '100%';
        resultTypeSelector.style.padding = '5px';
        resultTypeSelector.addEventListener('change', () => this.updateResultView());
        this.controlPanel.appendChild(resultTypeSelector);

        // 创建视图模式选择器
        const viewModeSelector = document.createElement('select');
        viewModeSelector.id = 'view-mode-selector';
        viewModeSelector.style.marginBottom = '10px';
        viewModeSelector.style.width = '100%';
        viewModeSelector.style.padding = '5px';
        viewModeSelector.innerHTML = `
            <option value="contour">云图</option>
            <option value="mesh">网格</option>
            <option value="both">云图+网格</option>
        `;
        viewModeSelector.addEventListener('change', () => this.updateViewMode());
        this.controlPanel.appendChild(viewModeSelector);

        // 添加控制面板到容器
        this.container.appendChild(this.controlPanel);
    }

    /**
     * 连接到Trame服务器
     * @returns {Promise} 连接完成的Promise
     */
    connectToTrameServer() {
        return new Promise((resolve, reject) => {
            // 显示加载指示器
            this.loadingIndicator.style.display = 'flex';

            // 创建iframe作为Trame客户端
            const iframe = document.createElement('iframe');
            iframe.style.width = '100%';
            iframe.style.height = '100%';
            iframe.style.border = 'none';
            iframe.src = this.options.serverUrl;
            
            // 添加iframe到视图容器
            this.viewContainer.appendChild(iframe);
            
            // 保存iframe引用
            this.trameClient = {
                iframe: iframe,
                send: (event, data) => {
                    iframe.contentWindow.postMessage({ event, data }, '*');
                }
            };
            
            // 监听iframe加载完成
            iframe.onload = () => {
                console.log('Trame iframe加载完成');
                this.connected = true;
                this.loadingIndicator.style.display = 'none';
                
                // 如果有控制面板，显示它
                if (this.controlPanel) {
                    this.controlPanel.style.display = 'block';
                }
                
                // 注册消息事件监听器
                this.registerMessageListener();
                
                resolve();
            };
            
            // 监听iframe加载失败
            iframe.onerror = (error) => {
                console.error('Trame iframe加载失败:', error);
                this.showError('连接到Trame服务器失败，请检查网络连接或服务器状态');
                reject(error);
            };
        });
    }

    /**
     * 注册消息事件监听器
     */
    registerMessageListener() {
        // 监听来自iframe的消息
        window.addEventListener('message', (event) => {
            // 确保消息来自我们的iframe
            if (event.source !== this.trameClient.iframe.contentWindow) {
                return;
            }
            
            const { event: eventType, data } = event.data;
            
            if (eventType === 'result:data') {
                this.resultData = data;
                this.updateResultTypeSelector();
                this.updateResultView();
            } else if (eventType === 'error') {
                console.error('Trame错误:', data);
                this.showError(`Trame错误: ${data.message || '未知错误'}`);
            }
        });
    }

    /**
     * 更新结果类型选择器
     */
    updateResultTypeSelector() {
        if (!this.resultData || !this.controlPanel) return;

        const selector = this.controlPanel.querySelector('#result-type-selector');
        if (!selector) return;

        // 清空选择器
        selector.innerHTML = '';

        // 添加结果类型选项
        if (this.resultData.resultTypes && this.resultData.resultTypes.length > 0) {
            this.resultData.resultTypes.forEach(type => {
                const option = document.createElement('option');
                option.value = type.value;
                option.textContent = type.text;
                selector.appendChild(option);
            });
        } else {
            const option = document.createElement('option');
            option.value = 'none';
            option.textContent = '无可用结果';
            selector.appendChild(option);
        }
    }

    /**
     * 更新结果视图
     */
    updateResultView() {
        if (!this.trameClient || !this.connected) return;

        const resultTypeSelector = this.controlPanel.querySelector('#result-type-selector');
        if (!resultTypeSelector) return;

        const resultType = resultTypeSelector.value;
        if (resultType === 'none') return;

        // 发送更新视图请求到服务器
        this.trameClient.send('update_result_type', resultType);
    }

    /**
     * 更新视图模式
     */
    updateViewMode() {
        if (!this.trameClient || !this.connected) return;

        const viewModeSelector = this.controlPanel.querySelector('#view-mode-selector');
        if (!viewModeSelector) return;

        const viewMode = viewModeSelector.value;

        // 发送更新视图模式请求到服务器
        this.trameClient.send('update_view_mode', viewMode);
    }

    /**
     * 加载分析结果
     * @param {string} analysisId - 分析ID
     * @returns {Promise} 加载完成的Promise
     */
    loadAnalysisResult(analysisId) {
        return new Promise((resolve, reject) => {
            if (!this.trameClient || !this.connected) {
                reject(new Error('未连接到Trame服务器'));
                return;
            }

            // 显示加载指示器
            this.loadingIndicator.style.display = 'flex';
            this.loadingIndicator.querySelector('.loading-text').textContent = '加载分析结果...';

            // 更新iframe URL
            const url = `${this.options.serverUrl}?analysis_id=${analysisId}`;
            this.trameClient.iframe.src = url;
            
            // 监听iframe加载完成
            this.trameClient.iframe.onload = () => {
                this.loadingIndicator.style.display = 'none';
                resolve();
            };
            
            // 监听iframe加载失败
            this.trameClient.iframe.onerror = (error) => {
                this.loadingIndicator.style.display = 'none';
                this.showError(`加载分析结果失败: ${error}`);
                reject(error);
            };
        });
    }

    /**
     * 显示错误信息
     * @param {string} message - 错误信息
     */
    showError(message) {
        this.loadingIndicator.style.display = 'flex';
        this.loadingIndicator.querySelector('.loading-text').textContent = message;
        this.loadingIndicator.querySelector('.loading-text').style.color = 'red';

        // 3秒后隐藏错误信息
        setTimeout(() => {
            this.loadingIndicator.style.display = 'none';
            this.loadingIndicator.querySelector('.loading-text').style.color = '';
            this.loadingIndicator.querySelector('.loading-text').textContent = '连接到Trame服务器...';
        }, 3000);
    }

    /**
     * 截图
     * @returns {Promise<string>} 截图数据URL的Promise
     */
    takeScreenshot() {
        return new Promise((resolve, reject) => {
            if (!this.trameClient || !this.connected) {
                reject(new Error('未连接到Trame服务器'));
                return;
            }

            // 创建一个唯一的回调ID
            const callbackId = `screenshot_${Date.now()}`;
            
            // 创建一个一次性消息监听器
            const messageListener = (event) => {
                // 确保消息来自我们的iframe
                if (event.source !== this.trameClient.iframe.contentWindow) {
                    return;
                }
                
                const { event: eventType, data, id } = event.data;
                
                if (eventType === 'screenshot' && id === callbackId) {
                    // 移除监听器
                    window.removeEventListener('message', messageListener);
                    
                    if (data && data.imageData) {
                        resolve(data.imageData);
                    } else {
                        reject(new Error('截图失败，未收到图像数据'));
                    }
                }
            };
            
            // 添加消息监听器
            window.addEventListener('message', messageListener);
            
            // 发送截图请求到服务器
            this.trameClient.send('take_screenshot', { id: callbackId });
            
            // 设置超时
            setTimeout(() => {
                window.removeEventListener('message', messageListener);
                reject(new Error('截图请求超时'));
            }, 5000);
        });
    }

    /**
     * 导出当前视图
     * @param {string} format - 导出格式，如'png', 'jpg', 'pdf'
     * @returns {Promise<Blob>} 导出数据的Promise
     */
    exportView(format = 'png') {
        return new Promise((resolve, reject) => {
            if (!this.trameClient || !this.connected) {
                reject(new Error('未连接到Trame服务器'));
                return;
            }

            // 创建一个唯一的回调ID
            const callbackId = `export_${Date.now()}`;
            
            // 创建一个一次性消息监听器
            const messageListener = (event) => {
                // 确保消息来自我们的iframe
                if (event.source !== this.trameClient.iframe.contentWindow) {
                    return;
                }
                
                const { event: eventType, data, id } = event.data;
                
                if (eventType === 'export_view' && id === callbackId) {
                    // 移除监听器
                    window.removeEventListener('message', messageListener);
                    
                    if (data && data.data) {
                        // 将Base64数据转换为Blob
                        const byteString = atob(data.data.split(',')[1]);
                        const mimeString = data.data.split(',')[0].split(':')[1].split(';')[0];
                        const ab = new ArrayBuffer(byteString.length);
                        const ia = new Uint8Array(ab);
                        
                        for (let i = 0; i < byteString.length; i++) {
                            ia[i] = byteString.charCodeAt(i);
                        }
                        
                        const blob = new Blob([ab], { type: mimeString });
                        resolve(blob);
                    } else {
                        reject(new Error('导出失败，未收到数据'));
                    }
                }
            };
            
            // 添加消息监听器
            window.addEventListener('message', messageListener);
            
            // 发送导出请求到服务器
            this.trameClient.send('export_view', { format, id: callbackId });
            
            // 设置超时
            setTimeout(() => {
                window.removeEventListener('message', messageListener);
                reject(new Error('导出请求超时'));
            }, 5000);
        });
    }

    /**
     * 销毁实例，释放资源
     */
    destroy() {
        if (this.trameClient && this.trameClient.iframe) {
            this.viewContainer.removeChild(this.trameClient.iframe);
            this.trameClient = null;
        }

        this.container.innerHTML = '';
        this.connected = false;
    }
}