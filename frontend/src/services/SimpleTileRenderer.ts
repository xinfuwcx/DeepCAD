/**
 * 最简单可靠的瓦片渲染器
 * 解决用户反馈的"死地图"问题
 * 确保瓦片真的能加载和显示
 */

import * as THREE from 'three';

export interface TileCoordinate {
  x: number;
  y: number;
  z: number;
}

export interface GeographicCoordinate {
  lat: number;
  lng: number;
}

export class SimpleTileRenderer {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private renderer: THREE.WebGLRenderer;
  private tiles: Map<string, THREE.Mesh> = new Map();
  private loader: THREE.TextureLoader;
  
  // 瓦片配置
  private readonly TILE_SIZE = 256;
  private readonly WORLD_SCALE = 10; // 世界坐标缩放
  private currentZoom = 8;
  private centerCoord: GeographicCoordinate = { lat: 31.2304, lng: 121.4737 };
  
  // 瓦片服务URL (优先使用最稳定的，增加备用选项)
  private readonly TILE_URLS = {
    osm: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    google_satellite: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    cartodb_dark: 'https://cartodb-basemaps-a.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png',
    // 备用URL - 如果主要的不工作
    backup_osm: 'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
    wikimedia: 'https://maps.wikimedia.org/osm-intl/{z}/{x}/{y}.png'
  };
  
  private currentStyle: keyof typeof this.TILE_URLS = 'osm';

  constructor(scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    
    // 配置纹理加载器
    this.loader = new THREE.TextureLoader();
    this.loader.crossOrigin = 'anonymous';
    
    console.log('🗺️ SimpleTileRenderer 初始化完成');
  }

  /**
   * 经纬度转瓦片坐标
   */
  private lngLatToTile(lng: number, lat: number, zoom: number): TileCoordinate {
    const latRad = (lat * Math.PI) / 180;
    const n = Math.pow(2, zoom);
    const x = Math.floor(((lng + 180) / 360) * n);
    const y = Math.floor(((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2) * n);
    
    return { x, y, z: zoom };
  }

  /**
   * 瓦片坐标转世界坐标
   */
  private tileToWorldPosition(tileX: number, tileY: number, centerTile: TileCoordinate): THREE.Vector3 {
    const offsetX = (tileX - centerTile.x) * this.WORLD_SCALE;
    const offsetZ = -(tileY - centerTile.y) * this.WORLD_SCALE; // Z轴翻转
    return new THREE.Vector3(offsetX, 0, offsetZ);
  }

  /**
   * 生成瓦片URL
   */
  private getTileUrl(x: number, y: number, z: number): string {
    const template = this.TILE_URLS[this.currentStyle];
    return template
      .replace('{x}', x.toString())
      .replace('{y}', y.toString())
      .replace('{z}', z.toString());
  }

  /**
   * 创建瓦片网格
   */
  private createTileMesh(worldPos: THREE.Vector3): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(this.WORLD_SCALE, this.WORLD_SCALE);
    const material = new THREE.MeshBasicMaterial({
      color: 0x4488bb, // 默认蓝色
      side: THREE.DoubleSide,
      transparent: false
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(worldPos);
    mesh.rotation.x = -Math.PI / 2; // 水平放置
    
    return mesh;
  }

  /**
   * 加载瓦片纹理 - 增强版，带备用URL和超时处理
   */
  private async loadTileTexture(mesh: THREE.Mesh, x: number, y: number, z: number): Promise<boolean> {
    const urls = [
      this.getTileUrl(x, y, z),
      // 备用URL
      `https://a.tile.openstreetmap.org/${z}/${x}/${y}.png`,
      `https://maps.wikimedia.org/osm-intl/${z}/${x}/${y}.png`
    ];
    
    // 尝试每个URL
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      console.log(`🌐 尝试加载瓦片 ${i + 1}/${urls.length}: ${z}/${x}/${y} - ${url}`);
      
      const success = await new Promise<boolean>((resolve) => {
        const timeoutId = setTimeout(() => {
          console.warn(`⏰ 瓦片加载超时: ${z}/${x}/${y} - ${url}`);
          resolve(false);
        }, 8000); // 8秒超时
        
        this.loader.load(
          url,
          (texture) => {
            clearTimeout(timeoutId);
            
            // 配置纹理
            texture.flipY = false;
            texture.wrapS = THREE.ClampToEdgeWrapping;
            texture.wrapT = THREE.ClampToEdgeWrapping;
            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;

            // 应用到材质
            const material = mesh.material as THREE.MeshBasicMaterial;
            material.map = texture;
            material.color.setHex(0xffffff); // 白色以显示真实纹理
            material.needsUpdate = true;

            console.log(`✅ 瓦片加载成功: ${z}/${x}/${y} (尝试 ${i + 1})`);
            resolve(true);
          },
          undefined, // progress callback
          (error) => {
            clearTimeout(timeoutId);
            console.warn(`⚠️ 瓦片加载失败: ${z}/${x}/${y} (尝试 ${i + 1})`, error);
            resolve(false);
          }
        );
      });
      
      if (success) {
        return true;
      }
    }
    
    // 所有URL都失败了，显示错误颜色
    console.error(`❌ 所有URL都失败: ${z}/${x}/${y}`);
    const material = mesh.material as THREE.MeshBasicMaterial;
    material.color.setHex(0xff6666); // 红色表示加载失败
    material.needsUpdate = true;
    
    return false;
  }

  /**
   * 立即加载可见瓦片 - 确保真的能看到瓦片！
   */
  public async loadVisibleTiles(): Promise<void> {
    console.log('🚀 SimpleTileRenderer: 开始加载可见瓦片...');
    console.log(`📍 地图中心: ${this.centerCoord.lat}, ${this.centerCoord.lng}`);
    console.log(`🔍 缩放级别: ${this.currentZoom}`);
    
    // 清除现有瓦片
    this.clearAllTiles();
    
    // 计算中心瓦片
    const centerTile = this.lngLatToTile(this.centerCoord.lng, this.centerCoord.lat, this.currentZoom);
    console.log(`📍 中心瓦片: ${centerTile.z}/${centerTile.x}/${centerTile.y}`);
    
    // 首先创建一个明显的彩色瓦片作为基底，确保有东西显示
    this.createFallbackTiles(centerTile);
    
    // 加载3x3网格的瓦片
    const radius = 1; // 3x3 = (2*1+1)²
    const loadPromises: Promise<boolean>[] = [];
    let totalTiles = 0;
    
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const tileX = centerTile.x + dx;
        const tileY = centerTile.y + dy;
        const tileZ = centerTile.z;
        
        // 检查瓦片边界
        const maxTile = Math.pow(2, tileZ) - 1;
        if (tileX < 0 || tileX > maxTile || tileY < 0 || tileY > maxTile) {
          continue;
        }
        
        const tileKey = `${tileZ}_${tileX}_${tileY}`;
        const worldPos = this.tileToWorldPosition(tileX, tileY, centerTile);
        
        // 创建瓦片网格
        const mesh = this.createTileMesh(worldPos);
        this.tiles.set(tileKey, mesh);
        this.scene.add(mesh);
        
        console.log(`🎯 创建瓦片 ${tileKey} 在位置 (${worldPos.x}, ${worldPos.y}, ${worldPos.z})`);
        
        // 异步加载纹理
        loadPromises.push(this.loadTileTexture(mesh, tileX, tileY, tileZ));
        totalTiles++;
      }
    }
    
