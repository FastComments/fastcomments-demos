import { seedState } from './seed';
import { isBlockColor, isBlockKind } from './types';
import type { Block, CanvasState } from './types';

const KEY = 'fc-canvas-demo-state';

function isRecord(v: unknown): v is Record<string, unknown> {
    return typeof v === 'object' && v !== null;
}

function isBlock(v: unknown): v is Block {
    if (!isRecord(v)) return false;
    return typeof v.id === 'string'
        && isBlockKind(v.kind)
        && isBlockColor(v.color)
        && typeof v.text === 'string'
        && typeof v.col === 'number'
        && typeof v.row === 'number'
        && Array.isArray(v.children)
        && v.children.every(isBlock);
}

export function isCanvasState(v: unknown): v is CanvasState {
    if (!isRecord(v)) return false;
    return v.version === 1
        && (v.focusedId === null || typeof v.focusedId === 'string')
        && Array.isArray(v.blocks)
        && v.blocks.every(isBlock);
}

function containsId(blocks: Block[], id: string): boolean {
    for (const b of blocks) {
        if (b.id === id || containsId(b.children, id)) return true;
    }
    return false;
}

// Stale focus from an earlier session would leave the d-pad pointing at nothing.
export function normalizeState(state: CanvasState): CanvasState {
    if (state.focusedId !== null && !containsId(state.blocks, state.focusedId)) {
        return { ...state, focusedId: null };
    }
    return state;
}

export function load(): CanvasState {
    try {
        const raw = window.localStorage.getItem(KEY);
        if (raw) {
            const parsed: unknown = JSON.parse(raw);
            if (isCanvasState(parsed)) return normalizeState(parsed);
        }
    } catch {
        // Fall through to the seed when storage is unavailable or corrupt.
    }
    return seedState();
}

export function save(state: CanvasState): void {
    try {
        window.localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
        // Private mode or quota: the demo still works without persistence.
    }
}

export function clear(): void {
    try {
        window.localStorage.removeItem(KEY);
    } catch {
        // Nothing to clear.
    }
}
