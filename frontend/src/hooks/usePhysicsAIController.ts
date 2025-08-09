import { useCallback, useEffect, useRef, useState } from 'react';
import { PhysicsAIService, type MultiModalPhysicsAI } from '../services/PhysicsAIModuleInterface';
import type { OptimizationResult } from '../types/physicsAI';

export type PhysicsAIRunState = 'idle' | 'running' | 'completed' | 'error';

interface UsePhysicsAIControllerOptions {
  initialConfig?: MultiModalPhysicsAI;
}

export function usePhysicsAIController(opts: UsePhysicsAIControllerOptions = {}) {
  const serviceRef = useRef<PhysicsAIService | null>(null);
  const [runState, setRunState] = useState<PhysicsAIRunState>('idle');
  const [progress, setProgress] = useState(0);
  const [config, setConfig] = useState<MultiModalPhysicsAI>(opts.initialConfig || {
    systemConfig: {
      enabledModules: ['PINN'],
      fusionStrategy: 'ensemble',
      confidenceThreshold: 0.8,
      fallbackStrategy: 'pinn_only'
    },
    fusionWeights: { pinn: 1, deeponet: 0, gnn: 0, terra: 0 },
    qualityControl: {
      crossValidation: false,
      physicsConsistencyCheck: true,
      outlierDetection: false,
      uncertaintyQuantification: false
    }
  });
  const progressTimer = useRef<any>(null);
  const startTimeRef = useRef<number>(0);
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [trainingStats, setTrainingStats] = useState({
    epochs: [] as number[],
    totalLoss: [] as number[],
    physicsLoss: [] as number[],
    dataLoss: [] as number[],
    boundaryLoss: [] as number[]
  });

  // lazy init
  useEffect(() => {
    if (!serviceRef.current) {
      serviceRef.current = new PhysicsAIService();
    }
  }, []);

  const start = useCallback(async () => {
    if (runState === 'running') return;
  setRunState('running');
    setProgress(0);
  setOptimizationResult(null);
  setTrainingStats({ epochs: [], totalLoss: [], physicsLoss: [], dataLoss: [], boundaryLoss: [] });
  startTimeRef.current = performance.now();

    // fake progressive update (Phase 1 placeholder)
    progressTimer.current && clearInterval(progressTimer.current);
    progressTimer.current = setInterval(() => {
      setProgress(p => {
        // simulate loss append each tick
        setTrainingStats(prev => {
          const epoch = prev.epochs.length;
            // simple exponential decay with noise
          const decay = Math.exp(-epoch * 0.05);
          return {
            epochs: [...prev.epochs, epoch],
            totalLoss: [...prev.totalLoss, decay + Math.random()*0.02],
            physicsLoss: [...prev.physicsLoss, decay*0.7 + Math.random()*0.015],
            dataLoss: [...prev.dataLoss, decay*0.5 + Math.random()*0.01],
            boundaryLoss: [...prev.boundaryLoss, decay*0.3 + Math.random()*0.008]
          };
        });
        if (p >= 100) {
          clearInterval(progressTimer.current);
          const elapsed = (performance.now() - startTimeRef.current) / 1000;
          // mock result
          setOptimizationResult({
            iterationCount: 45,
            objectiveValue: 0.0012,
            convergenceStatus: 'converged',
            optimizedParameters: { E_soil: 18.5, phi: 28.2, c: 12.8 },
            computationTime: elapsed
          });
          setRunState('completed');
          return 100;
        }
        return p + 2;
      });
    }, 120);
  }, [runState]);

  const reset = useCallback(() => {
    progressTimer.current && clearInterval(progressTimer.current);
    setProgress(0);
    setRunState('idle');
    setOptimizationResult(null);
    setTrainingStats({ epochs: [], totalLoss: [], physicsLoss: [], dataLoss: [], boundaryLoss: [] });
  }, []);

  const updateConfig = useCallback(<K extends keyof MultiModalPhysicsAI>(key: K, value: MultiModalPhysicsAI[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  }, []);

  useEffect(() => () => { progressTimer.current && clearInterval(progressTimer.current); }, []);

  return { runState, progress, config, start, reset, updateConfig, optimizationResult, trainingStats };
}

export default usePhysicsAIController;
