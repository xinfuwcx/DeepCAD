/**
 * Unified dynamic loader for Deck.gl layer classes to avoid duplicate bundle inflations
 * and support lazy loading (especially HeatmapLayer from aggregation package).
 */
let deckLayersPromise: Promise<{ IconLayer: any; HeatmapLayer: any; MapboxOverlay: any; }> | null = null;

export async function getDeckLayers() {
  if (!deckLayersPromise) {
    deckLayersPromise = (async () => {
      const [layersMod, aggMod, mapboxMod] = await Promise.all([
        import('@deck.gl/layers'),
        import('@deck.gl/aggregation-layers'),
        import('@deck.gl/mapbox')
      ]);
      return {
        IconLayer: (layersMod as any).IconLayer,
        HeatmapLayer: (aggMod as any).HeatmapLayer,
        MapboxOverlay: (mapboxMod as any).MapboxOverlay
      };
    })();
  }
  return deckLayersPromise;
}

/** Convenience accessor when only HeatmapLayer is needed */
export async function getHeatmapLayerClass() {
  const { HeatmapLayer } = await getDeckLayers();
  return HeatmapLayer;
}
