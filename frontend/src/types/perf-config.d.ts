// Global declaration for DeepCAD performance reporting configuration.
// Provides IntelliSense for runtime overrides set on window.__DEEPCAD_PERF_CONFIG__.

interface DeepCADPerfFlushConfig {
  intervalMs?: number;
  batchSize?: number;
  maxDelayMs?: number;
  baseBackoffMs?: number;
  backoffMultiplier?: number;
  maxBackoffMs?: number;
}

interface DeepCADPerfFeaturesConfig {
  network?: boolean;
  interactions?: boolean;
  threeStats?: boolean;
  memory?: boolean;
}

interface DeepCADPerfImmediateFlushConfig {
  visibilityHidden?: boolean;
  beforeUnload?: boolean;
  error?: boolean;
}

interface DeepCADPerfRuntimeConfig {
  flush?: DeepCADPerfFlushConfig;
  features?: DeepCADPerfFeaturesConfig;
  immediateFlushOn?: DeepCADPerfImmediateFlushConfig;
  maxQueue?: number;
}

interface Window {
  __DEEPCAD_PERF_ENDPOINT__?: string;
  __DEEPCAD_PERF_CONFIG__?: DeepCADPerfRuntimeConfig;
}

export {};
