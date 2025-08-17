#!/usr/bin/env node
import { promises as fs, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { performance } from 'node:perf_hooks';
import glob from 'fast-glob';
import retry from 'async-retry';
import { Pool } from 'tiny-pool';

// Node.js version check
const NODE_MAJOR = parseInt(process.versions.node.split('.')[0], 10);
if (NODE_MAJOR < 18) {
  console.error('❌ Requires Node.js v18+');
  process.exit(1);
}

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

// Configuration
const CONFIG = {
  projectRoot: path.join(__dirname, '../../..'),
  targetDir: path.join(__dirname, '../../..', 'packages/ui/dist/esm'),
  extensions: ['js', 'mjs'],
  concurrency: 20,
  retries: 3,
  dryRun: process.argv.includes('--dry-run'),
  help: process.argv.includes('--help')
};

// Show help if requested
if (CONFIG.help) {
  console.log(`
Usage: fix-esm-extensions [options]

Options:
  --dry-run  Show what would be changed without writing
  --help     Show this help message

Description:
  Automatically adds .js extensions to ESM imports in compiled files
  `);
  process.exit(0);
}

const IMPORT_EXPORT_REGEX = /(import\s+['"]|from\s+['"]|export\s+['"])(\.{1,2}\/[^'"]+)(?=['"])/g;

class ExtensionFixer {
  static shouldProcessPath(importPath, currentFile) {
    const hasExtension = path.extname(importPath) !== '';
    const isExternal = !importPath.startsWith('.');
    const isSpecial = ['.json', '.node'].some(ext => importPath.endsWith(ext));
    return !isExternal && !hasExtension && !isSpecial;
  }

  static transformImport(importPath, currentFile) {
    const absoluteBase = path.dirname(currentFile);
    const absoluteImportPath = path.resolve(absoluteBase, importPath);

    try {
      if (statSync(absoluteImportPath).isDirectory()) {
        return path.join(importPath, 'index.js');
      }
    } catch {
      // Not a directory or doesn't exist
    }

    return `${importPath}.js`;
  }

  static async processFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const relativePath = path.relative(CONFIG.projectRoot, filePath);

      if (!IMPORT_EXPORT_REGEX.test(content)) {
        return { skipped: true, file: relativePath };
      }

      const updated = content.replace(
        IMPORT_EXPORT_REGEX,
        (match, prefix, importPath) => {
          if (!this.shouldProcessPath(importPath, filePath)) return match;
          return `${prefix}${this.transformImport(importPath, filePath)}`;
        }
      );

      if (updated === content) {
        return { skipped: true, file: relativePath };
      }

      if (CONFIG.dryRun) {
        return { dryRun: true, file: relativePath, wouldUpdate: true };
      }

      await retry(
        () => fs.writeFile(filePath, updated),
        { retries: CONFIG.retries }
      );

      return { success: true, file: relativePath };
    } catch (error) {
      return {
        error: true,
        file: path.relative(CONFIG.projectRoot, filePath),
        message: error.message
      };
    }
  }
}

const main = async () => {
  const startTime = performance.now();

  try {
    // Verify package.json type
    const pkgPath = path.join(CONFIG.targetDir, 'package.json');
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf8'));
      if (pkg.type !== 'module') {
        console.error('❌ Target package.json must have "type": "module"');
        process.exit(1);
      }
    }

    const files = await glob([`**/*.{${CONFIG.extensions.join(',')}}`], {
      cwd: CONFIG.targetDir,
      absolute: true,
      ignore: [
        '**/*.d.ts',
        '**/node_modules/**',
        '**/package.json'
      ]
    });

    console.log(`🔍 Found ${files.length} files to process`);
    console.log(`⚙️  Mode: ${CONFIG.dryRun ? 'DRY RUN' : 'WRITE'}`);

    const pool = new Pool({
      concurrency: CONFIG.concurrency,
      task: ExtensionFixer.processFile.bind(ExtensionFixer)
    });

    const results = await Promise.all(files.map(file => pool.run(file)));
    const duration = ((performance.now() - startTime) / 1000).toFixed(2);

    const stats = results.reduce((acc, result) => {
      if (result.success) acc.updated++;
      if (result.dryRun && result.wouldUpdate) acc.dry++;
      if (result.skipped) acc.skipped++;
      if (result.error) acc.errors++;
      return acc;
    }, { updated: 0, dry: 0, skipped: 0, errors: 0 });

    console.log(`
✨ Extension Fix Report
━━━━━━━━━━━━━━━━━━━━━━
✅ Updated: ${stats.updated}
🕵️  Would update: ${stats.dry}
➖ Unchanged: ${stats.skipped}
${stats.errors ? `❌ Errors: ${stats.errors}` : '🎉 No errors!'}
⏱  Duration: ${duration}s
`);

    if (stats.errors) {
      const errorFiles = results.filter(r => r.error).map(r => `• ${r.file}: ${r.message}`);
      console.error('Failed files:\n' + errorFiles.join('\n'));
      process.exit(1);
    }

  } catch (error) {
    console.error('🚨 Critical failure:', error);
    process.exit(1);
  }
};

main();