#!/usr/bin/env npx tsx
/**
 * Prepare GitHub Package
 * 
 * This script creates a clean directory with only the files needed for
 * the NPM package. You can then push this to GitHub for installation.
 * 
 * Usage:
 *   npx tsx scripts/prepare-github-package.ts
 * 
 * Output:
 *   Creates ./npm-package/ directory with:
 *   - package.json (from package.npm.json, with adjusted paths)
 *   - dist/           (compiled TypeScript)
 *   - templates/      (GitHub Action templates, etc.)
 *   - README.md       (from README.npm.md)
 *   - LICENSE
 * 
 * After running, you can:
 *   cd npm-package
 *   git init
 *   git add .
 *   git commit -m "Initial package release"
 *   git remote add origin git@github.com:YOUR_USERNAME/ai-coding-agents.git
 *   git push -u origin main
 */

import { execSync } from 'child_process';
import { 
  copyFileSync, 
  mkdirSync, 
  existsSync, 
  readFileSync, 
  writeFileSync, 
  cpSync,
  rmSync
} from 'fs';
import { join } from 'path';

function run(cmd: string) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });
}

async function main() {
  const root = process.cwd();
  const outputDir = join(root, 'npm-package');
  const distDir = join(root, 'dist');
  
  console.log('\n=== Preparing GitHub NPM Package ===\n');
  
  // Step 1: Build TypeScript
  console.log('1. Building TypeScript...');
  run('npx tsc -p tsconfig.package.json');
  
  // Verify dist exists
  if (!existsSync(distDir)) {
    console.error('Error: dist/ directory not found after build');
    process.exit(1);
  }
  
  // Step 2: Create clean output directory
  console.log('2. Creating clean output directory...');
  if (existsSync(outputDir)) {
    rmSync(outputDir, { recursive: true });
  }
  mkdirSync(outputDir, { recursive: true });
  
  // Step 3: Copy dist/
  console.log('3. Copying dist/ folder...');
  cpSync(distDir, join(outputDir, 'dist'), { recursive: true });
  
  // Step 4: Add shebang to CLI
  console.log('4. Adding shebang to CLI...');
  const cliPath = join(outputDir, 'dist', 'cli.js');
  if (existsSync(cliPath)) {
    const cliContent = readFileSync(cliPath, 'utf-8');
    if (!cliContent.startsWith('#!/usr/bin/env node')) {
      writeFileSync(cliPath, `#!/usr/bin/env node\n${cliContent}`);
    }
  }
  
  // Step 5: Create package.json
  console.log('5. Creating package.json...');
  const npmPackage = JSON.parse(readFileSync(join(root, 'package.npm.json'), 'utf-8'));
  
  // Update paths to point to dist/
  npmPackage.main = './dist/index.js';
  npmPackage.module = './dist/index.js';
  npmPackage.types = './dist/index.d.ts';
  npmPackage.bin = {
    'ai-agents': './dist/cli.js'
  };
  npmPackage.exports = {
    '.': {
      import: './dist/index.js',
      types: './dist/index.d.ts'
    },
    './agents': {
      import: './dist/agents/index.js',
      types: './dist/agents/index.d.ts'
    },
    './scanner': {
      import: './dist/scanner.js',
      types: './dist/scanner.d.ts'
    }
  };
  npmPackage.files = [
    'dist',
    'templates'
  ];
  
  // Add runtime dependencies
  npmPackage.dependencies = {
    'openai': '^6.15.0',
    'pino': '^10.1.0',
    'zod': '^3.25.0',
    'zod-validation-error': '^3.5.0'
  };
  
  writeFileSync(
    join(outputDir, 'package.json'), 
    JSON.stringify(npmPackage, null, 2)
  );
  
  // Step 6: Copy README
  console.log('6. Copying README...');
  if (existsSync(join(root, 'README.npm.md'))) {
    copyFileSync(join(root, 'README.npm.md'), join(outputDir, 'README.md'));
  }
  
  // Step 7: Copy templates/
  console.log('7. Copying templates...');
  const templatesDir = join(root, 'templates');
  if (existsSync(templatesDir)) {
    cpSync(templatesDir, join(outputDir, 'templates'), { recursive: true });
  }
  
  // Step 8: Create LICENSE
  console.log('8. Creating LICENSE...');
  writeFileSync(join(outputDir, 'LICENSE'), `MIT License

Copyright (c) 2026 AI Coding Agents

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`);
  
  // Step 9: Create .gitignore
  console.log('9. Creating .gitignore...');
  writeFileSync(join(outputDir, '.gitignore'), `node_modules/
*.log
.env
.env.*
`);
  
  // Summary
  console.log('\n=== Package Ready ===\n');
  console.log(`Output directory: ${outputDir}`);
  console.log('\nContents:');
  run(`ls -la ${outputDir}`);
  
  console.log('\n--- Next Steps ---');
  console.log('1. cd npm-package');
  console.log('2. git init');
  console.log('3. git add .');
  console.log('4. git commit -m "v1.0.0 - Initial release"');
  console.log('5. git remote add origin git@github.com:YOUR_USERNAME/ai-coding-agents.git');
  console.log('6. git push -f origin main');
  console.log('\nOr replace contents of existing repo:');
  console.log('1. Delete all files in your GitHub repo (except .git)');
  console.log('2. Copy contents of npm-package/ to your repo');
  console.log('3. git add . && git commit -m "Clean NPM package" && git push');
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
