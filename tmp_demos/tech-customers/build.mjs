#!/usr/bin/env node
// Static demo: renders customers.json into dist/index.html and stages the stylesheet. No bundler, no deps.
// The page is served from fastcomments.com, so it loads the marketing site's own stylesheet, fonts and images
// and reuses its markup (hero section, action button, pretty-table) to look like the rest of the site.
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const DIST = resolve(ROOT, 'dist');
const customers = JSON.parse(readFileSync(resolve(ROOT, 'customers.json'), 'utf8'));

const GROUPS = [
    { key: 'content', title: 'Developer & IT publishers', lede: 'Tutorials, engineering blogs and docs where readers debug, disagree and add the missing step.', nameCol: 'Site' },
    { key: 'product', title: 'Built into their products', lede: 'Teams that embed FastComments inside their own apps, next to the work their users are doing.', nameCol: 'Product' },
    { key: 'fintech', title: 'Fintech & crypto', lede: 'Analytics, exchanges and market data with an audience that has opinions.', nameCol: 'Site' },
];

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const num = n => n.toLocaleString('en-US');
const plural = (n, word) => `${num(n)} ${word}${n === 1 ? '' : 's'}`;
const totalComments = customers.reduce((sum, c) => sum + c.totalComments, 0);
const ARROW = '<svg width="11" height="11" viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10.7 1.5C10.7 1.1134 10.3866 0.8 10 0.8L3.7 0.8C3.3134 0.8 3 1.1134 3 1.5C3 1.8866 3.3134 2.2 3.7 2.2L9.3 2.2L9.3 7.8C9.3 8.1866 9.6134 8.5 10 8.5C10.3866 8.5 10.7 8.1866 10.7 7.8L10.7 1.5ZM1.49497 10.995L10.495 1.99497L9.50503 1.00503L0.505025 10.005L1.49497 10.995Z" fill="currentColor"/></svg>';

const sites = c => c.sites.map(s => `<a class="report-site" href="https://${esc(s)}" target="_blank" rel="noopener">${esc(s.replace(/^www\./, ''))}</a>`).join('');

const pageCell = c => c.page
    ? `<a class="fc-row-link report-page-link" href="${esc(c.page.url)}" target="_blank" rel="noopener"><span>${esc(c.page.title)}</span>${ARROW}</a>
                        <span class="report-muted">${plural(c.page.comments, 'comment')}</span>`
    : `<span class="report-muted">${esc(c.blurb)}</span>`;

const row = c => `
                <tr>
                    <td class="report-name">
                        <span class="font_semibold">${esc(c.name)}</span>
                        ${c.page ? `<span class="report-muted">${esc(c.blurb)}</span>` : ''}
                        <span class="report-sites">${sites(c)}</span>
                    </td>
                    <td class="report-top" data-label="Most discussed">
                        ${pageCell(c)}
                    </td>
                    <td class="ta-right report-count" data-label="Comments">${num(c.totalComments)}</td>
                </tr>`;

const section = g => {
    const list = customers.filter(c => c.group === g.key);
    const groupTotal = list.reduce((s, c) => s + c.totalComments, 0);
    const middleCol = g.key === 'product' ? 'How they use it' : 'Most discussed page';
    return `
    <section class="report-group container" id="${g.key}">
        <div class="report-group-head">
            <h2 class="text_3xl font_bold color_rich_black leading_125">${esc(g.title)}</h2>
            <p class="text_md leading_150 report-muted">${esc(g.lede)} ${list.length} teams, ${num(groupTotal)} comments.</p>
        </div>
        <table class="pretty-table report-table">
            <thead>
                <tr>
                    <th>${g.nameCol}</th>
                    <th>${middleCol}</th>
                    <th class="ta-right">Comments</th>
                </tr>
            </thead>
            <tbody>${list.map(row).join('')}
            </tbody>
        </table>
    </section>`;
};

const html = `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
    <meta charset="UTF-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <meta name="robots" content="noindex"/>
    <title>FastComments - Tech Sites</title>
    <link rel="shortcut icon" href="/images/favicon.ico"/>
    <link rel="stylesheet" href="/stylesheets/public_v2/examples.css"/>
    <link rel="stylesheet" href="./styles.css"/>
</head>
<body tabindex="0">
<script>
    // Same theme source as the marketing site: the visitor's saved choice, light otherwise.
    (function () {
        let isDarkMode = false;
        try {
            isDarkMode = window.localStorage.getItem('fastcomments-theme') === 'dark';
        } catch (e) {
            console.error(e);
        }
        document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
        document.body.classList.toggle('dark', isDarkMode);
    })();
</script>
<nav class="report-nav">
    <div class="container report-nav-inner">
        <a aria-label="FastComments" href="/">
            <img src="/images/public_v2/webp/logo.webp" alt="FastComments" width="266" height="31" class="report-logo show_light"/>
            <img src="/images/public_v2/webp/logo-dark.webp" alt="FastComments" width="266" height="31" class="report-logo show_dark"/>
        </a>
        <a href="/examples" class="ff_manrope color_rich_black text_lg leading_150 transition_03 report-nav-link">Live Examples</a>
    </div>
</nav>

<section class="hero_text_section">
    <div class="hero_text_background">
        <div class="container">
            <div class="hero_text_content">
                <h1 class="text_custom_5xl font_bold color_rich_black leading_125">
                    <span class="font_light leading_125">FastComments </span>Tech Sites
                </h1>
                <p class="text_lg hero_text_description font_normal leading_150 text_center color_rich_black max_w_500">
                    Developer publishers, software products and fintech teams run their discussions on FastComments. Here is who they are, and the threads their readers talk about most.
                </p>
            </div>
        </div>
    </div>
</section>

<main class="report-page">
    <div class="container">
        <dl class="report-stats">
            <div><dt class="report-muted">Comments</dt><dd class="ff_manrope font_bold color_rich_black">${num(totalComments)}</dd></div>
            <div><dt class="report-muted">Teams</dt><dd class="ff_manrope font_bold color_rich_black">${customers.length}</dd></div>
            <div><dt class="report-muted">Largest community</dt><dd class="ff_manrope font_bold color_rich_black">${esc(customers[0].name)}</dd></div>
        </dl>
    </div>
${GROUPS.map(section).join('\n')}

    <section class="container report-cta text_center">
        <p class="text_md leading_150 report-muted">Comment totals are lifetime counts across each customer's sites, as of October 29, 2026.</p>
        <div class="d_inline_block mt_32">
            <a href="/auth/signup" class="action_button transition_03 cursor_pointer ff_manrope font_semibold color_ghost_white_100 leading_125 text_lg">Start Free 30 Day Trial ${ARROW}</a>
        </div>
    </section>
</main>
</body>
</html>
`;

rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });
writeFileSync(resolve(DIST, 'index.html'), html);
copyFileSync(resolve(ROOT, 'styles.css'), resolve(DIST, 'styles.css'));
console.log(`Rendered ${customers.length} customers into dist/`);
