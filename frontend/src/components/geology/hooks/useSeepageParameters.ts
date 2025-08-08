import { useState, useCallback } from 'react';

export interface SeepagePoint {
  key: string;
  id: string;
  x: number;
  y: number;
  elevation: number;
  waterHead: number;
  boundaryType: 'constant_head' | 'specified_flux' | 'seepage_face' | 'impermeable';
  layerName: string;
  permeability: number;
  wellType: 'pumping' | 'injection' | 'observation' | null;
  isActive: boolean;
  notes?: string;
}

interface UseSeepageParametersOptions {
  initial?: SeepagePoint[];
}

export function useSeepageParameters(options: UseSeepageParametersOptions = {}) {
  const [points, setPoints] = useState<SeepagePoint[]>(() => options.initial || []);

  const addPoint = useCallback((partial?: Partial<SeepagePoint>) => {
    setPoints(prev => {
      const idx = prev.length + 1;
      const point: SeepagePoint = {
        key: `${Date.now()}_${idx}`,
        id: partial?.id || `WH${idx.toString().padStart(3,'0')}`,
        x: partial?.x ?? 0,
        y: partial?.y ?? 0,
        elevation: partial?.elevation ?? 0,
        waterHead: partial?.waterHead ?? 0,
        boundaryType: partial?.boundaryType || 'constant_head',
        layerName: partial?.layerName || '粘土层',
        permeability: partial?.permeability ?? 1e-6,
        wellType: partial?.wellType ?? null,
        isActive: partial?.isActive ?? true,
        notes: partial?.notes || ''
      };
      return [...prev, point];
    });
  }, []);

  const updatePoint = useCallback((key: string, patch: Partial<SeepagePoint>) => {
    setPoints(prev => prev.map(p => p.key === key ? { ...p, ...patch } : p));
  }, []);

  const removePoint = useCallback((key: string) => {
    setPoints(prev => prev.filter(p => p.key !== key));
  }, []);

  const bulkImport = useCallback((rows: SeepagePoint[]) => {
    setPoints(rows.map((r, i) => ({ ...r, key: r.key || `${Date.now()}_${i}` })));
  }, []);

  const reset = useCallback(() => setPoints([]), []);

  return { points, addPoint, updatePoint, removePoint, bulkImport, reset };
}
