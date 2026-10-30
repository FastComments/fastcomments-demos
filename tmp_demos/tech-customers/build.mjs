#!/usr/bin/env node
// Static demo: renders customers.json into dist/index.html and stages the stylesheet. No bundler, no deps.
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const DIST = resolve(ROOT, 'dist');
const customers = JSON.parse(readFileSync(resolve(ROOT, 'customers.json'), 'utf8'));

const GROUPS = [
    { key: 'content', title: 'Developer & IT publishers', lede: 'Tutorials, engineering blogs and docs where readers debug, disagree and add the missing step.' },
    { key: 'product', title: 'Built into their products', lede: 'Teams that embed FastComments inside their own apps, next to the work their users are doing.' },
    { key: 'fintech', title: 'Fintech & crypto', lede: 'Analytics, exchanges and market data with an audience that has opinions.' },
];

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const num = n => n.toLocaleString('en-US');
const plural = (n, word) => `${num(n)} ${word}${n === 1 ? '' : 's'}`;
const maxTotal = Math.max(...customers.map(c => c.totalComments));
// Log scale so a 3-comment blog still shows up next to a 280k-comment one.
const barWidth = n => Math.max(2, (Math.log10(n + 1) / Math.log10(maxTotal + 1)) * 100).toFixed(1);
const totalComments = customers.reduce((sum, c) => sum + c.totalComments, 0);

const sites = c => c.sites.map(s => `<a class="site" href="https://${esc(s)}" target="_blank" rel="noopener">${esc(s.replace(/^www\./, ''))}</a>`).join('');

const row = (c, i) => `
        <li class="row" style="--i:${i}">
            <span class="idx">${String(i + 1).padStart(2, '0')}</span>
            <div class="who">
                <h3>${esc(c.name)}</h3>
                <p>${esc(c.blurb)}</p>
                <div class="sites">${sites(c)}</div>
            </div>
            <div class="volume">
                <span class="count">${num(c.totalComments)}</span>
                <span class="unit">comments</span>
                <span class="bar"><span style="--w:${barWidth(c.totalComments)}%"></span></span>
            </div>
            <a class="top" href="${esc(c.page.url)}" target="_blank" rel="noopener">
                <span class="label">Most discussed</span>
                <span class="title">${esc(c.page.title)}</span>
                <span class="meta">${plural(c.page.comments, 'comment')} &#8599;</span>
            </a>
        </li>`;

const card = (c, i) => `
        <li class="card" style="--i:${i}">
            <div class="card-head">
                <h3>${esc(c.name)}</h3>
                <span class="count">${num(c.totalComments)}<span class="unit"> comments</span></span>
            </div>
            <p>${esc(c.blurb)}</p>
            <div class="sites">${sites(c)}</div>
            ${c.page ? `<a class="top compact" href="${esc(c.page.url)}" target="_blank" rel="noopener"><span class="label">Most discussed</span><span class="title">${esc(c.page.title)}</span><span class="meta">${plural(c.page.comments, 'comment')} &#8599;</span></a>` : ''}
        </li>`;

const section = (g, n) => {
    const list = customers.filter(c => c.group === g.key);
    const body = g.key === 'product'
        ? `<ul class="cards">${list.map(card).join('')}\n    </ul>`
        : `<ol class="ledger">${list.map(row).join('')}\n    </ol>`;
    return `
<section class="group" id="${g.key}">
    <header class="group-head">
        <span class="group-num">0${n + 1}</span>
        <h2>${esc(g.title)}</h2>
        <span class="group-count">${list.length} teams &middot; ${num(list.reduce((s, c) => s + c.totalComments, 0))} comments</span>
        <p>${esc(g.lede)}</p>
    </header>
    ${body}
</section>`;
};

const html = `<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <meta name="robots" content="noindex"/>
    <title>Tech teams on FastComments</title>
    <link rel="preconnect" href="https://fonts.googleapis.com"/>
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
    <link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600&family=Instrument+Serif:ital@0;1&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet"/>
    <link rel="stylesheet" href="./styles.css"/>
</head>
<body>
<div class="grain" aria-hidden="true"></div>
<main class="page">
    <nav class="masthead">
        <span class="brand">FastComments</span>
        <span class="edition">Customer field report &middot; October 2026</span>
    </nav>

    <header class="hero">
        <h1>FastComments <em>Tech Sites</em></h1>
        <p class="lede">Developer publishers, software products and fintech teams run their discussions on FastComments. Here is who they are, and the threads their readers could not leave alone.</p>
        <dl class="stats">
            <div><dt>Comments</dt><dd>${num(totalComments)}</dd></div>
            <div><dt>Teams</dt><dd>${customers.length}</dd></div>
            <div><dt>Largest community</dt><dd>${esc(customers[0].name)}</dd></div>
        </dl>
        <ul class="jump">
            ${GROUPS.map((g, n) => `<li><a href="#${g.key}"><span>0${n + 1}</span>${esc(g.title)}</a></li>`).join('\n            ')}
        </ul>
    </header>
${GROUPS.map(section).join('\n')}

    <footer class="foot">
        <p>Comment totals are lifetime counts across each customer's sites, as of October 29, 2026. Links open the live page.</p>
        <a href="https://fastcomments.com" class="brand">fastcomments.com</a>
    </footer>
</main>
</body>
</html>
`;

rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });
writeFileSync(resolve(DIST, 'index.html'), html);
copyFileSync(resolve(ROOT, 'styles.css'), resolve(DIST, 'styles.css'));
console.log(`Rendered ${customers.length} customers into dist/`);
