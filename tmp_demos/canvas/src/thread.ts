import type { FastCommentsCommentWidgetConfig, FastCommentsWidgetEmbed } from 'fastcomments-typescript';

const URL_ID_PREFIX = 'fc-canvas-demo-';

let instance: FastCommentsWidgetEmbed | undefined;
let currentConfig: FastCommentsCommentWidgetConfig | null = null;
let currentBlockId: string | null = null;
let pendingBlockId: string | null = null;

function pageUrl(): string {
    return window.location.href.split('#')[0];
}

function buildConfig(blockId: string, dark: boolean): FastCommentsCommentWidgetConfig {
    return {
        tenantId: 'demo',
        urlId: URL_ID_PREFIX + blockId,
        url: pageUrl(),
        pageTitle: 'FastComments Canvas demo',
        hasDarkBackground: dark,
    };
}

function whenReady(cb: () => void, attemptsLeft = 200): void {
    if (typeof window.FastCommentsUI === 'function') {
        cb();
        return;
    }
    if (attemptsLeft <= 0) return;
    window.setTimeout(() => whenReady(cb, attemptsLeft - 1), 50);
}

export function swapThread(mount: HTMLElement, blockId: string | null, dark: boolean): void {
    if (blockId === currentBlockId) return;
    pendingBlockId = blockId;
    if (blockId === null) {
        if (instance) instance.destroy();
        instance = undefined;
        currentConfig = null;
        currentBlockId = null;
        return;
    }
    whenReady(() => {
        // A later focus change may have superseded this one while the CDN script loaded.
        if (pendingBlockId !== blockId) return;
        const config = buildConfig(blockId, dark);
        // update() tears down and rebuilds when urlId changes and returns the NEW instance.
        instance = instance ? instance.update(config) : window.FastCommentsUI(mount, config);
        currentConfig = config;
        currentBlockId = blockId;
    });
}

export function setThreadTheme(dark: boolean): void {
    if (!instance || !currentConfig) return;
    // Only hasDarkBackground changes, so the widget restyles in place instead of reloading.
    const next: FastCommentsCommentWidgetConfig = { ...currentConfig, hasDarkBackground: dark };
    instance = instance.update(next);
    currentConfig = next;
}
