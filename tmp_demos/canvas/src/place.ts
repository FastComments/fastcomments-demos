import { INNER, PITCH, span } from './layout';
import type { Block, BlockKind, CanvasState, Cell, Placed } from './types';

// Top-level blocks collide as axis-aligned squares of their span.
export function occupied(blocks: Block[], col: number, row: number, size: number, ignoreId?: string): boolean {
    for (const b of blocks) {
        if (b.id === ignoreId) continue;
        const s = span(b.kind);
        const overlapsX = col < b.col + s && b.col < col + size;
        const overlapsY = row < b.row + s && b.row < row + size;
        if (overlapsX && overlapsY) return true;
    }
    return false;
}

function topLevelAncestor(state: CanvasState, placed: Placed[]): Block | undefined {
    let id = state.focusedId;
    while (id !== null) {
        const p = placed.find((x) => x.block.id === id);
        if (!p) return undefined;
        if (p.parentId === null) return p.block;
        id = p.parentId;
    }
    return undefined;
}

// New top-level blocks continue the sequence: first free footprint to the right of the focused step.
export function nextTopLevelCell(state: CanvasState, kind: BlockKind, placed: Placed[]): Cell {
    const size = span(kind);
    const anchor = topLevelAncestor(state, placed);
    const row = anchor ? anchor.row : 0;
    let col = anchor ? anchor.col + span(anchor.kind) : 0;
    while (occupied(state.blocks, col, row, size)) col++;
    return { col, row };
}

export function nextChildSlot(parent: Block): Cell | null {
    for (let row = 0; row < INNER; row++) {
        for (let col = 0; col < INNER; col++) {
            if (!parent.children.some((c) => c.col === col && c.row === row)) {
                return { col, row };
            }
        }
    }
    return null;
}

export function cellFromPoint(x: number, y: number): Cell {
    return { col: Math.max(0, Math.floor(x / PITCH)), row: Math.max(0, Math.floor(y / PITCH)) };
}
