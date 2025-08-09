#!/usr/bin/env node
/**
 * 分析未使用符号/导入的快速脚本
 * 逻辑：
 * 1. 运行 tsc --noEmit 捕获输出
 * 2. 过滤 TS6133 / TS6192 / TS6196 / TS6198 等未使用相关代码
 * 3. 统计文件 -> 计数，列出前 50
 * 4. 给出建议：集中优先清理的文件
 */

import { spawn } from 'node:child_process';

function runTSC() {
  return new Promise((resolve) => {
    const proc = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['tsc', '--noEmit'], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '';
    proc.stdout.on('data', d => out += d.toString());
    proc.stderr.on('data', d => err += d.toString());
    proc.on('close', code => resolve({ code, text: out + err }));
  });
}

function parse(text) {
  const lines = text.split(/\r?\n/);
  const unusedCodes = new Set(['TS6133','TS6192','TS6196','TS6198']);
  const fileStats = new Map();
  for (const line of lines) {
    // vite ts 输出格式: path(line,col) - error TSXXXX:
    const m = line.match(/^(.*\.tsx?):(\d+):(\d+) - error (TS\d+): (.*)$/);
    if (!m) continue;
    const [, file, , , code, message] = m;
    if (unusedCodes.has(code)) {
      const stat = fileStats.get(file) || { count: 0, samples: [] };
      stat.count++;
      if (stat.samples.length < 3) stat.samples.push(message.slice(0,140));
      fileStats.set(file, stat);
    }
  }
  return [...fileStats.entries()].sort((a,b)=>b[1].count - a[1].count).slice(0,50);
}

function format(results) {
  if (!results.length) return '✅ 未使用符号相关错误极少或已清理';
  const lines = [];
  lines.push('--- 未使用符号/导入 Top 文件 (前 50) ---');
  for (const [file, stat] of results) {
    lines.push(`${stat.count.toString().padStart(4,' ')}  ${file}`);
    stat.samples.forEach(s => lines.push('      • ' + s));
  }
  lines.push('\n建议：优先处理靠前文件，批量删除未使用导入/变量/形参，或在特定生成文件上临时关闭 noUnusedLocals。');
  return lines.join('\n');
}

function toJson(results) {
  return JSON.stringify({ generatedAt: new Date().toISOString(), totalFiles: results.length, items: results.map(([file, stat]) => ({ file, count: stat.count, samples: stat.samples })) }, null, 2);
}

(async () => {
  const args = process.argv.slice(2);
  const jsonMode = args.includes('--json');
  const failIfIdx = args.findIndex(a => a === '--fail-if');
  let failThreshold = null;
  if (failIfIdx !== -1 && args[failIfIdx + 1]) {
    const v = parseInt(args[failIfIdx + 1], 10);
    if (!Number.isNaN(v)) failThreshold = v;
  }
  console.log('🔍 收集 TypeScript 未使用符号信息...');
  const { text } = await runTSC();
  const results = parse(text);
  if (jsonMode) {
    console.log(toJson(results));
  } else {
    console.log(format(results));
  }
  if (failThreshold != null) {
    const totalIssues = results.reduce((acc, [, stat]) => acc + stat.count, 0);
    if (totalIssues > failThreshold) {
      console.error(`❌ 未使用问题数量 ${totalIssues} 超过阈值 ${failThreshold}`);
      process.exit(2);
    } else {
      console.log(`✅ 未使用问题数量 ${totalIssues} 未超过阈值 ${failThreshold}`);
    }
  }
})();
