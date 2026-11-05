#!/usr/bin/env node
// Static demo: renders customers.json into dist/index.html and stages the stylesheet. No bundler, no deps.
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const DIST = resolve(ROOT, 'dist');
const customers = JSON.parse(readFileSync(resolve(ROOT, 'customers.json'), 'utf8'));

const GROUPS = [
    { key: 'news', title: 'National and regional news', lede: 'Newsrooms whose readers argue over elections, policy and the day\'s headlines.' },
    { key: 'sport', title: 'Sports news', lede: 'Match reports, transfers and club politics, picked apart by the fans who follow them.' },
    { key: 'vertical', title: 'Trade and specialist titles', lede: 'Reporting on one industry or interest, read by people who know the subject.' },
];

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const num = n => n.toLocaleString('en-US');
const plural = (n, word) => `${num(n)} ${word}${n === 1 ? '' : 's'}`;
const maxTotal = Math.max(...customers.map(c => c.totalComments));
// Log scale so a 28-comment title still shows up next to a 2M-comment network.
const barWidth = n => Math.max(2, (Math.log10(n + 1) / Math.log10(maxTotal + 1)) * 100).toFixed(1);
const totalComments = customers.reduce((sum, c) => sum + c.totalComments, 0);
const largest = customers.reduce((a, b) => (b.totalComments > a.totalComments ? b : a));

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

const section = (g, n) => {
    const list = customers.filter(c => c.group === g.key).sort((a, b) => b.totalComments - a.totalComments);
    return `
<section class="group" id="${g.key}">
    <header class="group-head">
        <span class="group-num">0${n + 1}</span>
        <h2>${esc(g.title)}</h2>
        <span class="group-count">${list.length} publishers &middot; ${num(list.reduce((s, c) => s + c.totalComments, 0))} comments</span>
        <p>${esc(g.lede)}</p>
    </header>
    <ol class="ledger">${list.map(row).join('')}
    </ol>
</section>`;
};

const html = `<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <meta name="robots" content="noindex"/>
    <title>News publishers on FastComments</title>
    <link rel="preconnect" href="https://fonts.googleapis.com"/>
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
    <link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600&family=Instrument+Serif:ital@0;1&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet"/>
    <link rel="stylesheet" href="./styles.css"/>
</head>
<body>
<div class="grain" aria-hidden="true"></div>
<main class="page">
    <nav class="masthead">
        <a class="logo" href="https://fastcomments.com" aria-label="FastComments"><img src="/images/public_v2/webp/logo-dark.webp" alt="FastComments" width="266" height="31"/></a>
        <span class="edition">Customer field report &middot; November 2026</span>
    </nav>

    <header class="hero">
        <h1>FastComments <em>News Sites</em></h1>
        <p class="lede">News networks, sports desks and trade titles run their discussions on FastComments. Here is who they are, and the stories their readers could not leave alone.</p>
        <dl class="stats">
            <div><dt>Comments</dt><dd>${num(totalComments)}</dd></div>
            <div><dt>Publishers</dt><dd>${customers.length}</dd></div>
            <div><dt>Largest community</dt><dd>${esc(largest.name)}</dd></div>
        </dl>
        <ul class="jump">
            ${GROUPS.map((g, n) => `<li><a href="#${g.key}"><span>0${n + 1}</span>${esc(g.title)}</a></li>`).join('\n            ')}
        </ul>
    </header>
${GROUPS.map(section).join('\n')}

    <footer class="foot">
        <p>Comment totals are lifetime approved comments across each customer's sites, as of November 5, 2026. Links open the live page.</p>
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
