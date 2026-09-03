import { INNER, PITCH, slotGrid, span } from './layout';
import { occupied } from './place';
import { findBlock } from './state';
import type { CanvasState, Cell, Placed } from './types';

export interface DropTarget {
    cell: Cell;
    valid: boolean;
}

// Where a block dragged by (dx, dy) layer pixels would snap, and whether it may land there.
// Top-level blocks move among grid cells; nested blocks move among their parent's slots.
export function dropTarget(placed: Placed[], state: CanvasState, id: string, dx: number, dy: number): DropTarget | null {
    const p = placed.find((x) => x.block.id === id);
    if (!p) return null;
    if (p.parentId === null) {
        const cell: Cell = {
            col: Math.max(0, Math.round((p.x + dx) / PITCH)),
            row: Math.max(0, Math.round((p.y + dy) / PITCH)),
        };
        return { cell, valid: !occupied(state.blocks, cell.col, cell.row, span(p.block.kind), id) };
    }
    const parent = placed.find((x) => x.block.id === p.parentId);
    const parentBlock = findBlock(state.blocks, p.parentId);
    if (!parent || !parentBlock) return null;
    const grid = slotGrid(parent);
    const col = Math.floor((p.cx + dx - grid.x) / grid.slotW);
    const row = Math.floor((p.cy + dy - grid.y) / grid.slotH);
    if (col < 0 || row < 0 || col >= INNER || row >= INNER) return null;
    const taken = parentBlock.children.some((c) => c.id !== id && c.col === col && c.row === row);
    return { cell: { col, row }, valid: !taken };
}

// Pixel rectangle of a drop target, for drawing the ghost.
export function targetRect(placed: Placed[], p: Placed, target: DropTarget): { x: number; y: number; w: number; h: number } {
    if (p.parentId === null) {
        return { x: target.cell.col * PITCH, y: target.cell.row * PITCH, w: p.w, h: p.h };
    }
    const parent = placed.find((x) => x.block.id === p.parentId);
    if (!parent) return { x: p.x, y: p.y, w: p.w, h: p.h };
    const grid = slotGrid(parent);
    return {
        x: grid.x + target.cell.col * grid.slotW + grid.inset,
        y: grid.y + target.cell.row * grid.slotH + grid.inset,
        w: p.w,
        h: p.h,
    };
}
