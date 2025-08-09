#!/usr/bin/env node
/**
 * 示例：展示如何按需动态加载地图 / Deck.gl 重型模块，减少主包体积。
 * 思路：在需要地图功能时再 import()，并可并行加载多个独立 chunk。
 */

async function loadMapModules() {
  const [maplibre, deckMapbox, deckLayers, deckAgg] = await Promise.all([
    import('maplibre-gl'),
    import('@deck.gl/mapbox'),
    import('@deck.gl/layers'),
    import('@deck.gl/aggregation-layers')
  ]);
  return { maplibre, deckMapbox, deckLayers, deckAgg };
}

export async function initLazyMap(container) {
  const { maplibre, deckMapbox } = await loadMapModules();
  const { Map } = maplibre.default || maplibre; // cjs/esm 兼容
  const { MapboxOverlay } = deckMapbox;

  const map = new Map({
    container,
    style: 'https://demotiles.maplibre.org/style.json',
    center: [0,0],
    zoom: 2
  });

  const overlay = new MapboxOverlay({ layers: [] });
  map.addControl(overlay);
  console.log('[lazy-map] ready');
  return { map, overlay };
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  console.log('此脚本为示例库，不直接运行浏览器逻辑。');
}
