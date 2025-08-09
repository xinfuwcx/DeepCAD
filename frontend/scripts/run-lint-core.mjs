#!/usr/bin/env node
/**
 * Flexible core lint runner.
 * Usage examples:
 *  node scripts/run-lint-core.mjs                -> default target set
 *  node scripts/run-lint-core.mjs "src/components/**/*.tsx" "src/utils/**/*.ts"
 *  LINT_CORE_TARGETS="src/components/ProfessionalViewport3D.tsx,src/utils/performanceMonitor.ts" node scripts/run-lint-core.mjs
 *  Config file: create lint-core.config.json with { "globs": ["src/components/ProfessionalViewport3D.tsx"] }
 */
import { spawn } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(process.cwd());

function parseConfig() {
  const cfgPath = path.join(repoRoot, 'lint-core.config.json');
  if (existsSync(cfgPath)) {
    try { return JSON.parse(readFileSync(cfgPath, 'utf8')); } catch { /* noop */ }
  }
  return null;
}

const argsFromCLI = process.argv.slice(2).filter(Boolean);
const envTargets = process.env.LINT_CORE_TARGETS?.split(/[,;]+/).filter(Boolean) || [];
const cfg = parseConfig();
const cfgTargets = cfg?.globs || [];

let targets = [];
if (argsFromCLI.length) targets = argsFromCLI;
else if (envTargets.length) targets = envTargets;
else if (cfgTargets.length) targets = cfgTargets;
else targets = [
  'src/components/ProfessionalViewport3D.tsx',
  'src/utils/performanceMonitor.ts',
  'src/services/advancedPostprocessing.ts'
];

const eslintArgs = ['eslint', ...targets, '--ext', 'ts,tsx'];
console.log('🧹 Running core lint on targets:', targets.join(', '));

const proc = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', eslintArgs, { stdio: 'inherit' });
proc.on('close', code => process.exit(code));
