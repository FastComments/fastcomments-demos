#!/usr/bin/env node
// Static demo: no bundler, just stage the page and its assets into dist/.
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const DIST = resolve(ROOT, 'dist');
const ENTRIES = ['index.html', 'goal.css', 'demo.js', 'assets'];

rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });
for (const entry of ENTRIES) {
    cpSync(resolve(ROOT, entry), resolve(DIST, entry), { recursive: true });
}
console.log(`Staged ${ENTRIES.length} entries into dist/`);
