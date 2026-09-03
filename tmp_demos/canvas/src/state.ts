import type { Block, CanvasState } from './types';

export type Listener = (state: CanvasState) => void;

export class Store {
    private state: CanvasState;
    private listeners: Listener[] = [];

    constructor(initial: CanvasState) {
        this.state = initial;
    }

    get(): CanvasState {
        return this.state;
    }

    set(mutate: (draft: CanvasState) => void): void {
        // Blocks are mutated in place; the state object itself is replaced so subscribers see a new reference.
        const draft: CanvasState = { ...this.state, blocks: this.state.blocks };
        mutate(draft);
        this.state = draft;
        for (const l of this.listeners) l(this.state);
    }

    replace(next: CanvasState): void {
        this.state = next;
        for (const l of this.listeners) l(this.state);
    }

    subscribe(listener: Listener): void {
        this.listeners.push(listener);
    }
}

export function findBlock(blocks: Block[], id: string): Block | undefined {
    for (const b of blocks) {
        if (b.id === id) return b;
        const nested = findBlock(b.children, id);
        if (nested) return nested;
    }
    return undefined;
}

export function findParent(blocks: Block[], id: string, parent: Block | null = null): Block | null | undefined {
    for (const b of blocks) {
        if (b.id === id) return parent;
        const found = findParent(b.children, id, b);
        if (found !== undefined) return found;
    }
    return undefined;
}

export function removeBlock(blocks: Block[], id: string): boolean {
    const idx = blocks.findIndex((b) => b.id === id);
    if (idx >= 0) {
        blocks.splice(idx, 1);
        return true;
    }
    for (const b of blocks) {
        if (removeBlock(b.children, id)) return true;
    }
    return false;
}

export function depthOf(blocks: Block[], id: string, depth = 0): number {
    for (const b of blocks) {
        if (b.id === id) return depth;
        const d = depthOf(b.children, id, depth + 1);
        if (d >= 0) return d;
    }
    return -1;
}

export function newId(): string {
    return crypto.randomUUID();
}
