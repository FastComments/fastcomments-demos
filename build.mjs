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
    { slug: 'react-native', repo: 'fastcomments-react-native-sdk' },
    { slug: 'vue',      repo: 'fastcomments-vue-next' },
    { slug: 'angular',  repo: 'fastcomments-angular' },
    { slug: 'svelte',   repo: 'fastcomments-svelte' },
    { slug: 'astro',    repo: 'fastcomments-astro' },
    { slug: '11ty',     repo: 'fastcomments-11ty' },
    { slug: 'gatsby',   repo: 'fastcomments-gatsbyjs-example' },
    { slug: 'nextjs',   repo: 'fastcomments-nextjs' },
    { slug: 'solidjs',  repo: 'fastcomments-solidjs' },
    { slug: 'jekyll',   repo: 'fastcomments-jekyll' },
    { slug: 'hugo',     repo: 'fastcomments-hugo' },
];

// Ad-hoc demos served at fastcomments.com/tmp_demos/<slug>. Source lives in
// tmp_demos/<slug>/ in THIS repo (a vite app whose `npm run build` emits
// dist/). `deps` are repos cloned into build/ as siblings before the demo
// builds; `ref` pins a branch until it merges; `prepare` runs once per dep.
// The worker statically mounts dist/tmp_demos/, so adding an entry here is
// the ONLY step to ship a new demo.
const TMP_DEMOS = [
    {
        slug: 'idcollab',
        deps: [
            { repo: 'fastcomments-sdk-js', ref: 'main', prepare: 'npm ci --ignore-scripts && npm run compile' },
            { repo: 'fastcomments-react-native-sdk', ref: 'main', prepare: 'npm install --install-links --legacy-peer-deps' },
        ],
    },
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

// DEMOS_FILTER=idcollab (comma-separated slugs) builds a subset for fast iteration.
const filter = process.env.DEMOS_FILTER ? new Set(process.env.DEMOS_FILTER.split(',')) : null;
const wanted = (slug) => !filter || filter.has(slug);

for (const { slug, repo } of LIBS.filter(({ slug }) => wanted(slug))) {
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

const preparedDeps = new Set();
const ensureDep = ({ repo, ref, prepare }) => {
    const dir = resolve(BUILD, repo);
    if (!existsSync(dir)) {
        if (localSourceDir) {
            if (ref) console.log(`(local mode: using ${repo} as-is, ignoring ref ${ref})`);
            sh(`cp -r ${resolve(localSourceDir, repo)} ${dir}`);
        } else {
            sh(`git clone --depth 1 ${ref ? `--branch ${ref} ` : ''}git@github.com:FastComments/${repo}.git ${dir}`);
        }
    }
    if (prepare && !preparedDeps.has(repo)) {
        sh(prepare, dir);
        preparedDeps.add(repo);
    }
    return dir;
};

for (const { slug, deps = [] } of TMP_DEMOS.filter(({ slug }) => wanted(slug))) {
    console.log(`\n=== Building tmp demo ${slug} ===`);
    try {
        for (const dep of deps) ensureDep(dep);
        // Stage the demo source as a sibling of its deps so relative paths
        // like ../fastcomments-react-native-sdk resolve.
        const demoDir = resolve(BUILD, `tmp-demo-${slug}`);
        rmSync(demoDir, { recursive: true, force: true });
        sh(`cp -r ${resolve(ROOT, 'tmp_demos', slug)} ${demoDir}`);
        sh('npm install', demoDir);
        sh(`FC_RN_SDK_ROOT=${resolve(BUILD, 'fastcomments-react-native-sdk')} npm run build`, demoDir);
        const out = resolve(demoDir, 'dist');
        if (!existsSync(out)) throw new Error(`tmp demo ${slug} did not produce dist/`);
        mkdirSync(resolve(DIST, 'tmp_demos'), { recursive: true });
        renameSync(out, resolve(DIST, 'tmp_demos', slug));
        console.log(`✓ Staged dist/tmp_demos/${slug}`);
    } catch (err) {
        console.error(`✗ tmp demo ${slug} failed:`, err.message);
        failures.push(`tmp_demos/${slug}`);
    }
}

if (failures.length) {
    console.error(`\n${failures.length} demo(s) failed: ${failures.join(', ')}`);
    process.exit(1);
}
console.log('\nAll demos built into dist/.');