    console.log(`📊 总共创建 ${totalTiles} 个瓦片`);
    
    // 等待所有瓦片加载完成
    try {
      const results = await Promise.all(loadPromises);
      const successCount = results.filter(success => success).length;
      
      console.log(`✅ 瓦片加载完成: ${successCount}/${totalTiles} 成功`);
      
      if (successCount === 0) {
        console.error('❌ 所有瓦片都加载失败！显示备用地图');
        this.showColorfulFallback();
      } else {
        console.log('🎉 至少有部分瓦片加载成功，地图应该可见了！');
      }
      
      // 强制触发一次渲染
      this.renderer.render(this.scene, this.camera);
      
    } catch (error) {
      console.error('❌ 瓦片加载过程中出现错误:', error);
      this.showErrorMessage();
    }
    
    // 强制重新渲染
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * 显示错误信息瓦片
   */
  private showErrorMessage(): void {
    // 创建一个包含错误信息的纹理
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    
    // 绘制错误信息
    ctx.fillStyle = '#ff4444';
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('瓦片加载失败', 128, 100);
    ctx.fillText('检查网络连接', 128, 130);
    ctx.fillText('或防火墙设置', 128, 160);
    
    const texture = new THREE.CanvasTexture(canvas);
    
    // 应用到所有瓦片
    this.tiles.forEach(mesh => {
      const material = mesh.material as THREE.MeshBasicMaterial;
      material.map = texture;
      material.color.setHex(0xffffff);
      material.needsUpdate = true;
    });
  }

  /**
   * 切换地图样式
   */
  public async setMapStyle(style: keyof typeof this.TILE_URLS): Promise<void> {
    console.log(`🎨 切换地图样式: ${style}`);
    this.currentStyle = style;
    
    // 重新加载所有瓦片
    const reloadPromises: Promise<boolean>[] = [];
    
    this.tiles.forEach((mesh, tileKey) => {
      const [z, x, y] = tileKey.split('_').map(Number);
      reloadPromises.push(this.loadTileTexture(mesh, x, y, z));
    });
    
    if (reloadPromises.length > 0) {
      try {
        const results = await Promise.all(reloadPromises);
        const successCount = results.filter(success => success).length;
        console.log(`✅ ${style}样式加载完成: ${successCount}/${results.length} 成功`);
      } catch (error) {
        console.error(`❌ ${style}样式加载失败:`, error);
      }
    }
  }

  /**
   * 设置地图中心
   */
  public setCenter(lat: number, lng: number): void {
    console.log(`📍 设置地图中心: ${lat}, ${lng}`);
    this.centerCoord = { lat, lng };
  }

  /**
   * 设置缩放级别
   */
  public setZoom(zoom: number): void {
    console.log(`🔍 设置缩放级别: ${zoom}`);
    this.currentZoom = Math.max(1, Math.min(18, zoom));
  }

  /**
   * 清除所有瓦片
   */
  public clearAllTiles(): void {
    console.log('🗑️ 清除所有瓦片');
    
    this.tiles.forEach((mesh) => {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      
      const material = mesh.material as THREE.MeshBasicMaterial;
      if (material.map) {
        material.map.dispose();
      }
      material.dispose();
    });
    
    this.tiles.clear();
  }

  /**
   * 获取瓦片统计信息
   */
  public getTileStats(): { total: number; loaded: number } {
    let loaded = 0;
    
    this.tiles.forEach((mesh) => {
      const material = mesh.material as THREE.MeshBasicMaterial;
      if (material.map) {
        loaded++;
      }
    });
    
    return {
      total: this.tiles.size,
      loaded
    };
  }

  /**
   * 销毁渲染器
   */
  public dispose(): void {
    console.log('🗑️ SimpleTileRenderer 销毁');
    this.clearAllTiles();
  }
}

export default SimpleTileRenderer;