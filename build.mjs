#!/usr/bin/env node
// Aggregator build for the fastcomments-demos deploy bundle.
// Clones each frontend integration repo, runs its build-demo.mjs, and
// stages the output at dist/<slug>/ so the fastcomments worker can serve
// each demo at /commenting-system-for-<slug>.
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, renameSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const BUILD = resolve(ROOT, 'build');
const DIST = resolve(ROOT, 'dist');

const LIBS = [
    { slug: 'react',    repo: 'fastcomments-react' },
    { slug: 'vue',      repo: 'fastcomments-vue-next' },
    { slug: 'angular',  repo: 'fastcomments-angular' },
    { slug: 'svelte',   repo: 'fastcomments-svelte' },
    { slug: 'astro',    repo: 'fastcomments-astro' },
    { slug: '11ty',     repo: 'fastcomments-11ty' },
    { slug: 'gatsby',   repo: 'fastcomments-gatsbyjs-example' },
    { slug: 'nextjs',   repo: 'fastcomments-nextjs' },
    { slug: 'solidjs',  repo: 'fastcomments-solidjs' },
    { slug: 'jekyll',   repo: 'fastcomments-jekyll' },
];

// Make every nested `npm ci` retry transient registry errors (ECONNRESET etc).
// Inherited by all child processes via env.
process.env.npm_config_fetch_retries = process.env.npm_config_fetch_retries || '5';
process.env.npm_config_fetch_retry_mintimeout = process.env.npm_config_fetch_retry_mintimeout || '10000';
process.env.npm_config_fetch_retry_maxtimeout = process.env.npm_config_fetch_retry_maxtimeout || '120000';

const sh = (cmd, cwd = ROOT) => {
    console.log('$', cmd, `(${cwd})`);
    execSync(cmd, { stdio: 'inherit', cwd });
};

// Clone source: defaults to the public github repo, but local mode
// (DEMOS_LOCAL_SOURCE_DIR) lets us reuse already-checked-out repos for
// fast iteration during development.
const localSourceDir = process.env.DEMOS_LOCAL_SOURCE_DIR;

rmSync(DIST, { recursive: true, force: true });
rmSync(BUILD, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });
mkdirSync(BUILD, { recursive: true });

const failures = [];

for (const { slug, repo } of LIBS) {
    console.log(`\n=== Building ${slug} (${repo}) ===`);
    const cloneDir = resolve(BUILD, repo);
    try {
        if (localSourceDir) {
            sh(`cp -r ${resolve(localSourceDir, repo)} ${cloneDir}`);
        } else {
            sh(`git clone --depth 1 git@github.com:FastComments/${repo}.git ${cloneDir}`);
        }
        sh('node build-demo.mjs', cloneDir);

        const out = resolve(cloneDir, 'demo-dist');
        if (!existsSync(out)) throw new Error(`${repo} did not produce demo-dist/`);
        renameSync(out, resolve(DIST, slug));
        console.log(`✓ Staged dist/${slug}`);
    } catch (err) {
        console.error(`✗ ${slug} failed:`, err.message);
        failures.push(slug);
    }
}

if (failures.length) {
    console.error(`\n${failures.length} demo(s) failed: ${failures.join(', ')}`);
    process.exit(1);
}
console.log('\nAll demos built into dist/.');
