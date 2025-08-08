// Mirror of deepcad-latest OpenMeteoService for current frontend build
export * from '../../deepcad-latest/frontend/src/services/OpenMeteoService';
// 重新导出默认实例，确保本地可 default import
import openMeteoServiceDefault, { openMeteoService as namedOpenMeteoService } from '../../deepcad-latest/frontend/src/services/OpenMeteoService';
export const openMeteoService = namedOpenMeteoService;
export default openMeteoServiceDefault;
