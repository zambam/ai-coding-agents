/**
 * Sandbox Test Runner
 * 
 * Simulates client installation in temp directory using npm pack.
 * Cross-platform (Node.js, not bash).
 * Logs all steps for verification.
 * 
 * Usage: npx tsx scripts/sandbox-test.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  output: string;
  error?: string;
}

const SANDBOX_DIR = `/tmp/ai-agents-sandbox-${Date.now()}`;
const LOG_FILE = `${SANDBOX_DIR}/test.log`;
const RESULTS_FILE = `${SANDBOX_DIR}/results.json`;
const RESULTS: TestResult[] = [];

function log(msg: string) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${msg}`;
  console.log(line);
  if (fs.existsSync(path.dirname(LOG_FILE))) {
    fs.appendFileSync(LOG_FILE, line + '\n');
  }
}

function runTest(name: string, fn: () => string): TestResult {
  const start = Date.now();
  try {
    const output = fn();
    const result: TestResult = {
      name,
      passed: true,
      duration: Date.now() - start,
      output
    };
    RESULTS.push(result);
    log(`[PASS] ${name} (${result.duration}ms)`);
    return result;
  } catch (error) {
    const result: TestResult = {
      name,
      passed: false,
      duration: Date.now() - start,
      output: '',
      error: error instanceof Error ? error.message : String(error)
    };
    RESULTS.push(result);
    log(`[FAIL] ${name}: ${result.error}`);
    return result;
  }
}

function exec(cmd: string, cwd?: string): string {
  return execSync(cmd, { 
    cwd: cwd || process.cwd(),
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe']
  });
}

async function main() {
  const scriptDir = path.dirname(new URL(import.meta.url).pathname);
  const pkgDir = path.resolve(scriptDir, '..', 'npm-package');
  
  log('=== AI Agents Sandbox Test ===');
  log(`Package dir: ${pkgDir}`);
  log(`Sandbox dir: ${SANDBOX_DIR}`);
  
  fs.mkdirSync(SANDBOX_DIR, { recursive: true });
  
  // Test 1: Build package
  runTest('Build package', () => {
    return exec('npm run build:package', pkgDir);
  });
  
  // Test 2: Create tarball
  let tgzPath = '';
  runTest('Pack package', () => {
    exec('npm pack', pkgDir);
    const files = fs.readdirSync(pkgDir).filter(f => f.endsWith('.tgz'));
    if (files.length === 0) throw new Error('No .tgz file created');
    tgzPath = path.join(pkgDir, files[files.length - 1]);
    return `Created: ${tgzPath}`;
  });
  
  // Test 3: Init sandbox project
  runTest('Init sandbox project', () => {
    exec('npm init -y', SANDBOX_DIR);
    return fs.readFileSync(path.join(SANDBOX_DIR, 'package.json'), 'utf-8');
  });
  
  // Test 4: Install from tarball
  runTest('Install package', () => {
    return exec(`npm install ${tgzPath}`, SANDBOX_DIR);
  });
  
  // Test 5: CLI help works
  runTest('CLI help', () => {
    return exec('npx ai-agents help', SANDBOX_DIR);
  });
  
  // Test 6: Init creates config (with --write-storage)
  runTest('Init command with --write-storage', () => {
    return exec('npx ai-agents init --framework express --orm drizzle --hub-url http://localhost:5000 --write-storage', SANDBOX_DIR);
  });
  
  // Test 7: Config file exists
  runTest('Config file created', () => {
    const configPath = path.join(SANDBOX_DIR, '.ai-agents.json');
    if (!fs.existsSync(configPath)) throw new Error('File not found');
    const content = fs.readFileSync(configPath, 'utf-8');
    JSON.parse(content); // Validate JSON
    return content;
  });
  
  // Test 8: Wrapper script exists and executable
  runTest('Wrapper script created', () => {
    const scriptPath = path.join(SANDBOX_DIR, 'scripts', 'ai-agents.sh');
    if (!fs.existsSync(scriptPath)) throw new Error('File not found');
    // Check executable bit
    try {
      fs.accessSync(scriptPath, fs.constants.X_OK);
    } catch {
      throw new Error('Script not executable');
    }
    return fs.readFileSync(scriptPath, 'utf-8');
  });
  
  // Test 9: Storage file created (from --write-storage)
  runTest('Storage adapter created', () => {
    const storagePath = path.join(SANDBOX_DIR, 'server', 'agent-storage.ts');
    if (!fs.existsSync(storagePath)) throw new Error('File not found');
    const content = fs.readFileSync(storagePath, 'utf-8');
    if (!content.includes('IAgentStorage')) throw new Error('Missing IAgentStorage');
    if (!content.includes('TODO')) throw new Error('Missing TODO comment');
    return `File exists with IAgentStorage implementation (${content.length} chars)`;
  });
  
  // Test 10: Hooks status works
  runTest('Hooks status', () => {
    // Init git repo first
    exec('git init', SANDBOX_DIR);
    return exec('npx ai-agents hooks status', SANDBOX_DIR);
  });
  
  // Test 11: Verify command works (offline)
  runTest('Verify command (offline)', () => {
    return exec('npx ai-agents verify --offline', SANDBOX_DIR);
  });
  
  // Test 12: Main exports resolve (without optional peer deps) - ESM only
  runTest('Export resolution', () => {
    const testScript = `
      // Test main exports work without express/drizzle (ESM package)
      const pkg = await import('ai-coding-agents');
      console.log('Main exports:', Object.keys(pkg).length);
      
      // Verify core exports exist
      const required = ['Orchestrator', 'Architect', 'Mechanic', 'CodeNinja', 'Philosopher', 
        'logger', 'AgentError', 'validateResponse', 'FakeDataScanner', 'initProject'];
      const missing = required.filter(k => !pkg[k]);
      if (missing.length) throw new Error('Missing exports: ' + missing.join(', '));
      
      console.log('All core exports present');
    `;
    fs.writeFileSync(path.join(SANDBOX_DIR, 'test-exports.mjs'), testScript);
    return exec('node test-exports.mjs', SANDBOX_DIR);
  });
  
  // Summary
  log('\n=== Test Summary ===');
  const passed = RESULTS.filter(r => r.passed).length;
  const failed = RESULTS.filter(r => !r.passed).length;
  log(`Passed: ${passed}/${RESULTS.length}`);
  log(`Failed: ${failed}/${RESULTS.length}`);
  
  if (failed > 0) {
    log('\nFailed tests:');
    RESULTS.filter(r => !r.passed).forEach(r => {
      log(`  - ${r.name}: ${r.error}`);
    });
  }
  
  // Write full results
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(RESULTS, null, 2));
  log(`\nFull results: ${RESULTS_FILE}`);
  log(`Full log: ${LOG_FILE}`);
  
  // Cleanup tarball (but keep sandbox for inspection)
  if (tgzPath && fs.existsSync(tgzPath)) {
    fs.unlinkSync(tgzPath);
    log(`Cleaned up tarball: ${tgzPath}`);
  }
  
  log(`\nSandbox preserved at: ${SANDBOX_DIR}`);
  log('Run `rm -rf ' + SANDBOX_DIR + '` to clean up');
  
  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
