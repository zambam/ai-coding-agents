#!/usr/bin/env npx tsx
/**
 * NPM Package Publish Script
 * 
 * This script prepares the package for NPM publishing by:
 * 1. Building the TypeScript source to dist/
 * 2. Copying package.npm.json to dist/package.json
 * 3. Copying README.npm.md and templates
 * 4. Publishing from dist/ directory
 * 
 * Usage:
 *   npx tsx scripts/publish-package.ts [--dry-run] [--skip-build]
 */

import { execSync } from 'child_process';
import { copyFileSync, mkdirSync, existsSync, readFileSync, writeFileSync, cpSync } from 'fs';
import { join } from 'path';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const skipBuild = args.includes('--skip-build');

function run(cmd: string, options?: { cwd?: string }) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: 'inherit', ...options });
}

async function main() {
  const root = process.cwd();
  const distDir = join(root, 'dist');
  
  console.log('\n📦 AI Coding Agents - NPM Package Publisher\n');
  
  // Step 1: Build TypeScript
  if (!skipBuild) {
    console.log('1. Building TypeScript source...');
    run('npx tsc -p tsconfig.package.json');
  } else {
    console.log('1. Skipping build (--skip-build)');
  }
  
  // Verify dist exists
  if (!existsSync(distDir)) {
    console.error('❌ dist/ directory not found. Run without --skip-build');
    process.exit(1);
  }
  
  // Step 2: Copy package.npm.json to dist/package.json
  console.log('2. Copying package.npm.json to dist/package.json...');
  const npmPackage = JSON.parse(readFileSync(join(root, 'package.npm.json'), 'utf-8'));
  
  // Update paths since we're publishing from dist/
  npmPackage.main = './index.js';
  npmPackage.types = './index.d.ts';
  npmPackage.exports = {
    '.': {
      import: './index.js',
      types: './index.d.ts'
    },
    './agents': {
      import: './agents/index.js',
      types: './agents/index.d.ts'
    },
    './scanner': {
      import: './scanner.js',
      types: './scanner.d.ts'
    }
  };
  npmPackage.bin = {
    'ai-agents': './cli.js'
  };
  npmPackage.files = [
    '**/*.js',
    '**/*.d.ts',
    'templates/**/*',
    'README.md'
  ];
  
  writeFileSync(join(distDir, 'package.json'), JSON.stringify(npmPackage, null, 2));
  
  // Step 3: Copy README
  console.log('3. Copying README.npm.md...');
  if (existsSync(join(root, 'README.npm.md'))) {
    copyFileSync(join(root, 'README.npm.md'), join(distDir, 'README.md'));
  }
  
  // Step 4: Copy templates directory
  console.log('4. Copying templates...');
  const templatesDir = join(root, 'templates');
  const distTemplatesDir = join(distDir, 'templates');
  if (existsSync(templatesDir)) {
    mkdirSync(distTemplatesDir, { recursive: true });
    cpSync(templatesDir, distTemplatesDir, { recursive: true });
  }
  
  // Step 5: Add shebang to CLI
  console.log('5. Adding shebang to CLI...');
  const cliPath = join(distDir, 'cli.js');
  if (existsSync(cliPath)) {
    const cliContent = readFileSync(cliPath, 'utf-8');
    if (!cliContent.startsWith('#!/usr/bin/env node')) {
      writeFileSync(cliPath, `#!/usr/bin/env node\n${cliContent}`);
    }
  }
  
  // Step 6: Show what will be published
  console.log('\n6. Package contents:');
  run('npm pack --dry-run', { cwd: distDir });
  
  // Step 7: Publish
  if (dryRun) {
    console.log('\n⚠️  Dry run mode - not publishing');
    console.log('To publish, run without --dry-run');
  } else {
    console.log('\n7. Publishing to NPM...');
    run('npm publish --access public', { cwd: distDir });
    console.log('\n✅ Published successfully!');
  }
}

main().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
