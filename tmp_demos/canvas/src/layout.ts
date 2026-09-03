import type { Block, BlockKind, CanvasState, Placed } from './types';

export const CELL = 160;
export const GAP = 16;
export const PITCH = CELL + GAP;
// Every block's interior is a 3x3 slot grid, so nesting never changes the parent's footprint.
export const INNER = 3;
export const INNER_PAD = 10;
// Parents keep their title in a strip above the child grid so children never cover it.
export const HEADER = 36;

export function span(kind: BlockKind): number {
    return kind === 'major' ? 3 : 1;
}

export function topLevelSize(kind: BlockKind): number {
    const s = span(kind);
    return s * CELL + (s - 1) * GAP;
}

export function layout(state: CanvasState): Placed[] {
    const out: Placed[] = [];
    for (const block of state.blocks) {
        const size = topLevelSize(block.kind);
        const x = block.col * PITCH;
        const y = block.row * PITCH;
        pushPlaced(out, block, null, 0, x, y, size, size);
    }
    return out;
}

// Absolute geometry of a parent's inner slot grid.
export interface SlotGrid {
    x: number;
    y: number;
    slotW: number;
    slotH: number;
    inset: number;
}

export function slotGrid(parent: { x: number; y: number; w: number; h: number }): SlotGrid {
    const slotW = (parent.w - INNER_PAD * 2) / INNER;
    const slotH = (parent.h - HEADER - INNER_PAD * 2) / INNER;
    return { x: parent.x + INNER_PAD, y: parent.y + HEADER + INNER_PAD, slotW, slotH, inset: Math.max(2, Math.round(slotW * 0.06)) };
}

function pushPlaced(out: Placed[], block: Block, parentId: string | null, depth: number, x: number, y: number, w: number, h: number): void {
    out.push({ block, parentId, depth, x, y, w, h, cx: x + w / 2, cy: y + h / 2 });
    if (block.children.length === 0) {
        return;
    }
    const grid = slotGrid({ x, y, w, h });
    for (const child of block.children) {
        const cx = grid.x + child.col * grid.slotW + grid.inset;
        const cy = grid.y + child.row * grid.slotH + grid.inset;
        pushPlaced(out, child, block.id, depth + 1, cx, cy, grid.slotW - grid.inset * 2, grid.slotH - grid.inset * 2);
    }
}

export function bounds(placed: Placed[]): { width: number; height: number } {
    let maxX = 0;
    let maxY = 0;
    for (const p of placed) {
        if (p.x + p.w > maxX) maxX = p.x + p.w;
        if (p.y + p.h > maxY) maxY = p.y + p.h;
    }
    return { width: maxX + PITCH * 2, height: maxY + PITCH * 2 };
}
