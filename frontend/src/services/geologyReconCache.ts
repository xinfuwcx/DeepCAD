// geologyReconCache.ts
// Central cache manager for preview results keyed by hash.

export interface CacheEntry {
  hash: string;
  quality: { rmseZ:number; rmseH:number; grade:string };
  fallback: boolean;
  ts: number;
  roiAdjusted?: boolean;
  source: 'mock' | 'server';
  memMB?: number;
  sec?: number;
  fallbackPolicy?: 'allow' | 'deny';
  // 新增: 算法选择记录
  algorithm?: 'rbf' | 'kriging' | 'idw';
  algorithmParams?: any;
  // 新增: 配置快照 (用于回放 / Diff 进一步分析)
  domainSnapshot?: any;
  waterHeadSnapshot?: any;
  N?: number; // nx*ny*nz
  pinned?: boolean;
  // 新增: 域总体积 & 平均单元体积 (便于 Diff 导出)
  domainVolume?: number;
  avgCellVol?: number;
}

class GeologyReconCacheManager {
  private map = new Map<string, CacheEntry>();
  private maxEntries = 100; // FIFO policy
  private storageKey = 'geologyReconCacheV2';
  private baselineHash: string | null = null;

  get(hash: string){ return this.map.get(hash); }
  set(entry: CacheEntry){
    if (!this.map.has(entry.hash) && this.map.size >= this.maxEntries){
      // 先挑未 pinned 最老的
      const vals = [...this.map.values()].sort((a,b)=> a.ts-b.ts);
      const candidate = vals.find(v=> !v.pinned) || vals[0];
      if (candidate) this.map.delete(candidate.hash);
    }
    const prev = this.map.get(entry.hash);
    this.map.set(entry.hash, { ...prev, ...entry, pinned: prev?.pinned || entry.pinned });
    this.persist();
  }
  togglePin(hash:string){ const e=this.map.get(hash); if (e){ e.pinned=!e.pinned; this.map.set(hash, e);} }
  list(): CacheEntry[] { return [...this.map.values()].sort((a,b)=> b.ts - a.ts); }
  remove(hash:string){ this.map.delete(hash); this.persist(); }
  clear(){ this.map.clear(); this.persist(); }
  exportJson(){ return JSON.stringify({ version:2, exportedAt: new Date().toISOString(), entries: this.list() }, null, 2); }
  importJson(text:string){
    try {
      const obj = JSON.parse(text);
      if (!Array.isArray(obj.entries)) throw new Error('Invalid format');
      obj.entries.forEach((e:any)=>{ if (e.hash && e.quality) this.set({ ...e, ts: e.ts||Date.now() }); });
      this.persist();
      return { count: obj.entries.length };
    } catch (e:any){ return { error: e.message }; }
  }
  loadFromStorage(){
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(this.storageKey);
      if (!raw) return;
      const obj = JSON.parse(raw);
      if (Array.isArray(obj.entries)){
        this.map.clear();
        obj.entries.forEach((e:any)=>{ if(e.hash && e.quality) this.map.set(e.hash, e); });
      }
      if (obj.baselineHash) this.baselineHash = this.map.has(obj.baselineHash)? obj.baselineHash : null;
    } catch {}
  }
  persist(){
    if (typeof window === 'undefined') return;
    try {
      const payload = { version:2, entries: this.list(), baselineHash: this.baselineHash };
      window.localStorage.setItem(this.storageKey, JSON.stringify(payload));
    } catch {}
  }
  setBaseline(hash: string | null){
    if (hash && !this.map.has(hash)) return; // ignore invalid
    this.baselineHash = hash;
    this.persist();
  }
  getBaseline(){ return this.baselineHash; }
}

export const geologyReconCache = new GeologyReconCacheManager();
