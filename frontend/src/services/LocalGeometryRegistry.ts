export interface GeometryMappingEntry {
  uuid: string;
  entityId: string;
  geometryTag?: number;
  source: 'dxf' | 'extrude' | 'csg' | 'import' | 'other';
}

class LocalGeometryRegistry {
  private static _inst: LocalGeometryRegistry;
  private uuidToEntry = new Map<string, GeometryMappingEntry>();
  private entityToTag = new Map<string, number>();

  static getInstance() { return this._inst || (this._inst = new LocalGeometryRegistry()); }

  register(entry: GeometryMappingEntry) {
    this.uuidToEntry.set(entry.uuid, entry);
    if (entry.geometryTag != null) this.entityToTag.set(entry.entityId, entry.geometryTag);
  }
  updateGeometryTag(entityId: string, tag: number) {
    this.entityToTag.set(entityId, tag);
    for (const e of this.uuidToEntry.values()) if (e.entityId === entityId) e.geometryTag = tag;
  }
  getByUUID(uuid: string) { return this.uuidToEntry.get(uuid); }
  getEntityIdsByUUIDs(uuids: string[]) { return uuids.map(u => this.uuidToEntry.get(u)?.entityId).filter(Boolean) as string[]; }
  getGeometryTagByUUID(uuid: string) { const e = this.uuidToEntry.get(uuid); return e?.geometryTag; }
}

export const localGeometryRegistry = LocalGeometryRegistry.getInstance();
