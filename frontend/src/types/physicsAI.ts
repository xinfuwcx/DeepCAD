export interface OptimizationResult {
  iterationCount: number;
  objectiveValue: number;
  convergenceStatus: 'converged' | 'running' | 'failed';
  optimizedParameters: Record<string, number>;
  computationTime: number; // seconds
}
