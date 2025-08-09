// geologyReconstructionApi.ts
// Mockable API layer for geology reconstruction preview & commit.
// Later replace mock with real fetch endpoints.

export interface GeologyPreviewRequest {
  hash: string;
  domain: any; // DomainState snapshot
  boreholes: any[];
  waterHead: any;
  options?: { roiEnabled?: boolean; fallbackPolicy?: 'allow' | 'deny' };
}
export interface GeologyPreviewResponse {
  hash: string;
  quality: { rmseZ: number; rmseH: number; grade: string };
  fallback: boolean;            // server decided fallback
  roiAdjusted?: any;            // optional adjusted domain
  serverCost?: { memMB: number; sec: number };
  source: 'mock' | 'server';
}

// Grade helper
function gradeFrom(rmse: number){
  return rmse < 0.02 ? 'A' : rmse < 0.035 ? 'B' : rmse < 0.05 ? 'C' : 'D';
}

// Mock generator (deterministic by hash)
function mockPreview(req: GeologyPreviewRequest): GeologyPreviewResponse {
  // simple deterministic pseudo-random via hash chars
  const seed = parseInt(req.hash.slice(0,8),16) || 1;
  const scale = Math.cbrt((req.domain?.nx||60)*(req.domain?.ny||60)*(req.domain?.nz||60));
  const base = 0.015 + ((seed % 100) / 10000); // 0.015 ~ 0.025
  const rmseZ = Number((base + 0.5/scale).toFixed(4));
  const rmseH = Number((base + 0.4/scale).toFixed(4));
  const worst = Math.max(rmseZ, rmseH);
  const grade = gradeFrom(worst);
  const N = (req.domain?.nx||60)*(req.domain?.ny||60)*(req.domain?.nz||60);
  const softLimit = 300_000;
  const fallback = N > softLimit * 0.95; // mock server fallback trigger near upper range
  if (fallback && req.options?.fallbackPolicy === 'deny') {
    // 模拟服务器拒绝：需要回退但策略禁止
    throw new Error('Server requires fallback for this resolution (policy=deny)');
  }
  // ROI adjustment example: shrink if roiEnabled & near soft limit
  let roiAdjusted: any | undefined;
  if (req.options?.roiEnabled && N > softLimit*0.9) {
    const shrink = 0.9;
    roiAdjusted = { ...req.domain, nx: Math.round(req.domain.nx*shrink), ny: Math.round(req.domain.ny*shrink), nz: req.domain.nz };
  }
  return {
    hash: req.hash,
    quality: { rmseZ, rmseH, grade },
    fallback,
    roiAdjusted,
    serverCost: { memMB: N*32/1024/1024, sec: N*0.00005 },
    source: 'mock'
  };
}

export async function previewGeology(req: GeologyPreviewRequest, signal?: AbortSignal): Promise<GeologyPreviewResponse> {
  // Placeholder: simulate network latency
  await new Promise(r=>setTimeout(r, 420));
  return mockPreview(req);
}

export async function commitGeology(req: GeologyPreviewRequest, signal?: AbortSignal): Promise<GeologyPreviewResponse & { taskId: string }> {
  const base = await previewGeology(req, signal);
  return { ...base, taskId: 'TASK-'+base.hash.slice(0,6) };
}
