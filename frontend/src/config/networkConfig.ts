// Global network configuration for geology/GemPy requests
// Can be adjusted at runtime by UI.

export interface GeologyApiConfig {
  timeoutMs: number;       // per attempt timeout
  retries: number;         // number of retry attempts AFTER first try
  retryDelayMs: number;    // base delay for exponential backoff
}

const DEFAULT_CONFIG: GeologyApiConfig = {
  timeoutMs: 20000,
  retries: 2,
  retryDelayMs: 700
};

function loadPersisted(): GeologyApiConfig {
  if (typeof window === 'undefined') return { ...DEFAULT_CONFIG };
  try {
    const raw = localStorage.getItem('geologyApiConfig');
    if (!raw) return { ...DEFAULT_CONFIG };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch { return { ...DEFAULT_CONFIG }; }
}

export const geologyApiConfig: GeologyApiConfig = loadPersisted();

export function updateGeologyApiConfig(partial: Partial<GeologyApiConfig>){
  if(partial.timeoutMs !== undefined) geologyApiConfig.timeoutMs = partial.timeoutMs;
  if(partial.retries !== undefined) geologyApiConfig.retries = partial.retries;
  if(partial.retryDelayMs !== undefined) geologyApiConfig.retryDelayMs = partial.retryDelayMs;
  try { if (typeof window !== 'undefined') localStorage.setItem('geologyApiConfig', JSON.stringify(geologyApiConfig)); } catch {}
}
