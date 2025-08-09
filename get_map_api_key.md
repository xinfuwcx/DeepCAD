# 🗺️ 地图API密钥申请指南

## 高德地图API密钥申请

### 1. 注册高德开发者账号
- 访问：https://lbs.amap.com/
- 点击"注册"创建开发者账号
- 完成实名认证

### 2. 创建应用
- 登录控制台：https://console.amap.com/
- 点击"应用管理" → "我的应用"
- 点击"创建新应用"

### 3. 添加Key
- 在应用中点击"添加Key"
- **Key名称**: DeepCAD地图服务
- **服务平台**: Web端(JS API)
- **域名白名单**: 
  - localhost
  - 127.0.0.1
  - file://
  - 你的实际域名

### 4. 配置权限
确保勾选以下服务：
- [x] Web服务API
- [x] Web端(JS API 2.0)
- [x] 3D地图
- [x] 卫星图
- [x] 路况信息

## 免费替代方案

### OpenStreetMap (推荐)
- ✅ 完全免费
- ✅ 无API限制
- ✅ 开源数据
- ❌ 中国地区数据较少

### Mapbox (备选)
- ✅ 每月50,000次免费调用
- ✅ 高质量地图
- ❌ 需要注册

### 百度地图API
- ✅ 国内服务稳定
- ✅ 免费配额较大
- ❌ 需要备案

## 配置方法

### 1. 创建环境变量文件
```bash
# .env.local
VITE_AMAP_API_KEY=你的高德地图密钥
VITE_MAPBOX_TOKEN=你的Mapbox令牌
VITE_BAIDU_API_KEY=你的百度地图密钥
```

### 2. 更新配置
```typescript
// 在组件中使用
const API_KEY = import.meta.env.VITE_AMAP_API_KEY;
if (!API_KEY) {
  console.warn('未配置地图API密钥，使用备用方案');
  // 降级到OSM或静态地图
}
```

## 密钥安全建议

1. **不要硬编码密钥** - 使用环境变量
2. **设置域名白名单** - 防止密钥被盗用
3. **监控使用量** - 避免超出配额
4. **定期轮换密钥** - 提高安全性

## 故障排除

### 常见错误码
- `INVALID_USER_KEY` - 密钥无效
- `QUOTA_EXCEEDED` - 配额超限
- `INVALID_REQUEST` - 请求参数错误
- `ACCESS_DENIED` - 域名不在白名单

### 调试方法
1. 检查浏览器控制台错误
2. 验证密钥是否正确
3. 确认域名白名单配置
4. 检查网络连接
