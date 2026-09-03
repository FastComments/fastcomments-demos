#!/usr/bin/env node
// Static demo: no bundler, just stage the page and its assets into dist/.
import { copyFileSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const DIST = resolve(ROOT, 'dist');
const FILES = ['index.html', 'widget.css', 'uploads.css', 'demo.js'];

rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });
for (const file of FILES) {
    copyFileSync(resolve(ROOT, file), resolve(DIST, file));
}
console.log(`Staged ${FILES.length} files into dist/`);
