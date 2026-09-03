import type { FastCommentsUI } from 'fastcomments-typescript';

export type BlockKind = 'minor' | 'major';

export type BlockColor = 'slate' | 'blue' | 'green' | 'amber' | 'rose' | 'violet';

export const PALETTE: readonly BlockColor[] = ['slate', 'blue', 'green', 'amber', 'rose', 'violet'];

export interface Block {
    id: string;
    kind: BlockKind;
    color: BlockColor;
    text: string;
    // Grid position relative to the parent's inner 3x3 grid, or the canvas grid for top-level blocks.
    col: number;
    row: number;
    children: Block[];
}

export interface CanvasState {
    version: 1;
    blocks: Block[];
    focusedId: string | null;
}

// Derived absolute pixel geometry for one block; never persisted.
export interface Placed {
    block: Block;
    parentId: string | null;
    depth: number;
    x: number;
    y: number;
    w: number;
    h: number;
    cx: number;
    cy: number;
}

export type Dir = 'left' | 'right' | 'up' | 'down';

export const DIRS: readonly Dir[] = ['left', 'right', 'up', 'down'];

export type StepSize = 'minor' | 'major';

export interface Cell {
    col: number;
    row: number;
}

export function isBlockKind(v: unknown): v is BlockKind {
    return v === 'minor' || v === 'major';
}

export function isBlockColor(v: unknown): v is BlockColor {
    return typeof v === 'string' && PALETTE.some((c) => c === v);
}

declare global {
    interface Window {
        FastCommentsUI: FastCommentsUI;
    }
}
